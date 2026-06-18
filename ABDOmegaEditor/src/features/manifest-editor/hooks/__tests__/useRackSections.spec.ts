/**
 * @jest-environment jsdom
 *
 * Tests for useRackSections hook — pure state, zero dependencies.
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useRackSections, type RackSections } from '../useRackSections';

const ALL_KEYS: (keyof RackSections)[] = [
  'identity',
  'essentialIdentity',
  'identityBranding',
  'globalUiSkin',
  'activeConstructionPlane',
  'moduleTaxonomy',
  'physicalEmulationProfile',
  'aestheticsGlobals',
  'aestheticsElements',
  'architecture',
  'diagnostics',
];

// ── Initial state ──────────────────────────────────────────────────────

describe('useRackSections — initial state', () => {
  it('should start with all 11 sections defaulting to true', () => {
    const { result } = renderHook(() => useRackSections());
    const sections = result.current.rackSections;

    expect(sections.identity).toBe(true);
    expect(sections.essentialIdentity).toBe(true);
    expect(sections.identityBranding).toBe(true);
    expect(sections.globalUiSkin).toBe(true);
    expect(sections.activeConstructionPlane).toBe(true);
    expect(sections.moduleTaxonomy).toBe(true);
    expect(sections.physicalEmulationProfile).toBe(true);
    expect(sections.aestheticsGlobals).toBe(true);
    expect(sections.aestheticsElements).toBe(true);
    expect(sections.architecture).toBe(true);
    expect(sections.diagnostics).toBe(true);
  });

  it('should contain exactly 11 keys', () => {
    const { result } = renderHook(() => useRackSections());
    const keys = Object.keys(result.current.rackSections);
    expect(keys).toHaveLength(11);
  });
});

// ── handleToggleRackSection ────────────────────────────────────────────

describe('useRackSections — handleToggleRackSection', () => {
  it('should toggle identity from true to false', () => {
    const { result } = renderHook(() => useRackSections());
    act(() => {
      result.current.handleToggleRackSection('identity');
    });
    expect(result.current.rackSections.identity).toBe(false);
  });

  it('should toggle a section back from false to true on second call', () => {
    const { result } = renderHook(() => useRackSections());
    act(() => {
      result.current.handleToggleRackSection('identity');
    });
    expect(result.current.rackSections.identity).toBe(false);

    act(() => {
      result.current.handleToggleRackSection('identity');
    });
    expect(result.current.rackSections.identity).toBe(true);
  });

  it('should preserve other sections when toggling one', () => {
    const { result } = renderHook(() => useRackSections());
    act(() => {
      result.current.handleToggleRackSection('diagnostics');
    });

    // diagnostics flipped
    expect(result.current.rackSections.diagnostics).toBe(false);
    // all others unchanged
    expect(result.current.rackSections.identity).toBe(true);
    expect(result.current.rackSections.essentialIdentity).toBe(true);
    expect(result.current.rackSections.identityBranding).toBe(true);
    expect(result.current.rackSections.globalUiSkin).toBe(true);
    expect(result.current.rackSections.activeConstructionPlane).toBe(true);
    expect(result.current.rackSections.moduleTaxonomy).toBe(true);
    expect(result.current.rackSections.physicalEmulationProfile).toBe(true);
    expect(result.current.rackSections.aestheticsGlobals).toBe(true);
    expect(result.current.rackSections.aestheticsElements).toBe(true);
    expect(result.current.rackSections.architecture).toBe(true);
  });

  it('should toggle every key independently', () => {
    const { result } = renderHook(() => useRackSections());

    for (const key of ALL_KEYS) {
      act(() => {
        result.current.handleToggleRackSection(key);
      });
    }

    // All should now be false
    for (const key of ALL_KEYS) {
      expect(result.current.rackSections[key]).toBe(false);
    }

    // Toggle all back
    for (const key of ALL_KEYS) {
      act(() => {
        result.current.handleToggleRackSection(key);
      });
    }

    for (const key of ALL_KEYS) {
      expect(result.current.rackSections[key]).toBe(true);
    }
  });

  it('should handle an unknown key gracefully (no crash)', () => {
    const { result } = renderHook(() => useRackSections());
    expect(() => {
      act(() => {
        result.current.handleToggleRackSection('nonexistent');
      });
    }).not.toThrow();
    // The unknown key adds an entry with value undefined → !undefined = true
    // but the state shape remains unchanged (RackSections doesn't have that key)
    expect(result.current.rackSections.identity).toBe(true);
  });
});

// ── Return shape ───────────────────────────────────────────────────────

describe('useRackSections — return shape', () => {
  it('should return rackSections and handleToggleRackSection', () => {
    const { result } = renderHook(() => useRackSections());
    expect(result.current).toHaveProperty('rackSections');
    expect(result.current).toHaveProperty('handleToggleRackSection');
    expect(typeof result.current.handleToggleRackSection).toBe('function');
  });
});
