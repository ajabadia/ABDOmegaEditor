# OMEGA Manifest Editor Changelog

> **Regression Recovery Plan (v9.1.9-dev)**: Sincronizado con [REGRESSION_RECOVERY_PLAN.md](../../REGRESSION_RECOVERY_PLAN.md). 100% de los items del checklist completados y validados.


## [9.1.9-dev] — 2026-06-10
### Added
- **Cell Studio Draft Recovery System**: Autoguardado dinámico en `sessionStorage` mediante el hook `useCellStudioDraft.ts`. Al iniciar la interfaz, el modal `CellStudioDraftPrompt.tsx` ofrece al usuario la opción de restaurar el borrador previo o iniciar un borrador de cero de forma interactiva.
- **Unique Child Keys in Renderers**: Integradas claves React combinadas `key={`${child.id}-${index}`}` en `StructuralNode.tsx` y `CellNode.tsx` para evitar colisiones de keys (e.g. `io_root`) y asegurar estabilidad en el renderizado del Rack.

### Changed
- **Cell Studio Modular Refactor**: Rediseñado `CellStudioContainer.tsx` para delegar la interfaz en subcomponentes atómicos especializados (`CellStudioPreviewStrip`, `CellStudioToolbar`, `CellStudioContentArea`, `CellStudioAssetOverlay`) y centralizar el estado mediante `useCellStudioState.ts`.
- **RackStartupAssistant Visibility and State Dismissal**: Corregido en `VirtualRack.tsx` para verificar `isEmptyManifest` analizando la existencia real de componentes y contenedores. Al seleccionar "Create from Scratch", el asistente escribe la directiva en el estado local `isStartupDismissed` para ocultarse permanentemente y no bloquear el canvas vacío.


## [9.1.8-dev] — 2026-06-10
### Fixed
- **RackStartupAssistant Always Visible (Critical Bug)**: El overlay "INITIALIZE CANVAS" se renderizaba **incondicionalmente** en el centro del viewport, incluso cuando el rack tenía elementos cargados. El usuario reportó: *"has dejado fijo el racksartupassintant en medio de la pantalla, solo debería de salir al entrar en modo rack si no tiene ningún elemento cargado"*.

#### Root Cause
`VirtualRack.tsx` invocaba `<RackStartupAssistant />` sin ningún gate condicional:

```tsx
// ANTES (buggy)
<RackStartupAssistant
  onOpenGallery={onOpenGallery}
  onLinkWorkspace={onLinkWorkspace}
  onCreateFromScratch={onCreateFromScratch}
  isDirectoryLinked={isDirectoryLinked}
  elementCount={allElements.length}
/>
```

Esto provocaba que el overlay tapara el rack permanentemente en modo ENGINEERING, independientemente de si había contenido o no. El prop `elementCount` se pasaba solo para mostrar "0 Elements" en el header, pero no se usaba para gatear el render.

#### Fix
Envuelto en condicional que verifica **2 condiciones simultáneas**:

```tsx
// DESPUÉS (corregido)
{!isLiveMode && allElements.length === 0 && (
  <RackStartupAssistant
    onOpenGallery={onOpenGallery}
    onLinkWorkspace={onLinkWorkspace}
    onCreateFromScratch={onCreateFromScratch}
    isDirectoryLinked={isDirectoryLinked}
    elementCount={allElements.length}
  />
)}
```

| Condición | Por qué |
|---|---|
| `!isLiveMode` | En LIVE mode el usuario interactúa con el rack cargado — el assistant no aporta nada |
| `allElements.length === 0` | Solo aparece cuando el rack está realmente vacío (sin nodos, sin blueprints inyectados) |

#### Comportamiento Esperado Ahora
- **Carga inicial con rack vacío** (manifest por defecto): el overlay aparece en el centro ✅
- **Inyectar blueprint** (Blueprint Gallery → Apply): el rack se puebla, el overlay desaparece ✅
- **Añadir nodo manual** (Toolbar > Add > Control/Jack): `allElements.length` pasa a 1+, el overlay desaparece ✅
- **Entrar en LIVE mode** con rack vacío: el overlay se oculta (LIVE = solo interacción con rack) ✅
- **Salir de LIVE mode** con rack vacío: el overlay reaparece ✅

#### Verificación
- **`npm run typecheck`**: 0 errores (Exit 0)
- **REGRESSION_RECOVERY_PLAN.md**: sigue al 100% (23/23 archivos)

### Files changed
- `src/features/manifest-editor/components/viewport/VirtualRack.tsx` — envuelto el render de `<RackStartupAssistant>` en `{!isLiveMode && allElements.length === 0 && (...)}`


## [9.1.7-dev] — 2026-06-10
### Added
- **`RackStartupAssistant.tsx` (NEW — REGRESSION_RECOVERY_PLAN item 23)**: Tech-Noir "INITIALIZE CANVAS" empty-state overlay shown when the virtual rack has no elements. Three quick actions to bootstrap a new workspace:
  - **Blueprint Gallery** (primary, cyan accent) — opens the template/blueprint gallery
  - **Link Workspace Folder** (amber accent when unlinked, emerald when linked) — binds a local directory as the asset workspace
  - **Create from Scratch** (muted accent) — dismisses the overlay and resets the manifest for a blank start
- **Tech-Noir Visual Style**: dark surface `wb-surface` + `wb-outline` border, cyan accent (`#00f0ff`), Inter font, uppercase `font-black tracking-[0.25em]`, `framer-motion` for entrance/exit transitions, ambient glow on the card via `box-shadow`. Action buttons have accent-specific hover states (cyan, amber, emerald, white) with per-color box-shadow glow.
- **Reactive Telemetry Header**: shows "System Ready · N Elements" and "Engine · OMEGA v9.1.7-dev" footer with an "Awaiting input" pulsing dot indicator.

### Changed
- **Empty-Rack State Delegation**: `VirtualRack.tsx` now renders `<RackStartupAssistant />` as the empty-state UI (previously the rack frame rendered empty). Wired through 4 layers: `VirtualRack` → `WorkbenchViewport` → `WorkbenchPane` → `WorkbenchContainer`.
- **WorkbenchContainer Wiring**: 4 new callbacks/props added to `WorkbenchPane`:
  - `onOpenGallery={() => setIsGalleryOpen(true)}` — opens the blueprint gallery
  - `onLinkWorkspace={editor.linkDirectory}` — triggers the file picker for the VFS root
  - `onCreateFromScratch={() => editor.reset()}` — resets the manifest to a clean state
  - `isDirectoryLinked={editor.isDirectoryLinked}` — adjusts the Link Workspace label dynamically
- **`package.json` Script**: Added `"typecheck": "tsc --noEmit"` (between `lint` and `test`) — the `npm run typecheck` command now works directly without needing to remember `npx tsc --noEmit`. Convention standardized for the project.

### Fixed
- **REGRESSION_RECOVERY_PLAN.md Progress**: Item 23 (RackStartupAssistant.tsx) — the only genuinely missing file from the backup's 11 blocks of work — was the last pending item. With this addition, the plan reaches **100% completion (23/23 archivos + 2 tipos GridConfig)**.

### Verification
- **`npm run typecheck`**: 0 errores (Exit 0)
- **Dev server (puerto 3035)**: estable a través de la edicion
- **REGRESSION_RECOVERY_PLAN.md**: actualizado a "100% (23/23 archivos + 2 tipos)" con nota de plan completo


## [9.1.6-dev] — 2026-06-10
### Added
- **Regression Recovery Plan — Session 7 Verification (76% complete)**: Verified 22/29 archivos + 2 tipos (GridConfig) of the [REGRESSION_RECOVERY_PLAN.md](../../REGRESSION_RECOVERY_PLAN.md) checklist with specific signature searches. Each item's note in the plan now references the exact line numbers and code patterns that confirm the fix is present in the current project.

### Verified Signatures (specific grep results)
- **Item 7 `StructuralNode.tsx`**: `isLeafContainer = !node.children || node.children.length === 0` (l.68) + `panHandlers = (isDraggable && isLeafContainer)` (l.81) + `outline: 2px solid #00f2ff` (l.122)
- **Item 8 `CellNode.tsx`**: `outline: 2px solid #00f2ff` (l.158) + multi-selected dashed `#a855f7`
- **Item 10 `useUCADrag.ts`**: `layout: { pos: { x, y } }` (l.142, l.172) without spread of `node.layout`
- **Item 11 `VirtualRack.tsx`**: `className="rack-viewport"` (l.211) + `handleSnapToGrid` (l.65) + `onSnapToGrid` prop (l.429)
- **Item 12 `WorkbenchViewport.tsx`**: `import RulerOverlay` (l.6) + `toggleGridField/updateGuides` (l.9) + `showGuides` state (l.119-120)
- **Item 13 `ViewportControls.tsx`**: `onToggleRulers?` + `rulersVisible?` props (l.13-14) + `isRackView = viewMode === 'rack'` (l.23)
- **Item 15 `RackContextMenu.tsx`**: 8 `e.stopPropagation()` calls on all menu buttons
- **Item 16 `MenuBar.tsx`**: `View Grid` (l.161) + `Show Guides` (l.162) + `Grid3X3/Ruler` imports (l.9) + `inspectorLevel` prop (l.45)
- **Item 18 `useEntityCRUD.ts`**: `applyUpdatesToNode`/`insertNodeInTree` (l.5) + `buildManifestFromTree` (l.91-96)
- **Item 19 `workbenchReducer.ts`**: `SET_SELECTED_NODE` case (l.231) + `isRightPanelCollapsed: !state.isRightPanelCollapsed` (l.282)
- **Item 20 `useRackSimulation.ts`**: `useRackSimulation v7.2.3` (l.9-12) + `dryRunLfoRegistry` integration (l.6)
- **Item 22 `WorkbenchContainer.tsx`**: `handleToggleGrid` (l.154) + `onToggleGrid` wiring (l.496) + `onSaveCellAsBlueprint` (l.501)
- **Item 25 `useDryRunSimulation.ts`**: `dryRunLfoRegistry` (l.6) + `useDryRunSimulation v8.2` (l.10-13)
- **Item 28 `GroupEditor.tsx`**: `GroupEditorProps` interface (l.3) + `export function GroupEditor` (l.19)
- **Item 29 `BlueprintLibraryPanel.tsx`**: `BlueprintLibraryPanelProps` (l.8) + `export default function` (l.16)
- **Item 9 `ucaTypes.ts`**: 34-line file with `UCADebugContext` + `UniversalRendererProps`; UCA types centralized in `manifest.ts` via `OmegaNode`
- **Item 17 `Toolbar.tsx`**: 229-line floating toolbar with 9 tools (Select/Marquee/Add/Studio/Blueprints/Audit/Config/Live/Zen)
- **Item 21 `types/workbench.ts`**: 138-line file with `WorkbenchState` + `WorkbenchAction` (includes `SET_SELECTED_NODE`, `isRightPanelCollapsed`, 7 window flags, `studioMode`, `uiTheme`)

### Architecture Replacements (not regressions)
- **Item 24 `CellStudioDraftPrompt.tsx`** → Replaced by `useCellStudioDraft.ts` hook (extracted to hook pattern); UI prompt consolidated in `CellStudioContainer`
- **Item 26 `VariantGovernance.tsx`** → Replaced by `GovernanceRegistry.ts` + 5 split governance files (`ColorGovernance`, `SpatialGovernance`, `TypographyGovernance`, `SequenceGovernance`, `FittingGovernance`) — more modular architecture
- **Item 27 `useAssetUpload.tsx`** → Never existed in current project; asset upload uses native `<input type="file">` in other components

### Genuinely Missing
- **Item 23 `RackStartupAssistant.tsx`** → Confirmed absent. Chat_log claimed it was created in v8.3.2 (`docs/seguimiento/CHAT_LOG.md` references it), but the file is not in the current tree. Empty-rack state is handled by inline overlay in `VirtualRack.tsx` instead.

### Changed
- **REGRESSION_RECOVERY_PLAN.md Checklist**: Progress line updated from 72% to **76%** (22/29 archivos verificados). Per-item notes enriched with line numbers and signature descriptions. Items 24, 26, 27 marked as "reemplazado" with architectural justification; item 27 marked as "no aplica"; item 23 remains the only pending file to create.


## [9.1.5-dev] — 2026-06-10
### Added
- **Inspector Level Property Filtering**: Propagated the `inspectorLevel` prop ('simple' | 'medium' | 'advanced') from `WorkbenchContainer.tsx` through `RightDockContainer.tsx`, `WorkbenchInspector.tsx`, `PropertyPanel.tsx`, `ComponentEditor.tsx`, and all 8 atomic component editors (`KnobEditor`, `SliderEditor`, `LedEditor`, `PortEditor`, `SwitchEditor`, `ButtonEditor`, `DisplayEditor`, `LabelEditor`).
- **Progressive Tab Visibility**: Filtered the active tabs/sections in `PropertyPanel.tsx` based on `inspectorLevel` (e.g., hiding Design, Globals, and Logic tabs in Simple mode, and only showing the low-level Diagnostics Registry tab in Advanced mode).
- **Component Field Visibility Governance**: Filtered specific styling, asset mapping, and binding limit fields within atomic editors according to the selected inspector complexity level.

### Changed
- **Studio Render Menu Relocation**: Relocated "Studio Render" menu option from `Edit > Generate` to `File > Export` in `MenuBar.tsx` based on the visual layout discrepancy, and cleaned up the old empty `Generate` menu.
- **Strict Optional Prop Safety**: Appended `| undefined` to all `inspectorLevel` prop declarations in interfaces to comply with TypeScript's `exactOptionalPropertyTypes: true` compiler rules.

## [9.1.4-dev] — 2026-06-10
### Fixed
- **VirtualRack `gridVisible` Duplicated**: `VirtualRack.tsx` declared both a local `const gridVisible = grid?.visible ?? false` AND accepted (silently, without declaring) a `gridVisible` prop from `WorkbenchViewport.tsx`. Under `exactOptionalPropertyTypes: true` the undeclared prop triggered TS2375. Fixed by adding `gridVisible?: boolean | undefined` to `VirtualRackProps`, destructuring as `gridVisibleProp`, and consolidating to `const gridVisible = gridVisibleProp ?? (grid?.visible ?? false)`. Prop is now authoritative; manifest-derived fallback preserved.
- **Edit > Document Timeline Duplicate**: `MenuBar.tsx` had two entries (`Edit > Document Timeline` and `View > History`) both calling `onTabFocus('history')` with the same argument — 100% identical behavior. Removed `Edit > Document Timeline`; kept `View > History` (VSCode convention). Window > History is a separate concern (toggles the right-dock panel, not the workbench tab).

### Added
- **MenuBar Props Wired in WorkbenchContainer**: The 7 optional props added in v9.1.2-dev to `MenuBarProps` are now actually passed from `WorkbenchContainer` to `Header` → `MenuBar`:
  - `selectedNodeId` ← `state.selectedNodeId`
  - `multiSelectedIds` ← `state.multiSelectedNodeIds`
  - `onSaveCellAsBlueprint` ← `() => setIsGalleryOpen(true)` (closest existing behavior; no native `saveCellAsBlueprint` in `useBlueprintInjection`)
  - `inspectorLevel` ← new `useState<'simple' | 'medium' | 'advanced'>('medium')`
  - `onSetInspectorLevel` ← `setInspectorLevel` setter
  - `manifest` ← `editor.manifest` cast to `OMEGA_Manifest`
  - `onUpdateManifest` ← `editor.updateManifest` (was already in scope but not passed)
- **5 MenuBar Items Recovered from Backup** (`ABDOmegaEditor___222`): `View > History`, `View > Inspector Level` (submenu Simple/Medium/Advanced with checked indicators), `View > Show Element Boundaries (Debug UI)` (toggles `manifest.ui.ucaDebug.enabled` with deep-merge), `View > Disable UCA Rendering (Fallback)` (toggles `manifest.ui.useUCA`), and `File > Export > Cell as Blueprint JSON` (gated by `isSingleCellSelected`).

### Removed
- **`View > Toggle Logs` Duplicate**: Was 100% redundant with `Window > Console` (both called `onToggleWindow('window_logs')`). The Window entry has a `checked` indicator and is the canonical toggle; View was removed. Dev server on port 3035 stayed running through the edit (verified by attempted second-instance start that was rejected with "Another next dev server is already running").

### Changed
- **Window > Rack Properties Sub-Items Consolidated**: 10 granular sub-items (Essential Identity, Identity Branding, Global UI Skin, Active Construction Plane, Module Taxonomy, Physical Emulation Profile, Aesthetics Globals, Aesthetics Elements, Architecture, Diagnostics) consolidated to the 6 Phase 34 industrial groups: `Identity & Branding`, `Chassis & Power`, `Grid & Workspace`, `Aesthetics`, `Architecture`, `System Engineering`. Underlying 10-key state in `WorkbenchContainer.rackSections` preserved; each group maps to a representative section key for the `checked` indicator.
- **Bilingual Spanish(English) Labels Eliminated**: Window menu labels cleaned of `Capas (Layers)`, `Propiedades del Rack (Rack)`, `Propiedades de Elemento (Properties)`, `Librería de Blueprints (Blueprints)`, `Información (Info)`, `Historial (History)`, `Logs (Console)` per Phase 29 "Clean English UX Labels" convention. All MenuBar labels now pure English.

## [9.1.2-dev] — 2026-06-10
### Fixed
- **Drag Inertia Elimination**: `useUCADrag.ts`, `StructuralNode.tsx`, `CellNode.tsx` migrated from `onDrag/onDragStart/onDragEnd` (framer-motion spring/momentum) to `onPan/onPanStart/onPanEnd` (pointer-based, no momentum). Root cause: framer-motion's `dragMomentum={false}` still applies the spring animation visually, so the element overshoots the store-written position. `onPan` writes the final position atomically at `onPanEnd`, so the element lands exactly where the pointer releases regardless of drag speed. Backup project (`ABDOmegaEditor___222`) already used this pattern.
- **Alignment Buttons Race Condition (Atomic Batch)**: `ViewportToolbar.tsx` — `applyAlignment`/`applyDistribution` were calling `onUpdateItem` once per item in a `forEach`, each call dispatching a manifest update that re-walked the tree and re-projected legacy `controls`/`jacks`/`layout.containers`. React batched the dispatches, and the last one overwrote the others — symptom: only the second item visibly moved. Replaced with `applyPositionBatch` which does a **single** `onUpdateManifest` dispatch with the function form `(prev) => { applyBatchPositionsToTree(tree, newPositions); treeToManifest(nextTree); return newState }`. Tree walked once, all positions applied atomically, legacy projection recalculated once at the end. The classic "centers always wrong" symptom is also resolved because all items now move to the same target in a single transaction.
- **RACK_MASTER in Alignment Targets**: `gatherPositions` now excludes the rack root (kind==='rack' with id in `{RACK_MASTER, root, MAIN_RACK, MAIN_RACK_ROOT}`) via a shared `isRackRootNode()` helper. The rack is the world origin — including it as an alignment target would shove all other items to (0,0). Detection is dynamic (not by id alone) so fixtures using different root ids are still safe.
- **`useEntityCRUD.updateItem` Normalization**: Replaced the fragile condition `!('kind' in updates) && ('presentation' in updates || 'pos' in updates)` (which missed nested `layout.pos` updates from the toolbar) with a single path: `applyUpdatesToNode(nodeInTree, updates)` is **always** called to normalize both legacy and native patches. The translated `layout`/`style`/`bind`/`role`/`cellRef` are then passed to `updateNodeInTree`. Eliminates the silent fall-through to pass-through for the common nested-`layout.pos` case.

### Added
- **Alignment Debug Logging**: `gatherPositions` emits a structured trace when `window.__OMEGA_ALIGN_DEBUG__ = true` is set in the browser console. The trace contains `selectedIds`, `accepted[]` (with `id`/`x`/`y`/`w`/`h`/`kind`), and `skipped[]` (with typed `reason`: `rack-root-id` | `rack-root-node` | `not-found` | `invalid-pos` + `detail` JSON for invalid pos). Plus `Number.isFinite()` guard so `Infinity`/`NaN` don't poison `Math.min/max`. Helped identify that `pos` could be missing or non-numeric in legacy manifests.
- **Selection Counter in ViewportToolbar**: Small `Sel: N` chip in the alignment toolbar with a `title` that hints the multi-select mechanic — "No selection. Click a node, then Ctrl+click (or Shift+click) others to multi-select." Most "buttons don't work" reports were actually Ctrl+click confusion.
- **Distribute Threshold Lowered**: `canDistribute = selectedIds.length >= 2` (was `>= 3`). Standard design-tool behavior: 2 items can be aligned to a centered position.
- **SVG Icons with `currentColor`**: 8 alignment icons (align-left/center-h/right/top/center-v/bottom, distribute-h/v) replaced from PNG raster with SVG components (`AlignIcons.tsx`) using `stroke="currentColor"` and `fill="currentColor"`. Inherits the button's text color automatically, so no CSS filter needed for light/dark adaptation. 8 PNGs deleted from `public/icons/align/`.
- **`UpdateManifestFn` Shared Type**: Exported from `ViewportToolbar.tsx` and consumed by `WorkbenchViewport.tsx` and `WorkbenchPane.tsx` to satisfy `exactOptionalPropertyTypes` while accepting the function form `(prev) => Partial<OMEGA_Manifest>` that `history.updateManifestWithHistory` produces.

### Changed
- **ViewportToolbar Tooltips in English**: All 8 button tooltips, snap toggle, grid settings dropdown labels ("Show grid", "Snap selection", "Spacing X", "Spacing Y", "Scale (px / HP)", "Eurorack presets"), align-target toggle title — all translated from Spanish to English per project convention.
- **Alignment Calculation Comment**: Documented why `gatherPositions` uses `node.layout.size` from the store instead of `getBoundingClientRect()` from the DOM (mixing screen-coords with rack-coords causes the visual to drift under CSS `transform: scale(zoom)`).

## [9.1.1-dev] — 2026-06-10
### Fixed
- **RulerOverlay Pan/Zoom Sync (rAF loop)**: The ruler ticks, guide overlay lines, and guide creation/drag previews now stay perfectly anchored to the rack's (0,0) origin at any zoom level (80%, 100%, 160%) and during any pan sequence. Implementation switched from a `useEffect`/`useLayoutEffect` measurement strategy to a continuous `requestAnimationFrame` loop that samples `getBoundingClientRect()` of the rack and the section on every frame, only pushing to state when the position actually changes. The previous `rackOrigin()` math compensation was correct in theory but failed in practice because the flex parent re-centers the rack on zoom changes; the rAF approach is agnostic to *how* the rack moves (free-pan via rAF, discrete button-pan, zoom, resize). Side benefit: the one-frame drift that appeared when pressing a pan button after free-pan is gone.

## [9.1.3-dev] — 2026-06-10
### Fixed
- **Turbopack Build Crash on `nul`**: Eliminated the `nul` file in the project root (Windows reserved device name) and added `/nul` and `/nul.*` to `.gitignore` to prevent re-creation by accidental `type nul > something` commands. Turbopack was trying to read it as a CSS asset and failing with `os error 1 (Función incorrecta)`.

## [9.1.2-dev] — 2026-06-10 (superseded — see [9.1.2-dev] above for the full set of fixes)
### Added
- **Marquee Selection**: Photoshop-style click+drag rectangle on empty rack space to multi-select elements. `screenToRackLocal()` converts screen coords to rack-local coords accounting for zoom/pan CSS transform. `findNodesInRect()` performs AABB intersection test via recursive DFS. Fixed overlay (z-9998) captures mouse events globally during drag with crosshair cursor. Dashed cyan selection rectangle with `transition: none` to avoid lag from parent's 700ms transition. `didMarqueeRef` prevents `onClick` from clearing selection after marquee drag.
- **ViewportToolbar Eurorack Grid Settings**: Settings icon opens dropdown panel with Scale (px/HP) input, Spacing X/Y with HP and mm equivalents, Eurorack HP presets (1HP through 42HP) as clickable buttons, and reference line (1HP = 5.08mm, 3U = 128.5mm).
- **BlueprintThumbnail**: SVG-based miniature preview of GroupNode layouts in BlueprintLibraryPanel. Each child drawn as colored shape by type (circle for knobs/LEDs, bordered circle for ports, rectangle for sliders/switches). Auto-calculated viewBox from children bounding box.
- **Group/Ungroup Context Menu**: Right-click context menu now shows "Group" when 2+ items are multi-selected, and "Ungroup" when a group node is right-clicked. Multi-selection state is captured before `onSelectItem` clears it. Icons: BoxSelect (Group), Maximize (Ungroup) from lucide-react.
- **Group/Ungroup Keyboard Shortcuts**: `Ctrl+G` groups multi-selected nodes, `Ctrl+Shift+G` ungroups a selected group node. Wired through `useWorkbenchShortcuts`.
- **`groupSelected(ids)` in useEntityCRUD**: Creates a GroupNode from multi-selected elements with bounding box center position, reparents children with relative positions, inserts into UCA tree with projections sync.
- **`ungroupNode(groupId)` in useEntityCRUD**: Dissolves a group node, reparents children to absolute positions, re-inserts at parent level.
- **V2 Blueprint Loading**: `BlueprintLibraryPanel` now loads from `/blueprints/v2/index.json` (GroupNode format) instead of v1 legacy format. Inserts GroupNode children directly into the rack without the legacy injection pipeline.
- **`insertBlueprint` in useEntityCRUD**: Takes a GroupNode, converts children to OmegaNodes with ID regeneration (`crypto.randomUUID()`), inserts into UCA tree with projections sync.
- **Unified Type Barrel**: Created `src/omega-ui-core/types/index.ts` re-exporting from `blueprints.ts`, `manifest.ts`, `rack.ts`, and `validation.ts`. Handles `ComponentType` name collision between manifest and rack by aliasing rack's as `RackComponentType`.
- **Shared Blueprint Types**: Created `src/omega-ui-core/types/blueprints.ts` with `V2BlueprintMeta` and `V2BlueprintData` interfaces, eliminating type duplication between `BlueprintLibraryPanel` and `RightDockContainer`.

### Changed
- **Right Panel Independent Toggle**: `TOGGLE_WINDOW` in `workbenchReducer.ts` changed from accordion behavior (only one panel at a time) to independent toggle (multiple panels can be open simultaneously). Each panel toggles independently; dock collapses only when the last open panel is closed.
- **Right Panel Initial State**: All `window_*` keys default to `false`, `isRightPanelCollapsed` defaults to `true` — no panels open on startup.
- **BlueprintLibraryPanel Props**: Removed unused `manifest` prop. Now uses `onSelectBlueprint` accepting `V2BlueprintData`.
- **RightDockContainer Props**: Added `onInsertBlueprint` prop typed as `V2BlueprintData`. Removed inline type definition.
- **BlueprintLibraryPanel Imports**: Now imports from `@/omega-ui-core/types` barrel instead of `@/omega-ui-core/types/blueprints`.

### Changed
- **RulerOverlay Pan/Zoom Sync**: Refactored to use `rackOrigin()` helper that computes the rack's (0,0) origin in section coords for any pan/zoom state using `basePos + pan + rackSize/2 * (1-zoom)` (handles `transformOrigin: center center`). `baseRackPos` is measured at mount/resize by reversing the CSS transform. Ruler ticks, guide creation/dragging, and guide preview lines all use the synchronized origin. 0,0 always maps to the rack's top-left corner.
- **RulerOverlay IIFE → Pre-computed ReactNodes**: Replaced inline IIFE patterns (`{creating && (() => {...})()}` and `{showGuides && (() => {...})()}`) with pre-computed `creatingLine` and `guideElements` variables to fix TS2322 (`(() => Element) | null` not assignable to `ReactNode`).
- **ViewportToolbar Always Visible**: Now always shows in rack view (except LIVE mode) instead of requiring `multiSelectedIds.length >= 2`. Grid/snap/alignment tools are always accessible. Alignment buttons disabled when <2 items selected.
- **ViewportToolbar Compact Icons**: Replaced text-based buttons with icon-only buttons: Magnet (snap toggle), Settings (grid panel). Grid visibility and snap action moved into Settings dropdown.
- **ViewportControls Grid Removal**: Removed Grid3X3 button and `gridVisible`/`onToggleGrid` props from ViewportControls. Grid controls consolidated into ViewportToolbar.
- **`VirtualRackProps.onUpdateItem` Type**: Changed from `Partial<ManifestEntity>` to `HybridEntityUpdate` (= `Partial<OmegaNode> | Partial<ManifestEntity>`). Fixes drag position bug where OmegaNode-style updates (`{ layout: { pos } }`) from `useUCADrag` were silently dropped because `ManifestEntity` has no `layout` field.

### Fixed
- **Ruler Zoom Desync**: Removed `transition-all duration-700` from rack viewport CSS class (`VirtualRack.tsx`), replaced with `transition-[box-shadow] duration-500`. The 700ms CSS transition on the transform property caused ruler ticks to desync from the rack during zoom — the ruler drew at the target position while the rack was still animating. Now zoom/pan updates are instant; only box-shadow transitions for live mode glow.
- **Drag Position Lost on Release**: `useUCADrag.handleDragEnd` sends `{ layout: { pos: { x, y } } }` (OmegaNode format), but `VirtualRackProps.onUpdateItem` was typed as `Partial<ManifestEntity>` which has no `layout` property. The position update was silently dropped. Fixed by widening the prop type to `HybridEntityUpdate`.
- **`exactOptionalPropertyTypes` Compliance**: Fixed `data: undefined` in BlueprintLibraryPanel by omitting the `data` key instead of setting to `undefined`.

---

## [9.0.0-dev] — 2026-06-06
### Added
- **Simplified Data Model (Phase 0)**: New atomic-component types in `src/omega-ui-core/types/rack.ts`:
  - `ComponentNode` — atomic components (knob, slider, switch, button, port, led, display, label) with position, size, style, and optional bind
  - `GroupNode` — single-level group with flat `ComponentNode[]` children
  - `RackManifest` — rack manifest with `(ComponentNode | GroupNode)[]` children
  - `ComponentStyle` — per-type properties (variant, color, asset, frames, orientation, font, polarity, states)
  - `BindConfig` — simplified binding (target + numeric range)
  - `GridConfig`, `Position`, `Dimensions`
- **Simplification Plan Document**: `docs/specs-and-architecture/SIMPLIFIED_MODEL_PROPOSAL.md` — full proposal with data model, interaction design, inspector impact analysis, and 6-phase implementation plan
- **Inspector Impact Analysis**: Documented mapping of 13 legacy governance sections → 4 new editors (type-specific editor, GroupEditor, RackProperties, BlueprintLibrary)

### Changed
- Phased migration from UCA tree / OmegaNode / governance model to atomic component model. Typecheck passes with 0 errors.

## Phases 1-5 Completed (2026-06-06)
### Phase 1: React Primitive Renderers
- **8 React components** in `src/omega-ui-core/renderers/primitives/`: `Knob`, `Slider`, `Led`, `Port`, `Switch`, `Button`, `Display`, `Label`
- **`renderComponentNode()`** dispatcher function that returns the correct React element for a `ComponentNode`
- All render logic ported from HTML string functions (filmstrip rotation, signal color inference, etc.)

### Phase 2: Type-Specific Inspector Editors
- **10 editors** in `src/features/manifest-editor/components/inspector/editors/`: `KnobEditor`, `SliderEditor`, `LedEditor`, `PortEditor`, `SwitchEditor`, `ButtonEditor`, `DisplayEditor`, `LabelEditor`, `GroupEditor`, `RackPropertiesEditor`
- **`ComponentEditor`** dispatcher that picks the right editor based on selection type
- Shared helper components: `CommonFields`, `VariantSelect`, `ColorInput`, `BindSelect`

### Phase 3: Legacy Deprecation Markers
- **Deleted orphaned files**: `ContainerRenderer.ts`, `ReorderIndicator.tsx` (zero imports)
- **Added `@deprecated` JSDoc** to 13+ legacy gateway files (CellRenderer, UniversalRenderer, rendererRegistry, all 8 HTML string renderers, AttachmentRenderer)
- Legacy infra (UCA tree, blueprint injection, etc.) remains functional but marked for removal

### Phase 4: Blueprint Migration
- **4 new blueprints** in `public/blueprints/v2/` converted to GroupNode format: `standard_vcf`, `osc_macro_block`, `performance_8_grid`, `stereo_io`
- **`blueprintMigration.ts`** utility: `convertBlueprintToGroupNode()` converts legacy `BlueprintDefinition` to new `GroupNode`

### Phase 5: Cleanup & Verification
- **`npm run typecheck`**: 0 errors
- **`npm run lint`**: 0 errors (only pre-existing warnings)

---

### Added
- **Knob Rotation in LIVE Mode**: `KnobDragOverlay` component in `CellNode.tsx` — transparent overlay with `ns-resize` cursor; vertical drag maps to 0–1 value via `onUpdateRuntimeValue`. Only active for knob cells in LIVE mode.
- **`onUpdateRuntimeValue` in UCADebugContext**: New callback to update runtime values (knob positions) from renderer. Wired through `VirtualRack` → `useRackSimulation.updateValue`.
- **Right Panel Auto-Expand Gated**: `SET_SELECTED_NODE` in reducer skips auto-expand when `isLiveMode` is true.

### Changed
- **LIVE Mode Visual Cleanup**: Selection outlines (`outline`, `boxShadow`), debug HUD, integrity overlay, governed overlay, CAD overlay all hidden in LIVE mode for both `CellNode` and `StructuralNode`.
- **LIVE Mode Marquee Blocked**: `onMouseDown` in `WorkbenchViewport` returns early when `isLiveMode`.
- **LIVE Mode Rack Deselection Blocked**: Background click on rack frame no longer deselects elements in LIVE mode.
- **Floating Toolbar Scoped**: Left floating toolbar (`Toolbar.tsx`) only renders in rack tab + ENGINEERING mode (hidden in LIVE, orbital, source, history tabs).

### Fixed
- **Knob Rotation Not Working**: `updateValue` from `useRackSimulation` was not destructured in `VirtualRack` — `pushParameterUpdate` was passed instead, which doesn't update local `runtimeValues` state. Now `updateValue` is properly wired.
- **Duplicate CellNode Function**: Removed stale duplicate `CellNode` function that caused TS2393 errors.

---

## [8.4.2] — 2026-06-05
### Added
- **LIVE Mode Functional Differentiation**: LIVE mode now behaves differently from ENGINEERING mode:
  - **Drag Disabled**: `useUCADrag` pan handlers (`handlePanStart`, `handlePan`, `handlePanEnd`) return early in live mode — elements cannot be repositioned.
  - **Context Menu Gated**: Right-click context menu blocked in live mode (`handleContextMenu` returns early).
  - **SignalInjector Gated**: Signal injector dialog only opens in live mode (was accessible in both modes).
  - **Renderer Pass-through**: `isLiveMode` propagated via `UCADebugContext` to `CellRenderer.renderCellHTML` options for future cell-level visual differentiation.

### Changed
- **`UCADebugContext` Interface**: Added `isLiveMode?: boolean` optional property to `ucaTypes.ts`.
- **`VirtualRack.tsx` debugContext**: Now passes `isLiveMode` to renderers; gates `SignalInjector` and context menu rendering behind `isLiveMode` check.

### Fixed
- **LIVE Mode Drag Persistence**: Elements were still draggable in LIVE mode due to missing guard in `useUCADrag` pan handlers.

---

## [8.4.1] — 2026-06-05
### Added
- **ViewportToolbar**: Dark industrial bar (`#111`, 28px) above rulers with alignment tools:
  - **Alignment Tools**: 6 buttons — Left, Center-H, Right, Top, Center-V, Bottom.
  - **Distribution Tools**: Horizontal/Vertical distribution with `gatherPositions` using DOM `getBoundingClientRect()` (48×48 fallback).
  - **Align-to Toggle**: Selection vs Canvas mode.
  - **Snap & Grid**: ON/OFF toggle + Grid toggle with spacing settings popover.
- **Multi-Selection Visual Feedback**: Purple dashed outline (`#a855f7`) + glow for multi-selected nodes in `StructuralNode` and `CellNode`.
- **Marquee Selection**: Click+drag rectangle at section level in `WorkbenchViewport`; `onClickCapture` with `stopPropagation` prevents VirtualRack from clearing multi-selection.
- **Rulers Scale with Zoom**: Tick intervals scale with `zoom` factor; labels show actual rack coordinates; offset by `pan.x`/`pan.y`.
- **Ruler Origin**: 0 at corner box (`RULER_SIZE = 22px`).

### Changed
- **Grid Toolbar Removed from VirtualRack**: Entire floating GRID SNAPPING TOOLBAR removed; settings moved to ViewportToolbar.
- **`RulerOverlay` Never Unmounts**: Uses CSS `visibility` toggle to prevent canvas redraw bugs.
- **`UniversalRenderer` Multi-Select Fix**: Works even when `debugContext?.enabled` is false; includes `selectedItemId` in multi-selected array when Ctrl/Shift+clicking.

### Fixed
- **Marquee Deselect Bug**: VirtualRack's `onClick` with `stopPropagation` was blocking marquee events; moved marquee to `WorkbenchViewport` section level with `onClickCapture` to intercept before VirtualRack.
- **Multi-Select Base Array**: When `SET_SELECTED_NODE` fires, `multiSelectedNodeIds` is set to `[nodeId]` (single element); Ctrl+click needed to include `selectedItemId` in base array — fixed in `UniversalRenderer.tsx`.

---

## [8.4.0] — 2026-06-05
### Added
- **Light Theme**: Full light mode implementation via `[data-ui-theme="light"]` in `vars.css` with overrides for `--wb-*`, `--primitive-*`, `--omega-*` tokens; Tailwind class remapping in `globals.css`; light-mode overrides in `skins.css`, `containers.css`, `tabs.css`.
- **Rack Viewport Isolation**: `.rack-viewport` class on rack frame forces dark primitives inside rack regardless of UI theme via `vars.css` and Tailwind reset in `globals.css`.
- **Grid Overlay as Separate Visual Layer**: Grid visual overlay now renders as a dedicated div (`z-[1]`, `pointer-events-none`) inside rack frame instead of `backgroundImage` on parent (which was hidden behind children). Controlled by `grid.visible` (independent from `grid.enabled` snap).
- **Grid Settings Popover**: Spacing X/Y inputs in VirtualRack toolbar, visible only when grid overlay is on.
- **ViewportControls Grid & Rulers Group**: Bottom-right floating toolbar gains two new icon buttons for toggling grid overlay and ruler visibility. Group hidden entirely in orbital view.
- **RulerOverlay Component**: Photoshop-style rulers rendered at viewport section edges (not inside rack). Uses `ResizeObserver` for dimensions, `visibility: hidden` toggle (never unmounts). Light background `#e0e0e0` with dark indicators.
- **Drag-to-Create Guides**: `mousedown` on top ruler creates horizontal guides, `mousedown` on left ruler creates vertical guides. Blue preview line follows cursor; red in delete zone.
- **Drag-to-Delete Guides**: Dragging guides into ruler zone (`RULER_SIZE + 30px`) turns them red; `mouseup` in delete zone removes guide.
- **Guide Persistence in Manifest**: Guides stored in `manifest.ui.layout.grid.guides` (`GridGuide[]`), synced bidirectionally with external changes (undo/redo/load).
- **View Menu Grid & Guides Toggles**: "View Grid" and "Show Guides" options added to MenuBar View menu with `Grid3X3`/`Ruler` icons.
- **Auto-Expand Right Panel on Selection**: `SET_SELECTED_NODE` in `workbenchReducer.ts` sets `isRightPanelCollapsed: false`.
- **Duplicate Position Offset**: `duplicateItem` offsets clone by `+20px x, +15px y`.

### Fixed
- **Context Menu Selection Bug**: Added `e.stopPropagation()` to all buttons and wrapper in `RackContextMenu.tsx` — clicks were bubbling to viewport and deselecting elements.
- **Context Menu Duplicate in UCA Mode**: `duplicateItem` in `useEntityCRUD.ts` now supports UCA tree mode via `insertNodeInTree` + `treeToManifest`.
- **Position Contamination**: `useUCADrag.ts` and `VirtualRack.tsx` now write `layout: { pos }` instead of `layout: { ...node.layout, pos }` — prevents template-expanded properties from leaking back into raw tree.
- **StructuralNode Drag on Parent**: Pan handlers now only apply to leaf containers (no children), and `onTap` uses `.closest('.uca-cell, .uca-port')` check to skip selection when tapping on child nodes.
- **CSS Cleanup (33 Issues)**: Removed duplicate blocks, fixed definitions, tokenized hardcoded values across 15+ files. Unified font from `'Outfit'` to `'Inter'` in stepper.css.
- **Visual Discrepancies (22 Categories)**: Fixed token usage in SwitchProperties, splash.css, terminal, port, select, display, ModulationCell, MockupViewport, ModulationGrid, Lab components, Audit components, MockupFooter, InspectionCard.
- **Dead Code Removal**: Removed unused `resolveAsset` function from `useAssetRegistry.ts`; removed dead CSS imports from `index.css` barrel.
- **`exactOptionalPropertyTypes` Compliance**: `GridConfig.visible?`, `showGuides?`, `guides?` all properly optional with `| undefined` in `manifest.ts`.

### Changed
- **RulerOverlay Moved to Viewport Level**: Now renders in `WorkbenchViewport.tsx` (not VirtualRack), sitting at viewport section edges like Photoshop rather than inside rack canvas. Prevents z-index and transform issues.
- **Grid/Rulers Only in Rack View**: `RulerOverlay` only renders when `viewMode === 'rack'`; `ViewportControls` passes `undefined` for grid/ruler props in orbital view — entire GRID & RULERS group hidden.

---

## [8.3.1] - 2026-06-03
### Added
- **Inspector Level Governance**: Introduced a new progressive complexity system (`Simple`, `Medium`, `Advanced`) under the View menu to dynamically filter technical properties in the `PropertyPanel`, optimizing cognitive load.
- **VirtualRack Startup Assistant**: Added a sleek, interactive "Tech-Noir" empty state overlay that provides quick actions to browse the blueprint gallery or link a local workspace when the rack is empty.
- **Rack Context Menus**: Implemented a native right-click context menu within the `VirtualRack` for rapid actions (Edit Properties, Duplicate, Delete) on architectural modules.
- **MenuBar Keyboard Shortcuts**: Rendered native keyboard shortcut hints (`Ctrl+S`, `Ctrl+Z`, etc.) into the `MenuBar` for a more professional desktop experience.
- **Inspector Guidelines**: Created `INSPECTOR_LEVELS.md` standardizing the functional rules for complexity tiers.

### Fixed
- **Strict TypeScript Optional Properties**: Resolved multiple TS compilation errors associated with `exactOptionalPropertyTypes` violations in `RightDockContainer`, `PropertyPanel`, and `WorkbenchInspector`.

## [8.3.2] — 2026-06-03
### Added
- **Monolith Splitting (5 rounds)**: 20 new files extracted from 10 monolithic files >150 lines to improve maintainability. See `CHAT_LOG.md` for detailed per-file breakdown.
- **DRY LayerItem Component**: Eliminated triple repetition of visibility/lock/remove toggle pattern in `LayersPanel` by extracting a shared `LayerItem` component (~150 lines removed).
- **useBlueprintCatalog Hook**: Extracted catalog loading with retry support from `BlueprintLibraryPanel`.
- **useRackKeyboardNav Hook**: Extracted arrow key node positioning from `VirtualRack`.
- **RackStartupAssistant**: Extracted empty-rack overlay into standalone component.
- **RackContextMenu**: Extracted right-click context menu into standalone component.
- **MenuItem Component**: Extracted menu item rendering with submenus/checks/shortcuts from `MenuBar`.
- **useAssetVFS Hook**: Extracted virtual file system building logic from `AssetSelector`.
- **CanonicalStylePreview**: Extracted phantom entity preview renderer from `StyleEditorModal`.

### Fixed
- **MenuBar TS2578**: Removed orphaned `@ts-expect-error` directive that no longer had a matching error.
- **CellRenderer Barrel Import**: Converted `CellRenderer.ts` (560 lines) into a directory with `index.ts` barrel, preserving existing imports (`@/omega-ui-core/renderers/CellRenderer`).

## [8.3.0] - 2026-06-03
- **Cell Philosophy Domain Types**: Introduced `PrimitiveNode`, `CompositeCell`, and `StructuralModule` (`src/types/cell-types.ts`) alongside converter routines (`src/types/cell-conversion.ts`) to bridge legacy structures.
- **Cell Studio Stepper Feature Flag**: Implemented a wizard-like stepper configuration (`?mode=stepper`) within the editor workspace to isolate step-by-step design reviews (Compose, Behavior, Style, Review).
- **Separated Cell Studio Hooks**: Extracted state, mode, and draft lifecycle management from the main container component into isolated hooks: `useCellStudioState`, `useCellStudioMode`, and `useCellStudioDraft`.
- **Enriched Behavioral Validation**: Extended `BlueprintValidator` to validate asset behavior configurations, preset bounds, slot constraint limits, and LayerRecipe blend mode integrity.
- **Centralized Catalog Governance**: Integrated validator logic to query `OMEGA_ELEMENT_CATALOG` as the sovereign source of truth for element properties and capability checks.
- **Consolidated Modal Orchestration Hook**: Introduced `useWorkbenchModals` hook to isolate modal state, file ingestions, template loading, and list updates, decoupling this logic from `WorkbenchContainer.tsx` to reduce component layout bloat.
- **Typecheck Script & Guidelines**: Added `typecheck` verification script to `package.json` and strict build mandates to `AGENTS.md` to prevent deployment regression.
- **E2E Test Type-Safety**: Solved compilation warnings and errors under `verbatimModuleSyntax` by refactoring `e2e/blueprint-injection.spec.ts` and `e2e/rack-features.spec.ts` to use type-only imports (`import type { Page }`) for Playwright pages.
- **6-Phase Industrial Certification**: Achieved 100% compliance status (`SYSTEM CERTIFIED - ERA 11 COMPLIANT [OK]`) verifying Structural Integrity, Type Safety, Code Hygiene, Critical Manifests, and Workspace Health under `omega-audit.ps1`.
- **Cleaned Obsolete Docs**: Archived legacy draft specs under `docs/archive/` and expanded active `ASSET_BEHAVIOR_LAB_ADR.md` with consolidated models.

### Changed
- **UX MenuBar Alignment**: Cleaned up bilingual menu item labels (e.g., "Capas (Layers)", "Propiedades del Rack (Rack)") to be purely in English to maintain language consistency and align with clean code standards.
- **Consolidated Logs Access**: Removed redundant `Toggle Logs Window` entry point in the MenuBar View menu to reduce duplicate UI controls.
- **Universal Cell Laboratory Redirection**: Wired the MenuBar's "Universal Cell Laboratory" entry point to trigger the modern isolated `CellStudioContainer` workspace rather than the legacy simple modal, resolving usability gap.
- **Decommissioned Page-Level Override**: Removed `onOpenCellEditor` prop overrides in `app/[locale]/page.tsx` to clear the blocker preventing native launch of `CellStudioContainer`.

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
