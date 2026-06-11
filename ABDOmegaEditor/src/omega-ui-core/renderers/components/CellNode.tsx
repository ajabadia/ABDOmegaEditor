'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest, CellTemplate } from '../../types/manifest';
import type { ComponentNode, ComponentType } from '../../types/rack';
import { renderComponentNode } from '../primitives';
import { useUCADrag } from '../hooks/useUCADrag';
import { UCADebugHUD } from './UCADebugHUD';
import { CADOverlay } from './CADOverlay';
import { GovernedOverlay } from './GovernedOverlay';
import { UniversalRenderer } from '../UniversalRenderer';
import type { UCADebugContext } from '../ucaTypes';
import { useDesignTokens } from '../../hooks/useDesignTokens';
import { IntegrityOverlay } from '@/features/manifest-editor/components/viewport/IntegrityOverlay';
import { ReorderIndicator } from './ReorderIndicator';

const COMP_TYPE_MAP: Record<string, ComponentType> = {
  'knob': 'knob', 'slider-v': 'slider', 'slider-h': 'slider',
  'slider': 'slider', 'switch': 'switch', 'button': 'button',
  'port': 'port', 'led': 'led', 'display': 'display', 'label': 'label'
};

function omegaNodeToComponentNode(node: OmegaNode): ComponentNode {
  const compType = node.cellRef || node.kind || 'knob';
  const type = COMP_TYPE_MAP[compType] || 'knob';
  return {
    id: node.id,
    type,
    label: (node.meta?.label as string) || node.id || '',
    pos: { x: node.layout?.pos?.x || 0, y: node.layout?.pos?.y || 0 },
    size: node.layout?.size ? { width: node.layout.size.width || 48, height: node.layout.size.height || 48 } : { width: 48, height: 48 },
    style: (node.style || {}) as ComponentNode['style'],
    bind: node.bind ? { target: node.bind } : undefined,
    visible: node.visible,
    locked: node.locked,
  };
}

interface CellNodeProps {
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

export function CellNode({
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
}: CellNodeProps) {
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

  const runtimeValue = debugContext?.runtimeValues?.[node.id] ?? 0;

  const componentNode = omegaNodeToComponentNode(node);
  const renderedComponent = renderComponentNode(componentNode, {
    value: runtimeValue,
    assetUrl: resolveAsset ? resolveAsset(node.style?.asset) : node.style?.asset,
  });

  // LIVE mode knob rotation: transparent overlay with vertical drag → 0-1 value
  const isKnob = (node.cellRef || node.kind) === 'knob';
  const knobDragRef = React.useRef<HTMLDivElement>(null);
  const knobStartY = React.useRef<number>(0);
  const knobStartValue = React.useRef<number>(0);

  const handleKnobDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    knobStartY.current = e.clientY;
    knobStartValue.current = runtimeValue;
    knobDragRef.current?.setPointerCapture(e.pointerId);
  };

  const handleKnobDragMove = (e: React.PointerEvent) => {
    if (debugContext?.isLiveMode && isKnob && debugContext?.onUpdateRuntimeValue) {
      const dy = knobStartY.current - e.clientY;
      const newValue = Math.max(0, Math.min(1, knobStartValue.current + dy / 150));
      debugContext.onUpdateRuntimeValue(node.id, newValue);
    }
  };

  const handleKnobDragEnd = (e: React.PointerEvent) => {
    knobDragRef.current?.releasePointerCapture(e.pointerId);
  };

  const { cssVars } = useDesignTokens(manifest);

  const isSelected = debugContext?.selectedId === node.id;
  const isMultiSelected = !isSelected && (debugContext?.multiSelectedIds?.includes(node.id) ?? false);

  // Only block child drag for 'absolute' containers (where the parent itself is draggable as a unit).
  // Governed containers (stack-v, stack-h) allow child reorder via drag — the pan handler's
  // isLayoutGoverned path handles this internally via calculateTargetIndex.
  const parentIsDraggableContainer = !!(
    parentNode &&
    parentNode.id !== 'root' &&
    parentNode.kind !== 'rack' &&
    (parentNode.kind === 'container' || parentNode.kind === 'face') &&
    !(debugContext?.lockedNodeIds?.includes(parentNode.id)) &&
    (parentNode.layout?.mode === 'absolute' || !parentNode.layout?.mode)
  );

  // pan-based drag (no momentum → element lands exactly where pointer releases)
  const isDraggable = !debugContext?.isLiveMode && node.kind !== 'rack' && !debugContext?.lockedNodeIds?.includes(node.id) && !parentIsDraggableContainer;
  const panHandlers = isDraggable ? {
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
      className="uca-node uca-cell group"
      onClick={handleDebugClick}
      onTap={(e) => handleDebugClick(e as unknown as React.MouseEvent)}
      {...panHandlers}
      style={{
        position: 'absolute',
        left: `${(node.layout?.pos?.x || 0) + offsetToApply.x}px`,
        top: `${(node.layout?.pos?.y || 0) + offsetToApply.y}px`,
        width: node.layout?.size?.width ? `${node.layout.size.width}px` : '48px', 
        height: node.layout?.size?.height ? `${node.layout.size.height}px` : '48px',
        zIndex: isSelected ? 100 : (node.layout?.zIndex || 0),
        ...cssVars,
        pointerEvents: debugContext?.isLiveMode ? 'none' : 'auto',
        outline: (!debugContext?.isLiveMode && isSelected) ? '2px solid #00f2ff' : (!debugContext?.isLiveMode && isMultiSelected) ? '1.5px dashed #a855f7' : 'none',
        outlineOffset: '2px',
        boxShadow: (!debugContext?.isLiveMode && isSelected) ? '0 0 15px rgba(0, 242, 255, 0.4)' : (!debugContext?.isLiveMode && isMultiSelected) ? '0 0 10px rgba(168, 85, 247, 0.3)' : 'none'
      }}
    >
      {!debugContext?.isLiveMode && (
        <UCADebugHUD 
          node={node} 
          debugContext={debugContext || { enabled: false, showLabels: false, onSelect: () => {}, selectedId: null, hideDecorative: false }} 
          worldPos={worldPos}
          audit={audit}
        />
      )}

      {!debugContext?.isLiveMode && <IntegrityOverlay node={node} audit={audit} />}

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

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {renderedComponent}
      </div>

      {/* LIVE mode KnobDragOverlay — vertical drag controls 0–1 value */}
      {debugContext?.isLiveMode && isKnob && debugContext?.onUpdateRuntimeValue && (
        <div
          ref={knobDragRef}
          className="absolute inset-0 cursor-ns-resize pointer-events-auto"
          onPointerDown={handleKnobDragStart}
          onPointerMove={handleKnobDragMove}
          onPointerUp={handleKnobDragEnd}
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
