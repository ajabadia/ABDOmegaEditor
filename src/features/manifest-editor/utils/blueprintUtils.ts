'use client';

import type { 
  ModuleTemplate, 
  BlueprintDefinition, 
  BlueprintCompatibility,
  BlueprintAutoWirePolicy
} from '@/omega-ui-core/types/manifest';

/**
 * OMEGA Phase 9.4A - Canonical Blueprint Adapter
 * Ensures industrial normalization of legacy ModuleTemplates into formal BlueprintDefinitions.
 * Follows ADR-011 §A.2.
 */

export function adaptModuleTemplateToBlueprintDefinition(template: ModuleTemplate): BlueprintDefinition {
  // 1. Structural Validation (Strict Mapping)
  if (!template.id || !template.baseNode) {
    throw new Error(`[BLUEPRINT] Invalid ModuleTemplate: Missing ID or Base Node.`);
  }

  // 2. Default Compatibility (if missing)
  const compatibility: BlueprintCompatibility = template.compatibility || {
    allowedParentKinds: ['rack', 'container', 'group', 'face'],
    deniedParentKinds: ['cell']
  };

  // 3. Default Auto-wiring (if missing)
  const autoWirePolicy: BlueprintAutoWirePolicy = {
    mode: 'none'
  };

  // 4. Formal Contract Construction
  return {
    blueprintId: template.id,
    version: template.version || '1.0.0',
    name: template.label || 'Unnamed Blueprint',
    description: template.description || 'Industrial OMEGA architecture blueprint.',
    origin: 'system',
    templateId: template.id,
    rootNode: template.baseNode, 
    placeholders: [], // ModuleTemplates typically don't have placeholders in this version
    compatibility,
    autoWirePolicy,
    materializeSnapshot: false,
    defaultOverridePolicy: 'extendable'
  };
}

/**
 * Validates a blueprint against structural invariants.
 */
export function validateBlueprint(blueprint: BlueprintDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!blueprint.blueprintId) errors.push('Missing blueprintId');
  if (!blueprint.rootNode) errors.push('Missing rootNode');
  if (!blueprint.rootNode.kind) errors.push('Root node has no kind');
  
  return {
    valid: errors.length === 0,
    errors
  };
}
