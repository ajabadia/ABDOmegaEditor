import { historyService } from './historyService';
import type { HistoryEntry } from '@/features/manifest-editor/types/history';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

/**
 * PHASE 21 - HISTORY ENGINE TEST
 * Verifies push, undo, redo and industrial state management.
 */
async function runHistoryTest() {
  console.log('--- STARTING PHASE 21 HISTORY ENGINE TEST ---');

  const manifestA: OMEGA_Manifest = {
    id: 'test-manifest',
    schemaVersion: '7.2.3',
    metadata: { name: 'Test A', author: 'Test', version: '1.0' },
    nodes: [],
    resources: {},
    entities: [],
    ui: {}
  };

  const manifestB: OMEGA_Manifest = {
    ...manifestA,
    metadata: { ...manifestA.metadata, name: 'Test B' }
  };

  // 1. Test Push
  console.log('[TEST] Pushing history entries...');
  const entryA: HistoryEntry = {
    id: 'a',
    type: 'CONTENT_CHANGE',
    label: 'Initial State',
    timestamp: Date.now(),
    correlationId: 'tx_a',
    manifest: manifestA
  };

  const entryB: HistoryEntry = {
    id: 'b',
    type: 'CONTENT_CHANGE',
    label: 'Changed Name',
    timestamp: Date.now() + 10,
    correlationId: 'tx_b',
    manifest: manifestB
  };

  historyService.push(entryA);
  historyService.push(entryB);

  const history = historyService.getHistory();
  if (history.past.length === 2) {
    console.log('[PASSED] History pushed correctly.');
  } else {
    console.error(`[FAILED] History count mismatch! Expected 2, got ${history.past.length}`);
    process.exit(1);
  }

  // 2. Test Undo
  console.log('[TEST] Running Undo...');
  const undoResult = historyService.undo(manifestB);
  if (undoResult && undoResult.entry.id === 'b') {
    console.log('[PASSED] Undo returned correct entry.');
  } else {
    console.error('[FAILED] Undo failed or returned wrong entry!');
    process.exit(1);
  }

  // 3. Test Redo
  console.log('[TEST] Running Redo...');
  const redoResult = historyService.redo(manifestA);
  if (redoResult && redoResult.entry.id === 'b') {
    console.log('[PASSED] Redo restored correct entry.');
  } else {
    console.error('[FAILED] Redo failed!');
    process.exit(1);
  }

  console.log('--- HISTORY ENGINE TEST COMPLETE ---');
}

runHistoryTest().catch(err => {
    console.error('[FATAL] History Test Crashed:', err);
    process.exit(1);
});
