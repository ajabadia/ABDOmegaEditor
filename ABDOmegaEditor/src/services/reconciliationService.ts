/**
 * @purpose Gestiona el detectar y resolver divergencia de estado en OMEGA ERA 7.2.3 utilizando políticas deterministas.
 * @purpose_en Manages the detection and resolution of state divergence in OMEGA ERA 7.2.3 using deterministic policies.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1f406k0
 * @lastUpdated 2026-06-15T17:03:00.510Z
 */

import type { ConflictDescriptor, ResolutionPolicy } from './reconciliationTypes';
import { observabilityService } from './observabilityService';

/**
 * OMEGA ERA 7.2.3 - RECONCILIATION SERVICE
 * Logic for detecting and resolving state divergence.
 */
class ReconciliationService {
  /**
   * detectDivergence
   * Compares two control states and returns paths that differ.
   */
  detectDivergence(uiState: Record<string, unknown>, engineState: Record<string, unknown>): string[] {
    const divergingPaths: string[] = [];
    const allPaths = new Set([...Object.keys(uiState), ...Object.keys(engineState)]);

    for (const path of allPaths) {
      if (uiState[path] !== engineState[path]) {
        divergingPaths.push(path);
      }
    }

    return divergingPaths;
  }

  /**
   * resolveConflict
   * Applies deterministic policy to resolve a single path mismatch.
   */
  resolveConflict(
    path: string, 
    uiValue: unknown, 
    engineValue: unknown, 
    policy: ResolutionPolicy = 'LAST_WRITE_WINS'
  ): ConflictDescriptor {
    const revisionToken = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Default implementation of Last-Write-Wins (assuming Engine is authoritative for current runtime)
    const resolvedValue = (policy === 'STRICT_BLOCKING' ? uiValue : engineValue) as string | number | boolean;

    const conflict: ConflictDescriptor = {
      path,
      source: policy === 'STRICT_BLOCKING' ? 'UI' : 'ENGINE',
      previousValue: uiValue as string | number | boolean,
      incomingValue: engineValue as string | number | boolean,
      resolvedValue,
      resolutionPolicy: policy,
      revisionToken
    };

    this.emitReconciliationEvent(conflict);
    return conflict;
  }

  private emitReconciliationEvent(conflict: ConflictDescriptor) {
    observabilityService.trackEvent({
      correlationId: conflict.revisionToken,
      phase: 'PHASE_20_RECONCILIATION',
      component: 'RECONCILIATION_SERVICE',
      state: 'SUCCESS',
      message: `Reconciled path ${conflict.path} via ${conflict.resolutionPolicy}. Resolved: ${conflict.resolvedValue}`
    });
  }
}

export const reconciliationService = new ReconciliationService();
