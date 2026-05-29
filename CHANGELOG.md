# OMEGA Manifest Editor Changelog

All notable changes to the OMEGA Manifest Editor will be documented in this file.

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
