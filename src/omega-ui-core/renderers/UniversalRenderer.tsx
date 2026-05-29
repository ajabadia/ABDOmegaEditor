import React from 'react';
import { resolveNodeSemantics } from '../uca/ucaSemantics';
import { resolveLayout } from '../uca/layoutResolver';
import { StructuralNode } from './components/StructuralNode';
import { CellNode } from './components/CellNode';
import { UCADebugHUD } from './components/UCADebugHUD';
import type { UniversalRendererProps } from './ucaTypes';

/**
 * UNIVERSAL RENDERER (Phase 1 Experimental - Refactored)
 * Recursive orchestrator for UCA hierarchies.
 */
export function UniversalRenderer({ 
  node: rawNode, 
  manifest, 
  depth = 0,
  catalog = {},
  resolveAsset,
  debugContext,
  parentWorldPos = { x: 0, y: 0 },
  parentNode = null,
  audit
}: UniversalRendererProps) {
  
  // 1. Resolve semantics & Layout (Phase 4.4.1)
  const semanticNode = resolveNodeSemantics(rawNode, { catalog });
  const node = resolveLayout(semanticNode);

  const isLayoutGoverned = !!(parentNode?.layout?.mode && parentNode.layout.mode !== 'absolute');
  const worldX = (parentWorldPos?.x || 0) + (node.layout?.pos?.x || 0);
  const worldY = (parentWorldPos?.y || 0) + (node.layout?.pos?.y || 0);
  const worldPos = { x: worldX, y: worldY };

  if (node.visible === false) return null;
  if (debugContext?.enabled && debugContext.hideDecorative && node.role === 'decor') return null;

  const handleDebugClick = (e: React.MouseEvent) => {
    if (debugContext?.enabled) {
      e.stopPropagation();
      if ((e.ctrlKey || e.shiftKey) && debugContext.onSelectMultiple && debugContext.multiSelectedIds) {
        const alreadySelected = debugContext.multiSelectedIds.includes(node.id);
        if (alreadySelected) {
          debugContext.onSelectMultiple(debugContext.multiSelectedIds.filter(id => id !== node.id));
        } else {
          debugContext.onSelectMultiple([...debugContext.multiSelectedIds, node.id]);
        }
      } else {
        debugContext.onSelect(node.id);
      }
    }
  };

  // 2. Dispatchers
  
  // A. Structural Nodes (Rack, Face, Container, Group)
  if (node.kind === 'rack' || node.kind === 'face' || node.kind === 'container' || node.kind === 'group') {
    return (
      <StructuralNode 
        node={node}
        manifest={manifest}
        depth={depth}
        catalog={catalog}
        resolveAsset={resolveAsset || undefined}
        debugContext={debugContext || undefined}
        worldPos={worldPos}
        isLayoutGoverned={isLayoutGoverned}
        handleDebugClick={handleDebugClick}
      />
    );
  }

  // B. Atomic Cells
  if (node.kind === 'cell') {
    return (
      <CellNode 
        node={node}
        manifest={manifest}
        depth={depth}
        catalog={catalog}
        resolveAsset={resolveAsset || undefined}
        debugContext={debugContext || undefined}
        worldPos={worldPos}
        isLayoutGoverned={isLayoutGoverned}
        handleDebugClick={handleDebugClick}
      />
    );
  }

  // C. Layers & Assets (Simple rendering)
  if (node.kind === 'layer' || node.kind === 'asset-layer') {
    const isSelected = debugContext?.selectedId === node.id;
    return (
      <div 
        className={`uca-node uca-${node.kind}`}
        onClick={handleDebugClick}
        style={{
          position: 'absolute',
          left: `${node.layout?.pos?.x || 0}px`,
          top: `${node.layout?.pos?.y || 0}px`,
          color: node.style?.color,
          fontSize: node.style?.fontSize,
          opacity: node.style?.opacity,
          pointerEvents: debugContext?.enabled ? 'auto' : 'none',
          outline: isSelected ? '1px solid white' : 'none'
        }}
      >
        <UCADebugHUD 
          node={node} 
          debugContext={debugContext || { enabled: false, showLabels: false, onSelect: () => {}, selectedId: null, hideDecorative: false }} 
          worldPos={worldPos}
          audit={audit}
        />
        {node.role === 'label' && <span>{node.id}</span>}
      </div>
    );
  }

  return null;
}
