'use client';

import { useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import type { 
  OMEGA_Manifest, 
  OmegaNode, 
  HistoryEntry, 
  DocumentState, 
  OrchestratorState, 
  OrchestratorAction 
} from '../types/document';
import { DEFAULT_MANIFEST } from '../constants/defaults';
import { IntegrityService } from '@/services/integrityService';
import { historyService } from '@/services/historyService';
import { persistenceService } from '@/services/persistenceService';
import { observabilityService } from '@/services/observabilityService';
import { BlueprintValidator } from '@/omega-ui-core/uca/blueprintValidator';
import { HistoryRestoreEngine } from '@/services/historyRestore';
import { STORAGE_KEYS } from '../constants/storage';

const orchestratorReducer = (state: OrchestratorState, action: OrchestratorAction): OrchestratorState => {
  switch (action.type) {
    case 'OPEN_DOCUMENT':
      if (state.documentsById[action.id]) {
        return { ...state, activeDocumentId: action.id };
      }
      return {
        ...state,
        activeDocumentId: action.id,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            id: action.id,
            manifest: action.manifest,
            isDirty: false,
            lastStableHash: '',
            history: { past: [], future: [], lastSavedIndex: -1 },
            isInitializing: true,
            contract: null,
            wasmBuffer: null,
            extraResources: []
          }
        }
      };

    case 'CLOSE_DOCUMENT':
      const { [action.id]: _, ...remainingDocs } = state.documentsById;
      const nextActiveId = state.activeDocumentId === action.id 
        ? Object.keys(remainingDocs)[0] || 'primary'
        : state.activeDocumentId;
      return {
        ...state,
        activeDocumentId: nextActiveId,
        documentsById: remainingDocs
      };

    case 'UPDATE_DOCUMENT':
      const doc = state.documentsById[action.id];
      if (!doc) return state;
      
      const updatedManifest = action.updates.manifest 
        ? { ...doc.manifest, ...action.updates.manifest }
        : doc.manifest;

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            ...action.updates,
            manifest: updatedManifest
          }
        }
      };

    case 'SET_ACTIVE_DOCUMENT':
      return { ...state, activeDocumentId: action.id };

    case 'SET_DIRTY':
      const dirtyDoc = state.documentsById[action.id];
      if (!dirtyDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...dirtyDoc, isDirty: action.isDirty }
        }
      };

    case 'CAPTURE_HASH':
      const hashDoc = state.documentsById[action.id];
      if (!hashDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...hashDoc, lastStableHash: action.hash, isDirty: false }
        }
      };

    case 'SET_INITIALIZED':
      const initDoc = state.documentsById[action.id];
      if (!initDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...initDoc, isInitializing: false }
        }
      };

    case 'HYDRATE_SESSION':
      return action.state;

    case 'RESET_DOCUMENT':
      const resetDoc = state.documentsById[action.id];
      if (!resetDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...resetDoc,
            manifest: DEFAULT_MANIFEST,
            isDirty: false,
            lastStableHash: '',
            history: { past: [], future: [], lastSavedIndex: -1 }
          }
        }
      };

    case 'UNDO_DOCUMENT': {
      const d = state.documentsById[action.id];
      if (!d || d.history.past.length === 0) return state;
      
      const lastPast = d.history.past[d.history.past.length - 1];
      const newPast = d.history.past.slice(0, -1);
      
      // The current manifest becomes the first entry in future
      const currentEntry: HistoryEntry = {
        id: `redo_${Date.now()}`,
        type: 'SNAPSHOT',
        label: 'Current State',
        timestamp: Date.now(),
        correlationId: 'undo_op',
        manifest: d.manifest
      };

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: lastPast.manifest,
            history: {
              ...d.history,
              past: newPast,
              future: [currentEntry, ...d.history.future]
            }
          }
        }
      };
    }

    case 'REDO_DOCUMENT': {
      const d = state.documentsById[action.id];
      if (!d || d.history.future.length === 0) return state;
      
      const firstFuture = d.history.future[0];
      const nextFuture = d.history.future.slice(1);
      
      const currentEntry: HistoryEntry = {
        id: `undo_${Date.now()}`,
        type: 'SNAPSHOT',
        label: 'Previous State',
        timestamp: Date.now(),
        correlationId: 'redo_op',
        manifest: d.manifest
      };

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: firstFuture.manifest,
            history: {
              ...d.history,
              past: [...d.history.past, currentEntry],
              future: nextFuture
            }
          }
        }
      };
    }

    case 'PUSH_HISTORY': {
      const d = state.documentsById[action.id];
      if (!d) return state;
      
      const newPast = [...d.history.past, action.entry];
      // Keep only last 50 states
      if (newPast.length > 50) newPast.shift();
      
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            history: {
              ...d.history,
              past: newPast,
              future: [] // Branching rule: new action clears future
            }
          }
        }
      };
    }

    case 'START_TRANSACTION': {
        const d = state.documentsById[action.id];
        if (!d) return state;
        return {
          ...state,
          documentsById: {
            ...state.documentsById,
            [action.id]: {
              ...d,
              activeTransaction: {
                label: action.label,
                correlationId: action.correlationId,
                baseNodes: d.manifest.nodes || []
              }
            }
          }
        };
    }

    case 'COMMIT_TRANSACTION': {
        const d = state.documentsById[action.id];
        if (!d) return state;
        return {
          ...state,
          documentsById: {
            ...state.documentsById,
            [action.id]: {
              ...d,
              activeTransaction: undefined
            }
          }
        };
    }

    case 'ABORT_TRANSACTION': {
        const d = state.documentsById[action.id];
        if (!d || !d.activeTransaction) return state;
        return {
          ...state,
          documentsById: {
            ...state.documentsById,
            [action.id]: {
              ...d,
              manifest: { ...d.manifest, nodes: d.activeTransaction.baseNodes },
              activeTransaction: undefined
            }
          }
        };
    }

    default:
      return state;
  }
};

const initialState: OrchestratorState = {
  documentsById: {
    'primary': {
      id: 'primary',
      manifest: DEFAULT_MANIFEST,
      isDirty: false,
      lastStableHash: '',
      history: { past: [], future: [], lastSavedIndex: -1 },
      isInitializing: true,
      contract: null,
      wasmBuffer: null,
      extraResources: []
    }
  },
  activeDocumentId: 'primary'
};

export const useDocumentOrchestrator = () => {
  const [state, dispatch] = useReducer(orchestratorReducer, initialState);
  const debouncedHashingRef = useRef<Record<string, NodeJS.Timeout>>({});
  const hashPromisesRef = useRef<Record<string, Promise<void> | null>>({});

  const flushPendingHash = useCallback(async (id: string) => {
    if (debouncedHashingRef.current[id]) {
      clearTimeout(debouncedHashingRef.current[id]);
      delete debouncedHashingRef.current[id];
    }
    if (hashPromisesRef.current[id]) {
      await hashPromisesRef.current[id];
    }
  }, []);

  // Session Rehydration: Load from LocalStorage
  useEffect(() => {
    try {
      const persisted = persistenceService.loadCanonicalState();
      
      if (persisted) {
        // Mandatory Validation before rehydration
        try {
          BlueprintValidator.validate(persisted.graph, { id: persisted.id });
          
          observabilityService.trackEvent({
            correlationId: persisted.metadata.lastCorrelationId,
            phase: 'PHASE_20_RECOVERY',
            component: 'ORCHESTRATOR',
            state: 'SUCCESS',
            message: `Rehydrated canonical state for ${persisted.id} (Hash: ${persisted.metadata.syncHash})`
          });

          // Open the recovered document
          const recoveredManifest: OMEGA_Manifest = {
            ...DEFAULT_MANIFEST,
            id: persisted.id,
            ui: {
              ...DEFAULT_MANIFEST.ui,
              tree: persisted.graph
            }
          };

          dispatch({ 
            type: 'OPEN_DOCUMENT', 
            id: persisted.id, 
            manifest: recoveredManifest
          });

          // Phase 21.1: Capture as historical revision
          dispatch({
            type: 'PUSH_HISTORY',
            id: persisted.id,
            entry: {
              id: `recovery_${Date.now()}`,
              type: 'RECOVERY_POINT',
              label: 'Session Recovery Point',
              timestamp: Date.now(),
              correlationId: persisted.metadata.lastCorrelationId,
              manifest: recoveredManifest,
              uiState: {
                selectedNodeId: null,
                multiSelectedNodeIds: [],
                pinnedNodeId: null,
                layoutRatio: 0.5
              }
            }
          });
          
          return; // Skip general session hydration if canonical recovery succeeds
        } catch (valErr: unknown) {
          const error = valErr as Error;
          observabilityService.trackEvent({
            correlationId: persisted.metadata.lastCorrelationId,
            phase: 'PHASE_20_RECOVERY',
            component: 'ORCHESTRATOR',
            state: 'FAILURE',
            code: 'RECOVERY_VALIDATION_FAILED',
            message: `Persisted state invalid: ${error.message}`
          });
          persistenceService.clearPersistedState();
        }
      }

      // Fallback to legacy session hydration if no canonical state or validation failed
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION_DOCS);
      if (stored) {
        const parsed = JSON.parse(stored) as OrchestratorState;
        dispatch({ type: 'HYDRATE_SESSION', state: parsed });
      }
    } catch (err: unknown) {
      console.error('[OMEGA ORCHESTRATOR] Session restore failed:', err);
    }
  }, []);

  // Session Persistence: Save to LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = {
        documentsById: state.documentsById,
        activeDocumentId: state.activeDocumentId
      };
      // We only save manifests and IDs, not large binary buffers or contracts
      localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(data, (key, value) => {
        if (key === 'wasmBuffer' || key === 'contract' || key === 'extraResources' || key === 'history') return undefined;
        return value;
      }));
    }
  }, [state.documentsById, state.activeDocumentId]);

  const activeDocumentId = state.activeDocumentId;
  const activeDocument = useMemo(() => 
    state.documentsById[activeDocumentId] || state.documentsById['primary']
  , [state.documentsById, activeDocumentId]);

  // Actions
  const openDocument = useCallback((id: string, manifest: OMEGA_Manifest) => {
    dispatch({ type: 'OPEN_DOCUMENT', id, manifest });
  }, []);

  const closeDocument = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_DOCUMENT', id });
  }, []);

  const updateDocument = useCallback((id: string, updates: Partial<Omit<DocumentState, 'manifest'>> & { manifest?: Partial<OMEGA_Manifest> }) => {
    dispatch({ type: 'UPDATE_DOCUMENT', id, updates });
  }, []);

  const setActiveDocument = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', id });
  }, []);

  const resetDocument = useCallback((id: string) => {
    dispatch({ type: 'RESET_DOCUMENT', id });
  }, []);

  const undo = useCallback((id: string) => dispatch({ type: 'UNDO_DOCUMENT', id }), []);
  const redo = useCallback((id: string) => dispatch({ type: 'REDO_DOCUMENT', id }), []);
  const undoTo = useCallback((id: string, index: number) => dispatch({ type: 'UNDO_TO_INDEX', id, index }), []);
  const pushHistory = useCallback((id: string, entry: HistoryEntry) => dispatch({ type: 'PUSH_HISTORY', id, entry }), []);
  
  const startTransaction = useCallback((id: string, label: string) => {
    const correlationId = observabilityService.generateCorrelationId();
    dispatch({ type: 'START_TRANSACTION', id, label, correlationId });
    observabilityService.trackEvent({
      correlationId,
      phase: 'PHASE_20_TRANSACTION',
      component: 'ORCHESTRATOR',
      state: 'START',
      message: `Transaction started: ${label}`
    });
  }, []);

  const commitTransaction = useCallback((id: string) => {
    const doc = state.documentsById[id];
    if (!doc || !doc.activeTransaction) return;
    
    const correlationId = doc.activeTransaction.correlationId;
    const label = doc.activeTransaction.label;

    try {
      // 1. Validation (Blocking)
      if (doc.manifest.ui?.tree) {
        BlueprintValidator.validate(doc.manifest.ui.tree, doc.manifest);
      }

      // Phase 21.1: Capture as historical revision
      dispatch({
        type: 'PUSH_HISTORY',
        id: id,
        entry: {
          id: `tx_${Date.now()}`,
          type: 'CONTENT_CHANGE',
          label: doc.activeTransaction.label,
          timestamp: Date.now(),
          correlationId: doc.activeTransaction.correlationId,
          manifest: doc.manifest,
          uiState: {
            selectedNodeId: null,
            multiSelectedNodeIds: [],
            pinnedNodeId: null,
            layoutRatio: 0.5
          }
        }
      });

      dispatch({ type: 'COMMIT_TRANSACTION', id: id });
      
      observabilityService.trackEvent({
        correlationId,
        phase: 'PHASE_20_TRANSACTION',
        component: 'ORCHESTRATOR',
        state: 'SUCCESS',
        message: `Transaction committed: ${label}`
      });
    } catch (err: unknown) {
      const error = err as Error;
      observabilityService.trackEvent({
        correlationId,
        phase: 'PHASE_20_TRANSACTION',
        component: 'ORCHESTRATOR',
        state: 'FAILURE',
        code: 'TRANSACTION_COMMIT_FAILED',
        message: error.message
      });
      throw error;
    }
  }, [state.documentsById]);

  const abortTransaction = useCallback((id: string) => {
    dispatch({ type: 'ABORT_TRANSACTION', id });
  }, []);

  const restoreHistoricalRevision = useCallback(async (id: string, revisionId: string) => {
    const doc = state.documentsById[id];
    if (!doc) return;

    const graph = await HistoryRestoreEngine.prepareRestore(revisionId, doc.manifest);
    if (!graph) return;

    // Promote historical state to active manifest
    dispatch({
      type: 'UPDATE_DOCUMENT',
      id,
      updates: {
        manifest: {
          nodes: graph
        }
      }
    });

    // Capture the restore action as a new recovery point in history
    dispatch({
      type: 'PUSH_HISTORY',
      id,
      entry: {
        id: `restore_${Date.now()}`,
        type: 'RECOVERY_POINT',
        label: `Restored Revision: ${revisionId}`,
        timestamp: Date.now(),
        correlationId: `restore_${Date.now()}_${revisionId}`,
        manifest: doc.manifest,
        uiState: {
          selectedNodeId: null,
          multiSelectedNodeIds: [],
          pinnedNodeId: null,
          layoutRatio: 0.5
        }
      }
    });
  }, [state.documentsById]);

  const captureStableSnapshot = useCallback(async (id: string) => {
    await flushPendingHash(id); // Ensure integrity before snapshot (Gate 9.0 requirement)
    const doc = state.documentsById[id];
    if (!doc) return;
    const hash = await IntegrityService.generateManifestHash(doc.manifest);
    dispatch({ type: 'CAPTURE_HASH', id, hash });

    // Phase 21.1: Capture as historical revision
    pushHistory(id, {
      id: `sync_${Date.now()}_${hash.substring(0, 8)}`,
      type: 'SNAPSHOT',
      label: 'Structural Sync Point',
      timestamp: Date.now(),
      correlationId: `sync_${Date.now()}`,
      manifest: doc.manifest,
      uiState: {
        selectedNodeId: null,
        multiSelectedNodeIds: [],
        pinnedNodeId: null,
        layoutRatio: 0.5
      }
    });
  }, [state.documentsById, flushPendingHash]);

  useEffect(() => {
    Object.values(state.documentsById).forEach((doc: DocumentState) => {
      if (doc.isInitializing) {
        // Capture baseline after a small delay
        const t = setTimeout(async () => {
          const promise = (async () => {
            const hash = await IntegrityService.generateManifestHash(doc.manifest);
            dispatch({ type: 'CAPTURE_HASH', id: doc.id, hash });
            dispatch({ type: 'SET_INITIALIZED', id: doc.id });
          })();
          
          hashPromisesRef.current[doc.id] = promise;
          await promise;
          if (hashPromisesRef.current[doc.id] === promise) {
            hashPromisesRef.current[doc.id] = null;
          }
        }, 500);
        return () => clearTimeout(t);
      }

      // Debounced dirty check
      if (debouncedHashingRef.current[doc.id]) {
        clearTimeout(debouncedHashingRef.current[doc.id]);
      }

      debouncedHashingRef.current[doc.id] = setTimeout(async () => {
        const promise = (async () => {
          const currentHash = await IntegrityService.generateManifestHash(doc.manifest);
          const isNowDirty = currentHash !== doc.lastStableHash;
          if (isNowDirty !== doc.isDirty) {
            dispatch({ type: 'SET_DIRTY', id: doc.id, isDirty: isNowDirty });
          }
        })();

        hashPromisesRef.current[doc.id] = promise;
        await promise;
        // Only clear if it's still the same promise (prevent race from new edits)
        if (hashPromisesRef.current[doc.id] === promise) {
          hashPromisesRef.current[doc.id] = null;
          delete debouncedHashingRef.current[doc.id];
        }
      }, 200);
    });

    const currentDebounced = debouncedHashingRef.current;
    return () => {
      Object.values(currentDebounced).forEach((timer: NodeJS.Timeout) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [state.documentsById]);

  return useMemo(() => ({
    documentsById: state.documentsById,
    activeDocumentId: state.activeDocumentId,
    activeDocument,
    openDocument,
    closeDocument,
    updateDocument,
    setActiveDocument,
    captureStableSnapshot,
    flushPendingHash,
    resetDocument,
    undo,
    redo,
    undoTo,
    pushHistory,
    startTransaction,
    commitTransaction,
    abortTransaction,
    restoreHistoricalRevision,
    // Compat with Phase 7.0 primary accessor
    primaryDocument: activeDocument 
  }), [
    state.documentsById, 
    state.activeDocumentId, 
    activeDocument, 
    openDocument, 
    closeDocument, 
    updateDocument, 
    setActiveDocument, 
    captureStableSnapshot,
    flushPendingHash,
    resetDocument,
    undo,
    redo,
    undoTo,
    pushHistory,
    startTransaction,
    commitTransaction,
    abortTransaction,
    restoreHistoricalRevision
  ]);
};
