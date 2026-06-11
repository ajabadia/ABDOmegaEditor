'use client';
import { useEffect } from 'react';
import type { OrchestratorState, OrchestratorAction } from '../../types/document';
import { DEFAULT_MANIFEST, normalizeManifest } from '../../constants/defaults';
import { BlueprintValidator } from '@/omega-ui-core/utils/blueprintValidator';
import { persistenceService } from '@/services/persistenceService';
import { observabilityService } from '@/services/observabilityService';
import { STORAGE_KEYS } from '../../constants/storage';

export function useSessionPersistence(
  state: OrchestratorState,
  dispatch: React.Dispatch<OrchestratorAction>
) {
  useEffect(() => {
    try {
      const persisted = persistenceService.loadCanonicalState();
      if (persisted) {
        try {
          BlueprintValidator.validate(persisted.graph, { id: persisted.id });
          observabilityService.trackEvent({
            correlationId: persisted.metadata.lastCorrelationId,
            phase: 'PHASE_20_RECOVERY',
            component: 'ORCHESTRATOR',
            state: 'SUCCESS',
            message: `Rehydrated canonical state for ${persisted.id} (Hash: ${persisted.metadata.syncHash})`
          });
          const recoveredManifest = normalizeManifest({
            ...DEFAULT_MANIFEST,
            id: persisted.id,
            ui: {
              ...DEFAULT_MANIFEST.ui,
              tree: persisted.graph
            }
          });
          dispatch({
            type: 'OPEN_DOCUMENT',
            id: persisted.id,
            manifest: recoveredManifest
          });
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
          return;
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
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION_DOCS);
      if (stored) {
        const parsed = JSON.parse(stored) as OrchestratorState;
        if (parsed && parsed.documentsById) {
          Object.keys(parsed.documentsById).forEach(id => {
            const doc = parsed.documentsById[id];
            if (doc) {
              doc.manifest = normalizeManifest(doc.manifest);
              if (!doc.history) {
                doc.history = { past: [], future: [], lastSavedIndex: -1 };
              }
              if (!doc.extraResources) {
                doc.extraResources = [];
              }
              if (doc.isInitializing === undefined) {
                doc.isInitializing = false;
              }
            }
          });
        }
        dispatch({ type: 'HYDRATE_SESSION', state: parsed });
      }
    } catch (err: unknown) {
      console.error('[OMEGA ORCHESTRATOR] Session restore failed:', err);
    }
  }, [dispatch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = {
        documentsById: state.documentsById,
        activeDocumentId: state.activeDocumentId
      };
      localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(data, (key, value) => {
        if (key === 'wasmBuffer' || key === 'contract' || key === 'extraResources' || key === 'history') return undefined;
        return value;
      }));
    }
  }, [state.documentsById, state.activeDocumentId]);
}
