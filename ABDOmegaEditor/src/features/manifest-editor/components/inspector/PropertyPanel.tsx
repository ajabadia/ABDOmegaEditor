'use client';

/**
 * @purpose Renderiza un panel para inspeccionar y editar propiedades de entidades manifestadas en OMEGA, incorporando secciones especializadas para diferentes aspectos de las entidades.
 * @purpose_en Renders a panel for inspecting and editing properties of manifest entities in OMEGA, incorporating various specialized sections for different aspects of the entities.
 * @refactorable true (contains too many nested components and conditional logic)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:24,sig:1r05nws
 * @lastUpdated 2026-06-20T20:07:23.322Z
 */

import type { ManifestEntity, OMEGA_Manifest, OMEGA_Modulation, LayoutContainer, ExtraResource, OmegaNode, HybridEntityUpdate } from '@/omega-ui-core/types/manifest';

// Specialized Sections
import IdentitySection from '@/features/manifest-editor/components/inspector/sections/IdentitySection';
import LogicSection from '@/features/manifest-editor/components/inspector/sections/LogicSection';
import AestheticSection from '@/features/manifest-editor/components/inspector/sections/AestheticSection';
import AttachmentsSection from '@/features/manifest-editor/components/inspector/sections/AttachmentsSection';
import EngineeringSection from '@/features/manifest-editor/components/inspector/sections/EngineeringSection';
import ModuleArchitectureSection from '@/features/manifest-editor/components/inspector/sections/ModuleArchitectureSection';
import LayoutGovernanceSection from '@/features/manifest-editor/components/inspector/sections/LayoutGovernanceSection';
import CellPreview from '@/features/manifest-editor/components/inspector/CellPreview';
import type { GroupNode } from '@/omega-ui-core/types/rack';
import CustomSkinSection from '@/features/manifest-editor/components/inspector/sections/CustomSkinSection';

// Merged Identity sections
import ModuleIdentitySection from '@/features/manifest-editor/components/inspector/sections/module/ModuleIdentitySection';
import ModuleChassisSection from '@/features/manifest-editor/components/inspector/sections/module/ModuleChassisSection';
import ModuleSkinSelector from '@/features/manifest-editor/components/inspector/sections/identity/ModuleSkinSelector';
import ModulePlaneSelector from '@/features/manifest-editor/components/inspector/sections/identity/ModulePlaneSelector';

// Layout Components & Hooks
import InspectorHeader from '@/features/manifest-editor/components/inspector/layout/InspectorHeader';
import { isUcaNode } from '@/features/manifest-editor/hooks/entities/ucaInspectorModel';

// Extraídos — hooks y componente
import NodeComponentEditor from '@/features/manifest-editor/components/inspector/NodeComponentEditor';
import { useInspectorSections } from '@/features/manifest-editor/hooks/inspector/useInspectorSections';
import { useLiveInspectorItem } from '@/features/manifest-editor/hooks/inspector/useLiveInspectorItem';
import { useBulkIntersection } from '@/features/manifest-editor/hooks/inspector/useBulkIntersection';

// ── Categorized sub-interfaces ────────────────────────────────────

interface ItemProps {
  item: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  resolveAsset: (id: string | undefined) => string | undefined;
  manifest: OMEGA_Manifest;
  highlightPath?: (string | null) | undefined;
  availableBinds?: string[] | undefined;
}

interface CallbackProps {
  onClose?: (() => void) | undefined;
  onUpdate?: ((updates: Partial<OMEGA_Manifest> | HybridEntityUpdate) => void) | undefined;
  onUpdateItem?: ((id: string, updates: HybridEntityUpdate) => void) | undefined;
  onSelectItem?: ((id: string | null) => void) | undefined;
  onAddEntity?: ((type: 'control' | 'jack') => void) | undefined;
  onDuplicateItem?: ((id: string) => void) | undefined;
  onRemoveItem?: ((id: string) => void) | undefined;
  onHelp?: ((sectionId: string) => void) | undefined;
  onOpenConfig?: (() => void) | undefined;
  onOpenLibrary?: (() => void) | undefined;
}

interface ModulationProps {
  onAddModulation?: ((mod: OMEGA_Modulation) => void) | undefined;
  onRemoveModulation?: ((id: string) => void) | undefined;
  onUpdateModulation?: ((id: string, updates: Partial<OMEGA_Modulation>) => void) | undefined;
  onOpenModGrid?: (() => void) | undefined;
}

interface ContainerProps {
  addContainer?: ((c?: Partial<LayoutContainer> | undefined) => void) | undefined;
  updateContainer?: ((id: string, updates: Partial<LayoutContainer>) => void) | undefined;
  removeContainer?: ((id: string) => void) | undefined;
}

interface BlueprintProps {
  exportSelectedAsBlueprint?: ((id: string) => void) | undefined;
  onSaveGroupAsBlueprint?: ((groupNode: GroupNode, exposedParams?: import('@/features/manifest-editor/components/modals/ExposeParametersDialog').ExposedParam[]) => void) | undefined;
  onUngroupNode?: ((groupId: string) => void) | undefined;
}

interface ResourceProps {
  extraResources?: ExtraResource[] | undefined;
  onTriggerUpload?: ((id: string) => void) | undefined;
  onRemoveResource?: ((name: string) => void) | undefined;
}

interface DisplayProps {
  uiTheme?: ('dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast') | undefined;
  activeTab?: string | undefined;
  mode?: 'active' | 'reference' | 'readonly' | 'bulk';
  multiSelectedIds?: string[];
  isPinned?: boolean;
  onPin?: () => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  activeSection?: string | undefined;
  visibleSections?: {
      identity?: boolean;
      essentialIdentity?: boolean;
      globalUiSkin?: boolean;
      activeConstructionPlane?: boolean;
      physicalEmulationProfile?: boolean;
      aestheticsGlobals?: boolean;
      aestheticsElements?: boolean;
      architecture?: boolean;
      diagnostics?: boolean;
    } | undefined;
}

export type PropertyPanelProps = ItemProps & CallbackProps & ModulationProps & ContainerProps & BlueprintProps & ResourceProps & DisplayProps;

import TieredSection from './TieredSection';
import InspectorNav from '@/components/ui/InspectorNav';
import { Info, Layout, Palette, Zap, Play, Square, Activity, Box, Cpu, Paintbrush, Layers } from 'lucide-react';
import { useDryRunSimulation } from '@/features/manifest-editor/hooks/useDryRunSimulation';

export default function PropertyPanel(props: PropertyPanelProps) {
  const item = props.item;
  const isModule = Boolean(item && !('kind' in item));
  const mode = props.mode || 'active';
  const isReadOnly = mode === 'readonly' || mode === 'reference';
  const isBulk = mode === 'bulk';

  // ── Live item rehydration + enriched manifest ─────────────────────
  const { liveItem, enrichedManifest, rootTree } = useLiveInspectorItem({
    item,
    manifest: props.manifest,
    extraResources: props.extraResources,
  });

  // ── Section definitions + active section state ────────────────────
  const { sectionDefs, activeSection, setActiveSection } = useInspectorSections({
    isModule,
    isBulk,
    visibleSections: props.visibleSections,
    inspectorLevel: props.inspectorLevel,
    activeSectionProp: props.activeSection,
  });

  const itemId = (item && 'id' in item ? item.id : 'MANIFEST') || 'MANIFEST';
  const { isPlaying, toggleSimulation } = useDryRunSimulation(isModule || isBulk ? null : itemId);

  const bulkIntersection = useBulkIntersection(props.multiSelectedIds, props.manifest);

  if (!item || !liveItem) return null;

  return (
    <div className={`h-full wb-surface border-l wb-outline flex flex-col shadow-2xl overflow-hidden transition-all duration-500 ${mode === 'active' ? 'ring-1 ring-primary/20 shadow-[inset_0_0_40px_rgba(var(--primary-rgb),0.02)]' : 'opacity-90 shadow-none'}`}>
      <InspectorHeader
        id={isBulk ? `${props.multiSelectedIds?.length} Items` : (itemId || 'MANIFEST')}
        isModule={!!isModule && !isBulk}
        onClose={props.onClose || (() => {})}
        isPinned={props.isPinned}
        onPin={isBulk ? undefined : props.onPin}
      />

      {/* Section Navigation Tabs */}
      {sectionDefs.length > 1 && (
        <InspectorNav
          sections={sectionDefs}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
      )}

      {/* SOBERANIA BANNER — Top Placement (Era 8) */}
      {(isReadOnly || isBulk) && (
        <div className={`flex items-center gap-2 px-3 py-1 border-b text-[7px] font-black uppercase tracking-widest ${isBulk ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : (mode === 'reference' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-red-500/10 border-red-500/20 text-red-500')}`}>
          <div className={`w-1 h-1 rounded-full animate-pulse ${isBulk ? 'bg-blue-500' : (mode === 'reference' ? 'bg-amber-500' : 'bg-red-500')}`} />
          <span>{isBulk ? `Bulk Editing ${props.multiSelectedIds?.length} Items` : (mode === 'reference' ? 'Reference Mode (Pinned)' : 'Read-Only Mode')}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1.5">
        {/* BULK UPDATE HANDLER */}
        {isBulk && (
           <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-sm mb-4 space-y-3">
              <div className="text-[8px] font-bold text-blue-400 uppercase mb-2">Bulk Synchronization Active</div>
              <div className="text-[7px] text-blue-300/60 leading-relaxed uppercase">
                Any changes made to &quot;Design &amp; Aesthetics&quot; or &quot;System Diagnostics&quot; below will be applied to all selected nodes simultaneously.
              </div>
              {bulkIntersection && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-500/10">
                  <div className="text-[7px] font-black uppercase tracking-wider text-blue-400/80">Property</div>
                  <div className="text-[7px] font-black uppercase tracking-wider text-blue-400/80">Value</div>
                  <div className="text-[7px] uppercase text-blue-300/60">Width</div>
                  <div className={`text-[7px] font-bold ${bulkIntersection.layout.width.common ? 'text-blue-300' : 'text-amber-400'}`}>
                    {bulkIntersection.layout.width.common ? String(bulkIntersection.layout.width.value) : 'Mixed'}
                  </div>
                  <div className="text-[7px] uppercase text-blue-300/60">Height</div>
                  <div className={`text-[7px] font-bold ${bulkIntersection.layout.height.common ? 'text-blue-300' : 'text-amber-400'}`}>
                    {bulkIntersection.layout.height.common ? String(bulkIntersection.layout.height.value) : 'Mixed'}
                  </div>
                  <div className="text-[7px] uppercase text-blue-300/60">Role</div>
                  <div className={`text-[7px] font-bold ${bulkIntersection.role.common ? 'text-blue-300' : 'text-amber-400'}`}>
                    {bulkIntersection.role.common ? String(bulkIntersection.role.value) : 'Mixed'}
                  </div>
                  <div className="text-[7px] uppercase text-blue-300/60">Label</div>
                  <div className={`text-[7px] font-bold ${bulkIntersection.label.common ? 'text-blue-300' : 'text-amber-400'}`}>
                    {bulkIntersection.label.common ? String(bulkIntersection.label.value) : 'Mixed'}
                  </div>
                </div>
              )}
           </div>
        )}

        {/* ESSENTIAL LEVEL — NODE IDENTITY */}
        {activeSection === 'identity' && !isModule && !isBulk && props.visibleSections?.identity !== false && (
          <TieredSection title="Essential Identity" level="essential" icon={Info} defaultOpen={true}>
             <div className="space-y-2">
                <div className="mb-2">
                   <CellPreview item={liveItem as OmegaNode} resolveAsset={props.resolveAsset} />
                </div>
                <NodeComponentEditor
                  node={liveItem as OmegaNode}
                  onUpdate={props.onUpdate}
                  inspectorLevel={props.inspectorLevel}
                  onSaveGroupAsBlueprint={props.onSaveGroupAsBlueprint}
                  onUngroupNode={props.onUngroupNode}
                />
                <IdentitySection
                  item={liveItem as OmegaNode}
                  onUpdate={(u) => props.onUpdate?.(u)}
                  rootManifest={enrichedManifest}
                  rootTree={rootTree ?? undefined}
                  highlightPath={props.highlightPath}
                  resolveAsset={props.resolveAsset}
                  exportSelectedAsBlueprint={props.exportSelectedAsBlueprint}
                  onSaveGroupAsBlueprint={props.onSaveGroupAsBlueprint}
                />
             </div>
          </TieredSection>
        )}

        {/* 1. ESSENTIAL IDENTITY (MODULE) — merged Signature + Branding + Taxonomy */}
        {activeSection === 'identity' && isModule && !isBulk && props.visibleSections?.essentialIdentity !== false && (
          <TieredSection title="Essential Identity" level="essential" icon={Info} defaultOpen={true}>
              <ModuleIdentitySection
                manifest={item as OMEGA_Manifest}
                onUpdate={(u) => props.onUpdate?.(u)}
                resolveAsset={props.resolveAsset}
              />
          </TieredSection>
        )}

        {/* 3. GLOBAL UI SKIN (MODULE) */}
        {activeSection === 'ui-skin' && isModule && !isBulk && props.visibleSections?.globalUiSkin !== false && (
          <TieredSection title="Global UI Skin" level="essential" icon={Paintbrush}>
             <ModuleSkinSelector
               manifest={item as OMEGA_Manifest}
               onUpdate={(u) => props.onUpdate?.(u)}
               standalone={true}
             />
          </TieredSection>
        )}

        {/* 4. ACTIVE CONSTRUCTION PLANE (MODULE) */}
        {activeSection === 'plane' && isModule && !isBulk && props.visibleSections?.activeConstructionPlane !== false && (
          <TieredSection title="Active Construction Plane" level="essential" icon={Layers}>
             <ModulePlaneSelector
               manifest={item as OMEGA_Manifest}
               onUpdate={(u) => props.onUpdate?.(u)}
               standalone={true}
             />
          </TieredSection>
        )}

        {/* 5. CHASSIS (MODULE) — merged MechanicalSpec + PowerParity */}
        {activeSection === 'emulation' && isModule && !isBulk && props.visibleSections?.physicalEmulationProfile !== false && (
          <TieredSection title="Physical Emulation Profile" level="essential" icon={Cpu}>
             <ModuleChassisSection
               manifest={item as OMEGA_Manifest}
               onUpdate={(u) => props.onUpdate?.(u)}
             />
          </TieredSection>
        )}

        {/* SIMULATION LEVEL - DRY-RUN CLIENT LFO */}
        {activeSection === 'simulation' && !isModule && !isBulk && (
          <TieredSection title="Simulation (Dry-Run)" level="essential" icon={Activity} defaultOpen={true}>
            <div className="space-y-3 p-3 bg-black/40 border wb-outline rounded-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-white">Client LFO Simulation</div>
                  <div className="text-[7px] text-white/50 uppercase">Modulates value at 1Hz (0.0 to 1.0) without WASM</div>
                </div>
                <button
                  onClick={toggleSimulation}
                  aria-label={isPlaying ? 'Stop LFO simulation' : 'Start LFO simulation'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-[8px] font-bold uppercase transition-all duration-300 ${isPlaying ? 'bg-primary text-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] border border-primary animate-pulse' : 'bg-black/60 border wb-outline text-white/70 hover:border-primary/40 hover:text-white'}`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-2.5 h-2.5 fill-current" />
                      <span>Stop LFO</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Start LFO</span>
                    </>
                  )}
                </button>
              </div>
              {isPlaying && (
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 p-2 rounded-xs">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                  <span className="text-[7px] text-primary font-bold uppercase tracking-wider">LFO Active: Modulating control angle/intensity...</span>
                </div>
              )}
            </div>
          </TieredSection>
        )}

        {/* DESIGN GLOBALS */}
        {activeSection === 'globals' && isModule && !isBulk && props.visibleSections?.aestheticsGlobals !== false && (
          <TieredSection title="Aesthetics Globals" level="advanced" icon={Box}>
             <CustomSkinSection
                manifest={item as OMEGA_Manifest}
                onUpdate={(u) => props.onUpdate?.(u)}
                resolveAsset={props.resolveAsset}
                activeRackTab={props.activeTab || 'MAIN'}
                onOpenConfig={props.onOpenConfig}
                forceTab="globals"
              />
          </TieredSection>
        )}

        {/* DESIGN ELEMENTS / AESTHETICS */}
        {activeSection === 'aesthetics' && props.visibleSections?.aestheticsElements !== false && (
          <TieredSection title={isModule ? "Aesthetics Elements" : "Design & Aesthetics"} level="advanced" icon={Palette}>
            {isModule && !isBulk ? (
              <CustomSkinSection
                 manifest={item as OMEGA_Manifest}
                 onUpdate={(u) => props.onUpdate?.(u)}
                 resolveAsset={props.resolveAsset}
                 activeRackTab={props.activeTab || 'MAIN'}
                 onOpenConfig={props.onOpenConfig}
                 forceTab="elements"
               />
            ) : (
               <AestheticSection
                  item={liveItem as OmegaNode}
                  manifest={enrichedManifest}
                  onUpdate={(u) => {
                    if (isBulk && props.multiSelectedIds) {
                      props.multiSelectedIds.forEach(id => {
                        props.onUpdateItem?.(id, u as HybridEntityUpdate);
                      });
                    } else {
                      props.onUpdate?.(u);
                    }
                  }}
                  resolveAsset={props.resolveAsset}
                  onOpenConfig={props.onOpenConfig}
                />
            )}
          </TieredSection>
        )}

        {/* LOGIC & ARCHITECTURE */}
        {activeSection === 'architecture' && !isBulk && props.visibleSections?.architecture !== false && (
          <TieredSection title={isModule ? "Architecture" : "Logic & Ports"} level="advanced" icon={isModule ? Layout : Zap}>
             {isModule ? (
               <ModuleArchitectureSection
                  manifest={item as OMEGA_Manifest}
                  onUpdate={(u) => props.onUpdate?.(u)}
                  addContainer={props.addContainer!}
                  updateContainer={props.updateContainer!}
                  removeContainer={props.removeContainer!}
                  onSelectItem={props.onSelectItem!}
                  onAddEntity={props.onAddEntity!}
                  onDuplicateItem={props.onDuplicateItem!}
                  onRemoveItem={props.onRemoveItem!}
                  onAddModulation={props.onAddModulation!}
                  onRemoveModulation={props.onRemoveModulation!}
                  onUpdateModulation={props.onUpdateModulation!}
                  onOpenModGrid={props.onOpenModGrid!}
                  extraResources={props.extraResources}
                  onTriggerUpload={() => props.onTriggerUpload?.('resource-upload')}
                  onRemoveResource={props.onRemoveResource}
                  highlightPath={props.highlightPath || undefined}
                  onOpenLibrary={props.onOpenLibrary}
                />
             ) : (
               <div className="space-y-6">
                  <LogicSection item={liveItem as OmegaNode} onUpdate={(u) => props.onUpdate?.(u)} availableBinds={props.availableBinds || []} onHelp={props.onHelp} highlightPath={props.highlightPath} />
                  <AttachmentsSection item={liveItem as OmegaNode} manifest={enrichedManifest} onUpdate={(u) => props.onUpdate?.(u)} availableBinds={props.availableBinds || []} onHelp={props.onHelp} onOpenConfig={props.onOpenConfig} />
               </div>
             )}
          </TieredSection>
        )}

        {/* DIAGNOSTICS LEVEL */}
        {activeSection === 'diagnostics' && props.visibleSections?.diagnostics !== false && (
          <TieredSection title="Low-Level Registry Role" level="diagnostics" icon={Layers}>
           <div className="space-y-4">
              <EngineeringSection
                item={liveItem as OmegaNode}
                onUpdate={(u) => {
                  if (isBulk && props.multiSelectedIds) {
                    props.multiSelectedIds.forEach(id => {
                      props.onUpdateItem?.(id, u as HybridEntityUpdate);
                    });
                  } else {
                    props.onUpdate?.(u as Partial<OmegaNode>);
                  }
                }}
                onHelp={props.onHelp}
                highlightPath={props.highlightPath}
                standalone={true}
              />
              {!!isUcaNode(liveItem) && !isModule && !isBulk && (
                <LayoutGovernanceSection
                  node={liveItem as OmegaNode}
                  onUpdate={(u) => props.onUpdate?.(u)}
                />
              )}
           </div>
          </TieredSection>
        )}
      </div>
    </div>
  );
}
