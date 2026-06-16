/**
 * @purpose Gestiona tipos y interfaces para políticas de resolución de conflictos y estados de reconciliación en el editor de manifesto OMEGA.
 * @purpose_en Manages types and interfaces for conflict resolution policies and reconciliation states in the OMEGA manifest editor.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:l5z9vw
 * @lastUpdated 2026-06-15T17:03:07.385Z
 */

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
