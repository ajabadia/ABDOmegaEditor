import type { OMEGA_Manifest, OmegaNode, BlueprintDefinition, CellTemplate, StyleVariant, OmegaStyleNode } from '../types/manifest';
import type { BlueprintInjectionRequest, BlueprintInjectionResult } from '../types/blueprint';
import { manifestToTree, treeToManifest } from './ucaBridge';

export async function injectBlueprint(
  manifest: OMEGA_Manifest,
  blueprint: BlueprintDefinition,
  request: BlueprintInjectionRequest,
  options?: {
    templates?: Record<string, CellTemplate>;
  }
): Promise<BlueprintInjectionResult> {
  const startTime = Date.now();

  const activeManifest = { ...manifest };
  const rootNode = activeManifest.nodes?.[0] || activeManifest.ui?.tree;

  if (!rootNode) {
    const initializedTree = manifestToTree(activeManifest);
    activeManifest.nodes = [initializedTree];
  } else if (!activeManifest.nodes || activeManifest.nodes.length === 0) {
    activeManifest.nodes = [rootNode];
  }

  const strategy = request.strategy;
  const targetParentNodeId = strategy.targetParentNodeId || 'root';

  const materialRoot = JSON.parse(JSON.stringify(blueprint.rootNode)) as OmegaNode;

  const findParent = (node: OmegaNode, targetId: string): OmegaNode | undefined => {
    if (node.id === targetId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findParent(child, targetId);
        if (found) return found;
      }
    }
    return undefined;
  };

  let parent = activeManifest.nodes ? findParent(activeManifest.nodes[0], targetParentNodeId) : undefined;
  if (!parent && activeManifest.nodes?.[0]) {
    parent = activeManifest.nodes[0];
  }

  const insertedNodeIds: string[] = [];
  const validationIssues: BlueprintInjectionResult['report']['validationIssues'] = [];

  if (!parent) {
    validationIssues.push({
      severity: 'error',
      code: 'PARENT_NOT_FOUND',
      message: `Target parent '${targetParentNodeId}' not found`,
      affectedNodeId: targetParentNodeId
    });
    return {
      success: false,
      mode: request.mode,
      report: {
        blueprintId: blueprint.blueprintId,
        blueprintVersion: blueprint.version,
        timestamp: new Date().toISOString(),
        mode: request.mode,
        dryRun: strategy.dryRun,
        compatibilityStatus: 'compliant',
        validationIssues,
        idRemapLog: {},
        autoWireDecisions: [],
        insertedNodeIds: [],
        createdWireIds: [],
        durationMs: Date.now() - startTime
      }
    };
  }

  // ── Paso 9: Blueprint Style Fusion ──────────────────────────────────
  const mergedStyles = mergeBlueprintStyles(activeManifest, blueprint, materialRoot);
  if (mergedStyles) {
    activeManifest.ui = { ...activeManifest.ui, styles: mergedStyles };
  }

  // ── S4: Keep user-selected coordinates (do not relocate on collision) ────────────────
  const currentPos = materialRoot.layout?.pos || { x: 10, y: 10 };
  materialRoot.layout = {
    ...materialRoot.layout,
    pos: currentPos,
  };

  const insertAtIndex = strategy.insertAtIndex ?? -1;
  const idx = insertAtIndex >= 0 ? insertAtIndex : (parent.children?.length || 0);

  const materialRootId = materialRoot.id || `bp_${Date.now()}`;
  parent.children = [
    ...(parent.children?.slice(0, idx) || []),
    materialRoot,
    ...(parent.children?.slice(idx) || [])
  ];
  insertedNodeIds.push(materialRootId);

  if (options?.templates) {
    const materializeTemplate = (node: OmegaNode): OmegaNode => {
      const cellRef = node.cellRef;
      if (cellRef && options.templates?.[cellRef]) {
        const template = options.templates[cellRef];
        return {
          ...template.baseNode,
          ...node,
          id: node.id,
          style: { ...template.baseNode.style, ...node.style },
          layout: { ...template.baseNode.layout, ...node.layout }
        };
      }
      if (node.children) {
        return { ...node, children: node.children.map(materializeTemplate) };
      }
      return node;
    };
    materialRoot.children = (materialRoot.children || []).map(materializeTemplate);
  }

  activeManifest.nodes = [activeManifest.nodes?.[0] || manifestToTree(activeManifest)];
  activeManifest.ui = {
    ...activeManifest.ui,
    ...treeToManifest(activeManifest.nodes[0]),
    useUCA: true
  };

  return {
    success: validationIssues.length === 0,
    mode: request.mode,
    resultManifest: activeManifest,
    injectedSubtree: materialRoot,
    report: {
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.version,
      timestamp: new Date().toISOString(),
      mode: request.mode,
      dryRun: strategy.dryRun,
      compatibilityStatus: 'compliant',
      validationIssues,
      idRemapLog: {},
      autoWireDecisions: [],
      insertedNodeIds,
      createdWireIds: [],
      durationMs: Date.now() - startTime
    }
  };
}

// ── Helper: deep equality of two OmegaStyleNode partials ──────────────
function areStylesEqual(
  a: Partial<OmegaStyleNode> | undefined,
  b: Partial<OmegaStyleNode> | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
    if ((a as Record<string, unknown>)[keysA[i]] !== (b as Record<string, unknown>)[keysB[i]]) return false;
  }
  return true;
}

// ── Paso 9: Blueprint Style Fusion ────────────────────────────────────
// Detects collisions between blueprint.ui.styles and manifest.ui.styles,
// renames conflicting variants with a `from_[blueprintId]` suffix, and
// recursively rewrites node.style.variant references in the blueprint tree.
function mergeBlueprintStyles(
  manifest: OMEGA_Manifest,
  blueprint: BlueprintDefinition,
  materialRoot: OmegaNode
): Record<string, StyleVariant[]> | null {
  const bpStyles = blueprint.ui?.styles;
  if (!bpStyles || Object.keys(bpStyles).length === 0) return null;

  // Clone destination styles (immutable pattern)
  const newStyles: Record<string, StyleVariant[]> = {
    ...(manifest.ui?.styles || {}),
  };

  for (const [cellRef, bpVariants] of Object.entries(bpStyles)) {
    if (!bpVariants || bpVariants.length === 0) continue;

    // Ensure entry exists in destination
    if (!newStyles[cellRef]) {
      newStyles[cellRef] = [];
    }

    for (const bpVariant of bpVariants) {
      const existingIdx = newStyles[cellRef].findIndex(
        (v) => v.id === bpVariant.id
      );

      if (existingIdx === -1) {
        // Case A: No conflict — inject as-is
        newStyles[cellRef] = [...newStyles[cellRef], bpVariant];
      } else {
        const destVariant = newStyles[cellRef][existingIdx];
        if (areStylesEqual(destVariant.aesthetics, bpVariant.aesthetics)) {
          // Case B: Same aesthetics — reuse silently (no-op)
          continue;
        }
        // Case C: Collision — rename variant and rewrite tree
        const newVariantId = `${bpVariant.id}_from_${blueprint.blueprintId.toLowerCase()}`;
        // Insert renamed variant
        newStyles[cellRef] = [
          ...newStyles[cellRef],
          { ...bpVariant, id: newVariantId },
        ];
        // Rewrite variant references in-place (materialRoot is a fresh clone)
        const patchVariant = (n: OmegaNode): void => {
          if (n.cellRef === cellRef && n.style?.variant === bpVariant.id) {
            n.style = { ...n.style, variant: newVariantId };
          }
          n.children?.forEach(patchVariant);
        };
        patchVariant(materialRoot);
      }
    }
  }

  return newStyles;
}
