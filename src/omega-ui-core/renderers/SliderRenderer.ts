/**
 * OMEGA UI CORE — Stateless Slider Renderer (Era 7.2.3)
 * Single Source of Truth for Slider HTML Structure.
 */
 
 import type { OmegaStyleNode } from '../types/manifest';
 
 export interface SliderProps {
   type: 'slider-v' | 'slider-h';
   size: string;      // A, B, C, D
   colorId: string;   // cyan, orange, etc.
   value: number;     // 0.0 to 1.0
   id?: string | undefined;       // Canonical ID
   inheritedFont?: string | undefined;
   inheritedSize?: number | undefined;
   inheritedColor?: string | undefined;
   style?: OmegaStyleNode | undefined; // [NEW] Era 7.2.3 Granular Style Node
   assetUrl?: string | undefined;
   frames?: number | undefined;
   orientation?: 'v' | 'h' | undefined;
 }
 
 export const renderSliderHTML = (props: SliderProps): string => {
   const { 
     type, size, colorId, value, id, style: customStyle,
     assetUrl, frames, orientation = 'v'
   } = props;
   const isHoriz = type === 'slider-h';
   
   // Logic synced with VPC v1.1
   const railStyle = isHoriz 
     ? `width: calc(${value * 100}% - 4px)` 
     : `height: calc(${value * 100}% - 4px)`;
     
   const capStyle = isHoriz 
     ? `left: calc(${value * 90}%)` 
     : `bottom: calc(${value * 90}%)`;
     
   // ERA 7.2.3 - CSS VARIABLE INJECTION
   const inlineStyles = [
     customStyle?.color ? `--omega-color-override: ${customStyle.color}` : '',
     customStyle?.indicatorColor ? `--omega-indicator-color: ${customStyle.indicatorColor}` : '',
     customStyle?.opacity !== undefined ? `opacity: ${customStyle.opacity}` : '',
     customStyle?.shadow ? `--omega-shadow: ${customStyle.shadow}` : ''
   ].filter(Boolean).join('; ');
 
   let assetHTML = '';
   if (assetUrl) {
     let backgroundStyle = `background-image: url(${assetUrl});`;
     if (frames && frames > 1) {
         const frameIndex = Math.min(Math.floor(value * frames), frames - 1);
         const percent = (frameIndex / (frames - 1)) * 100;
         backgroundStyle += orientation === 'v' 
             ? `background-position: 0% ${percent}%;` 
             : `background-position: ${percent}% 0%;`;
     }
     assetHTML = `<div class="slider-asset filmstrip-${orientation}" style="${backgroundStyle}"></div>`;
   }
 
   return `
     <div class="slider-wrapper ${type} size-${size} color-${colorId} ${assetUrl ? 'has-asset' : ''}" ${id ? `data-source="${id}"` : ''} style="${inlineStyles}">
       ${assetHTML}
       <div class="slider-rail-active" style="${railStyle}; background-color: var(--omega-indicator-color) !important;"></div>
       <div class="slider-cap" style="${capStyle}; background-color: var(--omega-color-override) !important;"></div>
     </div>
   `.trim();
 };
