import type { ManifestEntity, OmegaNode, Attachment } from '@/omega-ui-core/types/manifest';

/**
 * OMEGA Identity Governance (Phase 9.1)
 * Utilities for deep cloning and recursive ID regeneration.
 * Resolves RISK-004 (ID Collisions in Cross-Doc/Blueprint workflows).
 */

/**
 * Regenerates the ID of a flat ManifestEntity and its internal attachments.
 */
export const regenerateEntityId = (entity: ManifestEntity): ManifestEntity => {
  const newId = `ent_${crypto.randomUUID().slice(0, 8)}`;
  
  // Deep clone to avoid mutations
  const cloned = structuredClone(entity);
  cloned.id = newId;

  // Regenerate attachment IDs if they exist
  if (cloned.presentation?.attachments) {
    cloned.presentation.attachments = cloned.presentation.attachments.map((att: Attachment) => ({
      ...att,
      id: `att_${crypto.randomUUID().slice(0, 8)}`
    }));
  }

  return cloned;
};

/**
 * Recursively clones an OmegaNode tree and regenerates ALL IDs.
 * Returns both the new tree and a map of old->new IDs for reference updates.
 */
export const cloneAndRegenerateNodeIds = (node: OmegaNode): { node: OmegaNode; idMap: Record<string, string> } => {
  const idMap: Record<string, string> = {};

  const processNode = (n: OmegaNode): OmegaNode => {
    const oldId = n.id;
    const newId = `node_${crypto.randomUUID().slice(0, 8)}`;
    idMap[oldId] = newId;

    const cloned: OmegaNode = {
      ...structuredClone(n),
      id: newId
    };

    if (cloned.children && cloned.children.length > 0) {
      cloned.children = cloned.children.map(child => processNode(child));
    }

    return cloned;
  };

  const newNode = processNode(node);
  return { node: newNode, idMap };
};
