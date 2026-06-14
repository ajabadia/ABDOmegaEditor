/**
 * @purpose Validador de grafos de blueprint que verifica unicidad de IDs, presencia de campos requeridos y emite errores/warnings estructurales
 * @lastUpdated 2026-06-14T17:45:00.000Z
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
