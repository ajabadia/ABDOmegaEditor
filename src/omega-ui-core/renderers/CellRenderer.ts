/**
 * ⚠️ OMEGA UI CORE — MASTER ENGINE (Era 7.2.3)
 * ---------------------------------------------------------------------------
 * This is the SINGLE SOURCE OF TRUTH for OMEGA rendering.
 * It handles both architectural structures and primitive controls natively.
 * ---------------------------------------------------------------------------
 */

import { renderKnobHTML } from './KnobRenderer';
import { renderPortHTML } from './PortRenderer';
import { renderLedHTML } from './LedRenderer';
import { renderSliderHTML } from './SliderRenderer';
import { renderDisplayHTML } from './DisplayRenderer';
import { renderSwitchHTML } from './SwitchRenderer';
import { renderStepperHTML } from './StepperRenderer';
import { renderSelectHTML } from './SelectRenderer';
import { renderScopeHTML } from './ScopeRenderer';
import { renderTerminalHTML } from './TerminalRenderer';
import { renderIllustrationHTML } from './IllustrationRenderer';
import { renderSequenceHTML } from './SequenceRenderer';
import { AttachmentRenderer } from './AttachmentRenderer';
import type { OmegaNode, OMEGA_Manifest, OmegaStyleNode, OMEGA_Asset, StyleVariant, Attachment } from '../types/manifest';
import type { SelectOption } from './SelectRenderer';
 
import { parseVariant } from './utils/VariantParser';
import { getComponentRadius } from './utils/CellMetrics';
import { renderAttachmentStackHTML } from './utils/AttachmentStack';
import { getInheritedTypography } from './utils/TypographyInheritance';
import { ColorResolver } from '../utils/ColorResolver';

export interface CellOptions {
  skin: string;
  zoom: number;
  runtimeValue: number;
  steps: number;
  isSelected?: boolean | undefined;
  isLiveMode?: boolean | undefined;
  isError?: boolean | undefined;
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
  manifest?: OMEGA_Manifest | undefined;
  activeTab?: string | undefined;
  forceFrame?: number | undefined; 
  recipe?: import('../types/assetBehavior.js').LayerRecipe | undefined; 
}


interface RendererExtraOptions {
  assetUrl?: string | undefined;
  assetDef?: OMEGA_Asset | undefined;
  steps: number;
  runtimeValue: number;
  inherited: Record<string, unknown>;
  manifest?: OMEGA_Manifest | undefined;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  forceFrame?: number | undefined;
}

interface MasterRendererProps {
  size: string;
  colorId: string;
  value: number;
  id: string;
  isSelected: boolean;
  isMain: boolean;
  style: Partial<OmegaStyleNode>;
}

/**
 * Registry of primitive renderers for industrial dispatching.
 */
const COMP_RENDERER_MAP: Record<string, (node: OmegaNode, props: MasterRendererProps, options: RendererExtraOptions) => string> = {
  'sequence-layer': (node, props, opt) => {
    const style = (node.style as Record<string, unknown>) || {};
    const frames = (style.frames as number) || 1;
    const frameWidth = (style.frameWidth as number) || 48;
    const frameHeight = (style.frameHeight as number) || 48;
    const orientation = (style.orientation as 'v' | 'h') || 'v';
    const opacity = style.opacity !== undefined ? (style.opacity as number) : 1;

    return renderSequenceHTML({
      assetUrl: opt.assetUrl,
      value: opt.forceFrame !== undefined ? opt.forceFrame : opt.runtimeValue,
      frames,
      frameWidth,
      frameHeight,
      orientation,
      opacity,
      style,
      isFrameIndex: opt.forceFrame !== undefined 
    });
  },
  'graphic-fragment': (node, props, opt) => {
    return AttachmentRenderer.renderAttachmentHTML({
      type: 'graphic-fragment',
      variant: node.style?.variant || 'A_default',
      text: (node.meta?.label as string) || node.id || '',
      value: opt.runtimeValue,
      steps: opt.steps,
      style: node.style,
      manifest: opt.manifest,
      resolveAsset: opt.resolveAsset
    });
  },
  'knob': (node, props, opt) => {
    const isCustom = opt.manifest?.ui?.skinMode === 'custom';
    const style = node.style || {};
    
    // Explicitly resolve both channels separately
    const resolvedIndicator = isCustom ? ColorResolver.resolve(style.indicatorColor, opt.manifest) : undefined;
    const resolvedMain = isCustom ? ColorResolver.resolve(style.color, opt.manifest) : undefined;

    return renderKnobHTML({ 
      ...props, 
      size: (props.size as string) || 'A',
      colorId: node.style?.variant || 'cyan',
      value: opt.runtimeValue,
      assetUrl: opt.assetUrl, 
      frames: opt.assetDef?.frames, 
      orientation: opt.assetDef?.orientation,
      // NO FALLBACK to main color here. If resolvedIndicator is transparent, the marker should be transparent.
      explicitMarkerColor: resolvedIndicator, 
      style: { ...style, color: resolvedMain, indicatorColor: resolvedIndicator },
      inheritedFont: isCustom ? (style.font || (opt.inherited.font as string | undefined)) : (opt.inherited.font as string | undefined),
      inheritedColor: opt.inherited.color as string | undefined,
      inheritedSize: opt.inherited.size as number | undefined
    });
  },
  'port': (node, props, opt) => {
    const isCustom = opt.manifest?.ui?.skinMode === 'custom';
    return renderPortHTML({ 
      ...props, 
      size: (props.size as string) || 'A',
      colorId: node.style?.variant || 'cyan',
      value: opt.runtimeValue,
      label: (node.meta?.label as string) || node.id || '', 
      explicitColor: node.style?.variant,
      customSignalColor: isCustom ? ColorResolver.resolve(node.style?.color, opt.manifest) : undefined,
      style: node.style,
      inheritedFont: isCustom ? (node.style?.font || (opt.inherited.font as string | undefined)) : (opt.inherited.font as string | undefined),
      inheritedColor: opt.inherited.color as string | undefined,
      inheritedSize: opt.inherited.size as number | undefined
    });
  },
  'led': (node, props, opt) => {
    const isCustom = opt.manifest?.ui?.skinMode === 'custom';
    return renderLedHTML({ 
      ...props, 
      size: (props.size as string) || 'A',
      colorId: node.style?.variant || 'cyan',
      value: opt.runtimeValue,
      explicitColor: isCustom ? ColorResolver.resolve(node.style?.color, opt.manifest) : undefined
    });
  },
  'display': (node, props, opt) => {
    const variant = node.style?.variant || '';
    const mode = variant.includes('lcd') ? 'lcd' : (variant.includes('led') ? 'led' : 'oled');
    const isCustom = opt.manifest?.ui?.skinMode === 'custom';
    return renderDisplayHTML({ 
      ...props, 
      size: (props.size as string) || 'A',
      colorId: node.style?.variant || 'cyan',
      value: opt.runtimeValue,
      mode, 
      steps: opt.steps,
      explicitTextColor: isCustom ? ColorResolver.resolve(node.style?.color, opt.manifest) : undefined,
      explicitGlassColor: isCustom ? ColorResolver.resolve(node.style?.glassColor, opt.manifest) : undefined,
      inheritedFont: isCustom ? (node.style?.font || (opt.inherited.font as string | undefined)) : (opt.inherited.font as string | undefined),
      inheritedColor: opt.inherited.color as string | undefined,
      inheritedSize: opt.inherited.size as number | undefined
    });
  },
  'slider-v': (node, props, opt) => renderSliderHTML({ 
    ...props, 
    type: 'slider-v', 
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
    assetUrl: opt.assetUrl,
    frames: opt.assetDef?.frames,
    orientation: opt.assetDef?.orientation
  }),
  'slider-h': (node, props, opt) => renderSliderHTML({ 
    ...props, 
    type: 'slider-h', 
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
    assetUrl: opt.assetUrl,
    frames: opt.assetDef?.frames,
    orientation: opt.assetDef?.orientation
  }),
  'switch': (node, props, opt) => renderSwitchHTML({ 
    ...props, 
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
  }),
  'button': (node, props, opt) => renderStepperHTML({ 
    ...props, 
    type: 'button', 
    text: (node.meta?.label as string) || node.id || '', 
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
  }),
  'push': (node, props, opt) => renderStepperHTML({ 
    ...props, 
    type: 'push', 
    text: (node.meta?.label as string) || node.id || '', 
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
  }),
  'stepper': (node, props, opt) => renderStepperHTML({ 
    ...props, 
    type: 'stepper', 
    text: (node.meta?.label as string) || node.id || '', 
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
  }),
  'select': (node, props, opt) => renderSelectHTML({ 
    ...props, 
    options: (node.meta?.options as (string | SelectOption)[]) || (node.style as Record<string, unknown>)?.options as (string | SelectOption)[] || [], 
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
  }),
  'scope': (node, props, opt) => renderScopeHTML({ 
    variant: node.style?.variant || 'default',
    bind: node.bind || '',
    size: (node.style?.width && node.style?.height) ? { width: node.style.width, height: node.style.height } : { width: 100, height: 100 },
    color: node.style?.color as string | undefined,
    font: node.style?.font as string | undefined,
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
  }),
  'terminal': (node, props, opt) => renderTerminalHTML({ 
    variant: node.style?.variant || 'default',
    bind: node.bind || '',
    size: (node.style?.width && node.style?.height) ? { width: node.style.width, height: node.style.height } : { width: 100, height: 100 },
    color: node.style?.color as string | undefined,
    font: node.style?.font as string | undefined,
    inheritedFont: opt.inherited.font as string | undefined,
    inheritedSize: opt.inherited.size as number | undefined,
    inheritedColor: opt.inherited.color as string | undefined,
  }),
  'illustration': (node, props, opt) => renderIllustrationHTML({ 
    assetUrl: opt.assetUrl, 
    size: (node.style?.width && node.style?.height) ? { width: node.style.width, height: node.style.height } : { width: 40, height: 40 }, 
    variant: node.style?.variant || 'contain', 
    id: node.id 
  }),
  'label': (node, props, opt) => AttachmentRenderer.renderAttachmentHTML({
    type: 'label',
    variant: node.style?.variant || 'default',
    text: (node.meta?.label as string) || node.id || '',
    style: props.style as Partial<OmegaStyleNode> | undefined,
    manifest: opt.manifest,
    inherited: opt.inherited
  })
};

export class CellRenderer {
  /**
   * RACK CHASSIS RENDERER (Internal)
   * Handles the main module frame and canonical screw positioning.
   */
  private static renderRackHTML(node: OmegaNode, options: CellOptions): string {
    const { manifest, resolveAsset, activeTab = 'MAIN' } = options;
    const style = node.style || {};
    const variant = style.variant || 'default';
    
    // Resolve the style for this specific tab if mapping exists
    const tabStyleId = manifest?.ui?.layout?.tabStyles?.[activeTab];
    const targetStyleId = tabStyleId || variant;

    const rackStyles = manifest?.ui?.styles?.rack || [];
    const libStyle = rackStyles.find((s: StyleVariant) => s.id === targetStyleId) || { aesthetics: {} as Partial<OmegaStyleNode> };
    const genetics = libStyle.aesthetics || {};
    const aesthetics = style as OmegaStyleNode;

    const bgColor = ColorResolver.resolve(aesthetics.color || genetics.color || 'chassis', manifest);
    
    // Resolve bgAsset with Tab-Awareness
    const faceplateConfig = manifest?.ui?.faceplate;
    let bgAsset = aesthetics.asset || genetics.asset;
    
    if (!bgAsset && faceplateConfig) {
      if (typeof faceplateConfig === 'string') {
        bgAsset = faceplateConfig;
      } else {
        bgAsset = (faceplateConfig as Record<string, string>)[activeTab] || (faceplateConfig as Record<string, string>)['MAIN'];
      }
    }

    const resolveBackgroundCSS = (assetId: string | undefined, fitting: string = 'stretch') => {
      const url = resolveAsset ? resolveAsset(assetId) : undefined;
      if (!url) return '';
      
      let bgSize = '100% 100%';
      let repeat = 'no-repeat';
      const position = 'center';

      switch(fitting) {
        case 'cover':   bgSize = 'cover'; break;
        case 'contain': bgSize = 'contain'; break;
        case 'tile':    bgSize = 'auto'; repeat = 'repeat'; break;
        case 'center':  bgSize = 'auto'; break;
      }
      
      return `background-image: url('${url}') !important; background-size: ${bgSize} !important; background-repeat: ${repeat} !important; background-position: ${position} !important;`;
    };

    const faceplateMode = (manifest?.ui?.faceplate as Record<string, unknown>)?.mode as string || 'stretch';
    const bgStyles = resolveBackgroundCSS(bgAsset, faceplateMode);

    const rounding = aesthetics.rounding ?? genetics.rounding ?? 0;
    const borderWidth = aesthetics.borderWidth ?? genetics.borderWidth ?? 0;

    const attachments = ((style as Record<string, unknown>)?.attachments as Attachment[]) || [];
    const screwFragment = attachments?.find((a: Attachment) => a.type === 'knob' && a.variant === 'rack-screw');
    
    const sAesthetics = (screwFragment?.style || {}) as OmegaStyleNode;
    const rackScrewStyles = manifest?.ui?.styles?.['rack-screw'] || [];
    const sGenetics = rackScrewStyles.find((s) => s.id === (screwFragment?.variant || 'default'))?.aesthetics || {};
    
    const hardware = (manifest?.ui?.hardware || {}) as Record<string, unknown>;
    const screwSpacing = sAesthetics.spacing ?? sGenetics.spacing ?? 8;
    const screwCount = (hardware.screwCount as number) ?? 4;
    const screwMapping = (hardware.screwMapping as string[]) || [];
    const masterScrewOffset = hardware.screwOffset as number | undefined;
    const finalScrewSpacing = masterScrewOffset !== undefined ? masterScrewOffset : screwSpacing;

    // Define standard positions based on count
    const positions: { top: boolean; left: boolean; xPercent?: number; yPercent?: number }[] = [];
    if (screwCount >= 4) {
      positions.push({ top: true, left: true });
      positions.push({ top: true, left: false });
      positions.push({ top: false, left: true });
      positions.push({ top: false, left: false });
    }
    if (screwCount === 6) {
      positions.push({ top: true, left: false, xPercent: 50 }); // Top Mid
      positions.push({ top: false, left: false, xPercent: 50 }); // Bottom Mid
    } else if (screwCount === 8) {
      positions.push({ top: true, left: false, xPercent: 33 }); // Top Mid L
      positions.push({ top: true, left: false, xPercent: 66 }); // Top Mid R
      positions.push({ top: false, left: false, xPercent: 33 }); // Bottom Mid L
      positions.push({ top: false, left: false, xPercent: 66 }); // Bottom Mid R
    }

    const renderScrew = (pos: typeof positions[0], idx: number) => {
      // Resolve style for this specific position
      const posStyleId = screwMapping[idx];
      const posLibStyle = manifest?.ui?.styles?.['mounting-screw']?.find((s: StyleVariant) => s.id === posStyleId);
      const posAesthetics = posLibStyle?.aesthetics || {};
      
      const sColor = ColorResolver.resolve(posAesthetics.color || sAesthetics.color || sGenetics.color || 'hardware', manifest);
      const sAssetId = posAesthetics.asset || sAesthetics.asset || sGenetics.asset;
      const sFitting = posAesthetics.fitting || sAesthetics.fitting || sGenetics.fitting || 'cover';
      const sAssetCSS = resolveBackgroundCSS(sAssetId, sFitting);

      const stylePos = `
        position: absolute;
        ${pos.top ? 'top' : 'bottom'}: ${finalScrewSpacing}px;
        ${pos.xPercent ? `left: ${pos.xPercent}%; transform: translateX(-50%);` : (pos.left ? 'left' : 'right') + `: ${finalScrewSpacing}px;`}
      `;

      return `
        <div style="
          ${stylePos}
          width: 14px;
          height: 14px;
          background-color: ${sAssetCSS ? 'transparent' : sColor};
          ${sAssetCSS || `
            background-image: 
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 40%),
              radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 20%, transparent 60%),
              linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.2) 100%) !important;
            background-size: cover !important;
          `}
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${sAssetCSS ? '' : `
            <div style="
              width: 8px;
              height: 2px;
              background-color: rgba(0,0,0,0.4);
              transform: rotate(45deg);
              border-radius: 1px;
            "></div>
          `}
        </div>
      `;
    };

    return `
      <div class="industrial-rack-chassis"
        style="position: absolute; inset: 0; background-color: ${bgColor}; ${bgStyles} border-radius: ${rounding}px; border: ${borderWidth}px solid rgba(255,255,255,0.05); overflow: hidden;">
        ${screwFragment ? positions.map((p, i) => renderScrew(p, i)).join('') : ''}
      </div>
    `.trim();
  }

  /**
   * ARCHITECTURAL RENDERER (Internal)
   * Handles Containers, Groups and Plates.
   */
  private static renderContainerHTML(node: OmegaNode, options: CellOptions): string {
    const { manifest, resolveAsset, isSelected, isError } = options;
    const style = node.style || {};
    const aesthetics = style as OmegaStyleNode;
    const variant = aesthetics.variant || 'default';
    
    const libStyles = manifest?.ui?.styles?.container || [];
    const libStyle = libStyles.find((s) => s.id === variant) || { aesthetics: {} as Partial<OmegaStyleNode> };
    const genetics = libStyle.aesthetics || {};

    const label = (node.meta?.label as string) || node.id || 'LABEL';

    // Resolved Chromatics
    const bgColor = ColorResolver.resolve(aesthetics.color || genetics.color, manifest);
    const borderColor = ColorResolver.resolve(aesthetics.indicatorColor || genetics.indicatorColor, manifest);
    const labelBg = ColorResolver.resolve(aesthetics.labelBg || genetics.labelBg, manifest);
    const fontColor = ColorResolver.resolve(aesthetics.fontColor || genetics.fontColor || '#ffffff', manifest);

    // Mechanical Properties
    const bgAsset = aesthetics.asset || genetics.asset;
    const bgUrl = resolveAsset ? resolveAsset(bgAsset) : undefined;
    const rounding = aesthetics.rounding ?? genetics.rounding ?? 0;
    const borderWidth = aesthetics.borderWidth ?? genetics.borderWidth ?? 0;
    const opacity = aesthetics.opacity ?? genetics.opacity ?? 1.0;

    // Spatial & Typographic Fragments
    const labelX = aesthetics.labelX ?? genetics.labelX ?? 0;
    const labelY = aesthetics.labelY ?? genetics.labelY ?? 0;
    const labelW = aesthetics.labelW ?? genetics.labelW ?? 0;
    const labelH = aesthetics.labelH ?? genetics.labelH ?? 0;
    const labelRounding = aesthetics.labelRounding ?? genetics.labelRounding ?? 0;
    const labelPadding = aesthetics.labelPadding ?? genetics.labelPadding ?? 4;
    const font = aesthetics.font || genetics.font || 'Inter';
    const fontSize = aesthetics.fontSize || genetics.fontSize || 10;
    const alignment = aesthetics.alignment || genetics.alignment || 'left';
    const flexAlign = alignment === 'left' ? 'flex-start' : (alignment === 'right' ? 'flex-end' : 'center');
    const spacing = aesthetics.spacing || genetics.spacing || 0;

    return `
      <div class="industrial-container-surface ${isSelected ? 'selected' : ''} ${isError ? 'error' : ''}"
        style="position: absolute; inset: 0; background-color: ${bgColor}; background-image: ${bgUrl ? `url(${bgUrl})` : 'none'}; background-size: cover; background-position: center; border: ${borderWidth}px solid ${borderColor}; border-radius: ${rounding}px; opacity: ${opacity}; overflow: hidden;">
        <div class="container-label-fragment"
          style="position: absolute; left: ${labelX}px; top: ${labelY}px; width: ${labelW ? `${labelW}px` : 'auto'}; height: ${labelH ? `${labelH}px` : 'auto'}; background-color: ${labelBg}; border-radius: ${labelRounding}px; display: flex; align-items: center; justify-content: ${flexAlign}; padding: ${labelPadding}px; white-space: nowrap; z-index: 10;">
          <span style="font-family: ${font}; font-size: ${fontSize}px; color: ${fontColor}; text-align: ${alignment}; letter-spacing: ${spacing}px; width: 100%;">
            ${isError ? '⚠️ INTEGRITY_LEAK' : label}
          </span>
        </div>
      </div>
    `.trim();
  }

  /**
   * MASTER DISPATCHER
   */
  static renderCellHTML(node: OmegaNode, options: CellOptions): string {
    const { runtimeValue, steps, isSelected, resolveAsset, manifest } = options;
    const compType = node.cellRef || node.kind || 'knob';
    
    // 1. RACK BRANCH
    if (compType === 'rack') {
      return this.renderRackHTML(node, options);
    }

    // 2. ARCHITECTURAL BRANCH
    const isArchitectural = compType === 'container' || compType === 'group' || compType === 'face';
    if (isArchitectural) {
      return `
        <div class="architectural-cell" style="width: 100%; height: 100%; position: relative;">
          ${this.renderContainerHTML(node, options)}
        </div>
      `.trim();
    }

    // 2. PRIMITIVE BRANCH
    const variant = node.style?.variant || 'B_cyan';
    const parsed = parseVariant(variant);
    const size = (node.style?.scale as string) || parsed.size;
    const colorId = parsed.colorId;
    const compRadius = getComponentRadius(node);
    
    // ERA 7.2.3 - AESTHETIC RESOLUTION
    const rawStyle = node.style || {};
    const resolvedStyle = ColorResolver.resolveStyle(rawStyle, manifest);
    
    const assetId = resolvedStyle.asset || node.style?.asset;
    const assetDef = manifest?.resources?.assets?.find((a) => a.id === assetId);
    const assetUrl = resolveAsset ? resolveAsset(assetId) : assetId;
    
    const inherited = getInheritedTypography(node.kind as string, manifest);
    
    const commonProps = { 
      size, colorId, value: runtimeValue, id: node.id,
      isSelected: !!isSelected, isMain: true, style: resolvedStyle
    };

    const renderer = COMP_RENDERER_MAP[compType];
    let mainHTML = '';
    try {
      mainHTML = renderer 
        ? renderer(node, commonProps as MasterRendererProps, { 
            assetUrl: assetUrl as string, 
            assetDef, 
            steps, 
            runtimeValue, 
            inherited: inherited as Record<string, unknown>, 
            manifest,
            forceFrame: options.forceFrame
          })
        : `<div class="unsupported-renderer">NO RENDERER: ${compType}</div>`;
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[CELL RENDERER] Fatal error in primitive ${compType}:`, error);
      mainHTML = `
        <div class="renderer-error" style="color: #ff3300; font-family: monospace; font-size: 8px; border: 1px solid #ff3300; padding: 4px; background: rgba(255,51,0,0.1);">
          ERROR: ${error.message}
        </div>
      `;
    }

    const attachments = ((node.style as Record<string, unknown>)?.attachments as Attachment[]) || [];
    const stackOptions = { runtimeValue, steps, inherited, manifest, resolveAsset };

    const cellOffsetX = ((node.style as Record<string, unknown>)?.offsetX as number || 0) * 1.5;
    const cellOffsetY = ((node.style as Record<string, unknown>)?.offsetY as number || 0) * 1.5;

    const containerWidth = resolvedStyle.width !== undefined ? resolvedStyle.width : (compRadius * 2 * 1.5);
    const containerHeight = resolvedStyle.height !== undefined ? resolvedStyle.height : (compRadius * 2 * 1.5);

    return `
      <div class="control-cell variant-${variant}" style="--comp-radius: ${compRadius}px;">
        ${renderAttachmentStackHTML('top', attachments, stackOptions)}
        ${renderAttachmentStackHTML('bottom', attachments, stackOptions)}
        ${renderAttachmentStackHTML('left', attachments, stackOptions)}
        ${renderAttachmentStackHTML('right', attachments, stackOptions)}
        ${renderAttachmentStackHTML('center', attachments, stackOptions)}
        <div class="cell-main" style="width: ${containerWidth}px; height: ${containerHeight}px; transform: translate(calc(-50% + ${cellOffsetX}px), calc(-50% + ${cellOffsetY}px))">
          ${mainHTML}
        </div>
      </div>
    `.trim();
  }
}
