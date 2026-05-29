import type { 
  OMEGA_Manifest, 
  BlueprintDefinition, 
  BlueprintAutoWireDecision,
  OmegaNode
} from '../../types/manifest';

/**
 * OMEGA Phase 9.4A - Auto-Wire Resolver (Industrial Core)
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
      
      if (nextManifest.ui.tree) {
        this.walkTree(nextManifest.ui.tree, (node) => {
          if (node.kind === 'cell' && (!node.bind || node.bind === 'none')) {
            const candidateId = allEntities.find(e => e.id === node.id || e.label === node.id)?.id;
            if (candidateId) {
              node.bind = candidateId;
              decisions.push({
                nodeId: node.id,
                targetId: candidateId,
                strategy: 'strict',
                status: 'bound' as const,
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
