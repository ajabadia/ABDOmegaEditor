'use client';

import { useCallback } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaNode, LayoutContainer, ComponentType, NodeRole } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, updateNodeInTree, findLegacyItem, applyUpdatesToNode, insertNodeInTree, getAllIdsInTree, removeNodesFromTree, findParentInTree, adaptManifestEntityToNode, adaptNodeToManifestEntity } from './ucaInspectorAdapter';
import { treeToManifest, manifestToTree } from '@/omega-ui-core/utils/ucaBridge';
import { regenerateEntityId, cloneAndRegenerateNodeIds } from '../../utils/idManagement';
import { getOccupiedBoxes, resolveFreePosition } from '@/omega-ui-core/utils/spatialUtils';

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
      const tree = manifest.ui?.tree || manifestToTree(manifest);
      const ucaNode = findNodeInTree(tree, id);
      if (ucaNode) return ucaNode;
    }
    
    // 2. Legacy Fallback
    return findLegacyItem(manifest, id);
  }, [manifest]);

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
      const currentTree = isUCA && latestManifest.ui?.tree
        ? latestManifest.ui.tree
        : manifestToTree(latestManifest, latestManifest.ui?.tree);
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
      const isUCA = latestManifest.ui?.useUCA !== false;
      const currentTree = isUCA && latestManifest.ui?.tree ? latestManifest.ui.tree : manifestToTree(latestManifest, latestManifest.ui?.tree);
      
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

  const groupSelected = useCallback((ids: string[]) => {
    if (ids.length < 2) return;
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    const tree = manifest.ui.tree;

    // Collect all nodes and compute bounding box
    const nodes: OmegaNode[] = [];
    for (const id of ids) {
      const node = findNodeInTree(tree, id);
      if (node) nodes.push(node);
    }
    if (nodes.length < 2) return;

    // Bounding box center
    let minX = Infinity, minY = Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.layout?.pos?.x || 0);
      minY = Math.min(minY, n.layout?.pos?.y || 0);
    }

    // Create group node
    const groupId = `group_${crypto.randomUUID().slice(0, 8)}`;
    const groupNode: OmegaNode = {
      id: groupId,
      kind: 'group',
      role: 'composite',
      layout: {
        pos: { x: minX, y: minY },
        mode: 'absolute'
      },
      children: nodes.map(n => ({
        ...n,
        layout: {
          ...n.layout,
          pos: {
            x: (n.layout?.pos?.x || 0) - minX,
            y: (n.layout?.pos?.y || 0) - minY
          }
        }
      }))
    };

    // Remove original nodes, then insert group
    const cleanedTree = removeNodesFromTree(tree, ids);
    const nextTree = insertNodeInTree(cleanedTree, groupNode);
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
    }, `Group ${nodes.length} nodes → ${groupId}`, true);

    addLog(`Grouped ${nodes.length} nodes into ${groupId}`);
    return groupId;
  }, [manifest, updateManifest, addLog]);

  const groupDown = useCallback((id: string) => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    const tree = manifest.ui.tree;
    const parentNode = findParentInTree(tree, id);
    if (!parentNode || !parentNode.children) return;

    const idx = parentNode.children.findIndex(c => c.id === id);
    if (idx === -1 || idx === parentNode.children.length - 1) return; // last child, cannot group down

    const sourceNode = parentNode.children[idx];
    const sibling = parentNode.children[idx + 1];

    if (sibling.kind === 'group' || sibling.kind === 'container') {
      const siblingPos = sibling.layout?.pos || { x: 0, y: 0 };
      const sourcePos = sourceNode.layout?.pos || { x: 0, y: 0 };
      
      const updatedSource: OmegaNode = {
        ...sourceNode,
        layout: {
          ...sourceNode.layout,
          pos: {
            x: sourcePos.x - siblingPos.x,
            y: sourcePos.y - siblingPos.y
          }
        }
      };

      const updatedSibling: OmegaNode = {
        ...sibling,
        children: [updatedSource, ...(sibling.children || [])]
      };

      const cleanTree = removeNodesFromTree(tree, [id]);
      const nextTree = updateNodeInTree(cleanTree, sibling.id, updatedSibling);
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
      }, `Move ${id} inside ${sibling.id}`, true);
      addLog(`Moved node ${id} inside group ${sibling.id}`);
    } else {
      groupSelected([id, sibling.id]);
    }
  }, [manifest, updateManifest, groupSelected, addLog]);

  const ungroupNode = useCallback((groupId: string) => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    const tree = manifest.ui.tree;
    const groupNode = findNodeInTree(tree, groupId);
    if (!groupNode || (groupNode.kind !== 'group' && groupNode.kind !== 'container') || !groupNode.children?.length) return;

    const parent = findParentInTree(tree, groupId);
    if (!parent) return;

    // Reparent children to group's position (absolute coords within parent)
    const groupPos = groupNode.layout?.pos || { x: 0, y: 0 };
    const reparented = groupNode.children.map(child => ({
      ...child,
      layout: {
        ...child.layout,
        pos: {
          x: (child.layout?.pos?.x || 0) + groupPos.x,
          y: (child.layout?.pos?.y || 0) + groupPos.y
        }
      }
    }));

    // Remove group, then re-insert children at parent level
    let nextTree = removeNodesFromTree(tree, [groupId]);
    for (const child of reparented) {
      nextTree = insertNodeInTree(nextTree, child);
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
    }, `Ungroup ${groupId} → ${groupNode.children.length} children`, true);

    addLog(`Ungrouped ${groupId} into ${reparented.length} children`);
    return groupNode.children.map(c => c.id);
  }, [manifest, updateManifest, addLog]);

  /**
   * updateItems — Batch atomic update for multiple nodes (Bug 1 fix).
   * Accepts a map of node IDs to their partial updates and applies them all
   * in a single transaction, avoiding race conditions from multiple synchronous
   * `updateManifest` calls.
   */
  const updateItems = useCallback((updatesMap: Record<string, Partial<OmegaNode>>) => {
    updateManifest((latestManifest) => {
      const isUCA = latestManifest.ui?.useUCA !== false;
      const currentTree: OmegaNode = isUCA && latestManifest.ui?.tree
        ? latestManifest.ui.tree
        : manifestToTree(latestManifest, latestManifest.ui?.tree);
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

  const insertBlueprint = useCallback((groupNode: { id: string; label: string; pos: { x: number; y: number }; children: Array<{ id: string; type: string; label: string; pos: { x: number; y: number }; size?: { width: number; height: number }; style?: Record<string, unknown>; bind?: { target: string } }> }) => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    // Clone IDs to avoid collisions
    const idMap = new Map<string, string>();
    const cloneId = (id: string) => {
      const newId = `${id}_${crypto.randomUUID().slice(0, 6)}`;
      idMap.set(id, newId);
      return newId;
    };

    // Convert GroupNode children to OmegaNode
    const omegaChildren: OmegaNode[] = groupNode.children.map(child => ({
      id: cloneId(child.id),
      kind: child.type === 'port' ? 'port' as const : 'cell' as const,
      cellRef: child.type,
      role: child.type === 'port' ? 'io' as const : 'control' as const,
      bind: child.bind?.target,
      layout: {
        pos: { x: child.pos.x, y: child.pos.y },
        size: child.size ? { width: child.size.width, height: child.size.height } : undefined
      },
      style: child.style ? { variant: child.style.variant as string } : undefined
    }));

    // Calculate blueprint bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    groupNode.children.forEach(c => {
      const cx = c.pos.x;
      const cy = c.pos.y;
      const cw = c.size?.width || 48;
      const ch = c.size?.height || 48;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx + cw);
      maxY = Math.max(maxY, cy + ch);
    });
    const bpWidth = maxX - minX > 0 ? maxX - minX : 100;
    const bpHeight = maxY - minY > 0 ? maxY - minY : 100;
    const occupied = getOccupiedBoxes(manifest);
    const resolvedPos = resolveFreePosition(groupNode.pos, { width: bpWidth, height: bpHeight }, occupied, manifest);

    const newGroup: OmegaNode = {
      id: cloneId(groupNode.id),
      kind: 'group',
      role: 'composite',
      layout: {
        pos: resolvedPos,
        mode: 'absolute'
      },
      meta: { label: groupNode.label },
      children: omegaChildren
    };

    const nextTree = insertNodeInTree(manifest.ui.tree, newGroup);
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
    }, `Insert blueprint: ${groupNode.label}`, true);

    addLog(`Inserted blueprint: ${groupNode.label} (${omegaChildren.length} children)`);
    return idMap.get(groupNode.id);
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
    insertBlueprint
  };
};

