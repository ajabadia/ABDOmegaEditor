import type { LucideIcon } from "lucide-react";
import type { TabDiagnostics } from "./diagnostics";

export type WorkbenchTabType =
  | "orbital"
  | "rack"
  | "source"
  | "uca-tree"
  | "inspector"
  | "history";

export type WorkbenchPaneId = "primary" | "secondary" | "primary_bottom" | "secondary_bottom";
export type WorkbenchLayoutMode = "single" | "vertical";

export interface WorkbenchTab {
  id: string;
  type: WorkbenchTabType;
  title: string;
  icon?: string | LucideIcon;
  closable?: boolean;
  persistent?: boolean;
  payload?: Record<string, unknown> | undefined;
  isDirty?: boolean;
  diagnostics?: TabDiagnostics;
}

export interface WorkbenchPane {
  id: WorkbenchPaneId;
  tabIds: string[];
  activeTabId: string | null;
}

export interface WorkbenchLayout {
  mode: WorkbenchLayoutMode;
  ratio: number;
}

export interface RackViewportState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface WorkbenchTabViewState {
  inspectorScrollTop?: number;
  treeScrollTop?: number;
  editorViewState?: unknown; 
  rackViewport?: RackViewportState;
}

export interface StudioModeState {
  isOpen: boolean;
  cellId?: string | undefined;
}

export interface WorkbenchState {
  tabsById: Record<string, WorkbenchTab>;
  panesById: Record<WorkbenchPaneId, WorkbenchPane>;
  focusedPaneId: WorkbenchPaneId;
  layout: WorkbenchLayout;
  selectedNodeId: string | null;
  multiSelectedNodeIds: string[];
  pinnedNodeId: string | null;
  expandedNodeIds: string[];
  tabViewState: Record<string, WorkbenchTabViewState>;
  
  // UI States
  showLogs: boolean;
  isLiveMode: boolean;
  showModGrid: boolean;
  helpState: { isOpen: boolean; sectionId?: string | undefined };
  mockupOpen: boolean;
  blueprintGalleryOpen: boolean;
  isAuditModalOpen: boolean;
  isAboutModalOpen: boolean;
  isConfigModalOpen: boolean;
  isCellEditorOpen: boolean;
  studioMode: StudioModeState; // Phase 15 - Isolated Studio
  isRightPanelCollapsed: boolean;
  isZenMode: boolean;
  window_layers: boolean;
  window_properties: boolean;
  window_rack_properties: boolean;
  window_blueprints: boolean;
  window_info: boolean;
  window_history: boolean;
  window_logs: boolean;
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  uiTheme: "dark" | "light";
  pendingFiles: File[];
  
  // Phase 9.2 History Diff
  isDiffModalOpen: boolean;
  activeDiff: import("../types/diff").ManifestDiffResult | null;
  
  // Horizontal Splits
  isPrimarySplitH: boolean;
  isSecondarySplitH: boolean;
  primarySplitRatio: number;
  secondarySplitRatio: number;
}
 
export type OpenTabInput = Omit<WorkbenchTab, "id"> & {
  id?: string;
  targetPaneId?: WorkbenchPaneId;
};
 
export type WorkbenchAction =
  | { type: "OPEN_TAB"; payload: OpenTabInput }
  | { type: "CLOSE_TAB"; payload: { tabId: string } }
  | { type: "FOCUS_TAB"; payload: { paneId: WorkbenchPaneId; tabId: string } }
  | { type: "REORDER_TABS"; payload: { paneId: WorkbenchPaneId; tabIds: string[] } }
  | { type: "FOCUS_PANE"; payload: { paneId: WorkbenchPaneId } }
  | { type: "MOVE_TAB_TO_PANE"; payload: { tabId: string; targetPaneId: WorkbenchPaneId; index?: number | undefined } }
  | { type: "SET_LAYOUT_MODE"; payload: { mode: WorkbenchLayoutMode } }
  | { type: "SET_LAYOUT_RATIO"; payload: { ratio: number } }
  | { type: "SET_PRIMARY_SPLIT_RATIO"; payload: { ratio: number } }
  | { type: "SET_SECONDARY_SPLIT_RATIO"; payload: { ratio: number } }
  | { type: "SET_SELECTED_NODE"; payload: { nodeId: string | null } }
  | { type: "SET_MULTI_SELECTED_NODES"; payload: { nodeIds: string[] } }
  | { type: "SET_PINNED_NODE"; payload: { nodeId: string | null } }
  | { type: "SET_EXPANDED_NODE_IDS"; payload: { nodeIds: string[] } }
  | { type: "CAPTURE_TAB_VIEW_STATE"; payload: { tabId: string; viewState: Partial<WorkbenchTabViewState> } }
  | { type: "TOGGLE_UI_STATE"; payload: { key: keyof Pick<WorkbenchState, 'showLogs' | 'isLiveMode' | 'showModGrid' | 'mockupOpen' | 'blueprintGalleryOpen' | 'isAuditModalOpen' | 'isAboutModalOpen' | 'isConfigModalOpen' | 'isCellEditorOpen' | 'isDiffModalOpen'>, value?: boolean } }
  | { type: "TOGGLE_RIGHT_PANEL" }
  | { type: "TOGGLE_ZEN_MODE" }
  | { type: "TOGGLE_WINDOW"; payload: { name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_info' | 'window_history' | 'window_logs' } }
  | { type: "TOGGLE_NODE_VISIBILITY"; payload: { nodeId: string } }
  | { type: "TOGGLE_NODE_LOCK"; payload: { nodeId: string } }
  | { type: "SET_STUDIO_MODE"; payload: StudioModeState } // Phase 15 Action
  | { type: "SET_HELP_STATE"; payload: { isOpen: boolean; sectionId?: string | undefined } }
  | { type: "SET_UI_THEME"; payload: { theme: "light" | "dark" } }
  | { type: "SET_PENDING_FILES"; payload: { files: File[] } }
  | { type: "SET_ACTIVE_DIFF"; payload: { diff: import("../types/diff").ManifestDiffResult | null } }
  | { type: "TOGGLE_HORIZONTAL_SPLIT"; payload: { paneId: "primary" | "secondary" } }
  | { type: "CLOSE_PANE"; payload: { paneId: WorkbenchPaneId } }
  | { type: "HYDRATE_WORKBENCH"; payload: { state: Partial<WorkbenchState> } };
