import type { OmegaNode, OMEGA_Manifest } from '../types/manifest';

/**
 * OMEGA UCA - Blueprint Validator (Phase 20.4)
 * Ensures structural integrity and invariant compliance before instantiation.
 * 
 * Rules:
 * 1. Errors are BLOCKING (must prevent materialization).
 * 2. Validates uniqueness, bindings, resources, and cycles.
 */
export class BlueprintValidator {
  /**
   * Validates a Blueprint against OMEGA industrial invariants.
   * Throws an error if validation fails.
   */
  public static validate(nodes: OmegaNode | OmegaNode[], manifest: Partial<OMEGA_Manifest>): void {
    const ids = new Set<string>();
    const errors: string[] = [];

    const nodesToValidate = Array.isArray(nodes) ? nodes : [nodes];

    nodesToValidate.forEach(node => {
      this.traverseAndValidate(node, manifest, ids, errors, []);
    });

    if (errors.length > 0) {
      throw new Error(`[BLUEPRINT VALIDATION FAILED]\n${errors.join('\n')}`);
    }
  }

  private static traverseAndValidate(
    node: OmegaNode, 
    manifest: Partial<OMEGA_Manifest>, 
    ids: Set<string>, 
    errors: string[],
    path: string[]
  ): void {
    const currentPath = [...path, node.id];

    // 1. Uniqueness check
    if (ids.has(node.id)) {
      errors.push(`Duplicate ID detected: "${node.id}" at path ${currentPath.join(' > ')}`);
    }
    ids.add(node.id);

    // 2. Cycle detection (Already handled by depth recursion, but for safety)
    if (path.includes(node.id)) {
       errors.push(`Structural cycle detected: "${node.id}" is its own ancestor.`);
       return; // Stop recursion for this branch
    }

    // 3. Required Fields for Cells
    if (node.kind === 'cell') {
      if (!node.cellRef) {
        errors.push(`Cell node "${node.id}" is missing "cellRef".`);
      }
      // If it's a control, it usually needs a bind
      if (node.role === 'control' && !node.bind) {
        // Warning or error? User said "blocking invariants". 
        // For industrial certification, we want strict bindings.
        errors.push(`Control cell "${node.id}" is missing "bind" target.`);
      }
    }

    // 4. Resource Check (Assets)
    if (node.style?.asset) {
      const assetExists = manifest.resources?.assets?.some(a => a.id === node.style?.asset);
      if (!assetExists) {
         errors.push(`Missing asset resource: "${node.style.asset}" referenced by node "${node.id}".`);
      }
    }

    // 5. Recurse
    if (node.children) {
      node.children.forEach(child => this.traverseAndValidate(child, manifest, ids, errors, currentPath));
    }
  }
}
