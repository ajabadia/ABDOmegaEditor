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
