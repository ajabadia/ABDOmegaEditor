/**
 * @purpose Gestiona valores por defecto del manifest y normaliza los manifests cargados para asegurar la integridad estructural.
 * @purpose_en Manages default manifest values and normalizes loaded manifests to ensure structural integrity.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:ecz3so
 * @lastUpdated 2026-06-15T13:02:42.421Z
 */

import type { OMEGA_Manifest } from '../types/document';

export const DEFAULT_MANIFEST: OMEGA_Manifest = {
  id: 'new-module',
  schemaVersion: '7.2.3',
  metadata: {
    name: 'New OMEGA Module',
    author: 'Sovereign User',
    version: '1.0.0'
  },
  nodes: [],
  resources: {},
  entities: [],
  ui: {
    tree: {
      id: 'root',
      kind: 'container',
      role: 'structure',
      layout: {
        pos: { x: 0, y: 0 },
        size: { width: 400, height: 400 }
      },
      children: []
    }
  }
};

/**
 * normalizeManifest — Defensive schema migration layer.
 *
 * Called on every manifest loaded from localStorage, file import, or
 * session recovery. Guarantees that ALL required top-level properties
 * exist and have correct shapes, regardless of what schema version they
 * were saved with.
 *
 * This is the single source of truth for manifest integrity at the
 * application boundary. Components must NOT defensively patch missing
 * fields — they can assume the manifest is always normalized after this.
 */
export function normalizeManifest(raw: unknown): OMEGA_Manifest {
  const m = (raw || {}) as Partial<OMEGA_Manifest>;

  return {
    ...DEFAULT_MANIFEST,
    ...m,

    // Ensure metadata always exists with required fields
    metadata: {
      name:    'Untitled Module',
      version: '1.0.0',
      ...(m.metadata || {}),
    },

    // Ensure resources always exists
    resources: m.resources || {},

    // Ensure entities always exists
    entities: m.entities || [],

    // Ensure nodes always exists
    nodes: m.nodes || [],

    // Ensure ui always exists with a valid tree
    ui: {
      ...(m.ui || {}),
      tree: m.ui?.tree || DEFAULT_MANIFEST.ui.tree,
    },
  };
}
