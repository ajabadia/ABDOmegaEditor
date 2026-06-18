'use client';

/**
 * @purpose Renderiza una capa de SVG interactiva para crear, visualizar y eliminar conexiones de modulación entre puertos en el viewport del rack.
 * @purpose_en Renders an interactive SVG overlay for creating, viewing, and deleting modulation connections between ports in the rack viewport.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:xrwppf
 * @lastUpdated 2026-06-15T22:15:00.000Z
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import type { OMEGA_Manifest, OMEGA_Modulation, ManifestEntity } from '@/omega-ui-core/types/manifest';

interface ConnectionOverlayProps {
  manifest: OMEGA_Manifest;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAddModulation: (mod: OMEGA_Modulation) => void;
  onRemoveModulation: (id: string) => void;
}

interface ConnectionLink {
  id: string;
  sourceId: string;
  targetId: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  amount: number;
  type: string;
}

interface PortHandle {
  id: string;
  label: string;
  x: number;
  y: number;
  isInput: boolean;
}

const MOD_TYPE_COLORS: Record<string, string> = {
  unipolar: '#00f0ff',
  bipolar: '#ff8c00',
  additive: '#22c55e',
  multiplicative: '#a855f7',
  audio: '#3b82f6',
  cv: '#f59e0b',
};

const MOD_TYPE_LABELS: Record<string, string> = {
  unipolar: 'UNI',
  bipolar: 'BI',
  additive: 'ADD',
  multiplicative: 'MULT',
  audio: 'AUDIO',
  cv: 'CV',
};

const DEFAULT_MOD_COLOR = '#00f0ff';
const SNAP_RADIUS = 20;

/**
 * ConnectionOverlay — Interactive SVG overlay for modulation connections.
 *
 * Features:
 * - Detects port elements in the DOM and renders draggable connection handles
 * - Draws SVG bezier curves between connected ports
 * - Drag from handle → drop on other handle to create modulation
 * - Snap-to-handle when dragging near a port (20px radius)
 * - Click on connection line to delete it
 * - Ghost cable preview while dragging with dash animation
 * - Tooltip on hover with source/target labels, type, amount
 * - Connection count badges with pulse animation
 * - Fade-in animation for new connections
 */
export default function ConnectionOverlay({
  manifest,
  containerRef,
  onAddModulation,
  onRemoveModulation,
}: ConnectionOverlayProps) {
  const [links, setLinks] = useState<ConnectionLink[]>([]);
  const [handles, setHandles] = useState<PortHandle[]>([]);
  const [dragState, setDragState] = useState<{ sourceId: string; mouseX: number; mouseY: number; containerOffset: { left: number; top: number } } | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [linksVersion, setLinksVersion] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Build port handles from manifest entities + DOM positions ─────
  const refreshPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newHandles: PortHandle[] = [];
    const newLinks: ConnectionLink[] = [];

    // Collect connectable entities (controls + jacks)
    const entities: ManifestEntity[] = [
      ...(manifest.ui?.controls || []),
      ...(manifest.ui?.jacks || []),
    ];
    const entityIds = new Set(entities.map(e => e.id));

    // Find all UCA nodes in the DOM
    const ucaElements = container.querySelectorAll<HTMLElement>('[id^="uca-"]');
    ucaElements.forEach(el => {
      const id = el.id.replace('uca-', '');
      if (!entityIds.has(id)) return;

      const rect = el.getBoundingClientRect();
      const x = rect.left - containerRect.left + rect.width / 2;
      const y = rect.top - containerRect.top + rect.height / 2;
      const entity = entities.find(e => e.id === id);
      const isInput = entity?.type === 'telemetry' || entity?.type === 'stream';

      newHandles.push({
        id,
        label: entity?.label || id,
        x,
        y,
        isInput,
      });
    });

    // Build connection links from modulations
    const modulations = manifest.modulations || [];
    modulations.forEach(mod => {
      const sourceHandle = newHandles.find(h => h.id === mod.source);
      const targetHandle = newHandles.find(h => h.id === mod.target);
      if (sourceHandle && targetHandle) {
        newLinks.push({
          id: mod.id,
          sourceId: mod.source,
          targetId: mod.target,
          sx: sourceHandle.x,
          sy: sourceHandle.y,
          tx: targetHandle.x,
          ty: targetHandle.y,
          amount: mod.amount ?? 0.75,
          type: mod.type || 'unipolar',
        });
      }
    });

    setHandles(newHandles);
    setLinks(prev => {
      // Increment version if links changed (triggers re-animation)
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(newLinks);
      if (prevJson !== nextJson) {
        setLinksVersion(v => v + 1);
      }
      return newLinks;
    });
    setDimensions({ w: containerRect.width, h: containerRect.height });
  }, [manifest, containerRef]);

  // ── Refresh on mount + resize + periodic ──────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    refreshPositions();

    const resizeObserver = new ResizeObserver(() => refreshPositions());
    resizeObserver.observe(container);

    // Periodic refresh for drag/resize updates
    const intervalId = setInterval(refreshPositions, 1000);

    return () => {
      resizeObserver.disconnect();
      clearInterval(intervalId);
    };
  }, [refreshPositions, containerRef]);

  // ── Handle drag start on a port handle ────────────────────────────
  const handleHandleMouseDown = useCallback((e: React.MouseEvent, handleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    setDragState({
      sourceId: handleId,
      mouseX: e.clientX,
      mouseY: e.clientY,
      containerOffset: { left: rect?.left ?? 0, top: rect?.top ?? 0 },
    });
  }, [containerRef]);

  // ── Track mouse during drag + snap-to-handle ─────────────────────
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      setDragState(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
    };

    const handleUp = () => {
      if (!dragState) return;

      // Find nearest handle within snap radius for a more reliable drop
      const container = containerRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const mouseContainerX = dragState.mouseX - containerRect.left;
        const mouseContainerY = dragState.mouseY - containerRect.top;

        // Check if we're near any handle
        const nearbyHandle = handles.find(h => {
          if (h.id === dragState.sourceId) return false;
          const dx = h.x - mouseContainerX;
          const dy = h.y - mouseContainerY;
          return Math.sqrt(dx * dx + dy * dy) <= SNAP_RADIUS;
        });

        const targetId = nearbyHandle?.id || null;

        if (targetId && targetId !== dragState.sourceId) {
          // Check if modulation already exists
          const exists = (manifest.modulations || []).some(
            m => (m.source === dragState.sourceId && m.target === targetId) ||
                 (m.source === targetId && m.target === dragState.sourceId)
          );
          if (!exists) {
            onAddModulation({
              id: `mod_${dragState.sourceId}_${targetId}`,
              source: dragState.sourceId,
              target: targetId,
              amount: 0.75,
              type: 'unipolar',
            });
            // Refresh positions after a short delay to pick up new modulation
            setTimeout(refreshPositions, 50);
          }
        }
      }

      setDragState(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, containerRef, manifest, onAddModulation, refreshPositions, handles]);

  // ── Delete modulation link on click ────────────────────────────────
  const handleLinkClick = useCallback((e: React.MouseEvent, linkId: string) => {
    e.stopPropagation();
    onRemoveModulation(linkId);
    setTimeout(refreshPositions, 50);
  }, [onRemoveModulation, refreshPositions]);

  // ── Calculate ghost line position (convert screen to container coords) ──
  const ghostRawX = dragState ? (dragState.mouseX - dragState.containerOffset.left) : 0;
  const ghostRawY = dragState ? (dragState.mouseY - dragState.containerOffset.top) : 0;

  // ── Snap-to-handle: find nearest handle within radius ──────────────
  const nearbyHandle = dragState
    ? handles.find(h => {
        if (h.id === dragState.sourceId) return false;
        const dx = h.x - ghostRawX;
        const dy = h.y - ghostRawY;
        return Math.sqrt(dx * dx + dy * dy) <= SNAP_RADIUS;
      })
    : null;

  const ghostX = nearbyHandle ? nearbyHandle.x : ghostRawX;
  const ghostY = nearbyHandle ? nearbyHandle.y : ghostRawY;
  const sourceHandle = dragState ? handles.find(h => h.id === dragState.sourceId) : null;

  // ── Memoized entity label map for tooltip ─────────────────────────
  const entityLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    const entities = [...(manifest.ui?.controls || []), ...(manifest.ui?.jacks || [])];
    entities.forEach(e => map.set(e.id, e.label || e.id));
    return map;
  }, [manifest]);

  const getEntityLabel = useCallback((id: string): string => {
    return entityLabelMap.get(id) || id;
  }, [entityLabelMap]);

  if (handles.length === 0 && links.length === 0 && !dragState) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-[60] pointer-events-none"
      style={{ overflow: 'visible', width: dimensions.w || '100%', height: dimensions.h || '100%' }}
    >
      <defs>
        <filter id="conn-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="conn-glow-strong">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="conn-glow-tooltip">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── EXISTING CONNECTION LINES ──────────────────────────────── */}
      {links.map((link, idx) => {
        const dx = link.tx - link.sx;
        const cp1x = link.sx + dx * 0.3;
        const cp2x = link.tx - dx * 0.3;
        const pathD = `M ${link.sx} ${link.sy} C ${cp1x} ${link.sy}, ${cp2x} ${link.ty}, ${link.tx} ${link.ty}`;
        const color = MOD_TYPE_COLORS[link.type] || DEFAULT_MOD_COLOR;
        const isHovered = hoveredLink === link.id;
        const sourceLabel = getEntityLabel(link.sourceId);
        const targetLabel = getEntityLabel(link.targetId);
        const typeLabel = MOD_TYPE_LABELS[link.type] || link.type.toUpperCase();

        return (
          <g
            key={`${link.id}-${linksVersion}`}
            style={{ animation: `conn-enter 0.3s ease-out both`, animationDelay: `${idx * 0.04}s` }}
          >
            {/* Invisible wide click target */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => setHoveredLink(link.id)}
              onMouseLeave={() => setHoveredLink(null)}
              onClick={(e) => handleLinkClick(e, link.id)}
            />
            {/* Glow line */}
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? 4 : 1.5}
              opacity={isHovered ? 0.6 : 0.3}
              filter="url(#conn-glow)"
            />
            {/* Solid line */}
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? 2 : 0.8}
              opacity={isHovered ? 0.95 : 0.55}
            />
            {/* Animated dot along path on hover */}
            {isHovered && (
              <circle r={3} fill={color} opacity={0.9} filter="url(#conn-glow-strong)">
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  path={pathD}
                />
              </circle>
            )}

            {/* ── TOOLTIP ON HOVER ────────────────────────────── */}
            {isHovered && (
              <g>
                <rect
                  x={(link.sx + link.tx) / 2 - 60}
                  y={(link.sy + link.ty) / 2 - 32}
                  width={120}
                  height={28}
                  rx={3}
                  fill="rgba(5,5,5,0.92)"
                  stroke={color}
                  strokeWidth={0.5}
                  strokeOpacity={0.5}
                  filter="url(#conn-glow-tooltip)"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => handleLinkClick(e, link.id)}
                />
                {/* Source → Target */}
                <text
                  x={(link.sx + link.tx) / 2}
                  y={(link.sy + link.ty) / 2 - 20}
                  fill="rgba(255,255,255,0.8)"
                  fontSize="6"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => handleLinkClick(e, link.id)}
                >
                  {sourceLabel.length > 10 ? sourceLabel.slice(0, 10) + '…' : sourceLabel}
                  {' → '}
                  {targetLabel.length > 10 ? targetLabel.slice(0, 10) + '…' : targetLabel}
                </text>
                {/* Type + Amount */}
                <text
                  x={(link.sx + link.tx) / 2}
                  y={(link.sy + link.ty) / 2 - 10}
                  fill={color}
                  fontSize="6"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-auto cursor-pointer"
                  onClick={(e) => handleLinkClick(e, link.id)}
                >
                  {typeLabel}
                  {' · '}
                  {(link.amount || 0).toFixed(2)}
                </text>
              </g>
            )}

            {/* Delete button on hover */}
            {isHovered && (
              <foreignObject
                x={(link.sx + link.tx) / 2 - 8}
                y={(link.sy + link.ty) / 2 + 4}
                width={16}
                height={16}
                className="pointer-events-auto"
              >
                <div
                  onClick={() => onRemoveModulation(link.id)}
                  className="w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"
                  title="Delete connection"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* ── DRAG GHOST LINE ────────────────────────────────────────── */}
      {dragState && sourceHandle && (
        <g style={{ animation: 'conn-enter 0.15s ease-out' }}>
          {/* Snap ring on nearby handle */}
          {nearbyHandle && nearbyHandle.id !== dragState.sourceId && (
            <g>
              <circle
                cx={nearbyHandle.x}
                cy={nearbyHandle.y}
                r={SNAP_RADIUS}
                fill="none"
                stroke={MOD_TYPE_COLORS.unipolar}
                strokeWidth={0.5}
                opacity={0.3}
                strokeDasharray="2 3"
              >
                <animate
                  attributeName="r"
                  values={`${SNAP_RADIUS - 2};${SNAP_RADIUS + 2};${SNAP_RADIUS - 2}`}
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.3;0.6;0.3"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Solid highlight ring */}
              <circle
                cx={nearbyHandle.x}
                cy={nearbyHandle.y}
                r={8}
                fill="rgba(0,240,255,0.1)"
                stroke="rgba(0,240,255,0.6)"
                strokeWidth={1.5}
              />
            </g>
          )}

          {/* Ghost line with animated dash */}
          <line
            x1={sourceHandle.x}
            y1={sourceHandle.y}
            x2={ghostX}
            y2={ghostY}
            stroke={MOD_TYPE_COLORS.unipolar}
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.7}
            filter="url(#conn-glow-strong)"
            style={{ animation: 'conn-ghost-dash 0.6s linear infinite' }}
          />
          {/* Ghost endpoint dot */}
          <circle
            cx={ghostX}
            cy={ghostY}
            r={nearbyHandle ? 6 : 4}
            fill={nearbyHandle ? 'rgba(0,240,255,0.5)' : MOD_TYPE_COLORS.unipolar}
            opacity={0.8}
            filter="url(#conn-glow-strong)"
          >
            {nearbyHandle && (
              <animate
                attributeName="r"
                values="6;8;6"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>

          {/* Connection count preview on source */}
          {sourceHandle && (
            <text
              x={sourceHandle.x + 12}
              y={sourceHandle.y - 12}
              fill={MOD_TYPE_COLORS.unipolar}
              fontSize="5"
              fontFamily="monospace"
              opacity={0.6}
              className="pointer-events-none select-none"
            >
              {(links.filter(l => l.sourceId === dragState.sourceId || l.targetId === dragState.sourceId).length)}
            </text>
          )}
        </g>
      )}

      {/* ── PORT HANDLES (clickable + draggable) ───────────────────── */}
      {handles.map(handle => {
        const isDragging = dragState?.sourceId === handle.id;
        const isNearbyTarget = nearbyHandle?.id === handle.id && !isDragging;
        const connectedLinks = links.filter(l => l.sourceId === handle.id || l.targetId === handle.id);
        const connectionCount = connectedLinks.length;
        const isSnapTarget = isNearbyTarget;

        return (
          <g
            key={handle.id}
            style={{ animation: !isSnapTarget ? 'conn-enter 0.25s ease-out both' : undefined }}
          >
            {/* Connection count badge with pulse */}
            {connectionCount > 0 && !isDragging && (
              <g>
                <circle
                  cx={handle.x + 10}
                  cy={handle.y - 10}
                  r={7}
                  fill="rgba(0,0,0,0.7)"
                  stroke={MOD_TYPE_COLORS.unipolar}
                  strokeWidth={0.5}
                  strokeOpacity={0.4}
                />
                <circle
                  cx={handle.x + 10}
                  cy={handle.y - 10}
                  r={7}
                  fill="none"
                  stroke={MOD_TYPE_COLORS.unipolar}
                  strokeWidth={0.5}
                  strokeOpacity={0.3}
                  style={{ animation: 'conn-pulse-badge 2s ease-in-out infinite' }}
                />
                <text
                  x={handle.x + 10}
                  y={handle.y - 7}
                  fill={MOD_TYPE_COLORS.unipolar}
                  fontSize="6"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {connectionCount > 9 ? '9+' : connectionCount}
                </text>
              </g>
            )}

            {/* Draggable handle circle */}
            <circle
              cx={handle.x}
              cy={handle.y}
              r={
                isSnapTarget ? 10 :
                isDragging ? 8 :
                hoveredHandle === handle.id ? 7 :
                connectionCount > 0 ? 6 : 5
              }
              fill={
                isSnapTarget ? 'rgba(0,240,255,0.25)' :
                isDragging ? 'rgba(0,240,255,0.5)' :
                hoveredHandle === handle.id ? 'rgba(0,240,255,0.4)' :
                connectionCount > 0 ? 'rgba(0,240,255,0.25)' :
                'rgba(255,255,255,0.12)'
              }
              stroke={
                isSnapTarget ? '#00f0ff' :
                isDragging ? '#00f0ff' :
                hoveredHandle === handle.id ? '#00f0ff' :
                connectionCount > 0 ? 'rgba(0,240,255,0.6)' :
                'rgba(255,255,255,0.3)'
              }
              strokeWidth={
                isSnapTarget ? 2 :
                isDragging ? 2 :
                hoveredHandle === handle.id ? 1.5 :
                1.2
              }
              className="pointer-events-auto cursor-crosshair"
              data-port-handle-id={handle.id}
              onMouseDown={(e) => handleHandleMouseDown(e, handle.id)}
              onMouseEnter={() => setHoveredHandle(handle.id)}
              onMouseLeave={() => { if (dragState?.sourceId !== handle.id) setHoveredHandle(null); }}
            >
              {/* Pulse animation on snap target */}
              {isSnapTarget && (
                <animate
                  attributeName="r"
                  values="10;12;10"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              )}
            </circle>

            {/* Handle glow ring on hover or when connected */}
            {(hoveredHandle === handle.id || connectionCount > 0) && !isDragging && !isSnapTarget && (
              <circle
                cx={handle.x}
                cy={handle.y}
                r={7}
                fill="none"
                stroke={MOD_TYPE_COLORS.unipolar}
                strokeWidth={0.5}
                opacity={hoveredHandle === handle.id ? 0.4 : 0.15}
              />
            )}

            {/* Label next to handle */}
            {!isDragging && !isSnapTarget && (
              <text
                x={handle.x + (handle.isInput ? -12 : 12)}
                y={handle.y + 3}
                fill={connectionCount > 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)'}
                fontSize="6"
                fontFamily="monospace"
                textAnchor={handle.isInput ? 'end' : 'start'}
                className="pointer-events-none select-none"
              >
                {handle.label.slice(0, 12)}
              </text>
            )}

            {/* Mini type indicator dot for connected handles */}
            {connectionCount > 0 && !isDragging && (
              connectedLinks.slice(0, 3).map((link, i) => {
                const dotColor = MOD_TYPE_COLORS[link.type] || DEFAULT_MOD_COLOR;
                const angle = -90 + (i - (Math.min(connectedLinks.length, 3) - 1) / 2) * 20;
                const rad = (angle * Math.PI) / 180;
                const dotR = handle.isInput ? 10 : -10;
                const dotX = handle.x + Math.cos(rad) * dotR;
                const dotY = handle.y + Math.sin(rad) * dotR;
                return (
                  <circle
                    key={link.id}
                    cx={dotX}
                    cy={dotY}
                    r={1.5}
                    fill={dotColor}
                    opacity={0.6}
                  />
                );
              })
            )}
          </g>
        );
      })}
    </svg>
  );
}
