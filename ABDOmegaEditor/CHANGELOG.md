# OMEGA Manifest Editor Changelog

All notable changes to the OMEGA Manifest Editor will be documented in this file.

## [9.9.1] - 2026-06-16
### Removed
- **Audit button from floating toolbar**: Eliminado `audit` de `TOOLBAR_BUTTONS` en `toolbarDefinitions.tsx` (11→10 botones). Redundante con Compliance panel en dock derecho, DockIconStrip y Window menu. `loadConfig()` auto-filtra `audit` de configs persistidos. `Toolbar.tsx`: eliminados `auditBtn`, `Shield` import, `onOpenAudit` prop.
- **5 ShortcutBadge duplicados del WorkbenchFooter**: Eliminados Orbital (Ctrl+1), Rack (Ctrl+2), Source (Ctrl+3), History (Ctrl+4) y Mini Map (Ctrl+Shift+M) — duplicaban los botones mini-icono del centro. Shortcuts movidos a tooltip nativo HTML: `title="Orbital View (Ctrl+1)"`, etc. ShortcutBadges restantes: Undo, Redo, Cmd Palette, Save (sin duplicado en iconos).
- **Engine info overlay de vista Orbital**: Eliminado overlay inferior-izquierdo en `NodeCanvas.tsx` con "Engine: OMEGA v7.2.3 (Sovereign)", "Mode: Orbital Hub", "Status: X Elements Online" — texto decorativo sin valor funcional.
- **Compliance Report del menú Help**: Movido de Help > Compliance Report (deprecated) a Window > Compliance (Audit) como toggle legítimo con `checked`, `onToggleWindow('window_compliance')` y shortcut `Ctrl+Shift+A`, consistente con Layers/Element Properties/Blueprints.

### Changed
- **MenuBar**: Compliance Report eliminado de Help, añadido a Window como `{ label: 'Compliance (Audit)', icon: Shield, checked, onClick, shortcut: 'Ctrl+Shift+A' }`.

### Tests
- **ToolbarCustomizePopover.spec.tsx**: Arrays de orden actualizados (sin 'audit'), counts 11→10, eye icon counts.
- **MenuBar.spec.tsx**: Test "Guided Tour" antes de "About OMEGA" (reemplaza "Compliance Report"), nuevo test Window > Compliance toggle.
- **WorkbenchFooter.spec.tsx**: Titles actualizados para incluir shortcuts: "Orbital View (Ctrl+1)", etc.

## [9.9.0] - 2026-06-16
### Added
- **Resizable Panels (P9)**: `react-resizable-panels` integrado en `RightDockContainer`. `PanelGroup`/`Panel`/`PanelResizeHandle` reemplazan el antiguo sistema de anchos fijos (260-320px) con splitters redimensionables entre todos los paneles del dock (Layers, Properties, Rack, Compliance, Blueprints, Logs, Info/History). Tamaños de panel persistidos en localStorage (`omega_dock_panel_sizes`) con `defaultSize` como fallback. `minSize` previene colapso accidental.
- **Floating Toolbar Customizable (P8)**: `useToolbarCustomization` hook con `moveButton` (drag-and-drop), `toggleVisibility`, `resetToDefault`. `toolbarDefinitions.tsx` con 11 botones en 4 categorías (tools/edit/views/system). Popover de personalización con GripVertical para reordenar, Eye/EyeOff para visibilidad, Reset a defaults. Persistencia en localStorage (`omega_toolbar_config`) con validación de integridad (missing IDs añadidos, unknown IDs filtrados).
- **Undo Timeline Visual (P6)**: UndoTimelinePopover extendido con integración de batch history (hide/lock/group). Nueva sección "Batch" en el timeline con entradas coloreadas por variante (`BATCH_VARIANT_TIMELINE`), indicador ↶ para entradas undoables, y undo individual de batch entries. 47 tests pasando.

### Changed
- **UndoTimelinePopover**: Props `batchEntries` y `onUndoBatchEntry` opcionales. Total steps ahora incluye `batchEntries.length`.
- **WorkbenchFooter**: Nuevos props `batchEntries` y `onUndoBatchEntry` pasados al popover.
- **WorkbenchContainer**: `useBatchHistory()` llamado a nivel contenedor. `onUndoBatchEntry` implementa undo de visibility/lock/group.

## [9.8.1] - 2026-06-16
### Added
- **Temas Visuales Adicionales (P7)**: 3 nuevos temas — Amber (warm), Cyberpunk (neon), High Contrast (max legibility).
- **ThemeSelector dropdown**: Reemplaza el antiguo ThemeToggle (solo dark/light) con un selector desplegable con indicador de color, lista de 5 temas y checkmark en el activo. Cierre con click outside + Escape.
- **CSS variables para 5 temas**: `:root` (dark), `[data-ui-theme="light"]`, `[data-ui-theme="amber"]`, `[data-ui-theme="cyberpunk"]`, `[data-ui-theme="high-contrast"]` — cada uno con `--wb-primary`, `--primary-rgb`, `--wb-bg`, `--wb-surface`, `--wb-outline`, `--wb-text`, `--wb-bloom`, `--wb-accent`, `--primitive-*`, `--omega-*`.
- **Tipo uiTheme expandido**: `"dark" | "light" | "amber" | "cyberpunk" | "high-contrast"` en todos los componentes que referencian `uiTheme` (WorkbenchPane, WorkbenchViewport, WorkbenchInspector, RightDockContainer, DockInfoPanel, PropertyPanel, RulerOverlay, Header, ThemeSelector).

## [9.8.0] - 2026-06-16
### Added
- **Status Bar (P3) completado**: WorkbenchFooter con indicador dirty/validation verificado y marcado como completado en roadmap. Indicador Modified/Saved con timestamp, conteo de errores/warnings de validación en vivo, estado watchdog, indicador de herramienta activa.
- **Integration tests para Status Bar**: 7 nuevos tests de integración cubriendo combinaciones dirty + errors + watchdog (dirty+connected+errors, dirty+offline+worst-case, clean+idle+ideal, dirty+connected+marquee, etc.). 45 tests total para WorkbenchFooter.
- **Onboarding Walkthrough (P4)**: Interactive guided tour with 7 steps (Welcome, Header & Menu Bar, Tool Palette, Work Canvas, Inspector Panel, Status Bar, Keyboard Shortcuts). Auto-opens on first visit via localStorage. Highlights target elements with animated glow ring. Accessible anytime via Command Palette (Ctrl+K > Help > "Take a Guided Tour").
- **isOnboardingOpen state**: Added to workbench state management with TOGGLE_UI_STATE support for open/close control.

## [9.7.0] - 2026-06-15
### Added
- **Alignment Shortcuts — Resolución de Colisiones**: Ctrl+Shift+L/H/R/B ahora priorizan alineación cuando hay ≥2 ítems seleccionados. Los toggles de panel (Layers, History, Blueprints, Reset) ceden el shortcut cuando hay multi-selección. Archivos: `useWorkbenchShortcuts.ts`, `useAlignment.ts`, `alignmentConstants.ts`.
- **Ctrl+Alt+E — Distribute Evenly Both Axes**: Nuevo shortcut que distribuye elementos uniformemente en ambos ejes simultáneamente (grid layout). `computeDistributedBothPositions()` en `useAlignment.ts`.
- **Auditoría Global de Shortcuts**: 49/49 shortcuts documentados en `helpData.ts` verificados como implementados. 4 shortcuts añadidos: ↑↓←→ (nudge 1px), Shift+↑↓←→ (nudge grid), Enter (confirm ghost), Escape (cancel ghost/context menu).
- **Ctrl+Shift+A movido a Window**: Antes en Help > deprecated, ahora en Window como panel toggle legítimo con `checked`/`onToggleWindow`.
- **Indicadores de Prioridad en MenuBar**: Badges ámbar (→Align Left/Center/Right/Bottom) y tooltip cuando ≥2 ítems seleccionados. `ALIGNMENT_OVERRIDE` map + `hasMultiSelection` prop.
- **Tooltip Contextual en ViewportToolbar**: Contador `Sel: N` ahora muestra qué shortcuts de alineación están activos en modo multi-selección.

### Fixed
- **4 tests E2E de layers-panel-filters**: Locator ambiguo `button:has-text("Clear")` → `button[title*="Clear all filters"]`.
- **Deprecated tags**: Eliminado `highlight: 'deprecated'` de 4 ítems funcionales en MenuBar (Link Workspace, Blueprints, Deploy, Module Global Configuration).

### Tests
- **E2E Suite**: 50/52 tests pasando (2 pre-existing blueprint-store failures).

## [9.6.1] - 2026-06-14
### Added
- **Ctrl+Shift+E Shortcut para CellStudio**: Nuevo handler `onOpenCellStudio` en `useWorkbenchShortcuts.ts` con guard `!isInputFocused()`. MenuBar muestra `shortcut: 'Ctrl+Shift+E'` en lugar de `highlight: 'deprecated'`.
- **Unit Tests para Shortcuts**: 19 tests en `useWorkbenchShortcuts.spec.ts` — Ctrl+Shift+E dispatch, Meta+Shift+E (macOS), case insensitivity, guards en input/textarea/select/contenteditable/monaco, preventDefault, cleanup, coexistencia con Ctrl+S/Z/G.

### Fixed
- **LayersPanel TypeScript Fix**: `boolean | undefined` por optional chaining en `propOk`. Envuelto en `!!()` coercion.

### Tests
- **Full typecheck**: `npx tsc --noEmit` → 0 errores. `npx jest` → 19/19 passed.

## [9.6.0] - 2026-06-14
### Added
- **Visual Modulation Matrix**: `VisualModulationMatrix.tsx` — matriz SVG drag-and-drop reemplazando `ModulationGrid` modal. Conexiones Bezier con color por tipo de modulación, ghost preview al arrastrar, ajuste de cantidad con scroll-wheel.
- **Virtual Scrolling LayersPanel**: `react-window@2.0.0-dev.1` — `List` + `rowComponent` para rendimiento con +1000 nodos. Drag & drop a nivel contenedor, expand/collapse preservado.

### Fixed
- **SVG Coordinate Fix**: Posiciones de links ahora restan `sidebarWidth`/`headerHeight` offset.
- **Virtual Scrolling TS Fixes**: 9 type errors corregidos (useListRef, FilterParams interface, HistoryEntry import, height/width removidos de List).

## [9.5.0] - 2026-06-15
### Added
- **DockIconBar generic component**: Unifies DockIconStrip and DockRackSectionToolbar into a single reusable vertical icon bar. Supports groups with dividers, optional labels, per-group className, and customizable container styles. 30 unit tests + 5 snapshots.
- **DockPanelHeader reusable header**: Extracted from DockPanel into standalone component with `default` and `subtle` variants. 10 unit tests + 2 snapshots.
- **ToolbarIconButton colorVariant prop**: New `colorVariant='primary' | 'accent'` prop for accent-colored active state (used by liveBtn). 4 accent tests + 2 accent snapshots.

### Refactored
- **DockPanel.tsx**: ~10 lines removed — now uses `<DockPanelHeader>` internally. Removed unused `import { X }`.
- **Toolbar.tsx**: 3 remaining inline buttons refactored to ToolbarIconButton — addBtn (flyout wrapper), liveBtn (colorVariant='accent'), zenBtn (conditional icon + shadow). **11/11 buttons now use ToolbarIconButton.**
- **DockIconStrip.tsx**: Thin wrapper (~3 lines JSX) delegating to DockIconBar.
- **DockRackSectionToolbar.tsx**: Thin wrapper (~7 lines JSX) with group configuration.

### Tests
- **ToolbarIconButton.spec.tsx**: +4 accent variant tests + 2 accent snapshots. 31 tests total.
- **DockIconStrip.spec.tsx**: 15 tests + 3 snapshots (rendering, active/inactive, click handlers).
- **DockRackSectionToolbar.spec.tsx**: 9 tests + 3 snapshots (groups, divider, active/inactive, mixed states).
- **DockIconBar.spec.tsx**: 30 tests + 5 snapshots (groups, labels, className, active state, edge cases).
- **DockPanelHeader.spec.tsx**: 10 tests + 2 snapshots (default/subtle variants, click handler).

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
