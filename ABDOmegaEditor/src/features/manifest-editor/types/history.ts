/**
 * @purpose Gestiona historias de entrada y estados para el editor de manifesto OMEGA, incluyendo cambios de contenido, selecciones de UI y capturas de snapshot.
 * @purpose_en Manages history entries and states for the OMEGA manifest editor, including content changes, UI selections, and snapshots.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:4,imports:1,sig:n6cifl
 * @lastUpdated 2026-06-15T15:16:37.083Z
 */

import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

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
  extraResources?: { name: string, data: ArrayBuffer, type: string }[] | undefined;
  
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
