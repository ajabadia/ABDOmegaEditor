'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Layers, Sliders, Info, History,
  Settings, Zap, Terminal, Shield
} from 'lucide-react';
import type { OMEGA_Manifest, OMEGA_Contract, ManifestEntity, OMEGA_Modulation, ExtraResource, LayoutContainer, OmegaNode, BlueprintDefinition } from '@/omega-ui-core/types/manifest';
import type { WorkbenchLayout } from '../../types/workbench';
import type { AuditResult } from '@/services/auditService';
import { WorkbenchInspector } from './WorkbenchInspector';
import LayersPanel from './LayersPanel';
import BlueprintLibraryPanel from './BlueprintLibraryPanel';
import CompliancePanel from './CompliancePanel';
import LogTerminal from '../logs/LogTerminal';
import { DockPanel } from './dock/DockPanel';
import { DockIconStrip } from './dock/DockIconStrip';
import { DockRackSectionToolbar } from './dock/DockRackSectionToolbar';
import { DockInfoPanel } from './dock/DockInfoPanel';

interface RightDockContainerProps {
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
  pastHistory: Array<{ label: string; timestamp: number }>;
  onUndoTo: (index: number) => void;
  logs: string[];
  windowStates: {
    window_layers: boolean;
    window_properties: boolean;
    window_rack_properties: boolean;
    window_blueprints: boolean;
    window_compliance: boolean;
    window_info: boolean;
    window_history: boolean;
    window_logs: boolean;
  };
  onToggleWindow: (name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs') => void;
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  onLoadAcepack?: (() => void) | undefined;
  onOpenConfig?: (() => void) | undefined;
  onOpenLibrary?: (() => void) | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelectBlueprint?: ((blueprint: any) => void) | undefined;
  onSelectUserBlueprint?: ((blueprint: BlueprintDefinition) => void) | undefined;
  userBlueprints?: Array<{ label: string; description: string | undefined; version: string | undefined; blueprint: BlueprintDefinition | undefined }> | undefined;
  exportSelectedAsBlueprint?: ((id: string) => void) | undefined;
  /** Called when user clicks "Save as Blueprint..." on a group */
  onSaveGroupAsBlueprint?: ((groupNode: import('@/omega-ui-core/types/rack').GroupNode) => void) | undefined;
  /** Called when user clicks "Ungroup" to dissolve the selected group */
  onUngroupNode?: ((groupId: string) => void) | undefined;
  onTogglePin: (id: string | null) => void;
  onSetLayoutRatio: (ratio: number) => void;
  onSetLayoutRatioEnd?: () => void;
  onSelectMultiple: (ids: string[]) => void;
  rackSections: {
    identity?: boolean;
    essentialIdentity?: boolean;
    identityBranding?: boolean;
    globalUiSkin?: boolean;
    activeConstructionPlane?: boolean;
    moduleTaxonomy?: boolean;
    physicalEmulationProfile?: boolean;
    aestheticsGlobals?: boolean;
    aestheticsElements?: boolean;
    architecture?: boolean;
    diagnostics?: boolean;
  };
  onToggleRackSection: (section: string) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  /** Navigation for compliance issues (locate in workbench) */
  onNavigate?: ((path: string) => void) | undefined;
  activeSection?: string | undefined;
  onGroupSelected?: (() => void) | undefined;
  onGroupDown?: ((id: string) => void) | undefined;
}

/**
 * RightDockContainer — Contenedor principal del dock derecho del inspector.
 * Orquestra los paneles de Layers, Element Properties, Rack Properties,
 * Blueprint Library, Terminal Logs, Info e History.
 *
 * Origen: era un monolito de 701 líneas.
 * Archivos extraídos:
 *   - dock/DockPanel.tsx               -> panel genérico reutilizable
 *   - dock/DockIconStrip.tsx           -> barra de iconos vertical
 *   - dock/DockRackSectionToolbar.tsx  -> barra de secciones de rack
 *   - dock/DockInfoPanel.tsx           -> panel de información + diagnóstico
 */
export default function RightDockContainer(props: RightDockContainerProps) {
  const {
    windowStates, onToggleWindow, isCollapsed, onToggleCollapse,
    hiddenNodeIds, lockedNodeIds, onToggleVisibility, onToggleLock,
    manifest, selectedItem, selectedItemId, onSelectItem, pastHistory, onUndoTo,
    onRemoveItem, rackSections, onToggleRackSection, inspectorLevel
  } = props;

  const activeCount = Object.values(windowStates).filter(Boolean).length;
  const showContent = !isCollapsed && activeCount > 0;

  const getDynamicWidth = () => {
    let w = 0;
    if (windowStates.window_layers) w += 260;
    if (windowStates.window_properties) w += 320;
    if (windowStates.window_rack_properties) w += 320;
    if (windowStates.window_blueprints) w += 280;
    if (windowStates.window_compliance) w += 280;
    if (windowStates.window_info || windowStates.window_history) w += 240;
    if (windowStates.window_logs) w += 260;
    return w;
  };
  const dynamicWidth = getDynamicWidth();

  return (
    <div className="h-full flex flex-row select-none">

      {/* 1. DOCK EXPANDED CONTENT DRAWER */}
      <div
        className="flex-shrink-0 flex flex-row bg-black/10 overflow-hidden transition-all duration-300 relative border-l wb-outline"
        style={{ width: showContent ? `${dynamicWidth}px` : '0px', borderLeftWidth: showContent ? '1px' : '0px' }}
      >
        <div className="h-full flex flex-row overflow-hidden divide-x divide-white/5">

          {/* PANEL: LAYERS */}
          {windowStates.window_layers && (
            <DockPanel
              title="Layers"
              icon={<Layers className="w-3.5 h-3.5 text-primary" />}
              onClose={() => onToggleWindow('window_layers')}
              width="w-[260px]"
            >
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
                  multiSelectedIds={props.multiSelectedIds}
                  onSelectMultiple={props.onSelectMultiple}
                  onGroupSelected={props.onGroupSelected}
                  onGroupDown={props.onGroupDown}
                  onDuplicateItem={props.onDuplicateItem}
                  onDuplicateGroup={props.onDuplicateItem}
                  onSaveGroupAsBlueprint={props.onSaveGroupAsBlueprint ? (id: string) => {
                    const tree = manifest.ui?.tree;
                    if (!tree) return;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const findNode = (n: any, targetId: string): any => {
                      if (n.id === targetId) return n;
                      if (n.children) {
                        for (const child of n.children) {
                          const found = findNode(child, targetId);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    const node = findNode(tree, id);
                    if (node) {
                      const groupNode = {
                        id: node.id,
                        label: (node.meta?.label as string) || node.id,
                        pos: node.layout?.pos || { x: 0, y: 0 },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        children: (node.children || []).map((c: any) => ({
                          id: c.id,
                          type: c.cellRef || c.kind || 'knob',
                          label: (c.meta?.label as string) || c.id,
                          pos: c.layout?.pos || { x: 0, y: 0 },
                          size: c.layout?.size || { width: 48, height: 48 },
                          style: c.style || {},
                          bind: c.bind ? { target: c.bind } : undefined
                        }))
                      };
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      props.onSaveGroupAsBlueprint!(groupNode as any);
                    }
                  } : undefined}
                  onUngroupNode={props.onUngroupNode}
                />
              </div>
            </DockPanel>
          )}

          {/* PANEL: ELEMENT PROPERTIES */}
          {windowStates.window_properties && (
            <DockPanel
              title="Element Properties"
              icon={<Sliders className="w-3.5 h-3.5 text-primary" />}
              onClose={() => onToggleWindow('window_properties')}
              width="w-[320px]"
            >
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
                    onSaveGroupAsBlueprint={props.onSaveGroupAsBlueprint}
                    onUngroupNode={props.onUngroupNode}
                    pinnedNodeId={props.pinnedNodeId}
                    onTogglePin={props.onTogglePin}
                    layout={props.layout}
                    onSetLayoutRatio={props.onSetLayoutRatio}
                    onSetLayoutRatioEnd={props.onSetLayoutRatioEnd}
                    multiSelectedIds={props.multiSelectedIds}
                    onSelectMultiple={props.onSelectMultiple}
                    inspectorLevel={inspectorLevel}
                    activeSection={props.activeSection}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-foreground/30 text-[10px] uppercase tracking-widest gap-2 py-20">
                    <Sliders className="w-5 h-5 opacity-40 text-primary" />
                    <span>Select an element</span>
                  </div>
                )}
              </div>
            </DockPanel>
          )}

          {/* PANEL: RACK PROPERTIES */}
          {windowStates.window_rack_properties && (
            <DockPanel
              title="Rack Properties"
              icon={<Settings className="w-3.5 h-3.5 text-primary" />}
              onClose={() => onToggleWindow('window_rack_properties')}
              width="w-[320px]"
            >
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
                  onSaveGroupAsBlueprint={props.onSaveGroupAsBlueprint}
                  onUngroupNode={props.onUngroupNode}
                  pinnedNodeId={props.pinnedNodeId}
                  onTogglePin={props.onTogglePin}
                  layout={props.layout}
                  onSetLayoutRatio={props.onSetLayoutRatio}
                  onSetLayoutRatioEnd={props.onSetLayoutRatioEnd}
                  multiSelectedIds={props.multiSelectedIds}
                  onSelectMultiple={props.onSelectMultiple}
                  visibleSections={rackSections}
                  inspectorLevel={inspectorLevel}
                  activeSection={props.activeSection}
                />
              </div>
            </DockPanel>
          )}

          {/* PANEL: COMPLIANCE */}
          {windowStates.window_compliance && (
            <DockPanel
              title="Compliance"
              icon={<Shield className="w-3.5 h-3.5 text-primary" />}
              onClose={() => onToggleWindow('window_compliance')}
              width="w-[280px]"
              variant="subtle"
            >
              <div className="flex-1 overflow-hidden flex flex-col">
                <CompliancePanel
                  audit={props.audit}
                  manifest={manifest}
                  {...(props.onNavigate ? { onNavigate: props.onNavigate } : {})}
                />
              </div>
            </DockPanel>
          )}

          {/* PANEL: BLUEPRINT LIBRARY */}
          {windowStates.window_blueprints && (
            <DockPanel
              title="Blueprint Library"
              icon={<Zap className="w-3.5 h-3.5 text-primary" />}
              onClose={() => onToggleWindow('window_blueprints')}
              width="w-[280px]"
              variant="subtle"
            >
              <div className="flex-1 overflow-hidden flex flex-col">
                <BlueprintLibraryPanel
                  onSelectBlueprint={props.onSelectBlueprint || (() => {})}
                  onLoadAcepack={props.onLoadAcepack}
                  onSelectUserBlueprint={props.onSelectUserBlueprint}
                  userBlueprints={props.userBlueprints}
                />
              </div>
            </DockPanel>
          )}

          {/* PANEL: TERMINAL LOGS */}
          {windowStates.window_logs && (
            <DockPanel
              title="Terminal Logs"
              icon={<Terminal className="w-3.5 h-3.5 text-primary" />}
              onClose={() => onToggleWindow('window_logs')}
              width="w-[260px]"
              variant="subtle"
            >
              <div className="flex-1 overflow-hidden flex flex-col relative bg-black/40">
                <LogTerminal logs={props.logs || []} />
              </div>
            </DockPanel>
          )}

          {/* COMBINED COLUMN: INFO & HISTORY */}
          {(windowStates.window_info || windowStates.window_history) && (
            <div className="w-[240px] h-full flex flex-col overflow-hidden shrink-0 divide-y divide-white/10 bg-black/10">

              {windowStates.window_info && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <DockPanel
                    title="Information"
                    icon={<Info className="w-3.5 h-3.5 text-primary" />}
                    onClose={() => onToggleWindow('window_info')}
                    width="w-full"
                  >
                    <DockInfoPanel
                      selectedItem={selectedItem}
                      selectedItemId={selectedItemId}
                      contract={props.contract}
                      isLiveMode={props.isLiveMode}
                      uiTheme={props.uiTheme}
                    />
                  </DockPanel>
                </div>
              )}

              {windowStates.window_history && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <DockPanel
                    title="History"
                    icon={<History className="w-3.5 h-3.5 text-primary" />}
                    onClose={() => onToggleWindow('window_history')}
                    width="w-full"
                  >
                    <div className="flex-grow overflow-y-auto bg-black/25 flex flex-col py-1 select-none">
                      {pastHistory.length === 0 ? (
                        <div className="flex-grow flex items-center justify-center text-foreground/20 text-[8px] uppercase tracking-widest gap-1 py-4">
                          <History className="w-3 h-3" />
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
                               <span className="text-primary opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">&gt;</span>
                               <span className="truncate">{entry.label}</span>
                            </div>
                            <span className="text-[6px] opacity-30 shrink-0">
                              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </DockPanel>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* 2. DOCK COLLAPSE HANDLE */}
      {activeCount > 0 && (
        <div
          onClick={onToggleCollapse}
          className="w-1.5 hover:w-2 bg-black/40 hover:bg-[#ff8c00]/30 border-l border-r wb-outline/40 flex items-center justify-center cursor-pointer select-none transition-all duration-200 group z-40 shrink-0"
          title={isCollapsed ? 'Expand Dock' : 'Collapse Dock'}
        >
          <span className="text-[6px] opacity-40 group-hover:opacity-100 transition-opacity text-foreground select-none">
            {isCollapsed ? '◀' : '▶'}
          </span>
        </div>
      )}

      {/* 2.5. RACK SECTION TOOLBAR */}
      {windowStates.window_rack_properties && !isCollapsed && (
        <DockRackSectionToolbar
          rackSections={rackSections}
          onToggleRackSection={onToggleRackSection}
        />
      )}

      {/* 3. RIGHT ICON STRIP */}
      <DockIconStrip
        isCollapsed={isCollapsed}
        windowStates={windowStates}
        onToggleWindow={onToggleWindow}
      />

    </div>
  );
}
