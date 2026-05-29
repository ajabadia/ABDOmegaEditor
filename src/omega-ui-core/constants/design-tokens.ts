/**
 * OMEGA ERA 7.2.3 - INDUSTRIAL DESIGN TOKENS
 * Immutable base constants for industrial governance.
 */

export const DESIGN_TOKENS = {
  colors: {
    primary: '#00f2ff',
    background: '#0e0e0f',
    surface: '#1a1c1e',
    weak: '#555555',
    text: '#ffffff',
  },
  radii: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    panel: '8px',
  },
  materials: {
    rack: 'brushed-steel',
    faceplate: 'matte-carbon',
    control: 'matte-polymer',
  },
  lighting: {
    shadowAngle: 135,
    ambientIntensity: 0.5,
    specularIntensity: 0.2,
    surfaceGrain: 0.1,
    globalBlur: 0,
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
