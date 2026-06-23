/**
 * @jest-environment jsdom
 *
 * Tests for useInspectorSections hook — section definitions,
 * active section state, visibility filtering, and level-based rendering.
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useInspectorSections } from '../useInspectorSections';
import type { UseInspectorSectionsOptions } from '../useInspectorSections';

// ── Default options presets ────────────────────────────────────────────

function nodeOptions(overrides?: Partial<UseInspectorSectionsOptions>): UseInspectorSectionsOptions {
  return { isModule: false, isBulk: false, inspectorLevel: 'medium', ...overrides };
}

function moduleOptions(overrides?: Partial<UseInspectorSectionsOptions>): UseInspectorSectionsOptions {
  return { isModule: true, isBulk: false, inspectorLevel: 'medium', ...overrides };
}

function bulkOptions(overrides?: Partial<UseInspectorSectionsOptions>): UseInspectorSectionsOptions {
  return { isModule: false, isBulk: true, inspectorLevel: 'medium', ...overrides };
}

function getSectionIds(defs: ReturnType<typeof useInspectorSections>['sectionDefs']): string[] {
  return defs.map((s) => s.id);
}

function getSectionLabels(defs: ReturnType<typeof useInspectorSections>['sectionDefs']): string[] {
  return defs.map((s) => s.label);
}

// ── Initial state / default sections ───────────────────────────────────

describe('useInspectorSections — default section definitions', () => {
  it('should return identity and sim for simple-level node mode', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'simple' })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).toEqual(['identity', 'simulation']);
  });

  it('should return identity, sim, aesthetics, and logic for medium-level node mode', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'medium' })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).toContain('identity');
    expect(ids).toContain('simulation');
    expect(ids).toContain('aesthetics');
    expect(ids).toContain('architecture');
    expect(ids).not.toContain('diagnostics');
  });

  it('should return all sections for advanced-level node mode including diagnostics', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'advanced' })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).toContain('identity');
    expect(ids).toContain('simulation');
    expect(ids).toContain('aesthetics');
    expect(ids).toContain('architecture');
    expect(ids).toContain('diagnostics');
  });

  it('should return identity, ui-skin, plane, emulation, globals, elements, arch for medium-level module mode', () => {
    const { result } = renderHook(() =>
      useInspectorSections(moduleOptions({ inspectorLevel: 'medium' })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).toContain('identity');
    expect(ids).toContain('ui-skin');
    expect(ids).toContain('plane');
    expect(ids).toContain('emulation');
    expect(ids).toContain('globals');
    expect(ids).toContain('aesthetics');
    expect(ids).toContain('architecture');
    expect(ids).not.toContain('simulation');
    expect(ids).not.toContain('diagnostics');
  });

  it('should NOT include simulation for module mode', () => {
    const { result } = renderHook(() =>
      useInspectorSections(moduleOptions({ inspectorLevel: 'medium' })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).not.toContain('simulation');
  });

  it('should NOT include node-only sections for module mode', () => {
    const { result } = renderHook(() =>
      useInspectorSections(moduleOptions({ inspectorLevel: 'advanced' })),
    );
    const labels = getSectionLabels(result.current.sectionDefs);
    // Node-specific labels
    expect(labels).not.toContain('Sim');
  });
});

// ── Bulk mode ──────────────────────────────────────────────────────────

describe('useInspectorSections — bulk mode', () => {
  it('should return empty sections for bulk mode when isModule is false', () => {
    const { result } = renderHook(() =>
      useInspectorSections(bulkOptions({ inspectorLevel: 'medium' })),
    );
    // Bulk with isModule=false: no identity, no module sections, no simulation
    // Only medium/advanced sections: aesthetics, architecture — but isBulk blocks architecture
    // For node bulk: aesthetics appears (no isModule guard)
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).toHaveLength(1); // only 'aesthetics'
    expect(ids).not.toContain('identity');
    expect(ids).not.toContain('simulation');
    expect(ids).not.toContain('architecture'); // blocked by isBulk
    expect(ids).not.toContain('diagnostics');
  });

  it('should return even fewer sections when inspectorLevel is simple in bulk mode', () => {
    const { result } = renderHook(() =>
      useInspectorSections(bulkOptions({ inspectorLevel: 'simple' })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    // simple level: no medium/advanced sections → only section is from basic level which requires !isBulk
    // So: identity (blocked by isBulk), simulation (blocked by isBulk) → empty
    expect(ids).toHaveLength(0);
  });
});

// ── Level-based filtering ──────────────────────────────────────────────

describe('useInspectorSections — level-based visibility', () => {
  it('should not include globals or diagnostics at simple level for module mode', () => {
    const { result } = renderHook(() =>
      useInspectorSections(moduleOptions({ inspectorLevel: 'simple' })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).not.toContain('globals');
    expect(ids).not.toContain('diagnostics');
    expect(ids).not.toContain('aesthetics');
    expect(ids).not.toContain('architecture');
  });

  it('should include globals, aesthetics, and architecture at medium level for module mode', () => {
    const { result } = renderHook(() =>
      useInspectorSections(moduleOptions({ inspectorLevel: 'medium' })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).toContain('globals');
    expect(ids).toContain('aesthetics');
    expect(ids).toContain('architecture');
  });

  it('should include diagnostics only at advanced level for node mode', () => {
    const simple = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'simple' })),
    );
    const medium = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'medium' })),
    );
    const advanced = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'advanced' })),
    );

    expect(getSectionIds(simple.result.current.sectionDefs)).not.toContain('diagnostics');
    expect(getSectionIds(medium.result.current.sectionDefs)).not.toContain('diagnostics');
    expect(getSectionIds(advanced.result.current.sectionDefs)).toContain('diagnostics');
  });
});

// ── Section labels ─────────────────────────────────────────────────────

describe('useInspectorSections — section labels', () => {
  it('should use "Design" label for node aesthetics and "Elements" for module', () => {
    const node = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'medium' })),
    );
    const mod = renderHook(() =>
      useInspectorSections(moduleOptions({ inspectorLevel: 'medium' })),
    );

    const nodeAesthetics = node.result.current.sectionDefs.find((s) => s.id === 'aesthetics');
    const modAesthetics = mod.result.current.sectionDefs.find((s) => s.id === 'aesthetics');

    expect(nodeAesthetics?.label).toBe('Design');
    expect(modAesthetics?.label).toBe('Elements');
  });

  it('should use "Logic" label for node architecture and "Arch" for module', () => {
    const node = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'medium' })),
    );
    const mod = renderHook(() =>
      useInspectorSections(moduleOptions({ inspectorLevel: 'medium' })),
    );

    const nodeArch = node.result.current.sectionDefs.find((s) => s.id === 'architecture');
    const modArch = mod.result.current.sectionDefs.find((s) => s.id === 'architecture');

    expect(nodeArch?.label).toBe('Logic');
    expect(modArch?.label).toBe('Arch');
  });

  it('should include "Registry" label for diagnostics', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'advanced' })),
    );
    const diag = result.current.sectionDefs.find((s) => s.id === 'diagnostics');
    expect(diag?.label).toBe('Registry');
  });
});

// ── visibleSections filtering ──────────────────────────────────────────

describe('useInspectorSections — visibleSections filtering', () => {
  it('should exclude identity section when visibleSections.identity is false', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ visibleSections: { identity: false } })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).not.toContain('identity');
  });

  it('should exclude aesthetics when visibleSections.aestheticsElements is false', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ visibleSections: { aestheticsElements: false } })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).not.toContain('aesthetics');
  });

  it('should exclude architecture when visibleSections.architecture is false', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ visibleSections: { architecture: false } })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).not.toContain('architecture');
  });

  it('should include section by default when visibleSections field is not set (undefined)', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ visibleSections: {} })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    // All default-visible sections should appear
    expect(ids).toContain('identity');
    expect(ids).toContain('simulation');
    expect(ids).toContain('aesthetics');
    expect(ids).toContain('architecture');
  });

  it('should hide module-only sections when their visibility is false', () => {
    const { result } = renderHook(() =>
      useInspectorSections(moduleOptions({
        visibleSections: { globalUiSkin: false, activeConstructionPlane: false, physicalEmulationProfile: false },
      })),
    );
    const ids = getSectionIds(result.current.sectionDefs);
    expect(ids).not.toContain('ui-skin');
    expect(ids).not.toContain('plane');
    expect(ids).not.toContain('emulation');
    expect(ids).toContain('identity');     // still visible
    expect(ids).toContain('aesthetics');   // still visible
  });
});

// ── Active section state ───────────────────────────────────────────────

describe('useInspectorSections — active section state', () => {
  it('should default to "identity" when no activeSectionProp provided', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions()),
    );
    expect(result.current.activeSection).toBe('identity');
  });

  it('should use activeSectionProp as initial value', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ activeSectionProp: 'aesthetics' })),
    );
    expect(result.current.activeSection).toBe('aesthetics');
  });

  it('should update section when setActiveSection is called', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions()),
    );

    act(() => {
      result.current.setActiveSection('aesthetics');
    });

    expect(result.current.activeSection).toBe('aesthetics');
  });

  it('should sync with activeSectionProp when it changes externally', () => {
    const { rerender, result } = renderHook(
      (opts: UseInspectorSectionsOptions) => useInspectorSections(opts),
      { initialProps: nodeOptions({ activeSectionProp: 'identity' }) },
    );

    act(() => {
      result.current.setActiveSection('aesthetics');
    });
    expect(result.current.activeSection).toBe('aesthetics');

    // Re-render with new activeSectionProp
    rerender(nodeOptions({ activeSectionProp: 'diagnostics', inspectorLevel: 'advanced' }));

    expect(result.current.activeSection).toBe('diagnostics');
  });

  it('should auto-select first available section when active section is no longer in sectionDefs', () => {
    const { rerender, result } = renderHook(
      (opts: UseInspectorSectionsOptions) => useInspectorSections(opts),
      { initialProps: nodeOptions({ activeSectionProp: 'diagnostics', inspectorLevel: 'advanced' }) },
    );

    // Start with advanced: diagnostics IS available
    expect(result.current.activeSection).toBe('diagnostics');

    // Rerender with simple level: diagnostics is no longer available
    rerender(nodeOptions({ activeSectionProp: 'diagnostics', inspectorLevel: 'simple' }));

    // Should auto-select first section (identity)
    expect(result.current.activeSection).toBe('identity');
  });
});

// ── Return shape ───────────────────────────────────────────────────────

describe('useInspectorSections — return shape', () => {
  it('should return sectionDefs, activeSection, and setActiveSection', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions()),
    );

    expect(result.current).toHaveProperty('sectionDefs');
    expect(result.current).toHaveProperty('activeSection');
    expect(result.current).toHaveProperty('setActiveSection');
    expect(Array.isArray(result.current.sectionDefs)).toBe(true);
    expect(typeof result.current.activeSection).toBe('string');
    expect(typeof result.current.setActiveSection).toBe('function');
  });

  it('should have color and icon on each section definition', () => {
    const { result } = renderHook(() =>
      useInspectorSections(nodeOptions({ inspectorLevel: 'advanced' })),
    );

    for (const section of result.current.sectionDefs) {
      expect(section).toHaveProperty('id');
      expect(section).toHaveProperty('label');
      expect(section).toHaveProperty('icon');
      expect(section).toHaveProperty('color');
    }
  });
});
