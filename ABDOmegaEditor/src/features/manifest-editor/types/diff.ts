/**
 * OMEGA Diff System (Phase 9.2)
 * Data contracts for structural manifest comparison.
 */

export type DiffChangeType = 'added' | 'removed' | 'modified';
export type DiffEntityKind = 'control' | 'jack' | 'container' | 'uca-node';

export interface DiffEntry {
  /** The unique ID of the entity (canonical key) */
  entityId: string;
  
  /** The type of entity being compared */
  entityKind: DiffEntityKind;
  
  /** The nature of the change */
  changeType: DiffChangeType;
  
  /** 
   * Dot-notation path to the specific field (only for 'modified' types) 
   * Example: 'presentation.label', 'pos.x'
   */
  fieldPath?: string;
  
  /** The value before the change */
  before?: unknown;
  
  /** The value after the change */
  after?: unknown;
  
  /** Parent container context for UI grouping */
  parentContainerId?: string;
  
  /** Human readable description of the change */
  description?: string;
}

export interface ManifestDiffResult {
  entries: DiffEntry[];
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
  timestamp: number;
  baseHash: string;
  targetHash: string;
}
