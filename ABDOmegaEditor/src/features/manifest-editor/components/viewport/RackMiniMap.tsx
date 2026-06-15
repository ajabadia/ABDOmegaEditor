'use client';

/**
 * @purpose Renderiza un mapa mini del bastidor con capacidades de zoom y navegación, mostrando visualizaciones de nodos simplificadas y un indicador de viewport arrastrable.
 * @fingerprint exports:1,imports:4,sig:1coxolb
 * @lastUpdated 2026-06-14T23:34:46.305Z
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Maximize, Eye, EyeOff, Target, Filter, RotateCcw } from 'lucide-react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { useViewportRect } from '@/features/manifest-editor/hooks/useViewportRect';

// ── Constants ─────────────────────────────────────────────────────────

const MINI_MAP_MAX_W = 180;
const MINI_MAP_MAX_H = 120;
const LS_KEY_HIDDEN_KINDS = 'omega-mini-map-hidden-kinds';
const LS_KEY_PANEL_OFFSET = 'omega-mini-map-panel-offset';
const URL_PARAM_HIDE = 'hide';
const SNAP_THRESHOLD = 8;

// ── Helpers ───────────────────────────────────────────────────────────

interface FlattenedNode {
  id: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Color map for node kinds */
const NODE_KIND_COLORS: Record<string, { bg: string; border: string }> = {
  cell:      { bg: 'rgba(0, 242, 255, 0.30)', border: 'rgba(0, 242, 255, 0.18)' },
  group:     { bg: 'rgba(74, 222, 128, 0.30)', border: 'rgba(74, 222, 128, 0.18)' },
  container: { bg: 'rgba(251, 191, 36, 0.30)', border: 'rgba(251, 191, 36, 0.18)' },
  port:      { bg: 'rgba(192, 132, 252, 0.30)', border: 'rgba(192, 132, 252, 0.18)' },
  rack:      { bg: 'rgba(255, 255, 255, 0.08)', border: 'rgba(255, 255, 255, 0.04)' },
  face:      { bg: 'rgba(248, 113, 113, 0.25)', border: 'rgba(248, 113, 113, 0.15)' },
  layer:     { bg: 'rgba(251, 146, 60, 0.25)', border: 'rgba(251, 146, 60, 0.15)' },
  'asset-layer': { bg: 'rgba(251, 146, 60, 0.20)', border: 'rgba(251, 146, 60, 0.12)' },
  patch:     { bg: 'rgba(167, 243, 208, 0.25)', border: 'rgba(167, 243, 208, 0.15)' },
  root:      { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.03)' },
};

function getNodeColor(kind: string) {
  return NODE_KIND_COLORS[kind] || { bg: 'rgba(156, 163, 175, 0.25)', border: 'rgba(156, 163, 175, 0.15)' };
}

/** Highlight color for selected node */
const SELECTED_COLOR = 'rgba(0, 242, 255, 0.55)';
const SELECTED_BORDER = 'rgba(0, 242, 255, 0.80)';

function flattenTree(tree: OmegaNode | undefined | null): FlattenedNode[] {
  if (!tree) return [];
  const result: FlattenedNode[] = [];
  const walk = (node: OmegaNode) => {
    if (node.layout?.pos && node.layout?.size) {
      result.push({
        id: node.id,
        kind: node.kind,
        label: (node.meta?.label as string) || node.id,
        x: node.layout.pos.x,
        y: node.layout.pos.y,
        w: node.layout.size.width,
        h: node.layout.size.height,
      });
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  };
  walk(tree);
  return result;
}

// ── Props ─────────────────────────────────────────────────────────────

interface RackMiniMapProps {
  manifest: OMEGA_Manifest;
  zoom: number;
  pan: { x: number; y: number };
  onPan: (dx: number, dy: number) => void;
  onResetViewport?: () => void;
  onFitViewport: () => void;
  rackWidth: number;
  rackHeight: number;
  containerWidth: number;
  containerHeight: number;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  lockedNodeIds?: string[];
}

// ── Component ─────────────────────────────────────────────────────────

export default function RackMiniMap({
  manifest,
  zoom,
  pan,
  onPan,
  onResetViewport,
  onFitViewport,
  rackWidth,
  rackHeight,
  containerWidth,
  containerHeight,
  selectedItemId,
  onSelectItem,
  lockedNodeIds = [],
}: RackMiniMapProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showKindFilter, setShowKindFilter] = useState(false);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });

  // Read panel offset from localStorage on client-side mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_PANEL_OFFSET);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPanelOffset(parsed);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);
  const [isDraggingVisual, setIsDraggingVisual] = useState(false);
  const [isSnapped, setIsSnapped] = useState(false);
  const isDraggingPanel = useRef(false);
  const panelDragStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0, pw: 0, ph: 0, panelW: 0, panelH: 0 });
  const [hiddenKinds, setHiddenKinds] = useState<Set<string>>(new Set());

  // Clamp persisted offset on mount to prevent unreachable positions after refresh
  useEffect(() => {
    if (containerWidth > 0) {
      setPanelOffset((prev: { x: number; y: number }) => ({
        x: Math.max(-(containerWidth - 70), Math.min(10, prev.x)),
        y: Math.max(-20, Math.min(containerHeight - 100, prev.y)),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, containerHeight]);

  // Persist panel offset to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_PANEL_OFFSET, JSON.stringify(panelOffset));
    } catch { /* ignore */ }
  }, [panelOffset]);

  // Panel drag-to-reposition (window-level)
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingPanel.current) return;
      if (e.buttons !== 1) { isDraggingPanel.current = false; setIsDraggingVisual(false); setIsSnapped(false); return; }
      const dx = e.clientX - panelDragStart.current.mouseX;
      const dy = e.clientY - panelDragStart.current.mouseY;

      let newX = panelDragStart.current.offsetX + dx;
      let newY = panelDragStart.current.offsetY + dy;

      // Snap to parent edges (using cached dimensions from drag start)
      const { pw, ph, panelW, panelH } = panelDragStart.current;
      let snapped = false;
      if (pw > 0 && ph > 0) {
        // Visual position from CSS (top:40px, right:10px) + transform offset
        const visualLeft = pw - panelW - 10 + newX;
        const visualTop = 40 + newY;

        // Left edge
        if (Math.abs(visualLeft) < SNAP_THRESHOLD) {
          newX = -(pw - panelW - 10);
          snapped = true;
        }
        // Right edge (right gap = 10 - newX)
        if (Math.abs(10 - newX) < SNAP_THRESHOLD) {
          newX = 10;
          snapped = true;
        }
        // Top edge
        if (Math.abs(visualTop) < SNAP_THRESHOLD) {
          newY = -40;
          snapped = true;
        }
        // Bottom edge
        const bottomGap = ph - (visualTop + panelH);
        if (Math.abs(bottomGap) < SNAP_THRESHOLD) {
          newY = ph - 40 - panelH;
          snapped = true;
        }
      }

      // Clamp to keep the panel reachable — at least 70px must remain visible
      if (pw > 0 && ph > 0) {
        // Horizontal: right edge must not go past parent right (offsetX <= 10)
        //           : left side must keep at least 70px visible
        newX = Math.max(-(pw - 70), Math.min(10, newX));
        // Vertical: top must not go off-screen, keep at least 60px visible from bottom
        newY = Math.max(-20, Math.min(ph - 40 - 60, newY));
      }

      setPanelOffset({ x: newX, y: newY });
      setIsSnapped(snapped);
    };

    const handleUp = () => {
      isDraggingPanel.current = false;
      setIsDraggingVisual(false);
      setIsSnapped(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []); // refs are stable, setPanelOffset is stable

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    isDraggingPanel.current = true;
    setIsDraggingVisual(true);
    const panelEl = panelRef.current;
    let pw = 0, ph = 0, panelW = 0, panelH = 0;
    if (panelEl) {
      const parentEl = panelEl.parentElement;
      if (parentEl) {
        const pr = parentEl.getBoundingClientRect();
        pw = pr.width;
        ph = pr.height;
        panelW = panelEl.offsetWidth;
        panelH = panelEl.offsetHeight;
      }
    }
    panelDragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: panelOffset.x,
      offsetY: panelOffset.y,
      pw,
      ph,
      panelW,
      panelH,
    };
  }, [panelOffset]);

  // Sync hiddenKinds to localStorage + URL query param.
  // On first mount, read URL FIRST (higher priority) before any write.
  useEffect(() => {
    // First mount: URL takes priority over localStorage
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      try {
        const url = new URL(window.location.href);
        const raw = url.searchParams.get(URL_PARAM_HIDE);
        if (raw) {
          const kinds = raw.split(',').map((s) => s.trim()).filter(Boolean);
          if (kinds.length > 0) {
            setHiddenKinds(new Set(kinds));
            return; // skip sync — state change will re-trigger this effect
          }
        }
      } catch { /* ignore */ }
      try {
        const raw = localStorage.getItem(LS_KEY_HIDDEN_KINDS);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            setHiddenKinds(new Set(arr));
            return;
          }
        }
      } catch { /* ignore */ }
    }

    // Sync to localStorage + URL
    try {
      const arr = Array.from(hiddenKinds);
      localStorage.setItem(LS_KEY_HIDDEN_KINDS, JSON.stringify(arr));
    } catch { /* ignore */ }
    try {
      const url = new URL(window.location.href);
      if (hiddenKinds.size > 0) {
        url.searchParams.set(URL_PARAM_HIDE, Array.from(hiddenKinds).join(','));
      } else {
        url.searchParams.delete(URL_PARAM_HIDE);
      }
      window.history.replaceState(null, '', url.toString());
    } catch { /* ignore */ }
  }, [hiddenKinds]);
  const isFirstMountRef = useRef(true);
  const [isDragging, setIsDragging] = useState(false);
  const didDragRef = useRef(false);
  const mouseUpHandledRef = useRef(false);
  const panRef = useRef(pan);
  panRef.current = pan;
  const miniMapRef = useRef<HTMLDivElement>(null);

  // Compute mini-map scale to fit within the max dimensions
  const scale = useMemo(() => {
    if (rackWidth <= 0 || rackHeight <= 0) return 0.15;
    return Math.min(MINI_MAP_MAX_W / rackWidth, MINI_MAP_MAX_H / rackHeight, 0.3);
  }, [rackWidth, rackHeight]);

  const miniW = rackWidth * scale;
  const miniH = rackHeight * scale;

  // Flatten node tree for simplified rendering (filtered by hidden kinds)
  const nodes = useMemo(() => {
    const all = flattenTree(manifest.ui?.tree);
    if (hiddenKinds.size === 0) return all;
    return all.filter((n) => !hiddenKinds.has(n.kind));
  }, [manifest.ui?.tree, hiddenKinds]);

  // Viewport indicator rect — computed by shared hook, then scaled to mini-map coords
  const rackRect = useViewportRect({
    zoom,
    pan,
    containerWidth,
    containerHeight,
    rackWidth,
    rackHeight,
  });

  const viewportRect = useMemo(
    () => ({
      x: rackRect.left * scale,
      y: rackRect.top * scale,
      w: rackRect.width * scale,
      h: rackRect.height * scale,
    }),
    [rackRect, scale]
  );

  // Convert a mini-map pixel position to new pan values
  const miniCoordToPan = useCallback(
    (miniX: number, miniY: number) => {
      const rackX = miniX / scale;
      const rackY = miniY / scale;
      return {
        x: rackWidth / 2 - rackX,
        y: rackHeight / 2 - rackY,
      };
    },
    [scale, rackWidth, rackHeight]
  );

  // Click to navigate: center viewport on clicked position.
  // Only fires for background clicks (not on viewport rect) because
  // handleMouseDown on the rect calls stopPropagation, and handleUp
  // sets mouseUpHandledRef to suppress the click after mousedown interaction.
  const handleMiniMapClick = useCallback(
    (e: React.MouseEvent) => {
      if (mouseUpHandledRef.current) {
        mouseUpHandledRef.current = false;
        return;
      }
      const rect = miniMapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const newPan = miniCoordToPan(clickX, clickY);
      onPan(newPan.x - panRef.current.x, newPan.y - panRef.current.y);
    },
    [miniCoordToPan, onPan]
  );

  // Drag viewport indicator to navigate
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
    },
    [pan]
  );

  useEffect(() => {
    if (!isDragging || !dragStartRef.current) return;

    const handleMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      didDragRef.current = true;
      const rect = miniMapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dxPx = e.clientX - dragStartRef.current.x;
      const dyPx = e.clientY - dragStartRef.current.y;
      // Convert mini-map pixels to rack coords
      const rackDx = dxPx / scale;
      const rackDy = dyPx / scale;
      onPan(rackDx, rackDy);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startPanX: dragStartRef.current.startPanX + rackDx,
        startPanY: dragStartRef.current.startPanY + rackDy,
      };
    };

    const handleUp = (e: MouseEvent) => {
      // Suppress the click event that follows mouseup in the same macrotask
      mouseUpHandledRef.current = true;
      setIsDragging(false);
      if (!didDragRef.current && dragStartRef.current && miniMapRef.current) {
        // Click without drag on viewport rect — navigate to click position
        const p = panRef.current;
        const rect = miniMapRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const rackX = clickX / scale;
        const rackY = clickY / scale;
        onPan(rackWidth / 2 - rackX - p.x, rackHeight / 2 - rackY - p.y);
      }
      didDragRef.current = false;
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, scale, onPan]);

  const toggleVisibility = useCallback(() => setIsVisible((prev) => !prev), []);

  // Collect all distinct node kinds present in the current tree
  const availableKinds = useMemo(() => {
    const all = flattenTree(manifest.ui?.tree);
    const kinds = new Set(all.map((n) => n.kind));
    return Array.from(kinds).sort();
  }, [manifest.ui?.tree]);

  const toggleKindFilter = useCallback((kind: string) => {
    setHiddenKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }, []);

  if (!isVisible) {
    return (
      <button
        data-testid="mini-map-toggle"
        onClick={toggleVisibility}
        onMouseDown={handleHeaderMouseDown}
        className={`absolute top-[40px] right-[10px] z-[70] p-1.5 wb-surface backdrop-blur-md border wb-outline rounded-xs shadow-2xl hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors ${
          isDraggingVisual ? 'shadow-[0_0_15px_rgba(0,242,255,0.3)] ring-1 ring-primary/30' : ''
        }`}
        style={{ transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)` }}
        title="Show Mini Map · Drag to reposition"
      >
        <EyeOff className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      data-testid="mini-map"
      className={`absolute top-[40px] right-[10px] z-[70] flex flex-col wb-surface backdrop-blur-md border wb-outline rounded-xs shadow-2xl overflow-hidden transition-colors duration-500 ${
          isDraggingVisual ? 'shadow-[0_0_20px_rgba(0,242,255,0.25)] ring-1 ring-primary/20' : ''
        } ${
          isSnapped ? 'ring-2 ring-accent/40 shadow-[0_0_12px_rgba(251,191,36,0.25)]' : ''
        }`}
      style={{
        minWidth: miniW + 16 + 40,
        transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)`,
      }} // extra width for zoom label
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b wb-outline select-none">
        <span
          className="text-[7px] font-black uppercase tracking-widest text-white/30 cursor-move"
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={() => setPanelOffset({ x: 0, y: 0 })}
          title="Double-click to reset position"
        >
          Navigator
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono text-primary/50 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          {/* Kind filter toggle */}
          <div className="relative">
            <button
              onClick={() => setShowKindFilter((p) => !p)}
              className={`p-0.5 transition-all rounded-xs ${
                hiddenKinds.size > 0 ? 'text-accent bg-accent/10' : 'text-primary/40 hover:text-primary'
              }`}
              title="Filter node kinds"
            >
              <Filter className="w-3 h-3" />
            </button>
            {showKindFilter && (
              <div className="absolute bottom-full right-0 mb-1 w-32 bg-[#0a0a0b] border border-outline rounded-xs shadow-2xl p-1 z-[80]">
                <div className="text-[6px] font-black uppercase tracking-widest text-white/30 px-1.5 pb-1">
                  Show Kinds
                </div>
                {availableKinds.map((kind) => {
                  const isHidden = hiddenKinds.has(kind);
                  return (
                    <label
                      key={kind}
                      className="flex items-center gap-1.5 px-1.5 py-1 rounded-xs hover:bg-white/5 cursor-pointer text-[7px] font-bold uppercase tracking-wider transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => toggleKindFilter(kind)}
                        className="w-2.5 h-2.5 accent-primary"
                      />
                      {/* Color dot matching the node's getNodeColor */}
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{
                          background: getNodeColor(kind).bg,
                          border: `1px solid ${getNodeColor(kind).border}`,
                          opacity: isHidden ? 0.3 : 1,
                        }}
                      />
                      <span className={isHidden ? 'text-white/20 line-through' : 'text-white/70'}>
                        {kind}
                      </span>
                    </label>
                  );
                })}
                {/* Clear all filters — only shown when at least one kind is hidden */}
                {hiddenKinds.size > 0 && (
                  <>
                    <div className="h-px bg-white/5 my-1 mx-1" />
                    <button
                      onClick={() => setHiddenKinds(new Set())}
                      className="w-full text-left px-1.5 py-1 rounded-xs hover:bg-red-500/10 text-[7px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {(panelOffset.x !== 0 || panelOffset.y !== 0) && (
            <button
              onClick={() => setPanelOffset({ x: 0, y: 0 })}
              className="p-0.5 hover:bg-primary/10 text-primary/40 hover:text-primary transition-all rounded-xs"
              title="Reset panel position"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {onResetViewport && (
          <button
            data-testid="mini-map-center"
            onClick={onResetViewport}
            className="p-0.5 hover:bg-primary/10 text-primary/40 hover:text-primary transition-all rounded-xs"
            title="Center View"
          >
              <Target className="w-3 h-3" />
            </button>
          )}
          <button
            data-testid="mini-map-fit"
            onClick={onFitViewport}
            className="p-0.5 hover:bg-primary/10 text-primary/40 hover:text-primary transition-all rounded-xs"
            title="Fit to Screen"
          >
            <Maximize className="w-3 h-3" />
          </button>
          <button
            data-testid="mini-map-hide"
            onClick={toggleVisibility}
            className="p-0.5 hover:bg-primary/10 text-primary/40 hover:text-primary transition-all rounded-xs"
            title="Hide Mini Map"
          >
            <Eye className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mini-map canvas */}
      <div
        ref={miniMapRef}
        className="relative cursor-pointer"
        style={{
          width: miniW + 16,
          height: miniH + 16,
          padding: 8,
        }}
        onClick={handleMiniMapClick}
      >
        {/* Rack background */}
        <div
          data-testid="mini-map-rack"
          className="absolute rounded-[1px]"
          style={{
            top: 8,
            left: 8,
            width: miniW,
            height: miniH,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Nodes as tiny rectangles — colored by kind, with tooltips and selection */}
          {nodes.map((node) => {
            const isSelected = selectedItemId === node.id;
            const isLocked = lockedNodeIds.includes(node.id);
            const colors = getNodeColor(node.kind);
            return (
              <div
                key={node.id}
                className={`absolute rounded-[1px] transition-all duration-150 ${
                  isSelected ? 'z-[5]' : ''
                }`}
                title={`${isLocked ? '🔒 ' : ''}${node.label} (${node.kind})`}
                style={{
                  top: node.y * scale,
                  left: node.x * scale,
                  width: Math.max(node.w * scale, 2),
                  height: Math.max(node.h * scale, 2),
                  background: isSelected ? SELECTED_COLOR : colors.bg,
                  border: `1px solid ${isSelected ? SELECTED_BORDER : colors.border}`,
                  boxShadow: isSelected
                    ? '0 0 4px rgba(0, 242, 255, 0.4)'
                    : 'none',
                  opacity: isLocked ? 0.45 : 1,
                  cursor: onSelectItem ? 'pointer' : 'default',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem?.(node.id);
                }}
              >
                {/* Lock overlay icon for locked nodes */}
                {isLocked && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ fontSize: Math.max(node.h * scale * 0.35, 4) }}
                  >
                    🔒
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Viewport indicator — draggable */}
        <div
          data-testid="mini-map-viewport"
          className="absolute cursor-grab rounded-[1px] border border-primary/60 bg-primary/5 transition-opacity hover:opacity-80"
          style={{
            top: 8 + viewportRect.y,
            left: 8 + viewportRect.x,
            width: viewportRect.w,
            height: viewportRect.h,
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
}
