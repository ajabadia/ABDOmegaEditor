/**
 * OMEGA UI CORE — CONTAINER RENDERER (Era 7.2.3)
 * ---------------------------------------------------------------------------
 * Static HTML generator for architectural module sections.
 * Ensures 100% parity across all rendering contexts.
 */

import type { Presentation, OMEGA_Manifest, OmegaStyleNode } from '../types/manifest';
import { ColorResolver } from '../utils/ColorResolver';

interface ContainerRenderProps {
  id: string;
  label: string;
  variant: string;
  manifest?: OMEGA_Manifest | undefined;
  style?: OmegaStyleNode | undefined;
  isSelected?: boolean | undefined;
  isError?: boolean | undefined;
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
}

export function renderContainerHTML(props: ContainerRenderProps): string {
  const { label, variant, manifest, style: aesthetics = {}, isSelected, isError, resolveAsset } = props;

  // 1. Resolve Genes (Aesthetic lookup)
  const libStyles = manifest?.ui?.styles?.container || [];
  const libStyle = libStyles.find((s) => s.id === variant) || { aesthetics: {} as Partial<Presentation> };
  const genetics = libStyle.aesthetics || {};

  // 2. Compute Surface Styles
  const bgAsset = aesthetics.asset || genetics.asset;
  const bgUrl = resolveAsset ? resolveAsset(bgAsset) : undefined;
  
  const rounding = (aesthetics as Record<string, unknown>).rounding as number ?? (genetics as Record<string, unknown>).rounding as number ?? 0;
  const borderWidth = (aesthetics as Record<string, unknown>).borderWidth as number ?? (genetics as Record<string, unknown>).borderWidth as number ?? 0;
  const opacity = (aesthetics as Record<string, unknown>).opacity as number ?? (genetics as Record<string, unknown>).opacity as number ?? 1.0;
  const bgColor = ColorResolver.resolve((aesthetics as Record<string, unknown>).color as string || (genetics as Record<string, unknown>).color as string, manifest);
  const borderColor = ColorResolver.resolve((aesthetics as Record<string, unknown>).indicatorColor as string || (genetics as Record<string, unknown>).indicatorColor as string, manifest);

  // 3. Compute Label Spatiality & Surface
  const labelX = (aesthetics as Record<string, unknown>).labelX as number ?? (genetics as Record<string, unknown>).labelX as number ?? 0;
  const labelY = (aesthetics as Record<string, unknown>).labelY as number ?? (genetics as Record<string, unknown>).labelY as number ?? 0;
  const labelW = (aesthetics as Record<string, unknown>).labelW as number ?? (genetics as Record<string, unknown>).labelW as number ?? 0;
  const labelH = (aesthetics as Record<string, unknown>).labelH as number ?? (genetics as Record<string, unknown>).labelH as number ?? 0;
  const labelBg = ColorResolver.resolve((aesthetics as Record<string, unknown>).labelBg as string || (genetics as Record<string, unknown>).labelBg as string, manifest);
  const labelRounding = (aesthetics as Record<string, unknown>).labelRounding as number ?? (genetics as Record<string, unknown>).labelRounding as number ?? 0;
  const labelPadding = (aesthetics as Record<string, unknown>).labelPadding as number ?? (genetics as Record<string, unknown>).labelPadding as number ?? 4;

  // 4. Compute Typography
  const font = (aesthetics as Record<string, unknown>).font as string || (genetics as Record<string, unknown>).font as string || 'Inter';
  const fontSize = (aesthetics as Record<string, unknown>).fontSize as number || (genetics as Record<string, unknown>).fontSize as number || 10;
  const fontColor = ColorResolver.resolve((aesthetics as Record<string, unknown>).fontColor as string || (genetics as Record<string, unknown>).fontColor as string || '#ffffff', manifest);
  const alignment = (aesthetics as Record<string, unknown>).alignment as string || (genetics as Record<string, unknown>).alignment as string || 'left';
  const flexAlign = alignment === 'left' ? 'flex-start' : (alignment === 'right' ? 'flex-end' : 'center');
  const spacing = (aesthetics as Record<string, unknown>).spacing as number || (genetics as Record<string, unknown>).spacing as number || 0;

  return `
    <div 
      class="industrial-container-surface ${isSelected ? 'selected' : ''} ${isError ? 'error' : ''}"
      style="
        position: absolute;
        inset: 0;
        background-color: ${bgColor};
        background-image: ${bgUrl ? `url(${bgUrl})` : 'none'};
        background-size: cover;
        background-position: center;
        border: ${borderWidth}px solid ${borderColor};
        border-radius: ${rounding}px;
        opacity: ${opacity};
        overflow: hidden;
      "
    >
      <div 
        class="container-label-fragment"
        style="
          position: absolute;
          left: ${labelX}px;
          top: ${labelY}px;
          width: ${labelW ? `${labelW}px` : 'auto'};
          height: ${labelH ? `${labelH}px` : 'auto'};
          background-color: ${labelBg};
          border-radius: ${labelRounding}px;
          padding: ${labelPadding}px;
          display: flex;
          align-items: center;
          justify-content: ${flexAlign};
          white-space: nowrap;
          z-index: 10;
        "
      >
        <span style="
          font-family: ${font};
          font-size: ${fontSize}px;
          color: ${fontColor};
          text-align: ${alignment};
          letter-spacing: ${spacing}px;
          line-height: 1;
          width: 100%;
        ">
          ${isError ? '⚠️ INTEGRITY_LEAK' : label}
        </span>
      </div>
    </div>
  `.trim();
}
