# OMEGA Manifest Editor Changelog

All notable changes to the OMEGA Manifest Editor will be documented in this file.

## [8.0.0] - 2026-05-31
### Added
- **Sovereign UCA Numeric Authority Linter**: Refactored the inspector's identity component to predict and map `ParamId` and `PortId` based on recursive traversal of the modern canonical UCA tree instead of deprecated controls/jacks arrays.
- **UCA-Native Technical Contract Generator**: Refactored `ContractService` to build C++ (`.h`) and TypeScript (`.ts`) schema contracts from UCA graph nodes, ensuring complete structural synchronization with the modern engine.
- **UCA ID Collision Guard**: Updated duplicate ID checks to trace parameters, ports, and container components recursively across the UCA tree.

## [7.3.0] - 2026-05-31
### Added
- **Dedicated Sidebar Logs Panel**: Moved the log terminal output from the legacy bottom drawer (`WorkbenchLogs.tsx`) into a dedicated sidebar panel within `RightDockContainer.tsx`, toggled via a new quick-access Terminal icon on the right strip.
- **Relocated LIVE LOOP**: Moved the `SimulationStatusBadge` (Live Loop status/telemetry) from the individual workspace pane headers to the main application header, replacing the legacy logs button.
- **Modal Size Standardization**: Standardized all primary dialog modals (`AboutModal`, `AuditModal`, `TemplateGallery`, `IngestionModal`, `ManifestDiffModal`, `HelpModal`, `BlueprintPromptDialog`, and `GlobalGovernanceModal`) to use `max-w-7xl` width and `h-full max-h-[850px]` height to achieve size parity with `UniversalCellEditorModal`.

### Changed
- **Selective Undo/Redo History**: Excluded pure UI state changes (such as panel toggles, split view, and drag ratios) from the action history, focusing undo/redo stacks strictly on modifications made to the rack/manifest structure.

## [7.2.0] - 2026-05-30
### Added
- **Floating Draggable Toolbar**: Added vertical left toolbar using `framer-motion` for CAD-like workspace layout.
- **Draggable Handle**: Photoshop-like textured handle allowing free drag placement within workspace bounds.
- **Centralized Tools**: Integrated Select Tool, Add Primitive flyout (Knob, Signal Port), Isolated Cell Studio launcher, Diagnostics modal launcher, blueprints gallery launcher, global configuration dialog, and HIL (Hardware-In-the-Loop) connection toggle.
- **Visual Deprecation Cues**: Stylized duplicated menu entries in `MenuBar.tsx` and `Header.tsx` with strikethroughs, red/orange warning tints, and warning indicators for progressive validation.

### Removed
- **Aseptic Code Cleanup**: Fully decommissioned 9 legacy files:
  - Custom YAML Viewport: `SourceViewer.tsx`, `SourceHeader.tsx`, `SourceCodeBlock.tsx`, `useSourceEditor.ts`.
  - Obsolete Left Sidebar: `WorkbenchSidebar.tsx`, `ModuleHub.tsx`.
  - Redundant Hooks: `usePropertyPanel.ts`, `useTransaction.ts`.

## [7.1.0] - 2026-05-11
### Added
- **Multi-Document Support**: Real simultaneous editing of multiple `.acemm` files.
- **Dynamic Document Orchestrator**: `useDocumentOrchestrator` now manages a collection of documents with independent states.
- **Session Persistence**: Automatic sync of opened documents and manifests to `localStorage`.
- **Clipboard Service**: Cross-document copy/paste for OMEGA entities with ID regeneration.
- **Batch Ingestion**: Enhanced `handleBulkUpload` to open multiple manifests at once.

### Changed
- **State Architecture**: Absorbed `useManifestState` into the orchestrator to eliminate redundant state layers.
- **Context Binding**: The active document context (Inspector, Viewports) now automatically follows the focused tab.
- **Tab UI**: Tab titles now reflect the document name from metadata.
- **Safety Guards**: `beforeunload` now aggregates dirty state across all open documents.

### Fixed
- TypeScript compilation errors related to legacy `activeTab` props.
- React hook dependency warnings in `useViewport`.

## [7.0.0] - 2026-05-11
### Added
- **Multi-Tab Layout**: Support for split-panes and multiple concurrent views (Rack, Source, Orbital).
- **Persistent Layout**: Saved split ratio and pane configuration in `localStorage`.
- **Docked Inspector**: Transitioned from a tab-based inspector to a persistent, industrial docked panel.
- **View State Persistence**: Automatic capture and restoration of Monaco cursor and Viewport (zoom/pan) per tab.

### Removed
- **Legacy ViewMode**: Eliminated global `viewMode` state in favor of the tab-driven architecture.
- **ActiveTab Global**: Removed redundant global active tab trackers.
