'use client';

import { useCallback } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/services/wasmLoader';
import type { ValidationIssue } from '@/types/validation';

interface DeploymentDependencies {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  issues: ValidationIssue[];
  addLog: (msg: string) => void;
  captureStableSnapshot: () => void;
  activeId: string;
  orchestrator: {
    flushPendingHash: (id: string) => Promise<void>;
  };
}

/**
 * OMEGA ERA 7.2.3 - DEPLOYMENT HOOK
 * Handles HIL Bridge injection and integrity synchronization.
 */
export const useDeployment = ({
  manifest,
  contract,
  issues,
  addLog,
  captureStableSnapshot,
  activeId,
  orchestrator
}: DeploymentDependencies) => {
  const handleDeploy = useCallback(async () => {
    if (issues.length > 0) {
      addLog(`[WARNING] Deployment blocked by ${issues.length} audit violations.`);
      return 'AUDIT_FAIL';
    }

    addLog(`[SYSTEM] HIL Bridge: Initiating direct injection...`);
    
    // Ensure orchestrator is synchronized (RISK-002 Fix)
    await orchestrator.flushPendingHash(activeId);

    addLog(`[SYSTEM] Target ID: ${manifest.id}`);
    
    try {
      // Dynamic imports for heavy services
      const { wasmRuntime } = await import('@/services/wasmRuntime');
      const { IntegrityService } = await import('@/services/integrityService');
      
      const hashAtStart = await IntegrityService.generateManifestHash(manifest);

      // 1. Coherence Check (Safety Lock)
      const firmwareHash = contract && 'firmwareHash' in contract ? (contract as OmegaContract).firmwareHash : undefined;
      
      if (firmwareHash && hashAtStart !== firmwareHash) {
        addLog(`[CRITICAL] Coherence Failure: Manifest Hash (${hashAtStart.slice(0, 8)}) mismatch with Binary Hash (${firmwareHash.slice(0, 8)}).`);
        const proceed = confirm("FIRMWARE_MISMATCH: The manifest structure has changed and no longer matches the loaded binary. This will cause simulation errors. Proceed anyway?");
        if (!proceed) {
          addLog(`[ABORT] Deployment cancelled by engineer due to integrity failure.`);
          return;
        }
      }

      const result = await wasmRuntime.deployManifest(manifest);
      
      if (result.success) {
        addLog(`[SUCCESS] Hot-Swap injection complete.`);
        addLog(`[SYSTEM] Engine Fingerprint: ${hashAtStart.slice(0, 16)}...`);
        addLog(`[SYSTEM] Simulation synchronized.`);

        // Race Condition Protection (Adjustment 3)
        const hashNow = await IntegrityService.generateManifestHash(manifest);
        if (hashNow === hashAtStart) {
          captureStableSnapshot();
        } else {
          addLog(`[SYSTEM] Local changes detected during deployment. Maintaining Dirty state.`);
        }
      }
    } catch (err) {
      addLog(`[CRITICAL] Deployment failed: ${err}`);
    }
  }, [addLog, manifest, issues, contract, captureStableSnapshot, activeId, orchestrator]);

  return { handleDeploy };
};
