/**
 * Tests for CADExportService — geometría del blueprint derivada del panel
 * contract (resolvePanelGeometry + RACK_HP_WIDTH_PX), sin heurísticas
 * hardcodeadas del host (antes hp*15*1.5 / literales 140 / 420 / 0.33866).
 */
import { describe, it, expect } from '@jest/globals';
import { CADExportService } from './cadExportService';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

const OPTS = {
  skin: 'carbon',
  drillLayer: true,
  silkscreenLayer: true,
  dimensions: true,
};

function makeManifest(overrides: {
  hp?: number;
  units?: string;
  compact?: boolean;
  declaredHeight?: number;
} = {}): OMEGA_Manifest {
  const { hp = 12, units = '3U', compact = false, declaredHeight } = overrides;
  // Sin altura declarada → geometría canónica por unidades (1U=144, 3U=432).
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
        ...(compact ? { height_mode: 'compact' } : {}),
      },
    },
    resources: {},
    entities: [],
    ui,
  } as OMEGA_Manifest;
}

describe('CADExportService — geometría canónica (panel contract)', () => {
  it('deriva el ancho del blueprint de hp canónico (hp * 15 * escala + márgenes)', () => {
    const svg = CADExportService.generateSVGBlueprint(makeManifest({ hp: 12 }), OPTS);
    // 12 * 15 * 1.5 = 270 + 2 * 100 (margin) = 470
    expect(svg).toContain('width="470"');
    expect(svg).toContain('viewBox="0 0 470 ');
  });

  it('3U sin altura declarada → 432px canónicos * escala', () => {
    const svg = CADExportService.generateSVGBlueprint(makeManifest({ units: '3U' }), OPTS);
    // 432 * 1.5 = 648 + 200 = 848
    expect(svg).toContain('height="848"');
  });

  it('height_mode compact → 144px canónicos (1U)', () => {
    const svg = CADExportService.generateSVGBlueprint(makeManifest({ compact: true }), OPTS);
    // 144 * 1.5 = 216 + 200 = 416
    expect(svg).toContain('height="416"');
  });

  it('altura declarada prevalece sobre las unidades', () => {
    const svg = CADExportService.generateSVGBlueprint(makeManifest({ declaredHeight: 300 }), OPTS);
    // 300 * 1.5 = 450 + 200 = 650
    expect(svg).toContain('height="650"');
  });

  it('calibración PIXELS_TO_MM derivada de RACK_HP_WIDTH_PX (5.08 / 15)', () => {
    const svg = CADExportService.generateSVGBlueprint(makeManifest(), OPTS);
    expect(svg).toContain('1px = 0.3386');
  });
});
