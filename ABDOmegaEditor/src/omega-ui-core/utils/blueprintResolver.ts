/**
 * @purpose Normaliza y resuelve objetos OmegaNode estableciendo roles y layouts por defecto, garantizando una estructura consistente para los procesos en el editor de manifesto OMEGA.
 * @purpose_en Normalizes and resolves OmegaNode objects by setting default roles and layouts, ensuring a consistent structure for processes in the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:169ytir
 * @lastUpdated 2026-06-15T16:55:21.526Z
 */

import type { OmegaNode } from '../types/manifest';

export class BlueprintResolver {
  public static resolve(node: OmegaNode): OmegaNode {
    const canonical = JSON.parse(JSON.stringify(node)) as OmegaNode;
    normalizeNode(canonical);
    return canonical;
  }
}

function normalizeNode(node: OmegaNode): void {
  if (!node.role) {
    node.role = (node.kind === 'asset-layer' || node.kind === 'layer') ? 'decor' : 'control';
  }

  if (!node.layout) {
    node.layout = { pos: { x: 0, y: 0 } };
  }

  if (node.children) {
    node.children.forEach(normalizeNode);
  }
}
