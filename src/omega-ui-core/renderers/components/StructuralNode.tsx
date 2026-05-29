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

  const { dragOffset, targetIndex, handleDrag, handleDragEnd } = useUCADrag({
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
  const { cssVars } = useDesignTokens(manifest);

  return (
    <motion.div 
      id={`uca-${node.id}`}
      className={`uca-node uca-${node.kind} group`}
      onClick={handleDebugClick}
      drag={(debugContext?.enabled && node.kind !== 'rack') || false}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        left: `${node.layout?.pos?.x || 0}px`,
        top: `${node.layout?.pos?.y || 0}px`,
        width: node.layout?.size?.width ? `${node.layout.size.width}px` : 'auto',
        height: node.layout?.size?.height ? `${node.layout.size.height}px` : 'auto',
        zIndex: isSelected ? 101 : (node.layout?.zIndex || 0),
        ...cssVars,
        // Semantic overrides for structural types
        backgroundColor: node.kind === 'rack' ? 'var(--omega-color-surface)' : (node.kind === 'face' ? 'var(--omega-color-background)' : 'transparent'),
        border: debugContext?.enabled 
          ? `1px dashed ${node.kind === 'rack' ? '#9333ea' : node.kind === 'face' ? '#3b82f6' : '#10b981'}` 
          : `${node.style?.borderWidth || 0}px solid rgba(255,255,255,0.05)`,
        backdropFilter: node.kind === 'face' ? 'var(--omega-blur-global)' : 'none',
        padding: '2px',
        boxSizing: 'border-box',
        outline: isSelected ? '2px solid #00f2ff' : 'none',
        outlineOffset: '4px',
        boxShadow: isSelected ? '0 0 20px rgba(0, 242, 255, 0.5)' : 'none'
      }}
    >
      <UCADebugHUD 
        node={node} 
        debugContext={debugContext || { enabled: false, showLabels: false, onSelect: () => {}, selectedId: null, hideDecorative: false }} 
        worldPos={worldPos}
        labelRef={labelRef}
        localLabelRef={localLabelRef}
      />
      
      <GovernedOverlay enabled={!!isLayoutGoverned} />

      {(dragOffset || debugContext?.showCADOverlay) && debugContext?.enabled && (
         <CADOverlay 
           node={node} 
           manifest={manifest} 
           dragOffset={dragOffset} 
           parent={parentNode || undefined} 
           targetIndex={targetIndex}
         />
      )}

      {node.children?.map(child => (
        <UniversalRenderer 
          key={child.id} 
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
