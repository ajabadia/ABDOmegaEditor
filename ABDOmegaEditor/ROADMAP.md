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

### Era 9.8.0 — Mini-Map Avanzado: Filtros, Locked, Flotante + Drag & Drop
- [x] **Filtro por tipo de nodo en Mini-Map:** Dropdown con checkboxes para ocultar/mostrar tipos (cell, group, container, layer, rack, etc.). Colores por tipo con círculos de color en el dropdown.
- [x] **Indicador locked en Mini-Map:** Nodos bloqueados se renderizan con `opacity: 0.45` y overlay 🔒. Prop `lockedNodeIds` desde WorkbenchViewport.
- [x] **Persistencia localStorage:** Estado `hiddenKinds` sobrevive a recargas de página.
- [x] **URL query param sync:** `?hide=cell,group` compartible. URL tiene prioridad sobre localStorage en carga inicial.
- [x] **Botón Clear all filters:** Reset en el dropdown de tipos. Solo visible cuando hay filtros activos.
- [x] **Navigator flotante y arrastrable:** Posición cambiada de `bottom-[10px] left-[10px]` a `top-[40px] right-[10px]`. Panel arrastrable por el texto "Navigator" con `cursor-move`. Posición persistida en localStorage.
- [x] **Doble-click en Navigator:** Resetea la posición del panel a su estado inicial.
- [x] **Botón colapsado (EyeOff) arrastrable:** Misma lógica de drag que el texto Navigator. `transition-colors` en lugar de `transition-all` para evitar lag.
- [x] **Indicador visual de arrastre:** Glow cyan + ring en el panel (expandido y colapsado) mientras se arrastra. `isDraggingVisual` state sincronizado con drag start/stop.
- [x] **Botón Reset position en header:** Icono `RotateCcw` que resetea `panelOffset` a `{x:0, y:0}`.
- [x] **Snap a bordes:** El panel expandido se adhiere a bordes del viewport (threshold 8px) al arrastrar: left, right, top, bottom. Funciona también en esquinas (snap multi-eje simultáneo).
- [x] **Unit Tests (filtros):** 10 nuevos tests — render, toggle dropdown, color dots, filtrar/restaurar nodos, Clear all filters, accent styling.

### Era 9.4.0 — Command Palette (Ctrl+K)
- [x] **Command Palette (Ctrl+K):** Photoshop/VS Code-style fuzzy search palette. Search nodes by label/ID/kind, execute menu actions with visible shortcuts. Keyboard navigation (↑↓→Esc), Escape-to-clear, backdrop click to close.
- [x] **Ctrl+K Badge in Footer:** Visual keyboard shortcut indicator next to Undo Timeline button in the footer status bar.
- [x] **Command Palette Unit Tests:** 35 tests across 8 blocks — fuzzy search (prefix, subsequence, case-insensitive), keyboard navigation, empty state, edge cases. All passing.

### Era 9.3.3 — Mini-Map Clamping Fix, Toast System, Test Suite
- [x] **Mini-map top clamp fix:** `-80` → `-20` evita que el panel quede atascado detrás del toolbar.
- [x] **Snap visual indicator:** Amber glow (`ring-2 ring-accent/40`) cuando el panel se adhiere a bordes.
- [x] **Toast Notification System:** Sistema global de toasts con framer-motion (4 variantes). `ToastProvider`, `useToast`, `addLog` bridge.
- [x] **Clamp Constants Refactor:** Magic numbers reemplazados por `PANEL_CSS_TOP`, `PANEL_CSS_RIGHT`, `PANEL_CLAMP_TOP_MAX`, `PANEL_CLAMP_MIN_VISIBLE_LEFT`, `PANEL_CLAMP_MIN_VISIBLE_BOTTOM`.
- [x] **Top clamp limit indicator:** Cyan inset shadow en el panel cuando está en el límite superior.
- [x] **Collapsed mode clamp fix:** `handleHeaderMouseDown` usa `containerWidth`/`containerHeight` como fallback cuando `panelRef.current` es null.
- [x] **Exported positioning constants:** `PANEL_CSS_TOP` y `PANEL_CSS_RIGHT` exportados para verificación de consistencia.
- [x] **60 unit tests:** Cobertura completa de clamping en los 4 ejes (mount + drag), collapsed mode, limit indicator, constant-Tailwind consistency.

### Era 9.7.0 — Alignment Shortcuts UI/UX Audit & Proposals
- [x] **Alignment Shortcuts — Resolución Colisiones:** Ctrl+Shift+L/H/R/B ahora priorizan alignment cuando ≥2 items. Panel toggles ceden cuando hay multi-selección. Archivos: `useWorkbenchShortcuts.ts`, `useAlignment.ts`, `alignmentConstants.ts`.
- [x] **Ctrl+Alt+E — Distribute Evenly Both Axes:** Nuevo shortcut distribuye elementos uniformemente en ambos ejes simultáneamente. `computeDistributedBothPositions()` en `useAlignment.ts`.
- [x] **Auditoría Global Shortcuts:** 49/49 shortcuts documentados en helpData.ts están implementados. 4 shortcuts faltantes añadidos (arrow keys nudge, Enter/Escape ghost).
- [x] **Ctrl+Shift+A Movido a Window:** Antes en Help > deprecated (confuso), ahora en Window como panel toggle legítimo con `checked`/`onToggleWindow` consistente con los demás paneles.
- [x] **MenuBar Indicadores Prioridad Alignment:** Badges ámbar →Align Left/Center Horizontally/Align Right/Align Bottom con tooltip cuando ≥2 items seleccionados. `ALIGNMENT_OVERRIDE` map + `hasMultiSelection` prop.
- [x] **ViewportToolbar Tooltip Contextual:** Contador Sel: N ahora muestra qué shortcuts cambian con multi-selección.
- [x] **Deprecated Tags Eliminados:** `highlight: 'deprecated'` quitado de 4 items funcionales (Link Workspace, Blueprints, Deploy, Module Global Configuration).
- [x] **E2E Suite Completa:** 50/52 passed. 4 layers-panel-filters tests reparados (locator `button:has-text("Clear")` → `button[title*="Clear all filters"]`). 2 pre-existing blueprint-store failures.

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

### Próximas Direcciones — Priorizadas

Basado en análisis exhaustivo del código, ADRs y estado actual del editor.

| Prioridad | Mejora | Esfuerzo | Impacto | Descripción |
|:---------:|--------|:--------:|:-------:|-------------|
| **P1** | 🍞 **Toast Notification System** | 🟢 **Completado en v9.3.3** | 🟢 Alto | Sistema global de toasts animados (framer-motion) desde esquina superior derecha. `ToastProvider`, `useToast`, `addLog` bridge para notificaciones visuales. |
| **P2** | 🔍 **Command Palette (Ctrl+K)** | 🟢 **Completado en v9.4.0** | 🟢 Alto | Paleta de comandos estilo VS Code/Linear: buscar nodos por nombre/ID, ejecutar acciones del menú, mostrar atajos. Ctrl+K badge en footer. 35 unit tests. |
| **P3** | 📊 **Status Bar (dirty/validación)** | 🟢 **Completado** | 🟡 Medio | Barra de estado inferior con indicador Modified/Saved, timestamp último guardado, conteo de errores de validación en vivo, estado watchdog. 45 tests (38 unit + 7 integration + 6 snapshots). |
| **P4** | 🎓 **Onboarding Walkthrough** | 🟢 **Completado en v9.6.0** | 🟢 Alto | Tour interactivo paso a paso con 7 pasos (Welcome, Header & Menu Bar, Tool Palette, Work Canvas, Inspector Panel, Status Bar, Keyboard Shortcuts). Auto-open en primera visita vía localStorage + Highlight Ring animado. Accesible desde Command Palette (Ctrl+K > Help > "Take a Guided Tour"). |
| **P5** | 🖼️ **Mini-Map del Rack** | 🟢 **Completado** | 🟢 Alto | Mini-mapa funcional en esquina superior derecha, arrastrable con el ratón. Filtro por tipo de nodo (cell, group, layer, rack) con checkboxes, persistencia localStorage + URL query params, indicador de locked, color legend en dropdown, botón Clear all filters, snap a bordes, reset position button, glow visual al arrastrar, botón colapsado arrastrable, doble-click para reset, top clamp fix (no stuck behind toolbar), top limit indicator (cyan inset glow), clamp constants refactor, collapsed mode clamp, constant Tailwind consistency. **60 unit tests pasando.** |
| **P6** | ⏪ **Undo Timeline Visual** | 🟡 Medio | 🟡 Medio | Popover/timeline mostrando últimos N pasos del historial semántico. Similar a Photoshop history o Cursor branch. Extiende batchHistory existente. |
| **P7** | 🎨 **Temas Visuales Adicionales** | 🟢 Bajo | 🟡 Medio | Extender ThemeToggle con selector de temas (Amber, Cyberpunk, High Contrast) que cambien variables CSS `--primary-rgb` y colores de acento. |
| **P8** | 🔧 **Floating Toolbar Customizable** | 🟡 Medio | 🟡 Medio | Personalizar orden de herramientas en Toolbar flotante: arrastrar para reordenar, ocultar/mostrar, estado persistido en localStorage. |
| **P9** | 📐 **Resizable Panels** | 🔴 Alto | 🟢 Alto | Splitters redimensionables entre paneles (inspector, layers, logs) usando react-resizable-panels. Layouts personalizados persistidos. |
| **P10** | ♿ **Accesibilidad WCAG AA** | 🔴 Alto | 🟢 Alto | Auditoría de contraste, aria-label/role en todos los componentes interactivos, navegación completa por teclado (Tab, Enter, Escape). |
| **P11** | 🔌 **Editor Visual de Conexiones** | 🔴 Alto | 🟢 Muy alto | Editar conexiones directamente en viewport: click puerto → arrastrar línea a destino. Curvas Bezier animadas como SynthEdit/V CV Rack. |

### Próximas Direcciones — Priorizadas (Actualizado)

| Prioridad | Mejora | Esfuerzo | Impacto | Descripción |
|:---------:|--------|:--------:|:-------:|-------------|
| **P3** | 📊 **Status Bar (dirty/validación)** | 🟢 **Completado** | 🟡 Medio | Barra de estado inferior con indicador Modified/Saved, timestamp último guardado, conteo de errores de validación en vivo, estado watchdog. 45 tests (38 unit + 7 integration + 6 snapshots). |
| **P4** | 🎓 **Onboarding Walkthrough** | 🟢 **Completado en v9.6.0** | 🟢 Alto | Tour interactivo paso a paso (como Linear/Figma) usando overlay modal existente. Guía de primeros pasos en el editor. |
| **P6** | ⏪ **Undo Timeline Visual** | 🟡 Medio | 🟡 Medio | Popover/timeline mostrando últimos N pasos del historial semántico. Similar a Photoshop history o Cursor branch. Extiende batchHistory existente. |
| **P7** | 🎨 **Temas Visuales Adicionales** | 🟢 Bajo | 🟡 Medio | Extender ThemeToggle con selector de temas (Amber, Cyberpunk, High Contrast) que cambien variables CSS `--primary-rgb` y colores de acento. |
| **P8** | 🔧 **Floating Toolbar Customizable** | 🟡 Medio | 🟡 Medio | Personalizar orden de herramientas en Toolbar flotante: arrastrar para reordenar, ocultar/mostrar, estado persistido en localStorage. |
| **P9** | 📐 **Resizable Panels** | 🔴 Alto | 🟢 Alto | Splitters redimensionables entre paneles (inspector, layers, logs) usando react-resizable-panels. Layouts personalizados persistidos. |
| **P10** | ♿ **Accesibilidad WCAG AA** | 🔴 Alto | 🟢 Alto | Auditoría de contraste, aria-label/role en todos los componentes interactivos, navegación completa por teclado (Tab, Enter, Escape). |
| **P11** | 🔌 **Editor Visual de Conexiones** | 🔴 Alto | 🟢 Muy alto | Editar conexiones directamente en viewport: click puerto → arrastrar línea a destino. Curvas Bezier animadas como SynthEdit/V CV Rack. |

### Próximas Direcciones — Alternativas

| Opción | Esfuerzo | Impacto | Notas |
|:-------|:--------:|:-------:|-------|
| 🌐 **Internacionalización (i18n)** | 🔴 Grande | 🟡 Medio | Traducir UI a múltiples idiomas. Bajo impacto porque el público es técnico/ingenieril. |
| 🧪 **Testing & Calidad** | 🟡 Medio | 🟢 Alto | Completar cobertura para VisualModulationMatrix y VirtualScrolling LayersPanel. E2E tests con retry logic. |

---

*Roadmap actualizado: 2026-06-16*

### Refactors Recientes — Componentes Reutilizables
- [x] **ToolbarIconButton generalizado**: Nuevo prop `size='sm'|'md'` y `colorVariant='primary'|'accent'`. 31 tests.
- [x] **ShortcutBadge extraído**: 9 instancias inline en WorkbenchFooter → componente reutilizable con 3 estados.
- [x] **ModalCloseButton**: 10 botones de cierre inline en modales → componente reutilizable.
- [x] **ModalActionButton**: 7 botones de acción secundaria en modales → componente reutilizable.
- [x] **DockIconBar unificado**: DockIconStrip (8 botones) + DockRackSectionToolbar (11 botones) → un solo componente genérico con grupos. 30 tests.
- [x] **DockPanelHeader extraído**: Header de DockPanel (8 instancias en RightDockContainer) → componente standalone con variants default/subtle. 10 tests.
- [x] **Toolbar.tsx al 100% ToolbarIconButton**: addBtn (flyout), liveBtn (accent), zenBtn (shadow + icon condicional) migrados. 11/11 botones.

---

## 🎯 Hitos Completados (Post-Roadmap Original)
