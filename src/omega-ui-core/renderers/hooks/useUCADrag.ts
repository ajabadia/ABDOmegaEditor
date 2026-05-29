'use client';

import React from 'react';
import type { PanInfo } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest, Position, GridConfig } from '../../types/manifest';
import type { UCADebugContext } from '../ucaTypes';
import { clampChildToParent, getParentRect, getNodeSize, snapToGrid } from '../../uca/spatialConstraints';

import { calculateTargetIndex, findParentInTree } from '../../uca/treeUtils';

interface UseUCADragProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  debugContext?: UCADebugContext | undefined;
  worldPos: Position;
  labelRef: React.RefObject<HTMLSpanElement | null>;
  localLabelRef: React.RefObject<HTMLSpanElement | null>;
  isLayoutGoverned?: boolean | undefined;
  parentNode?: OmegaNode | null | undefined;
}

export function useUCADrag({
  node,
  manifest,
  debugContext,
  worldPos,
  labelRef,
  localLabelRef,
  isLayoutGoverned,
  parentNode
}: UseUCADragProps) {
  const [dragOffset, setDragOffset] = React.useState<{ x: number, y: number } | null>(null);
  const [targetIndex, setTargetIndex] = React.useState<number | null>(null);

  const updateHUD = (offset: { x: number, y: number }) => {
    if (labelRef.current) {
      const wx = Math.round(worldPos.x + offset.x);
      const wy = Math.round(worldPos.y + offset.y);
      labelRef.current.innerText = `W: ${wx}, ${wy}`;
    }
    if (localLabelRef.current) {
      const lx = Math.round((node.layout?.pos?.x || 0) + offset.x);
      const ly = Math.round((node.layout?.pos?.y || 0) + offset.y);
      localLabelRef.current.innerText = `L: ${lx}, ${ly}`;
    }
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    updateHUD(info.offset);
    setDragOffset(info.offset);

    // Reorder Logic (Phase 4.4.3)
    if (isLayoutGoverned && parentNode?.layout?.mode && parentNode.children) {
      const mode = parentNode.layout.mode as 'stack-v' | 'stack-h';
      const pointerPos = {
        x: (node.layout?.pos?.x || 0) + info.offset.x,
        y: (node.layout?.pos?.y || 0) + info.offset.y
      };

      const newIndex = calculateTargetIndex(node.id, pointerPos, parentNode.children, mode);
      setTargetIndex(newIndex);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const wasGoverned = isLayoutGoverned;
    const finalTargetIndex = targetIndex;
    
    setDragOffset(null);
    setTargetIndex(null);

    if (wasGoverned) {
      if (finalTargetIndex !== null && parentNode && debugContext?.onUpdateNode) {
        const currentIndex = parentNode.children?.findIndex((c: OmegaNode) => c.id === node.id);
        if (currentIndex !== undefined && currentIndex !== -1 && currentIndex !== finalTargetIndex) {
          // Reorder persistence (Phase 4.4.3)
          debugContext.onUpdateNode(parentNode.id, {
            _reorder: { nodeId: node.id, targetIndex: finalTargetIndex }
          } as Record<string, unknown> as Partial<OmegaNode>);
        }
      }
      return;
    }

    if (debugContext?.onUpdateNode) {
      const rawX = (node.layout?.pos?.x || 0) + info.offset.x;
      const rawY = (node.layout?.pos?.y || 0) + info.offset.y;
      
      const gridConfig = manifest.ui.layout?.grid as GridConfig | undefined;
      const snappedPos = gridConfig?.enabled ? snapToGrid({ x: rawX, y: rawY }, gridConfig) : { x: rawX, y: rawY };

      let finalX = Math.round(snappedPos.x);
      let finalY = Math.round(snappedPos.y);

      const tree = manifest.ui?.tree;
      if (node.constraints?.clampToParent && tree) {
        const parent = findParentInTree(tree, node.id);
        if (parent) {
          const parentRect = getParentRect(parent, manifest);
          const size = getNodeSize(node);
          const clamped = clampChildToParent(
            { x: snappedPos.x, y: snappedPos.y, width: size.width, height: size.height },
            parentRect,
            node.constraints.margin || 0
          );
          finalX = clamped.x;
          finalY = clamped.y;
        }
      }

      debugContext.onUpdateNode(node.id, { 
        layout: { ...node.layout, pos: { x: finalX, y: finalY } } 
      });
    }
  };

  return {
    dragOffset,
    targetIndex,
    handleDrag,
    handleDragEnd,
    setDragOffset
  };
}
