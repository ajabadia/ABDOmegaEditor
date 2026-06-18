/**
 * @purpose Gestiona y calcula actualizaciones de escala para nodos en un manifesto OMEGA, incluyendo sus hijos.
 * @purpose_en Manages and computes scale updates for nodes in an OMEGA manifest, including their children.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:2,imports:2,sig:kvn5za
 * @lastUpdated 2026-06-18T07:56:28.726Z
 */

import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { findNodeInTree } from '@/omega-ui-core/uca/treeUtils';

export function getOriginalNodeSize(node: OmegaNode): { width: number; height: number } {
  const w = node.layout?.size?.width ?? (node.kind === 'cell' || node.kind === 'port' ? 48 : 100);
  const h = node.layout?.size?.height ?? (node.kind === 'cell' || node.kind === 'port' ? 48 : 100);
  return { width: w, height: h };
}

export function computeScaleUpdates(
  nodeId: string,
  newW: number,
  newH: number,
  newX: number,
  newY: number,
  manifest: OMEGA_Manifest
): Record<string, Partial<OmegaNode>> {
  const root = manifest.ui?.tree;
  if (!root) return {};
  
  const targetNode = findNodeInTree(root, nodeId);
  if (!targetNode) return {};
  
  const updates: Record<string, Partial<OmegaNode>> = {};
  
  const origSize = getOriginalNodeSize(targetNode);
  const scaleX = origSize.width > 0 ? newW / origSize.width : 1;
  const scaleY = origSize.height > 0 ? newH / origSize.height : 1;
  
  updates[nodeId] = {
    layout: {
      pos: { x: newX, y: newY },
      size: { width: newW, height: newH }
    }
  };
  
  // Recursively scale children
  function scaleSubtree(n: OmegaNode, sX: number, sY: number) {
    if (!n.children || n.children.length === 0) return;
    for (const child of n.children) {
      const childOrigW = child.layout?.size?.width ?? (child.kind === 'cell' || child.kind === 'port' ? 48 : 100);
      const childOrigH = child.layout?.size?.height ?? (child.kind === 'cell' || child.kind === 'port' ? 48 : 100);
      
      const childOrigX = child.layout?.pos?.x ?? 0;
      const childOrigY = child.layout?.pos?.y ?? 0;
      
      const childNewX = Math.round(childOrigX * sX);
      const childNewY = Math.round(childOrigY * sY);
      const childNewW = Math.round(childOrigW * sX);
      const childNewH = Math.round(childOrigH * sY);
      
      const childUpdates: Partial<OmegaNode> = {
        layout: {
          pos: { x: childNewX, y: childNewY },
          size: { width: Math.max(16, childNewW), height: Math.max(16, childNewH) }
        }
      };
      
      // If it's a label or cell with font size style, scale it
      if (child.style?.fontSize) {
        const origFs = parseInt(String(child.style.fontSize)) || 10;
        const avgScale = (sX + sY) / 2;
        const newFs = Math.round(origFs * avgScale);
        childUpdates.style = {
          ...child.style,
          fontSize: Math.max(6, newFs)
        };
      }
      
      updates[child.id] = childUpdates;
      scaleSubtree(child, sX, sY);
    }
  }
  
  scaleSubtree(targetNode, scaleX, scaleY);
  return updates;
}
