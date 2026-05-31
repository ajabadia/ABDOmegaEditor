'use client';

import React from 'react';
import { 
  Layers, Sliders, Info, History, X,
  Clock, Monitor, Crosshair, ArrowRight, Zap, Settings, Activity, Layout, Palette, Box, Target, Tag, Cpu, Paintbrush,
  Terminal
} from 'lucide-react';
import type { OMEGA_Manifest, OMEGA_Contract, ManifestEntity, OMEGA_Modulation, ExtraResource, LayoutContainer, BlueprintDefinition, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { WorkbenchLayout } from '../../types/workbench';
import type { AuditResult } from '@/services/auditService';
import { WorkbenchInspector } from './WorkbenchInspector';
import LayersPanel from './LayersPanel';
import BlueprintLibraryPanel from './BlueprintLibraryPanel';
import DiagnosticBlock from './DiagnosticBlock';
import LogTerminal from '../logs/LogTerminal';

interface RightDockContainerProps {
  // App States
  manifest: OMEGA_Manifest;
  contract: OMEGA_Contract | null;
  selectedItem: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  selectedItemId: string | null;
  highlightPath: string | null;
  availableBinds: string[];
  extraResources: ExtraResource[];
  audit: AuditResult;
  isLiveMode: boolean;
  uiTheme: 'dark' | 'light';
  pinnedNodeId: string | null;
  layout: WorkbenchLayout;
  multiSelectedIds: string[];
  
  // History & Actions
  pastHistory: Array<{ label: string; timestamp: number }>;
  onUndoTo: (index: number) => void;
  
  logs: string[];
  
  // Window Toggle States
  windowStates: {
    window_layers: boolean;
    window_properties: boolean;
    window_rack_properties: boolean;
    window_blueprints: boolean;
    window_info: boolean;
    window_history: boolean;
    window_logs: boolean;
  };
  onToggleWindow: (name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_info' | 'window_history' | 'window_logs') => void;
  
  // Visibility & Lock
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  
  // Dock Collapsed
  isCollapsed: boolean;
  onToggleCollapse: () => void;

  // Inspector Operations
  onUpdateItem: (id: string, updates: Partial<ManifestEntity> | Partial<OmegaNode>) => void;
  onUpdateManifest: (updates: Partial<OMEGA_Manifest>) => void;
  onSelectItem: (id: string | null) => void;
  onAddEntity: (type: 'control' | 'jack') => void;
  onDuplicateItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onAddModulation: (mod: OMEGA_Modulation) => void;
  onRemoveModulation: (id: string) => void;
  onUpdateModulation: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onOpenModGrid: () => void;
  addContainer: (c?: Partial<LayoutContainer>) => void;
  updateContainer: (id: string, updates: Partial<LayoutContainer>) => void;
  removeContainer: (id: string) => void;
  onHelp: (sectionId?: string | undefined) => void;
  onRemoveResource: (fileName: string) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  onTriggerUpload: (id: string) => void;
  onOpenConfig?: (() => void) | undefined;
  onOpenLibrary?: (() => void) | undefined;
  onSelectBlueprint?: ((blueprint: BlueprintDefinition) => void) | undefined;
  exportSelectedAsBlueprint?: ((id: string) => void) | undefined;
  onTogglePin: (id: string | null) => void;
  onSetLayoutRatio: (ratio: number) => void;
  onSetLayoutRatioEnd?: () => void;
  onSelectMultiple: (ids: string[]) => void;
  rackSections: {
    identity: boolean;
    essentialIdentity: boolean;
    identityBranding: boolean;
    globalUiSkin: boolean;
    activeConstructionPlane: boolean;
    moduleTaxonomy: boolean;
    physicalEmulationProfile: boolean;
    aestheticsGlobals: boolean;
    aestheticsElements: boolean;
    architecture: boolean;
    diagnostics: boolean;
  };
  onToggleRackSection: (section: 'identity' | 'essentialIdentity' | 'identityBranding' | 'globalUiSkin' | 'activeConstructionPlane' | 'moduleTaxonomy' | 'physicalEmulationProfile' | 'aestheticsGlobals' | 'aestheticsElements' | 'architecture' | 'diagnostics') => void;
}

export default function RightDockContainer(props: RightDockContainerProps) {
  const { 
    windowStates, onToggleWindow, isCollapsed, onToggleCollapse,
    hiddenNodeIds, lockedNodeIds, onToggleVisibility, onToggleLock,
    manifest, selectedItem, selectedItemId, onSelectItem, pastHistory, onUndoTo,
    onRemoveItem, rackSections, onToggleRackSection
  } = props;

  // Count active windows in the dock
  const activeCount = Object.values(windowStates).filter(Boolean).length;
  const showContent = !isCollapsed && activeCount > 0;

  // Calculate dynamic width of columns side-by-side
  const getDynamicWidth = () => {
    let w = 0;
    if (windowStates.window_layers) w += 260;
    if (windowStates.window_properties) w += 320;
    if (windowStates.window_rack_properties) w += 320;
    if (windowStates.window_blueprints) w += 280;
    if (windowStates.window_info || windowStates.window_history) w += 240;
    if (windowStates.window_logs) w += 260;
    return w;
  };
  const dynamicWidth = getDynamicWidth();

  // Helper to extract node/entity info safely
  const getSelectedInfo = () => {
    if (!selectedItem) return null;

    // Check if it's the manifest (top-level schema or modules)
    if ('metadata' in selectedItem && 'resources' in selectedItem) {
      const m = selectedItem as OMEGA_Manifest;
      return {
        id: m.id || 'Manifest',
        type: 'Manifest',
        label: m.metadata?.name || 'Root Manifest',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
    }

    // Check if it's an OmegaNode
    if ('kind' in selectedItem) {
      const node = selectedItem as OmegaNode;
      return {
        id: node.id,
        type: node.kind || node.role || 'Node',
        label: node.id || 'Node',
        x: node.layout?.pos?.x ?? 0,
        y: node.layout?.pos?.y ?? 0,
        width: node.layout?.size?.width ?? 0,
        height: node.layout?.size?.height ?? 0,
      };
    }

    // Otherwise, assume ManifestEntity
    const entity = selectedItem as ManifestEntity;
    return {
      id: entity.id,
      type: entity.category || entity.type || 'Entity',
      label: entity.label || entity.name || 'None',
      x: entity.pos?.x ?? 0,
      y: entity.pos?.y ?? 0,
      width: entity.size?.width ?? 0,
      height: entity.size?.height ?? 0,
    };
  };

  const selectedInfo = getSelectedInfo();

  return (
    <div className="h-full flex flex-row select-none">
      
      {/* 1. DOCK EXPANDED CONTENT DRAWER */}
      <div 
        className="flex-shrink-0 flex flex-row bg-black/10 overflow-hidden transition-all duration-300 relative border-l wb-outline"
        style={{ width: showContent ? `${dynamicWidth}px` : '0px', borderLeftWidth: showContent ? '1px' : '0px' }}
      >
        <div className="h-full flex flex-row overflow-hidden divide-x divide-white/5">
          
          {/* PANEL 1: CAPAS (LAYERS) */}
          {windowStates.window_layers && (
            <div className="w-[260px] h-full flex flex-col overflow-hidden shrink-0">
              <div 
                className="px-3 py-2 bg-black/30 border-b wb-outline flex items-center justify-between cursor-pointer text-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors"
                onClick={() => onToggleWindow('window_layers')}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Capas / Layers</span>
                </div>
                <X className="w-3 h-3 opacity-30 hover:opacity-100" />
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <LayersPanel 
                  manifest={manifest}
                  selectedItemId={selectedItemId}
                  onSelectItem={onSelectItem}
                  hiddenNodeIds={hiddenNodeIds}
                  lockedNodeIds={lockedNodeIds}
                  onToggleVisibility={onToggleVisibility}
                  onToggleLock={onToggleLock}
                  onRemoveItem={onRemoveItem}
                  onAddEntity={props.onAddEntity}
                />
              </div>
            </div>
          )}

          {/* PANEL 2: PROPIEDADES DE ELEMENTO (ELEMENT PROPERTIES) */}
          {windowStates.window_properties && (
            <div className="w-[320px] h-full flex flex-col overflow-hidden shrink-0">
              <div 
                className="px-3 py-2 bg-black/30 border-b wb-outline flex items-center justify-between cursor-pointer text-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors"
                onClick={() => onToggleWindow('window_properties')}
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Propiedades de Elemento</span>
                </div>
                <X className="w-3 h-3 opacity-30 hover:opacity-100" />
              </div>
              <div className="flex-1 overflow-y-auto">
                {selectedItemId ? (
                  <WorkbenchInspector 
                    isLiveMode={props.isLiveMode} uiTheme={props.uiTheme}
                    manifest={manifest} selectedItem={selectedItem}
                    selectedItemId={selectedItemId} highlightPath={props.highlightPath}
                    availableBinds={props.availableBinds} extraResources={props.extraResources}
                    audit={props.audit}
                    onUpdateItem={props.onUpdateItem} onUpdateManifest={props.onUpdateManifest}
                    onSelectItem={onSelectItem} onAddEntity={props.onAddEntity}
                    onDuplicateItem={props.onDuplicateItem} onRemoveItem={props.onRemoveItem}
                    onAddModulation={props.onAddModulation} onRemoveModulation={props.onRemoveModulation}
                    onUpdateModulation={props.onUpdateModulation} onOpenModGrid={props.onOpenModGrid}
                    addContainer={props.addContainer} updateContainer={props.updateContainer}
                    removeContainer={props.removeContainer} onHelp={props.onHelp}
                    onRemoveResource={props.onRemoveResource}
                    resolveAsset={props.resolveAsset}
                    onTriggerUpload={props.onTriggerUpload}
                    onOpenConfig={props.onOpenConfig}
                    onOpenLibrary={props.onOpenLibrary}
                    onSelectBlueprint={props.onSelectBlueprint}
                    exportSelectedAsBlueprint={props.exportSelectedAsBlueprint}
                    pinnedNodeId={props.pinnedNodeId}
                    onTogglePin={props.onTogglePin}
                    layout={props.layout}
                    onSetLayoutRatio={props.onSetLayoutRatio}
                    onSetLayoutRatioEnd={props.onSetLayoutRatioEnd}
                    multiSelectedIds={props.multiSelectedIds}
                    onSelectMultiple={props.onSelectMultiple}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-foreground/30 text-[10px] uppercase tracking-widest gap-2 py-20">
                    <Sliders className="w-5 h-5 opacity-40 text-primary" />
                    <span>Selecciona un elemento</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PANEL 2.2: PROPIEDADES DE RACK (RACK PROPERTIES) */}
          {windowStates.window_rack_properties && (
            <div className="w-[320px] h-full flex flex-col overflow-hidden shrink-0">
              <div 
                className="px-3 py-2 bg-black/30 border-b wb-outline flex items-center justify-between cursor-pointer text-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors"
                onClick={() => onToggleWindow('window_rack_properties')}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Propiedades del Rack</span>
                </div>
                <X className="w-3 h-3 opacity-30 hover:opacity-100" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <WorkbenchInspector 
                  isLiveMode={props.isLiveMode} uiTheme={props.uiTheme}
                  manifest={manifest} selectedItem={manifest}
                  selectedItemId={null} highlightPath={props.highlightPath}
                  availableBinds={props.availableBinds} extraResources={props.extraResources}
                  audit={props.audit}
                  onUpdateItem={props.onUpdateItem} onUpdateManifest={props.onUpdateManifest}
                  onSelectItem={onSelectItem} onAddEntity={props.onAddEntity}
                  onDuplicateItem={props.onDuplicateItem} onRemoveItem={props.onRemoveItem}
                  onAddModulation={props.onAddModulation} onRemoveModulation={props.onRemoveModulation}
                  onUpdateModulation={props.onUpdateModulation} onOpenModGrid={props.onOpenModGrid}
                  addContainer={props.addContainer} updateContainer={props.updateContainer}
                  removeContainer={props.removeContainer} onHelp={props.onHelp}
                  onRemoveResource={props.onRemoveResource}
                  resolveAsset={props.resolveAsset}
                  onTriggerUpload={props.onTriggerUpload}
                  onOpenConfig={props.onOpenConfig}
                  onOpenLibrary={props.onOpenLibrary}
                  onSelectBlueprint={props.onSelectBlueprint}
                  exportSelectedAsBlueprint={props.exportSelectedAsBlueprint}
                  pinnedNodeId={props.pinnedNodeId}
                  onTogglePin={props.onTogglePin}
                  layout={props.layout}
                  onSetLayoutRatio={props.onSetLayoutRatio}
                  onSetLayoutRatioEnd={props.onSetLayoutRatioEnd}
                  multiSelectedIds={props.multiSelectedIds}
                  onSelectMultiple={props.onSelectMultiple}
                  visibleSections={rackSections}
                />
              </div>
            </div>
          )}

          {/* PANEL 2.5: LIBRERÍA DE BLUEPRINTS */}
          {windowStates.window_blueprints && (
            <div className="w-[280px] h-full flex flex-col overflow-hidden shrink-0">
              <div 
                className="px-3 py-2 wb-surface-subtle border-b wb-outline flex items-center justify-between cursor-pointer wb-text hover:bg-primary/10 transition-colors"
                onClick={() => onToggleWindow('window_blueprints')}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Librería de Blueprints</span>
                </div>
                <X className="w-3 h-3 opacity-30 hover:opacity-100" />
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <BlueprintLibraryPanel 
                  manifest={manifest}
                  onSelectBlueprint={props.onSelectBlueprint || (() => {})}
                />
              </div>
            </div>
          )}

          {/* PANEL 2.6: TERMINAL LOGS */}
          {windowStates.window_logs && (
            <div className="w-[260px] h-full flex flex-col overflow-hidden shrink-0">
              <div 
                className="px-3 py-2 wb-surface-subtle border-b wb-outline flex items-center justify-between cursor-pointer wb-text hover:bg-primary/10 transition-colors"
                onClick={() => onToggleWindow('window_logs')}
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest font-sans">Logs / Terminal</span>
                </div>
                <X className="w-3 h-3 opacity-30 hover:opacity-100" />
              </div>
              <div className="flex-1 overflow-hidden flex flex-col relative bg-black/40">
                <LogTerminal logs={props.logs || []} />
              </div>
            </div>
          )}

          {/* COMBINED COLUMN: INFO & HISTORY */}
          {(windowStates.window_info || windowStates.window_history) && (
            <div className="w-[240px] h-full flex flex-col overflow-hidden shrink-0 divide-y divide-white/10 bg-black/10">
              
              {/* SECTION 1: INFO */}
              {windowStates.window_info && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div 
                    className="px-3 py-2 bg-black/30 border-b wb-outline flex items-center justify-between cursor-pointer text-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors shrink-0"
                    onClick={() => onToggleWindow('window_info')}
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Información / Info</span>
                    </div>
                    <X className="w-3 h-3 opacity-30 hover:opacity-100" />
                  </div>
                  <div className="flex-grow p-3 overflow-y-auto flex flex-col gap-2 bg-black/20 text-[8px] font-mono uppercase tracking-wider text-foreground/60 select-text">
                    {selectedInfo ? (
                      <>
                        <div className="flex items-center gap-1.5 text-primary font-bold">
                          <Crosshair className="w-3 h-3" />
                          <span>Entity: {selectedInfo.id}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 border-t border-white/5 pt-1.5 col-span-2">
                          <div>Type: <span className="text-foreground">{selectedInfo.type || 'Jack'}</span></div>
                          <div>Label: <span className="text-foreground">{selectedInfo.label || 'None'}</span></div>
                          <div>Pos X: <span className="text-foreground">{selectedInfo.x || 0}px</span></div>
                          <div>Pos Y: <span className="text-foreground">{selectedInfo.y || 0}px</span></div>
                          <div>Width: <span className="text-foreground">{selectedInfo.width || 0}px</span></div>
                          <div>Height: <span className="text-foreground">{selectedInfo.height || 0}px</span></div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-foreground/35">
                        <Monitor className="w-3 h-3" />
                        <span>No item selected</span>
                      </div>
                    )}
                    <div className="my-2 border-t border-white/5 pt-2">
                      <DiagnosticBlock 
                        title="OMEGA Sync Status"
                        signals={[
                          { id: 'rpc', label: 'RPC Latency', value: '1.2ms', status: 'ok', icon: 'activity' },
                          { id: 'hpa', label: 'HPA Path', value: selectedItemId || 'root', icon: 'power' },
                          { id: 'dirty', label: 'Dirty State', value: 'CLEAN', status: 'ok' },
                          { id: 'lock', label: 'Write Lock', value: props.contract ? 'LOCKED' : 'AVAILABLE', status: props.contract ? 'warn' : 'ok', icon: 'security' }
                        ]}
                      />
                    </div>
                    <div className="border-t border-white/5 pt-2 mt-auto grid grid-cols-2 gap-x-4 shrink-0">
                      <div>Live Engine: <span className={props.isLiveMode ? "text-accent" : "text-red-500"}>{props.isLiveMode ? "Online" : "Offline"}</span></div>
                      <div>Theme: <span className="text-foreground">{props.uiTheme}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: HISTORY */}
              {windowStates.window_history && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div 
                    className="px-3 py-2 bg-black/30 border-b wb-outline flex items-center justify-between cursor-pointer text-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors shrink-0"
                    onClick={() => onToggleWindow('window_history')}
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Historial / History</span>
                    </div>
                    <X className="w-3 h-3 opacity-30 hover:opacity-100" />
                  </div>
                  <div className="flex-grow overflow-y-auto bg-black/25 flex flex-col py-1 select-none">
                    {pastHistory.length === 0 ? (
                      <div className="flex-grow flex items-center justify-center text-foreground/20 text-[8px] uppercase tracking-widest gap-1 py-4">
                        <Clock className="w-3 h-3" />
                        <span>Clean History</span>
                      </div>
                    ) : (
                      pastHistory.map((entry, index) => (
                        <div 
                          key={index}
                          onClick={() => onUndoTo(index)}
                          className="w-full text-left px-3 py-1 text-[8px] font-mono uppercase tracking-widest text-foreground/60 hover:bg-primary/10 hover:text-primary border-l-2 border-transparent hover:border-primary transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-primary shrink-0 transition-opacity" />
                            <span className="truncate">{entry.label}</span>
                          </div>
                          <span className="text-[6px] opacity-30 shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* 2. DOCK COLLAPSE HANDLE (Chevrons) */}
      {activeCount > 0 && (
        <div 
          onClick={onToggleCollapse}
          className="w-1.5 hover:w-2 bg-black/40 hover:bg-[#ff8c00]/30 border-l border-r wb-outline/40 flex items-center justify-center cursor-pointer select-none transition-all duration-200 group z-40 shrink-0"
          title={isCollapsed ? "Expand Dock" : "Collapse Dock"}
        >
          <span className="text-[6px] opacity-40 group-hover:opacity-100 transition-opacity text-foreground select-none">
            {isCollapsed ? '◀' : '▶'}
          </span>
        </div>
      )}

      {/* 2.5. SECOND-LEVEL SUB-TOOLBAR FOR RACK PROPERTIES */}
      {windowStates.window_rack_properties && !isCollapsed && (
        <div className="w-10 wb-surface border-l wb-outline flex flex-col items-center py-3 gap-3 z-45 shrink-0 animate-in slide-in-from-right duration-200 shadow-lg">
          <div className="text-[5px] font-black uppercase text-foreground/45 tracking-widest text-center select-none pointer-events-none mb-1">RACK SECT</div>
          
          <button
            onClick={() => onToggleRackSection('essentialIdentity')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.essentialIdentity 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Essential Identity"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('identityBranding')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.identityBranding 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Identity Branding"
          >
            <Target className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('globalUiSkin')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.globalUiSkin 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Global UI Skin"
          >
            <Paintbrush className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('activeConstructionPlane')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.activeConstructionPlane 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Active Construction Plane"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('moduleTaxonomy')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.moduleTaxonomy 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Module Taxonomy"
          >
            <Tag className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('physicalEmulationProfile')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.physicalEmulationProfile 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Physical Emulation Profile"
          >
            <Cpu className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('aestheticsGlobals')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.aestheticsGlobals 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Aesthetics Globals"
          >
            <Box className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('aestheticsElements')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.aestheticsElements 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Aesthetics Elements"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('architecture')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.architecture 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Architecture"
          >
            <Layout className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleRackSection('diagnostics')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              rackSections.diagnostics 
                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                : 'wb-text-muted hover:wb-text hover:bg-primary/10'
            }`}
            title="Toggle Low-Level Registry Role"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. RIGHT ICON STRIP (Photoshop Style) */}
      <div className="w-10 wb-surface border-l wb-outline flex flex-col items-center py-3 gap-3 z-50 shrink-0 shadow-xl">
        
        {/* EYE/LAYERS ICON */}
        <button
          onClick={() => onToggleWindow('window_layers')}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            windowStates.window_layers && !isCollapsed
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
              : 'wb-text-muted hover:wb-text hover:bg-primary/10'
          }`}
          title="Capas / Layers"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* SETTINGS/RACK PROPERTIES ICON */}
        <button
          onClick={() => onToggleWindow('window_rack_properties')}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            windowStates.window_rack_properties && !isCollapsed
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
              : 'wb-text-muted hover:wb-text hover:bg-primary/10'
          }`}
          title="Propiedades del Rack / Rack Properties"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* SLIDERS/PROPERTIES ICON */}
        <button
          onClick={() => onToggleWindow('window_properties')}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            windowStates.window_properties && !isCollapsed
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
              : 'wb-text-muted hover:wb-text hover:bg-primary/10'
          }`}
          title="Propiedades del Elemento / Element Properties"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* BLUEPRINTS ICON */}
        <button
          onClick={() => onToggleWindow('window_blueprints')}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            windowStates.window_blueprints && !isCollapsed
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
              : 'wb-text-muted hover:wb-text hover:bg-primary/10'
          }`}
          title="Librería de Blueprints / Blueprints"
        >
          <Zap className="w-4 h-4" />
        </button>

        {/* INFO ICON */}
        <button
          onClick={() => onToggleWindow('window_info')}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            windowStates.window_info && !isCollapsed
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
              : 'wb-text-muted hover:wb-text hover:bg-primary/10'
          }`}
          title="Información / Info"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* CLOCK/HISTORY ICON */}
        <button
          onClick={() => onToggleWindow('window_history')}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            windowStates.window_history && !isCollapsed
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
              : 'wb-text-muted hover:wb-text hover:bg-primary/10'
          }`}
          title="Historial / History"
        >
          <History className="w-4 h-4" />
        </button>

        {/* LOGS ICON */}
        <button
          onClick={() => onToggleWindow('window_logs')}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            windowStates.window_logs && !isCollapsed
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
              : 'wb-text-muted hover:wb-text hover:bg-primary/10'
          }`}
          title="Logs / Terminal"
        >
          <Terminal className="w-4 h-4" />
        </button>

      </div>

    </div>
  );
}
