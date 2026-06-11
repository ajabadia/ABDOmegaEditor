# ABDOmegaEditor — Chat Log

## Sesión: Self-Contained Manifest Design & Implementation

### Fecha: 2026-06-11

### Fase 1: Diseño del Modelo (Completado)
- Diseño completo del modelo Self-Contained Manifest documentado en `SELF_CONTAINED_MANIFEST.md`
- Auditoría de fugas (5 categorías) documentada en `docs/leak_audit_results.md`
- Filosofía: manifiesto 100% autocontenido, sin skins/temas para Omega (C++/JUCE)
- Colores globales por token en `manifest.ui.palette`
- Tamaños por token en `manifest.ui.sizes` (nuevo)
- Estilos por tipo de componente en `manifest.ui.styles[cellRef]` con variantes
- Dos modos de guardado: Trabajo (todo) y Definitivo (destilado)
- Blueprints autocontenidos con fusión de variantes y dedup de assets por SHA-256
- Assets deduplicados por hash, calculado al importar (no al guardar)
- Migración automática en memoria de manifiestos legacy
- Cadena de resolución de 4 niveles: nodo → styles → palette → OMEGA_THEMES → fallback hardcodeado

### Paso 1: Implementación de `ui.sizes` (Completado)

**Archivos modificados:**
| Archivo | Cambio |
|---------|--------|
| `src/omega-ui-core/types/manifest.ts` | Añadido `sizes?: Record<string, number> | undefined` a `OMEGA_Manifest['ui']` |
| `src/features/manifest-editor/hooks/useDesignTokens.ts` | Nueva función `resolveSize(sizeCode, fallback)` que busca en `manifest.ui.sizes` |
| `src/omega-ui-core/renderers/utils/CellMetrics.ts` | `getComponentRadius(node, manifest?)` ahora consulta `ui.sizes[size]` primero, con `RADIUS_MAP` como fallback legacy |
| `src/omega-ui-core/renderers/CellRenderer.ts` | Pasa `manifest` a `getComponentRadius(node, manifest)` |

**Verificación:** `npm run typecheck` → 0 errores ✅

### Paso 2: Resolvedor de 3 niveles — `resolveNodeStyle()` (Completado)

**Archivo creado:** `src/omega-ui-core/utils/StyleResolver.ts`
- `resolveNodeStyle(node, manifest)` — cadena variant → `ui.styles[cellRef]` → `ui.palette`
- `resolveSize(sizeCode, manifest, fallback)` — resuelve letras de tamaño a píxeles desde `ui.sizes`
- `resolveColor(color, manifest, fallback)` — helper sobre `ColorResolver.resolve()`

**Knob renderer migrado** (CellRenderer.ts): sustituido el gate `isCustom` por `resolveNodeStyle()`.

**Verificación:** `npm run typecheck` → 0 errores ✅

### Paso 3: Extender CellRenderer a todos los tipos (Completado)

**Cambios en CellRenderer.ts:**
- `renderCellHTML` usa `resolveNodeStyle()` en lugar de solo `ColorResolver.resolveStyle()`
- **port/led/display**: gates `isCustom` eliminados, usan `resolved.style` para colores/font
- **scope/terminal**: usan `resolveNodeStyle()` para `color`, `font`, `inherited*`
- **button/push/stepper/select**: usan `resolveNodeStyle()` para inherited font/size/color
- **label**: usa `props.style` (que viene de `resolveNodeStyle()` via renderCellHTML) con inherited props
- **slider-v/slider-h/switch**: ya reciben `style` mejorado via `...props` (slider/switch no necesitan más cambios)
- Gates `isCustom` eliminados completamente de CellRenderer.ts

**Archivos modificados:** `src/omega-ui-core/renderers/CellRenderer.ts`

**Verificación:** `npm run typecheck` → 0 errores ✅

### Paso 4: Eliminar gate `isCustom` en inspectores (Completado)

**Archivos modificados:**
| Archivo | Cambio |
|---------|--------|
| `IndustrialGovernanceConsole.tsx` | `isCustom` eliminado. Badge dinámico reemplazado por "Self-Contained Governance" estático. `isExpertMode={isCustom}` eliminado del Renderer. |
| `SliderProperties.tsx` | `isCustom` eliminado. `StyleLibraryLink` ahora visible siempre (sin gate `{isCustom &&}`). |
| `DisplayProperties.tsx` | `isCustom` eliminado. `StyleLibraryLink` visible siempre. Bloque de bloqueo `{!isCustom && ...}` eliminado. |

**Verificación:** `npm run typecheck` → 0 errores ✅

### Fix: Lint errors en CellStudioContainer (sessionStorage + as any)

**Problema:** La auditoría `omega-audit.ps1` falló en Fase 3 (ESLint) con 3 errores en `CellStudioContainer.tsx`:
1. `react-hooks/set-state-in-effect` — `useEffect` llamaba `setShowDraftPrompt(true)` sincrónicamente
2-3. `@typescript-eslint/no-explicit-any` — casts `as any` en `setBehavior` y `setRecipe`

**Soluciones:**
1. `useState(false)` + `useEffect` → `useState(() => hasDraft())` (lazy init)
2. `useCellStudioState.ts`: tipos `setBehavior`/`setRecipe` cambiados a `React.Dispatch<React.SetStateAction<...>>`
3. `CellStudioContainer.tsx`: casts `as any` eliminados

**Verificación:** `tsc --noEmit` → 0 errores ✅ | `eslint` → 0 errores en ambos archivos ✅

### Auditoría Industrial: SYSTEM CERTIFIED - ERA 11 COMPLIANT ✅

Ejecutada `omega-audit.ps1` para verificar el sistema completo:

| Fase | Estado |
|------|--------|
| 1/6 Structural Integrity (arch-guard) | ✅ PASSED |
| 2/6 Type Safety (TSC --noEmit) | ✅ PASSED |
| 3/6 Code Linting (ESLint) | ✅ PASSED |
| 4/6 Critical Manifests | ✅ PASSED |
| 5/6 Workspace Health | ✅ PASSED |
| **Certificación final** | **✅ SYSTEM CERTIFIED - ERA 11 COMPLIANT [OK]** |

---

## Sesión: UI Theme, Rack Fixes, Grid & Rulers

### 1. Light Theme Implementation
- **`vars.css`**: `[data-ui-theme="light"]` block with all `--wb-*`, `--primitive-*`, `--omega-*` tokens
- **`globals.css`**: Body gradient light, `--color-surface`, `--color-outline`, `.bg-black` override, Tailwind class remapping
- **`skins.css`**: Light-mode overrides for carbon, glass, industrial, minimal skins
- **`containers.css`**: Light-mode overrides for variant-inset and container-label-pill
- **`tabs.css`**: Light-mode overrides for module-tabs, tab-btn, tab-badge

### 2. Rack Viewport Isolation
- Added `.rack-viewport` class to rack frame in `VirtualRack.tsx`
- `vars.css` forces dark primitives inside `.rack-viewport`
- `globals.css` reset section prevents Tailwind class leaks into rack
- Rack components (knobs, sliders, terminal, scope, LED, ports) stay dark regardless of UI theme

### 3. Context Menu & Interaction Fixes
- **`RackContextMenu.tsx`**: Added `e.stopPropagation()` to all buttons (was the critical bug — clicks bubbled to viewport and deselected the element)
- **`useEntityCRUD.ts`**: `duplicateItem` supports UCA tree mode (`insertNodeInTree` + `treeToManifest`) with `+20px x, +15px y` offset
- **`workbenchReducer.ts`**: `SET_SELECTED_NODE` sets `isRightPanelCollapsed: false` when selecting while panel is collapsed

### 4. Position Contamination Fix
- **`useUCADrag.ts`** `handlePanEnd`: Writes `layout: { pos }` instead of `layout: { ...node.layout, pos }` — prevents template-expanded properties (mode, gap, etc.) from leaking back into the raw tree
- **`VirtualRack.tsx`** `handleSnapToGrid`: Same fix

### 5. StructuralNode Drag Fix
- Pan handlers (`onPanStart/onPan/onPanEnd`) only apply to leaf containers (no children)
- `onTap` uses `.closest('.uca-cell, .uca-port')` check to skip selection when tap originates from a child node

### 6. Grid System — Complete Overhaul

#### Types
- **`manifest.ts`**: `GridConfig` — `visible?`, `showGuides?`, `guides?: GridGuide[]` (all optional for `exactOptionalPropertyTypes`)
- **`spatialConstraints.ts`**: Matching local `GridConfig` type

#### Visual Grid Overlay
- Moved from `backgroundImage` on rack frame (behind children) to **separate div** (`z-[1]`, `pointer-events-none`) inside rack frame
- Color: `rgba(255, 210, 0, 0.35)` — yellow/amber visible on dark rack background
- Controlled by `grid.visible` (independent from `grid.enabled` / snap)

#### Grid Toolbar (VirtualRack.tsx)
- **Snap ON/OFF** toggle — controls `grid.enabled`
- **Grid** toggle — controls `grid.visible`
- **Settings popover** — spacing X/Y inputs, only visible when grid overlay is on

#### View Menu (MenuBar.tsx)
- "View Grid" toggle — mirrors grid toolbar button
- "Show Guides" toggle — enables ruler guides
- Added `Grid3X3`, `Ruler` imports

#### ViewportControls (bottom-right floating toolbar)
- New **GRID & RULERS** group with two icon buttons
- Grid button: amber glow when active, disabled in orbital view
- Rulers button: amber glow when active, disabled in orbital view
- Group hidden entirely when `onToggleGrid`/`onToggleRulers` are undefined (orbital view)

### 7. Rulers & Guides — Photoshop-Style

#### RulerOverlay Component (`RulerOverlay.tsx`)
- **Location**: Rendered in `WorkbenchViewport` (viewport edges), NOT inside rack
- **Style**: Light background `#e0e0e0`, dark indicators `#222`/`#777`, bold 8px labels
- **Corner box**: `#d0d0d0` with `#666` indicator dot
- **Canvas-rendered**: Uses `ResizeObserver` + `closest('section')` for dimensions
- **Never unmounts**: Uses `visibility: hidden` when disabled (avoids canvas redraw issues on remount)

#### Guide Creation — Drag from Ruler
- `mousedown` on **top ruler** → creates **horizontal guide** (follows Y cursor)
- `mousedown` on **left ruler** → creates **vertical guide** (follows X cursor)
- Preview line: blue `rgba(0, 180, 255, 0.7)`, red when in delete zone

#### Guide Deletion — Drag to Ruler
- Drag existing guide toward ruler zone (`RULER_SIZE + 30px`)
- Guide turns red `rgba(255, 80, 80, 0.8)` with glow when in delete zone
- `mouseup` in delete zone → guide removed
- `mouseup` outside → guide stays at new position

#### Guide Persistence
- Guides stored in `manifest.ui.layout.grid.guides` (`GridGuide[]`)
- Hydrated from manifest on mount: `useState(() => manifest.ui?.layout?.grid?.guides ?? [])`
- Synced from external changes (undo/redo/load) via `useEffect` with `lastManifestGuidesRef`
- Written back to manifest via `handleGuidesChange` → `updateManifest`
- Safe: WASM runtime and renderers don't read `grid.guides`

#### Guides Only in Rack View
- `RulerOverlay` only renders when `viewMode === 'rack'`
- Grid/ruler buttons disabled in orbital view
- When rulers hidden, guides hidden too (same `showGuides` flag)

### 8. Selection Highlight (Not a Bug)
- `StructuralNode.tsx:98`: `outline: 2px solid #00f2ff` with `outlineOffset: 4px` when node is selected
- `CellNode.tsx:89`: Same pattern with `outlineOffset: 2px`
- Large cyan rectangle = RACK_MASTER node selected (fills entire viewport)
- **Expected behavior** — selection indicator for root element

### 9. Source Tab Highlighting (Pre-existing)
- `SourceView.tsx:182-240`: Monaco decorations infrastructure already implemented
- Searches `"id": "selected-id"` in JSON, applies `.omega-source-selection-highlight`
- CSS: `background: rgba(0,240,255,0.08)`, `border-left: 2px solid #00f0ff`
- Auto-scroll via `revealRangeInCenterIfOutsideViewport`
- Full wiring: `selectedNodeId` → `WorkbenchContainer` → `WorkbenchPane` → `SourceView`

### 10. CSS Cleanup (33 Issues)
- Removed duplicate blocks, fixed definitions, tokenized hardcoded values
- Font consistency: stepper.css `'Outfit'` → `'Inter'`
- Dead `resolveAsset` function removed from `useAssetRegistry.ts`
- Dead CSS imports removed from `index.css` barrel

### 11. Visual Discrepancies Fixed (22 Categories)
- SwitchProperties, splash.css, terminal, port, select, display
- ModulationCell, MockupViewport, ModulationGrid
- Lab components, Audit components, MockupFooter, InspectionCard

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `omega-ui-core/tokens/vars.css` | Light theme tokens, `.rack-viewport` isolation |
| `omega-ui-core/tokens/skins.css` | Light-mode skin overrides |
| `omega-ui-core/tokens/signals.css` | Signal colors cleaned |
| `omega-ui-core/layout/containers.css` | Light-mode container overrides |
| `omega-ui-core/layout/tabs.css` | Light-mode tab overrides |
| `omega-ui-core/types/manifest.ts` | `GridConfig.visible?`, `showGuides?`, `guides?: GridGuide[]` |
| `omega-ui-core/uca/spatialConstraints.ts` | Matching GridConfig type |
| `omega-ui-core/renderers/components/StructuralNode.tsx` | Drag only on leaf containers, tap check via `.closest()` |
| `omega-ui-core/renderers/hooks/useUCADrag.ts` | Position writes only `layout: { pos }` |
| `app/globals.css` | Light theme body/surface/outline, Tailwind remapping, `.rack-viewport` reset |
| `viewport/VirtualRack.tsx` | Grid overlay div, toolbar split (Snap/Grid/Settings), default spacing 24 |
| `viewport/WorkbenchViewport.tsx` | RulerOverlay + guides persistence, grid/ruler toggles wired |
| `viewport/ViewportControls.tsx` | Grid/Rulers icon group, optional props for orbital disable |
| `viewport/RulerOverlay.tsx` | Full rewrite: drag-to-create, drag-to-delete, never-unmount, light colors |
| `viewport/RackContextMenu.tsx` | `e.stopPropagation()` on all buttons |
| `layout/MenuBar.tsx` | View Grid + Show Guides options, `Grid3X3`/`Ruler` imports |
| `hooks/entities/useEntityCRUD.ts` | `duplicateItem` with UCA support + position offset |
| `hooks/workbench/workbenchReducer.ts` | `SET_SELECTED_NODE` auto-expands right panel |

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `viewport/RulerOverlay.tsx` | Photoshop-style rulers + draggable guides |
| `docs/guides-and-standards/COLOR_ARCHITECTURE.md` | Color system documentation |
