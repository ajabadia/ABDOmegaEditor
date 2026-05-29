import type { OmegaNode } from '@/omega-ui-core/types/manifest';

/**
 * OMEGA ERA 7.2.3 - HISTORY TYPES (Phase 21)
 */

export type HistoryCaptureReason = 'TRANSACTION_COMMIT' | 'SNAPSHOT_SYNC' | 'RECOVERY_POINT' | 'MANUAL_SAVE';

export interface HistoryRevisionMeta {
  revisionId: string;
  parentRevisionId: string | null;
  timestamp: number;
  correlationId: string;
  reason: HistoryCaptureReason;
  label?: string;
  schemaVersion: string;
}

export interface HistoryEntry {
  meta: HistoryRevisionMeta;
  graph: OmegaNode[];
}

export interface HistoryDiff {
  revisionA: string;
  revisionB: string;
  changes: {
    path: string;
    type: 'ADD' | 'REMOVE' | 'UPDATE' | 'MOVE';
    details?: unknown;
  }[];
}
