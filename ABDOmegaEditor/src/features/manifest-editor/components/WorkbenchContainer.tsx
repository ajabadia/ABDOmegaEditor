'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

// UI Components
import Header from './layout/Header';
import WorkbenchFooter from './layout/WorkbenchFooter';
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
import { useAudit } from '@/features/manifest-editor/hooks/useAudit';
import { useWorkbenchState, type WorkbenchTabType, type WorkbenchPaneId } from '@/features/manifest-editor/hooks/useWorkbenchState';
import { useAuditNavigator } from '@/features/manifest-editor/hooks/useAuditNavigator';
import { useWatchdog } from '@/features/manifest-editor/hooks/useWatchdog';
import { adaptModuleTemplateToBlueprintDefinition, adaptV2BlueprintToBlueprintDefinition } from '../utils/blueprintUtils';
import type { V2BlueprintData, BlueprintDefinition } from '@/omega-ui-core/types';
import { findNodeInTree } from '../hooks/entities/ucaInspectorAdapter';
import { manifestToTree } from '@/omega-ui-core/utils/ucaBridge';
import { useDynamicFonts } from '@/features/manifest-editor/hooks/useDynamicFonts';
import { useGhostPreview } from '@/features/manifest-editor/hooks/useGhostPreview';
import { generateBlueprintThumbnail } from '@/omega-ui-core/utils/BlueprintThumbnailGenerator';
import type { TabDiagnostics, Diagnostic } from '../types/diagnostics';
import { createEmptyDiagnostics } from '../types/diagnostics';
import { mergeDiagnostics } from '../utils/diagnosticUtils';
import { structuralAuditor } from '../services/StructuralAuditor';
import type { DocumentState } from '../types/document';
import { toggleGridField } from '../utils/gridHelpers';

// Services
import { ContractService } from '@/services/contractService';

// --- Components ---

interface WorkbenchContainerProps {
  onOpenCellEditor?: () => void;
  onOpenAudit?: () => void;
  
  // External state overrides
  isAuditOpen?: boolean;
  setIsAuditOpen?: (open: boolean) => void;
  isCellEditorOpen?: boolean;
  setIsCellEditorOpen?: (open: boolean) => void;

}

export default function WorkbenchContainer({ 
  onOpenCellEditor,
  onOpenAudit,
  isAuditOpen,
  setIsAuditOpen,
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

  const handleToggleRackSection = useCallback((section: string) => {
    setRackSections(prev => ({ ...prev, [section]: !((prev as Record<string, boolean>)[section]) }));
  }, []);

  // Phase 39 — recovered from backup MenuBar (View > Inspector Level)
  const [inspectorLevel, setInspectorLevel] = useState<'simple' | 'medium' | 'advanced'>('medium');

  // S7: User-imported blueprints (from .acepack files) — stored for User Library display + injection
  const [userBlueprints, setUserBlueprints] = useState<Array<{ label: string; description: string | undefined; version: string | undefined; blueprint: BlueprintDefinition | undefined }>>([]);
  const [inspectorActiveSection, setInspectorActiveSection] = useState<string | undefined>(undefined);

  const [activeTool, setActiveTool] = useState<'select' | 'marquee' | 'add' | 'studio' | null>('select');

  // 2. Core Data & Operations
  const editor = useManifestEditor(state, actions);
  const { manifest, contract, updateManifest } = editor;

  // Phase 39 — recovered from backup MenuBar (File > Export > Cell as Blueprint JSON)
  // Serializes the currently selected cell as a ModuleTemplate and registers it
  // into `manifest.moduleTemplates` via `editor.registerTemplate`. Replaces the
  // previous `() => setIsGalleryOpen(true)` proxy wiring. Uses `findNodeInTree` +
  // `manifestToTree` to locate the cell, and reuses the canonical
  // `useTemplateCRUD.registerTemplate` path so the new template is immediately
  // usable from the gallery / blueprint injection pipeline.
  const handleSaveCellAsBlueprint = useCallback(() => {
    const selectedId = state.selectedNodeId;
    if (!selectedId) {
      editor.addLog('[ERROR] No cell selected to save as blueprint.');
      return;
    }

    const tree = (manifest as OMEGA_Manifest).ui?.tree
      || manifestToTree(manifest as OMEGA_Manifest, (manifest as OMEGA_Manifest).ui?.tree);
    const selectedNode = findNodeInTree(tree, selectedId);
    if (!selectedNode) {
      editor.addLog(`[ERROR] Cell ${selectedId} not found in UCA tree.`);
      return;
    }

    const blueprintId = `bp_${selectedNode.id}_${Date.now().toString(36)}`;
    const labelFromMeta = typeof selectedNode.meta?.label === 'string'
      ? (selectedNode.meta.label as string)
      : null;
    const template: ModuleTemplate = {
      id: selectedNode.id,
      label: labelFromMeta || selectedNode.id,
      category: selectedNode.kind === 'face'
        ? 'structure'
        : selectedNode.kind === 'container' || selectedNode.kind === 'group'
          ? 'composite'
          : 'control',
      baseNode: selectedNode,
      description: `Cell captured from rack as blueprint ${blueprintId}`,
      version: '1.0.0',
      family: 'user-saved',
      slots: [],
    };

    editor.registerTemplate(template);
    // ── S1: Also export physical .acepack ─────────────────────────
    editor.exportCellAsBlueprint?.(selectedId);
  }, [manifest, state.selectedNodeId, editor]);

  // Grid & Guides state derived from manifest
  const grid = (manifest as OMEGA_Manifest).ui?.layout?.grid;
  const gridVisible = grid?.visible ?? false;
  const showGuides = grid?.showGuides ?? false;

  const handleToggleGrid = useCallback(() => {
    updateManifest(toggleGridField(manifest as OMEGA_Manifest, 'visible'));
  }, [manifest, updateManifest]);

  const handleToggleGuides = useCallback(() => {
    updateManifest(toggleGridField(manifest as OMEGA_Manifest, 'showGuides'));
  }, [manifest, updateManifest]);

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

  // S7: Handle .acepack upload — ingested resources + store for User Library
  const handleLoadAcepack = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.acepack,.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const result = await editor.handleBlueprintUpload(file);
      if (result) {
        setUserBlueprints(prev => [...prev, result]);
      }
    };
    input.click();
  }, [editor]);

  // S8: Inject a user-imported blueprint
  const handleSelectUserBlueprint = useCallback((blueprint: BlueprintDefinition) => {
    editor.applyTemplate(blueprint);
  }, [editor]);

  /** Handle "Save as Blueprint..." from GroupEditor — converts group to BlueprintDefinition and registers it. */
  const handleSaveGroupAsBlueprint = useCallback((groupNode: import('@/omega-ui-core/types/rack').GroupNode) => {
    // 1. Create a BlueprintDefinition from the GroupNode
    const blueprint: BlueprintDefinition = {
      blueprintId: `bp_user_${groupNode.id}_${Date.now().toString(36)}`,
      version: '1.0.0',
      name: groupNode.label || 'Custom Composite Group',
      description: 'User-defined grouped template',
      origin: 'user',
      rootNode: {
        id: groupNode.id,
        kind: 'container',
        role: 'composite',
        layout: {
          pos: { x: groupNode.pos.x, y: groupNode.pos.y },
          mode: 'absolute',
        },
        children: groupNode.children.map((child) => ({
          id: child.id,
          kind: 'cell' as const,
          cellRef: child.type,
          layout: {
            pos: { x: child.pos.x, y: child.pos.y },
            size: { width: child.size.width, height: child.size.height },
          },
          style: child.style as unknown as import('@/omega-ui-core/types/manifest').OmegaStyleNode,
          bind: child.bind?.target,
        })),
      },
      compatibility: {
        allowedParentKinds: ['rack', 'container', 'group', 'face'],
        deniedParentKinds: ['cell'],
      },
      autoWirePolicy: { mode: 'none' },
      materializeSnapshot: false,
      defaultOverridePolicy: 'extendable',
    };

    // ── S6: Generate SVG thumbnail ───────────────────────────────────
    const thumbnailSvg = generateBlueprintThumbnail(blueprint.rootNode as unknown as import('@/omega-ui-core/types/manifest').OmegaNode);

    // 2. Register in userBlueprints state for immediate Library visibility
    // Include thumbnail in blueprint metadata for UI display
    blueprint.metadata = { thumbnail: thumbnailSvg };
    setUserBlueprints((prev) => [
      ...prev,
      {
        label: blueprint.name,
        description: blueprint.description,
        version: blueprint.version,
        blueprint,
      },
    ]);

    // 3. Export physical .acepack via existing export pipeline
    editor.exportCellAsBlueprint?.(groupNode.id);
    editor.addLog(`[OK] Group '${blueprint.name}' exported to library and disk.`);
  }, [editor]);

  // ── Ghost Preview: Interactive Blueprint Placement ────────────────
  const ghostPreview = useGhostPreview();

  const handleSelectBlueprintFromPanel = useCallback((v2data: V2BlueprintData) => {
    try {
      const blueprint = adaptV2BlueprintToBlueprintDefinition(v2data);
      // Enter ghost preview mode instead of immediately injecting
      ghostPreview.startGhostPreview(blueprint);
    } catch (err) {
      console.error("[BLUEPRINT] Failed to adapt V2 blueprint:", err);
    }
  }, [ghostPreview]);

  const handleGhostClick = useCallback((x: number, y: number) => {
    const bp = ghostPreview.activeBlueprint;
    if (!bp) return;

    // Update the blueprint's rootNode position to the clicked (snapped) position
    const updatedBlueprint: BlueprintDefinition = {
      ...bp,
      rootNode: {
        ...bp.rootNode,
        layout: {
          ...bp.rootNode.layout,
          pos: { x: Math.round(x), y: Math.round(y) },
        },
      },
    };

    // Now inject at the chosen position
    editor.applyTemplate(updatedBlueprint);
    ghostPreview.cancelGhostPreview();
  }, [ghostPreview, editor]);

  const handleGhostMouseMove = useCallback((rackX: number, rackY: number) => {
    // VirtualRack has already converted screen → rack-local coordinates
    ghostPreview.updateGhostAtRackCoords(rackX, rackY, manifest as OMEGA_Manifest);
  }, [ghostPreview, manifest]);

  const handleGhostCancel = useCallback(() => {
    ghostPreview.cancelGhostPreview();
  }, [ghostPreview]);
  
  const handleSelectItem = useCallback((id: string | null) => {
    actions.setSelectedNode(id);
    setInspectorActiveSection(undefined);
    if (id) {
      if (state.isRightPanelCollapsed) {
        actions.toggleRightPanel();
      }
      if (!state.window_properties) {
        actions.toggleWindow('window_properties');
      }
    }
  }, [actions, state.isRightPanelCollapsed, state.window_properties]);

  const handleOpenConfig = useCallback(() => {
    if (state.isRightPanelCollapsed) {
      actions.toggleRightPanel();
    }
    if (!state.window_rack_properties) {
      actions.toggleWindow('window_rack_properties');
    }
    handleSelectItem(null);
    setInspectorActiveSection('globals');
  }, [actions, state.isRightPanelCollapsed, state.window_rack_properties, handleSelectItem]);

  const handleOpenAudit = onOpenAudit || (() => {
    if (state.isRightPanelCollapsed) actions.toggleRightPanel();
    if (!state.window_compliance) actions.toggleWindow('window_compliance');
  });

  const handleOpenCellEditor = onOpenCellEditor || (() => {
    if (state.selectedNodeId) {
      actions.setStudioMode(true, state.selectedNodeId);
    }
  });

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
  useWorkbenchShortcuts(editor, selectedItemId, state.multiSelectedNodeIds);

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
    if (await editor.handleDeploy() === 'AUDIT_FAIL') {
      if (state.isRightPanelCollapsed) actions.toggleRightPanel();
      if (!state.window_compliance) actions.toggleWindow('window_compliance');
    }
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
  
  const setIsCellLibraryOpen = useState(false)[1];

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

  const handleDiagnosticClick = useCallback((_tabId: string, diagRaw: unknown) => {
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
        activeTool={activeTool}
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
        uiTheme={state.uiTheme}
        onUndoTo={editor.undoTo}
        onCompareWithHistory={handleCompareWithHistory}
        hiddenNodeIds={state.hiddenNodeIds}
        lockedNodeIds={state.lockedNodeIds}
        onUpdateManifest={updateManifest}
        onDuplicateItem={handleDuplicateItem}
        onRemoveItem={handleRemoveItem}
        onToggleLock={actions.toggleNodeLock}
        onToggleVisibility={actions.toggleNodeVisibility}                onGroupSelected={editor.groupSelected}
                onUngroupNode={editor.ungroupNode}
                updateItems={editor.updateItems}
  // v9.1.7-dev — RackStartupAssistant wiring (REGRESSION_RECOVERY_PLAN.md item 23)
  onOpenGallery={() => actions.toggleWindow('window_blueprints')}
  onLinkWorkspace={editor.linkDirectory}
  onCreateFromScratch={() => editor.reset()}
  isDirectoryLinked={editor.isDirectoryLinked}
  // v9.2.1 — Interactive Ghost Preview Layer
  ghostPosition={ghostPreview.ghostPosition}
  ghostSize={ghostPreview.ghostSize}
  isGhostCollision={ghostPreview.isCollision}
  isGhostVisible={ghostPreview.isGhostVisible}
  onGhostMouseMove={handleGhostMouseMove}
  onGhostClick={handleGhostClick}
  onGhostCancel={handleGhostCancel}
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
          onOpenGallery={() => actions.toggleWindow('window_blueprints')}
          windowStates={{
            window_layers: state.window_layers,
            window_properties: state.window_properties,
            window_rack_properties: state.window_rack_properties,
            window_blueprints: state.window_blueprints,
            window_compliance: state.window_compliance,
            window_info: state.window_info,
            window_history: state.window_history,
            window_logs: state.window_logs
          }}
          onToggleWindow={actions.toggleWindow}
          simulationBridge={editor.simulationBridge}
          rackSections={rackSections}
          onToggleRackSection={handleToggleRackSection}
          gridVisible={gridVisible}
          showGuides={showGuides}
          onToggleGrid={handleToggleGrid}
          onToggleGuides={handleToggleGuides}
          // Phase 39 — recovered from backup MenuBar
          selectedNodeId={state.selectedNodeId}
          multiSelectedIds={state.multiSelectedNodeIds}
          onSaveCellAsBlueprint={handleSaveCellAsBlueprint}
          inspectorLevel={inspectorLevel}
          onSetInspectorLevel={setInspectorLevel}
          manifest={manifest as OMEGA_Manifest}
          onUpdateManifest={updateManifest}
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
                onOpenGallery={() => actions.toggleWindow('window_blueprints')}
                onOpenAudit={handleOpenAudit}
                onOpenConfig={handleOpenConfig}
                onOpenCellStudio={() => {
                  if (selectedItemId) {
                    actions.setStudioMode(true, selectedItemId);
                  }
                }}
                onAddEntity={handleAddEntity}
                isZenMode={state.isZenMode}
                onToggleZen={actions.toggleZenMode}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                selectedNodeId={selectedItemId}
                multiSelectedIds={state.multiSelectedNodeIds}
                onGroupSelected={state.multiSelectedNodeIds.length >= 2 ? editor.groupSelected : undefined}
                onUngroupNode={state.multiSelectedNodeIds.length === 1 ? editor.ungroupNode : undefined}
                findItem={editor.findItem}
                manifest={manifest as OMEGA_Manifest}
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
              inspectorLevel={inspectorLevel}
              activeSection={inspectorActiveSection}
              pastHistory={editor.orchestrator.documentsById['primary']?.history?.past || []}
              onUndoTo={editor.undoTo}
              logs={editor.logs}
              windowStates={{
                window_layers: state.window_layers,
                window_properties: state.window_properties,
                window_rack_properties: state.window_rack_properties,
                window_blueprints: state.window_blueprints,
                window_compliance: state.window_compliance,
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
              onSelectBlueprint={handleSelectBlueprintFromPanel}
              onSelectUserBlueprint={handleSelectUserBlueprint}
              userBlueprints={userBlueprints}
              onLoadAcepack={handleLoadAcepack}
              exportSelectedAsBlueprint={editor.exportSelectedAsBlueprint}
              onSaveGroupAsBlueprint={handleSaveGroupAsBlueprint}
              onUngroupNode={editor.ungroupNode}
              onGroupSelected={state.multiSelectedNodeIds.length >= 2 ? () => editor.groupSelected(state.multiSelectedNodeIds) : undefined}
              onGroupDown={editor.groupDown}
              onMoveNode={editor.moveNode}
              onMoveNodeUpDown={editor.moveNodeUpDown}
              onTogglePin={(id) => {
                actions.setPinnedNode(id);
              }}
              onSetLayoutRatio={actions.setLayoutRatio}
              onSetLayoutRatioEnd={handleDragRatioEnd}
              onSelectMultiple={actions.setMultiSelectedNodes}
              rackSections={rackSections}
              onToggleRackSection={handleToggleRackSection}
              onNavigate={gps.handleNavigateToIssue}
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
        isCellEditorOpen={isCellEditorOpen !== undefined ? isCellEditorOpen : state.isCellEditorOpen}
        setIsCellEditorOpen={setIsCellEditorOpen ? (open) => setIsCellEditorOpen(open) : () => actions.toggleUIState('isCellEditorOpen')}
        
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
