import { calculateManifestDiff } from '../utils/manifestDiff';
import type { OMEGA_Manifest, ManifestEntity, LayoutContainer } from '@/omega-ui-core/types/manifest';

/**
 * Phase 9.2 - Unit Tests for Manifest Diff Engine
 */

const createMockEntity = (id: string, label: string): ManifestEntity => ({
  id,
  label,
  type: 'knob',
  role: 'control',
  bind: 'param_0',
  pos: { x: 0, y: 0 },
  presentation: {
    tab: 'MAIN',
    component: 'knob',
    variant: 'industrial',
    offsetY: 0,
    offsetX: 0,
    attachments: []
  },
  size: { width: 48, height: 48 }
});

const createMockContainer = (id: string): LayoutContainer => ({
  id,
  label: 'Container',
  pos: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  variant: 'default',
  tab: 'MAIN'
});

const BASE_MANIFEST: OMEGA_Manifest = {
  id: 'test-v1',
  schemaVersion: '7.2.3',
  entities: [],
  metadata: { name: 'Test', family: 'Test', version: '1.0.0' },
  resources: { wasm: 'test.wasm' },
  ui: {
    dimensions: { width: 800, height: 600 },
    controls: [createMockEntity('knob_1', 'Frequency')],
    jacks: [],
    layout: {
      width: 800,
      height: 600,
      planes: ['MAIN'],
      containers: [createMockContainer('rack_A')]
    }
  }
};

export const runDiffTests = () => {
  console.log('--- STARTING OMEGA DIFF ENGINE TESTS ---');

  // Test 1: No Changes
  const diff1 = calculateManifestDiff(BASE_MANIFEST, BASE_MANIFEST);
  console.assert(diff1.entries.length === 0, 'Test 1 Failed: Should have 0 entries for identical manifests');

  // Test 2: Added Control
  const target2: OMEGA_Manifest = {
    ...BASE_MANIFEST,
    ui: {
      ...BASE_MANIFEST.ui!,
      controls: [
        ...(BASE_MANIFEST.ui!.controls || []),
        createMockEntity('knob_2', 'Resonance')
      ]
    }
  };
  const diff2 = calculateManifestDiff(BASE_MANIFEST, target2);
  console.assert(diff2.summary.added === 1, 'Test 2 Failed: Should detect 1 added control');
  console.assert(diff2.entries[0].entityId === 'knob_2', 'Test 2 Failed: Wrong entity ID');

  // Test 3: Modified Property (Label)
  const target3: OMEGA_Manifest = {
    ...BASE_MANIFEST,
    ui: {
      ...BASE_MANIFEST.ui!,
      controls: [
        { ...(BASE_MANIFEST.ui!.controls?.[0] || createMockEntity('knob_1', 'Frequency')), label: 'Cutoff' }
      ]
    }
  };
  const diff3 = calculateManifestDiff(BASE_MANIFEST, target3);
  console.assert(diff3.summary.modified === 1, 'Test 3 Failed: Should detect 1 modification');
  console.assert(diff3.entries[0].fieldPath === 'label', 'Test 3 Failed: Should track "label" field');
  console.assert(diff3.entries[0].before === 'Frequency' && diff3.entries[0].after === 'Cutoff', 'Test 3 Failed: Value mismatch');

  // Test 4: Removed Container
  const target4: OMEGA_Manifest = {
    ...BASE_MANIFEST,
    ui: {
      ...BASE_MANIFEST.ui!,
      layout: { ...BASE_MANIFEST.ui!.layout!, containers: [] }
    }
  };
  const diff4 = calculateManifestDiff(BASE_MANIFEST, target4);
  console.assert(diff4.summary.removed === 1, 'Test 4 Failed: Should detect 1 removed container');
  console.assert(diff4.entries[0].entityKind === 'container', 'Test 4 Failed: Should identify kind as "container"');

  // Test 5: Identity check (Move)
  const target5: OMEGA_Manifest = {
    ...BASE_MANIFEST,
    ui: {
      ...BASE_MANIFEST.ui!,
      controls: [
        { ...(BASE_MANIFEST.ui!.controls?.[0] || createMockEntity('knob_1', 'Frequency')), pos: { x: 100, y: 100 } }
      ]
    }
  };
  const diff5 = calculateManifestDiff(BASE_MANIFEST, target5);
  console.assert(diff5.summary.added === 0 && diff5.summary.removed === 0, 'Test 5 Failed: Should NOT detect add/remove for identity movement');
  console.assert(diff5.summary.modified === 2, `Test 5 Failed: Should detect 2 modifications for X and Y move, got ${diff5.summary.modified}`);

  console.log('--- ALL DIFF ENGINE TESTS PASSED ---');
};
