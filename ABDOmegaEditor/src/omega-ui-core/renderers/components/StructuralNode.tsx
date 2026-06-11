'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest, CellTemplate } from '../../types/manifest';
import { useUCADrag } from '../hooks/useUCADrag';
import { UCADebugHUD } from './UCADebugHUD';
import { CADOverlay } from './CADOverlay';
import { GovernedOverlay } from './GovernedOverlay';
import { UniversalRenderer } from '../UniversalRenderer';
import type { UCADebugContext } from '../ucaTypes';
import { useDesignTokens } from '../../hooks/useDesignTokens';
import { ReorderIndicator } from './ReorderIndicator';

interface StructuralNodeProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  depth: number;
  catalog: Record<string, CellTemplate>;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  debugContext?: UCADebugContext | undefined;
  worldPos: { x: number, y: number };
  isLayoutGoverned: boolean;
  parentNode?: OmegaNode | null | undefined;
  handleDebugClick: (e: React.MouseEvent) => void;
  audit?: import('@/services/auditService').AuditResult | undefined;
}

export function StructuralNode({
  node,
  manifest,
  depth,
  catalog,
  resolveAsset,
  debugContext,
  worldPos,
  isLayoutGoverned,
  parentNode,
  handleDebugClick,
  audit
}: StructuralNodeProps) {
  const labelRef = React.useRef<HTMLSpanElement>(null);
  const localLabelRef = React.useRef<HTMLSpanElement>(null);

  const { dragOffset, targetIndex, handlePanStart, handlePan, handlePanEnd } = useUCADrag({
    node,
    manifest,
    debugContext,
    worldPos,
    labelRef,
    localLabelRef,
    isLayoutGoverned,
    parentNode
  });

  const isSelected = debugContext?.selectedId === node.id;
  const isMultiSelected = !isSelected && (debugContext?.multiSelectedIds?.includes(node.id) ?? false);
  const { cssVars } = useDesignTokens(manifest);

  // Only block child drag for 'absolute' containers (where the parent itself is draggable as a unit).
  // Governed containers (stack-v, stack-h) allow child reorder via drag.
  const parentIsDraggableContainer = !!(
    parentNode &&
    parentNode.id !== 'root' &&
    parentNode.kind !== 'rack' &&
    (parentNode.kind === 'container' || parentNode.kind === 'face') &&
    !(debugContext?.lockedNodeIds?.includes(parentNode.id)) &&
    (parentNode.layout?.mode === 'absolute' || !parentNode.layout?.mode)
  );

  const isLeafContainer = !node.children || node.children.length === 0;
  const isDraggable = !debugContext?.isLiveMode && node.kind !== 'rack' && !debugContext?.lockedNodeIds?.includes(node.id) && !parentIsDraggableContainer;

  const handleClick = (e: React.MouseEvent) => {
    // Skip selection when tap originates from a child interactive node
    const target = e.target as HTMLElement;
    if (target.closest('.uca-cell')) {
      return;
    }
    handleDebugClick(e);
  };

  // pan-based drag (no momentum → element lands exactly where pointer releases)
  const panHandlers = (isDraggable && isLeafContainer) ? {
    onPanStart: handlePanStart,
    onPan: handlePan,
    onPanEnd: handlePanEnd,
  } : {};

  const isSelectedElsewhere = debugContext?.activeDragOffset && 
    debugContext.activeDragOffset.draggedNodeId !== node.id && 
    (isSelected || isMultiSelected);

  const offsetToApply = isSelectedElsewhere
    ? debugContext!.activeDragOffset!
    : (dragOffset || { x: 0, y: 0 });

  return (
    <motion.div
      id={`uca-${node.id}`}
      className={`uca-node uca-${node.kind} group`}
      onClick={handleClick}
      onTap={(e) => handleClick(e as unknown as React.MouseEvent)}
      {...panHandlers}
      style={{
        position: 'absolute',
        left: `${(node.layout?.pos?.x || 0) + offsetToApply.x}px`,
        top: `${(node.layout?.pos?.y || 0) + offsetToApply.y}px`,
        width: node.layout?.size?.width ? `${node.layout.size.width}px` : 'auto',
        height: node.layout?.size?.height ? `${node.layout.size.height}px` : 'auto',
        zIndex: isSelected ? 101 : (node.layout?.zIndex || 0),
        ...cssVars,
        // Semantic overrides for structural types
        backgroundColor: node.kind === 'rack' 
          ? 'var(--omega-color-surface)' 
          : (node.kind === 'face' 
              ? 'var(--omega-color-background)' 
              : (!debugContext?.isLiveMode ? 'rgba(16, 185, 129, 0.05)' : 'transparent')),
        border: !debugContext?.isLiveMode 
          ? `1px dashed ${node.kind === 'rack' ? '#9333ea' : node.kind === 'face' ? '#3b82f6' : '#10b981'}` 
          : `${node.style?.borderWidth || 0}px solid rgba(255,255,255,0.05)`,
        backdropFilter: node.kind === 'face' ? 'var(--omega-blur-global)' : 'none',
        padding: '2px',
        boxSizing: 'border-box',
        pointerEvents: (node.kind !== 'rack' && !debugContext?.isLiveMode) ? 'auto' : 'none',
        outline: (!debugContext?.isLiveMode && isSelected) ? '2px solid #00f2ff' : (!debugContext?.isLiveMode && isMultiSelected) ? '1.5px dashed #a855f7' : 'none',
        outlineOffset: '4px',
        boxShadow: (!debugContext?.isLiveMode && isSelected) ? '0 0 20px rgba(0, 242, 255, 0.5)' : (!debugContext?.isLiveMode && isMultiSelected) ? '0 0 12px rgba(168, 85, 247, 0.3)' : 'none'
      }}
    >
      {!debugContext?.isLiveMode && (
        <UCADebugHUD 
          node={node} 
          debugContext={debugContext || { enabled: false, showLabels: false, onSelect: () => {}, selectedId: null, hideDecorative: false }} 
          worldPos={worldPos}
          labelRef={labelRef}
          localLabelRef={localLabelRef}
        />
      )}
      
      {!debugContext?.isLiveMode && <GovernedOverlay enabled={!!isLayoutGoverned} />}

      {/* Visual reorder indicator — shows insertion point during drag in governed layouts */}
      {isLayoutGoverned && targetIndex !== null && parentNode?.layout?.mode && (
        <ReorderIndicator 
          targetIndex={targetIndex}
          mode={parentNode.layout.mode as 'stack-v' | 'stack-h'}
        />
      )}

      {(dragOffset || debugContext?.showCADOverlay) && debugContext?.enabled && !debugContext?.isLiveMode && (
         <CADOverlay 
           node={node} 
           manifest={manifest} 
           dragOffset={dragOffset} 
           parent={parentNode || undefined} 
           targetIndex={targetIndex}
         />
      )}

      {node.children?.map((child, index) => (
        <UniversalRenderer 
          key={`${child.id}-${index}`}
          node={child}
          manifest={manifest}
          depth={depth + 1} 
          debugContext={debugContext}
          catalog={catalog}
          resolveAsset={resolveAsset}
          parentWorldPos={worldPos}
          parentNode={node}
          audit={audit}
        />
      ))}
    </motion.div>
  );
}
