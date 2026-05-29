import type { HistoryEntry, HistoryEventType } from '@/features/manifest-editor/types/history';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { observabilityService } from './observabilityService';

/**
 * OMEGA ERA 8.0.0 - INDUSTRIAL HISTORY ENGINE
 * Specialized service for semantic history management with branching support.
 */
class HistoryService {
  private history: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private maxEntries = 50;

  /**
   * push
   * Records a new semantic event. Clears future stack (branching).
   */
  push(entry: HistoryEntry) {
    // Coalescing/Compression Logic
    const lastEntry = this.history[this.history.length - 1];
    
    if (lastEntry && lastEntry.type === entry.type && lastEntry.label === entry.label) {
      const timeDiff = entry.timestamp - lastEntry.timestamp;
      
      // Coalesce high-frequency UI events (e.g. selection jumps) within 1.5s
      if (entry.type !== 'CONTENT_CHANGE' && timeDiff < 1500) {
        this.history[this.history.length - 1] = entry; // Replace with latest
        return;
      }
    }

    this.history.push(entry);
    this.future = []; // Branching rule
    
    if (this.history.length > this.maxEntries) {
      this.history.shift();
    }

    observabilityService.trackHistoryEvent(
      entry.correlationId,
      'HISTORY_CAPTURED',
      'SUCCESS',
      `Captured: ${entry.label} (${entry.type})`,
      0,
      { id: entry.id }
    );
  }

  /**
   * undo
   * Moves last past entry to future and returns it.
   */
  undo(currentManifest: OMEGA_Manifest): { entry: HistoryEntry; currentState: HistoryEntry } | null {
    if (this.history.length === 0) return null;

    const entryToRestore = this.history.pop()!;
    
    const currentState: HistoryEntry = {
      id: `redo_${Date.now()}`,
      type: 'SNAPSHOT',
      label: 'Pre-Undo State',
      timestamp: Date.now(),
      correlationId: 'undo_op',
      manifest: JSON.parse(JSON.stringify(currentManifest))
    };

    this.future.unshift(currentState);

    return { entry: entryToRestore, currentState };
  }

  /**
   * redo
   * Moves first future entry to past and returns it.
   */
  redo(currentManifest: OMEGA_Manifest): { entry: HistoryEntry; currentState: HistoryEntry } | null {
    if (this.future.length === 0) return null;

    const entryToRestore = this.future.shift()!;
    
    const currentState: HistoryEntry = {
      id: `undo_${Date.now()}`,
      type: 'SNAPSHOT',
      label: 'Pre-Redo State',
      timestamp: Date.now(),
      correlationId: 'redo_op',
      manifest: JSON.parse(JSON.stringify(currentManifest))
    };

    this.history.push(currentState);

    return { entry: entryToRestore, currentState };
  }

  getHistory() {
    return {
      past: [...this.history],
      future: [...this.future]
    };
  }

  getRevision(id: string): HistoryEntry | undefined {
    return this.history.find(e => e.id === id) || this.future.find(e => e.id === id);
  }

  clear() {
    this.history = [];
    this.future = [];
  }
}

export const historyService = new HistoryService();
