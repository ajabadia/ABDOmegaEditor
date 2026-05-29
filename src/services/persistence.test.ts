import { persistenceService } from './persistenceService';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

/**
 * PHASE 20.6 - PERSISTENCE TEST
 * Verifies deterministic session saving and error handling.
 */
function runPersistenceTest() {
  console.log('--- STARTING PHASE 20.6 PERSISTENCE TEST ---');

  const docId = 'test_doc';
  const dummyGraph: OmegaNode = { id: 'root', kind: 'group', layout: { pos: { x: 0, y: 0 } }, children: [] };
  const correlationId = 'tx_test_123';
  const hash = 'HASH_VALID_1';

  // 1. Simulate a successful save after sync ACK
  console.log('[TEST] Saving canonical state...');
  persistenceService.saveCanonicalState(docId, dummyGraph, correlationId, hash);

  // 2. Verify load
  const loaded = persistenceService.loadCanonicalState();
  if (loaded && loaded.id === docId && loaded.metadata.syncHash === hash) {
    console.log('[PASSED] Canonical state saved and loaded correctly.');
  } else {
    console.error('[FAILED] Data mismatch in persistence!');
    process.exit(1);
  }

  // 3. Verify correlation ID link
  if (loaded?.metadata.lastCorrelationId === correlationId) {
    console.log('[PASSED] Correlation ID linkage verified.');
  } else {
    console.error('[FAILED] Correlation ID missing in metadata!');
    process.exit(1);
  }

  // 4. Test Manual Clear
  persistenceService.clearPersistedState();
  const cleared = persistenceService.loadCanonicalState();
  if (cleared === null) {
    console.log('[PASSED] Manual clear verified.');
  } else {
    console.error('[FAILED] Clear state failed!');
    process.exit(1);
  }

  console.log('--- PERSISTENCE TEST COMPLETE ---');
}

// Mock localStorage if running in Node (tsx)
if (typeof localStorage === 'undefined') {
  const mockStorage: Record<string, string> = {};
  const storageMock = {
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    getItem: (key: string) => mockStorage[key] || null,
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { for (const key in mockStorage) delete mockStorage[key]; },
    length: 0,
    key: (_index: number) => null
  };
  
  Object.defineProperty(global, 'localStorage', {
    value: storageMock,
    writable: true
  });
}

runPersistenceTest();
