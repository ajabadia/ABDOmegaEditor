'use client';

/**
 * @purpose Rendiza tamaños de manijas para nodos en el editor de manifesto OMEGA, permitiendo a los usuarios ajustar interactivamente los tamaños de los nodos.
 * @purpose_en Renders resize handles for nodes in the OMEGA manifest editor, allowing users to interactively adjust node sizes.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:gterys
 * @lastUpdated 2026-06-18T07:56:19.708Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest } from '../../types/manifest';
import type { UCADebugContext } from '../ucaTypes';
import { useUCAResize } from '../hooks/useUCAResize';

interface ResizeHandlesProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  debugContext?: UCADebugContext | undefined;
}

export function ResizeHandles({ node, manifest, debugContext }: ResizeHandlesProps) {
  const {
    resizeOffset,
    isResizing,
    isShiftActive,
    handleResizeStart,
    handleResizePan,
    handleResizeEnd
  } = useUCAResize({ node, manifest, debugContext });

  if (debugContext?.isLiveMode) return null;

  // Double-click reset size mapping
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Start transaction for resetting
    if (debugContext?.startTransaction) {
      debugContext.startTransaction('Reset Size');
    }

    let defaultW = 48;
    let defaultH = 48;
    const kind = node.cellRef || node.kind || 'knob';
    
    // Primitives default sizing
    if (kind === 'knob') {
      defaultW = 36;
      defaultH = 36;
    } else if (kind === 'slider-v') {
      defaultW = 20;
      defaultH = 64;
    } else if (kind === 'slider-h') {
      defaultW = 64;
      defaultH = 20;
    } else if (kind === 'button') {
      defaultW = 24;
      defaultH = 24;
    } else if (kind === 'switch') {
      defaultW = 24;
      defaultH = 40;
    } else if (kind === 'led') {
      defaultW = 14;
      defaultH = 14;
    } else if (kind === 'display') {
      defaultW = 80;
      defaultH = 40;
    } else if (kind === 'label') {
      defaultW = 60;
      defaultH = 16;
    } else if (node.kind === 'group' || node.kind === 'container' || node.kind === 'face') {
      // For structural nodes, restore to standard 200x120 or calculate bounding box
      defaultW = 200;
      defaultH = 120;
    }

    // Reset size update
    debugContext?.onUpdateNode?.(node.id, {
      layout: {
        pos: node.layout?.pos ?? { x: 0, y: 0 },
        size: { width: defaultW, height: defaultH }
      }
    });

    if (debugContext?.commitTransaction) {
      debugContext.commitTransaction();
    }
  };

  const currentW = Math.round(resizeOffset?.width ?? node.layout?.size?.width ?? (node.kind === 'cell' || node.kind === 'port' ? 48 : 100));
  const currentH = Math.round(resizeOffset?.height ?? node.layout?.size?.height ?? (node.kind === 'cell' || node.kind === 'port' ? 48 : 100));

  const gridConfig = manifest.ui?.layout?.grid;
  const spacingX = gridConfig?.spacingX ?? 24;
  const hpValue = (currentW / spacingX).toFixed(1);

  // Tech-Noir aesthetics for handles
  const handleStyle = {
    width: '6px',
    height: '6px',
    backgroundColor: '#0e0e0f',
    border: '1px solid #00f0ff',
    position: 'absolute' as const,
    zIndex: 200,
    boxShadow: '0 0 4px rgba(0, 240, 255, 0.4)',
    transition: 'transform 0.15s, border-color 0.15s',
  };

  return (
    <>
      {/* Real-time HUD showing dimensions */}
      {isResizing && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 -top-7 px-1.5 py-0.5 rounded-[2px] bg-[#0e0e0f]/95 border border-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.25)] flex items-center gap-1.5 z-[210] pointer-events-none"
          style={{ WebkitFontSmoothing: 'none' }}
        >
          <span className="text-[7px] text-[#00f0ff] font-mono font-bold tracking-wider">
            {currentW} × {currentH} px
          </span>
          <span className="text-[6px] text-white/50 font-mono">
            {hpValue} HP
          </span>
          {isShiftActive && (
            <span 
              className="text-[7px] text-[#00f0ff] font-bold animate-pulse"
              title="Proportional scaling locked"
            >
              [🔒]
            </span>
          )}
        </div>
      )}

      {/* NW Corner Handle */}
      <motion.div
        aria-label="NW resize handle - drag to scale from top-left"
        role="slider"
        aria-valuenow={currentW}
        tabIndex={0}
        style={{ ...handleStyle, left: '-4px', top: '-4px', cursor: 'nwse-resize' }}
        whileHover={{ scale: 1.3, borderColor: '#ffffff' }}
        onPanStart={handleResizeStart}
        onPan={(e, info) => handleResizePan('nw', e, info)}
        onPanEnd={handleResizeEnd}
        onDoubleClick={handleDoubleClick}
      />

      {/* NE Corner Handle */}
      <motion.div
        aria-label="NE resize handle - drag to scale from top-right"
        role="slider"
        aria-valuenow={currentW}
        tabIndex={0}
        style={{ ...handleStyle, right: '-4px', top: '-4px', cursor: 'nesw-resize' }}
        whileHover={{ scale: 1.3, borderColor: '#ffffff' }}
        onPanStart={handleResizeStart}
        onPan={(e, info) => handleResizePan('ne', e, info)}
        onPanEnd={handleResizeEnd}
        onDoubleClick={handleDoubleClick}
      />

      {/* SW Corner Handle */}
      <motion.div
        aria-label="SW resize handle - drag to scale from bottom-left"
        role="slider"
        aria-valuenow={currentW}
        tabIndex={0}
        style={{ ...handleStyle, left: '-4px', bottom: '-4px', cursor: 'nesw-resize' }}
        whileHover={{ scale: 1.3, borderColor: '#ffffff' }}
        onPanStart={handleResizeStart}
        onPan={(e, info) => handleResizePan('sw', e, info)}
        onPanEnd={handleResizeEnd}
        onDoubleClick={handleDoubleClick}
      />

      {/* SE Corner Handle */}
      <motion.div
        aria-label="SE resize handle - drag to scale from bottom-right"
        role="slider"
        aria-valuenow={currentW}
        tabIndex={0}
        style={{ ...handleStyle, right: '-4px', bottom: '-4px', cursor: 'nwse-resize' }}
        whileHover={{ scale: 1.3, borderColor: '#ffffff' }}
        onPanStart={handleResizeStart}
        onPan={(e, info) => handleResizePan('se', e, info)}
        onPanEnd={handleResizeEnd}
        onDoubleClick={handleDoubleClick}
      />
    </>
  );
}
