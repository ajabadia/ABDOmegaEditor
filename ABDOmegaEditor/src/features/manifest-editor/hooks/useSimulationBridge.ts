/**
 * @purpose Gestiona actualizaciones de parámetros en tiempo real y sincronización debuncada de estructura entre el estado del autor de React y el ejecutable WASM en el editor de manifesto OMEGA.
 * @purpose_en Manages real-time parameter updates and debounced structural synchronization between the React authoring state and the WASM execution runtime in OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:3,imports:6,sig:4i9iu0
 * @lastUpdated 2026-06-15T13:22:50.172Z
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import { ucaPathResolver } from '@/omega-ui-core/utils/ucaPathResolver';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';
import { captureManifestUiState } from '@/omega-ui-core/uca/treeUtils';
import { createLogger } from '@/services/logger';

const logger = createLogger('BRIDGE');

/**
 * OMEGA Simulation Bridge (Phase 9.1 - Live Loop)
 * Orchestrates real-time parameter updates and debounced structural synchronization
 * between the React authoring state and the WASM execution runtime.
 */

export type SimulationSyncStatus = 'idle' | 'syncing' | 'in-sync' | 'degraded' | 'error' | 'disconnected';

export interface SimulationBridgeState {
  status: SimulationSyncStatus;
  pendingStructuralSync: boolean;
  lastSuccessfulSyncAt: number | null;
  lastError: string | null;
  pushParameterUpdate: (id: string, value: number) => void;
  scheduleStructuralSync: (reason: string) => void;
  forceResync: () => Promise<void>;
  forceReconciliation: () => Promise<void>;
}

export const useSimulationBridge = (
  activeId: string,
  manifest: OMEGA_Manifest,
  _contract: (OmegaContract | OMEGA_Contract) | null,
  isReady: boolean,
  flushPendingHash: (id: string) => Promise<void>,
  captureStableSnapshot: (id: string) => Promise<void>
): SimulationBridgeState => {
  const wasmRuntime = getService(SERVICE_TOKENS.WASM_RUNTIME);
  const reconciliationService = getService(SERVICE_TOKENS.RECONCILIATION_SERVICE);
  const [status, setStatus] = useState<SimulationSyncStatus>('idle');
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingStructuralSync, setPendingStructuralSync] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncInProgressRef = useRef(false);

  // Keep a mutable ref of manifest to avoid stale closures in debounced sync timers
  const manifestRef = useRef(manifest);
  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);

  /**
   * Workstream 2: Parameter Fast-Path
   * Low-latency route for numeric updates.
   */
  const pushParameterUpdate = useCallback((id: string, value: number) => {
    const currentManifest = manifestRef.current;
    if (!isReady || !currentManifest.nodes?.[0]) return;
    
    try {
      // Resolve hierarchical path (HPA) for deterministic binding
      const path = ucaPathResolver.resolvePath(id, currentManifest.nodes[0]);
      wasmRuntime.setParameter(path, value);
      
      // Status maintenance is handled by the RPC Bridge callback
    } catch (err) {
      logger.warn(`Failed to resolve HPA for node ${id}. Falling back to ID.`, err);
      wasmRuntime.setParameter(id, value);
    }
  }, [isReady, wasmRuntime]);

  /**
   * Core Sync Logic (Workstream 3, 4 & 6)
   */
  const performStructuralSync = useCallback(async (reason: string) => {
    if (!isReady || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    try {
      logger.info(`Executing Structural Sync: ${reason}`);
      
      // 1. Coordination with Orchestrator (RISK-002 Fix)
      await flushPendingHash(activeId);
      
      // 2. Hot-Reload Deployment (Workstream 4)
      const result = await wasmRuntime.deployManifest(manifestRef.current, { isHotReload: true });
      
      if (result.success) {
        // 3. Capture stable snapshot AFTER successful deploy
        await captureStableSnapshot(activeId);
        
        setLastSuccessfulSyncAt(Date.now());
        setPendingStructuralSync(false);
        setLastError(null);
        logger.info(`Sync Success: ${result.hash}`);
      } else {
        throw new Error('Deployment failed at runtime');
      }
    } catch (err: unknown) {
      logger.error('Sync failed:', err);
      setLastError(err instanceof Error ? err.message : 'Unknown sync error');
      setStatus('error');
    } finally {
      syncInProgressRef.current = false;
      debounceTimerRef.current = null;
    }
  }, [isReady, activeId, flushPendingHash, captureStableSnapshot, wasmRuntime]);

  /**
   * Workstream 3: Structural Sync Queue
   * Debounced deployment for structural changes.
   */
  const scheduleStructuralSync = useCallback((reason: string) => {
    if (!isReady) return;

    setPendingStructuralSync(true);
    // syncing status will be driven by the bridge during deployManifest

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      await performStructuralSync(reason);
    }, 500);
  }, [isReady, performStructuralSync]);

  /**
   * Workstream 6: Error Recovery
   */
  const forceResync = useCallback(async () => {
    logger.info('Manual recovery triggered.');
    await performStructuralSync('Manual Recovery');
  }, [performStructuralSync]);

  const forceReconciliation = useCallback(async () => {
    if (!isReady) return;
    logger.info('Starting state reconciliation...');
    
    try {
      // 1. Fetch current engine state
      const engineState = await wasmRuntime.reconcileState();
      
      // 2. Estado UI = estado de authoring actual del manifiesto (bind → default del rango).
      // Antes esto era un objeto vacío → la reconciliación siempre reportaba "in sync".
      const uiState = captureManifestUiState(manifestRef.current);

      const divergences = reconciliationService.detectDivergence(uiState, engineState);
      
      if (divergences.length > 0) {
        logger.info(`Detected ${divergences.length} divergences. Resolving...`);
        divergences.forEach(path => {
          reconciliationService.resolveConflict(path, uiState[path], engineState[path]);
        });
      } else {
        logger.debug('UI and Engine are in sync.');
      }
    } catch (err) {
      logger.error('Reconciliation failed:', err);
    }
  }, [isReady, reconciliationService, wasmRuntime]);

  // Initial connection and status synchronization
  useEffect(() => {
    wasmRuntime.connect((newStatus) => {
      // Map RPC status to hook status
      if (newStatus === 'disconnected') setStatus('disconnected');
      else if (newStatus === 'syncing') setStatus('syncing');
      else if (newStatus === 'in-sync') setStatus('in-sync');
      else if (newStatus === 'degraded') setStatus('degraded');
      else if (newStatus === 'error') setStatus('error');
    });

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [wasmRuntime]);

  return useMemo(() => ({
    status,
    pendingStructuralSync,
    lastSuccessfulSyncAt,
    lastError,
    pushParameterUpdate,
    scheduleStructuralSync,
    forceResync,
    forceReconciliation
  }), [status, pendingStructuralSync, lastSuccessfulSyncAt, lastError, pushParameterUpdate, scheduleStructuralSync, forceResync, forceReconciliation]);
};

