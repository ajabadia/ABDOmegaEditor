import type { WorkbenchTab } from "../types/workbench";

export const DEFAULT_TABS: WorkbenchTab[] = [
  { id: "tab-orbital", type: "orbital", title: "Orbital", persistent: true, closable: false, payload: { documentId: 'primary' } },
  { id: "tab-rack", type: "rack", title: "Rack", persistent: true, closable: false, payload: { documentId: 'primary' } },
  { id: "tab-source", type: "source", title: "Source", persistent: true, closable: false, payload: { documentId: 'primary' } },
];

export const WORKBENCH_LAYOUT_CONSTRAINTS = {
  MIN_RATIO: 0.2,
  MAX_RATIO: 0.8,
  DEFAULT_RATIO: 0.62
};
