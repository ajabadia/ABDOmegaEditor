import type { OMEGA_Manifest, OmegaNode, LayoutContainer, ManifestEntity, CellTemplate } from '../types/manifest';
import type { AssetBehavior, LayerRecipe } from '../types/assetBehavior';

function manifestToLegacyTree(manifest: OMEGA_Manifest, existingTree?: OmegaNode): OmegaNode {
  const ui = manifest.ui;
  const containers = ui?.layout?.containers || [];
  const controls = ui?.controls || [];
  const jacks = ui?.jacks || [];

  const existingMainFace = existingTree?.children?.find(c => c.id === 'MAIN_FACE');

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

function treeToLegacyManifest(root: OmegaNode): Partial<OMEGA_Manifest['ui']> {
  const containers: LayoutContainer[] = [];
  const controls: ManifestEntity[] = [];
  const jacks: ManifestEntity[] = [];

  function walk(node: OmegaNode, parentFace?: string, parentContainer?: string) {
    if (node.kind === 'container') {
      containers.push({
        id: node.id,
        label: node.id,
        pos: node.layout?.pos || { x: 0, y: 0 },
        size: {
          width: node.layout?.size?.width || 'full',
          height: node.layout?.size?.height || 100,
          w: typeof node.layout?.size?.width === 'number' ? node.layout.size.width : undefined,
          h: typeof node.layout?.size?.height === 'number' ? node.layout.size.height : undefined
        },
        variant: 'default',
        zIndex: node.layout?.zIndex,
        color: node.style?.color,
        indicatorColor: node.style?.indicatorColor,
        rounding: node.style?.rounding as number | undefined,
        borderWidth: node.style?.borderWidth as number | undefined,
        tab: parentFace || 'MAIN'
      });
    } else if (node.kind === 'cell' || node.kind === 'port') {
      const isJack = node.kind === 'port' || node.role === 'port' || (node.role === 'stream' && node.cellRef === 'port') || node.cellRef === 'port';

      const entity: ManifestEntity = {
        id: node.id,
        type: node.cellRef || 'knob',
        role: node.role || (isJack ? 'port' : 'control'),
        bind: node.bind || 'none',
        label: node.id,
        pos: node.layout?.pos || { x: 0, y: 0 },
        size: node.layout?.size || { width: 48, height: 48 },
        presentation: {
          component: node.cellRef || 'knob',
          variant: 'default',
          offsetX: 0,
          offsetY: 0,
          attachments: [],
          container: parentContainer,
          tab: parentFace || 'MAIN',
          style: {
            ...node.style,
            ...(node.layout?.zIndex !== undefined ? { zIndex: node.layout.zIndex } : {})
          },
          size: node.layout?.size ? { width: node.layout.size.width, height: node.layout.size.height } : { width: 48, height: 48 }
        },
        assetBehavior: node.meta?.assetBehavior as AssetBehavior | undefined,
        recipe: node.meta?.recipe as LayerRecipe | undefined,
      };

      if (isJack) {
        jacks.push(entity);
      } else {
        controls.push(entity);
      }
    }

    if (node.children) {
      node.children.forEach(child => {
        const currentFace = node.kind === 'face' ? node.id : parentFace;
        const currentContainer = node.kind === 'container' ? node.id : parentContainer;
        walk(child, currentFace, currentContainer);
      });
    }
  }

  walk(root);

  return {
    layout: {
      width: 1000,
      height: 500,
      containers,
      planes: ['MAIN']
    },
    controls,
    jacks
  };
}

function formalizeUCA(node: OmegaNode): OmegaNode {
  return {
    ...node,
    children: node.children?.map(formalizeUCA) || []
  };
}

export function manifestToOmegaTree(manifest: OMEGA_Manifest, existingTree?: OmegaNode): OmegaNode {
  if (manifest.nodes && manifest.nodes.length > 0 && manifest.nodes[0]) {
    return formalizeUCA(manifest.nodes[0]);
  }

  if (manifest.ui?.tree && manifest.ui?.useUCA) {
    return formalizeUCA(manifest.ui.tree);
  }

  return manifestToLegacyTree(manifest, existingTree);
}

export { manifestToOmegaTree as manifestToTree };

export function omegaTreeToManifest(tree: OmegaNode): Partial<OMEGA_Manifest> {
  const legacyProjections = treeToLegacyManifest(tree);
  return {
    nodes: [tree],
    ui: {
      ...legacyProjections,
      tree,
      useUCA: true,
      dimensions: undefined
    }
  } as Partial<OMEGA_Manifest>;
}

export { omegaTreeToManifest as treeToManifest };

export function congealSnapshot(node: OmegaNode, template: CellTemplate): OmegaNode {
  const blueprint = JSON.parse(JSON.stringify(template.baseNode)) as OmegaNode;

  const mergeWithOverrides = (base: Record<string, unknown>, overrides: Record<string, unknown>): unknown => {
    const result = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    for (const [path, value] of Object.entries(overrides)) {
      const parts = path.split('.');
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part === undefined) continue;
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
      const lastPart = parts[parts.length - 1];
      if (lastPart !== undefined) {
        current[lastPart] = value;
      }
    }
    return result;
  };

  const applySlotMappings = (n: OmegaNode, mappings: Record<string, string>) => {
    if (n.bind && mappings[n.bind]) {
      n.bind = mappings[n.bind] || undefined;
    }
    if (n.children) {
      n.children.forEach(child => applySlotMappings(child, mappings));
    }
  };

  const congealed = mergeWithOverrides(blueprint as unknown as Record<string, unknown>, node.overrides || {}) as OmegaNode;

  if (node.slotMappings) {
    applySlotMappings(congealed, node.slotMappings);
  }

  congealed.id = node.id;
  return congealed;
}
