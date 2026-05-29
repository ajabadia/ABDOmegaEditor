import { historyService } from './historyService';
import { BlueprintValidator } from '@/omega-ui-core/uca/blueprintValidator';
import { observabilityService } from './observabilityService';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

/**
 * OMEGA ERA 8.0.0 - TIME TRAVEL RESTORE (Phase 21.4)
 * Orchestrates the safe restoration of historical manifest states.
 */
export class HistoryRestoreEngine {
  /**
   * prepareRestore
   * Loads a revision and validates it before promotion.
   */
  static async prepareRestore(revisionId: string, manifest: Partial<OMEGA_Manifest>): Promise<OmegaNode[] | null> {
    const startTime = Date.now();
    const entry = historyService.getRevision(revisionId);
    
    if (!entry) {
      console.error(`[HISTORY RESTORE] Revision not found: ${revisionId}`);
      return null;
    }

    try {
      // Gatekeeping: Historical data must pass validation before activation
      const nodesToRestore = entry.manifest.ui?.tree?.children || [];
      
      if (entry.manifest.ui?.tree) {
         BlueprintValidator.validate(entry.manifest.ui.tree, entry.manifest);
      }
      
      const durationMs = Date.now() - startTime;

      observabilityService.trackHistoryEvent(
        entry.correlationId,
        'HISTORY_RESTORE_SUCCESS',
        'SUCCESS',
        `Validated historical revision ${revisionId} for restoration.`,
        durationMs,
        { revisionId }
      );

      return nodesToRestore as OmegaNode[];
    } catch (err) {
      const durationMs = Date.now() - startTime;
      console.error(`[HISTORY RESTORE] Validation failed for revision ${revisionId}:`, err);
      
      observabilityService.trackHistoryEvent(
        entry.correlationId,
        'HISTORY_RESTORE_FAILED',
        'FAILURE',
        `Historical revision ${revisionId} failed validation.`,
        durationMs
      );

      return null;
    }
  }
}
