/**
 * @purpose Valida gráficos OmegaNode buscando IDs duplicados, campos requeridos faltantes y emitiendo errores y advertencias estructurados.
 * @purpose_en Validates OmegaNode graphs by checking for duplicate IDs, missing required fields, and emitting structured errors and warnings.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:okq0bv
 * @lastUpdated 2026-06-15T16:55:31.942Z
 */

import type { OmegaNode, OMEGA_Manifest } from '../types/manifest';

export class BlueprintValidator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public static validate(nodes: OmegaNode | OmegaNode[], _manifest: Partial<OMEGA_Manifest>): void {
    const result = this.validateQuietly(nodes);
    if (!result.valid) {
      throw new Error(`[BLUEPRINT VALIDATION FAILED]\n${result.errors.join('\n')}`);
    }
  }

  public static validateQuietly(nodes: OmegaNode | OmegaNode[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const ids = new Set<string>();
    const errors: string[] = [];
    const warnings: string[] = [];

    const nodeList = Array.isArray(nodes) ? nodes : [nodes];

    const walk = (node: OmegaNode) => {
      if (ids.has(node.id)) {
        errors.push(`[VALIDATOR] Duplicate node ID: ${node.id}`);
      }
      ids.add(node.id);

      if (!node.kind) {
        errors.push(`[VALIDATOR] Node ${node.id} is missing 'kind'`);
      }

      if (!node.layout?.pos) {
        warnings.push(`[VALIDATOR] Node ${node.id} is missing layout position`);
      }

      if (node.children) {
        node.children.forEach(walk);
      }
    };

    nodeList.forEach(walk);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
