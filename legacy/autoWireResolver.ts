'use client';

import { 
  OMEGA_Manifest, 
  BlueprintDefinition, 
  BlueprintAutoWireDecision,
  OmegaNode
} from '@/omega-ui-core/types/manifest';

/**
 * OMEGA Phase 9.4A - Auto-Wire Resolver (Industrial)
 * Implements strict, deterministic signal matching for industrial blueprints.
 */
export class AutoWireResolver {
  
  /**
   * Resolves automatic wiring between an injected node and the existing manifest.
   */
  public resolve(
    manifest: OMEGA_Manifest, 
    blueprint: BlueprintDefinition
  ): { decisions: BlueprintAutoWireDecision[]; updatedManifest: OMEGA_Manifest } {
    
    const decisions: BlueprintAutoWireDecision[] = [];
    const mode = blueprint.autoWirePolicy?.mode || 'none';
    
    if (mode === 'none') {
      return { decisions, updatedManifest: manifest };
    }

    // Phase 11 Implementation: Strict mode (Exact Match by tag/id)
    if (mode === 'strict') {
      const nextManifest = { ...manifest };
      const allEntities = [...(nextManifest.ui.controls || []), ...(nextManifest.ui.jacks || [])];
      
      // Auto-wire modulations if the blueprint defines intention-based wiring
      // We look for cells that have a cellRef and try to bind their 'bind' field
      // to existing contract parameters or existing entity IDs if applicable.
      
      // Industrial Rule: We only auto-wire EMPTY bindings to avoid breaking user intent.
      if (nextManifest.ui.tree) {
        this.walkTree(nextManifest.ui.tree, (node) => {
          if (node.kind === 'cell' && (!node.bind || node.bind === 'none')) {
            // Try to find a match in the manifest's entities or contract
            const candidateId = allEntities.find(e => e.id === node.id || e.label === node.id)?.id;
            if (candidateId) {
              node.bind = candidateId;
              decisions.push({
                type: 'AUTO_BIND',
                nodeId: node.id,
                targetId: candidateId,
                reason: 'Strict ID/Label match'
              });
            }
          }
        });
      }

      return { 
        decisions, 
        updatedManifest: nextManifest 
      };
    }

    return { 
      decisions, 
      updatedManifest: manifest 
    };
  }

  private walkTree(node: OmegaNode, callback: (n: OmegaNode) => void) {
    callback(node);
    node.children?.forEach((c: OmegaNode) => this.walkTree(c, callback));
  }
}
