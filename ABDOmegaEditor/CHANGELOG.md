# OMEGA Manifest Editor Changelog

All notable changes to the OMEGA Manifest Editor will be documented in this file.

## [9.4.0] - 2026-06-15
### Added
- **Command Palette (Ctrl+K)**: Photoshop/VS Code-style fuzzy search palette for navigating nodes and executing menu actions. Searchable by name/ID, keyboard navigation (↑↓→Esc), Escape-to-clear, backdrop click to close. 35 unit tests.
- **Ctrl+K Badge in Footer**: Visual keyboard shortcut indicator (`Ctrl+K`) displayed next to the Undo Timeline button in the footer status bar.
- **Command Palette Unit Tests**: 35 tests across 8 blocks covering fuzzy search (prefix, subsequence, case-insensitive), keyboard navigation (ArrowDown/Up, Enter, Escape), empty nodes render, edge cases.

### Fixed
- **Escape double-call in CommandPalette**: Global keydown listener now checks `paletteEl.contains(e.target)` — events originating inside the palette are handled only by the React handler.

## [9.3.3] - 2026-06-15
### Added
- **Snap Visual Indicator**: Mini-map panel now shows an amber glow (`ring-2 ring-accent/40`) when it snaps to viewport edges during drag.
- **Toast Notification System**: Global toast system with framer-motion animations (4 variants: info, success, warn, error). `ToastProvider`, `useToast` hook, `addLog` bridge for visual notifications.
- **Clamp Constants Refactor**: Magic numbers replaced with 5 named constants in `RackMiniMap.tsx`: `PANEL_CSS_TOP`, `PANEL_CSS_RIGHT`, `PANEL_CLAMP_TOP_MAX`, `PANEL_CLAMP_MIN_VISIBLE_LEFT`, `PANEL_CLAMP_MIN_VISIBLE_BOTTOM`.
- **Top Clamp Limit Indicator**: Cyan inset shadow `shadow-[inset_0_1px_0_rgba(0,242,255,0.12)]` on the mini-map panel when `offsetY === PANEL_CLAMP_TOP_MAX`, giving visual feedback at the drag boundary.
- **Exported Positioning Constants**: `PANEL_CSS_TOP` and `PANEL_CSS_RIGHT` exported from `RackMiniMap.tsx` for test reference.
- **Constant Consistency Test**: Verifies Tailwind classes `top-[40px]` and `right-[10px]` match exported `PANEL_CSS_TOP=40` and `PANEL_CSS_RIGHT=10` in both expanded panel and collapsed button.
- **Panel Clamping Tests**: 60 unit tests covering mount-time clamp (4 extremes + normal), drag-time clamp (4 axes: top, bottom, left, right), snap visual indicator (6 scenarios), collapsed mode clamping (horizontal + vertical), top limit inset shadow visibility, and constant consistency.

### Fixed
- **Mini-map stuck behind toolbar**: Reduced vertical top clamp from `-80` to `-20` in both drag handler and mount clamp. The panel can no longer be dragged above the viewport's `overflow-hidden` boundary where the header becomes inaccessible.
- **Stale closure in snap indicator**: Removed stale closure guard `if (isSnapped !== snapped)` that captured `isSnapped` as initial `false` forever. Now calls `setIsSnapped(snapped)` unconditionally.
- **Inconsistent snap cleanup**: Added `setIsSnapped(false)` to the `e.buttons !== 1` guard so the amber glow clears when the mouse button is released mid-drag outside the window.
- **Collapsed mode clamp (EyeOff button)**: `handleHeaderMouseDown` now uses `containerWidth`/`containerHeight` props as fallback when `panelRef.current` is null (collapsed mode), preventing the collapsed button from being dragged outside viewport bounds.

### Changed
- **Mini-map test suite**: Expanded from 42 to 60 tests (+18 tests) covering drag clamping on all 4 axes, collapsed mode, top limit indicator, and Tailwind constant consistency.
## [9.3.2] - 2026-06-13
### Added
- **Alt+Click Ghost Preview**: BlueprintLibraryPanel now supports Alt+Click to enter ghost preview mode for positionable injection before placement.
- **Tooltip on blueprint items**: Hovering over a blueprint shows "Click to inject · Alt+Click for ghost preview".

### Fixed
- **Blueprint injection regression**: `handleSelectBlueprintFromPanel` now injects directly via `editor.applyTemplate()` instead of entering ghost preview mode, restoring broken e2e blueprint injection flow.
- **RackStartupAssistant overlay not dismissing**: Gate reinforced with `allElements.length > 0` fallback in `VirtualRack.tsx`.
- **Submenu shortcuts not rendering**: `MenuBar.tsx` submenu items now display keyboard shortcuts (Ctrl+O, Ctrl+S, etc.).
- **Framer-motion onClick suppression**: `CellNode.tsx` and `StructuralNode.tsx` now select on `onPointerDown` before framer-motion's pan gesture consumes the event.
- **Dynamic import in e2e tests**: Replaced `await import()` with top-level imports in `rack-features.spec.ts` (ESM not supported in Playwright CommonJS).
- **Flaky e2e selectors**: Updated `omega-project.spec.ts` to use `button:has-text()` for robust submenu button targeting.

## [9.2.0] - 2026-06-11
### Added
- **Self-Contained Manifest (v9.2.0)**: Desugared visual properties from CSS variables, theme databases, and JS fallbacks. Implemented 100% portable lookups directly inside the manifest.
- **Three-Level Resolution Chain**: Created `resolveNodeStyle()` to trace `node.style.variant` -> `ui.styles[cellRef]` -> `ui.palette` -> `ui.sizes` for hex-colors and pixel metrics.
- **Distill Manifest Pipeline**: Chains legacy fossilization, style contraction, style/asset pruning, and SHA-256 deduplication to output clean production-ready synthesizer manifests.
- **Interactive Pruning Guards**: Prompts the user with a breakdown of unused style variants and assets before purging them during distilled export.
- **Double Saving Modes**: UI options for "Save Work Mode" (preserves all work styles/assets) and "Export Definitive Mode (Distilled)" (runs the distillation pipeline).
- **Subtree Blueprint Packaging (v9.2.0)**: Implemented `exportCellAsBlueprint()` to build compressed `.acepack` bundles (zip files) containing `blueprint.json` (using UCA tree-based `extractSubtreeResources()`) and its local `/resources/` binaries.
- **Unrestricted Blueprint Export**: Removed structural restrictions in `EntityIdentity.tsx` to allow exporting any selected UCA node or group directly.


## [8.2.0] - 2026-05-31
### Added
- **Independent Viewport State**: Moved viewport tracking hook (`useViewport`) to the individual pane level (`WorkbenchPane.tsx`), enabling isolated zoom and scroll offsets per tab.
- **Fixed Rack HUD Overlay**: Isolated zoom and pan transforms to the rack chassis frame inside `VirtualRack.tsx`, preventing scaling or shifting of the mode selector (ENGINEERING/LIVE) and the active plane navigation (MAIN/VOICE/etc.).
- **Persistently Visible JSON Folding**: Configured Monaco Editor options in `SourceView.tsx` with explicit folding settings and set folding control visibility to `always` in the gutter.
- **Unified Window Menu (formerly Ventana)**: Renamed the menu to `Window`, aligned menu entries with right-dock sidebar panels, and added dynamic checkable submenus to toggle individual sections of the Rack Properties.
- **Uncommented Mockup Rendering & Decoupled Gallery State**: Resolved a state collision where both the Blueprints gallery and Studio Render modals were linked to `mockupOpen`. Created an independent `blueprintGalleryOpen` state for the template gallery and uncommented/activated the `MockupModal` renderer for high-definition studio renders.
- **Fixed Light Mode Module Render**: Removed light-theme overrides for `--omega-` and `--primitive-` variables in `vars.css`. Defined `[data-ui-theme="dark"]` reset selectors in `vars.css` and `signals.css`, and forced `data-ui-theme="dark"` on the mockup viewport inside `MockupViewport.tsx` to guarantee that high-fidelity exports rendered from light mode use the correct dark-theme colors (text, borders, signal ports) and match the dark `#050505` background.
- **Improved Studio Render Export with Save Picker**: Integrated `showSaveFilePicker()` to prompt the user for the file path when downloading studio renders, bypassing browser-blocked automatic downloads. Added `skipFonts: true` to prevent network/CORS timeouts during render capture, and kept the save button enabled even when governance errors are present (which are now shown as a status badge on the left side of the footer).

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
