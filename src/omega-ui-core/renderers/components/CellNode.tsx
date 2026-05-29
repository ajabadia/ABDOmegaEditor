'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest, CellTemplate } from '../../types/manifest';
import { CellRenderer } from '../CellRenderer';
import { useUCADrag } from '../hooks/useUCADrag';
import { UCADebugHUD } from './UCADebugHUD';
import { CADOverlay } from './CADOverlay';
import { GovernedOverlay } from './GovernedOverlay';
import { UniversalRenderer } from '../UniversalRenderer';
import type { UCADebugContext } from '../ucaTypes';
import { useDesignTokens } from '../../hooks/useDesignTokens';
import { IntegrityOverlay } from '@/features/manifest-editor/components/viewport/IntegrityOverlay';

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

  const cellHTML = CellRenderer.renderCellHTML(node, {
    skin: manifest.ui?.skin || 'industrial',
    zoom: 1.0,
    runtimeValue: 0, 
    steps: 100,
    manifest,
    resolveAsset
  });

  const { cssVars } = useDesignTokens(manifest);

  const isSelected = debugContext?.selectedId === node.id;

  return (
    <motion.div 
      id={`uca-${node.id}`}
      className="uca-node uca-cell group"
      onClick={handleDebugClick}
      drag={debugContext?.enabled || false}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        left: `${node.layout?.pos?.x || 0}px`,
        top: `${node.layout?.pos?.y || 0}px`,
        width: node.layout?.size?.width ? `${node.layout.size.width}px` : '48px', 
        height: node.layout?.size?.height ? `${node.layout.size.height}px` : '48px',
        zIndex: isSelected ? 100 : (node.layout?.zIndex || 0),
        ...cssVars,
        pointerEvents: debugContext?.enabled ? 'auto' : 'none',
        outline: isSelected ? '2px solid #00f2ff' : 'none',
        outlineOffset: '2px',
        boxShadow: isSelected ? '0 0 15px rgba(0, 242, 255, 0.4)' : 'none'
      }}
    >
      <UCADebugHUD 
        node={node} 
        debugContext={debugContext || { enabled: false, showLabels: false, onSelect: () => {}, selectedId: null, hideDecorative: false }} 
        worldPos={worldPos}
        audit={audit}
      />

      <IntegrityOverlay node={node} audit={audit} />

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

      <div 
        className="absolute inset-0 pointer-events-none"
        dangerouslySetInnerHTML={{ __html: cellHTML }}
      />
      
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
