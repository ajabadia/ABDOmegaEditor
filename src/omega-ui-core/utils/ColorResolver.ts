import type { OMEGA_Manifest } from '../types/manifest';

/**
 * OMEGA COLOR RESOLUTION ENGINE (Era 7.2.3)
 * The single source of truth for translating theme tokens to HEX across all renderers.
 */
export class ColorResolver {
  /**
   * Translates a color token or value into a physical HEX color.
   */
  static resolve(col: string | undefined, manifest?: OMEGA_Manifest): string {
    if (!col || col === 'none') return 'transparent';
    if (col === 'transparent' || col === 'white' || col === 'black') return col;

    // ERA 7.2.3 - Hybrid Token/Alpha Resolution (DRY Philosophy)
    let baseColor = col;
    let alpha = 1;

    if (col.includes('/')) {
      const parts = col.split('/');
      baseColor = parts[0] || col;
      alpha = parseFloat(parts[1] || '1') || 1;
    }

    const resolveBase = (c: string): string => {
      if (c.startsWith('#') || c.startsWith('rgba') || c.startsWith('rgb')) return c;

      // Era 7.2.3 Canonical Defaults
      const defaults: Record<string, string> = {
        primary: '#00f2ff',
        secondary: '#ff8c00',
        utility: '#a0a0a0',
        feedback: '#32cd32',
        surface: '#121416',
        hardware: '#777777',
        chassis: '#1a1a1a',
        text: '#ffffff',
        glow: '#00f2ff',
        glass: 'rgba(255,255,255,0.05)',
        warning: '#ff3300',
        highlight: '#ffffff',
        weak: '#555555'
      };

      const palette = (manifest?.ui?.palette || {}) as Record<string, string | undefined>;
      const colors = (manifest?.ui?.colors || {}) as Record<string, string | undefined>;
      const fullPalette: Record<string, string | undefined> = { ...defaults, ...palette, ...colors };
      return fullPalette[c] || c;
    };

    const resolvedHex = resolveBase(baseColor);
    const hasExplicitAlpha = col.includes('/');
    
    // Apply Alpha if explicitly requested or if it's not 1.0
    if (hasExplicitAlpha || alpha < 1) {
      if (resolvedHex.startsWith('#')) {
        const r = parseInt(resolvedHex.slice(1, 3), 16);
        const g = parseInt(resolvedHex.slice(3, 5), 16);
        const b = parseInt(resolvedHex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      if (resolvedHex.startsWith('rgba')) {
        return resolvedHex.replace(/[\d.]+\)$/, `${alpha})`);
      }
    }

    return resolvedHex;
  }

  /**
   * Recursively resolves all color properties in a style node.
   */
  static resolveStyle<T extends Record<string, unknown>>(style: T | undefined, manifest?: OMEGA_Manifest): T {
    if (!style) return {} as T;
    const resolved = { ...style } as Record<string, unknown>;
    
    // List of all 13 properties that are known to contain color tokens
    const colorProps = [
      'color', 'indicatorColor', 'glowColor', 'glassColor', 'fontColor', 
      'shadowColor', 'ambientColor', 'specularColor', 'warningColor',
      'borderColor', 'backgroundColor', 'activeColor', 'hoverColor'
    ];
    
    colorProps.forEach(prop => {
      if (typeof resolved[prop] === 'string') {
        resolved[prop] = ColorResolver.resolve(resolved[prop] as string, manifest);
      }
    });
    
    return resolved as T;
  }
}
