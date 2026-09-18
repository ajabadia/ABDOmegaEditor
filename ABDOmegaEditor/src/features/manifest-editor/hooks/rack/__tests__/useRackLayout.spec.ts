/**
 * @jest-environment jsdom
 *
 * Tests for useRackLayout — geometría canónica del viewport del rack vía
 * resolvePanelGeometry (panel contract), sin heurísticas hardcodeadas del host
 * (antes hp*15*1.5 / literales 140 / 420).
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useRackLayout } from '../useRackLayout';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

function makeManifest(overrides: {
  hp?: number;
  units?: string;
  heightMode?: string;
  declaredHeight?: number;
} = {}): OMEGA_Manifest {
  const { hp = 12, units = '3U', heightMode, declaredHeight } = overrides;
  // Sin altura declarada → el hook debe caer a las unidades canónicas (1U=144, 3U=432).
  const ui = {
    dimensions:
      declaredHeight === undefined
        ? { width: 480 }
        : { width: 480, height: declaredHeight },
    controls: [],
    jacks: [],
    layout: { width: 480, height: declaredHeight ?? 420, containers: [] },
  } as OMEGA_Manifest['ui'];

  return {
    id: 'rack-1',
    metadata: {
      name: 'Test',
      version: '1.0.0',
      rack: {
        width: 480,
        height: declaredHeight ?? 420,
        hp,
        units,
        ...(heightMode ? { height_mode: heightMode } : {}),
      },
    },
    resources: {},
    entities: [],
    ui,
  } as OMEGA_Manifest;
}

describe('useRackLayout — geometría canónica (panel contract)', () => {
  it('deriva el ancho de hp canónico (hp * 15 * escala del viewport)', () => {
    const { result } = renderHook(() => useRackLayout(makeManifest({ hp: 12 })));
    expect(result.current.width).toBe(12 * 15 * 1.5); // 270
  });

  it('3U sin altura declarada → 432px canónicos * escala (antes literal 420)', () => {
    const { result } = renderHook(() => useRackLayout(makeManifest({ units: '3U' })));
    expect(result.current.height).toBe(432 * 1.5); // 648
  });

  it('1U → media altura canónica 144px * escala', () => {
    const { result } = renderHook(() => useRackLayout(makeManifest({ units: '1U' })));
    expect(result.current.height).toBe(144 * 1.5); // 216
  });

  it('height_mode compact → fuerza slot 1U (144px canónicos)', () => {
    const { result } = renderHook(() => useRackLayout(makeManifest({ heightMode: 'compact' })));
    expect(result.current.height).toBe(144 * 1.5); // 216
  });

  it('ui.dimensions.height declarada prevalece sobre las unidades', () => {
    const { result } = renderHook(() => useRackLayout(makeManifest({ declaredHeight: 300 })));
    expect(result.current.height).toBe(300 * 1.5); // 450
  });

  it('respeta el ancho mínimo de chassis (4HP = 60px canónicos)', () => {
    const { result } = renderHook(() => useRackLayout(makeManifest({ hp: 2 })));
    expect(result.current.width).toBe(60 * 1.5); // 90
  });

  it('expone allElements y containers del tree', () => {
    const { result } = renderHook(() => useRackLayout(makeManifest()));
    expect(Array.isArray(result.current.allElements)).toBe(true);
    expect(Array.isArray(result.current.containers)).toBe(true);
  });
});
