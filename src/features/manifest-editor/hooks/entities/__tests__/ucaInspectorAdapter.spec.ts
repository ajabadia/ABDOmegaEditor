import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, updateNodeInTree, adaptNodeToManifestEntity } from '../ucaInspectorAdapter';

/**
 * Tests for UCA Inspector Adapter & Immutable Mutations
 */
describe('ucaInspectorAdapter', () => {
  const mockTree: OmegaNode = {
    id: 'rack_master',
    kind: 'rack',
    layout: { pos: { x: 0, y: 0 } },
    children: [
      {
        id: 'main_face',
        kind: 'face',
        layout: { pos: { x: 0, y: 0 } },
        children: [
          {
            id: 'container_vcf',
            kind: 'container',
            layout: { pos: { x: 10, y: 10 }, size: { width: 100, height: 100 } },
            children: [
              {
                id: 'cutoff_knob',
                kind: 'cell',
                cellRef: 'moog_knob_01',
                bind: 'vcf.cutoff',
                role: 'control',
                layout: { pos: { x: 0, y: 0 } },
                style: { color: 'red' }
              }
            ]
          }
        ]
      }
    ]
  };

  it('should find deep nodes in the tree recursively (and memoize them)', () => {
    const node = findNodeInTree(mockTree, 'cutoff_knob');
    assert.ok(node !== undefined);
    assert.equal(node?.id, 'cutoff_knob');
    assert.equal(node?.cellRef, 'moog_knob_01');

    // Test memoization: second call should be faster/return same instance
    const nodeAgain = findNodeInTree(mockTree, 'cutoff_knob');
    assert.equal(nodeAgain, node);
  });

  it('should return undefined for missing nodes', () => {
    const node = findNodeInTree(mockTree, 'ghost_node');
    assert.equal(node, undefined);
  });

  it('should adapt an OmegaNode to a transient ManifestEntity correctly', () => {
    const node = findNodeInTree(mockTree, 'cutoff_knob');
    assert.ok(node !== undefined);
    const entity = adaptNodeToManifestEntity(node!);

    assert.equal(entity.id, 'cutoff_knob');
    assert.equal(entity.type, 'moog_knob_01'); // fallback to cellRef
    assert.equal(entity.role, 'control');
    assert.equal(entity.bind, 'vcf.cutoff');
    assert.equal(entity.presentation?.style?.color, 'red');
  });

  it('should immutably update a deep node without mutating the original tree', () => {
    const nextTree = updateNodeInTree(mockTree, 'cutoff_knob', {
      bind: 'vcf.resonance',
      presentation: {
        component: 'moog_knob_01',
        variant: 'moog_knob_02', // maps to cellRef
        tab: 'MAIN',
        offsetX: 0,
        offsetY: 0,
        attachments: [],
        style: { color: 'blue' } // merges into style
      }
    });

    // Original tree should not be mutated
    const originalNode = findNodeInTree(mockTree, 'cutoff_knob');
    assert.equal(originalNode?.bind, 'vcf.cutoff');
    assert.equal(originalNode?.style?.color, 'red');

    // New tree should reflect changes
    const updatedNode = findNodeInTree(nextTree, 'cutoff_knob');
    assert.equal(updatedNode?.bind, 'vcf.resonance');
    assert.equal(updatedNode?.cellRef, 'moog_knob_02');
    assert.equal(updatedNode?.style?.color, 'blue');

    // Immutable branch preservation: other nodes should maintain referential equality
    assert.notEqual(nextTree.children![0], mockTree.children![0]); // Face changed because child changed
    assert.equal(nextTree.children![0].id, 'main_face');
  });
});
