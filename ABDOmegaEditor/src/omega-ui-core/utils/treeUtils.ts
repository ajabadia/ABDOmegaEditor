/**
 * @purpose Gestiona operaciones sobre una estructura de árbol OmegaNode, incluyendo encontrar nodos y padres, mover hijos y recuperar todos los IDs de nodos.
 * @purpose_en Manages operations on an OmegaNode tree structure, including finding nodes and parents, moving children, and retrieving all node IDs.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:4,imports:1,sig:vy2efp
 * @lastUpdated 2026-06-15T16:56:11.376Z
 */

import type { OmegaNode } from '../types/manifest';

export function findNodeInTree(root: OmegaNode, id: string): OmegaNode | undefined {
  if (root.id === id) return root;

  if (root.children) {
    for (const child of root.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }

  return undefined;
}

export function findParentInTree(root: OmegaNode, targetId: string): OmegaNode | undefined {
  if (!root.children) return undefined;

  if (root.children.some(c => c.id === targetId)) return root;

  for (const child of root.children) {
    const found = findParentInTree(child, targetId);
    if (found) return found;
  }
  return undefined;
}

export function moveChildInTree(root: OmegaNode, parentId: string, nodeId: string, targetIndex: number): OmegaNode {
  if (root.id === parentId) {
    const children = [...(root.children || [])];
    const currentIndex = children.findIndex(c => c.id === nodeId);
    if (currentIndex === -1) return root;

    const [item] = children.splice(currentIndex, 1);
    if (item) {
      children.splice(targetIndex, 0, item);
    }

    return { ...root, children };
  }

  if (root.children) {
    return {
      ...root,
      children: root.children.map(c => moveChildInTree(c, parentId, nodeId, targetIndex))
    };
  }

  return root;
}

export function getAllIdsInTree(root: OmegaNode): string[] {
  const ids = [root.id];
  if (root.children) {
    root.children.forEach(c => ids.push(...getAllIdsInTree(c)));
  }
  return ids;
}
