import type { OmegaNode, OMEGA_Manifest, CellTemplate, Position } from '../types/manifest';

export interface UCADebugContext {
  enabled: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  multiSelectedIds?: string[] | undefined;
  onSelectMultiple?: ((ids: string[]) => void) | undefined;
  onUpdateNode?: ((id: string, updates: Partial<OmegaNode>) => void) | undefined;
  showLabels: boolean;
  hideDecorative: boolean;
  showCADOverlay?: boolean | undefined;
  runtimeValues?: Record<string, number> | undefined;
  lockedNodeIds?: string[] | undefined;
}

export interface UniversalRendererProps {
  key?: string | number | undefined;
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  depth?: number | undefined;
  catalog?: Record<string, CellTemplate> | undefined; 
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  debugContext?: UCADebugContext | undefined;
  parentWorldPos?: Position | undefined;
  parentNode?: OmegaNode | null | undefined;
  audit?: import('@/services/auditService').AuditResult | undefined;
}
