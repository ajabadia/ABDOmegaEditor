"use client";

import { useCallback, useMemo, useReducer, useRef, useEffect, useState } from "react";
import type { 
  WorkbenchState, 
  WorkbenchPaneId, 
  WorkbenchLayoutMode, 
  WorkbenchTabViewState,
  OpenTabInput 
} from "../types/workbench";
import { workbenchReducer, createInitialState } from "./workbench/workbenchReducer";
import { useWorkbenchPersistence } from "./workbench/useWorkbenchPersistence";
import { OmegaRPCBridge } from "@/services/rpc/omegaRPCBridge";
import type { SnapshotParams, SyncStatus, DeltaPatch } from "@/services/rpc/rpcTypes";
import type { OMEGA_Manifest } from "@/omega-ui-core/types/manifest";
import type { ManifestDiffResult } from "../types/diff";

// Re-export types for backward compatibility
export * from "../types/workbench";

/**
 * OMEGA ERA 7.2.3 - WORKBENCH STATE ORCHESTRATOR
 * Industrial state engine for multi-pane, multi-tab manifest authoring.
 * Integrated with Phase 17.4 Live RPC Bridge.
 */
export function useWorkbenchState() {
  const [state, dispatch] = useReducer(
    workbenchReducer,
    undefined,
    () => createInitialState()
  );

  // 1. RPC Bridge Orchestration (Phase 17.4)
  // We use a ref to keep the transport layer stable and separate from UI renders.
  const bridgeRef = useRef<OmegaRPCBridge | null>(null);
  const [rpcStatus, setRpcStatus] = useState<SyncStatus>('disconnected');

  useEffect(() => {
    // Only initialize bridge if Live Mode is active (Aseptic Activation)
    if (state.isLiveMode && !bridgeRef.current) {
      bridgeRef.current = new OmegaRPCBridge();
      bridgeRef.current.connect((status) => {
        setRpcStatus(status);
      });
    } else if (!state.isLiveMode && bridgeRef.current) {
      // Logic for bridge shutdown if needed, though usually we keep it warm
    }
  }, [state.isLiveMode]);

  // 2. Persistence & Hydration (Offloaded)
  useWorkbenchPersistence(state, dispatch);

  // 3. Action Dispatchers
  const actions = useMemo(
    () => ({
      openTab: (input: OpenTabInput) =>
        dispatch({ type: "OPEN_TAB", payload: input }),

      closeTab: (tabId: string) =>
        dispatch({ type: "CLOSE_TAB", payload: { tabId } }),

      focusTab: (paneId: WorkbenchPaneId, tabId: string) =>
        dispatch({ type: "FOCUS_TAB", payload: { paneId, tabId } }),

      reorderTabs: (paneId: WorkbenchPaneId, tabIds: string[]) =>
        dispatch({ type: "REORDER_TABS", payload: { paneId, tabIds } }),

      focusPane: (paneId: WorkbenchPaneId) =>
        dispatch({ type: "FOCUS_PANE", payload: { paneId } }),

      moveTabToPane: (tabId: string, targetPaneId: WorkbenchPaneId, index?: number) =>
        dispatch({
          type: "MOVE_TAB_TO_PANE",
          payload: { tabId, targetPaneId, index },
        }),

      setLayoutMode: (mode: WorkbenchLayoutMode) =>
        dispatch({ type: "SET_LAYOUT_MODE", payload: { mode } }),

      setLayoutRatio: (ratio: number) =>
        dispatch({ type: "SET_LAYOUT_RATIO", payload: { ratio } }),

      setSelectedNode: (nodeId: string | null) =>
        dispatch({ type: "SET_SELECTED_NODE", payload: { nodeId } }),

      setMultiSelectedNodes: (nodeIds: string[]) =>
        dispatch({ type: "SET_MULTI_SELECTED_NODES", payload: { nodeIds } }),

      setPinnedNode: (nodeId: string | null) =>
        dispatch({ type: "SET_PINNED_NODE", payload: { nodeId } }),

      setExpandedNodeIds: (nodeIds: string[]) =>
        dispatch({ type: "SET_EXPANDED_NODE_IDS", payload: { nodeIds } }),

      captureTabViewState: (tabId: string, viewState: Partial<WorkbenchTabViewState>) =>
        dispatch({
          type: "CAPTURE_TAB_VIEW_STATE",
          payload: { tabId, viewState },
        }),

      toggleUIState: (key: keyof Pick<WorkbenchState, 'showLogs' | 'isLiveMode' | 'showModGrid' | 'mockupOpen' | 'isAuditModalOpen' | 'isAboutModalOpen' | 'isConfigModalOpen' | 'isCellEditorOpen'>) =>
        dispatch({ type: "TOGGLE_UI_STATE", payload: { key } }),

      setHelpState: (isOpen: boolean, sectionId?: string) =>
        dispatch({ type: "SET_HELP_STATE", payload: { isOpen, sectionId } }),

      setUiTheme: (theme: "dark" | "light") =>
        dispatch({ type: "SET_UI_THEME", payload: { theme } }),
        
      setPendingFiles: (files: File[]) =>
        dispatch({ type: "SET_PENDING_FILES", payload: { files } }),
        
      setIsLiveMode: () =>
        dispatch({ type: "TOGGLE_UI_STATE", payload: { key: 'isLiveMode' } }),
        
      setActiveDiff: (diff: ManifestDiffResult | null) =>
        dispatch({ type: "SET_ACTIVE_DIFF", payload: { diff } }),
        
      setIsDiffModalOpen: (open: boolean) =>
        dispatch({ type: "TOGGLE_UI_STATE", payload: { key: 'isDiffModalOpen', value: open } }),
        
      setStudioMode: (isOpen: boolean, cellId?: string) =>
        dispatch({ type: "SET_STUDIO_MODE", payload: { isOpen, cellId } }),

      // PHASE 17.4 - RPC ORCHESTRATION ACTIONS
      rpc: {
        applyDelta: (patch: DeltaPatch) => {
          if (state.isLiveMode) {
            bridgeRef.current?.applyDelta(patch);
          }
        },
        syncSnapshot: (params: SnapshotParams, manifest: OMEGA_Manifest) => {
          bridgeRef.current?.syncSnapshot(params, manifest);
        },
        requestHealth: () => {
          // Internal call via bridge
        },
        resync: () => {
          // Manual trigger
        }
      }
    }),
    [state.isLiveMode]
);

  // 4. Derived State (Selectors)
  const derived = useMemo(() => {
    const primaryActiveTabId = state.panesById.primary.activeTabId;
    const secondaryActiveTabId = state.panesById.secondary.activeTabId;

    return {
      primaryActiveTab: primaryActiveTabId ? state.tabsById[primaryActiveTabId] : null,
      secondaryActiveTab: secondaryActiveTabId ? state.tabsById[secondaryActiveTabId] : null,
      focusedTabId: state.panesById[state.focusedPaneId].activeTabId,
      isSplit: state.layout.mode !== "single",
      rpcStatus // Exported for UI Badge integration
    };
  }, [state, rpcStatus]);

  const getTabViewState = useCallback(
    (tabId: string) => state.tabViewState[tabId] ?? null,
    [state.tabViewState]
  );

  // 5. API Export
  return {
    state,
    actions,
    derived,
    getTabViewState,
  };
}
