/**
 * Tests for flatToTree — normaliza un manifest plano (runtime/ACEMM) a árbol.
 * Foco: preservación de estado de edición y NO duplicación de children cuando
 * se re-convierte con un existingTree que ya tiene hijos bajo containers.
 */
import { describe, it, expect } from '@jest/globals';
import { flatToTree } from '../flatToTree';
import type { RuntimeFlatItem, RuntimeFlatManifest } from '../flatToTree';
import type { OmegaNode } from '../../../types/manifest';

/* ─── Fixtures ─── */

function cell(id: string, overrides: Partial<OmegaNode> = {}): OmegaNode {
  return {
    id,
    kind: 'cell',
    role: 'control',
    bind: id,
    layout: { pos: { x: 0, y: 0 }, size: { width: 48, height: 48 } },
    ...overrides,
  };
}

function container(id: string, children: OmegaNode[] = []): OmegaNode {
  return { id, kind: 'container', role: 'infrastructure', layout: { pos: { x: 0, y: 0 } }, children };
}

function face(children: OmegaNode[] = []): OmegaNode {
  return { id: 'MAIN_FACE', kind: 'face', role: 'presentation', layout: { pos: { x: 0, y: 0 } }, children };
}

function rack(children: OmegaNode[] = []): OmegaNode {
  return { id: 'rack-1', kind: 'rack', role: 'root', layout: { pos: { x: 0, y: 0 } }, children };
}

function flatManifest(ui: NonNullable<RuntimeFlatManifest['ui']>): RuntimeFlatManifest {
  return { id: 'rack-1', ui };
}

function flatControl(id: string, containerId: string): RuntimeFlatItem {
  return {
    id,
    type: 'knob',
    label: id,
    pos: { x: 10, y: 10 },
    presentation: { component: 'knob', container: containerId },
  };
}

function findInFace(tree: OmegaNode, id: string): OmegaNode | undefined {
  const faceNode = tree.children?.find(c => c.id === 'MAIN_FACE');
  return faceNode?.children?.find(c => c.id === id);
}

/* ─── Tests ─── */

describe('flatToTree — duplicación de children', () => {
  it('no duplica celdas bajo un container al re-convertir con existingTree', () => {
    const existing = rack([face([container('CTR_A', [cell('cell-a'), cell('cell-b')])])]);
    const manifest = flatManifest({
      dimensions: { width: 480, height: 420 },
      layout: {
        width: 480,
        height: 420,
        containers: [{ id: 'CTR_A', label: 'A', pos: { x: 0, y: 0 }, size: { w: 200, h: 200 } }],
      },
      controls: [flatControl('cell-a', 'CTR_A'), flatControl('cell-b', 'CTR_A')],
    });

    const tree = flatToTree(manifest, existing);
    const ctr = findInFace(tree, 'CTR_A')!;
    const ids = ctr.children!.map(c => c.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplica containers en MAIN_FACE', () => {
    const existing = rack([face([container('CTR_A', [cell('cell-a')])])]);
    const manifest = flatManifest({
      layout: {
        width: 480,
        height: 420,
        containers: [{ id: 'CTR_A', label: 'A', pos: { x: 0, y: 0 }, size: { w: 200, h: 200 } }],
      },
      controls: [flatControl('cell-a', 'CTR_A')],
    });

    const tree = flatToTree(manifest, existing);
    const faceNode = tree.children!.find(c => c.id === 'MAIN_FACE')!;
    expect(faceNode.children!.filter(c => c.id === 'CTR_A')).toHaveLength(1);
  });
});

describe('flatToTree — preservación', () => {
  it('preserva pos/style/meta del nodo previo por id (ediciones del editor)', () => {
    const existing = rack([
      face([container('CTR_A', [
        cell('cell-x', { layout: { pos: { x: 120, y: 240 }, size: { width: 48, height: 48 } }, style: { color: '#00ff00' } }),
      ])]),
    ]);
    const manifest = flatManifest({
      layout: {
        width: 480,
        height: 420,
        containers: [{ id: 'CTR_A', label: 'A', pos: { x: 0, y: 0 }, size: { w: 200, h: 200 } }],
      },
      controls: [flatControl('cell-x', 'CTR_A')],
    });

    const tree = flatToTree(manifest, existing);
    const ctr = findInFace(tree, 'CTR_A')!;
    const restored = ctr.children!.find(c => c.id === 'cell-x')!;

    expect(restored.layout?.pos).toEqual({ x: 120, y: 240 });
    expect(restored.style?.color).toBe('#00ff00');
    expect(ctr.children).toHaveLength(1);
  });

  it('conserva celdas que solo existen en el árbol previo (editor-only)', () => {
    const existing = rack([face([container('CTR_A', [cell('cell-a'), cell('cell-orphan')])])]);
    const manifest = flatManifest({
      layout: {
        width: 480,
        height: 420,
        containers: [{ id: 'CTR_A', label: 'A', pos: { x: 0, y: 0 }, size: { w: 200, h: 200 } }],
      },
      controls: [flatControl('cell-a', 'CTR_A')],
    });

    const tree = flatToTree(manifest, existing);
    const ctr = findInFace(tree, 'CTR_A')!;
    const ids = ctr.children!.map(c => c.id);

    expect(ids).toContain('cell-a');
    expect(ids).toContain('cell-orphan');
    expect(ctr.children).toHaveLength(2);
  });
});
