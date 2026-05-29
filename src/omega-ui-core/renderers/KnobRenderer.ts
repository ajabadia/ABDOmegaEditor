/**
 * OMEGA UI CORE — Stateless Knob Renderer (Era 7.2.3)
 * Single Source of Truth for Knob HTML Structure.
 */
 
import type { OmegaStyleNode } from '../types/manifest';

export interface KnobProps {
  size: string;          // A, B, C, D
  colorId: string;       // cyan, orange, etc.
  value: number;         // 0.0 to 1.0
  isSelected?: boolean | undefined;
  isMain?: boolean | undefined;
  id?: string | undefined;           // Canonical ID
  rotationOffset?: number | undefined; // Standard: -135
  rotationRange?: number | undefined;  // Standard: 270
  assetUrl?: string | undefined;       // URL del recurso (blob o external)
  frames?: number | undefined;         // Número de frames en el filmstrip
  orientation?: 'v' | 'h' | undefined; // Orientación del strip
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
  explicitMarkerColor?: string | undefined; // Era 7.2.3 Custom Mode
  style?: OmegaStyleNode | undefined; // [NEW] Era 7.2.3 Granular Style Node
}

export const renderKnobHTML = (props: KnobProps): string => {
  const { 
    size, 
    colorId, 
    value, 
    isSelected, 
    isMain, 
    id, 
    rotationOffset = -135, 
    rotationRange = 270,
    assetUrl,
    frames,
    orientation = 'v',
    style: customStyle
  } = props;
  
  // Canonical rotation formula
  const rotation = rotationOffset + (value * rotationRange);
  const selectedClass = isMain && isSelected ? 'selected' : '';
  const hasAssetClass = assetUrl ? 'has-asset' : '';
  
  const classes = [
    'knob-container',
    `size-${size}`,
    `color-${colorId}`,
    selectedClass,
    hasAssetClass
  ].filter(Boolean).join(' ');
  
  // ERA 7.2.3 - CSS VARIABLE INJECTION
  const markerColor = props.explicitMarkerColor || customStyle?.indicatorColor || customStyle?.color;
  
  const inlineStyles = [
    customStyle?.color ? `--omega-color-override: ${customStyle.color}` : '',
    markerColor ? `--omega-indicator-color: ${markerColor}` : '',
    customStyle?.shadow ? `--omega-shadow: ${customStyle.shadow}` : '',
    customStyle?.opacity !== undefined ? `opacity: ${customStyle.opacity}` : ''
  ].filter(Boolean).join('; ');

  const capStyle = customStyle?.color ? `background-color: ${customStyle.color} !important;` : '';

  let assetHTML = '';
  if (assetUrl) {
    let backgroundStyle = `background-image: url(${assetUrl});`;
    if (frames && frames > 1) {
        // Filmstrip Logic: Calculate which frame to show
        const frameIndex = Math.min(Math.floor(value * frames), frames - 1);
        const percent = (frameIndex / (frames - 1)) * 100;
        backgroundStyle += orientation === 'v' 
            ? `background-position: 0% ${percent}%;` 
            : `background-position: ${percent}% 0%;`;
    }
    assetHTML = `<div class="knob-asset filmstrip-${orientation}" style="${backgroundStyle}"></div>`;
  }

  const markerStyle = `--knob-rotation: ${rotation}deg; ${markerColor ? `background-color: ${markerColor} !important;` : ''}`;

  return `
    <div class="${classes}" ${id ? `data-source="${id}"` : ''} style="${inlineStyles}">
      <div class="knob-shadow-ring"></div>
      ${assetHTML}
      <div class="knob-cap" style="${capStyle}">
        <div class="knob-specular"></div>
      </div>
      <div class="knob-marker" style="${markerStyle}"></div>
    </div>
  `.trim();
};
