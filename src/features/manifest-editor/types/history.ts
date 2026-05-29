import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';

/**
 * OMEGA History Engine (v8.0.0)
 * Semantic Event Types for History Tracking.
 */
export type HistoryEventType = 
  | 'CONTENT_CHANGE'    // UCA Tree / Manifest modification
  | 'UI_SELECTION'      // Selected node change
  | 'UI_PINNING'        // Pinned node change (Era 8)
  | 'UI_LAYOUT_RATIO'   // Splitter ratio change
  | 'MODE_CHANGE'       // View mode transition
  | 'SNAPSHOT'          // Full system state capture
  | 'RECOVERY_POINT';   // Automatic save point

/**
 * Encapsulates a single reversible action in the editor.
 */
export interface HistoryEntry {
  id: string;           // Unique entry ID
  type: HistoryEventType;
  label: string;
  timestamp: number;
  correlationId: string;
  
  // State Delta or Snapshot
  manifest: OMEGA_Manifest; // For now, we use snapshots for reliability
  
  // UI State Context
  uiState?: {
    selectedNodeId: string | null;
    multiSelectedNodeIds?: string[];
    pinnedNodeId: string | null;
    layoutRatio: number;
    viewMode?: string;
    isSplit?: boolean;
  };

  metadata?: Record<string, unknown>;
}

/**
 * Per-document history stacks.
 */
export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  lastSavedIndex: number; // For "Dirty" state tracking relative to disk
}

export const INITIAL_HISTORY_STATE: HistoryState = {
  past: [],
  future: [],
  lastSavedIndex: -1
};
