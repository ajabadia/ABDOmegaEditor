import { 
  OMEGA_Manifest, 
  OmegaNode, 
  CompatibilityStatus, 
  ValidationSeverity, 
  BlueprintPlaceholderValues, 
  BlueprintInsertionMode,
  IdCollisionStrategy,
  BlueprintAutoWirePolicy,
  BlueprintAutoWireDecision
} from '@/omega-ui-core/types/manifest';

/**
 * OMEGA Phase 9.4A - Blueprint Injector Operative Types
 * (§A.6 and §A.7 of the Formal Contract)
 */

export interface BlueprintInsertionStrategy {
  /** Dónde insertar en el árbol UCA. Si null → raíz. */
  targetParentNodeId: string | null;
  /** Slot del padre donde encajar */
  targetSlotId?: string | null;
  /** Posición dentro del slot */
  insertAtIndex?: number;
  /** Cómo resolver colisiones de IDs */
  idCollisionStrategy: IdCollisionStrategy;
  /** Si true, no modifica el manifiesto real (solo previsualización) */
  dryRun: boolean;
  /** Si true, fuerza remapeo de todos los IDs. RECOMENDADO: true. */
  forceIdRemap: boolean;
  /** Sobreescritura de la política de auto-wiring */
  autoWireOverride?: Partial<BlueprintAutoWirePolicy>;
}

export interface BlueprintInjectionRequest {
  blueprintId: string;
  placeholderValues: BlueprintPlaceholderValues;
  strategy: BlueprintInsertionStrategy;
  mode: BlueprintInsertionMode;
  manifestId: string;
  triggeredBy?: string;
}

export interface BlueprintValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  affectedPath?: string;
  affectedNodeId?: string;
  suggestion?: string;
}


export interface BlueprintInjectionReport {
  blueprintId: string;
  blueprintVersion: string;
  timestamp: string;
  mode: BlueprintInsertionMode;
  dryRun: boolean;
  compatibilityStatus: CompatibilityStatus;
  validationIssues: BlueprintValidationIssue[];
  idRemapLog: Record<string, string>;
  autoWireDecisions: BlueprintAutoWireDecision[];
  insertedNodeIds: string[];
  createdWireIds: string[];
  materializedSnapshot?: Record<string, unknown>;
  durationMs: number;
}

export interface BlueprintInjectionResult {
  success: boolean;
  mode: BlueprintInsertionMode;
  resultManifest?: OMEGA_Manifest;
  injectedSubtree?: OmegaNode;
  report: BlueprintInjectionReport;
  fatalError?: {
    code: string;
    message: string;
    cause?: unknown;
  };
}
