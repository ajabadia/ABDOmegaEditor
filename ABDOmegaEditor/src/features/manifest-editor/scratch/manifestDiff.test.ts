/**
 * @jest-environment jsdom
 *
 * Phase 9.2 - Unit Tests for Manifest Diff Engine
 */
import { calculateManifestDiff } from '../utils/manifestDiff';
import type { OMEGA_Manifest, ManifestEntity, LayoutContainer } from '@/omega-ui-core/types/manifest';

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
    attachments: [],
  },
  size: { width: 48, height: 48 },
});

const createMockContainer = (id: string): LayoutContainer => ({
  id,
  label: 'Container',
  pos: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  variant: 'default',
  tab: 'MAIN',
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
      containers: [createMockContainer('rack_A')],
    },
  },
};

describe('manifestDiff', () => {
  it('should return 0 entries for identical manifests', () => {
    const diff = calculateManifestDiff(BASE_MANIFEST, BASE_MANIFEST);
    expect(diff.entries.length).toBe(0);
  });

  it('should detect added controls', () => {
    const target: OMEGA_Manifest = {
      ...BASE_MANIFEST,
      ui: {
        ...BASE_MANIFEST.ui!,
        controls: [...(BASE_MANIFEST.ui!.controls || []), createMockEntity('knob_2', 'Resonance')],
      },
    };
    const diff = calculateManifestDiff(BASE_MANIFEST, target);
    expect(diff.summary.added).toBe(1);
    expect(diff.entries[0].entityId).toBe('knob_2');
  });

  it('should detect modified properties (label change)', () => {
    const target: OMEGA_Manifest = {
      ...BASE_MANIFEST,
      ui: {
        ...BASE_MANIFEST.ui!,
        controls: [
          { ...(BASE_MANIFEST.ui!.controls?.[0] || createMockEntity('knob_1', 'Frequency')), label: 'Cutoff' },
        ],
      },
    };
    const diff = calculateManifestDiff(BASE_MANIFEST, target);
    expect(diff.summary.modified).toBe(1);
    expect(diff.entries[0].fieldPath).toBe('label');
    expect(diff.entries[0].before).toBe('Frequency');
    expect(diff.entries[0].after).toBe('Cutoff');
  });

  it('should detect removed containers', () => {
    const target: OMEGA_Manifest = {
      ...BASE_MANIFEST,
      ui: {
        ...BASE_MANIFEST.ui!,
        layout: { ...BASE_MANIFEST.ui!.layout!, containers: [] },
      },
    };
    const diff = calculateManifestDiff(BASE_MANIFEST, target);
    expect(diff.summary.removed).toBe(1);
    expect(diff.entries[0].entityKind).toBe('container');
  });

  it('should NOT detect add/remove for identity movement (position changes)', () => {
    const target: OMEGA_Manifest = {
      ...BASE_MANIFEST,
      ui: {
        ...BASE_MANIFEST.ui!,
        controls: [
          { ...(BASE_MANIFEST.ui!.controls?.[0] || createMockEntity('knob_1', 'Frequency')), pos: { x: 100, y: 100 } },
        ],
      },
    };
    const diff = calculateManifestDiff(BASE_MANIFEST, target);
    expect(diff.summary.added).toBe(0);
    expect(diff.summary.removed).toBe(0);
    expect(diff.summary.modified).toBe(2); // pos.x and pos.y
  });
});
