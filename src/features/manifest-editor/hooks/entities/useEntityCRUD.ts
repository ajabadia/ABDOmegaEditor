'use client';

import { useCallback } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaNode, LayoutContainer, ComponentType, NodeRole } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, updateNodeInTree, findLegacyItem, applyUpdatesToNode, insertNodeInTree, getAllIdsInTree } from './ucaInspectorAdapter';
import { treeToManifest, manifestToTree } from '@/omega-ui-core/uca/ucaBridge';
import { regenerateEntityId, cloneAndRegenerateNodeIds } from '../../utils/idManagement';

export const useEntityCRUD = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void
) => {
  
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

  const updateItem = useCallback((id: string, updates: Partial<ManifestEntity> | Partial<OmegaNode>) => {
    updateManifest((latestManifest) => {
      const isUCA = latestManifest.ui?.useUCA !== false;
      const currentTree = isUCA && latestManifest.ui?.tree ? latestManifest.ui.tree : manifestToTree(latestManifest, latestManifest.ui?.tree);
      const nodeInTree = findNodeInTree(currentTree, id);
      
      if (nodeInTree) {
        // Direct UCA tree update
        let finalUpdates: Partial<OmegaNode>;
        
        if (!('kind' in updates) && ('presentation' in updates || 'pos' in updates)) {
          const translated = applyUpdatesToNode(nodeInTree, updates as Partial<ManifestEntity>);
          finalUpdates = { 
            layout: translated.layout, 
            style: translated.style, 
            bind: translated.bind, 
            role: translated.role, 
            cellRef: translated.cellRef 
          };
        } else {
          finalUpdates = updates as Partial<OmegaNode>;
        }

        const nextTree = updateNodeInTree(currentTree, id, finalUpdates);
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
      } else {
        // Legacy edit fallback
        const isJack = latestManifest.ui?.jacks?.some((j: ManifestEntity) => j.id === id);
        
        if (isJack) {
          const nextJacks = (latestManifest.ui?.jacks || []).map((j: ManifestEntity) => j.id === id ? { ...j, ...(updates as Partial<ManifestEntity>) } : j);
          return { ui: { ...latestManifest.ui, jacks: nextJacks } };
        } else {
          const nextControls = (latestManifest.ui?.controls || []).map((c: ManifestEntity) => c.id === id ? { ...c, ...(updates as Partial<ManifestEntity>) } : c);
          return { ui: { ...latestManifest.ui, controls: nextControls } };
        }
      }
    }, `Update Entity: ${id}`);
  }, [updateManifest]);

  const duplicateItem = useCallback((id: string) => {
    const item = findItem(id);
    if (!item) return;

    const isControl = manifest.ui?.controls?.some((c: ManifestEntity) => c.id === id);
    
    // Industrial Cloning and ID Regeneration (RISK-003 & RISK-004 Fix)
    let newItem: ManifestEntity | OmegaNode;
    if ('kind' in item) {
      newItem = cloneAndRegenerateNodeIds(item as OmegaNode).node;
    } else {
      newItem = regenerateEntityId(item as ManifestEntity);
    }
    
    const newId = newItem.id;
    
    if (isControl) {
      const newList = [...(manifest.ui?.controls || []), newItem as ManifestEntity];
      updateManifest({ ui: { ...manifest.ui, controls: newList } }, `Duplicate Control: ${id}`, true);
    } else {
      const newList = [...(manifest.ui?.jacks || []), newItem as ManifestEntity];
      updateManifest({ ui: { ...manifest.ui, jacks: newList } }, `Duplicate Jack: ${id}`, true);
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
    
    // Default base structure
    const baseEntity: ManifestEntity = node ? {
      id: node.id,
      type: node.cellRef || 'knob',
      role: node.role || 'control',
      bind: node.bind || 'none',
      label: node.id,
      pos: node.layout?.pos || { x: 0, y: 0 },
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
      pos: type === 'control' ? { x: 50, y: 50 } : { x: 50, y: 350 },
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
    if ('kind' in item) {
      newItem = cloneAndRegenerateNodeIds(item as OmegaNode).node;
    } else {
      newItem = regenerateEntityId(item as ManifestEntity);
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

  return {
    findItem,
    updateItem,
    duplicateItem,
    removeItem,
    addEntity,
    pasteEntity
  };
};
