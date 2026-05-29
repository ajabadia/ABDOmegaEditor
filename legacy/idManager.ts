import { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

/**
 * OMEGA Phase 9.4A - ID Manager Service
 * Centralized governance for ID uniqueness across the UCA tree.
 */
export class IdManager {
  private usedIds: Set<string>;

  constructor(manifest: OMEGA_Manifest) {
    this.usedIds = new Set();
    // 1. Scan Legacy Arrays
    (manifest.ui?.controls || []).forEach(c => this.usedIds.add(c.id));
    (manifest.ui?.jacks || []).forEach(j => this.usedIds.add(j.id));
    (manifest.ui?.layout?.containers || []).forEach(c => this.usedIds.add(c.id));
    
    // 2. Scan UCA Tree
    if (manifest.ui?.tree) {
      this.scanTree(manifest.ui.tree);
    }
  }

  /**
   * Scans the entire tree and populates the usedIds set.
   * Performance: < 5ms for ~500 nodes.
   */
  private scanTree(node: OmegaNode) {
    if (!node) return;
    this.usedIds.add(node.id);
    if (node.children) {
      node.children.forEach(child => this.scanTree(child));
    }
  }

  /**
   * Generates a unique ID with an optional prefix.
   * Guarantees no collision with the current tree.
   */
  generateId(prefix: string = 'node'): string {
    let newId: string;
    do {
      // Using 8-char suffix for industrial brevity
      newId = `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
    } while (this.usedIds.has(newId));
    
    this.usedIds.add(newId);
    return newId;
  }

  /**
   * Checks if an ID is already taken.
   */
  isTaken(id: string): boolean {
    return this.usedIds.has(id);
  }

  /**
   * Manually register an ID (used during bulk inserts).
   */
  register(id: string) {
    this.usedIds.add(id);
  }

  /**
   * Recursively remaps all IDs in a subtree.
   * Returns the new subtree and the remap log.
   */
  remapSubtree(node: OmegaNode): { node: OmegaNode; remapLog: Record<string, string> } {
    const remapLog: Record<string, string> = {};

    const process = (n: OmegaNode): OmegaNode => {
      const oldId = n.id;
      // Extract prefix from old ID if it follows OMEGA convention (e.g. "osc_123")
      const prefix = oldId.includes('_') ? oldId.split('_')[0] : 'node';
      const newId = this.generateId(prefix);
      
      remapLog[oldId] = newId;

      const cloned: OmegaNode = {
        ...structuredClone(n),
        id: newId
      };

      if (cloned.children) {
        cloned.children = cloned.children.map(c => process(c));
      }

      return cloned;
    };

    const newNode = process(node);
    return { node: newNode, remapLog };
  }
}
