/**
 * @purpose Gestiona el estado persistente del gráfico canónico del editor de manifestaciones OMEGA en localStorage.
 * @purpose_en Manages the persistence of the OMEGA manifest editor's canonical graph state in localStorage.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:3sci5j
 * @lastUpdated 2026-06-15T17:02:48.358Z
 */

import { observabilityService } from './observabilityService';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

export interface PersistedState {
  id: string;
  graph: OmegaNode;
  metadata: {
    schemaVersion: string;
    lastCorrelationId: string;
    timestamp: number;
    syncHash: string;
  };
}

const STORAGE_KEY = 'omega_canonical_session';

class PersistenceService {
  /**
   * saveCanonicalState
   * Persists the validated canonical graph to disk.
   */
  saveCanonicalState(id: string, graph: OmegaNode, correlationId: string, hash: string, version: string = '7.2.3') {
    try {
      const state: PersistedState = {
        id,
        graph,
        metadata: {
          schemaVersion: version,
          lastCorrelationId: correlationId,
          timestamp: Date.now(),
          syncHash: hash
        }
      };

      const payload = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, payload);

      observabilityService.trackEvent({
        correlationId,
        phase: 'PHASE_20_PERSISTENCE',
        component: 'PERSISTENCE_SERVICE',
        state: 'SUCCESS',
        message: `Canonical state persisted for document ${id}`
      });
    } catch {
      observabilityService.trackEvent({
        correlationId,
        phase: 'PHASE_20_PERSISTENCE',
        component: 'PERSISTENCE_SERVICE',
        state: 'FAILURE',
        code: 'PERSIST_FAILED',
        message: 'Failed to save state to localStorage'
      });
    }
  }

  /**
   * loadCanonicalState
   * Retrieves the raw persisted state.
   */
  loadCanonicalState(): PersistedState | null {
    try {
      const payload = localStorage.getItem(STORAGE_KEY);
      if (!payload) return null;
      return JSON.parse(payload) as PersistedState;
    } catch {
      console.error('[OMEGA PERSISTENCE] Corrupt state found in storage.');
      return null;
    }
  }

  /**
   * clearPersistedState
   * Explicitly wipes the session (used for migrations or corruption).
   */
  clearPersistedState() {
    localStorage.removeItem(STORAGE_KEY);
    observabilityService.trackEvent({
      correlationId: 'system',
      phase: 'PHASE_20_PERSISTENCE',
      component: 'PERSISTENCE_SERVICE',
      state: 'ROLLBACK',
      message: 'Persisted state cleared manually'
    });
  }
}

export const persistenceService = new PersistenceService();
