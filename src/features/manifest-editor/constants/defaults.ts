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
