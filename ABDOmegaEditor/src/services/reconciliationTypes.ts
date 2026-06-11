/**
 * OMEGA ERA 7.2.3 - RECONCILIATION TYPES (Phase 20.9)
 */

export type ResolutionPolicy = 'LAST_WRITE_WINS' | 'STRICT_BLOCKING' | 'MANUAL_RECOVERY';

export interface ConflictDescriptor {
  path: string;
  source: 'UI' | 'ENGINE' | 'CANONICAL';
  previousValue: number | string | boolean;
  incomingValue: number | string | boolean;
  resolvedValue: number | string | boolean;
  resolutionPolicy: ResolutionPolicy;
  revisionToken: string;
}

export interface ReconciliationState {
  isReconciling: boolean;
  lastRevisionToken: string | null;
  conflicts: ConflictDescriptor[];
}
