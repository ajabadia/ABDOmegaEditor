import type { OMEGA_Manifest } from '../../types/manifest';
import type { ValidationIssue } from '../../types/validation';
import { parsePath } from './pathResolver';

/**
 * OMEGA Phase 17.2/3 - Circularity Auditor (Robust Component)
 * Detects signal feedback loops in the modulation graph.
 * Updated to use the unified PathResolver utility.
 */
export class CircularityAuditor {
  
  /**
   * Validates the modulation graph for circular dependencies.
   * Returns a list of ValidationIssues for any detected cycles.
   */
  static validate(manifest: OMEGA_Manifest): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const modulations = manifest.modulations || [];

    if (modulations.length === 0) return issues;

    // 1. Build Adjacency List
    // Phase 17.3 Rule: Node-level detection via unified parsePath.
    const adj = new Map<string, Set<string>>();
    
    // A. Legacy Modulations
    for (const mod of modulations) {
      const { nodePath: sourceNode } = parsePath(mod.source);
      const { nodePath: targetNode } = parsePath(mod.target);

      if (!adj.has(sourceNode)) adj.set(sourceNode, new Set());
      adj.get(sourceNode)!.add(targetNode);
    }

    // B. Canonical OmegaLinks (Phase 18)
    const links = manifest.links || [];
    for (const link of links) {
      if (link.kind === 'modulation') {
        const { nodePath: sourceNode } = parsePath(link.source);
        const { nodePath: targetNode } = parsePath(link.target);

        if (!adj.has(sourceNode)) adj.set(sourceNode, new Set());
        adj.get(sourceNode)!.add(targetNode);
      }
    }

    // 2. DFS for Cycle Detection
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];

    const findCycles = (node: string, path: string[]) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adj.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            findCycles(neighbor, [...path]);
          } else if (recStack.has(neighbor)) {
            // Cycle detected!
            const cycleStartIdx = path.indexOf(neighbor);
            cycles.push(path.slice(cycleStartIdx));
          }
        }
      }

      recStack.delete(node);
    };

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        findCycles(node, []);
      }
    }

    // 3. Map Cycles to ValidationIssues
    for (const cycle of cycles) {
      issues.push({
        path: '/modulations',
        message: `CRITICAL SIGNAL LOOP: Se ha detectado un bucle de modulación: ${cycle.join(' -> ')} -> ${cycle[0]}. Esto puede causar inestabilidad en el motor DSP.`,
        keyword: 'uca_circularity_error',
        severity: 'error'
      });
    }

    return issues;
  }
}
