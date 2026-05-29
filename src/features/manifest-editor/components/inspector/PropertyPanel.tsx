'use client';

import React from 'react';

// Specialized Sections
import type { ManifestEntity, OMEGA_Manifest, OMEGA_Modulation, LayoutContainer, ExtraResource, OmegaNode, HybridEntityUpdate } from '@/omega-ui-core/types/manifest';
import { manifestToTree } from '@/omega-ui-core/uca/ucaBridge';

// Specialized Sections
import IdentitySection from '@/features/manifest-editor/components/inspector/sections/IdentitySection';
import LogicSection from '@/features/manifest-editor/components/inspector/sections/LogicSection';
import AestheticSection from '@/features/manifest-editor/components/inspector/sections/AestheticSection';
import AttachmentsSection from '@/features/manifest-editor/components/inspector/sections/AttachmentsSection';
import EngineeringSection from '@/features/manifest-editor/components/inspector/sections/EngineeringSection';
import ModuleArchitectureSection from '@/features/manifest-editor/components/inspector/sections/ModuleArchitectureSection';
import LayoutGovernanceSection from '@/features/manifest-editor/components/inspector/sections/LayoutGovernanceSection';
import CellPreview from '@/features/manifest-editor/components/inspector/CellPreview';
import CustomSkinSection from '@/features/manifest-editor/components/inspector/sections/CustomSkinSection';
 
// Layout Components & Hooks
import InspectorHeader from '@/features/manifest-editor/components/inspector/layout/InspectorHeader';
import { isUcaNode } from '@/features/manifest-editor/hooks/entities/ucaInspectorModel';
import { findNodeInTree, findLegacyItem } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';

export interface PropertyPanelProps {
  item: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  onClose?: (() => void) | undefined;
  onUpdateItem?: ((id: string, updates: HybridEntityUpdate) => void) | undefined;
  onUpdate?: ((updates: Partial<OMEGA_Manifest> | HybridEntityUpdate) => void) | undefined;
  highlightPath?: (string | null) | undefined;
  availableBinds?: string[] | undefined;
  onSelectItem?: ((id: string | null) => void) | undefined;
  onAddEntity?: ((type: 'control' | 'jack') => void) | undefined;
  onDuplicateItem?: ((id: string) => void) | undefined;
  onRemoveItem?: ((id: string) => void) | undefined;
  onHelp?: ((sectionId: string) => void) | undefined;
  onAddModulation?: ((mod: OMEGA_Modulation) => void) | undefined;
  onRemoveModulation?: ((id: string) => void) | undefined;
  onUpdateModulation?: ((id: string, updates: Partial<OMEGA_Modulation>) => void) | undefined;
  onOpenModGrid?: (() => void) | undefined;
  addContainer?: ((c?: Partial<LayoutContainer> | undefined) => void) | undefined;
  updateContainer?: ((id: string, updates: Partial<LayoutContainer>) => void) | undefined;
  removeContainer?: ((id: string) => void) | undefined;
  extraResources?: ExtraResource[] | undefined;
  onTriggerUpload?: ((id: string) => void) | undefined;
  onRemoveResource?: ((name: string) => void) | undefined;
  resolveAsset: (id: string | undefined) => string | undefined;
  manifest: OMEGA_Manifest;
  uiTheme?: ('dark' | 'light') | undefined;
  activeTab?: string | undefined;
  onOpenConfig?: (() => void) | undefined;
  onOpenLibrary?: (() => void) | undefined;
  mode?: 'active' | 'reference' | 'readonly' | 'bulk';
  multiSelectedIds?: string[];
  isPinned?: boolean;
  onPin?: () => void;
}

import TieredSection from './TieredSection';
import DiagnosticBlock from './DiagnosticBlock';
import { Info, Layout, Palette, Settings, Zap, Play, Square, Activity } from 'lucide-react';
import { useDryRunSimulation } from '@/features/manifest-editor/hooks/useDryRunSimulation';

export default function PropertyPanel(props: PropertyPanelProps) {
  const item = props.item;
  const rootTree = props.manifest?.ui?.tree || (props.manifest ? manifestToTree(props.manifest, props.manifest.ui?.tree) : undefined);
  
  // LIVE REHYDRATION (Era 7.2.3 - Phase 4.2 - Unified Sync)
  // Ensure we always use the latest node from the tree (if available) to avoid stale references 
  // after drag or background updates, even for projected legacy items.
  const liveItem = React.useMemo(() => {
    if (!item || !rootTree) return item;
    // We attempt to find the node in the tree first (Universal Priority)
    const itemId = ('id' in item ? item.id : undefined) || '';
    if (!itemId) return item;

    const treeNode = findNodeInTree(rootTree, itemId);
    if (treeNode) return treeNode;
    
    // Fallback to legacy arrays if not in tree (rare but possible for unmapped entities)
    return findLegacyItem(props.manifest, itemId) || item;
  }, [item, rootTree, props.manifest]);
 
  const isModule = item && !('kind' in item);

  const itemId = (item && 'id' in item ? item.id : 'MANIFEST') || 'MANIFEST';
  const { isPlaying, toggleSimulation } = useDryRunSimulation(isModule || props.mode === 'bulk' ? null : itemId);

  if (!item || !liveItem) return null;
 
  // Unified manifest with injected resources for selectors
  const assetsFromResources = props.extraResources?.map(r => ({ 
    id: `resources/${r.name}`, 
    url: `resources/${r.name}`,
    type: (r.type?.includes('svg') ? 'svg' : 'image') as 'svg' | 'image'
  })) || [];

  const enrichedManifest: OMEGA_Manifest = {
    ...props.manifest,
    resources: {
      ...props.manifest.resources,
      assets: assetsFromResources.length > 0 ? assetsFromResources : (props.manifest.resources?.assets || [])
    }
  };
 
  const mode = props.mode || 'active';
  const isReadOnly = mode === 'readonly' || mode === 'reference';
  const isBulk = mode === 'bulk';

  return (
    <div className={`h-full wb-surface border-l wb-outline flex flex-col shadow-2xl overflow-hidden transition-all duration-500 ${mode === 'active' ? 'ring-1 ring-primary/20 shadow-[inset_0_0_40px_rgba(var(--primary-rgb),0.02)]' : 'opacity-90 shadow-none'}`}>
      <InspectorHeader 
        id={isBulk ? `${props.multiSelectedIds?.length} Items` : (itemId || 'MANIFEST')} 
        isModule={!!isModule && !isBulk} 
        onClose={props.onClose || (() => {})} 
        isPinned={props.isPinned}
        onPin={isBulk ? undefined : props.onPin}
      />
      
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
           <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-sm mb-4">
              <div className="text-[8px] font-bold text-blue-400 uppercase mb-2">Bulk Synchronization Active</div>
              <div className="text-[7px] text-blue-300/60 leading-relaxed uppercase">
                Any changes made to &quot;Design &amp; Aesthetics&quot; or &quot;System Diagnostics&quot; below will be applied to all selected nodes simultaneously.
              </div>
           </div>
        )}

        {/* ESSENTIAL LEVEL - ALWAYS VISIBLE */}
        {!isBulk && (
          <TieredSection title="Essential Identity" level="essential" icon={Info} defaultOpen={true}>
             <div className="space-y-2">
                {!isModule && (
                  <div className="mb-2">
                     <CellPreview item={liveItem as OmegaNode} resolveAsset={props.resolveAsset} />
                  </div>
                )}
                <IdentitySection 
                  item={liveItem as OmegaNode} 
                  onUpdate={(u) => props.onUpdate?.(u)} 
                  rootManifest={enrichedManifest} 
                  rootTree={rootTree}
                  highlightPath={props.highlightPath}
                  resolveAsset={props.resolveAsset}
                />
             </div>
          </TieredSection>
        )}

        {/* SIMULATION LEVEL - DRY-RUN CLIENT LFO */}
        {!isModule && !isBulk && (
          <TieredSection title="Simulation (Dry-Run)" level="essential" icon={Activity} defaultOpen={true}>
            <div className="space-y-3 p-3 bg-black/40 border wb-outline rounded-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-white">Client LFO Simulation</div>
                  <div className="text-[7px] text-white/50 uppercase">Modulates value at 1Hz (0.0 to 1.0) without WASM</div>
                </div>
                <button
                  onClick={toggleSimulation}
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

        {/* ADVANCED LEVEL - COLLAPSIBLE */}
        <TieredSection title="Design & Aesthetics" level="advanced" icon={Palette}>
           {isModule && !isBulk ? (
             <CustomSkinSection 
                manifest={item as OMEGA_Manifest} 
                onUpdate={(u) => props.onUpdate?.(u)} 
                resolveAsset={props.resolveAsset}
                activeRackTab={props.activeTab || 'MAIN'}
                onOpenConfig={props.onOpenConfig}
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

        {/* LOGIC & ARCHITECTURE */}
        {!isBulk && (
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
        <TieredSection title="System Diagnostics" level="diagnostics" icon={Settings}>
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
              />
              {isUcaNode(liveItem) && !isModule && !isBulk && (
                <LayoutGovernanceSection 
                  node={liveItem as OmegaNode} 
                  onUpdate={(u) => props.onUpdate?.(u)} 
                />
              )}
              <DiagnosticBlock 
                title="OMEGA Sync Status"
                signals={[
                  { id: 'rpc', label: 'RPC Latency', value: '1.2ms', status: 'ok', icon: 'activity' },
                  { id: 'hpa', label: 'HPA Path', value: isBulk ? 'MULTIPLE' : (itemId || 'root'), icon: 'power' },
                  { id: 'dirty', label: 'Dirty State', value: 'CLEAN', status: 'ok' },
                  { id: 'lock', label: 'Write Lock', value: isReadOnly ? 'LOCKED' : 'AVAILABLE', status: isReadOnly ? 'warn' : 'ok', icon: 'security' }
                ]}
              />
           </div>
        </TieredSection>
      </div>
    </div>
  );
}
