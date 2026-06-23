/**
 * @purpose Tipos canónicos para políticas de resolución de conflictos y estados de reconciliación
 * @purpose_en Canonical types for conflict resolution policies and reconciliation states
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:new
 * @lastUpdated 2026-06-22
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
