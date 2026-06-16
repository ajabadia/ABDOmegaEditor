/**
 * @purpose Gestiona la resolución y validación de rutas para nodos y puertos en las utilidades centrales del editor de manifesto OMEGA.
 * @purpose_en Manages the resolution and validation of paths for nodes and ports in the OMEGA manifest editor's central utilities.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:1rasuep
 * @lastUpdated 2026-06-15T16:56:27.073Z
 */

import type { OmegaNode, UCA_Port } from '../types/manifest';

export interface PathResolutionResult {
  path: string;
  node?: OmegaNode;
  port?: UCA_Port;
  error?: string;
}

export class ucaPathResolver {
  static resolvePath(nodeId: string, root: OmegaNode): string {
    const segments: string[] = [];

    const findPath = (current: OmegaNode, targetId: string, currentPath: string[]): boolean => {
      if (current.id === targetId) {
        segments.push(...currentPath, current.id);
        return true;
      }

      if (current.children) {
        for (const child of current.children) {
          if (findPath(child, targetId, [...currentPath, current.id])) {
            return true;
          }
        }
      }

      return false;
    };

    if (!findPath(root, nodeId, [])) {
      throw new Error(`[HPA] Node ${nodeId} not found in the provided tree context.`);
    }

    return segments.join('/');
  }

  static resolvePortPath(nodeId: string, portId: string, root: OmegaNode): string {
    const nodePath = this.resolvePath(nodeId, root);
    return `${nodePath}/ports/${portId}`;
  }

  static resolveNodeByPath(path: string, root: OmegaNode): OmegaNode | undefined {
    const segments = path.split('/');
    if (segments[0] !== root.id) return undefined;

    let current: OmegaNode = root;
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      if (segment === 'ports') break;

      const found = current.children?.find(c => c.id === segment);
      if (!found) return undefined;
      current = found;
    }

    return current;
  }

  static validatePathStability(path: string): boolean {
    const segments = path.split('/');
    for (const segment of segments) {
      if (/^\d+$/.test(segment)) return false;
    }
    return true;
  }
}
