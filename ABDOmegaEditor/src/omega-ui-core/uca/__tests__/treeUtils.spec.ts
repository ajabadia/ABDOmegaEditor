/**
 * Tests for captureManifestUiState — proyección del estado de authoring del
 * manifiesto ({ bind: valor }) para la reconciliación UI↔engine.
 */
import { describe, it, expect } from '@jest/globals';
import { captureManifestUiState } from '../treeUtils';
import type { OMEGA_Manifest, OmegaNode, ManifestEntity } from '../../types/manifest';

function cell(id: string, bind: string | undefined, def?: number): OmegaNode {
  return {
    id,
    kind: 'cell',
    role: 'control',
    bind,
    layout: { pos: { x: 0, y: 0 } },
    ...(def !== undefined
      ? { meta: { range: { min: 0, max: 1, default: def } } as OmegaNode['meta'] }
      : {}),
  };
}

function makeManifest(
  tree: OmegaNode | undefined,
  controls: ManifestEntity[] = [],
): OMEGA_Manifest {
  return {
    id: 'rack',
    metadata: { name: 'T', version: '1' },
    resources: {},
    entities: [],
    ui: {
      dimensions: { width: 100, height: 100 },
      controls,
      jacks: [],
      layout: { width: 100, height: 100, containers: [] },
      ...(tree ? { tree } : {}),
    },
  };
}

describe('captureManifestUiState', () => {
  it('proyecta bind → default del rango desde el árbol (incluye hijos de containers)', () => {
    const tree: OmegaNode = {
      id: 'root',
      kind: 'rack',
      role: 'root',
      layout: { pos: { x: 0, y: 0 } },
      children: [
        cell('a', 'param.a', 0.25),
        cell('b', 'param.b'), // sin default → 0.5
        {
          id: 'c',
          kind: 'container',
          role: 'infrastructure',
          layout: { pos: { x: 0, y: 0 } },
          children: [cell('d', 'param.d', 0.8)],
        },
      ],
    };

    const state = captureManifestUiState(makeManifest(tree));
    expect(state).toEqual({ 'param.a': 0.25, 'param.b': 0.5, 'param.d': 0.8 });
  });

  it('ignora celdas sin bind', () => {
    const tree: OmegaNode = {
      id: 'root',
      kind: 'rack',
      role: 'root',
      layout: { pos: { x: 0, y: 0 } },
      children: [cell('a', undefined)],
    };
    expect(captureManifestUiState(makeManifest(tree))).toEqual({});
  });

  it('fallback a entidades planas si no hay árbol hidratado', () => {
    const controls = [
      { id: 'x', type: 'knob', bind: 'flat.1', pos: { x: 0, y: 0 } },
      { id: 'y', type: 'knob', bind: 'flat.2', pos: { x: 0, y: 0 } },
    ] as ManifestEntity[];
    const state = captureManifestUiState(makeManifest(undefined, controls));
    expect(state).toEqual({ 'flat.1': 0.5, 'flat.2': 0.5 });
  });

  it('manifiesto vacío → estado vacío', () => {
    expect(captureManifestUiState(undefined)).toEqual({});
  });
});
