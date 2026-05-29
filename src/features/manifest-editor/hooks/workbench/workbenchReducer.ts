import type { 
  WorkbenchState, 
  WorkbenchAction, 
  WorkbenchTab, 
  WorkbenchPane, 
  WorkbenchPaneId 
} from "../../types/workbench";
import { DEFAULT_TABS, WORKBENCH_LAYOUT_CONSTRAINTS } from "../../constants/workbench";

export const createInitialState = (): WorkbenchState => ({
  tabsById: Object.fromEntries(DEFAULT_TABS.map((tab) => [tab.id, tab])),
  panesById: {
    primary: {
      id: "primary",
      tabIds: DEFAULT_TABS.map((tab) => tab.id),
      activeTabId: "tab-rack",
    },
    secondary: {
      id: "secondary",
      tabIds: [],
      activeTabId: null,
    },
  },
  focusedPaneId: "primary",
  layout: { mode: "single", ratio: WORKBENCH_LAYOUT_CONSTRAINTS.DEFAULT_RATIO },
  selectedNodeId: null,
  multiSelectedNodeIds: [],
  pinnedNodeId: null,
  expandedNodeIds: [],
  tabViewState: {},
  showLogs: false,
  isLiveMode: false,
  showModGrid: false,
  helpState: { isOpen: false },
  mockupOpen: false,
  isAuditModalOpen: false,
  isAboutModalOpen: false,
  isConfigModalOpen: false,
  isCellEditorOpen: false,
  studioMode: { isOpen: false },
  uiTheme: "dark",
  pendingFiles: [],
  isDiffModalOpen: false,
  activeDiff: null,
});

const clampRatio = (ratio: number) => 
  Math.min(WORKBENCH_LAYOUT_CONSTRAINTS.MAX_RATIO, Math.max(WORKBENCH_LAYOUT_CONSTRAINTS.MIN_RATIO, ratio));

const findPaneContainingTab = (
  panesById: WorkbenchState["panesById"],
  tabId: string
): WorkbenchPaneId | null => {
  if (panesById.primary.tabIds.includes(tabId)) return "primary";
  if (panesById.secondary.tabIds.includes(tabId)) return "secondary";
  return null;
};

const ensureActiveTab = (pane: WorkbenchPane): WorkbenchPane => {
  if (pane.activeTabId && pane.tabIds.includes(pane.activeTabId)) return pane;
  return {
    ...pane,
    activeTabId: pane.tabIds[0] ?? null,
  };
};

const insertAt = (items: string[], value: string, index?: number) => {
  const next = items.filter((item) => item !== value);
  if (index == null || index < 0 || index > next.length) return [...next, value];
  return [...next.slice(0, index), value, ...next.slice(index)];
};

export function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case "OPEN_TAB": {
      const paneId = action.payload.targetPaneId ?? state.focusedPaneId;
      const coreTypes = ["orbital", "rack", "source", "uca-tree", "inspector", "history"];
      const isCoreTab = coreTypes.includes(action.payload.type);
      const tabId = action.payload.id ?? (isCoreTab ? `tab-${action.payload.type}` : `${action.payload.type}-${Math.random().toString(36).slice(2, 10)}`);
      
      if (state.tabsById[tabId]) {
        const currentPaneId = findPaneContainingTab(state.panesById, tabId);
        const nextPanes = { ...state.panesById };
        
        if (currentPaneId && currentPaneId !== paneId) {
          nextPanes[currentPaneId] = ensureActiveTab({
            ...nextPanes[currentPaneId],
            tabIds: nextPanes[currentPaneId].tabIds.filter(id => id !== tabId)
          });
        }
        
        nextPanes[paneId] = ensureActiveTab({
          ...nextPanes[paneId],
          tabIds: Array.from(new Set(nextPanes[paneId].tabIds.includes(tabId) ? nextPanes[paneId].tabIds : [...nextPanes[paneId].tabIds, tabId])),
          activeTabId: tabId,
        });

        return {
          ...state,
          focusedPaneId: paneId,
          panesById: nextPanes
        };
      }

      if (isCoreTab) {
        const existingId = Object.keys(state.tabsById).find(id => state.tabsById[id].type === action.payload.type);
        if (existingId && existingId !== tabId) {
          return workbenchReducer(state, { ...action, payload: { ...action.payload, id: existingId } });
        }
      }

      const nextTab: WorkbenchTab = {
        id: tabId,
        type: action.payload.type,
        title: action.payload.title,
        closable: action.payload.closable ?? true,
        persistent: action.payload.persistent ?? false,
        payload: action.payload.payload,
      };

      const nextPane = ensureActiveTab({
        ...state.panesById[paneId],
        tabIds: Array.from(new Set([...state.panesById[paneId].tabIds, tabId])),
        activeTabId: tabId,
      });

      return {
        ...state,
        tabsById: {
          ...state.tabsById,
          [tabId]: nextTab,
        },
        panesById: {
          ...state.panesById,
          [paneId]: nextPane,
        },
        focusedPaneId: paneId,
      };
    }

    case "CLOSE_TAB": {
      const { tabId } = action.payload;
      const tab = state.tabsById[tabId];
      if (!tab || tab.persistent || tab.closable === false) return state;

      const sourcePaneId = findPaneContainingTab(state.panesById, tabId);
      if (!sourcePaneId) return state;
      const nextTabs = { ...state.tabsById };
      delete nextTabs[tabId];

      const nextPanes = { ...state.panesById };
      Object.keys(nextPanes).forEach((pid) => {
        const pId = pid as WorkbenchPaneId;
        nextPanes[pId] = ensureActiveTab({
          ...nextPanes[pId],
          tabIds: nextPanes[pId].tabIds.filter((id) => id !== tabId),
        });
      });

      const nextViewState = { ...state.tabViewState };
      delete nextViewState[tabId];

      return {
        ...state,
        tabsById: nextTabs,
        panesById: nextPanes,
        tabViewState: nextViewState,
      };
    }

    case "REORDER_TABS": {
      const { paneId, tabIds } = action.payload;
      return {
        ...state,
        panesById: {
          ...state.panesById,
          [paneId]: {
            ...state.panesById[paneId],
            tabIds: Array.from(new Set(tabIds)),
          },
        },
      };
    }

    case "FOCUS_TAB": {
      const { paneId, tabId } = action.payload;
      if (!state.panesById[paneId].tabIds.includes(tabId)) return state;

      return {
        ...state,
        focusedPaneId: paneId,
        panesById: {
          ...state.panesById,
          [paneId]: {
            ...state.panesById[paneId],
            activeTabId: tabId,
          },
        },
      };
    }

    case "FOCUS_PANE":
      return {
        ...state,
        focusedPaneId: action.payload.paneId,
      };

    case "MOVE_TAB_TO_PANE": {
      const { tabId, targetPaneId, index } = action.payload;
      const sourcePaneId = findPaneContainingTab(state.panesById, tabId);
      if (!sourcePaneId) return state;
      
      if (sourcePaneId === targetPaneId) {
        const samePane = state.panesById[targetPaneId];
        return {
          ...state,
          panesById: {
            ...state.panesById,
            [targetPaneId]: {
              ...samePane,
              tabIds: insertAt(samePane.tabIds, tabId, index),
              activeTabId: tabId,
            },
          },
          focusedPaneId: targetPaneId,
        };
      }

      const sourcePane = ensureActiveTab({
        ...state.panesById[sourcePaneId],
        tabIds: state.panesById[sourcePaneId].tabIds.filter((id) => id !== tabId),
        activeTabId:
          state.panesById[sourcePaneId].activeTabId === tabId
            ? null
            : state.panesById[sourcePaneId].activeTabId,
      });

      const targetPane = ensureActiveTab({
        ...state.panesById[targetPaneId],
        tabIds: insertAt(state.panesById[targetPaneId].tabIds, tabId, index),
        activeTabId: tabId,
      });

      return {
        ...state,
        panesById: {
          ...state.panesById,
          [sourcePaneId]: sourcePane,
          [targetPaneId]: targetPane,
        },
        focusedPaneId: targetPaneId,
        layout:
          state.layout.mode === "single"
            ? { ...state.layout, mode: "vertical" }
            : state.layout,
      };
    }

    case "SET_LAYOUT_MODE": {
      const { mode } = action.payload;
      const nextPanes = { ...state.panesById };

      // SMART SPLIT: If going to vertical and secondary is empty, move 'tab-source' there
      if (mode === "vertical" && nextPanes.secondary.tabIds.length === 0) {
        if (nextPanes.primary.tabIds.includes("tab-source")) {
           nextPanes.primary.tabIds = nextPanes.primary.tabIds.filter(id => id !== "tab-source");
           nextPanes.primary = ensureActiveTab(nextPanes.primary);
           
           nextPanes.secondary.tabIds = ["tab-source"];
           nextPanes.secondary.activeTabId = "tab-source";
        }
      }

      // SMART COLLAPSE: If going back to single, move all secondary tabs to primary
      if (mode === "single" && nextPanes.secondary.tabIds.length > 0) {
        nextPanes.primary.tabIds = Array.from(new Set([...nextPanes.primary.tabIds, ...nextPanes.secondary.tabIds]));
        nextPanes.secondary.tabIds = [];
        nextPanes.secondary.activeTabId = null;
        nextPanes.primary = ensureActiveTab(nextPanes.primary);
      }

      return {
        ...state,
        panesById: nextPanes,
        layout: {
          ...state.layout,
          mode: action.payload.mode,
        },
      };
    }

    case "SET_LAYOUT_RATIO":
      return {
        ...state,
        layout: {
          ...state.layout,
          ratio: clampRatio(action.payload.ratio),
        },
      };

    case "SET_SELECTED_NODE":
      return {
        ...state,
        selectedNodeId: action.payload.nodeId,
        // Auto-sync multi-selection if only one item is selected normally
        multiSelectedNodeIds: action.payload.nodeId ? [action.payload.nodeId] : []
      };
    
    case "SET_MULTI_SELECTED_NODES":
      return {
        ...state,
        multiSelectedNodeIds: action.payload.nodeIds,
        // If multiple are selected, clear single selection or keep first?
        // Standard OMEGA rule: last one selected is the "primary" focus for inspector details
        selectedNodeId: action.payload.nodeIds.length > 0 ? action.payload.nodeIds[action.payload.nodeIds.length - 1] : null
      };
    
    case "SET_PINNED_NODE":
      return {
        ...state,
        pinnedNodeId: action.payload.nodeId,
      };

    case "SET_EXPANDED_NODE_IDS":
      return {
        ...state,
        expandedNodeIds: action.payload.nodeIds,
      };

    case "CAPTURE_TAB_VIEW_STATE": {
      const { tabId, viewState } = action.payload;
      return {
        ...state,
        tabViewState: {
          ...state.tabViewState,
          [tabId]: {
            ...state.tabViewState[tabId],
            ...viewState,
          },
        },
      };
    }

    case "TOGGLE_UI_STATE": {
      const { key, value } = action.payload;
      return {
        ...state,
        [key]: value !== undefined ? value : !state[key]
      };
    }

    case "SET_STUDIO_MODE": {
      return {
        ...state,
        studioMode: action.payload
      };
    }

    case "SET_HELP_STATE": {
      return {
        ...state,
        helpState: { isOpen: action.payload.isOpen, sectionId: action.payload.sectionId }
      };
    }
    case "SET_UI_THEME":
      return { ...state, uiTheme: action.payload.theme };
    case "SET_PENDING_FILES":
      return { ...state, pendingFiles: action.payload.files };
    case "SET_ACTIVE_DIFF":
      return { ...state, activeDiff: action.payload.diff };
    case "HYDRATE_WORKBENCH":
      return { ...state, ...action.payload.state };

    default:
      return state;
  }
}
