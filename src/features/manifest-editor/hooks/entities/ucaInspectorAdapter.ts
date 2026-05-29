import type { OMEGA_Manifest, ManifestEntity, OmegaNode, NodeKind, NodeRole } from '@/omega-ui-core/types/manifest';
import { manifestToTree } from '@/omega-ui-core/uca/ucaBridge';
import { moveChildInTree } from '@/omega-ui-core/uca/treeUtils';

export type SelectionRef = 
  | { source: 'legacy'; id: string }
  | { source: 'uca'; id: string; path?: string[] };

/**
 * mapLegacyTypeToKind
 * Root fix for Era 7.2.3 compliance. Formally maps legacy types to NodeKind.
 */
function mapLegacyTypeToKind(type: string): NodeKind {
  const mapping: Record<string, NodeKind> = {
    'container': 'container',
    'group': 'group',
    'face': 'face',
    'rack': 'rack',
    'port': 'port'
  };
  return mapping[type] || 'cell';
}

/**
 * mapLegacyRoleToRole
 * Resolves legacy roles to the modern NodeRole union.
 */
function mapLegacyRoleToRole(role?: string): NodeRole {
  if (!role) return 'primitive';
  // NodeRole allows string, so we just ensure it's not undefined
  return role as NodeRole;
}

/**
 * findLegacyItem
 * Searches for an item only in legacy arrays.
 */
export function findLegacyItem(manifest: OMEGA_Manifest, id: string): ManifestEntity | undefined {
  return [...(manifest.ui?.controls || []), ...(manifest.ui?.jacks || [])].find((i: ManifestEntity) => i.id === id);
}

/**
 * findNodeInTree
 * Performs a deep DFS search in the UCA tree.
 */
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

/**
 * adaptNodeToManifestEntity
 * Momentary in-flight projection from OmegaNode to ManifestEntity so that
 * PropertyPanel can display the node's properties.
 */
export function adaptNodeToManifestEntity(node: OmegaNode): ManifestEntity {
  const isJack = node.role === 'port' || node.cellRef === 'port';
  return {
    id: node.id,
    type: node.cellRef || 'knob',
    role: node.role || (isJack ? 'port' : 'control'),
    bind: node.bind || 'none',
    label: node.id,
    pos: node.layout?.pos || { x: 0, y: 0 },
    size: node.layout?.size || { width: 48, height: 48 },
  };
}

/**
 * adaptManifestEntityToNode
 * ERA 7.2.3 - Canonical bridge from legacy ManifestEntity to modern OmegaNode.
 * Used for static rendering and compatibility layers.
 */
export function adaptManifestEntityToNode(entity: ManifestEntity): OmegaNode {
  return {
    id: entity.id,
    kind: mapLegacyTypeToKind(entity.type),
    role: mapLegacyRoleToRole(entity.role),
    cellRef: entity.type,
    bind: entity.bind,
    layout: {
      pos: entity.pos,
      size: entity.size
    },
    style: entity.presentation?.style,
    meta: entity.meta
  };
}

/**
 * findEditableItem
 * Orchestrator to find an item either in legacy or UCA.
 * Returns the item and the inferred SelectionRef.
 */
export function findEditableItem(manifest: OMEGA_Manifest, id: string): { item: ManifestEntity, ref: SelectionRef } | undefined {
  // 1. Try legacy first
  const legacyItem = findLegacyItem(manifest, id);
  if (legacyItem) {
    return { item: legacyItem, ref: { source: 'legacy', id } };
  }

  // 2. Try UCA deep search if it exists or use projection as fallback
  const treeToSearch = manifest.ui?.tree || manifestToTree(manifest, manifest.ui?.tree);
  if (treeToSearch) {
    const deepNode = findNodeInTree(treeToSearch, id);
    if (deepNode) {
      return { 
        item: adaptNodeToManifestEntity(deepNode), 
        ref: { source: manifest.ui?.tree ? 'uca' : 'legacy', id } 
      };
    }
  }

  return undefined;
}

interface PatchNode extends Partial<OmegaNode> {
  _reorder?: { nodeId: string; targetIndex: number };
}

/**
 * applyUpdatesToNode
 * Maps updates back to the OmegaNode contract. Supports both legacy ManifestEntity and native OmegaNode patches.
 */
export function applyUpdatesToNode(node: OmegaNode, updates: Partial<ManifestEntity> | Partial<OmegaNode>): OmegaNode {
  const next = { ...node };

  // 1. Direct OmegaNode Update (Native)
  if ('kind' in updates || 'layout' in updates || 'style' in updates || ('_reorder' in (updates as Record<string, unknown>))) {
    const nodePatch = updates as PatchNode;
    
    if (nodePatch._reorder) {
      const { nodeId, targetIndex } = nodePatch._reorder;
      return moveChildInTree(next, next.id, nodeId, targetIndex);
    }

    if (nodePatch.layout) {
      next.layout = { 
        ...next.layout, 
        ...nodePatch.layout,
        pos: nodePatch.layout.pos 
          ? { ...(next.layout?.pos || { x: 0, y: 0 }), ...nodePatch.layout.pos } 
          : (next.layout?.pos || { x: 0, y: 0 }),
        size: nodePatch.layout.size 
          ? { ...(next.layout?.size || { width: 48, height: 48 }), ...nodePatch.layout.size } 
          : (next.layout?.size || { width: 48, height: 48 })
      };
    }
    if (nodePatch.style) next.style = { ...next.style, ...nodePatch.style };
    if (nodePatch.role) next.role = nodePatch.role;
    if (nodePatch.bind) next.bind = nodePatch.bind;
    if (nodePatch.cellRef) next.cellRef = nodePatch.cellRef;
    if (nodePatch.children) next.children = nodePatch.children;
    return next;
  }

  // 2. Legacy ManifestEntity Update (Translation)
  const entityPatch = updates as Partial<ManifestEntity>;
  if (entityPatch.pos) {
    next.layout = { ...next.layout, pos: entityPatch.pos };
  }
  
  if (entityPatch.presentation?.style) {
    next.style = { ...next.style, ...entityPatch.presentation.style };
  }

  if (entityPatch.presentation?.variant) {
    next.cellRef = entityPatch.presentation.variant;
  }
  
  if (entityPatch.bind !== undefined) {
    next.bind = entityPatch.bind;
  }

  if (entityPatch.role) {
    next.role = entityPatch.role;
  }

  return next;
}

/**
 * updateNodeInTree
 * Immutable DFS update of an OmegaNode tree.
 */
export function updateNodeInTree(root: OmegaNode, id: string, updates: Partial<ManifestEntity> | Partial<OmegaNode>): OmegaNode {
  if (root.id === id) {
    return applyUpdatesToNode(root, updates);
  }
  
  if (root.children) {
    let changed = false;
    const nextChildren = root.children.map(child => {
      const updated = updateNodeInTree(child, id, updates);
      if (updated !== child) changed = true;
      return updated;
    });
    if (changed) return { ...root, children: nextChildren };
  }
  
  return root;
}

/**
 * findParentInTree
 * Finds the parent node of a target node ID.
 */
export function findParentInTree(root: OmegaNode, targetId: string): OmegaNode | undefined {
  if (!root.children) return undefined;
  
  if (root.children.some(c => c.id === targetId)) return root;
  
  for (const child of root.children) {
    const found = findParentInTree(child, targetId);
    if (found) return found;
  }
  return undefined;
}

/**
 * calculateWorldPosition
 * Recursively sums local offsets to find the absolute rack position.
 */
export function calculateWorldPosition(root: OmegaNode, targetId: string, currentOffset: { x: number, y: number } = { x: 0, y: 0 }): { x: number, y: number } | undefined {
  const absoluteX = currentOffset.x + (root.layout?.pos?.x || 0);
  const absoluteY = currentOffset.y + (root.layout?.pos?.y || 0);

  if (root.id === targetId) {
    return { x: absoluteX, y: absoluteY };
  }

  if (root.children) {
    for (const child of root.children) {
      const found = calculateWorldPosition(child, targetId, { x: absoluteX, y: absoluteY });
      if (found) return found;
    }
  }

  return undefined;
}
/**
 * insertNodeInTree
 * Inserts a new node into the tree, typically into the root's children.
 */
export function insertNodeInTree(root: OmegaNode, newNode: OmegaNode): OmegaNode {
  return {
    ...root,
    children: [...(root.children || []), newNode]
  };
}

/**
 * getAllIdsInTree
 * Helper to collect all IDs for collision detection.
 */
export function getAllIdsInTree(root: OmegaNode): string[] {
  const ids = [root.id];
  if (root.children) {
    root.children.forEach(c => ids.push(...getAllIdsInTree(c)));
  }
  return ids;
}
