/**
 * @purpose Valida manifestación OMEGA para problemas de modulación circular detectando ciclos en conexiones de nodos.
 * @purpose_en Validates OMEGA manifest for circular modulation issues by detecting cycles in node connections.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:4hfafa
 * @lastUpdated 2026-06-15T16:55:36.343Z
 */

import type { OMEGA_Manifest, OMEGA_Modulation } from '../types/manifest';
import type { ValidationIssue } from '../types/validation';

function getSource(mod: OMEGA_Modulation): string {
  return typeof mod.source === 'string' ? mod.source : '';
}

function getTarget(mod: OMEGA_Modulation): string {
  return typeof mod.target === 'string' ? mod.target : '';
}

export class CircularityAuditor {
  static validate(manifest: OMEGA_Manifest): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const modulations = manifest.modulations || [];

    if (modulations.length === 0) return issues;

    const adj = new Map<string, Set<string>>();

    for (const mod of modulations) {
      const source = getSource(mod);
      const target = getTarget(mod);

      const sourceNode = source.split('/')[0] || source;
      const targetNode = target.split('/')[0] || target;

      if (!adj.has(sourceNode)) adj.set(sourceNode, new Set());
      adj.get(sourceNode)!.add(targetNode);
    }

    const links = manifest.links || [];
    for (const link of links) {
      if (link.kind === 'modulation') {
        const source = typeof link.source === 'string' ? link.source : '';
        const target = typeof link.target === 'string' ? link.target : '';

        const sourceNode = source.split('/')[0] || source;
        const targetNode = target.split('/')[0] || target;

        if (!adj.has(sourceNode)) adj.set(sourceNode, new Set());
        adj.get(sourceNode)!.add(targetNode);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    function dfs(node: string, path: string[]): void {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adj.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, path);
          } else if (recStack.has(neighbor)) {
            const cycleStart = path.indexOf(neighbor);
            const cycle = path.slice(cycleStart);
            issues.push({
              path: cycle.join('/'),
              message: `Circular modulation detected: ${cycle.join(' -> ')}`,
              keyword: 'circularity',
              severity: 'error'
            });
          }
        }
      }

      recStack.delete(node);
      path.pop();
    }

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return issues;
  }
}
