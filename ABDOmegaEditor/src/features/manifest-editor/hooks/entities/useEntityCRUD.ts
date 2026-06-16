'use client';

/**
 * @purpose Gestiona operaciones CRUD para entidades en el editor de manifesto OMEGA.
 * @purpose_en Manages CRUD operations for entities in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1r38h2r
 * @lastUpdated 2026-06-15T13:10:26.899Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaNode, LayoutContainer, ComponentType, NodeRole } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, updateNodeInTree, findLegacyItem, applyUpdatesToNode, insertNodeInTree, getAllIdsInTree, findParentInTree, adaptManifestEntityToNode, adaptNodeToManifestEntity, calculateWorldPosition, removeNodeFromTree } from './ucaInspectorAdapter';
import { treeToManifest } from '@/omega-ui-core/utils/ucaBridge';
import { regenerateEntityId, cloneAndRegenerateNodeIds } from '../../utils/idManagement';
import { getOccupiedBoxes, resolveFreePosition } from '@/omega-ui-core/utils/spatialUtils';
import { useGroupCRUD } from './useGroupCRUD';

export const useEntityCRUD = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void
) => {

  /**
   * buildManifestFromTree
   * Helper that consolidates the "walk tree → project to legacy arrays → return new manifest slice" pattern
   * used by every write operation in this hook. Keeps the legacy `controls`/`jacks`/`layout.containers`
   * projections in sync with the canonical UCA tree.
   */
  const buildManifestFromTree = (latestManifest: OMEGA_Manifest, nextTree: OmegaNode) => {
    const legacyProjections = treeToManifest(nextTree);
    return {
      nodes: [nextTree],
      ui: {
        ...latestManifest.ui,
        tree: nextTree,
        controls: legacyProjections.ui?.controls ?? legacyProjections.controls ?? latestManifest.ui?.controls ?? [],
        jacks: legacyProjections.ui?.jacks ?? legacyProjections.jacks ?? latestManifest.ui?.jacks ?? [],
        layout: {
          ...(latestManifest.ui?.layout as Record<string, unknown>),
          width: latestManifest.ui?.layout?.width || 800,
          height: latestManifest.ui?.layout?.height || 600,
          containers: legacyProjections.ui?.layout?.containers ?? legacyProjections.layout?.containers ?? latestManifest.ui?.layout?.containers ?? []
        }
      }
    };
  };

  const findItem = useCallback((id: string): ManifestEntity | OmegaNode | undefined => {
    // 1. UCA Priority (Industrial Rule - Phase 4.2)
    if (manifest.ui?.useUCA !== false) {
      const tree = manifest.ui?.tree;
      if (tree) {
        const ucaNode = findNodeInTree(tree, id);
        if (ucaNode) return ucaNode;
      }
    }
    
    // 2. Legacy Fallback
    return findLegacyItem(manifest, id);
  }, [manifest]);

  const { groupSelected, groupDown, ungroupNode, insertBlueprint } = useGroupCRUD(manifest, updateManifest, addLog);

  /**
   * updateItem — Single normalization path for all entity updates.
   *
   * CONTRACT (Phase 39 — v9.1.4-dev):
   * - Every call passes through `applyUpdatesToNode`, regardless of whether
   *   the target entity is in the UCA tree or in a legacy array. There is no
   *   `{ ...entity, ...updates }` pass-through branch anywhere in this hook.
   * - The function tolerates both legacy patches (`Partial<ManifestEntity>`
   *   with top-level `pos`/`size`/`presentation`) and native patches
   *   (`Partial<OmegaNode>` with nested `layout.pos`/`layout.size`).
   *   `applyUpdatesToNode` handles the deep-merge in both cases.
   * - If the entity is in the UCA tree → normalize in place, then call
   *   `updateNodeInTree`, then rebuild the manifest via `buildManifestFromTree`.
   * - If the entity is only in legacy arrays → adapt to a synthetic OmegaNode,
   *   normalize, then either migrate to the tree (UCA mode) or project back
   *   to the legacy array via `adaptNodeToManifestEntity` (legacy mode).
   * - If the entity is not found anywhere → no-op + log.
   * - History label is always `Update Entity: ${id}` so the undo stack is
   *   consistent regardless of which branch fired.
   */
  const updateItem = useCallback((id: string, updates: Partial<ManifestEntity> | Partial<OmegaNode>) => {
    updateManifest((latestManifest) => {
      const isUCA = latestManifest.ui?.useUCA !== false;
      const currentTree = latestManifest.ui?.tree;
      if (!currentTree) { addLog('[updateItem] No UCA tree.'); return {}; }
      const nodeInTree = findNodeInTree(currentTree, id);

      // Path A — Entity exists in the UCA tree: normalize and update in place.
      if (nodeInTree) {
        const translated = applyUpdatesToNode(nodeInTree, updates);
        const finalUpdates: Partial<OmegaNode> = {
          layout: translated.layout,
          style: translated.style,
          bind: translated.bind,
          role: translated.role,
          cellRef: translated.cellRef,
        };
        const nextTree = updateNodeInTree(currentTree, id, finalUpdates);
        return buildManifestFromTree(latestManifest, nextTree);
      }

      // Path B — Entity not in the UCA tree: try legacy arrays.
      const legacyItem = findLegacyItem(latestManifest, id);
      if (!legacyItem) {
        addLog(`[updateItem] Entity not found: ${id}`);
        return {};
      }

      // Adapt legacy → OmegaNode, normalize, then route to UCA tree or legacy array.
      const syntheticNode = adaptManifestEntityToNode(legacyItem);
      const translated = applyUpdatesToNode(syntheticNode, updates);

      if (isUCA) {
        // Migrate the normalized legacy entity into the UCA tree.
        const nextTree = insertNodeInTree(currentTree, translated);
        return buildManifestFromTree(latestManifest, nextTree);
      }

      // Legacy mode: project the normalized OmegaNode back to a ManifestEntity
      // and write it into the appropriate legacy array.
      const updatedEntity = adaptNodeToManifestEntity(translated);
      const isJack = legacyItem.role === 'port' || legacyItem.type === 'port'
        || (latestManifest.ui?.jacks || []).some((j: ManifestEntity) => j.id === id);

      if (isJack) {
        const nextJacks = (latestManifest.ui?.jacks || []).map((j: ManifestEntity) => j.id === id ? updatedEntity : j);
        return { ui: { ...latestManifest.ui, jacks: nextJacks } };
      }

      const nextControls = (latestManifest.ui?.controls || []).map((c: ManifestEntity) => c.id === id ? updatedEntity : c);
      return { ui: { ...latestManifest.ui, controls: nextControls } };
    }, `Update Entity: ${id}`);
  }, [updateManifest, addLog]);

  const duplicateItem = useCallback((id: string) => {
    const item = findItem(id);
    if (!item) return;

    const isUCA = manifest.ui?.useUCA !== false;
    
    // Industrial Cloning and ID Regeneration (RISK-003 & RISK-004 Fix)
    let newItem: ManifestEntity | OmegaNode;
    const occupied = getOccupiedBoxes(manifest);

    if ('kind' in item) {
      const cloned = cloneAndRegenerateNodeIds(item as OmegaNode);
      const desiredPos = {
        x: (cloned.node.layout?.pos?.x || 0) + 20,
        y: (cloned.node.layout?.pos?.y || 0) + 15
      };
      const size = cloned.node.layout?.size || { width: 48, height: 48 };
      const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);

      newItem = {
        ...cloned.node,
        layout: {
          ...cloned.node.layout,
          pos: resolvedPos
        }
      };
    } else {
      const cloned = regenerateEntityId(item as ManifestEntity);
      const desiredPos = {
        x: (cloned.pos?.x || 0) + 20,
        y: (cloned.pos?.y || 0) + 15
      };
      const size = cloned.size || { width: 48, height: 48 };
      const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);

      newItem = {
        ...cloned,
        pos: resolvedPos
      };
    }
    
    const newId = newItem.id;

    if (isUCA && manifest.ui?.tree) {
      // Sibling insertion strategy
      const parentNode = findParentInTree(manifest.ui.tree, id);
      let nextTree: OmegaNode;
      if (parentNode) {
        const insertSiblingNode = (root: OmegaNode, siblingId: string, newNode: OmegaNode): OmegaNode => {
          if (root.children) {
            const idx = root.children.findIndex(c => c.id === siblingId);
            if (idx !== -1) {
              const nextChildren = [...root.children];
              nextChildren.splice(idx + 1, 0, newNode);
              return { ...root, children: nextChildren };
            }
            const nextChildren = root.children.map(child => insertSiblingNode(child, siblingId, newNode));
            return { ...root, children: nextChildren };
          }
          return root;
        };
        nextTree = insertSiblingNode(manifest.ui.tree, id, newItem as OmegaNode);
      } else {
        nextTree = insertNodeInTree(manifest.ui.tree, newItem as OmegaNode);
      }
      const projections = treeToManifest(nextTree);
      updateManifest({
        nodes: [nextTree],
        ui: {
          ...manifest.ui,
          tree: nextTree,
          controls: projections.ui?.controls ?? projections.controls ?? manifest.ui?.controls ?? [],
          jacks: projections.ui?.jacks ?? projections.jacks ?? manifest.ui?.jacks ?? [],
          layout: {
            ...manifest.ui?.layout,
            width: manifest.ui?.layout?.width || 800,
            height: manifest.ui?.layout?.height || 600,
            containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? manifest.ui?.layout?.containers ?? []
          }
        }
      }, `Duplicate UCA Node: ${id} → ${newId}`, true);
    } else {
      // Legacy Array Mode
      const isControl = manifest.ui?.controls?.some((c: ManifestEntity) => c.id === id);
      if (isControl) {
        const newList = [...(manifest.ui?.controls || []), newItem as ManifestEntity];
        updateManifest({ ui: { ...manifest.ui, controls: newList } }, `Duplicate Control: ${id}`, true);
      } else {
        const newList = [...(manifest.ui?.jacks || []), newItem as ManifestEntity];
        updateManifest({ ui: { ...manifest.ui, jacks: newList } }, `Duplicate Jack: ${id}`, true);
      }
    }
    
    addLog(`Duplicated entity: ${newId}`);
    return newId;
  }, [manifest, findItem, updateManifest, addLog]);

  const removeItem = useCallback((id: string) => {
    updateManifest((latestManifest) => {
      const currentTree = latestManifest.ui?.tree;
      if (!currentTree) return {};

      const removeNodeFromTree = (root: OmegaNode, targetId: string): OmegaNode => {
        if (root.children) {
          const nextChildren = root.children
            .filter(child => child.id !== targetId)
            .map(child => removeNodeFromTree(child, targetId));
          return { ...root, children: nextChildren };
        }
        return root;
      };

      const nextTree = removeNodeFromTree(currentTree, id);
      const legacyProjections = treeToManifest(nextTree);

      return {
        nodes: [nextTree],
        ui: {
          ...latestManifest.ui,
          tree: nextTree,
          controls: legacyProjections.ui?.controls ?? legacyProjections.controls ?? [],
          jacks: legacyProjections.ui?.jacks ?? legacyProjections.jacks ?? [],
          layout: {
            ...(latestManifest.ui?.layout as Record<string, unknown>),
            width: latestManifest.ui?.layout?.width || 800,
            height: latestManifest.ui?.layout?.height || 600,
            containers: legacyProjections.ui?.layout?.containers ?? legacyProjections.layout?.containers ?? []
          }
        }
      };
    }, `Remove Entity: ${id}`, true);
    addLog(`Removed entity: ${id}`);
  }, [updateManifest, addLog]);

  const addEntity = useCallback((type: 'control' | 'jack', template?: Partial<ManifestEntity>, node?: OmegaNode, container?: LayoutContainer) => {
    const hasWasm = !!(manifest.resources?.wasm || (manifest.resources as Record<string, unknown> | undefined)?.contract);
    
    let generatedId = `new_${type}_${Date.now().toString().slice(-4)}`;
    let generatedLabel = type === 'control' ? 'New Control' : 'New Jack';

    if (!hasWasm) {
      const moduleId = manifest.id || 'omega';
      const componentType = template?.type || (type === 'control' ? 'knob' : 'port');
      
      const existingEntities = [
        ...(manifest.ui?.controls || []),
        ...(manifest.ui?.jacks || [])
      ];
      
      let index = 1;
      let checkId = `${moduleId}_${componentType}_${String(index).padStart(3, '0')}`;
      while (existingEntities.some(e => e.id === checkId)) {
        index++;
        checkId = `${moduleId}_${componentType}_${String(index).padStart(3, '0')}`;
      }
      generatedId = checkId;
      const capitalizedType = componentType.charAt(0).toUpperCase() + componentType.slice(1);
      generatedLabel = `${capitalizedType} ${index}`;
    }

    const id = generatedId;
    
    const desiredPos = node
      ? (node.layout?.pos || { x: 0, y: 0 })
      : (type === 'control'
        ? (template?.pos || { x: 50, y: 50 })
        : (template?.pos || { x: 50, y: 350 }));
        
    const size = node
      ? (node.layout?.size || { width: 48, height: 48 })
      : (template?.size || { width: 48, height: 48 });

    const occupied = getOccupiedBoxes(manifest);
    const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);

    // Default base structure
    const baseEntity: ManifestEntity = node ? {
      id: node.id,
      type: node.cellRef || 'knob',
      role: node.role || 'control',
      bind: node.bind || 'none',
      label: node.id,
      pos: resolvedPos,
      size: node.layout?.size || { width: 48, height: 48 },
      presentation: {
        tab: 'MAIN',
        component: node.cellRef || 'knob', 
        variant: 'default',
        offsetX: 0,
        offsetY: 0,
        attachments: []
      }
    } : {
      id,
      type: type === 'control' ? (template?.type || 'knob') : (template?.type || 'port'),
      role: type === 'control' ? 'control' : 'stream',
      bind: '',
      label: generatedLabel,
      pos: resolvedPos,
      size: { width: 48, height: 48 },
      presentation: {
        tab: 'MAIN',
        component: type === 'control' ? (template?.type || 'knob') as ComponentType : (template?.type || 'port') as ComponentType,
        variant: 'B_cyan',
        offsetX: 0,
        offsetY: 0,
        attachments: []
      }
    };
    
    // Merge template if provided (Aseptic Ingestion)
    const newEntity: ManifestEntity = template ? {
      ...baseEntity,
      ...template,
      id, // Preserve generated ID
      pos: baseEntity.pos, // Reset position for placement
      presentation: {
        ...baseEntity.presentation,
        ...(template.presentation || {}),
        tab: 'MAIN' // Force to current plane context
      }
    } as ManifestEntity : baseEntity;

    const isUCA = manifest.ui?.useUCA !== false;

    updateManifest((prev) => {
      // 1. Re-verify ID uniqueness against LATEST tree (prev.ui.tree) to avoid double-click and desync stale closure bugs
      let safeId = id;
      const allLatestIds = isUCA && prev.ui?.tree ? getAllIdsInTree(prev.ui.tree) : [...(prev.ui?.controls || []), ...(prev.ui?.jacks || [])].map(e => e.id);
      
      if (allLatestIds.includes(safeId)) {
        let idx = 1;
        const cType = template?.type || (type === 'control' ? 'knob' : 'port');
        const mId = prev.id || 'omega';
        let cId = `${mId}_${cType}_${String(idx).padStart(3, '0')}`;
        while (allLatestIds.includes(cId)) {
          idx++;
          cId = `${mId}_${cType}_${String(idx).padStart(3, '0')}`;
        }
        safeId = cId;
      }

      const safeEntity = { ...newEntity, id: safeId, label: newEntity.label === generatedLabel ? safeId : newEntity.label };

      if (isUCA && prev.ui?.tree) {
        let newNode: OmegaNode;
        if (container) {
          newNode = {
            id: container.id,
            kind: 'container',
            role: 'structure',
            layout: { 
              pos: container.pos, 
              size: { 
                width: typeof container.size.width === 'number' ? container.size.width : 100, 
                height: typeof container.size.height === 'number' ? container.size.height : 100 
              } 
            },
            children: []
          };
        } else {
          newNode = {
            id: safeId,
            kind: type === 'control' ? 'cell' : 'port',
            cellRef: safeEntity.type as ComponentType,
            role: safeEntity.role as NodeRole,
            bind: safeEntity.bind,
            layout: { pos: safeEntity.pos, size: safeEntity.size as { width: number; height: number } },
            style: { variant: safeEntity.presentation?.variant || 'default' }
          };
        }

        const nextTree = insertNodeInTree(prev.ui.tree, newNode);
        const projections = treeToManifest(nextTree);

        return {
          nodes: [nextTree], // Depending on orchestrator logic, this might be needed
          ui: {
            ...prev.ui,
            tree: nextTree,
            controls: projections.ui?.controls ?? projections.controls ?? prev.ui?.controls ?? [],
            jacks: projections.ui?.jacks ?? projections.jacks ?? prev.ui?.jacks ?? [],
            layout: {
              ...prev.ui?.layout,
              width: prev.ui?.layout?.width || 800,
              height: prev.ui?.layout?.height || 600,
              containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? prev.ui?.layout?.containers ?? []
            }
          }
        };
      } else {
        if (container) {
          const nextLayout = { ...prev.ui?.layout, width: prev.ui?.layout?.width || 800, height: prev.ui?.layout?.height || 600, containers: [...(prev.ui?.layout?.containers || []), container] };
          return { ui: { ...prev.ui, layout: nextLayout as OMEGA_Manifest['ui']['layout'] } };
        } else if (type === 'control') {
          const nextControls = [...(prev.ui?.controls || []), safeEntity];
          return { ui: { ...prev.ui, controls: nextControls } };
        } else {
          const nextJacks = [...(prev.ui?.jacks || []), safeEntity];
          return { ui: { ...prev.ui, jacks: nextJacks } };
        }
      }
    }, container ? `Add Container: ${id}` : `Add ${type}: ${id}`, true);

    addLog(`Added new ${type}: ${id}`);
    return id;
  }, [manifest, updateManifest, addLog]);
  
  const pasteEntity = useCallback((item: ManifestEntity | OmegaNode) => {
    // 1. Collision Detection & ID Regeneration (RISK-004 Fix)
    const isUCA = manifest.ui?.useUCA !== false;
    
    let newItem: ManifestEntity | OmegaNode;
    const occupied = getOccupiedBoxes(manifest);

    if ('kind' in item) {
      const cloned = cloneAndRegenerateNodeIds(item as OmegaNode).node;
      const desiredPos = cloned.layout?.pos || { x: 50, y: 50 };
      const size = cloned.layout?.size || { width: 48, height: 48 };
      const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);
      cloned.layout = { ...cloned.layout, pos: resolvedPos };
      newItem = cloned;
    } else {
      const cloned = regenerateEntityId(item as ManifestEntity);
      const desiredPos = cloned.pos || { x: 50, y: 50 };
      const size = cloned.size || { width: 48, height: 48 };
      const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);
      cloned.pos = resolvedPos;
      newItem = cloned;
    }
    
    const newId = newItem.id;

    // 2. Insertion Strategy
    if (isUCA && manifest.ui?.tree) {
      addLog(`[CLIPBOARD] Strategic Insertion: UCA Tree Mode.`);
      // UCA Strategy: Insert into tree and sync projections
      const nextTree = insertNodeInTree(manifest.ui.tree, newItem as OmegaNode);
      const projections = treeToManifest(nextTree);
      
      updateManifest({
        nodes: [nextTree],
        ui: {
          ...manifest.ui,
          tree: nextTree,
          controls: projections.ui?.controls ?? projections.controls ?? manifest.ui?.controls ?? [],
          jacks: projections.ui?.jacks ?? projections.jacks ?? manifest.ui?.jacks ?? [],
          layout: {
            ...manifest.ui?.layout,
            width: manifest.ui?.layout?.width || 800,
            height: manifest.ui?.layout?.height || 600,
            containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? manifest.ui?.layout?.containers ?? []
          }
        }
      }, `Paste Entity (UCA): ${newId}`, true);
    } else {
      addLog(`[CLIPBOARD] Strategic Insertion: Legacy Array Mode.`);
      // Legacy Strategy: Add to correct array
      const entity = newItem as ManifestEntity;
      const isJack = entity.role === 'stream' || entity.role === 'port' || entity.type === 'port';
      
      if (isJack) {
        const nextJacks = [...(manifest.ui?.jacks || []), entity];
        updateManifest({ ui: { ...manifest.ui, jacks: nextJacks } }, `Paste Jack: ${newId}`, true);
      } else {
        const nextControls = [...(manifest.ui?.controls || []), entity];
        updateManifest({ ui: { ...manifest.ui, controls: nextControls } }, `Paste Control: ${newId}`, true);
      }
    }

    addLog(`Pasted entity: ${newId} (Industrial Sync Complete)`);
    return newId;
  }, [manifest, updateManifest, addLog]);



  /**
   * updateItems — Batch atomic update for multiple nodes (Bug 1 fix).
   * Accepts a map of node IDs to their partial updates and applies them all
   * in a single transaction, avoiding race conditions from multiple synchronous
   * `updateManifest` calls.
   */
  const updateItems = useCallback((updatesMap: Record<string, Partial<OmegaNode>>) => {
    updateManifest((latestManifest) => {
      const currentTree = latestManifest.ui?.tree;
      if (!currentTree) return {};
      let nextTree: OmegaNode = { ...currentTree };

      Object.entries(updatesMap).forEach(([id, updates]) => {
        const nodeInTree = findNodeInTree(nextTree, id);
        if (nodeInTree) {
          const translated = applyUpdatesToNode(nodeInTree, updates);
          const finalUpdates: Partial<OmegaNode> = {
            layout: translated.layout,
            style: translated.style,
            bind: translated.bind,
            role: translated.role,
            cellRef: translated.cellRef,
          };
          nextTree = updateNodeInTree(nextTree, id, finalUpdates);
        }
      });

      return buildManifestFromTree(latestManifest, nextTree);
    }, `Update Multiple Entities (${Object.keys(updatesMap).length} nodes)`);
  }, [updateManifest]);

  const moveNode = useCallback((nodeId: string, targetParentId: string, index?: number) => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    updateManifest((prev) => {
      const tree = prev.ui?.tree;
      if (!tree) return {};

      // 1. Find the source node
      const sourceNode = findNodeInTree(tree, nodeId);
      if (!sourceNode) {
        addLog(`[moveNode] Source node not found: ${nodeId}`);
        return {};
      }

      // 2. Prevent dragging a group into itself or its descendants
      const isDescendant = (parent: OmegaNode, childId: string): boolean => {
        if (parent.id === childId) return true;
        if (parent.children) {
          return parent.children.some(c => isDescendant(c, childId));
        }
        return false;
      };
      
      const targetParentNode = findNodeInTree(tree, targetParentId);
      if (targetParentNode && isDescendant(sourceNode, targetParentId)) {
        addLog(`[moveNode] Cannot move group ${nodeId} into its own descendant ${targetParentId}`);
        return {};
      }

      // 3. Calculate absolute world position of the source node
      const sourceAbsPos = calculateWorldPosition(tree, nodeId) || { x: 0, y: 0 };

      // 4. Calculate absolute world position of the target parent node
      const parentAbsPos = targetParentId === tree.id 
        ? { x: 0, y: 0 } 
        : (calculateWorldPosition(tree, targetParentId) || { x: 0, y: 0 });

      // 5. Remove the source node from its current parent
      const cleanedTree = removeNodeFromTree(tree, nodeId);

      // 6. Calculate new relative coordinates
      const newRelPos = {
        x: sourceAbsPos.x - parentAbsPos.x,
        y: sourceAbsPos.y - parentAbsPos.y
      };

      // 7. Update node's relative position
      const updatedNode: OmegaNode = {
        ...sourceNode,
        layout: {
          ...sourceNode.layout,
          pos: newRelPos
        }
      };

      // 8. Insert the updated node inside target parent's children at index
      const insertNodeAtParentIndex = (root: OmegaNode, parentId: string, nodeToInsert: OmegaNode, idx?: number): OmegaNode => {
        if (root.id === parentId) {
          const nextChildren = [...(root.children || [])];
          const targetIdx = (idx !== undefined && idx >= 0 && idx <= nextChildren.length) ? idx : nextChildren.length;
          nextChildren.splice(targetIdx, 0, nodeToInsert);
          return { ...root, children: nextChildren };
        }
        if (root.children) {
          return {
            ...root,
            children: root.children.map(child => insertNodeAtParentIndex(child, parentId, nodeToInsert, idx))
          };
        }
        return root;
      };

      const nextTree = insertNodeAtParentIndex(cleanedTree, targetParentId, updatedNode, index);
      const projections = treeToManifest(nextTree);

      return {
        nodes: [nextTree],
        ui: {
          ...prev.ui,
          tree: nextTree,
          controls: projections.ui?.controls ?? projections.controls ?? prev.ui?.controls ?? [],
          jacks: projections.ui?.jacks ?? projections.jacks ?? prev.ui?.jacks ?? [],
          layout: {
            ...prev.ui?.layout,
            width: prev.ui?.layout?.width || 800,
            height: prev.ui?.layout?.height || 600,
            containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? prev.ui?.layout?.containers ?? []
          }
        }
      };
    }, `Move Node: ${nodeId}`, true);

    addLog(`Moved node: ${nodeId} to parent ${targetParentId}`);
  }, [manifest, updateManifest, addLog]);

  const moveNodeUpDown = useCallback((nodeId: string, direction: 'up' | 'down') => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    updateManifest((prev) => {
      const tree = prev.ui?.tree;
      if (!tree) return {};

      const parent = findParentInTree(tree, nodeId);
      if (!parent || !parent.children) {
        addLog(`[moveNodeUpDown] Parent not found or root node: ${nodeId}`);
        return {};
      }

      const childrenList = [...parent.children];
      const idx = childrenList.findIndex(c => c.id === nodeId);
      if (idx === -1) return {};

      if (direction === 'up') {
        if (idx === 0) return {}; // already at top
        // Swap
        const temp = childrenList[idx];
        childrenList[idx] = childrenList[idx - 1];
        childrenList[idx - 1] = temp;
      } else {
        if (idx === childrenList.length - 1) return {}; // already at bottom
        // Swap
        const temp = childrenList[idx];
        childrenList[idx] = childrenList[idx + 1];
        childrenList[idx + 1] = temp;
      }

      const updatedParent = {
        ...parent,
        children: childrenList
      };

      const nextTree = updateNodeInTree(tree, parent.id, updatedParent);
      const projections = treeToManifest(nextTree);

      return {
        nodes: [nextTree],
        ui: {
          ...prev.ui,
          tree: nextTree,
          controls: projections.ui?.controls ?? projections.controls ?? prev.ui?.controls ?? [],
          jacks: projections.ui?.jacks ?? projections.jacks ?? prev.ui?.jacks ?? [],
          layout: {
            ...prev.ui?.layout,
            width: prev.ui?.layout?.width || 800,
            height: prev.ui?.layout?.height || 600,
            containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? prev.ui?.layout?.containers ?? []
          }
        }
      };
    }, `Reorder Node: ${nodeId} ${direction}`, true);

    addLog(`Reordered node: ${nodeId} ${direction}`);
  }, [manifest, updateManifest, addLog]);

  return {
    findItem,
    updateItem,
    updateItems,
    duplicateItem,
    removeItem,
    addEntity,
    pasteEntity,
    groupSelected,
    groupDown,
    ungroupNode,
    insertBlueprint,
    moveNode,
    moveNodeUpDown
  };
};

