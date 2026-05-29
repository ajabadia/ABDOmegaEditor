'use client';

import React from 'react';
import type { WorkbenchPaneId, WorkbenchTab } from '../../types/workbench';
import MultiTabHeader from '../layout/MultiTabHeader';
import { WorkbenchViewport } from '../viewport/WorkbenchViewport';
import { SourceView } from '../views/SourceView';
import type { OMEGA_Manifest, OMEGA_Contract, OmegaNode, HybridEntityUpdate } from '@/omega-ui-core/types/manifest';
import type { SimulationBridgeState } from '../../hooks/useSimulationBridge';
import type { AuditResult } from '@/services/auditService';
import type { DocumentOrchestrator } from '../../types/document';
 
interface WorkbenchPaneProps {
  paneId: WorkbenchPaneId;
  tabs: WorkbenchTab[];
  activeTabId: string | null;
  isFocused: boolean;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onPaneFocus: () => void;
  onDiagnosticClick: (tabId: string, diag: unknown) => void;
  simulationBridge: SimulationBridgeState;
  
  // Data
  manifest: OMEGA_Manifest;
  contract: OMEGA_Contract | null;
  orchestrator: Pick<DocumentOrchestrator, 'documentsById' | 'updateDocument'>;
  activeId: string;
  
  // View State
  tabViewState: Record<string, unknown>;
  onCaptureViewState: (tabId: string, viewState: unknown) => void;
  onDiagnosticsUpdate: (tabId: string, diagnostics: unknown) => void;
  
  // Operations
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  updateItem: (id: string, updates: HybridEntityUpdate) => void;
  updateContainer: (id: string, updates: Record<string, unknown>) => void;
  auditResult: AuditResult;
  resolveAsset: (id: string | undefined) => string | undefined;
  
  // Viewport
  zoom: number;
  pan: { x: number; y: number };
  handleZoom: (zoom: number) => void;
  handlePan: (dx: number, dy: number) => void;
  handleResetViewport: () => void;
  handleFitViewport: (viewMode: string) => void;
  
  // Live Mode
  isLiveMode: boolean;
  setIsLiveMode: (live: boolean) => void;
  
  // History
  onUndoTo: (index: number) => void;
  onCompareWithHistory: (index: number) => void;
  multiSelectedIds: string[];
  onSelectMultiple: (ids: string[]) => void;
}

const WorkbenchPane = React.memo((props: WorkbenchPaneProps) => {
  const { paneId, tabs, activeTabId, isFocused, onTabSelect, onTabClose, onPaneFocus, onDiagnosticClick, simulationBridge } = props;
  
  const activeTab = activeTabId ? tabs.find(t => t.id === activeTabId) : null;
  
  // OMEGA Phase 7 - Multi-Document Aware Rendering
  const tabDocId = (activeTab?.payload?.documentId as string) || props.activeId;
  const tabDoc = props.orchestrator.documentsById[tabDocId];
  const tabManifest = tabDoc?.manifest || props.manifest;
  const tabContract = (tabDoc?.contract as OMEGA_Contract | null) || props.contract;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <MultiTabHeader 
        paneId={paneId}
        tabs={tabs}
        activeTabId={activeTabId}
        isFocused={isFocused}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onPaneFocus={onPaneFocus}
        onDiagnosticClick={onDiagnosticClick}
        simulationBridge={simulationBridge}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!activeTab && (
          <div className="flex-1 flex items-center justify-center bg-black/20">
            <span className="text-[10px] font-black wb-text-muted uppercase tracking-[0.2em] opacity-30">
              Empty Workspace Pane
            </span>
          </div>
        )}
        
        {activeTab && ['orbital', 'rack', 'history'].includes(activeTab.type) && (
          <WorkbenchViewport 
            viewMode={activeTab.type as 'orbital' | 'rack' | 'source' | 'history'} 
            manifest={tabManifest} 
            contract={tabContract}
            selectedItemId={props.selectedItemId} 
            onSelectItem={props.onSelectItem}
            updateItem={props.updateItem} 
            updateManifest={(updates) => props.orchestrator.updateDocument(tabDocId, { manifest: updates })}
            updateContainer={props.updateContainer} 
            auditResult={props.auditResult}
            zoom={props.zoom} 
            pan={props.pan} 
            handleZoom={props.handleZoom} 
            handlePan={props.handlePan}
            handleResetViewport={props.handleResetViewport} 
            handleFitViewport={props.handleFitViewport}
            isLiveMode={props.isLiveMode} 
            setIsLiveMode={props.setIsLiveMode}
            resolveAsset={props.resolveAsset}
            pushParameterUpdate={simulationBridge.pushParameterUpdate}
            past={tabDoc?.history.past || []}
            onUndoTo={props.onUndoTo}
            onCompareWithHistory={props.onCompareWithHistory}
            multiSelectedIds={props.multiSelectedIds}
            onSelectMultiple={props.onSelectMultiple}
          />
        )}

        {activeTab?.type === 'source' && (
          <SourceView 
            tabId={activeTab.id}
            manifestId={tabDocId}
            value={JSON.stringify(tabManifest, null, 2)}
            language="json"
            editorViewState={(props.tabViewState[activeTab.id] as { editorViewState?: unknown })?.editorViewState}
            onChange={(next) => {
              try {
                const updated = JSON.parse(next);
                props.orchestrator.updateDocument(tabDocId, { manifest: updated });
              } catch {}
            }}
            onCaptureViewState={(viewState) => props.onCaptureViewState(activeTab.id, viewState)}
            onDiagnosticsUpdate={(diagnostics) => props.onDiagnosticsUpdate(activeTab.id, diagnostics)}
            selectedItemId={props.selectedItemId}
          />
        )}
      </div>
    </div>
  );
});

WorkbenchPane.displayName = 'WorkbenchPane';
export default WorkbenchPane;
