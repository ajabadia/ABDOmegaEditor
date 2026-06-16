# OMEGA Manifest Editor - Registro de Progreso (Era 9.6.1)

Este documento registra los hitos alcanzados y el estado actual del editor.

---

## 📈 Tabla de Hitos y Estado Actual

| Hito / Característica | Estado | Notas |
| :--- | :---: | :--- |
| **Separación de Repositorio** | ✅ Completado | Aislado de `ABDSynthsWeb`. Desplegado en Vercel. |
| **Actualización del Stack** | ✅ Completado | Next.js 16.2.4, React 19.2.4, Tailwind CSS 4. |
| **Editor como Home** | ✅ Completado | Ruta raíz `/` renderiza workbench. |
| **Sincronización Local (File System Access)** | ✅ Completado | Pickers de carpetas locales. |
| **Watchdog SSE Bidireccional** | ✅ Completado | Endpoints CORS + SSE para flujo C++/JUCE. |
| **Formato .omega + Pipeline JUCE** | ✅ Completado | Container format, distill, upgrade, validación, e2e tests. |
| **Simulaciones Dinámicas** | ✅ Completado | 6 tipos de onda, SignalInjector, SimulationStatusBadge, inputSignalService. |
| **Panel de Layers Jerárquico** | ✅ Completado | Árbol, búsqueda, multi-selección, drag & drop, rename, visibility/lock, batch actions. |
| **Grupos Compositivos SynthEdit-style** | ✅ Completado | GroupEditor, flujo group/ungroup, export .acepack. |
| **Refactor a Hooks (x10)** | ✅ Completado | ~230 líneas extraídas de WorkbenchContainer. |
| **Unit Tests (136 tests, 10 suites)** | ✅ Completado | Cobertura completa de hooks extraídos. |
| **manifestToTree fallback removal** | ✅ Completado | 13 archivos limpiados del patrón legacy. |
| **Fix: Alignment Buttons** | ✅ Completado | `data-toolbar` faltante causaba deselección al hacer clic en botones de alineación. 1 línea fix. |
| **Alignment Ghost Preview** | ✅ Completado | `AlignGhostOverlay.tsx` — rectángulos fantasma cyan al hacer hover sobre botones de alineación. |
| **Keyboard Shortcuts Alignment** | ✅ Completado | Ctrl+Shift+L/H/R/T/M/B/D/V para los 8 tipos. Tooltips actualizados. |
| **Visual Modulation Matrix (v9.6.0)** | ✅ Completado | `VisualModulationMatrix.tsx` — matriz SVG drag-and-drop con conexiones bezier animadas, color-coded por tipo, ghost preview. Reemplaza el modal ModulationGrid. |
| **Virtual Scrolling LayersPanel (v9.6.0)** | ✅ Completado | `react-window@2.0.0-dev.1` — `List` + `rowComponent` para árboles de +1000 nodos. Container-level DnD, expand/collapse preservado. |
| **Ctrl+Shift+E Shortcut CellStudio (v9.6.1)** | ✅ Completado | `useWorkbenchShortcuts.ts` — nuevo handler Ctrl+Shift+E. MenuBar muestra shortcut en lugar de deprecated. |
| **LayersPanel TS Fix (v9.6.1)** | ✅ Completado | `boolean | undefined` por optional chaining → `!!()` wrapper. Pre-existing del virtual scrolling. |
| **Unit Tests Shortcuts (v9.6.1)** | ✅ Completado | `useWorkbenchShortcuts.spec.ts` — 19 tests: dispatch, guards, cleanup, coexistence. |
| **Alignment Shortcuts — Resolución Colisiones (v9.7.0)** | ✅ Completado | Ctrl+Shift+L/H/R/B priorizan alignment cuando ≥2 items. Colisiones resueltas con panel toggles. |
| **Ctrl+Alt+E — Distribute Evenly (v9.7.0)** | ✅ Completado | Nuevo shortcut distribuye en ambos ejes simultáneamente. `computeDistributedBothPositions()` en useAlignment.ts. |
| **Auditoría Global Shortcuts (v9.7.0)** | ✅ Completado | 49/49 shortcuts documentados están implementados. 4 shortcuts faltantes añadidos a helpData.ts (arrow keys, Enter/Escape). |
| **Discrepancia Ctrl+Shift+A (v9.7.0)** | ✅ Completado | Movido de Help > deprecated a Window como panel toggle legítimo. |
| **MenuBar Indicadores Prioridad (v9.7.0)** | ✅ Completado | Badges ámbar + shortcut color change cuando ≥2 items: alignment override. |
| **ViewportToolbar Tooltip Contextual (v9.7.0)** | ✅ Completado | Explica qué shortcuts cambian con multi-selección. |
| **Deprecated Tags Limpiados (v9.7.0)** | ✅ Completado | `highlight: 'deprecated'` eliminado de 4 items funcionales (Link Workspace, Blueprints, Deploy, Config). |
| **E2E Suite Completa (v9.7.0)** | ✅ Completado | 50/52 passed. Fix: 4 layers-panel-filters tests reparados (locator Clear). 2 pre-existing blueprint-store failures. |
| **11 Propuestas UI/UX Priorizadas (v9.7.0)** | ✅ Completado | Toast System, Command Palette, Status Bar, Walkthrough, Mini-Map, Undo Timeline, Themes, Toolbar Customizable, Resizable Panels, Accesibilidad, Editor Conexiones. |
| **Mini-Map: Filtro por tipo de nodo (v9.8.0)** | ✅ Completado | Dropdown con checkboxes para ocultar/mostrar cell, group, container, layer, rack. Colores por tipo. |
| **Mini-Map: Indicador locked (v9.8.0)** | ✅ Completado | Nodos bloqueados con opacity 0.45 + overlay 🔒. Prop lockedNodeIds. |
| **Mini-Map: Persistencia localStorage (v9.8.0)** | ✅ Completado | hiddenKinds sobrevive a recargas. |
| **Mini-Map: URL query params (v9.8.0)** | ✅ Completado | `?hide=cell,group` compartible. URL priority sobre localStorage. |
| **Mini-Map: Color legend + Clear all filters (v9.8.0)** | ✅ Completado | Círculos de color por tipo y botón reset en dropdown. |
| **Mini-Map: Flotante y arrastrable (v9.8.0)** | ✅ Completado | Movido a top-right. Arrastrable por texto "Navigator" con cursor-move. Posición persistida en localStorage. |
| **Mini-Map: Doble-click reset (v9.8.0)** | ✅ Completado | Doble-click en "Navigator" resetea posición del panel. Tooltip "Double-click to reset position". |
| **Mini-Map: Botón colapsado arrastrable (v9.8.0)** | ✅ Completado | EyeOff con onMouseDown=handleHeaderMouseDown. transition-colors evita lag. |
| **Mini-Map: Glow visual al arrastrar (v9.8.0)** | ✅ Completado | isDraggingVisual state. Glow cyan + ring en panel expandido y colapsado. Cleanup al soltar dentro/fuera. |
| **Mini-Map: Reset position button (v9.8.0)** | ✅ Completado | Icono RotateCcw en header. Resetea panelOffset a {x:0, y:0}. |
| **Mini-Map: Snap a bordes (v9.8.0)** | ✅ Completado | Panel expandido snap a left/right/top/bottom (threshold 8px). Multi-eje simultáneo (esquinas). panelRef para dimensiones. |
| **Mini-Map: Unit tests (v9.8.0)** | ✅ Completado | 42 tests total en RackMiniMap.spec.tsx (todos pasando). |

---

## 📈 Estado: Era 9.8.0 — Mini-Map Avanzado

### Features del Mini-Map
| Feature | Estado | Detalle |
|:--------|:------:|:--------|
| Filtro por tipo de nodo | ✅ | Dropdown con checkboxes. Colores por tipo con círculos de color. |
| Indicador locked | ✅ | Nodos bloqueados con opacity 0.45 y overlay 🔒. |
| Persistencia localStorage | ✅ | hiddenKinds sobrevive a recargas. |
| URL query params | ✅ | `?hide=cell,group` compartible. URL priority sobre localStorage. |
| Clear all filters | ✅ | Botón reset en dropdown. Solo visible con filtros activos. |
| Navigator flotante/arrastrable | ✅ | Posición `top-[40px] right-[10px]`. Arrastrable por texto "Navigator". Posición persistida. |
| Doble-click reset | ✅ | Doble-click en "Navigator" resetea posición. Tooltip "Double-click to reset position". |
| Botón colapsado arrastrable | ✅ | EyeOff con drag handler. transition-colors evita lag. |
| Glow visual al arrastrar | ✅ | Brillo cyan + ring. State isDraggingVisual sincronizado. Cleanup en todas las rutas. |
| Reset position button | ✅ | Icono RotateCcw en header del panel expandido. |
| Snap a bordes | ✅ | Snap a 4 bordes (threshold 8px). panelRef mide dimensiones. Multi-eje. |
| Unit tests | ✅ | 42 tests (todos pasando). |

**Typecheck:** `npx tsc --noEmit` → 0 errores ✅
**Unit Tests:** `npx jest RackMiniMap.spec.tsx` → 42/42 passed ✅

---

## 📈 Estado: Era 9.9.1 — UI Cleanup & Redundancy Removal

### Acciones de Limpieza
| Acción | Componentes | Tests |
|:-------|:------------|:-----:|
| ✅ Audit button eliminado de floating toolbar | `Toolbar.tsx`, `toolbarDefinitions.tsx` | ✅ Actualizados (11→10 buttons) |
| ✅ 5 ShortcutBadge duplicados eliminados de footer | `WorkbenchFooter.tsx` | ✅ 45/45 passed, snapshots updated |
| ✅ Engine info overlay eliminado de Orbital view | `NodeCanvas.tsx` | ✅ Sin tests afectados |
| ✅ Compliance Report movido de Help a Window menu | `MenuBar.tsx` | ✅ 13/13 passed, snapshots updated |
| ✅ ComplianceBadge en Header — **conservado** (no redundante) | `Header.tsx` | — |

**Typecheck:** `npx tsc --noEmit` → 0 errores ✅
**Tests:** 94/94 en suites modificadas (MenuBar + WorkbenchFooter + ToolbarCustomizePopover) ✅

---

## 📈 Estado Anterior: Era 9.6.0 — Visual Modulation Matrix + Virtual Scrolling

### Fases del Roadmap Original — Estado Actual
| Fase | Estado | Notas |
|:----|:------:|:------|
| **R1a — Indicadores Visuales LayersPanel** | ✅ Completado | NODE_TYPE_COLORS, childCount badge, getNodeIcon, filterProgress bar |
| **R1b — Ghost Preview Drag & Drop** | ✅ Completado | dragGhost overlay, AnimatePresence, glow indicators |
| **R1c — Filtros por Propiedades** | ✅ Completado | propertySearchTerm, showAuditIssues, showTemplates |
| **R2 — Simulaciones Extendidas** | ✅ Completado | 11 tipos de onda, scope, routing visual, persistencia |
| **R3 — Grupos → Blueprints** | ✅ Completado | Parámetros expuestos, versioning, nested groups, preview |
| **Tech Debt** | ✅ Completado | useAlignment hook, alignmentConstants, sin stale logs |
| **v9.3.2 Bug Hunting** | ✅ Completado | 31/32 e2e tests, Alt+Click ghost preview, tooltips |
| **v9.6.0 Visual Modulation Matrix** | ✅ Completado | SVG drag-and-drop, conexiones bezier, ghost preview, color-coded |
| **v9.6.0 Virtual Scrolling LayersPanel** | ✅ Completado | react-window List + rowComponent, container-level DnD, expand/collapse |

**Typecheck:** `npx tsc --noEmit` → 0 errores ✅
**Code Review:** Sin issues críticos — SVG coordinate fix aplicado, 9 errores TS corregidos ✅

### Próximos Pasos Posibles
- Reconectar CellStudioContainer (quick win)
- Internacionalización (i18n)
- Testing & Calidad (retry logic en e2e)
- Unit tests para VisualModulationMatrix
- Unit tests para VirtualScrolling LayersPanel
