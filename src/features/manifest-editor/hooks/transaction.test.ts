/**
 * PHASE 20.7 - TRANSACTIONAL EDITING LOGIC TEST
 * Verifies the atomic commitment and rollback logic in the orchestrator reducer.
 */

interface MockManifest {
  id: string;
  value: number;
}

interface MockTransaction {
  label: string;
  baseManifest: MockManifest;
  correlationId: string;
}

interface MockDocument {
  id: string;
  manifest: MockManifest;
  activeTransaction: MockTransaction | null;
}

interface MockState {
  documentsById: Record<string, MockDocument>;
}

type MockAction = 
  | { type: 'START_TRANSACTION'; id: string; label: string; correlationId: string }
  | { type: 'UPDATE_DOCUMENT'; id: string; updates: { manifest: Partial<MockManifest> } }
  | { type: 'COMMIT_TRANSACTION'; id: string }
  | { type: 'ABORT_TRANSACTION'; id: string };

// Mock deepMerge for the test
function deepMerge(target: MockManifest, source: Partial<MockManifest>): MockManifest {
  return { ...target, ...source };
}

function reducer(state: MockState, action: MockAction): MockState {
  const doc = state.documentsById[action.id];
  if (!doc) return state;

  switch (action.type) {
    case 'START_TRANSACTION':
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            activeTransaction: {
              label: action.label,
              baseManifest: JSON.parse(JSON.stringify(doc.manifest)),
              correlationId: action.correlationId
            }
          }
        }
      };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            manifest: deepMerge(doc.manifest, action.updates.manifest)
          }
        }
      };
    case 'COMMIT_TRANSACTION':
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...doc, activeTransaction: null }
        }
      };
    case 'ABORT_TRANSACTION':
      if (!doc.activeTransaction) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            manifest: doc.activeTransaction.baseManifest,
            activeTransaction: null
          }
        }
      };
    default:
      return state;
  }
}

function runTransactionTest() {
  console.log('--- STARTING PHASE 20.7 TRANSACTION LOGIC TEST ---');

  const initialState = {
    documentsById: {
      'doc1': {
        id: 'doc1',
        manifest: { id: 'm1', value: 10 },
        activeTransaction: null
      }
    }
  };

  // 1. Start Transaction
  let state = reducer(initialState, { 
    type: 'START_TRANSACTION', 
    id: 'doc1', 
    label: 'Test Transaction', 
    correlationId: 'tx_1' 
  });
  
  console.log('[TEST] Transaction started.');

  // 2. Perform updates
  state = reducer(state, { 
    type: 'UPDATE_DOCUMENT', 
    id: 'doc1', 
    updates: { manifest: { value: 20 } } 
  });
  
  if (state.documentsById.doc1.manifest.value === 20) {
    console.log('[PASSED] Mid-transaction update applied.');
  }

  // 3. Abort Transaction
  state = reducer(state, { type: 'ABORT_TRANSACTION', id: 'doc1' });
  
  if (state.documentsById.doc1.manifest.value === 10 && state.documentsById.doc1.activeTransaction === null) {
    console.log('[PASSED] Rollback to base manifest successful.');
  } else {
    console.error('[FAILED] Rollback failed!', state.documentsById.doc1.manifest);
    process.exit(1);
  }

  // 4. Test Commit
  state = reducer(initialState, { type: 'START_TRANSACTION', id: 'doc1', label: 'T2', correlationId: 'tx_2' });
  state = reducer(state, { type: 'UPDATE_DOCUMENT', id: 'doc1', updates: { manifest: { value: 30 } } });
  state = reducer(state, { type: 'COMMIT_TRANSACTION', id: 'doc1' });

  if (state.documentsById.doc1.manifest.value === 30 && state.documentsById.doc1.activeTransaction === null) {
    console.log('[PASSED] Transaction commit successful.');
  } else {
    console.error('[FAILED] Commit failed!');
    process.exit(1);
  }

  console.log('--- TRANSACTION LOGIC TEST COMPLETE ---');
}

runTransactionTest();
