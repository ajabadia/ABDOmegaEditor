# OMEGA Manifest Editor - Project Roadmap

Este documento centraliza los hitos de desarrollo a corto y mediano plazo para el editor de manifiestos OMEGA.

---

## 🎯 Hitos Completados

### Era 9.3.x — Alignment, Ghost Preview & Shortcuts
- [x] **Fix: Botones de alineación no funcionaban:** Causa raíz: `ViewportToolbar` no tenía el atributo `data-toolbar`, por lo que el `onMouseDown` del viewport no ignoraba clicks en la toolbar, iniciaba drag-to-pan, y al soltar ejecutaba `onSelectItem(null)` borrando la selección. Fix: 1 línea (`data-toolbar` en el div principal).
- [x] **Alignment Ghost Preview:** Nuevo `AlignGhostOverlay.tsx` que renderiza rectángulos fantasma (borde dashed cyan) en las posiciones proyectadas al hacer hover sobre botones de alineación. Datos computados en `ViewportToolbar` y renderizados dentro del rack-viewport vía `WorkbenchViewport` → `VirtualRack`.
- [x] **Keyboard Shortcuts de Alineación:** Atajos Ctrl+Shift+L/H/R/T/M/B/D/V para los 8 tipos de alineación/distribución. Tooltips actualizados en cada botón para mostrar el shortcut.

### Era 9.2.x — Container Format & JUCE Pipeline
- [x] **Desmantelamiento de GlobalGovernanceModal (Era 8.1):** Unificación de la gobernación estética en `Globals` del dock derecho.
- [x] **Sistema de Agrupación Avanzado de Capas (Fase 1):** Multi-selección, agrupación, group-down, duplicación recursiva, ungroup.
- [x] **Exportación a Blueprints de Usuario (Fase 3 - Parcial):** Empaquetado en moduleTemplates, galería, exportación .acepack.
- [x] **Ghost Preview Overlay Interactivo (Fase 2):** Capa fantasma translúcida para inyección de blueprints.
- [x] **Formato .omega (Contenedor Autocontenido):** `projectPackager.ts` con package/unpackage. ZIP con manifest, history, project.json, resources/, WASM.
- [x] **Exportación a OMEGA Module Rack:** distillManifest + JSZip.
- [x] **Carga de .omega por menú y drag-and-drop:** Ctrl+O, drop zone overlay con restauración completa.
- [x] **Ctrl+S → OmegaPack:** Asociado a exportOmegaPack().
- [x] **Migración Inversa (upgradeDistilled.ts):** isDistilledManifest + upgradeDistilledToWork.
- [x] **Post-procesado JUCE 8 (distillForJUCE.ts):** Aplanado de árbol UCA, resolución de layouts, mapeo asset://.
- [x] **E2E Tests (.omega + Distilled JSON):** 10 tests total, 2 fixtures.
- [x] **Validación de esquema (manifestValidator.ts):** validateManifestSchema con errores descriptivos.
- [x] **Simulaciones Dinámicas (Dry-Run):** useRackSimulation, useSimulationBridge, SimulationStatusBadge, SignalInjector, inputSignalService.
- [x] **Panel de Layers Jerárquico:** Árbol expandible, búsqueda, multi-selección, drag & drop, rename inline, context menu, visibility/lock, quick add, Alt+▲/▼.
- [x] **Grupos Compositivos (SynthEdit-style):** GroupEditor, flujo group/ungroup, exportación .acepack.

### Era 9.3.0 — Refactors & Unit Tests
- [x] **Batch Actions + Notifications:** Group/Ungroup con batch notifications, fade-out, historial persistente en localStorage.
- [x] **Refactor a Hooks (x10):** useBatchHistory, useLayerFilters, useRackSections, useTabDiagnostics, useEntityCrud, useExportOperations, useBatchUngroup, useFileDrop, useCellBlueprint, useGroupBlueprint. ~230 líneas de lógica inline removidas de WorkbenchContainer.
- [x] **Unit Tests:** 136 tests en 10 suites. Todos pasando. Cobertura de auto-dismiss, filtros, export, batch, blueprints.
- [x] **manifestToTree fallback removal:** Eliminado el patrón legacy en 13 archivos.

---

---

## 🎯 Hitos Completados (Post-Roadmap Original)

### Era 9.3.2 — Bug Hunting & Stability
- [x] **Blueprint injection regression:** `handleSelectBlueprintFromPanel` now injects directly via `editor.applyTemplate()` instead of ghost preview mode.
- [x] **RackStartupAssistant overlay not dismissing:** Gate reinforced with `allElements.length > 0` fallback in `VirtualRack.tsx`.
- [x] **Submenu shortcuts not rendering:** `MenuBar.tsx` submenu items now display keyboard shortcuts (Ctrl+O, Ctrl+S, etc.).
- [x] **Framer-motion onClick suppression:** `CellNode.tsx` and `StructuralNode.tsx` select on `onPointerDown` before framer-motion's pan gesture consumes the event.
- [x] **E2E tests flakiness:** Dynamic import → top-level import; `button:has-text()` for robust selectors.
- [x] **Alt+Click Ghost Preview:** BlueprintLibraryPanel supports Alt+Click for positionable injection before placement.
- [x] **Tooltip on blueprint items:** Hover shows "Click to inject · Alt+Click for ghost preview".
- [x] **E2E Suite:** 31/32 tests passing (1 infra flake).

### R1a — LayersPanel UX: Indicadores Visuales ✅
> All 4 items verified in code
- [x] **Colores por categoría de nodo:** `NODE_TYPE_COLORS` constant — knob=orange, port=cyan, slider=green, display=purple, container=blue, label=gray, switch=yellow, button=pink.
- [x] **Badge de cantidad de hijos:** `childCount` rendered as numeric badge with color-coded background/border on container/group nodes.
- [x] **Íconos mejorados:** `getNodeIcon()` maps cellRef/kind to specific lucide-react icons (Disc, Radio, Sliders, Tv, ToggleLeft, Volume2, etc.).
- [x] **Barra de progreso de filtros:** `filterProgress` bar with green/yellow/red gradient depending on visible percentage.

### R1b — LayersPanel UX: Ghost Preview Drag & Drop ✅
> All 3 items verified in code
- [x] **Vista previa fantasma al arrastrar:** `dragGhost` state + `motion.div` overlay that follows cursor with blur+glow styling.
- [x] **Animaciones de reordenación:** `AnimatePresence` + `motion.div` with `layout` prop for smooth transitions on reorder.
- [x] **Feedback de zona de soltado mejorado:** Glow indicators (top/bottom) with gradient + boxShadow instead of static lines.

### R1c — LayersPanel UX: Filtros por Propiedades ✅
> All 3 items verified in code
- [x] **Filtro por binding/value:** `propertySearchTerm` searches `bind`, `meta.value`, `meta.min`, `meta.max`, `meta.default`, `meta.step`.
- [x] **Filtro por estado de auditoría:** `showAuditIssues` toggle hides/shows nodes with audit warnings (via `auditNodeIds`).
- [x] **Filtro por plantilla:** `showTemplates` toggle filters nodes with `templateRef`.

### R2 — Simulaciones Dinámicas Extendidas ✅
> All 5 items verified in code — SignalInjector+inputSignalService now support 10 wave types
- [x] **Más tipos de onda:** `inputSignalService.ts` supports sine, square, saw, triangle, noise, pulse, pwm, adsr, sample_hold, sequencer, random_correlated (11 types).
- [x] **Comportamientos complejos:** Slew rate/portamento (`slewRate`), quantization (`steps`), cross-modulation, non-linear response curves.
- [x] **Visualización:** `SimulationScope.tsx` — real-time oscilloscope-style waveform visualization using canvas.
- [x] **Persistencia:** `inputSignalService.serializeState()`/`.deserializeState()` saved in `.omega` project files.
- [x] **Routing visual:** `ModulationLines.tsx` — animated SVG lines showing which parameters are modulated by active LFO/signals.

### R3 — Grupos Compositivos → Blueprints ✅
> All 5 items verified in code
- [x] **Parámetros expuestos:** `ExposeParametersDialog.tsx` + `useGroupBlueprint` with `ExposedParam[]` → `BlueprintPlaceholder[]`.
- [x] **Preview de blueprint:** `BlueprintPromptDialog.tsx` — form generator for placeholder customization before injection.
- [x] **Nested groups:** `TreeNode` recursive component handles arbitrary nesting depth; `useGroupBlueprint` supports group-within-group.
- [x] **Versioning:** Auto-increment version on re-save in `useGroupBlueprint.ts` (line 191-200).
- [x] **Edición post-inyección:** `GroupEditor` re-openable from inspector when selecting an injected group.

### Tech Debt & Limpieza ✅
> All 4 items verified in code
- [x] **Timer Tests:** `useBatchHistory.spec.ts` covers `setTimeout`/`clearTimeout` with auto-dismiss testing.
- [x] **Eliminación de console.log:** No stale alignment/ghost debug logs found in source.
- [x] **Consolidar constantes de shortcuts:** `alignmentConstants.ts` contains `SHORTCUT_TO_ALIGN`, `SHORTCUT_LABELS`, `GHOST_TYPE_MAP`.
- [x] **Refactor ViewportToolbar:** `useAlignment.ts` hook extracted with `gatherPositions`, `computeAlignedPositions`, `applyPositionBatch`.

---

### Era 9.6.0 — Visual Modulation Matrix + Virtual Scrolling
- [x] **Visual Modulation Matrix:** `VisualModulationMatrix.tsx` — SVG drag-and-drop matrix replacing `ModulationGrid` modal. Bezier connections color-coded by type, ghost preview, scroll-wheel amount adjustment.
- [x] **Virtual Scrolling LayersPanel:** `react-window@2.0.0-dev.1` — `List` + `rowComponent` for +1000 node tree performance. Container-level DnD, expand/collapse preserved.
- [x] **SVG Coordinate Fix:** Links positions now subtract `sidebarWidth`/`headerHeight` offset (found during code review).
- [x] **Virtual Scrolling TS Fixes:** 9 type errors fixed (useListRef, FilterParams interface, HistoryEntry import, removed height/width from List).

### Era 9.6.1 — Ctrl+Shift+E Shortcut + LayersPanel Fix + Unit Tests
- [x] **Ctrl+Shift+E Shortcut for CellStudio:** `useWorkbenchShortcuts.ts` — new `onOpenCellStudio` parameter. Handler guarded by `!isInputFocused()`. MenuBar now shows `shortcut: 'Ctrl+Shift+E'` instead of `highlight: 'deprecated'`.
- [x] **LayersPanel TypeScript Fix:** Pre-existing `boolean | undefined` from optional chaining in `propOk`. Wrapped return in `!!()` coercion.
- [x] **Unit Tests for Shortcuts:** `useWorkbenchShortcuts.spec.ts` — 19 tests: Ctrl+Shift+E dispatch, Meta+Shift+E (macOS), case insensitivity, all `isInputFocused()` guards (input, textarea, select, contenteditable, monaco direct + child), preventDefault, cleanup, coexistence with Ctrl+S/Z/G.
- [x] **Full typecheck passing:** `npx tsc --noEmit` → 0 errors. `npx jest` → 19/19 passed.

---

## 🚀 Próximos Pasos Reales

Todas las fases de refinamiento del roadmap original (R1a, R1b, R1c, R2, R3, Tech Debt) y las features v9.6.x están **completamente implementadas**.

### Estado de las Opciones Anteriores
| Opción | Estado |
|:-------|:------:|
| ~~Reconectar CellStudioContainer~~ | ✅ **Verificado: ya conectado** — Toolbar (botón CPU) y MenuBar (Edit > Universal Cell Laboratory, Ctrl+Shift+E) abren CellStudio. `ui_features_inventory.md` estaba desactualizado. |
| ~~Modulación Matrix Visual~~ | ✅ **Completado en v9.6.0** — `VisualModulationMatrix.tsx` |
| ~~Virtual Scrolling LayersPanel~~ | ✅ **Completado en v9.6.0** — `react-window` |
| ~~Testing: Shortcuts~~ | ✅ **Completado en v9.6.1** — 19 tests en `useWorkbenchShortcuts.spec.ts` |

### Próximas Direcciones Posibles

### Opción A: Internacionalización (i18n)
- Traducir UI a múltiples idiomas
- **Esfuerzo:** 🔴 Grande
- **Impacto:** 🟡 Medio

### Opción B: Testing & Calidad
- Completar cobertura de tests para VisualModulationMatrix y VirtualScrolling LayersPanel
- E2E tests más robustos con retry logic
- **Esfuerzo:** 🟡 Medio
- **Impacto:** 🟢 Alto

### Opción C: Cleanup de deprecated tags en MenuBar
- Quitar `highlight: 'deprecated'` de Link Workspace, Blueprints, Deploy, Compliance Report
- **Esfuerzo:** 🟢 Pequeño
- **Impacto:** 🟡 Medio
