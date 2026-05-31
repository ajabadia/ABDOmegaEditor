'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

// UI Components
import Header from './layout/Header';
import WorkbenchFooter from './layout/WorkbenchFooter';
import WorkbenchLogs from './layout/WorkbenchLogs';
import EditorModals from './modals/EditorModals';
import ModulationGrid from './modulation/ModulationGrid';
import { HiddenFileHandlers } from './shared/HiddenFileHandlers';
import TemplateGallery from './gallery/TemplateGallery';
import RightDockContainer from './inspector/RightDockContainer';
import WorkbenchPane from './workspace/WorkbenchPane';
import { SplitDivider, HorizontalSplitDivider } from './workspace/SplitDivider';
import CellStudioContainer from './lab/CellStudioContainer';
import Toolbar from './layout/Toolbar';

// Hooks
import { useWorkbenchShortcuts } from '@/features/manifest-editor/hooks/useWorkbenchShortcuts';

// Types
import type { ManifestEntity, ModuleTemplate, OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import { useManifestEditor } from '@/features/manifest-editor/hooks/useManifestEditor';
import { useViewport } from '@/features/manifest-editor/hooks/useViewport';
import { useAudit } from '@/features/manifest-editor/hooks/useAudit';
import { useWorkbenchState, type WorkbenchTabType, type WorkbenchPaneId } from '@/features/manifest-editor/hooks/useWorkbenchState';
import { useAuditNavigator } from '@/features/manifest-editor/hooks/useAuditNavigator';
import { useWatchdog } from '@/features/manifest-editor/hooks/useWatchdog';
import { adaptModuleTemplateToBlueprintDefinition } from '../utils/blueprintUtils';
import { useDynamicFonts } from '@/features/manifest-editor/hooks/useDynamicFonts';
import type { TabDiagnostics, Diagnostic } from '../types/diagnostics';
import { createEmptyDiagnostics } from '../types/diagnostics';
import { mergeDiagnostics } from '../utils/diagnosticUtils';
import { structuralAuditor } from '../services/StructuralAuditor';
import type { DocumentState } from '../types/document';

// Services
import { ContractService } from '@/services/contractService';

// --- Components ---

interface WorkbenchContainerProps {
  onOpenCellEditor?: () => void;
  onOpenAudit?: () => void;
  onOpenGovernance?: () => void;
  
  // External state overrides
  isAuditOpen?: boolean;
  setIsAuditOpen?: (open: boolean) => void;
  isGovernanceOpen?: boolean;
  setIsGovernanceOpen?: (open: boolean) => void;
  isCellEditorOpen?: boolean;
  setIsCellEditorOpen?: (open: boolean) => void;
  isCellLibraryOpen?: boolean;
  setIsCellLibraryOpen?: (open: boolean) => void;
}

export default function WorkbenchContainer({ 
  onOpenGovernance,
  setIsCellLibraryOpen: setIsCellLibraryOpenProp,
  isCellLibraryOpen: isCellLibraryOpenProp,
  onOpenCellEditor,
  onOpenAudit,
  isAuditOpen,
  setIsAuditOpen,
  isGovernanceOpen,
  setIsGovernanceOpen,
  isCellEditorOpen,
  setIsCellEditorOpen,
}: WorkbenchContainerProps) {
  // 1. Workspace State
  const { state, actions, derived } = useWorkbenchState();

  const [rackSections, setRackSections] = useState({
    identity: true,
    essentialIdentity: true,
    identityBranding: true,
    globalUiSkin: true,
    activeConstructionPlane: true,
    moduleTaxonomy: true,
    physicalEmulationProfile: true,
    aestheticsGlobals: true,
    aestheticsElements: true,
    architecture: true,
    diagnostics: true
  });

  const handleToggleRackSection = useCallback((section: 'identity' | 'essentialIdentity' | 'identityBranding' | 'globalUiSkin' | 'activeConstructionPlane' | 'moduleTaxonomy' | 'physicalEmulationProfile' | 'aestheticsGlobals' | 'aestheticsElements' | 'architecture' | 'diagnostics') => {
    setRackSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleOpenConfig = onOpenGovernance || (() => actions.toggleUIState('isConfigModalOpen'));
  const handleOpenAudit = onOpenAudit || (() => actions.toggleUIState('isAuditModalOpen'));
  const handleOpenCellEditor = onOpenCellEditor || (() => actions.toggleUIState('isCellEditorOpen'));

  // 2. Core Data & Operations
  const editor = useManifestEditor(state, actions);
  const { manifest, contract, updateManifest } = editor;

  const { auditResult } = useAudit(manifest, contract);
  
  // 3. Diff & History Operations (Consolidated in useWorkbenchState)
  const handleCompareWithHistory = useCallback((index: number) => {
    const diff = editor.compareWithHistory(index);
    if (diff) {
      actions.setActiveDiff(diff);
      actions.setIsDiffModalOpen(true);
    }
  }, [editor, actions]);

  const activeTabId = state.panesById[state.focusedPaneId].activeTabId;
  const activeTab = activeTabId ? state.tabsById[activeTabId] : null;

  const currentTabViewState = activeTabId ? state.tabViewState[activeTabId] : undefined;
  
  // Sync Active Document with Focused Tab
  useEffect(() => {
    const docId = activeTab?.payload?.documentId as string;
    if (docId && docId !== editor.orchestrator.activeDocumentId) {
      editor.orchestrator.setActiveDocument(docId);
    }
  }, [activeTab?.payload?.documentId, editor.orchestrator.activeDocumentId, editor.orchestrator]);

  const isGalleryOpen = state.blueprintGalleryOpen; 
  const setIsGalleryOpen = useCallback((open?: boolean) => {
    if (typeof open === 'boolean') {
      if (open !== state.blueprintGalleryOpen) actions.toggleUIState('blueprintGalleryOpen');
    } else {
      actions.toggleUIState('blueprintGalleryOpen');
    }
  }, [state.blueprintGalleryOpen, actions]);
  
  // 3. Diagnostics Surface (Phase 6.3 Aggregation)
  const [tabDiagnostics, setTabDiagnostics] = useState<Record<string, TabDiagnostics>>({});

  // Memoize Structural Diagnostics (Global)
  const structuralDiagnostics = useMemo(() => 
    structuralAuditor.extractDiagnostics(manifest as OMEGA_Manifest, { contract: contract as OMEGA_Contract }), 
    [manifest, contract]
  );

  const handleDiagnosticsUpdate = useCallback((tabId: string, diagnosticsRaw: unknown) => {
    const diagnostics = diagnosticsRaw as TabDiagnostics;
    setTabDiagnostics(prev => {
      const current = prev[tabId];
      if (current && 
          current.errorCount === diagnostics.errorCount && 
          current.warningCount === diagnostics.warningCount &&
          current.infoCount === diagnostics.infoCount) return prev;
      
      return { ...prev, [tabId]: diagnostics };
    });
  }, []);

  const handleApplyTemplate = useCallback((template: ModuleTemplate) => {
    try {
      const blueprint = adaptModuleTemplateToBlueprintDefinition(template);
      editor.applyTemplate(blueprint);
      setIsGalleryOpen(false);
    } catch (err) {
      console.error("[BLUEPRINT] Failed to adapt legacy template:", err);
    }
  }, [editor, setIsGalleryOpen]);
  
  const handleSelectItem = useCallback((id: string | null) => {
    actions.setSelectedNode(id);
  }, [actions]);

  const selectedItemId = state.selectedNodeId;

  const setActiveTab = useCallback((tabId: string) => {
    if (['orbital', 'rack', 'source'].includes(tabId)) {
      actions.focusTab('primary', `tab-${tabId}`);
    }
  }, [actions]);

  const gps = useAuditNavigator(manifest as OMEGA_Manifest, handleSelectItem, setActiveTab);
  const handleNavigateToIssue = gps.handleNavigateToIssue;
  
  // 3. Watchdog Integration (Hot-Reload)
  const handleWatchdogUpdate = useCallback((content: string) => {
    editor.handleBulkUpload([new File([content], 'auto-reload.acemm')]);
  }, [editor]);

  const watchdog = useWatchdog(handleWatchdogUpdate);
  useDynamicFonts(manifest as OMEGA_Manifest, editor.resolveAsset);
  
  // 5. Exit Guards
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const docs = editor.orchestrator.documentsById as Record<string, DocumentState>;
      const hasDirty = Object.values(docs).some(doc => doc.isDirty);
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editor.orchestrator.documentsById]);

  // 6. Keyboard Shortcuts Modularized
  useWorkbenchShortcuts(editor, selectedItemId);

  // 7. Effects & Synchronization (Aseptic Sync)
  useEffect(() => {
    const m = manifest as OMEGA_Manifest;
    const manifestTab = m.ui?.layout?.activeTab;
    const currentTabType = activeTab?.type || 'rack';
    if (manifestTab !== currentTabType && ['rack', 'orbital'].includes(currentTabType)) {
      updateManifest({ 
        ui: { 
          ...m.ui, 
          layout: { 
            width: manifest.ui?.layout?.width || 800,
            height: manifest.ui?.layout?.height || 600,
            containers: manifest.ui?.layout?.containers || [],
            ...m.ui?.layout, 
            activeTab: currentTabType as WorkbenchTabType
          } 
        } 
      });
    }
  }, [activeTab?.type, manifest, updateManifest]);
  
  const handleAddEntity = useCallback((type: 'control' | 'jack') => {
    const id = editor.addEntity(type);
    if (id) handleSelectItem(id);
  }, [editor, handleSelectItem]);
  
  const handleDuplicateItem = useCallback((id: string) => {
    const newId = editor.duplicateItem(id);
    if (newId) handleSelectItem(newId);
  }, [editor, handleSelectItem]);
  
  const handleRemoveItem = useCallback((id: string) => {
    editor.removeItem(id);
    if (selectedItemId === id) handleSelectItem(null);
  }, [editor, selectedItemId, handleSelectItem]);
  
  const onDeploy = useCallback(async () => {
    if (await editor.handleDeploy() === 'AUDIT_FAIL') actions.toggleUIState('isAuditModalOpen');
  }, [editor, actions]);

  const onReset = useCallback(() => {
    editor.reset();
  }, [editor]);
  
  const handleExportContract = (format: 'ts' | 'cpp') => {
    ContractService.downloadContract(manifest as OMEGA_Manifest, format);
  };
  
  const triggerUpload = (id: string) => document.getElementById(id)?.click();

  const availableBinds = useMemo(() => {
    const c = contract as OMEGA_Contract | null;
    if (!c) return [];
    return [
      ...(c.ports?.map((p: { id: string }) => p.id) || [])
    ];
  }, [contract]);
  
  const [localIsCellLibraryOpen, setLocalIsCellLibraryOpen] = useState(false);
  const isCellLibraryOpen = isCellLibraryOpenProp ?? localIsCellLibraryOpen;
  const setIsCellLibraryOpen = setIsCellLibraryOpenProp ?? setLocalIsCellLibraryOpen;

  const handleAddFromLibrary = useCallback((dna: Record<string, unknown>) => {
    // Detect type based on dna
    const type: 'control' | 'jack' = dna.type === 'port' ? 'jack' : 'control';
    editor.addEntity(type, { ...dna, category: 'primitive' } as unknown as Partial<ManifestEntity>);
  }, [editor]);

  const selectedItem = useMemo(() => 
    (selectedItemId ? editor.findItem(selectedItemId) : state.selectedNodeId ? (manifest.ui.controls as ManifestEntity[])?.find((c: ManifestEntity) => c.id === state.selectedNodeId) || (manifest.ui.jacks as ManifestEntity[])?.find((c: ManifestEntity) => c.id === state.selectedNodeId) : manifest) || null
  , [selectedItemId, state.selectedNodeId, editor, manifest]);

  const studioCell = useMemo(() => {
    if (!state.studioMode.isOpen || !state.studioMode.cellId) return undefined;
    return editor.findItem(state.studioMode.cellId) as ManifestEntity;
  }, [state.studioMode.isOpen, state.studioMode.cellId, editor]);

  const handleDragRatio = useCallback((delta: number) => {
    actions.setLayoutRatio(state.layout.ratio + delta);
  }, [actions, state.layout.ratio]);

  const handleDragPrimarySplitRatio = useCallback((delta: number) => {
    actions.setPrimarySplitRatio(state.primarySplitRatio + delta);
  }, [actions, state.primarySplitRatio]);

  const handleDragSecondarySplitRatio = useCallback((delta: number) => {
    actions.setSecondarySplitRatio(state.secondarySplitRatio + delta);
  }, [actions, state.secondarySplitRatio]);

  const handleDragRatioEnd = useCallback(() => {
  }, []);

  const handleDiagnosticClick = useCallback((tabId: string, diagRaw: unknown) => {
    const diag = diagRaw as Diagnostic;
    // 1. If it's a Monaco error, switch to source tab and highlight
    if (diag.source === 'Monaco' || diag.line) {
      actions.focusTab('primary', 'tab-source');
    } 
    // 2. If it's a structural error with an entityId, we could select the item
    else if (diag.entityId) {
      handleSelectItem(diag.entityId);
    }
  }, [actions, handleSelectItem]);

  const handleCaptureViewState = useCallback((tabId: string, viewState: unknown) => {
    actions.captureTabViewState(tabId, { editorViewState: viewState });
  }, [actions]);

  // 7. Render Helper
  const renderPane = (paneId: WorkbenchPaneId) => {
    const pane = state.panesById[paneId];
    const activeId = pane.activeTabId;
    
    const paneTabs = pane.tabIds.map(id => {
      const t = state.tabsById[id];
      const monacoDiags = tabDiagnostics[id] || createEmptyDiagnostics();
      const isManifestView = ['source', 'rack', 'orbital', 'inspector', 'uca-tree'].includes(t.type);
      const diagnostics = isManifestView ? mergeDiagnostics([monacoDiags, structuralDiagnostics]) : monacoDiags;
      const documentId = (t.payload?.documentId as string) || 'primary';
      const docs = editor.orchestrator.documentsById as Record<string, DocumentState>;
      const isDocumentDirty = docs[documentId]?.isDirty ?? false;

      return { ...t, isDirty: isDocumentDirty, diagnostics };
    });

    return (
      <WorkbenchPane 
        paneId={paneId}
        tabs={paneTabs}
        activeTabId={activeId}
        isFocused={state.focusedPaneId === paneId}
        onTabSelect={(tabId) => actions.focusTab(paneId, tabId)}
        onTabClose={(tabId) => {
          const t = state.tabsById[tabId];
          const isManifestView = ['source', 'rack', 'orbital', 'inspector', 'uca-tree'].includes(t.type);
          const documentId = (t.payload?.documentId as string) || 'primary';
          const docs = editor.orchestrator.documentsById as Record<string, DocumentState>;
          const isTabDirty = isManifestView && docs[documentId]?.isDirty;
          if (isTabDirty && !confirm(`Tab "${t.title}" has unsaved changes. Close anyway?`)) return;
          actions.closeTab(tabId);
        }}
        onPaneFocus={() => actions.focusPane(paneId)}
        onDiagnosticClick={handleDiagnosticClick}
        simulationBridge={editor.simulationBridge}
        manifest={manifest as OMEGA_Manifest}
        contract={contract as OMEGA_Contract | null}
        orchestrator={editor.orchestrator}
        activeId={editor.activeId}
        tabViewState={state.tabViewState}
        onCaptureViewState={handleCaptureViewState}
        onDiagnosticsUpdate={handleDiagnosticsUpdate}
        selectedItemId={state.selectedNodeId}
        multiSelectedIds={state.multiSelectedNodeIds}
        onSelectItem={handleSelectItem}
        onSelectMultiple={actions.setMultiSelectedNodes}
        updateItem={editor.updateItem}
        updateContainer={editor.updateContainer}
        auditResult={auditResult}
        resolveAsset={editor.resolveAsset}
        isLiveMode={state.isLiveMode} 
        setIsLiveMode={() => actions.toggleUIState('isLiveMode')}
        onUndoTo={editor.undoTo}
        onCompareWithHistory={handleCompareWithHistory}
        hiddenNodeIds={state.hiddenNodeIds}
        lockedNodeIds={state.lockedNodeIds}
        onMoveTab={actions.moveTabToPane}
        isSplitH={paneId === 'primary' || paneId === 'primary_bottom' ? state.isPrimarySplitH : state.isSecondarySplitH}
        onToggleSplitH={paneId === 'primary' || paneId === 'secondary' ? () => actions.toggleHorizontalSplit(paneId) : undefined}
        isSplitV={paneId === 'primary' ? derived.isSplit : undefined}
        onToggleSplitV={paneId === 'primary' ? () => {
          const nextMode = derived.isSplit ? 'single' : 'vertical';
          actions.setLayoutMode(nextMode);
        } : undefined}
        onClosePane={paneId !== 'primary' ? () => actions.closePane(paneId) : undefined}
      />
    );
  };

  return (
    <div className="h-screen flex flex-col wb-bg wb-text font-sans overflow-hidden select-none relative transition-colors duration-500" data-ui-theme={state.uiTheme}>
      <HiddenFileHandlers onResourceUpload={editor.handleResourceUpload} setPendingFiles={actions.setPendingFiles} />
      
      {/* HEADER WRAPPER WITH ZEN HEIGHT TRANSITION */}
      <div className={`relative z-[100] transition-all duration-300 ${state.isZenMode ? 'h-0 opacity-0 pointer-events-none overflow-hidden' : 'h-auto'}`}>
        <Header 
          onReset={onReset} 
          onUndo={editor.undo}
          onRedo={editor.redo}
          activeTabType={(activeTab?.type && ['orbital', 'rack', 'source', 'history'].includes(activeTab.type)) ? (activeTab.type as 'orbital' | 'rack' | 'source' | 'history') : 'rack'}
          onTabFocus={(type) => {
            actions.openTab({ 
              id: `tab-${type}`,
              type: type as WorkbenchTabType, 
              title: type.charAt(0).toUpperCase() + type.slice(1) 
            });
          }}
          onExportManifest={editor.exportManifest} 
          onExportPack={editor.exportOmegaPack}
          onExportCAD={() => editor.exportCADBlueprint()} onExportContract={handleExportContract}
          onLinkDirectory={editor.linkDirectory}
          isDirectoryLinked={editor.isDirectoryLinked}
          onGenerateMockup={() => actions.toggleUIState('mockupOpen')} onDeploy={onDeploy}
          onToggleLogs={() => actions.toggleUIState('showLogs')} showLogs={state.showLogs}
          uiTheme={state.uiTheme}
          setUiTheme={actions.setUiTheme}
          onHelp={() => actions.setHelpState(true)}
          audit={auditResult}
          onOpenAudit={handleOpenAudit}
          onTriggerUpload={triggerUpload}
          onOpenAbout={() => actions.toggleUIState('isAboutModalOpen')}
          onOpenConfig={handleOpenConfig}
          onOpenCellEditor={handleOpenCellEditor}
          onOpenGallery={() => setIsGalleryOpen(true)}
          windowStates={{
            window_layers: state.window_layers,
            window_properties: state.window_properties,
            window_rack_properties: state.window_rack_properties,
            window_blueprints: state.window_blueprints,
            window_info: state.window_info,
            window_history: state.window_history,
            window_logs: state.window_logs
          }}
          onToggleWindow={actions.toggleWindow}
          simulationBridge={editor.simulationBridge}
          rackSections={rackSections}
          onToggleRackSection={handleToggleRackSection}
        />
      </div>

      {isGalleryOpen && (
        <TemplateGallery 
          onSelect={handleApplyTemplate}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}

      <main className="flex-1 flex overflow-hidden">
        {state.studioMode.isOpen ? (
          <div className="flex-1 p-4 bg-black/20 animate-in fade-in zoom-in-95 duration-500">
            <CellStudioContainer 
              initialCell={studioCell}
              manifest={manifest as OMEGA_Manifest}
              resolveAsset={editor.resolveAsset}
              onFreeze={(template) => {
                editor.registerTemplate(template);
                actions.setStudioMode(false);
              }}
              onSave={(updatedCell) => {
                if (state.studioMode.cellId) {
                  editor.updateItem(state.studioMode.cellId, updatedCell);
                }
                actions.setStudioMode(false);
              }}
              onClose={() => actions.setStudioMode(false)}
            />
          </div>
        ) : (
          <>
            {/* LEFT WORKSPACE: PANES */}
            <div className="flex-1 flex overflow-hidden relative">
              <Toolbar 
                isLiveMode={state.isLiveMode}
                onToggleLive={() => actions.toggleUIState('isLiveMode')}
                onOpenGallery={() => actions.toggleUIState('blueprintGalleryOpen')}
                onOpenAudit={handleOpenAudit}
                onOpenConfig={handleOpenConfig}
                onOpenCellStudio={() => {
                  actions.setStudioMode(true, selectedItemId || undefined);
                }}
                onAddEntity={handleAddEntity}
                isZenMode={state.isZenMode}
                onToggleZen={actions.toggleZenMode}
              />
              {/* PRIMARY PANE COLUMN */}
              <div 
                className="flex flex-col overflow-hidden h-full" 
                style={{ width: derived.isSplit ? `${state.layout.ratio * 100}%` : '100%' }}
              >
                {state.isPrimarySplitH ? (
                  <>
                    <div className="overflow-hidden min-h-[80px] flex flex-col" style={{ height: `${state.primarySplitRatio * 100}%` }}>
                      {renderPane('primary')}
                    </div>
                    <HorizontalSplitDivider onDrag={handleDragPrimarySplitRatio} />
                    <div className="flex-1 overflow-hidden min-h-[80px] flex flex-col" style={{ height: `${(1 - state.primarySplitRatio) * 100}%` }}>
                      {renderPane('primary_bottom')}
                    </div>
                  </>
                ) : (
                  renderPane('primary')
                )}
              </div>

              {/* SPLIT DIVIDER */}
              {derived.isSplit && <SplitDivider onDrag={handleDragRatio} />}

              {/* SECONDARY PANE COLUMN */}
              {derived.isSplit && (
                <div className="flex-1 border-l wb-outline flex flex-col overflow-hidden h-full animate-in slide-in-from-right duration-500">
                  {state.isSecondarySplitH ? (
                    <>
                      <div className="overflow-hidden min-h-[80px] flex flex-col" style={{ height: `${state.secondarySplitRatio * 100}%` }}>
                        {renderPane('secondary')}
                      </div>
                      <HorizontalSplitDivider onDrag={handleDragSecondarySplitRatio} />
                      <div className="flex-1 overflow-hidden min-h-[80px] flex flex-col" style={{ height: `${(1 - state.secondarySplitRatio) * 100}%` }}>
                        {renderPane('secondary_bottom')}
                      </div>
                    </>
                  ) : (
                    renderPane('secondary')
                  )}
                </div>
              )}
            </div>

            {/* RIGHT WORKSPACE: MODULAR DOCK SYSTEM (Photoshop style) */}
            <RightDockContainer 
              manifest={manifest as OMEGA_Manifest}
              contract={contract as OMEGA_Contract | null}
              selectedItem={selectedItem}
              selectedItemId={selectedItemId}
              highlightPath={gps.highlightPath}
              availableBinds={availableBinds}
              extraResources={editor.extraResources}
              audit={auditResult}
              isLiveMode={state.isLiveMode}
              uiTheme={state.uiTheme}
              pinnedNodeId={state.pinnedNodeId}
              layout={state.layout}
              multiSelectedIds={state.multiSelectedNodeIds}
              pastHistory={editor.orchestrator.documentsById['primary']?.history?.past || []}
              onUndoTo={editor.undoTo}
              logs={editor.logs}
              windowStates={{
                window_layers: state.window_layers,
                window_properties: state.window_properties,
                window_rack_properties: state.window_rack_properties,
                window_blueprints: state.window_blueprints,
                window_info: state.window_info,
                window_history: state.window_history,
                window_logs: state.window_logs
              }}
              onToggleWindow={actions.toggleWindow}
              hiddenNodeIds={state.hiddenNodeIds}
              lockedNodeIds={state.lockedNodeIds}
              onToggleVisibility={actions.toggleNodeVisibility}
              onToggleLock={actions.toggleNodeLock}
              isCollapsed={state.isRightPanelCollapsed}
              onToggleCollapse={actions.toggleRightPanel}
              onUpdateItem={editor.updateItem}
              onUpdateManifest={updateManifest}
              onSelectItem={handleSelectItem}
              onAddEntity={handleAddEntity}
              onDuplicateItem={handleDuplicateItem}
              onRemoveItem={handleRemoveItem}
              onAddModulation={editor.addModulation}
              onRemoveModulation={editor.removeModulation}
              onUpdateModulation={editor.updateModulation}
              onOpenModGrid={() => actions.toggleUIState('showModGrid')}
              addContainer={editor.addContainer}
              updateContainer={editor.updateContainer}
              removeContainer={editor.removeContainer}
              onHelp={(sectionId) => actions.setHelpState(true, sectionId)}
              onRemoveResource={editor.handleRemoveResource}
              resolveAsset={editor.resolveAsset}
              onTriggerUpload={triggerUpload}
              onOpenConfig={handleOpenConfig}
              onOpenLibrary={() => setIsCellLibraryOpen(true)}
              onSelectBlueprint={editor.blueprintInjection.startInjection}
              exportSelectedAsBlueprint={editor.exportSelectedAsBlueprint}
              onTogglePin={(id) => {
                actions.setPinnedNode(id);
              }}
              onSetLayoutRatio={actions.setLayoutRatio}
              onSetLayoutRatioEnd={handleDragRatioEnd}
              onSelectMultiple={actions.setMultiSelectedNodes}
              rackSections={rackSections}
              onToggleRackSection={handleToggleRackSection}
            />
          </>
        )}

        {state.showModGrid && (
          <ModulationGrid 
            manifest={manifest as OMEGA_Manifest} onAdd={editor.addModulation} 
            onRemove={editor.removeModulation} onUpdate={editor.updateModulation} 
            onClose={() => actions.toggleUIState('showModGrid')} 
          />
        )}
      </main>

      <EditorModals 
        manifest={manifest as OMEGA_Manifest}
        pendingFiles={state.pendingFiles}
        setPendingFiles={(files) => actions.setPendingFiles(files || [])}
        handleBulkUpload={editor.handleBulkUpload}
        helpState={{ isOpen: state.helpState.isOpen, sectionId: state.helpState.sectionId || '' }}
        closeHelp={() => actions.setHelpState(false)}
        isAuditModalOpen={isAuditOpen !== undefined ? isAuditOpen : state.isAuditModalOpen}
        setIsAuditModalOpen={setIsAuditOpen ? (open) => setIsAuditOpen(open) : () => actions.toggleUIState('isAuditModalOpen')}
        isAboutModalOpen={state.isAboutModalOpen}
        setIsAboutModalOpen={() => actions.toggleUIState('isAboutModalOpen')}
        handleNavigateToIssue={handleNavigateToIssue}
        auditResult={auditResult}
        mockupOpen={state.mockupOpen}
        setMockupOpen={() => actions.toggleUIState('mockupOpen')}
        resolveAsset={editor.resolveAsset}
        onDeploy={onDeploy}
        isConfigModalOpen={isGovernanceOpen !== undefined ? isGovernanceOpen : state.isConfigModalOpen}
        setIsConfigModalOpen={setIsGovernanceOpen ? (open) => setIsGovernanceOpen(open) : () => actions.toggleUIState('isConfigModalOpen')}
        onUpdateManifest={updateManifest}
        isCellEditorOpen={isCellEditorOpen !== undefined ? isCellEditorOpen : state.isCellEditorOpen}
        setIsCellEditorOpen={setIsCellEditorOpen ? (open) => setIsCellEditorOpen(open) : () => actions.toggleUIState('isCellEditorOpen')}
        isCellLibraryOpen={isCellLibraryOpen}
        setIsCellLibraryOpen={setIsCellLibraryOpen}
        onAddEntityFromLibrary={handleAddFromLibrary}
        
        // Phase 9.2 Diff
        isDiffModalOpen={state.isDiffModalOpen}
        setIsDiffModalOpen={actions.setIsDiffModalOpen}
        activeDiff={state.activeDiff}
        onMergeEntries={editor.handleMergeEntries}
        blueprintInjection={editor.blueprintInjection}
      />

      {!state.isZenMode && (
        <WorkbenchFooter 
          watchdogStatus={watchdog.status}
          watchdogTime={watchdog.lastUpdate}
          activeTabType={(activeTab?.type && ['orbital', 'rack', 'source', 'history'].includes(activeTab.type)) ? (activeTab.type as 'orbital' | 'rack' | 'source' | 'history') : 'rack'}
          onTabFocus={(type) => {
            actions.openTab({ 
              id: `tab-${type}`,
              type: type as WorkbenchTabType, 
              title: type.charAt(0).toUpperCase() + type.slice(1) 
            });
          }}
          isSplit={derived.isSplit}
          onToggleSplit={() => {
            const nextMode = derived.isSplit ? 'single' : 'vertical';
            actions.setLayoutMode(nextMode);
          }}
        />
      )}
    </div>
  );
}
