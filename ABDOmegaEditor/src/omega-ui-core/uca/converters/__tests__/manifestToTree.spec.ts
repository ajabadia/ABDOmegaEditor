/**
 * Tests for manifestToTree — hidrata un árbol OmegaNode desde el manifest plano.
 * Foco: preservación de estado de edición y NO duplicación de children cuando
 * se re-convierte con un existingTree que ya tiene hijos bajo containers.
 */
import { describe, it, expect } from '@jest/globals';
import { manifestToTree } from '../manifestToTree';
import type { ManifestEntity, OmegaNode, OMEGA_Manifest } from '../../../types/manifest';

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

function makeManifest(ui: Partial<OMEGA_Manifest['ui']> = {}): OMEGA_Manifest {
  return {
    id: 'rack-1',
    metadata: { name: 'Test', version: '1.0.0' },
    resources: {},
    entities: [],
    ui: {
      dimensions: { width: 480, height: 420 },
      controls: [],
      jacks: [],
      layout: { width: 480, height: 420, containers: [] },
      ...ui,
    },
  };
}

function control(id: string, containerId: string): ManifestEntity {
  return {
    id,
    type: 'knob',
    label: id,
    pos: { x: 10, y: 10 },
    size: { width: 48, height: 48 },
    presentation: {
      tab: 'MAIN',
      component: 'knob',
      variant: 'default',
      offsetX: 0,
      offsetY: 0,
      attachments: [],
      container: containerId,
    },
  };
}

function findInFace(tree: OmegaNode, id: string): OmegaNode | undefined {
  const faceNode = tree.children?.find(c => c.id === 'MAIN_FACE');
  return faceNode?.children?.find(c => c.id === id);
}

/* ─── Tests ─── */

describe('manifestToTree — duplicación de children', () => {
  it('no duplica celdas bajo un container al re-convertir con existingTree', () => {
    const existing = rack([face([container('CTR_A', [cell('cell-a'), cell('cell-b')])])]);
    const manifest = makeManifest({
      layout: {
        width: 480,
        height: 420,
        containers: [{ id: 'CTR_A', label: 'A', pos: { x: 0, y: 0 }, size: { width: 200, height: 200 }, variant: 'default' }],
      },
      controls: [control('cell-a', 'CTR_A'), control('cell-b', 'CTR_A')],
    });

    const tree = manifestToTree(manifest, existing);
    const ctr = findInFace(tree, 'CTR_A')!;
    const ids = ctr.children!.map(c => c.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(ids.length); // sin ids repetidos
    // El container fresco (que recibe las entidades) es el que queda en la cara.
    expect(findInFace(tree, 'CTR_A')!.children!.length).toBe(2);
  });

  it('no duplica containers en MAIN_FACE', () => {
    const existing = rack([face([container('CTR_A', [cell('cell-a')])])]);
    const manifest = makeManifest({
      layout: {
        width: 480,
        height: 420,
        containers: [{ id: 'CTR_A', label: 'A', pos: { x: 0, y: 0 }, size: { width: 200, height: 200 }, variant: 'default' }],
      },
      controls: [control('cell-a', 'CTR_A')],
    });

    const tree = manifestToTree(manifest, existing);
    const faceNode = tree.children!.find(c => c.id === 'MAIN_FACE')!;
    expect(faceNode.children!.filter(c => c.id === 'CTR_A')).toHaveLength(1);
  });
});

describe('manifestToTree — preservación', () => {
  it('preserva pos/style/meta del nodo previo por id (ediciones del editor)', () => {
    const existing = rack([
      face([container('CTR_A', [
        cell('cell-x', { layout: { pos: { x: 100, y: 200 }, size: { width: 48, height: 48 } }, style: { color: '#ff0000' } }),
      ])]),
    ]);
    const manifest = makeManifest({
      layout: {
        width: 480,
        height: 420,
        containers: [{ id: 'CTR_A', label: 'A', pos: { x: 0, y: 0 }, size: { width: 200, height: 200 }, variant: 'default' }],
      },
      controls: [control('cell-x', 'CTR_A')],
    });

    const tree = manifestToTree(manifest, existing);
    const ctr = findInFace(tree, 'CTR_A')!;
    const restored = ctr.children!.find(c => c.id === 'cell-x')!;

    expect(restored.layout?.pos).toEqual({ x: 100, y: 200 });
    expect(restored.style?.color).toBe('#ff0000');
    expect(ctr.children).toHaveLength(1);
  });

  it('conserva celdas que solo existen en el árbol previo (editor-only)', () => {
    const existing = rack([face([container('CTR_A', [cell('cell-a'), cell('cell-orphan')])])]);
    const manifest = makeManifest({
      layout: {
        width: 480,
        height: 420,
        containers: [{ id: 'CTR_A', label: 'A', pos: { x: 0, y: 0 }, size: { width: 200, height: 200 }, variant: 'default' }],
      },
      controls: [control('cell-a', 'CTR_A')],
    });

    const tree = manifestToTree(manifest, existing);
    const ctr = findInFace(tree, 'CTR_A')!;
    const ids = ctr.children!.map(c => c.id);

    expect(ids).toContain('cell-a');
    expect(ids).toContain('cell-orphan');
    expect(ctr.children).toHaveLength(2);
  });

  it('dedupe también las celdas directas de MAIN_FACE (sin container)', () => {
    const existing = rack([face([cell('cell-c'), cell('cell-d')])]);
    const manifest = makeManifest({
      // 'CTR_A' no existe en este manifest → la entidad cae en MAIN_FACE.
      controls: [control('cell-c', 'CTR_A')],
    });

    const tree = manifestToTree(manifest, existing);
    const faceNode = tree.children!.find(c => c.id === 'MAIN_FACE')!;
    const ids = faceNode.children!.map(c => c.id);

    expect(ids).toContain('cell-c');
    expect(ids).toContain('cell-d');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
