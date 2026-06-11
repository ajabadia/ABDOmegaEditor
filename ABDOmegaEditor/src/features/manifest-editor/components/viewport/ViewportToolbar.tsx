'use client';
import React, { useState, useCallback } from 'react';
import {
  Grid3X3, Layout, ChevronDown,
} from 'lucide-react';
import type { OMEGA_Manifest, OmegaNode, GridConfig } from '@/omega-ui-core/types/manifest';
import { buildGridManifestUpdate } from '../../utils/gridHelpers';
import { manifestToTree, treeToManifest } from '@/omega-ui-core/utils/ucaBridge';
import { findNodeInTree } from '@/omega-ui-core/utils/treeUtils';
import {
  AlignLeftIcon,
  AlignCenterHIcon,
  AlignRightIcon,
  DistributeVIcon,
  AlignTopIcon,
  AlignCenterVIcon,
  AlignBottomIcon,
  DistributeHIcon,
} from './AlignIcons';

/**
 * Function form that accepts either a partial manifest patch or a function
 * that receives the latest manifest and returns a patch. Matches the
 * signature used by `history.updateManifestWithHistory` in
 * useHistoryActions.ts (which is what WorkbenchContainer wires in).
 */
export type UpdateManifestFn = (
  updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>),
  label?: string,
) => void;

interface ViewportToolbarProps {
  manifest: OMEGA_Manifest;
  selectedIds: string[];
  onUpdateItem: (id: string, updates: Partial<OmegaNode>) => void;
  onUpdateManifest?: UpdateManifestFn | undefined;
}

type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
type DistType = 'dist-h' | 'dist-v';
type AlignTarget = 'selection' | 'canvas';

const TOOLBAR_H = 28;
const CORNER_W = 22;

/**
 * Debug gate for the alignment pipeline. Enable in the browser console:
 *   window.__OMEGA_ALIGN_DEBUG__ = true
 * Then click an align button. gatherPositions will log every selected id,
 * whether it was skipped and why (rack root, not found, NaN/undefined pos),
 * and the final items array that feeds applyAlignment/applyDistribution.
 */
function isAlignDebug(): boolean {
  return typeof window !== 'undefined'
    && (window as unknown as { __OMEGA_ALIGN_DEBUG__?: boolean }).__OMEGA_ALIGN_DEBUG__ === true;
}

/**
 * ID conventions for the UCA tree root, used to identify the rack root
 * that must NOT participate as an alignment target (it's the world origin).
 * Production uses `RACK_MASTER` (see VirtualRack.tsx), tests and synthetic
 * fixtures often use `root` or `MAIN_RACK`. We accept all three to stay
 * forward-compatible with backups/imports.
 */
const RACK_ROOT_IDS = new Set(['RACK_MASTER', 'root', 'MAIN_RACK', 'MAIN_RACK_ROOT']);

function isRackRootNode(node: OmegaNode | undefined): boolean {
  if (!node) return false;
  if (node.kind !== 'rack') return false;
  return RACK_ROOT_IDS.has(node.id);
}

/**
 * Eurorack standard dimensions:
 * 1 HP = 5.08mm  |  3U height = 128.5mm
 * At scale factor → 1 HP ≈ spacingX px per HP
 * Base scale: 15 px/mm → 1HP = 76px, 4HP = 304px
 * But for practical grid: common module widths are 4HP, 8HP, 12HP, 16HP
 * We use a configurable scale factor (px per HP).
 */
const EURORACK_MM_PER_HP = 5.08;
const EURORACK_3U_MM = 128.5;
const DEFAULT_PX_PER_HP = 24; // 1HP = 24px → 4HP = 96px, 12HP = 288px

interface EurorackPreset {
  label: string;
  hp: number;
}

const EURORACK_PRESETS: EurorackPreset[] = [
  { label: '1HP', hp: 1 },
  { label: '2HP', hp: 2 },
  { label: '4HP', hp: 4 },
  { label: '8HP', hp: 8 },
  { label: '12HP', hp: 12 },
  { label: '16HP', hp: 16 },
  { label: '20HP', hp: 20 },
  { label: '42HP', hp: 42 },
];

type GatherSkipReason = 'rack-root-id' | 'rack-root-node' | 'not-found' | 'invalid-pos';

interface GatherTrace {
  selectedIds: string[];
  accepted: { id: string; x: number; y: number; w: number; h: number; kind?: string }[];
  skipped: { id: string; reason: GatherSkipReason; detail?: string }[];
}

function gatherPositions(
  root: OmegaNode | null,
  ids: string[],
): { id: string; x: number; y: number; w: number; h: number }[] {
  const trace: GatherTrace = { selectedIds: [...ids], accepted: [], skipped: [] };
  if (!root) {
    if (isAlignDebug()) {
      // eslint-disable-next-line no-console
      console.log('[ViewportToolbar] gatherPositions: no root tree', { selectedIds: ids });
    }
    return [];
  }
  const result: { id: string; x: number; y: number; w: number; h: number }[] = [];
  // Phase 39 fix: skip the rack root. It's the world origin — aligning to it
  // would shove all selected items to (0,0). Detected dynamically (not by id
  // alone) so a fixture using a different rack id is still safe.
  const rootIsRack = isRackRootNode(root);
  for (const id of ids) {
    if (rootIsRack && id === root.id) {
      trace.skipped.push({ id, reason: 'rack-root-id' });
      continue;
    }
    const node = findNodeInTree(root, id);
    if (!node) {
      trace.skipped.push({ id, reason: 'not-found' });
      continue;
    }
    if (isRackRootNode(node)) {
      trace.skipped.push({ id, reason: 'rack-root-node' });
      continue;
    }
    const pos = node.layout?.pos;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number' || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      trace.skipped.push({
        id,
        reason: 'invalid-pos',
        detail: `pos=${JSON.stringify(pos)} (x=${typeof pos?.x === 'number' ? pos.x : 'N/A'}, y=${typeof pos?.y === 'number' ? pos.y : 'N/A'})`,
      });
      continue;
    }
    // Use store-based size exclusively (rack-coords, fixed).
    // This avoids the "inertia" caused by mixing screen-coords (DOM rect,
    // affected by zoom/pan CSS transform) with rack-coords (store pos).
    // Each element is treated as a fixed rectangle: top-left = pos,
    // bottom-right = pos + size. Coordinates are absolute, not relative.
    const accepted = {
      id,
      x: pos.x,
      y: pos.y,
      w: node.layout?.size?.width ?? 48,
      h: node.layout?.size?.height ?? 48,
      kind: node.kind,
    };
    result.push(accepted);
    trace.accepted.push(accepted);
  }
  if (isAlignDebug()) {
    // eslint-disable-next-line no-console
    console.log('[ViewportToolbar] gatherPositions trace', trace);
  }
  return result;
}

/**
 * Compute the new (x,y) for every item according to the alignment type.
 * Pure function — no side effects, no React state.
 */
function computeAlignedPositions(
  items: { id: string; x: number; y: number; w: number; h: number }[],
  type: AlignType,
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  if (items.length === 0) return out;
  let targetX = 0;
  let targetY = 0;
  switch (type) {
    case 'left':
      targetX = Math.min(...items.map(i => i.x));
      for (const i of items) out.set(i.id, { x: targetX, y: i.y });
      break;
    case 'center-h':
      targetX = Math.round(
        (Math.min(...items.map(i => i.x)) + Math.max(...items.map(i => i.x + i.w))) / 2,
      );
      for (const i of items) out.set(i.id, { x: targetX - Math.round(i.w / 2), y: i.y });
      break;
    case 'right':
      targetX = Math.max(...items.map(i => i.x + i.w));
      for (const i of items) out.set(i.id, { x: targetX - i.w, y: i.y });
      break;
    case 'top':
      targetY = Math.min(...items.map(i => i.y));
      for (const i of items) out.set(i.id, { x: i.x, y: targetY });
      break;
    case 'center-v':
      targetY = Math.round(
        (Math.min(...items.map(i => i.y)) + Math.max(...items.map(i => i.y + i.h))) / 2,
      );
      for (const i of items) out.set(i.id, { x: i.x, y: targetY - Math.round(i.h / 2) });
      break;
    case 'bottom':
      targetY = Math.max(...items.map(i => i.y + i.h));
      for (const i of items) out.set(i.id, { x: i.x, y: targetY - i.h });
      break;
  }
  return out;
}

function computeDistributedPositions(
  items: { id: string; x: number; y: number; w: number; h: number }[],
  type: DistType,
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  if (items.length < 3) return out;
  if (type === 'dist-h') {
    const sorted = [...items].sort((a, b) => a.x - b.x);
    const first = sorted[0].x;
    const last = sorted[sorted.length - 1].x;
    const step = (last - first) / (sorted.length - 1);
    for (let i = 0; i < sorted.length; i++) {
      out.set(sorted[i].id, { x: Math.round(first + step * i), y: sorted[i].y });
    }
  } else {
    const sorted = [...items].sort((a, b) => a.y - b.y);
    const first = sorted[0].y;
    const last = sorted[sorted.length - 1].y;
    const step = (last - first) / (sorted.length - 1);
    for (let i = 0; i < sorted.length; i++) {
      out.set(sorted[i].id, { x: sorted[i].x, y: Math.round(first + step * i) });
    }
  }
  return out;
}

/**
 * Atomic batch update: applies all position changes in a single manifest
 * update so React/Redux sees one coherent state. The previous approach
 * called `onUpdateItem` once per item — each call dispatched a manifest
 * update that re-walked the tree, computed a fresh `treeToManifest`
 * projection, and replaced `manifest.ui.controls/jacks`. When the loop
 * was fast enough that React batched the dispatches, the projection
 * computed by the LAST dispatch only saw the last item's update (the
 * others were never materialised into the controls/jacks arrays). The
 * symptom was: only one item visibly moved, the rest kept their old pos.
 *
 * This atomic version walks the tree once, applies every position change,
 * then re-projects once at the end.
 */
function applyPositionBatch(
  newPositions: Map<string, { x: number; y: number }>,
  onUpdateManifest: UpdateManifestFn,
  label: string,
) {
  if (newPositions.size === 0) return;
  onUpdateManifest((prev: OMEGA_Manifest) => {
    const tree = prev.ui?.tree;
    if (!tree) {
      // Legacy / no-tree manifest: fall back to per-item onUpdateItem pattern
      // (we can't do an atomic tree rewrite without the tree).
      // We can't call onUpdateItem from here (it's in scope outside), so
      // just no-op and rely on the caller to handle this case.
      return {};
    }
    const nextTree = applyBatchPositionsToTree(tree, newPositions);
    const legacyProjections = treeToManifest(nextTree);
    return {
      nodes: [nextTree],
      ui: {
        ...prev.ui,
        tree: nextTree,
        controls: legacyProjections.ui?.controls ?? legacyProjections.controls ?? prev.ui?.controls ?? [],
        jacks: legacyProjections.ui?.jacks ?? legacyProjections.jacks ?? prev.ui?.jacks ?? [],
        layout: {
          ...(prev.ui?.layout as Record<string, unknown>),
          width: prev.ui?.layout?.width || 800,
          height: prev.ui?.layout?.height || 600,
          containers:
            legacyProjections.ui?.layout?.containers
            ?? legacyProjections.layout?.containers
            ?? prev.ui?.layout?.containers
            ?? [],
        },
      },
    };
  }, label);
}

/**
 * Pure tree walk: clones the tree, applying the new pos for every id in the map.
 * Mirrors updateNodeInTree but accepts a Map<id, {x,y}> and only touches pos.
 */
function applyBatchPositionsToTree(
  root: OmegaNode,
  positions: Map<string, { x: number; y: number }>,
): OmegaNode {
  if (positions.size === 0) return root;
  const walk = (node: OmegaNode): OmegaNode => {
    const pos = positions.get(node.id);
    const updated: OmegaNode = pos
      ? {
          ...node,
          layout: {
            ...node.layout,
            pos: { x: pos.x, y: pos.y },
            // Preserve existing size; only override if defined to avoid clobbering
            size: node.layout?.size,
          },
        }
      : node;
    if (updated.children?.length) {
      let changed = false;
      const nextChildren = updated.children.map((c) => {
        const w = walk(c);
        if (w !== c) changed = true;
        return w;
      });
      if (changed) return { ...updated, children: nextChildren };
    }
    return updated;
  };
  return walk(root);
}

function snapToGridValue(x: number, spacing: number): number {
  return Math.round(x / spacing) * spacing;
}

export default function ViewportToolbar({
  manifest,
  selectedIds,
  onUpdateItem,
  onUpdateManifest,
}: ViewportToolbarProps) {
  const [alignTarget, setAlignTarget] = useState<AlignTarget>('selection');
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [pxPerHP, setPxPerHP] = useState(DEFAULT_PX_PER_HP);

  const grid = manifest.ui?.layout?.grid;
  const gridVisible = grid?.visible ?? false;
  const gridEnabled = grid?.enabled ?? false;
  const spacingX = grid?.spacingX ?? 24;
  const spacingY = grid?.spacingY ?? 24;

  const updateGrid = useCallback((patch: Partial<GridConfig>) => {
    onUpdateManifest?.(buildGridManifestUpdate(manifest, patch));
  }, [manifest, onUpdateManifest]);

  const handleAlign = useCallback((type: AlignType) => {
    if (selectedIds.length < 2) return;
    if (!onUpdateManifest) return;
    const rootTree = manifest.ui?.tree || manifestToTree(manifest);
    const items = gatherPositions(rootTree, selectedIds);
    const newPositions = computeAlignedPositions(items, type);
    if (isAlignDebug()) {
      // eslint-disable-next-line no-console
      console.log('[ViewportToolbar] align', type, 'items=', items, 'newPositions=', Array.from(newPositions.entries()));
    }
    applyPositionBatch(newPositions, onUpdateManifest, `Align ${type}`);
  }, [manifest, selectedIds, onUpdateManifest]);

  const handleDistribute = useCallback((type: DistType) => {
    if (selectedIds.length < 2) return;
    if (!onUpdateManifest) return;
    const rootTree = manifest.ui?.tree || manifestToTree(manifest);
    const items = gatherPositions(rootTree, selectedIds);
    const newPositions = computeDistributedPositions(items, type);
    if (isAlignDebug()) {
      // eslint-disable-next-line no-console
      console.log('[ViewportToolbar] distribute', type, 'items=', items, 'newPositions=', Array.from(newPositions.entries()));
    }
    applyPositionBatch(newPositions, onUpdateManifest, `Distribute ${type}`);
  }, [manifest, selectedIds, onUpdateManifest]);

  const handleSnapAllToGrid = useCallback(() => {
    if (selectedIds.length === 0) return;
    const rootTree = manifest.ui?.tree || manifestToTree(manifest);
    const items = gatherPositions(rootTree, selectedIds);
    items.forEach(i => {
      onUpdateItem(i.id, {
        layout: {
          pos: {
            x: snapToGridValue(i.x, spacingX),
            y: snapToGridValue(i.y, spacingY),
          },
        },
      });
    });
  }, [manifest, selectedIds, spacingX, spacingY, onUpdateItem]);

  const applyPreset = useCallback((hp: number) => {
    const sx = Math.round(hp * pxPerHP);
    const sy = Math.round((EURORACK_3U_MM / EURORACK_MM_PER_HP) * pxPerHP / 3); // 1/3 of 3U ≈ 1U row
    updateGrid({ spacingX: sx, spacingY: sy, enabled: true, visible: true });
  }, [pxPerHP, updateGrid]);

  const mmFromHP = (hp: number) => (hp * EURORACK_MM_PER_HP).toFixed(1);
  const currentHP = (spacingX / pxPerHP).toFixed(1);
  const currentRowHP = (spacingY / pxPerHP / (EURORACK_3U_MM / EURORACK_MM_PER_HP)).toFixed(1);

  const canAlign = selectedIds.length >= 2;
  const canDistribute = selectedIds.length >= 2;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[61] flex items-center bg-[#111] border-b border-white/8"
      style={{ height: TOOLBAR_H, paddingLeft: CORNER_W }}
    >
      {/* ALIGNMENT — order matches the user-supplied icon set */}
      <div className="flex items-center gap-px px-1" data-align-toolbar="true">
        <AlignBtn icon={<AlignLeftIcon size={14} />} title="Align left edges" disabled={!canAlign} onClick={() => handleAlign('left')} />
        <AlignBtn icon={<AlignCenterHIcon size={14} />} title="Center horizontally" disabled={!canAlign} onClick={() => handleAlign('center-h')} />
        <AlignBtn icon={<AlignRightIcon size={14} />} title="Align right edges" disabled={!canAlign} onClick={() => handleAlign('right')} />
        <AlignBtn icon={<DistributeVIcon size={14} />} title="Distribute vertically (equal spacing)" disabled={!canDistribute} onClick={() => handleDistribute('dist-v')} />
        <AlignBtn icon={<AlignTopIcon size={14} />} title="Align top edges" disabled={!canAlign} onClick={() => handleAlign('top')} />
        <AlignBtn icon={<AlignCenterVIcon size={14} />} title="Center vertically" disabled={!canAlign} onClick={() => handleAlign('center-v')} />
        <AlignBtn icon={<AlignBottomIcon size={14} />} title="Align bottom edges" disabled={!canAlign} onClick={() => handleAlign('bottom')} />
        <AlignBtn icon={<DistributeHIcon size={14} />} title="Distribute horizontally (equal spacing)" disabled={!canDistribute} onClick={() => handleDistribute('dist-h')} />
      </div>
      <div
        className="flex items-center px-1 gap-0.5 text-[7px] font-bold uppercase tracking-wider"
        title={
          selectedIds.length === 0
            ? 'No selection. Click a node, then Ctrl+click (or Shift+click) others to multi-select.'
            : selectedIds.length === 1
              ? '1 selected. Add more with Ctrl+click or Shift+click.'
              : `${selectedIds.length} selected. Click any align button.`
        }
      >
        <span className="text-[#555]">Sel:</span>
        <span className={selectedIds.length >= 2 ? 'text-primary' : 'text-[#888]'}>
          {selectedIds.length}
        </span>
      </div>
      <ToolbarDivider />
      {/* ALIGN TARGET */}
      <div className="flex items-center px-1 gap-0.5">
        <button
          onClick={() => setAlignTarget(alignTarget === 'selection' ? 'canvas' : 'selection')}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-[#999] hover:text-white hover:bg-white/5 transition-colors"
          title={`Align relative to: ${alignTarget}`}
        >
          <span className="text-[7px] text-[#666]">Align to:</span>
          <span className="text-primary">{alignTarget === 'selection' ? 'Selection' : 'Canvas'}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>
      </div>
      <ToolbarDivider />
      {/* SNAP TO GRID — Magnet icon toggle */}
      <div className="flex items-center gap-px px-1 relative">
        <button
          onClick={() => updateGrid({ enabled: !gridEnabled })}
          className={`flex items-center justify-center w-6 h-5 rounded transition-colors ${
            gridEnabled
              ? 'text-emerald-400 hover:bg-emerald-500/20'
              : 'text-[#666] hover:text-[#999] hover:bg-white/5'
          }`}
          title={`Snap to grid: ${gridEnabled ? 'ON' : 'OFF'}`}
        >
          <Layout className="w-3 h-3" />
        </button>
        <button
          onClick={() => setShowGridSettings(!showGridSettings)}
          className={`flex items-center justify-center w-6 h-5 rounded transition-colors ${
            showGridSettings
              ? 'text-primary bg-white/10'
              : 'text-[#999] hover:text-white hover:bg-white/8'
          }`}
          title="Grid settings (Eurorack)"
        >
          <Grid3X3 className="w-3 h-3" />
        </button>

        {/* GRID SETTINGS DROPDOWN — Eurorack-proportional */}
        {showGridSettings && (
          <div
            className="absolute top-full left-0 mt-1 bg-[#0a0a0b] border border-white/10 rounded p-3 shadow-2xl z-[9999]"
            style={{ width: 260 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[7px] text-primary font-black uppercase tracking-widest mb-2">Grid — Eurorack</div>

            {/* Grid visibility toggle */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#999] uppercase">Show grid</span>
              <button
                onClick={() => updateGrid({ visible: !gridVisible })}
                className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-colors ${
                  gridVisible
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-white/5 text-[#666] hover:text-[#999] border border-transparent'
                }`}
              >
                {gridVisible ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Snap action button */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#999] uppercase">Snap selection</span>
              <button
                onClick={handleSnapAllToGrid}
                disabled={!gridEnabled || selectedIds.length === 0}
                className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-white/5 text-[#999] hover:bg-white/10 hover:text-white border border-transparent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Snap
              </button>
            </div>

            <div className="border-t border-white/5 my-2" />

            {/* Scale factor */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#999] uppercase">Scale (px / HP)</span>
              <input
                type="number"
                value={pxPerHP}
                min={4}
                max={80}
                onChange={e => setPxPerHP(Math.max(4, parseInt(e.target.value) || DEFAULT_PX_PER_HP))}
                className="w-14 bg-[#111] border border-white/10 rounded px-2 py-0.5 text-[9px] text-white text-right font-mono"
              />
            </div>

            {/* Spacing X (horizontal) */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-[#999] uppercase">Spacing X</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={spacingX}
                  min={1}
                  onChange={e => updateGrid({ spacingX: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-14 bg-[#111] border border-white/10 rounded px-2 py-0.5 text-[9px] text-white text-right font-mono"
                />
                <span className="text-[7px] text-[#666] w-10 text-right">{currentHP} HP</span>
              </div>
            </div>
            <div className="text-[6px] text-[#555] mb-2 ml-auto text-right">≈ {mmFromHP(spacingX / pxPerHP)} mm</div>

            {/* Spacing Y (vertical) */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-[#999] uppercase">Spacing Y</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={spacingY}
                  min={1}
                  onChange={e => updateGrid({ spacingY: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-14 bg-[#111] border border-white/10 rounded px-2 py-0.5 text-[9px] text-white text-right font-mono"
                />
                <span className="text-[7px] text-[#666] w-10 text-right">{currentRowHP} U</span>
              </div>
            </div>
            <div className="text-[6px] text-[#555] mb-2 ml-auto text-right">≈ {mmFromHP(spacingY / pxPerHP)} mm</div>

            {/* Eurorack HP presets */}
            <div className="border-t border-white/5 pt-2 mt-1">
              <div className="text-[6px] text-[#666] uppercase tracking-wider mb-1.5 font-bold">Eurorack presets</div>
              <div className="flex flex-wrap gap-1">
                {EURORACK_PRESETS.map(p => (
                  <button
                    key={p.hp}
                    onClick={() => applyPreset(p.hp)}
                    className={`px-1.5 py-0.5 rounded text-[7px] font-mono font-bold transition-colors ${
                      Math.abs(spacingX - Math.round(p.hp * pxPerHP)) < 2
                        ? 'bg-primary/20 text-primary border border-primary/50'
                        : 'bg-white/5 text-[#999] hover:bg-white/10 hover:text-white border border-transparent'
                    }`}
                    title={`${p.label} = ${Math.round(p.hp * pxPerHP)}px = ${mmFromHP(p.hp)}mm`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div className="text-[5px] text-[#444] mt-2 leading-relaxed">
              1 HP = {EURORACK_MM_PER_HP}mm = {pxPerHP}px &nbsp;|&nbsp; 3U = {EURORACK_3U_MM}mm
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlignBtn({ icon, title, disabled, onClick }: {
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center w-6 h-5 rounded text-[#999] hover:text-white hover:bg-white/8 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
      title={title}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-white/8 mx-1" />;
}
