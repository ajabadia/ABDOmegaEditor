'use client';

/**
 * @purpose Renderiza una capa de regla con guías horizontales y verticales para una posición precisa dentro del viewport del editor de manifesto OMEGA.
 * @purpose_en Renders a ruler overlay with horizontal and vertical guides for precise positioning within the OMEGA manifest editor viewport.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:bp8p4y
 * @lastUpdated 2026-06-15T13:01:36.330Z
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { GridGuide } from '@/omega-ui-core/types/rack';

interface RulerOverlayProps {
  showGuides?: boolean;
  guides?: GridGuide[];
  onGuidesChange?: (guides: GridGuide[]) => void;
  toolbarHeight?: number | undefined;
  pan?: { x: number; y: number } | undefined;
  zoom?: number | undefined;
  rackWidth?: number | undefined;
  rackHeight?: number | undefined;
  uiTheme?: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast' | undefined;
}

const RULER_SIZE = 22;
const TICK_MAJOR = 50;
const TICK_MINOR = 10;
const DELETE_ZONE = 30;

function generateId(): string {
  return `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// `baseRackPos` now stores the rack's direct visual top-left in section coords
// (post-transform). It is re-measured on every pan/zoom change so the ruler
// tick marks and guide overlays stay locked to the rack at any zoom level.

export default function RulerOverlay({
  showGuides = false,
  guides = [],
  onGuidesChange,
  toolbarHeight = 0,
  pan,
  zoom = 1,
  rackWidth = 800,
  rackHeight = 400,
  uiTheme = 'dark',
}: RulerOverlayProps) {
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  const horizontalRef = useRef<HTMLCanvasElement>(null);
  const verticalRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const sectionRectRef = useRef({ left: 0, top: 0 });
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Drag state: creating a new guide from ruler
  const [creating, setCreating] = useState<{
    orientation: 'horizontal' | 'vertical';
    pos: number;
    inZone: boolean;
  } | null>(null);

  // Drag state: moving an existing guide
  const [dragging, setDragging] = useState<{
    id: string;
    orientation: 'horizontal' | 'vertical';
    startPos: number;
    inZone: boolean;
  } | null>(null);

  // Stable base position of the rack in section coords (measured once at mount, before any transform)
  const [baseRackPos, setBaseRackPos] = useState({ x: 0, y: 0 });
  const baseRackPosRef = useRef(baseRackPos);
  useEffect(() => { baseRackPosRef.current = baseRackPos; }, [baseRackPos]);

  const origin = baseRackPos;
  const th = toolbarHeight ?? 0;
  const z = zoom ?? 1;

  // ──────────────────────────────────────────────
  // Continuous rack position tracking.
  //
  // We can't rely on React's render cycle to know when the rack has moved
  // (free-pan updates pan via requestAnimationFrame, button-pan updates it
  // synchronously, zoom changes scale, the flex parent re-centers on resize…).
  // Instead, we sample the rack's actual DOM position on every animation
  // frame and only push to state when it changes. This is order-of-magnitude
  // more robust than any useEffect/useLayoutEffect strategy because it
  // always reads the truth from the DOM, never from React's stale closure.
  // ──────────────────────────────────────────────
  const lastBasePosRef = useRef({ x: -1, y: -1 });
  const lastDimsRef = useRef({ w: 0, h: 0 });
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const section = wrapperRef.current?.closest('section');
      if (section) {
        const sr = section.getBoundingClientRect();
        const rackEl = section.querySelector<HTMLElement>('.rack-viewport');
        if (rackEl) {
          const rr = rackEl.getBoundingClientRect();
          const nx = rr.left - sr.left;
          const ny = rr.top - sr.top;
          if (nx !== lastBasePosRef.current.x || ny !== lastBasePosRef.current.y) {
            lastBasePosRef.current = { x: nx, y: ny };
            setBaseRackPos({ x: nx, y: ny });
          }
        }
        const nw = section.clientWidth;
        const nh = section.clientHeight;
        if (nw !== lastDimsRef.current.w || nh !== lastDimsRef.current.h) {
          lastDimsRef.current = { w: nw, h: nh };
          setDims({ w: nw, h: nh });
        }
        sectionRectRef.current = { left: sr.left, top: sr.top };
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [wrapperRef, setBaseRackPos, setDims]);

  // ──────────────────────────────────────────────
  // Horizontal ruler drawing
  // ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = horizontalRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = dims.w - RULER_SIZE;
    canvas.width = w * dpr;
    canvas.height = RULER_SIZE * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${RULER_SIZE}px`;
    ctx.scale(dpr, dpr);

    const styles = window.getComputedStyle(canvas);
    const rulerBg = styles.getPropertyValue('--wb-surface-inset') || '#e0e0e0';
    const textColor = styles.getPropertyValue('--wb-text') || '#222';
    const textMuted = styles.getPropertyValue('--wb-text-muted') || 'rgba(0,0,0,0.4)';
    const outlineColor = styles.getPropertyValue('--wb-outline') || '#888';

    ctx.fillStyle = rulerBg;
    ctx.fillRect(0, 0, w, RULER_SIZE);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, RULER_SIZE - 0.5);
    ctx.lineTo(w, RULER_SIZE - 0.5);
    ctx.stroke();

    const z = zoom ?? 1;
    const tickStepPx = TICK_MINOR * z;

    const origin = baseRackPos;
  const startVal = Math.floor((RULER_SIZE - origin.x) / tickStepPx) * TICK_MINOR;;
    const endVal = Math.ceil((w + RULER_SIZE - origin.x) / z);

    ctx.textAlign = 'center';
    for (let dv = startVal; dv <= endVal; dv += TICK_MINOR) {
      const canvasX = origin.x + dv * z - RULER_SIZE;
      if (canvasX < -tickStepPx || canvasX > w + tickStepPx) continue;
      const isMajor = dv % TICK_MAJOR === 0;
      const tickH = isMajor ? 10 : 4;
      ctx.strokeStyle = isMajor ? textColor : textMuted;
      ctx.lineWidth = isMajor ? 1.5 : 0.7;
      ctx.beginPath();
      ctx.moveTo(canvasX + 0.5, RULER_SIZE - tickH);
      ctx.lineTo(canvasX + 0.5, RULER_SIZE);
      ctx.stroke();
      if (isMajor) {
        ctx.fillStyle = textColor;
        ctx.font = 'bold 8px Inter, monospace';
        ctx.fillText(`${dv}`, canvasX, RULER_SIZE - 12);
      }
    }

    if (creating?.orientation === 'horizontal') {
      const canvasY = origin.y + creating.pos * z - toolbarHeight - RULER_SIZE;
      ctx.fillStyle = 'rgba(0, 180, 255, 0.6)';
      ctx.fillRect(canvasY, 0, 2, RULER_SIZE);
    }
  }, [dims.w, creating, pan, zoom, baseRackPos, toolbarHeight, rackWidth, rackHeight, uiTheme]);

  // ──────────────────────────────────────────────
  // Vertical ruler drawing
  // ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = verticalRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const h = dims.h - RULER_SIZE;
    canvas.width = RULER_SIZE * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${RULER_SIZE}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const styles = window.getComputedStyle(canvas);
    const rulerBg = styles.getPropertyValue('--wb-surface-inset') || '#e0e0e0';
    const textColor = styles.getPropertyValue('--wb-text') || '#222';
    const textMuted = styles.getPropertyValue('--wb-text-muted') || 'rgba(0,0,0,0.4)';
    const outlineColor = styles.getPropertyValue('--wb-outline') || '#888';

    ctx.fillStyle = rulerBg;
    ctx.fillRect(0, 0, RULER_SIZE, h);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE - 0.5, 0);
    ctx.lineTo(RULER_SIZE - 0.5, h);
    ctx.stroke();

    const z = zoom ?? 1;
    const tickStepPx = TICK_MINOR * z;

    const startVal = Math.floor((toolbarHeight + RULER_SIZE - origin.y) / tickStepPx) * TICK_MINOR;
    const endVal = Math.ceil((h + toolbarHeight + RULER_SIZE - origin.y) / z);

    for (let dv = startVal; dv <= endVal; dv += TICK_MINOR) {
      const canvasY = origin.y + dv * z - toolbarHeight - RULER_SIZE;
      if (canvasY < -tickStepPx || canvasY > h + tickStepPx) continue;
      const isMajor = dv % TICK_MAJOR === 0;
      const tickW = isMajor ? 10 : 4;
      ctx.strokeStyle = isMajor ? textColor : textMuted;
      ctx.lineWidth = isMajor ? 1.5 : 0.7;
      ctx.beginPath();
      ctx.moveTo(RULER_SIZE - tickW, canvasY + 0.5);
      ctx.lineTo(RULER_SIZE, canvasY + 0.5);
      ctx.stroke();
      if (isMajor) {
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = 'bold 8px Inter, monospace';
        ctx.translate(12, canvasY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`${dv}`, 0, 0);
        ctx.restore();
      }
    }

    if (creating?.orientation === 'vertical') {
      const canvasX = origin.x + creating.pos * z - RULER_SIZE;
      ctx.fillStyle = 'rgba(0, 180, 255, 0.6)';
      ctx.fillRect(0, canvasX, RULER_SIZE, 2);
    }
  }, [dims.h, creating, pan, zoom, baseRackPos, toolbarHeight, rackWidth, rackHeight, uiTheme]);

  // ──────────────────────────────────────────────
  // CREATING guides: mousedown on ruler
  // ──────────────────────────────────────────────
  const handleHorizontalRulerMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showGuides) return;
    e.preventDefault();
    const section = (e.currentTarget as HTMLElement).closest('section');
    if (!section) return;
    const sr = section.getBoundingClientRect();
    const z = zoomRef.current ?? 1;
    const origin = baseRackPosRef.current;
    const rackY = (e.clientY - sr.top - origin.y) / z;
    setCreating({ orientation: 'horizontal', pos: Math.round(rackY), inZone: false });
  }, [showGuides, rackWidth, rackHeight]);

  const handleVerticalRulerMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showGuides) return;
    e.preventDefault();
    const section = (e.currentTarget as HTMLElement).closest('section');
    if (!section) return;
    const sr = section.getBoundingClientRect();
    const z = zoomRef.current ?? 1;
    const origin = baseRackPosRef.current;
    const rackX = (e.clientX - sr.left - origin.x) / z;
    setCreating({ orientation: 'vertical', pos: Math.round(rackX), inZone: false });
  }, [showGuides, rackWidth, rackHeight]);

  // ──────────────────────────────────────────────
  // DRAGGING existing guides
  // ──────────────────────────────────────────────
  const handleGuideDragStart = useCallback((e: React.MouseEvent, guide: GridGuide) => {
    if (!showGuides) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging({
      id: guide.id,
      orientation: guide.orientation,
      startPos: guide.position,
      inZone: false,
    });
  }, [showGuides]);

  // ──────────────────────────────────────────────
  // WINDOW-LEVEL MOUSE HANDLERS
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!creating && !dragging) return;

    const handleMove = (e: MouseEvent) => {
      const sr = sectionRectRef.current;
      const bp = baseRackPosRef.current ?? { x: 0, y: 0 };
      const z = zoomRef.current ?? 1;

      if (creating) {
        if (creating.orientation === 'vertical') {
          // Vertical guide originates from the LEFT ruler → cancel zone is the left edge
          const inZone = e.clientX < RULER_SIZE + DELETE_ZONE;
          const origin = bp;
          const rackX = (e.clientX - sr.left - origin.x) / z;
          setCreating(prev => prev ? { ...prev, pos: Math.round(rackX), inZone } : null);
        } else {
          // Horizontal guide originates from the TOP ruler → cancel zone is the top edge
          const inZone = e.clientY < RULER_SIZE + DELETE_ZONE;
          const origin = bp;
          const rackY = (e.clientY - sr.top - origin.y) / z;
          setCreating(prev => prev ? { ...prev, pos: Math.round(rackY), inZone } : null);
        }
      }

      if (dragging) {
        if (dragging.orientation === 'vertical') {
          const inZone = e.clientX < RULER_SIZE + DELETE_ZONE;
          setDragging(prev => prev ? { ...prev, inZone } : null);
          if (onGuidesChange) {
            const origin = bp;
            const rackX = Math.round((e.clientX - sr.left - origin.x) / z);
            onGuidesChange(guides.map(g =>
              g.id === dragging.id ? { ...g, position: rackX } : g
            ));
          }
        } else {
          const inZone = e.clientY < RULER_SIZE + DELETE_ZONE;
          setDragging(prev => prev ? { ...prev, inZone } : null);
          if (onGuidesChange) {
            const origin = bp;
            const rackY = Math.round((e.clientY - sr.top - origin.y) / z);
            onGuidesChange(guides.map(g =>
              g.id === dragging.id ? { ...g, position: rackY } : g
            ));
          }
        }
      }
    };

    const handleUp = () => {
      if (creating) {
        // Cancel creation if the cursor was released back inside the source ruler
        // (Photoshop-style: drag a guide from a ruler, drop it back on the ruler = no-op).
        if (!creating.inZone && onGuidesChange) {
          const newGuide: GridGuide = {
            id: generateId(),
            orientation: creating.orientation,
            position: creating.pos,
          };
          onGuidesChange([...guides, newGuide]);
        }
        setCreating(null);
      }

      if (dragging) {
        if (dragging.inZone && onGuidesChange) {
          onGuidesChange(guides.filter(g => g.id !== dragging.id));
        }
        setDragging(null);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [creating, dragging, guides, onGuidesChange, rackWidth, rackHeight, setCreating, setDragging]);

  // ──────────────────────────────────────────────
  // RENDER — pre-compute overlays outside JSX to avoid IIFE TS issues
  // ──────────────────────────────────────────────
  // baseRackPos now stores the rack's direct visual top-left in section coords (post-transform).

  // Creating guide preview line
  let creatingLine: React.ReactNode = null;
  if (creating) {
    const screenPos = creating.orientation === 'vertical'
      ? Math.round(origin.x + creating.pos * z)
      : Math.round(origin.y + creating.pos * z - th);
    const lineStyle: React.CSSProperties = creating.orientation === 'vertical'
      ? {
          left: screenPos,
          top: RULER_SIZE,
          bottom: 0,
          width: 1,
          backgroundColor: creating.inZone ? 'rgba(255, 80, 80, 0.7)' : 'rgba(0, 180, 255, 0.7)',
        }
      : {
          top: screenPos,
          left: RULER_SIZE,
          right: 0,
          height: 1,
          backgroundColor: creating.inZone ? 'rgba(255, 80, 80, 0.7)' : 'rgba(0, 180, 255, 0.7)',
        };
    creatingLine = <div className="absolute pointer-events-none" style={lineStyle} />;
  }

  // Existing guide overlay elements
  const guideElements: React.ReactNode[] = [];
  if (showGuides) {
    for (const guide of guides) {
      const isVertical = guide.orientation === 'vertical';
      const isDragging = dragging?.id === guide.id;
      const inDeleteZone = isDragging && dragging?.inZone;
      const screenPos = Math.round(isVertical
        ? origin.x + guide.position * z
        : origin.y + guide.position * z - th);

      const style: React.CSSProperties = isVertical
        ? { position: 'absolute', left: screenPos, top: RULER_SIZE, bottom: 0, width: 1, cursor: 'ew-resize' }
        : { position: 'absolute', top: screenPos, left: RULER_SIZE, right: 0, height: 1, cursor: 'ns-resize' };

      guideElements.push(
        <div
          key={guide.id}
          className="absolute transition-shadow"
          style={{
            ...style,
            backgroundColor: inDeleteZone
              ? 'rgba(255, 80, 80, 0.8)'
              : isDragging
                ? 'rgba(0, 180, 255, 0.9)'
                : 'rgba(0, 180, 255, 0.7)',
            boxShadow: inDeleteZone
              ? '0 0 8px rgba(255, 80, 80, 0.6)'
              : isDragging
                ? '0 0 8px rgba(0, 180, 255, 0.6)'
                : 'none',
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => handleGuideDragStart(e, guide)}
        />
      );
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-[60]"
      style={{
        visibility: showGuides ? 'visible' : 'hidden',
        pointerEvents: 'none',
        top: toolbarHeight,
      }}
    >
      {/* Horizontal ruler — top edge, right of corner */}
      <canvas
        ref={horizontalRef}
        className="absolute"
        style={{
          top: 0,
          left: RULER_SIZE,
          height: RULER_SIZE,
          cursor: showGuides ? 'crosshair' : 'default',
          pointerEvents: showGuides ? 'auto' : 'none',
        }}
        onMouseDown={handleHorizontalRulerMouseDown}
      />

      {/* Vertical ruler — left edge, below corner */}
      <canvas
        ref={verticalRef}
        className="absolute"
        style={{
          top: RULER_SIZE,
          left: 0,
          width: RULER_SIZE,
          cursor: showGuides ? 'crosshair' : 'default',
          pointerEvents: showGuides ? 'auto' : 'none',
        }}
        onMouseDown={handleVerticalRulerMouseDown}
      />

      {/* Corner box */}
      <div
        className="absolute top-0 left-0 flex items-center justify-center"
        style={{
          width: RULER_SIZE,
          height: RULER_SIZE,
          backgroundColor: 'var(--wb-surface-inset)',
          borderBottom: '1px solid var(--wb-outline)',
          borderRight: '1px solid var(--wb-outline)'
        }}
      >
        <div className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: 'var(--wb-text-muted)' }} />
      </div>

      {/* Creating guide preview line */}
      {creatingLine}

      {/* Existing guides */}
      {guideElements}
    </div>
  );
}
