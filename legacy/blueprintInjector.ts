import { 
  OMEGA_Manifest,
  BlueprintDefinition, 
  OmegaNode, 
  BlueprintPlaceholderValues,
  BlueprintPlaceholderDefinition,
  OmegaBlueprintNode
} from '@/omega-ui-core/types/manifest';
import { 
  BlueprintInjectionRequest, 
  BlueprintInjectionResult, 
  BlueprintInjectionReport,
  BlueprintValidationIssue,
  BlueprintInsertionStrategy
} from '../types/blueprint';
import { IdManager } from './idManager';
import { AutoWireResolver } from './autoWireResolver';
import { manifestToTree, treeToManifest } from '@/omega-ui-core/uca/ucaBridge';

/**
 * OMEGA Phase 9.4A - Blueprint Injector Engine (Industrial Revision)
 * Implements the 10-step pipeline defined in ADR-011 §B.2.
 */
export class BlueprintInjector {
  private autoWireResolver = new AutoWireResolver();

  /**
   * Main Entry Point - 10-Step Pipeline
   */
  public async inject(
    manifest: OMEGA_Manifest,
    blueprint: BlueprintDefinition,
    request: BlueprintInjectionRequest
  ): Promise<BlueprintInjectionResult> {
    const startTime = Date.now();
    
    // 0. Aseptic Tree Initialization (Phase 10.1)
    const activeManifest = { ...manifest };
    if (!activeManifest.ui.tree) {
      activeManifest.ui = {
        ...activeManifest.ui,
        tree: manifestToTree(activeManifest)
      };
    }

    const report: BlueprintInjectionReport = {
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.version,
      timestamp: new Date().toISOString(),
      mode: request.mode,
      dryRun: request.strategy.dryRun,
      compatibilityStatus: 'unknown',
      validationIssues: [],
      idRemapLog: {},
      autoWireDecisions: [],
      insertedNodeIds: [],
      createdWireIds: [],
      durationMs: 0
    };

    try {
      // 1. Structural Pre-validation
      if (!blueprint.rootNode) {
        return this.fatal('INVALID_BLUEPRINT', 'Blueprint missing rootNode.', report);
      }

      // 2. Compatibility Check
      const parentNode = this.findNode(activeManifest.ui?.tree, request.strategy.targetParentNodeId);
      if (request.strategy.targetParentNodeId && !parentNode) {
        return this.fatal('MISSING_PARENT', `Target parent '${request.strategy.targetParentNodeId}' not found.`, report);
      }
      
      const compIssues = this.validateCompatibility(blueprint, parentNode || null);
      report.validationIssues.push(...compIssues);
      report.compatibilityStatus = compIssues.some(i => i.severity === 'error') ? 'incompatible' : 'compatible';
      
      if (report.compatibilityStatus === 'incompatible') {
        return this.fatal('INCOMPATIBLE_CONTEXT', 'Blueprint compatibility check failed.', report);
      }

      // 3. Semantic Pre-validation (ERA 7.2.3 Step 2.B)
      const preSemanticIssues = this.performSemanticValidation(blueprint, null);
      report.validationIssues.push(...preSemanticIssues);
      if (preSemanticIssues.some(i => i.severity === 'error')) {
        return this.fatal('PRE_SEMANTIC_FAILURE', 'Blueprint failed initial semantic validation.', report);
      }

      // 4. Placeholder Materialization
      const resolvedValues = this.resolvePlaceholders(blueprint.placeholders, request.placeholderValues);
      let materializedNode = this.materializeSubtree(blueprint.rootNode, resolvedValues);

      // 5. Identity Governance (ID Remapping)
      const idManager = new IdManager(activeManifest);
      if (request.strategy.forceIdRemap) {
        const { node: remappedNode, remapLog } = idManager.remapSubtree(materializedNode as unknown as OmegaNode);
        materializedNode = remappedNode as unknown as OmegaBlueprintNode;
        report.idRemapLog = remapLog;
      }

      // 6. Semantic Validation (Post-materialization)
      const postSemanticIssues = this.performSemanticValidation(blueprint, materializedNode as unknown as OmegaNode);
      report.validationIssues.push(...postSemanticIssues);
      if (postSemanticIssues.some(i => i.severity === 'error')) {
        return this.fatal('SEMANTIC_FAILURE', 'Materialized subtree failed semantic validation.', report);
      }

      // 7. Tree Integration (Merge)
      let nextManifest = this.performMerge(activeManifest, materializedNode as unknown as OmegaNode, request.strategy);

      // 8. Auto-wiring Resolution
      const { decisions, updatedManifest } = this.autoWireResolver.resolve(
        nextManifest, 
        blueprint
      );
      report.autoWireDecisions = decisions;
      nextManifest = updatedManifest;

      // 9. Snapshot Generation (Optional Phase 9.4B)
      if (blueprint.materializeSnapshot) {
        // Reserved for Phase 9.4B: Congealing physical snapshots
      }

      // 10. Commit or Dry-Run Return
      report.durationMs = Date.now() - startTime;
      report.insertedNodeIds = [materializedNode.id];

      return {
        success: true,
        mode: request.mode,
        resultManifest: request.strategy.dryRun ? undefined : nextManifest,
        injectedSubtree: materializedNode as unknown as OmegaNode,
        report
      };

    } catch (err) {
      report.durationMs = Date.now() - startTime;
      return this.fatal('INTERNAL_ERROR', err instanceof Error ? err.message : String(err), report);
    }
  }

  /**
   * Validates compatibility constraints.
   */
  private validateCompatibility(blueprint: BlueprintDefinition, parent: OmegaNode | null): BlueprintValidationIssue[] {
    const issues: BlueprintValidationIssue[] = [];
    const comp = blueprint.compatibility;

    if (parent && comp.allowedParentKinds && comp.allowedParentKinds.length > 0) {
      if (!comp.allowedParentKinds.includes(parent.kind)) {
        issues.push({
          severity: 'error',
          code: 'INCOMPATIBLE_PARENT_KIND',
          message: `Blueprint '${blueprint.name}' cannot be inserted into parent of kind '${parent.kind}'.`,
          suggestion: `Allowed: ${comp.allowedParentKinds.join(', ')}`
        });
      }
    }

    if (parent && comp.deniedParentKinds && comp.deniedParentKinds.includes(parent.kind)) {
      issues.push({
        severity: 'error',
        code: 'DENIED_PARENT_KIND',
        message: `Blueprint '${blueprint.name}' is explicitly denied for parent kind '${parent.kind}'.`
      });
    }

    return issues;
  }

  /**
   * Placeholder resolution logic.
   */
  private resolvePlaceholders(
    definitions: BlueprintPlaceholderDefinition[], 
    provided: BlueprintPlaceholderValues
  ): BlueprintPlaceholderValues {
    const resolved: BlueprintPlaceholderValues = { ...provided };
    definitions.forEach(def => {
      if (resolved[def.id] === undefined) {
        if (def.required) throw new Error(`Missing required parameter: ${def.id}`);
        resolved[def.id] = def.defaultValue;
      }
    });
    return resolved;
  }

  /**
   * Materializes variables into the subtree.
   * Supports basic expression evaluation (Phase 11 Extension)
   */
  private materializeSubtree(root: OmegaBlueprintNode, values: BlueprintPlaceholderValues): OmegaBlueprintNode {
    let json = JSON.stringify(root);
    
    // 1. Literal Substitution
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\s*\\}\\}`, 'g');
      json = json.replace(regex, String(value));
    });

    // 2. Expression Evaluation (e.g. {{x + 10}})
    // Simple regex for basic arithmetic placeholders
    const exprRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*([\+\-\*\/])\s*([0-9\.]+)\s*\}\}/g;
    json = json.replace(exprRegex, (match, varName, op, valStr) => {
      const baseVal = Number(values[varName]);
      const modifier = Number(valStr);
      if (isNaN(baseVal) || isNaN(modifier)) return match;
      
      switch(op) {
        case '+': return String(baseVal + modifier);
        case '-': return String(baseVal - modifier);
        case '*': return String(baseVal * modifier);
        case '/': return String(baseVal / modifier);
        default: return match;
      }
    });

    return JSON.parse(json);
  }

  /**
   * Splices the node into the manifest tree.
   */
  private performMerge(manifest: OMEGA_Manifest, node: OmegaNode, strategy: BlueprintInsertionStrategy): OMEGA_Manifest {
    const tree = manifest.ui?.tree;
    if (!tree) throw new Error('Manifest tree not found.');

    const targetId = strategy.targetParentNodeId || tree.id;
    const updateTree = (root: OmegaNode): OmegaNode => {
      if (root.id === targetId) {
        const children = [...(root.children || [])];
        if (strategy.insertAtIndex !== undefined) {
          children.splice(strategy.insertAtIndex, 0, node);
        } else {
          children.push(node);
        }
        return { ...root, children };
      }
      if (root.children) {
        return { ...root, children: root.children.map(c => updateTree(c)) };
      }
      return root;
    };

    const nextTree = updateTree(tree);
    const legacyProjections = treeToManifest(nextTree);

    return {
      ...manifest,
      ui: { 
        ...manifest.ui, 
        tree: nextTree,
        controls: legacyProjections.controls || manifest.ui.controls || [],
        jacks: legacyProjections.jacks || manifest.ui.jacks || [],
        layout: {
          ...manifest.ui.layout,
          containers: legacyProjections.layout?.containers || manifest.ui.layout?.containers || []
        }
      }
    };
  }

  /**
   * High-level semantic check (Phase 11 Implementation).
   */
  private performSemanticValidation(blueprint: BlueprintDefinition, materializedNode: OmegaNode | null): BlueprintValidationIssue[] {
    const issues: BlueprintValidationIssue[] = [];
    
    // 1. Recursive Loop Detection (Genetic Guard)
    const detectLoop = (node: OmegaBlueprintNode | OmegaNode, visited: Set<string>, path: string[] = []) => {
      if (node.kind === 'cell' && node.cellRef) {
        const ref = node.cellRef as string;
        if (visited.has(ref)) {
          issues.push({
            severity: 'error',
            code: 'RECURSIVE_TEMPLATE_LOOP',
            message: `Recursive template loop detected: ${ref}`,
            affectedNodeId: node.id
          });
          return;
        }
        visited.add(ref);
      }
      node.children?.forEach(c => detectLoop(c, new Set(visited), [...path, node.id]));
    };

    if (materializedNode) {
      detectLoop(materializedNode, new Set());
    } else {
      detectLoop(blueprint.rootNode as unknown as OmegaNode, new Set());
    }

    // 2. Slot Integrity Check
    if (materializedNode) {
      this.walkTree(materializedNode, (node) => {
        if (node.kind === 'cell' && node.slotMappings) {
          // Check if mapped slots exist (would require template definitions)
          // For now, we just ensure slotMappings is a valid record
          if (typeof node.slotMappings !== 'object') {
            issues.push({
              severity: 'error',
              code: 'INVALID_SLOT_MAPPINGS',
              message: `Entity '${node.id}' has malformed slotMappings.`,
              affectedNodeId: node.id
            });
          }
        }
      });
    }

    return issues;
  }

  private walkTree(node: OmegaNode, callback: (n: OmegaNode) => void) {
    callback(node);
    node.children?.forEach(c => this.walkTree(c, callback));
  }

  private findNode(root: OmegaNode | undefined, id: string | null): OmegaNode | undefined {
    if (!root || !id) return root;
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = this.findNode(child, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  private fatal(code: string, message: string, report: BlueprintInjectionReport): BlueprintInjectionResult {
    return {
      success: false,
      mode: report.mode,
      report,
      fatalError: { code, message }
    };
  }
}
