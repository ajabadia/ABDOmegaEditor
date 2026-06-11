import type { OMEGA_Manifest, OmegaNode } from '../../types/manifest';

/**
 * manifestToTree
 * Hydrates a recursive OmegaNode tree from flat manifest arrays.
 */
export function manifestToTree(manifest: OMEGA_Manifest, existingTree?: OmegaNode): OmegaNode {
  const ui = manifest.ui;
  const containers = ui?.layout?.containers || [];
  const controls = ui?.controls || [];
  const jacks = ui?.jacks || [];

  // Try to recover MAIN_FACE from existing tree if available (Phase 10.1C)
  const existingMainFace = existingTree?.children?.find(c => c.id === 'MAIN_FACE');

  // 1. Create the Root Rack
  const root: OmegaNode = {
    id: manifest.id || 'anonymous_rack',
    kind: 'rack',
    role: 'root',
      layout: {
        pos: existingTree?.layout?.pos || { x: 0, y: 0 },
        size: existingTree?.layout?.size || ui?.dimensions
      },
    children: []
  };

  // 2. Create the Primary Face (MAIN)
  const mainFace: OmegaNode = {
    id: 'MAIN_FACE',
    kind: 'face',
    role: 'presentation',
    layout: {
      pos: existingMainFace?.layout?.pos || { x: 0, y: 0 },
      size: existingMainFace?.layout?.size || ui?.dimensions
    },
    children: []
  };
  root.children?.push(mainFace);

  // 3. Map Containers
  const containerMap = new Map<string, OmegaNode>();
  containers.forEach(c => {
    const node: OmegaNode = {
      id: c.id,
      kind: 'container',
      role: 'infrastructure',
      layout: {
        pos: c.pos,
        size: (typeof c.size.width === 'number') 
          ? { width: c.size.width, height: c.size.height }
          : (typeof c.size.w === 'number' && typeof c.size.h === 'number')
            ? { width: c.size.w, height: c.size.h }
            : undefined, 
        zIndex: c.zIndex
      },
      style: {
        color: c.color || undefined,
        indicatorColor: c.indicatorColor || undefined,
        rounding: c.rounding || undefined,
        borderWidth: c.borderWidth || undefined
      },
      children: []
    };
    containerMap.set(c.id, node);
    mainFace.children?.push(node);
  });

  // 4. Map Entities (Controls & Jacks)
  const allEntities = [...controls, ...jacks];
  allEntities.forEach(entity => {
    const node: OmegaNode = {
      id: entity.id,
      kind: 'cell',
      role: entity.role || 'control',
      bind: entity.bind,
      layout: {
        pos: entity.pos,
        size: entity.presentation?.size ? {
          width: entity.presentation.size.width,
          height: entity.presentation.size.height
        } : undefined,
        zIndex: entity.presentation?.style?.zIndex
      },
      style: entity.presentation?.style,
      cellRef: entity.type as string
    };

    const containerId = entity.presentation?.container;
    const targetParent = containerId ? containerMap.get(containerId) : mainFace;
    
    if (targetParent) {
      targetParent.children = targetParent.children || [];
      targetParent.children.push(node);
    } else {
      mainFace.children?.push(node);
    }
  });

  return root;
}
