# OMEGA Manifest Editor - Registro de Progreso (Era 8.4.1)

Este documento registra los hitos alcanzados y el estado actual de la migración, optimización y gobernanza del editor independiente.

*Última actualización: 10/06/2026 (v9.1.9-dev) -- Sesión 7: Cell Studio Modular Refactor, Draft Recovery & Unique Keys*

> **Regression Recovery Plan**: 100% completado (23/23 archivos + 2 tipos GridConfig). Ver `REGRESSION_RECOVERY_PLAN.md` para el detalle del checklist.


---

## Tabla de Hitos y Estado Actual

| Hito / Característica | Estado | Notas |
| :--- | :---: | :--- |
| **Separación de Repositorio** | ✅ Completado | Aislado de `ABDSynthsWeb` comercial. Desplegado en Vercel: https://abd-omega-editor.vercel.app/ |
| **Actualización del Stack** | ✅ Completado | Migrado con éxito a Next.js 16.2.4, React 19.2.4 y Tailwind CSS 4. |
| **Editor como Home** | ✅ Completado | La ruta raíz `/` renderiza de inmediato el workbench interactivo principal. |
| **Sincronización Local (File System Access)** | ✅ Completado | Integración en caliente con pickers de carpetas locales en el navegador. |
| **Watchdog SSE Bidireccional** | ✅ Completado | Endpoints de guardado remoto optimizados con CORS y SSE para flujos C++/JUCE. |
| **Gobernanza .agent Adaptada** | ✅ Completado | Reglas de arquitectura alineadas con el estándar industrial de `ABDSuite`. |
| **Auditorías de Compilación** | ✅ Completado | builds de producción exitosos sin errores de TypeScript o ESLint. |
| **Linter de Autoridad Numérica (UCA)** | ✅ Completado | Predicción y visualización de `ParamId` y `PortId` adaptadas al árbol de nodos canónico de UCA. |
| **Generación de Cabeceras UCA** | ✅ Completado | Generación automática de contratos `.h` (C++) y `.ts` (TypeScript) a partir de los nodos de la jerarquía UCA. |
| **Cell Philosophy & Stepper** | ✅ Completado | Tipos de dominio específicos (`cell-types.ts`) y flujo de stepper wizard interactivo (`?mode=stepper`). |
| **Modularización de Workbench** | ✅ Completado | Extracción del estado de modales al hook `useWorkbenchModals` reduciendo drásticamente la complejidad del container. |
| **Universal Cell Studio Connection** | ✅ Completado | Conexión directa desde la MenuBar e inicio nativo del `CellStudioContainer` eliminando overrides restrictivos en el entrypoint. |
| **Inspector Complexity Governance** | ✅ Completado | Niveles progresivos (Simple, Medium, Advanced) para adaptar la UI y herramientas de Start/Contextual en rack. |
| **Certificación Era 11** | ✅ Completado | Script de auditoría de 6 fases en verde (`SYSTEM CERTIFIED - ERA 11 COMPLIANT`) y tipos E2E corregidos para `verbatimModuleSyntax`. |
| **Grid Snapping & Free Dragging** | ✅ Completado | Modo continuo de cuadrícula, atajo contextual de un solo uso, y libertad de arrastre para componentes internos. Paridad Eurorack configurable (`1 HP ≈ 15px`). |
| **Monolith Splitting (5 rounds)** | ✅ Completado | 20 archivos nuevos extraídos de 10 archivos >150 líneas. DRY aplicado en LayersPanel, VirtualRack, BlueprintLibraryPanel. `tsc --noEmit` 0 errores. |
| **Light Theme** | ✅ Completado | Full light mode via `[data-ui-theme="light"]` con tokens, Tailwind remapping, skin overrides. Rack aislado en dark. |
| **Rack Viewport Isolation** | ✅ Completado | `.rack-viewport` class fuerza dark primitives dentro del rack independientemente del tema UI. |
| **Context Menu & Interaction Fixes** | ✅ Completado | `stopPropagation()` en context menu, duplicate con UCA, auto-expand panel, position contamination fix. |
| **Grid Visual Overlay** | ✅ Completado | Overlay amarillo como div separado `z-[1]` (no `backgroundImage`). `grid.visible` separado de `grid.enabled`. |
| **Grid Settings Popover** | ✅ Completado | Spacing X/Y inputs en toolbar, visible solo cuando grid overlay está activo. |
| **RulerOverlay (Photoshop-Style)** | ✅ Completado | Reglas en bordes del viewport con canvas-rendered. Never unmounts. Creación/eliminación de guías via drag. |
| **Guide Persistence** | ✅ Completado | Guías en `manifest.ui.layout.grid.guides`, sincronizadas con undo/redo/load. |
| **LIVE Mode Differentiation** | ✅ Completado | Drag disabled, context menu blocked, SignalInjector gated, isLiveMode propagated to renderers. |
| **ViewportToolbar** | ✅ Completado | Dark industrial bar with alignment/distribution tools, Snap toggle, Grid toggle + settings. |
| **Multi-Selection** | ✅ Completado | Ctrl+click/Shift+click selects multiple. Purple dashed outline feedback. Marquee selection. |
| **Rulers Scale with Zoom** | ✅ Completado | Tick intervals and labels respond to zoom/pan. 0 at corner box. |
| **Rulers Perfect Pan/Zoom Sync** | ✅ Completado | Bucle `requestAnimationFrame` mide la posición real del rack cada frame y actualiza estado solo cuando cambia. Agnóstico a pan libre, botones discretos, zoom o resize. |
| **Ruler 0 at Top-Right Corner** | ✅ Completado | 0 en esquina sup-derecha, negativos hacia izq/arr, escala con zoom. |
| **Pinned Panel Editable** | ✅ Completado | mode="active" con onUpdate propio, parche CSS eliminado, banner reference eliminado. |
| **PropertyPanel Reorganizado** | ✅ Completado | Secciones por flujo (Define→Design→Connect→Arrange→Test→Debug). visibleSections independientes. |
| **Bulk Mode Extendido** | ✅ Completado | Logic, Attachments y Layout ahora sincronizan en bulk (5 secciones totales). |
| **Toolbar con Jerarquía Visual** | ✅ Completado | Separador essential/advanced en DockRackSectionToolbar. |
| **Sistema Declarativo de Fields** | ✅ Completado | FieldDef + FieldRenderer + buildPatch/getFieldValue helpers. |
| **ModuleIdentitySection** | ✅ Completado | Merge de Signature + Branding + Taxonomy (~200 vs ~300 líneas). |
| **ModuleChassisSection** | ✅ Completado | Merge de MechanicalSpec + PowerParity (~100 vs ~180 líneas). |
| **Group/Ungroup Context Menu** | ✅ Completado | Group cuando ≥2 multi-seleccionados, Ungroup cuando right-click en group node. Ctrl+G / Ctrl+Shift+G. |
| **V2 Blueprint Loading** | ✅ Completado | Panel carga desde /blueprints/v2/index.json (GroupNode). Inserción directa sin pipeline legacy. |
| **Unified Type Barrel** | ✅ Completado | `src/omega-ui-core/types/index.ts` re-exporta blueprints, manifest, rack, validation. ComponentType collision con alias RackComponentType. |
| **Right Panel Independent Toggle** | ✅ Completado | Múltiples paneles simultáneos. Dock colapsa solo al cerrar el último. |
| **Simplificación del Modelo de Datos** | ✅ Completado (Fases 0-5) | Nuevo modelo atómico: ComponentNode, GroupNode, RackManifest. React primitives (8 componentes), editores por tipo (10), blueprints migrados (4), legacy marcado como deprecated. ~20 archivos nuevos creados, ~170 legacy marcados para eliminación futura (~19K LOC pendientes). |
| **Drag Inertia Elimination (drag→pan)** | ✅ Completado | `useUCADrag.ts` + `StructuralNode.tsx` + `CellNode.tsx` migrados de framer-motion `onDrag*` (con spring residual) a `onPan*` (sin momentum). El elemento aterriza exactamente donde se suelta, sin desvío proporcional a la velocidad. |
| **Atomic Batch Alignment** | ✅ Completado | `ViewportToolbar.applyPositionBatch` reescrito: en vez de N dispatches, un solo `onUpdateManifest` con tree walk + `treeToManifest` una vez. Los centros y la alineación completa (left/right/top/bottom) ahora mueven TODOS los items, no solo el segundo. |
| **RACK_MASTER Excluded from Align** | ✅ Completado | `gatherPositions` filtra el root (kind==='rack' + id en set precomputado) y los items con `layout.pos` no finito. |
| **Alignment Debug Logging** | ✅ Completado | `window.__OMEGA_ALIGN_DEBUG__ = true` activa un log estructurado de gatherPositions (accepted/skipped con reason). |
| **SVG Icons with `currentColor`** | ✅ Completado | 8 iconos de alineación convertidos de PNG a SVG con `currentColor` (se adaptan al tema sin filtro CSS). |
| **ViewportToolbar i18n a Inglés** | ✅ Completado | Todos los tooltips y labels del dropdown traducidos de español a inglés. |
| **Turbopack `nul` Crash** | ✅ Completado | Archivo `nul` (Windows reserved name) eliminado; `/nul.*` añadido a `.gitignore`. |
| **Studio Render Relocation** | ✅ Completado | Movido de Edit > Generate a File > Export en MenuBar.tsx. |
| **Inspector Level Integration** | ✅ Completado | Cableado de `inspectorLevel` para filtrar paneles y campos de inputs en los 8 editores atómicos. |
| **Cell Studio Modular Refactor** | ✅ Completado | Refactorizado `CellStudioContainer.tsx` en subcomponentes (`CellStudioPreviewStrip`, `CellStudioToolbar`, `CellStudioContentArea`, `CellStudioAssetOverlay`) y hooks dedicados. |
| **Draft Recovery System** | ✅ Completado | Persistencia automática en `sessionStorage` y aviso interactivo (`CellStudioDraftPrompt`) para restaurar o descartar borradores huérfanos. |

---

## Últimos Cambios (10/06/2026 — Sesión 6)

### Relocalización de Studio Render e Integración de Niveles de Inspector
- **MenuBar.tsx**: Relocalizado "Studio Render" a `File > Export` y retirado de `Edit`.
- **Propagación de Niveles**: Propagado `inspectorLevel` desde la barra de menú a través del Dock de React hasta `PropertyPanel` y `ComponentEditor`.
- **Filtrado Dinámico**:
  - `PropertyPanel` filtra las pestañas mostradas en el panel de propiedades (Simple oculta diseño/lógica/archivos, Advanced revela diagnóstico).
  - Los 8 editores atómicos ocultan variantes, colores, bindings y rangos detallados según el nivel configurado.
- **Seguridad de Tipos**: Corregidas firmas de props para cumplir de manera estricta con `exactOptionalPropertyTypes: true` de TypeScript.

## Últimos Cambios (10/06/2026 — Sesión 5)Turbopack `nul` Crash** | ✅ Completado | Archivo `nul` (Windows reserved name) eliminado; `/nul.*` añadido a `.gitignore`. |

---

## Últimos Cambios (10/06/2026 — Sesión 4)

### Drag Inertia (drag→pan migration)
- `src/omega-ui-core/renderers/hooks/useUCADrag.ts`: handlers renombrados `handleDragStart/End` → `handlePanStart/End`. Eliminada la captura de `info.point` (innecesaria con pan porque `info.offset` ya es atómico). JSDoc explica el por qué.
- `src/omega-ui-core/renderers/components/StructuralNode.tsx`: `drag={...}`/`dragMomentum={false}`/`onDrag*` reemplazados por `onPanStart/Pan/PanEnd` cableados solo cuando `isDraggable && isLeafContainer`. `dragOffset` sumado al `left`/`top` del style para que el nodo siga al cursor durante el pan.
- `src/omega-ui-core/renderers/components/CellNode.tsx`: misma migración. `KnobDragOverlay` (pointer events) y gates de `parentIsDraggableContainer`/`lockedNodeIds` preservados.

### Atomic Batch Alignment
- `src/features/manifest-editor/components/viewport/ViewportToolbar.tsx`:
  - `applyAlignment` y `applyDistribution` (con side effects) reemplazadas por `computeAlignedPositions` y `computeDistributedPositions` (puras, devuelven `Map<id, {x,y}>`).
  - Nueva `applyPositionBatch(newPositions, onUpdateManifest, label)` invoca `onUpdateManifest` una sola vez con la forma funcional `(prev: OMEGA_Manifest) => { walkTree; treeToManifest; return newState }`.
  - Nueva `applyBatchPositionsToTree(root, positions)` — DFS puro que clona el árbol aplicando solo `layout.pos` de los nodos en el map, preservando `size`, `children`, `style`, etc.
  - Tipo `UpdateManifestFn` exportado y consumido por `WorkbenchViewport.tsx` y `WorkbenchPane.tsx` para satisfacer `exactOptionalPropertyTypes`.
  - `handleAlign`/`handleDistribute` guardan `!onUpdateManifest` antes de llamar a `applyPositionBatch`.
  - Helper `isAlignDebug()` reemplaza el guard inline de `window.__OMEGA_ALIGN_DEBUG__`.
  - `gatherPositions` acumula `GatherTrace` (accepted/skipped con reason tipado) y emite log estructurado cuando el flag está activo.

### useEntityCRUD Normalization
- `src/features/manifest-editor/hooks/entities/useEntityCRUD.ts`: `updateItem` ahora SIEMPRE normaliza vía `applyUpdatesToNode(nodeInTree, updates)` y extrae `layout/style/bind/role/cellRef` para pasarlo a `updateNodeInTree`. Elimina la condición frágil `!('kind' in updates) && ('presentation' in updates || 'pos' in updates)` que fallaba para `{ layout: { pos } }` (pos anidado en layout).

### i18n + SVG Icons
- 8 PNGs de `public/icons/align/` convertidos a SVG en `src/features/manifest-editor/components/viewport/AlignIcons.tsx` con `stroke="currentColor"`/`fill="currentColor"`.
- PNGs eliminados. Regla CSS `[data-ui-theme="light"] .align-icon { filter: invert(1) }` eliminada de `app/globals.css` (ya no es necesaria con currentColor).
- Todos los tooltips/labels del `ViewportToolbar` traducidos de español a inglés.

### RACK_MASTER Exclusion
- `RACK_ROOT_IDS = new Set(['RACK_MASTER', 'root', 'MAIN_RACK', 'MAIN_RACK_ROOT'])` — cubre producción (VirtualRack.tsx), tests, fixtures y backups.
- `isRackRootNode(node)` — `kind==='rack' && id in set`.
- `gatherPositions` filtra el root por id Y por nodo encontrado (defensa en profundidad).
- `invalid-pos` con `Number.isFinite()` y `JSON.stringify` para diagnóstico.

### Turbopack fix
- `nul` (Windows reserved device name) eliminado del root. `/nul` y `/nul.*` añadidos a `.gitignore`.

### Resultados
- **TSC**: 0 errores
- **Browser verification**: el usuario confirma "wow!!! ahora sí!!!" para la inercia, y "se alinea bien... alinea bien" para la alineación tras el fix atómico.

## Últimos Cambios (10/06/2026 10:12:06 — Sesión 3)

### CSS Simplification (vars.css)
- `src/omega-ui-core/tokens/vars.css` simplificado y alineado con backup del día 5
- Eliminado duplicado `[data-ui-theme="dark"]` (el `:root` ya contiene los valores oscuros)
- Eliminada variable `--omega-shadow-angle` no utilizada
- Consolidados tokens light theme con valores más simples y legibles
- Añadida documentación `.rack-viewport` isolation

### Group/Ungroup & Context Menu
- `RackContextMenu.tsx`: Group/Ungroup menu items con iconos BoxSelect/Maximize
- `VirtualRack.tsx`: Multi-selección capturada antes de `onSelectItem` (bug crítico corregido), group node detection via tree walk
- `useEntityCRUD.ts`: `groupSelected(ids)`, `ungroupNode(groupId)`, `insertBlueprint()`
- Prop chain completa: WorkbenchContainer → WorkbenchPane → WorkbenchViewport → VirtualRack → RackContextMenu

### V2 Blueprint Loading
- `BlueprintLibraryPanel.tsx`: Carga desde `/blueprints/v2/index.json` (GroupNode format)
- `useEntityCRUD.insertBlueprint()`: Convierte GroupNode children → OmegaNodes con crypto.randomUUID()
- `RightDockContainer.tsx`: Nuevo prop `onInsertBlueprint` tipado como V2BlueprintData

### Unified Type Barrel
- `src/omega-ui-core/types/index.ts`: Re-exporta blueprints, manifest, rack, validation
- `src/omega-ui-core/types/blueprints.ts`: V2BlueprintMeta y V2BlueprintData compartidos
- BlueprintLibraryPanel y RightDockContainer ahora importan desde barrel

### Right Panel Toggle Fix
- `workbenchReducer.ts`: TOGGLE_WINDOW de accordion a toggle independiente
- Estado inicial: todos los window_* en false, dock colapsado

---

## Últimos Cambios (08/06/2026 — Sesión 2)

### Eliminación Física de legacy/ y legacy_bak/
- **legacy/ borrado físicamente** (backup preservado temporalmente como `legacy_bak/`, luego también eliminado).
- **tsconfig.json**: `legacy` eliminado del exclude array.
- **0 errores TSC en todo `src/`** — los 117 errores legacy ya no existen (legacy/ eliminado).
- **36 import fixes**: `@/legacy/uca/` → `@/omega-ui-core/utils/` (19 archivos) y `@/legacy/renderers/` → `@/omega-ui-core/renderers/` (8 archivos).

### Seguridad (Deep Audit)
- **XSS**: `escapeHtml()` añadido en 4 renderers legacy.
- **API key logging**: Eliminado de `contact/route.ts`.
- **Path traversal**: Sanitizado en `audio/route.ts`.
- **CDN jszip**: Reemplazado por npm import.
- **`src/proxy.ts`**: Eliminado.
- **Security headers**: Añadidos a `next.config.ts`.

### CellNode Wiring — React Primitives en Runtime
- `CellNode.tsx`: Reemplazado `CellRenderer.renderCellHTML()` + `dangerouslySetInnerHTML` por `renderComponentNode()` con adaptador inline `omegaNodeToComponentNode()`.
- **8 primitives React** ahora renderizan en el rack real.

### ComponentEditor en PropertyPanel
- `ComponentEditor.tsx` conectado en la sección "Essential Identity" del PropertyPanel (debajo de CellPreview) para nodos cell/port.
- Bridge adaptador inline que convierte `OmegaNode` → `ComponentNode` en tiempo real.

### TypeScript Cleanup (113+ archivos)
- `noUnusedLocals`/`noUnusedParameters` habilitados → ~152 imports React no usados eliminados, ~50 variables/imports/params no usados corregidos.
- **ESLint cleanup**: 16 warnings restantes resueltos (3 legacy, 9 `_`-prefixed unused vars, 2 react-hooks/exhaustive-deps, 2 catch params).

### Resultados Finales
- **TSC**: 0 errores totales
- **ESLint**: 0 errores, 0 warnings
- **Omega Audit**: 6/6 fases PASS
- **legacy/**: Eliminado. Backup `legacy_bak/`: Eliminado.

## Próximos Hitos en el Roadmap del Editor

1.  **Refactor de tests**: Migrar tests script a Jest/node:test con aserciones reales.
2.  **Public Beta Launch**: Despliegue en producción de la suite de ingeniería en `ajabadia.es`.

---

## Recuperación Post-Regresión (10/06/2026 — En curso)

### CSS Theme (Bloques 1, 2, 10 del chat_log) — ✅ 5/5 completados
- `vars.css`: Light theme tokens + `.rack-viewport` isolation (116 líneas)
- `skins.css`: Light overrides para carbon, glass, industrial, minimal (103 líneas)
- `signals.css`: State colors (red/green/amber) + light variants (29 líneas)
- `containers.css`: `variant-inset` + `container-label-pill` light overrides (78 líneas)
- `tabs.css`: `module-tabs`, `tab-btn`, `tab-badge` light overrides (73 líneas)

### VirtualRack.tsx (Bloque 4: Position Contamination Fix) — ✅ Completado
- Añadido `handleSnapToGrid` que escribe `layout: { pos }` **sin spread** de `node.layout` (fix crítico)
- `gridVisible` derivado de `manifest.ui?.layout?.grid?.visible` (single source of truth)
- Imports: `findNodeInTree`, `snapToGrid` desde `uca/`
- Props preservadas: `onToggleLock`, `onToggleVisibility`, `onGroupSelected`, `onUngroupNode` (UCA Fase 7+)
- Marquee selection y multi-select preservados (evolución posterior)

### RackContextMenu.tsx (Bloque 3: Context Menu Fixes) — ✅ Completado
- Añadido `onSnapToGrid` prop + botón "Snap to Grid" en el menú contextual
- `e.stopPropagation()` en todos los botones del menú (ya existía, verificado)
- Conectado desde `VirtualRack` para el fix de position contamination

## Últimos Cambios (10/06/2026 — Sesión 7)

### Refactorización Modular de Cell Studio & Recuperación de Borradores
- **CellStudioContainer.tsx**: Completamente modularizado. Toda la lógica de estado se extrajo a `useCellStudioState.ts` y las subsecciones de UI a `CellStudioPreviewStrip`, `CellStudioToolbar`, `CellStudioContentArea` y `CellStudioAssetOverlay`.
- **Recuperación de Borradores (useCellStudioDraft)**: Añadido guardado automático en `sessionStorage` y un modal de confirmación `CellStudioDraftPrompt` en la inicialización para permitir recuperar la sesión previa si se detecta un borrador huérfano.
- **RackStartupAssistant**: Corregido en `VirtualRack.tsx` para que evalúe `isEmptyManifest` analizando la existencia real de controles, jacks y contenedores en vez de `allElements.length === 0`. Añadido el estado local `isStartupDismissed` para ocultar permanentemente el asistente al seleccionar "Create From Scratch", evitando que se quede en medio del canvas vacío.
- **Claves de React Únicas (Duplicate Key Fix)**: Corregidas las advertencias por claves duplicadas (como `io_root`) en `StructuralNode.tsx` y `CellNode.tsx` utilizando la clave combinada `key={`${child.id}-${index}`}`.
