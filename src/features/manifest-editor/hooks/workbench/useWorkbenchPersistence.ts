'use client';

import { useEffect } from "react";
import type { WorkbenchState, WorkbenchAction, WorkbenchTab, WorkbenchPane } from "../../types/workbench";
import { STORAGE_KEYS } from "../../constants/storage";
import { DEFAULT_TABS } from "../../constants/workbench";
import { createInitialState } from "./workbenchReducer";

/**
 * OMEGA ERA 7.2.3 - WORKBENCH PERSISTENCE HOOK
 * Handles hydration from localStorage and atomic sync of layout state.
 */
export function useWorkbenchPersistence(
  state: WorkbenchState, 
  dispatch: React.Dispatch<WorkbenchAction>
) {
  // 1. Client-Side Hydration (Industrial Sync)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.WORKBENCH_SESSION);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WorkbenchState>;
        
        // 1.1. Purge legacy core tabs from tabsById (Canonical ID Enforcement)
        const coreTypes = ["orbital", "rack", "source", "uca-tree", "inspector", "history"];
        const cleanTabsById: Record<string, WorkbenchTab> = { ...(parsed.tabsById || {}) };
        const idMap: Record<string, string> = {}; // legacyId -> canonicalId

        Object.keys(cleanTabsById).forEach((id: string) => {
          const tab = cleanTabsById[id];
          if (coreTypes.includes(tab.type)) {
            const canonicalId = `tab-${tab.type}`;
            if (id !== canonicalId) {
              idMap[id] = canonicalId;
              delete cleanTabsById[id];
              cleanTabsById[canonicalId] = { ...tab, id: canonicalId };
            }
          }
        });

        // 1.2. Sanitize Panes (Deduplicate and Map IDs)
        const sanitizedPanes: Record<string, WorkbenchPane> = { ...(parsed.panesById || {}) };
        Object.keys(sanitizedPanes).forEach((pid: string) => {
          const p = sanitizedPanes[pid];
          if (!p || !p.tabIds) return;
          
          const mappedIds = p.tabIds.map((id: string) => idMap[id] || id);
          p.tabIds = Array.from(new Set(mappedIds)).filter((id: string) => 
            cleanTabsById[id] || DEFAULT_TABS.some(t => t.id === id)
          );
          
          if (p.activeTabId && idMap[p.activeTabId]) {
            p.activeTabId = idMap[p.activeTabId];
          }
        });

        dispatch({ 
          type: "HYDRATE_WORKBENCH", 
          payload: { 
            state: {
              ...parsed,
              panesById: sanitizedPanes,
              tabsById: { ...createInitialState().tabsById, ...cleanTabsById }
            }
          } 
        });
      }
    } catch (err) {
      console.warn("[OMEGA WORKBENCH] Session restore failed:", err);
    }
  }, [dispatch]);

  // 2. Persistence Layer: Industrial Sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      const data = {
        tabsById: state.tabsById,
        panesById: state.panesById,
        focusedPaneId: state.focusedPaneId,
        layout: state.layout,
        tabViewState: state.tabViewState,
        selectedNodeId: state.selectedNodeId,
        pinnedNodeId: state.pinnedNodeId
      };
      window.localStorage.setItem(STORAGE_KEYS.WORKBENCH_SESSION, JSON.stringify(data));
    }
  }, [state.tabsById, state.panesById, state.focusedPaneId, state.layout, state.tabViewState, state.selectedNodeId, state.pinnedNodeId]);
}
