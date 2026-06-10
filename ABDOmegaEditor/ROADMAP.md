# OMEGA Manifest Editor - Industrial Roadmap (v8.4+)

> **Sesión 7 (2026-06-10) — v9.1.9-dev**: Refactorización modular de Cell Studio y sistema de recuperación de borradores completado. Corrección de visibilidad del RackStartupAssistant y eliminación de advertencias por claves duplicadas (`io_root`) en renderers de React. Typecheck: 0 errores.

Este documento detalla el estado actual de industrialización y los próximos pasos técnicos. El historial de las fases 1-9 ha sido preservado en [ROADMAP_HISTORY.md](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/ROADMAP_HISTORY.md).

## ✅ Fase 10: Profesionalización & Rigor Industrial (Completado)
- [x] **Integrated SDK Portal**: Manual de ingeniería con código fuente vivo.
- [x] **Studio Render Engine**: Motor de exportación con paridad 1:1 (WYSIWYG).
- [x] **Container Folding Logic**: Sistema de plegado de grupos para gestión de densidad.
- [x] **Activity Heatmap**: Feedback visual dinámico basado en telemetría real.
- [x] **Firmware Integrity Check**: Sistema de Hash (SHA-256) funcional.
- [x] **Architectural Blueprint Export**: Exportación de planos técnicos (SVG).
- [x] **Firmware Coherence Lock**: Bloqueo estricto de seguridad ante incoherencias de Hash.
- [x] **UI Performance Hardening**: Memoización de `RackEntity` (60 FPS garantizados).

## ✅ Fase 11: Unified Skin System & Governance (Completado)
- [x] **Unified Skin System**: Normalización de tokens estéticos (`vars.css`, `skins.css`) para Carbon, Industrial, Glass y Minimal. Control coordinado de bordes, sombras y texturas en todas las primitivas.
- [x] **Detailed Compliance Report**: Interfaz de "Cartilla de Inspección" detallando fallos técnicos, espaciales y de gobernanza.
- [x] **Visual Parity Contract (VPC)**: Sincronización estricta de componentes entre ABDSynthsWeb y ABDOmega via omega-ui-core.

## ✅ Fase 12: Visualizadores & Primitivas de Streaming (Completado)
- [x] **Scope Primitive**: Osciloscopio con efecto fósforo.
- [x] **Terminal Primitive**: Monitor de logs MIDI/System.
- [x] **Diagnostics Suite**: Implementación de `midi_trigger`, `midi_in` y `omega_lab_monitor`.
- [x] **Documentation Sync**: Actualización del Manual de Ingeniería con ADR 001.

---
## ✅ Fase 13: Asset Bridge & Packaging (Completado)
- [x] **Embedded Asset Protocol**: 
    - [x] Integración de **Ilustraciones SVG** y activos de identidad (`module_logo.svg`) con previsualización en tiempo real.
    - [x] Motor de resolución de activos (`resolveAsset`) propagado por todo el inspector (Identidad, Estética, Layout).
    - [x] Ingesta polimórfica (File/FileList) y carga por lotes desde el selector de activos.
    - [x] Exportación unificada **.acepack** (OmegaPack) para despliegue industrial.

---
## ✅ Fase 14: Final Calibration & Live Deployment (Industrial Certification)
- [x] **Phase 8/9 Architectural Hardening**: Total elimination of `uiLegacy` and legacy state hooks. Orchestration unified via `useWorkbenchState`.
- [x] **Industrial History Engine**: Persistent undo/redo stacks across session refresh.
- [x] **Zero-Noise Certification**: Automated architectural guard (ADR-014) integrated into deployment pipeline.
- [x] **End-to-End Validation**: Structural parity and smoke-testing of `.acepack` exports.
- [x] **Production Hardening**: Auditoría final de rendimiento para racks de alta densidad (>100 entidades).
- [ ] **Public Beta Launch**: Despliegue en producción de la suite de ingeniería en `ajabadia.es`.
    - **Asset Bridge**: Futura implementación en C++/JUCE para servir la carpeta `/resources` al WebView.

---
## ✅ Fase 15: Unified Cell Studio (Advanced Composition)
- [x] **Cell Studio Foundation**: Implement specialized workbench isolation mode for recursive cell authoring.
- [x] **Recursive Behavior Drivers**: Enable recursive UCA tree auditing and genetic value propagation.
- [x] **Material Foundation Sync**: Integrate high-fidelity surface recipes and typography inheritance into the Studio.
- [x] **Blueprint Harvesting**: Formalize the "Freeze to Template" flow with industrial-grade DNA export.

---
## ✅ Fase 16: Canonical Consolidation (UCA Sovereign)
- [x] **Canonical Materialization Pipeline**: Unified `ucaBridge` materialization with literal and arithmetic expression support (`{{x + 10}}`).
- [x] **Core Utility Relocation**: Centralized `IdManager` and `AutoWireResolver` into the UCA core (`src/omega-ui-core/uca/utils/`).
- [x] **Injection Orchestration**: Created `ucaInjection.ts` as the sovereign gateway for blueprint integration, removing double-materialization.
- [x] **Legacy Tombstoning**: Disconnected and decommissioned `BlueprintInjector` and legacy utilities into the `legacy/` directory.
- [x] **Certification of Pillars**: Formal verification of Freeze-as-Template, Dynamic Injection, and `.acepack` export.

---
## ✅ Fase 17: Advanced Signal Propagation & Cross-Module Modulation (Completado)
- [x] **Phase 17.1: UCA Signal Port Expansion**: Formalización de puertos semánticos (In/Out) y modulation targets en el núcleo de UCA. Materialización determinista con direccionamiento basado en rutas (`node/port`).
- [x] **Phase 17.2: Robust Circularity Audit**: Implementación de `CircularityAuditor` para detección de bucles de modulación (SCC) en fase de auditoría.
- [x] **Phase 17.3: Recursive Modulation Mapping**: Jerarquía de IDs (`voice/osc/freq`) y direccionamiento multinivel para parámetros anidados.
- [x] **Phase 17.4: Live RPC Bridge & WebView2**: Integración de `OmegaRPCBridge` (JSON-RPC 2.0) con soporte para `sessionId`, `seq` y estados de sincronización (`in-sync`, `degraded`).

---
## ✅ Fase 18: Canonical UCA Contract & Sovereign Governance (Completado)
- [x] **Phase 18.1: Sovereign Graph Integration**: `nodes` y `links` como ciudadanos de primera clase en la raíz del manifiesto.
- [x] **Phase 18.2: Hardened Structural Audit**: Refactor de `StructuralAuditor` con soporte para "Sovereign Mode" y "Shadow Audits" legacy (ADR-018).
- [x] **Phase 18.3: Deep Link Validation**: Integración de `PathResolver` y `CircularityAuditor` para validación transaccional de `OmegaLinks`.
- [x] **Phase 18.4: Organic Migration Implementation**: Despliegue del patrón *Strangler Fig* para migración incremental de la flota legacy.
- [x] **Phase 18.5: Runtime Certification**: Validación final del core endurecido en el motor de `ABDOmega` y demolición de los arrays legacy (`controls`, `jacks`) en Inspector, Clipboard y Orchestrator.

---
## ✅ Fase 19: Native OmegaNode Rendering (Completado)
**Objetivo:** Eliminar la dependencia de proyecciones momentáneas en tiempo de render y hacer que `omega-ui-core` consuma `OmegaNode` nativamente como fuente de verdad para la representación visual.

- [x] **Phase 19.1: Core Renderers UCA Migration**: Refactorizar los renderers atómicos y orquestadores para recibir e interpretar `OmegaNode` directamente.
- [x] **Phase 19.2: Viewport & Canvas Sovereignty**: Renderizado del árbol canónico sin un modelo plano subyacente.
- [x] **Phase 19.3: Legacy Render Cleanup**: Retiro de dependencias residuales de `ManifestEntity`.
- [x] **Phase 19.4: Render Certification**: Validación de estabilidad y coherencia con el contrato UCA.

---
## ✅ Fase 20: Native Audio Runtime Integration (Completado)
**Objetivo:** Establecer una conexión soberana entre el árbol canónico `OmegaNode` y el motor de audio C++/WASM.
- [x] **Phase 20.1: Sovereign Audio Bridge**: Migración de `wasmRuntime` a consumidor nativo de UCA.
- [x] **Phase 20.2: Deterministic Parameter Binding**: Direccionamiento jerárquico (HPA) estable.
- [x] **Phase 20.3: Live RPC Integration**: Sincronización bidireccional y monitoreo de salud.
- [x] **Phase 20.4: Industrial Persistence**: Guardado canónico con gatekeeping de validación.
- [x] **Phase 20.5: Transactional Integrity**: Edición atómica con rollback automático.
- [x] **Phase 20.6: Delta Batching**: Optimización de tráfico de control a 60Hz.
- [x] **Phase 20.7: State Reconciliation**: Convergencia determinista UI/Motor.

---
## ✅ Fase 21: History Engine & Semantic Memory (Completado)
**Objetivo:** Establecer un subsistema de memoria duradera para registrar, comparar y restaurar la evolución del manifiesto.
- [x] **Phase 21.1: History Capture**: Registro inmutable de revisiones con lineage y causas.
- [x] **Phase 21.2: Semantic Diff**: Comparación estructural profunda de grafos de nodos.
- [x] **Phase 21.3: Time-Travel Restore**: Restauración validada de estados históricos vía Orquestador.
- [x] **Phase 21.4: Historical Observability**: Trazabilidad completa de operaciones históricas y latencia.
- [x] **Phase 21.5: Architectural Consolidation**: Integración de Undo/Redo como fachada sobre el History Engine.

---
## ✅ Fase 22: Industrial History Engine & Workspace State Sync (Completado)
**Objetivo:** Evolucionar el motor de historia para capturar y restaurar el contexto completo del espacio de trabajo (UI State).

- [x] **Semantic UI Tracking**: Captura de selección (`selectedNodeId`), pin (`pinnedNodeId`) y ratio del layout (`layoutRatio`) en cada entrada de historia.
- [x] **Workspace Recovery**: Restauración íntegra de la disposición física del editor (View Mode, Split, Zoom/Pan) al viajar en el tiempo.
- [x] **Event Coalescing**: Algoritmo de compresión para evitar ruido de UI en el stack de Undo/Redo.
- [x] **Aseptic Persistence Separation**: Desacoplamiento de la persistencia de sesión (durable) del historial semántico (volátil).
- [x] **Interaction Debouncing**: Registro estable de cambios de ratio solo en hitos de finalización (`onDragEnd`).

---
## ✅ Fase 23: Productivity & Validation Overlays (Era 8)
- [x] **Live Integrity Overlays**: Real-time visual feedback on dangling ports and circularities.
- [x] **Bulk Property Sync**: Multi-selection and mass property editing in the inspector.
- [x] Overlays visible in Orbital & Rack modes.
- [x] Multi-selection via Ctrl/Shift interaction.
- [x] Bulk edit propagates updates to all selected nodes.
- [x] History restores plural selection state.

---
## ✅ Fase 24: JUNiO 601 Presentation, Calibration Panel & Unified Audits (Era 8)
- [x] **Interactive Skins Gallery**: Integration of 6 custom themes (Classic, TR-808, ARP 2600, SH-101 Dark, Deepmind 12, Space Echo) displayed via the 3D carousel lightbox.
- [x] **Dynamic Render Showcase**: Automated discovery of high-definition studio renders (Black & White editions) with bilingual title generation.
- [x] **Emulated Components Details**: Interactive tabbed section detailing DCO, VCF, HPF, ADSR, VCA, LFO, Chorus BBD, and SysEx/FSK connectivity emulations.
- [x] **Collapsible Calibration & CSV Panels**: Collapsible section with an interactive sidebar (abanico) detailing the 11 categories of hardware trimpots and 5 importable CSV tables.
- [x] **Unified 6-Phase Audit Engine**: Cache cleansing, Try/Catch lock-resilient logging, and warning detail dumps integrated into `omega-audit.ps1`.
- [x] **Type Safety & Linting Hardening**: Solved TypeScript strict compiler errors across all renderers and components.

---
## ✅ Fase 25: Ergonomía & Refactor de Layout (Usabilidad) - Completado

### ✅ Fase 25.1: Barra de Herramientas Flotante & Usabilidad CAD (Completado)
- [x] **Draggable Floating Toolbar**: Barra de herramientas vertical y arrastrable (vía `framer-motion`) con manillar de estilo Photoshop para centralizar los modos de edición, adición de primitivas, blueprints, laboratorios, auditorías y conexión HIL en vivo.
- [x] **Aseptic Code Decommissioning**: Limpieza física de 9 archivos obsoletos/muertos (YAML Editor legacy, sidebars obsoletos, y hooks de transacciones/propiedades discontinuados).
- [x] **Progressive Deprecation Styling**: Aplicación de estilos de deprecación visual (rojo/naranja atenuado, texto tachado y puntos parpadeantes) a las opciones y menús duplicados en `MenuBar.tsx` y `Header.tsx` para su comprobación manual antes del retiro.

### ✅ Fase 25.2: Paneles Colapsables & Modo Zen (Completado)
- [x] **Paneles Colapsables**: Implementación de manillar interactivo vertical y transiciones de ancho (`0px` a `340px`) en el inspector, así como colapso de logs inferiores.
- [x] **Ajustes de Tipografía**: Escala tipográfica optimizada para alta densidad visual en el Rack y labels técnicos.
- [x] **Modo de Enfoque (Zen)**: Integración de botón Zen en Toolbar para contraer cabecera (`Header`), pie de página (`Footer`), logs e inspector con transiciones fluidas de opacidad y altura.

### ✅ Fase 25.3: Grid Snapping & Drag Freedom (Completado)
- [x] **Eurorack Standard Grid**: Integración de resolución de grid configurable (`spacingX` / `spacingY`) directamente en *Physical Emulation Profile*, con consejo de escalado (`1 HP ≈ 15px`).
- [x] **Free Drag & Drop**: Eliminada la restricción de anclaje que bloqueaba el movimiento libre de nodos anidados (`parentIsDraggableContainer`), permitiendo organizar knobs e interruptores libremente sobre sus contenedores/faceplates.
- [x] **Contextual Snapping**: Adición de la acción `Alinear a cuadrícula (Snap)` en el menú contextual de los módulos para forzar el ajuste al grid de manera puntual sin requerir el modo continuo.

## ✅ Fase 26: Estandarización de Modales, Reubicación de Logs y Live Loop (Completado)
- [x] **Modal Size Standardization**: Estandarización de dimensiones (`max-w-7xl` de ancho y `h-full max-h-[850px]` de alto) en todas las modales principales (`AboutModal`, `AuditModal`, `TemplateGallery`, `IngestionModal`, `ManifestDiffModal`, `HelpModal`, `BlueprintPromptDialog`, `GlobalGovernanceModal`) para lograr consistencia visual uniforme con el editor de celdas.
- [x] **Live Loop Centralization**: Relocalización del indicador de telemetría y sincronización `SimulationStatusBadge` (`LIVE LOOP`) al sector superior del Header principal.
- [x] **Right Dock Logs integration**: Reemplazo del panel flotante de logs inferior por un panel lateral integrado en el dock de la derecha (`RightDockContainer`), accesible mediante un nuevo botón de acceso rápido en la tira de botones.
- [x] **Selective Undo/Redo History**: Exclusión de acciones de UI (zoom, split, colapso de paneles, ratio) en el stack de historia, limitando el deshacer/rehacer a modificaciones estructurales reales del Rack/Manifiesto.

---
## ✅ Fase 27: Multi-Pane Split Layout & Static Views (Era 8.1.0 - Completado)
- [x] **Header & Footer Simplification**: Removed settings gear, vertical split button, and duplicate view selectors from the main header. Relocated view selectors (`Orbital`, `Rack`, `Source`, `History`) and vertical split toggle to the central section of the footer.
- [x] **Compact Compliance Badge**: Redesigned the compliance badge to be a highly compact horizontal badge with hover tooltip details for compliance failures and latency metrics.
- [x] **Static 4-Option Panes**: Configured all 4 workbench panels (`primary`, `primary_bottom`, `secondary`, `secondary_bottom`) to always display the 4 canonical view options statically, allowing parallel side-by-side view comparisons.
- [x] **Independent Horizontal Resizing**: Implemented draggable `HorizontalSplitDivider` components with dedicated split ratios (`primarySplitRatio`, `secondarySplitRatio`), allowing row splits on the left and right columns to be resized independently.
- [x] **Close Pane & Safe Hydration**: Added close pane handlers (`X`) to collapsible panels and safe-guarded the hydration process in `useWorkbenchPersistence.ts` to cleanly restore layout ratios and prefix active tab IDs correctly without runtime crashes.

---
## ✅ Fase 28: Independencia de Viewport, Aislamiento de Rack HUD y Estructura Avanzada (Era 8.2.0 - Completado)
- [x] **Viewport Independence**: Configuración de zoom y paneo independientes por pestaña y panel mediante el paso de `useViewport` local a cada `WorkbenchPane`.
- [x] **Rack HUD Isolation**: Aislamiento de la escala y traslación en el renderizador del Rack (`VirtualRack`). El zoom y la posición afectan únicamente al chasis (`RACK_FRAME`), manteniendo los controles de `ENGINEERING / LIVE` y las pestañas de plano de cara (`MAIN`) fijos y legibles.
- [x] **Monaco JSON Folding**: Activación explícita del plegado JSON (`folding: true`) y visibilidad persistente de controles de plegado (`showFoldingControls: 'always'`) en la vista de código fuente (`SourceView`).
- [x] **Window Menu Alignment**: Refactorización completa del menú `Ventana` (renombrado a `Window`) para reflejar todas las ventanas del Right Dock, incluyendo la activación de submenús interactivos con estados de verificación (`Check`) para las secciones del Rack.

---
## ✅ Fase 29: Cell Philosophy, Stepper Refactor & Catalog Governance (Era 8.3.0 - Completado)
- [x] **Cell Philosophy Domain Types**: Introducción de `PrimitiveNode`, `CompositeCell` y `StructuralModule` (`cell-types.ts`) con conversores específicos (`cell-conversion.ts`) para desacoplar responsabilidades y limpiar la estructura heredada `OmegaNode`.
- [x] **Cell Studio Stepper Feature Flag**: Soporte de flujo wizard mediante stepper interactivo (`?mode=stepper`) para realizar revisiones secuenciales (Compose, Behavior, Style, Review) de celdas aisladas.
- [x] **Decoupled Lifecycle Hooks**: Extracción de estados y modos del laboratorio de celdas a los hooks dedicados `useCellStudioState`, `useCellStudioMode` y `useCellStudioDraft`.
- [x] **Behavioral & Recipe Validation**: Extensión de `BlueprintValidator` con validaciones de compatibilidad de presets, límites de slots de decoración y blend modes en `LayerRecipe`.
- [x] **Centralized Catalog Governance**: Integración directa del validador con `OMEGA_ELEMENT_CATALOG` como fuente única de verdad soberana para las capacidades de primitivas.
- [x] **Clean English UX Labels**: Remoción del bilingüismo parcial en `MenuBar.tsx` unificando las etiquetas del menú de ventana a nombres estándar y profesionales en inglés.
- [x] **Consolidated Modal Orchestration Hook**: Creación del hook `useWorkbenchModals` para centralizar los estados y métodos de modales, logrando desacoplar y simplificar el componente principal `WorkbenchContainer.tsx`.
- [x] **Consolidated Access Redundancy**: Eliminación del interruptor redundante `Toggle Logs Window` en el menú View de `MenuBar.tsx` para optimizar la jerarquía visual de la UI.
- [x] **Universal Cell Laboratory Redirection**: Conexión del acceso del menú "Universal Cell Laboratory" para lanzar el entorno moderno de `CellStudioContainer` (`setStudioMode`) en lugar de la modal simple heredada.
- [x] **Decommissioned Page-Level Override**: Limpieza de los prop overrides `onOpenCellEditor` en `app/[locale]/page.tsx` para liberar el bloqueo e iniciar nativamente el CellStudioContainer.
- [x] **Typecheck Script & Rigor**: Inclusión del comando `"typecheck": "tsc --noEmit"` en `package.json` y actualización de directivas en `AGENTS.md` para garantizar la estabilidad de tipos.
- [x] **E2E Test Type-Safety**: Refactorización de las importaciones de `Page` en `e2e/blueprint-injection.spec.ts` y `e2e/rack-features.spec.ts` a `import type { Page }` para cumplir con la regla `verbatimModuleSyntax`.
- [x] **Full Industrial Audit Certification**: Resolución de todas las advertencias/errores críticos para lograr la certificación del sistema (`SYSTEM CERTIFIED - ERA 11 COMPLIANT [OK]`).
- [x] **Documentation Clean Sync**: Archivado de los borradores obsoletos `docs/cell editor - para más adelante/` en `docs/archive/` y expansión del documento activo `ASSET_BEHAVIOR_LAB_ADR.md`.

---
## ✅ Fase 30: Monolith Splitting & Codebase Ergonomics (Era 8.3.2 — Completado)
- [x] **Campaña de splits (5 rondas)**: 20 archivos nuevos extraídos, 10 archivos originales reducidos.
- [x] **DRY LayerItem**: Eliminada repetición triple de toggles en LayersPanel.
- [x] **Hooks extraídos**: `useBlueprintCatalog`, `useRackKeyboardNav`, `useAssetVFS`.
- [x] **Componentes extraídos**: `RackStartupAssistant`, `RackContextMenu`, `MenuItem`, `CanonicalStylePreview`.
- [x] **CellRenderer como directorio**: Convertido de 560 líneas a directorio con barrel `index.ts`.
- [x] **Error TS2578 corregido**: `@ts-expect-error` huérfano en MenuBar eliminado.

---
## ✅ Fase 31: Light Theme, Rack Isolation & Grid/Rulers UI (Era 8.4.0 — Completado)
- [x] **Light Theme Implementation**: Full light mode via `[data-ui-theme="light"]` in `vars.css` with all `--wb-*`, `--primitive-*`, `--omega-*` token overrides; Tailwind class remapping in `globals.css`; light-mode overrides in `skins.css`, `containers.css`, `tabs.css`.
- [x] **Rack Viewport Isolation**: `.rack-viewport` class on rack frame forces dark primitives inside rack regardless of UI theme via CSS variable overrides and Tailwind reset section.
- [x] **Context Menu & Interaction Fixes**: `e.stopPropagation()` on all RackContextMenu buttons (was the critical bug — clicks bubbled to viewport and deselected elements). Duplicate with UCA support. Auto-expand right panel on selection. Position contamination fix.
- [x] **StructuralNode Drag Fix**: Pan handlers only on leaf containers. `onTap` uses `.closest()` to skip selection when tapping on child nodes.
- [x] **CSS Cleanup (33 Issues)**: Removed duplicate blocks, fixed definitions, tokenized hardcoded values across 15+ files. Font consistency `'Outfit'` → `'Inter'`. Dead code removal.
- [x] **Visual Discrepancies (22 Categories)**: Fixed token usage across SwitchProperties, splash, terminal, port, select, display, ModulationCell, MockupViewport, ModulationGrid, Lab, Audit, MockupFooter, InspectionCard.
- [x] **Grid Visual Overlay**: Yellow overlay as separate div (`z-[1]`) inside rack frame — not `backgroundImage` (was hidden behind children). `grid.visible` independent from `grid.enabled` (snap).
- [x] **Grid Settings Popover**: Spacing X/Y inputs in VirtualRack toolbar, visible only when grid overlay is on.
- [x] **ViewportControls Grid & Rulers Group**: Bottom-right floating toolbar with two icon buttons. Grid button amber glow when active. Rulers button amber glow when active. Group hidden in orbital view.
- [x] **RulerOverlay Component**: Photoshop-style rulers at viewport section edges (not inside rack). Canvas-rendered with `ResizeObserver`. Never unmounts (`visibility: hidden` when disabled).
- [x] **Drag-to-Create Guides**: Mousedown on top ruler → horizontal guide. Mousedown on left ruler → vertical guide. Blue preview line (red in delete zone).
- [x] **Drag-to-Delete Guides**: Drag guide toward ruler zone (`RULER_SIZE + 30px`) — turns red. Mouseup in delete zone removes guide.
- [x] **Guide Persistence**: Stored in `manifest.ui.layout.grid.guides` (`GridGuide[]`). Synced bidirectionally with undo/redo/load.
- [x] **View Menu Toggles**: "View Grid" and "Show Guides" in MenuBar View menu with `Grid3X3`/`Ruler` icons.
- [x] **Grid/Rulers Only in Rack View**: `RulerOverlay` only renders when `viewMode === 'rack'`. Buttons disabled in orbital view.

---
## ✅ Fase 32: LIVE Mode, Alignment Tools & Multi-Selection (Era 8.4.1 — Completado)
- [x] **LIVE Mode Differentiation**: LIVE mode now functionally differs from ENGINEERING mode:
    - Drag disabled in live mode (`useUCADrag` pan handlers return early).
    - Context menu blocked in live mode.
    - SignalInjector gated to live mode only.
    - `isLiveMode` propagated via `UCADebugContext` and `CellRenderer.renderCellHTML` options.
- [x] **ViewportToolbar**: Dark industrial bar above rulers with alignment/distribution tools, Snap toggle, Grid toggle + settings.
- [x] **Multi-Selection Visual Feedback**: Purple dashed outline for multi-selected nodes.
- [x] **Marquee Selection**: Click+drag rectangle at section level with `onClickCapture` to prevent VirtualRack interference.
- [x] **Rulers Scale with Zoom**: Tick intervals and labels respond to zoom/pan; 0 at corner box.
- [x] **Grid Toolbar Removal**: Floating GRID SNAPPING TOOLBAR removed from VirtualRack; settings moved to ViewportToolbar.

---
## ✅ Fase 33: LIVE Mode Polish & Knob Interaction (Era 8.4.3 — Completado)
- [x] **Knob Rotation in LIVE Mode**: `KnobDragOverlay` — vertical drag maps to 0–1 value via `onUpdateRuntimeValue`. Wired through `useRackSimulation.updateValue`.
- [x] **LIVE Mode Visual Cleanup**: Selection outlines, debug HUD, integrity/coverned/CAD overlays all hidden in LIVE mode.
- [x] **LIVE Mode Marquee & Deselection Blocked**: Marquee selection and rack background deselection disabled in LIVE mode.
- [x] **Right Panel Auto-Expand Gated**: `SET_SELECTED_NODE` skips auto-expand when `isLiveMode`.
- [x] **Floating Toolbar Scoped**: Left toolbar only renders in rack tab + ENGINEERING mode.
- [x] **LIVE Mode Grid/Rulers Hide/Restore**: Grid and rulers hidden on LIVE enter, restored on exit via ref.
- [x] **LIVE Mode ViewportToolbar Hidden**: Alignment tools bar hidden in LIVE mode.

---
## ✅ Fase 34: Refactor de Inspector & Sincronización de Viewport (Completado — v8.4.4)
**Objetivo:** Resolver deudas técnicas identificadas en el inspector, las reglas y la consistencia entre paneles.

### Issues resueltos
- [x] **RulerOverlay desincronizado con VirtualRack**: Por diseño — la regla es referencia fija viewport-local (tipo Photoshop), no debe cambiar con pan. Funciona correctamente.
- [x] **Pinned Panel Reference Mode**: Reemplazado parche CSS `pointer-events-none` por `mode="active"` con `onUpdate` propio sobre `pinnedItem.id`.
- [x] **visibleSections con keys compartidas**: Resuelto por reorganización de PropertyPanel — módulo usa 6 secciones propias, entidad usa 7 secciones independientes.
- [x] **Toolbar de secciones sin jerarquía visual**: Agregado separador `<div>` entre essential (identity, chassis, grid) y advanced (aesthetics, architecture, engineering).
- [x] **Bulk mode incompleto**: Extendido a Logic, Attachments y Layout — ahora 5 secciones sincronizan en bulk.
- [x] **Duplicación de secciones del inspector**: Implementado sistema declarativo de fields (`FieldDef`, `FieldRenderer`, `buildPatch`, `getFieldValue`). Fusionados ModuleSignature + ModuleBranding + ModuleTaxonomy → `ModuleIdentitySection`, y ModuleMechanicalSpec + ModulePowerParity → `ModuleChassisSection`. 5 archivos eliminados, 3 creados (fields/ + 2 merged sections).

---
## ✅ Fase 35: Simplificación del Modelo de Datos a Componentes Atómicos (Completado — v9.0.0-dev)
**Objetivo:** Reemplazar el modelo legacy (OmegaNode con árbol UCA, 7 governance sections, 12+ secciones de inspector, blueprint injection complejo) por un modelo atómico simple: componentes directamente posicionados en el rack, con grupos de un solo nivel y editores específicos por tipo.

### Motivación
- El proyecto actual está sobrediseñado para el caso de uso real: racks de escala eurorack con relativamente pocos elementos
- ~170 archivos y ~19K LOC de infraestructura legacy (UCA tree, UniversalRenderer, CellRenderer, injection pipeline, validators)
- El inspector tiene ~40 controles distribuidos en 13 secciones que confunden al usuario
- Los 4 blueprints existentes son estructuralmente simples (container + cells) y fácilmente convertibles

### ✅ Phase 0: Tipos Base Definidos
- [x] `src/omega-ui-core/types/rack.ts` creado con todos los tipos base
- [x] `npm run typecheck` — 0 errores

### ✅ Phase 1: React Primitives (Completado)
- [x] `renderers/primitives/` — 8 React components: Knob, Slider, Led, Port, Switch, Button, Display, Label
- [x] `renderComponentNode()` — dispatcher que retorna el React element correcto para un ComponentNode
- [x] Lógica de render portada de HTML strings a JSX (rotación knob, filmstrips, colores de señal)

### ✅ Phase 2: Editores por Tipo (Completado)
- [x] `inspector/editors/` — 10 editores: KnobEditor, SliderEditor, LedEditor, PortEditor, SwitchEditor, ButtonEditor, DisplayEditor, LabelEditor, GroupEditor, RackPropertiesEditor
- [x] `ComponentEditor` — dispatcher que elige el editor según tipo de selección
- [x] Componentes compartidos: CommonFields, VariantSelect, ColorInput, BindSelect

### ✅ Phase 3: Deprecación Legacy (Completado)
- [x] **2 archivos huérfanos eliminados**: `ContainerRenderer.ts`, `ReorderIndicator.tsx`
- [x] `@deprecated` JSDoc añadido a 13+ archivos: CellRenderer, UniversalRenderer, rendererRegistry, 8 HTML renderers, AttachmentRenderer

### ✅ Phase 4: Blueprints Migrados (Completado)
- [x] 4 blueprints convertidos a GroupNode en `public/blueprints/v2/`
- [x] Utilidad `convertBlueprintToGroupNode()` en `utils/blueprintMigration.ts`

### ✅ Phase 5: Cleanup (Completado)
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores

### 📋 Plan de Eliminación (Pendiente)
| Área | Archivos | LOC | Estado |
|------|----------|-----|--------|
| UCA tree (`src/omega-ui-core/uca/`) | ~19 | ~2300 | Marcado deprecado |
| UniversalRenderer (`renderers/UniversalRenderer/`) | ~9 | ~772 | Marcado deprecado |
| CellRenderer HTML (`renderers/CellRenderer/`) | ~4 | ~526 | Marcado deprecado |
| Blueprint injection (ucaInjection, validators) | ~20 | ~3000 | Marcado deprecado |
| Inspector governance (12+ secciones) | ~30 | ~5000 | Marcado deprecado |
| Types legacy (manifest.ts) | ~5 | ~621 | Pendiente |
| Otros servicios | ~15 | ~2500 | Marcado deprecado |
| **Total** | **~170** | **~19K** | Deprecado, pendiente eliminar |

### 📄 Documentación
- [x] `docs/specs-and-architecture/SIMPLIFIED_MODEL_PROPOSAL.md` — Propuesta completa
- [x] Estudio de codebase completo con conteo de LOC por área
- [x] Análisis de impacto en el panel derecho del inspector

---
## ✅ Fase 37: ViewportToolbar, Drag Fix, Marquee & Ruler Sync (Completado — v9.1.0-dev)
**Objetivo:** Corregir bugs de interacción (posición en drag, visibilidad de toolbar), refactorizar la barra de herramientas del viewport, implementar selección por rectángulo estilo Photoshop, y sincronizar las reglas con pan/zoom del canvas.

- [x] **RulerOverlay Pan/Zoom Sync**: Refactorizado con helper `rackOrigin()` que calcula el (0,0) del rack en coords de sección para cualquier pan/zoom. `baseRackPos` se mide al mount/resize invirtiendo la transform CSS. Reglas, guías y preview lines siempre sincronizados con el canvas. 0,0 siempre coincide con la esquina superior izquierda del rack.
- [x] **RulerOverlay TS2322 Fix**: Reemplazados patrones IIFE inline con variables pre-computadas (`creatingLine`, `guideElements`) para corregir error `(() => Element) | null` no asignable a `ReactNode`.
- [x] **ViewportToolbar Visibility Fix**: Ahora se muestra cuando `multiSelectedIds.length >= 2` en lugar de `manifest.ui?.ucaDebug?.enabled`.
- [x] **Drag Position Bug Fix**: `VirtualRackProps.onUpdateItem` cambiado de `Partial<ManifestEntity>` a `HybridEntityUpdate` para aceptar updates OmegaNode (`{ layout: { pos } }`) de `useUCADrag`.
- [x] **ViewportToolbar Compact Icons**: Iconos-only: Magnet (snap toggle), Settings (grid panel Eurorack). Botones de texto eliminados.
- [x] **Eurorack Grid Settings**: Panel con Scale (px/HP), Spacing X/Y con display HP/mm, presets 1HP–42HP, referencia 1HP=5.08mm.
- [x] **ViewportControls Grid Removal**: Botón Grid3X3 y props `gridVisible`/`onToggleGrid` eliminados. Controles de grid consolidados en ViewportToolbar.
- [x] **Marquee Selection**: Rectángulo click+drag en espacio vacío del rack para multi-selección. Coordenadas screen→rack-local, AABB intersection, overlay visual dashed cyan, crosshair cursor, `didMarqueeRef` guard.
- [x] **BlueprintThumbnail**: Miniatura SVG de GroupNode en BlueprintLibraryPanel.

---
## ✅ Fase 36: Group/Ungroup, Blueprint v2 & Type System (Completado — v9.1.0-dev)
**Objetivo:** Operaciones de composición en el rack (agrupar/desagrupar), carga directa de blueprints v2 sin pipeline legacy, y unificación del sistema de tipos.

- [x] **Group/Ungroup Context Menu**: Opción "Group" en context menu cuando ≥2 elementos están multi-seleccionados; "Ungroup" cuando se hace right-click en un nodo group. Multi-selección capturada antes de que `onSelectItem` la limpie.
- [x] **Group/Ungroup Keyboard Shortcuts**: `Ctrl+G` agrupa selección múltiple, `Ctrl+Shift+G` desagrupa nodo seleccionado.
- [x] **`groupSelected(ids)` en useEntityCRUD**: Crea GroupNode con bounding box center, reparenta hijos con posiciones relativas, inserta en árbol UCA con projections sync.
- [x] **`ungroupNode(groupId)` en useEntityCRUD**: Disuelve group, reparenta hijos a posiciones absolutas, re-inserta a nivel del parent original.
- [x] **V2 Blueprint Loading**: `BlueprintLibraryPanel` carga desde `/blueprints/v2/index.json` (formato GroupNode). Inserción directa de GroupNode children sin pipeline de inyección legacy.
- [x] **`insertBlueprint` en useEntityCRUD**: Convierte GroupNode → OmegaNode con regeneración de IDs (`crypto.randomUUID()`), inserción en árbol UCA con projections sync.
- [x] **Unified Type Barrel**: `src/omega-ui-core/types/index.ts` re-exporta desde `blueprints.ts`, `manifest.ts`, `rack.ts`, `validation.ts`. Colisión `ComponentType` manejada con alias `RackComponentType`.
- [x] **Shared Blueprint Types**: `src/omega-ui-core/types/blueprints.ts` con `V2BlueprintMeta` and `V2BlueprintData`. Eliminada duplicación entre `BlueprintLibraryPanel` and `RightDockContainer`.
- [x] **Right Panel Independent Toggle**: `TOGGLE_WINDOW` cambia de accordion (solo uno) a toggle independiente (múltiples paneles simultáneos). Dock colapsa solo al cerrar el último panel.
- [x] **Right Panel Initial State**: Todos los `window_*` en `false`, dock colapsado al iniciar — ningún panel abierto.
- [x] **`exactOptionalPropertyTypes` Compliance**: Corregido `data: undefined` en BlueprintLibraryPanel omitiendo la key en lugar de asignar `undefined`.

---
## ✅ Fase 38: RulerOverlay Pan/Zoom Sync Definitivo (Completado — v9.1.1-dev)
**Objetivo:** Resolver definitivamente la desincronización entre las reglas/guías y el rack al aplicar pan/zoom. El fix inicial de la Fase 37 (helper `rackOrigin()` con compensación matemática) era teóricamente correcto pero fallaba en la práctica porque el `transformOrigin: center` del rack y el re-centrado del flex parent al cambiar el zoom no se podían "deshacer" desde una fórmula.

- [x] **rAF-based Rack Position Tracking**: Bucle continuo con `requestAnimationFrame` que muestrea `getBoundingClientRect()` del rack (`.rack-viewport`) y de la `<section>` en cada frame, y solo actualiza `baseRackPos` cuando hay cambio real. Funciona idéntico para pan libre (vía rAF en el handler), botones de paneo discretos (`onPan(±50, 0)`), zoom y resize.
- [x] **Eliminada Fórmula `rackOrigin()`**: La compensación `(w/2)*(1-zoom)` quedaba obsoleta al leer la posición real del DOM cada frame. Las 8 llamadas a `rackOrigin()` simplificadas a `origin.x + delta * z` directo.
- [x] **`useLayoutEffect` Descartado**: Empeoró el desfase porque la medición se ejecutaba antes de que el `transformOrigin: center` se aplicara.
- [x] **Cero Overhead Cuando Estático**: Guard `!==` evita re-renders cuando el rack está quieto. El bucle se cancela en unmount vía `cancelAnimationFrame`.
- [x] **Verificado en Navegador**: Probado con zoom 80% y 160%, pan en todas direcciones, y secuencias mixtas (pan libre → botón de paneo). Las marcas y guías permanecen ancladas al (0,0) del rack en todos los casos.

---
## ✅ Fase 39: Alignment Toolbar Hardening & Drag Inertia Elimination (Completado — v9.1.2-dev)
**Objetivo:** Resolver dos bugs de interacción reportados en la versión actual (v9.1.1-dev) que el proyecto de referencia (`ABDOmegaEditor___222`, snapshot del día 5) ya tenía resueltos. Diferidos por prioridad a bloques de mayor impacto industrial.

### Issues conocidos — TODOS RESUELTOS
- [x] **Drag inertia residual al mover nodos del rack** — Migración `useUCADrag.ts` + `StructuralNode.tsx` + `CellNode.tsx` de `onDrag*` (con spring residual) a `onPan*` (sin momentum). El elemento aterriza exactamente donde se suelta el puntero, sin desvío proporcional a la velocidad. Verificado por el usuario: “wow!!! ahora sí!!!”.
- [x] **Alignment buttons — comportamiento inconsistente (carrera de dispatch)** — `ViewportToolbar.applyPositionBatch` reescrito: en vez de N `onUpdateItem` (cada uno re-walkea el tree y recalcula `treeToManifest`), un solo `onUpdateManifest` con la forma funcional `(prev) => { applyBatchPositionsToTree; treeToManifest; return newState }`. Tree recorrido 1 vez, todas las posiciones aplicadas atómicamente, proyección legacy recalculada 1 vez al final. Symptom resuelto: “el segundo se alineaba al primero, el primero nunca se movía”.
- [x] **RACK_MASTER participation en alineación** — `isRackRootNode()` + `RACK_ROOT_IDS` set precomputado. `gatherPositions` filtra el root por id Y por nodo encontrado (defensa en profundidad). Detección dinámica, no por id solo, para compatibilidad con fixtures/tests.
- [x] **`useEntityCRUD.updateItem` fragile condition** — Eliminada la condición `!('kind' in updates) && ('presentation' in updates || 'pos' in updates)` que fallaba para `{ layout: { pos } }` (pos anidado en layout). Ahora SIEMPRE normaliza vía `applyUpdatesToNode` y extrae `layout/style/bind/role/cellRef`.
- [x] **Items con `layout.pos` inválido** — `Number.isFinite()` guard + `JSON.stringify` en el trace de `gatherPositions` para que `Infinity`/`NaN`/`undefined` no envenenen `Math.min/max`.
- [x] **i18n de tooltips** — 8 tooltips de alineación + 6 labels del dropdown de grid + título del align-target toggle traducidos de español a inglés (convención del proyecto).
- [x] **SVG icons con `currentColor`** — 8 PNGs de `public/icons/align/` convertidos a SVG en `src/features/manifest-editor/components/viewport/AlignIcons.tsx` con `stroke="currentColor"` y `fill="currentColor"`. Heredan color del botón automáticamente, sin filtro CSS. Regla `[data-ui-theme="light"] .align-icon { filter: invert(1) }` eliminada de `app/globals.css`.
- [x] **Selection counter en toolbar** — `Sel: N` chip con `title` que indica “No selection. Click a node, then Ctrl+click (or Shift+click) others to multi-select.” Reduce la confusión sobre por qué los botones de align no se habilitan.
- [x] **Distribute threshold** — Bajado de `>= 3` a `>= 2` (estándar en herramientas de diseño).
- [x] **Debug logging gated** — `window.__OMEGA_ALIGN_DEBUG__ = true` activa un log estructurado de `gatherPositions` con `accepted[]` y `skipped[]` (con `reason` tipado y `detail`).
- [x] **`UpdateManifestFn` shared type** — Exportado desde `ViewportToolbar.tsx` y consumido por `WorkbenchViewport.tsx` + `WorkbenchPane.tsx` para satisfacer `exactOptionalPropertyTypes` aceptando la forma funcional `(prev) => Partial<OMEGA_Manifest>`.
- [x] **Turbopack `nul` crash** — Archivo `nul` (Windows reserved name) eliminado; `/nul.*` añadido a `.gitignore`.

### Notas de coordinación aplicadas
- Riesgo de conflicto con la Fase 36 (Group/Ungroup) mitigado: la migración drag→pan preserva la semántica del `useUCADrag.handlePanEnd` que escribe `layout: { pos }`.
- El `useUCADrag` migrado NO llama a `getBoundingClientRect()`, por lo que no es susceptible a la mezcla de coordenadas screen/rack que la Fase 37 documentó para `RulerOverlay`.
- `ViewportToolbar` mantiene compatibilidad con la API de `useEntityCRUD.updateItem` que la normalización introdujo (siempre pasar por `applyUpdatesToNode`).

### Pendiente (no bloqueante)
- [ ] **Test E2E del flujo completo** — agregar caso a `e2e/rack-features.spec.ts` que (1) crea 3 nodos en posiciones conocidas, (2) hace Ctrl+click en los 3, (3) pulsa `distribute-h`, (4) verifica que el espacio entre los 3 es uniforme. Sin este test no hay red de seguridad para futuras regresiones.

---
## 🚀 Futuros Pasos (Para Más Adelante)
- [ ] **Independencia de Viewport en Orbital**: El zoom y el desplazamiento de la vista orbital tiene que ser independiente de la pestaña rack.
- [ ] **Interacción y Reposicionamiento en Orbital**:
    - [ ] Permitir cambiar de posición a los satélites en la vista orbital. Estudiar cómo mostrar las interconexiones cuando existan.
    - [ ] Permitir seleccionar varios elementos a la vez con la tecla Mayúsculas (Shift) o Control (Ctrl), de forma idéntica al comportamiento en el rack.
    - [ ] Si en orbital se pincha en la parte central, no se suelta y se arrastra el ratón, se moverán los elementos con él hasta que se suelte (sin inercia).
- [ ] **Acciones y Menú Contextual Unificado (DRY)**:
    - [ ] Habilitar menú de botón derecho en orbital en cada elemento para eliminarlo, ver su código y mostrar sus preferencias (panel derecho).
    - [ ] Añadir estas opciones al botón derecho del rack. Compartir el mismo componente de menú en ambos casos para que se comporte igual (filosofía DRY), deshabilitando las opciones que no tengan sentido en orbital o en rack.
    - [ ] **Visualización de Código**: Si se elige ver su código (desde orbital o rack), cargar el source en un panel nuevo enfocado en la línea donde empieza su código.
        - Si ya se está mostrando el código en un panel, reutilizar ese panel.
        - Si hay más de un panel con el source cargado, usar el primero de ellos.
        - Si no hay ningún panel abierto con source, dividir la pantalla para mostrarlo (procurando que el panel de la izquierda sea el último que se divida): primero dividir verticalmente, luego horizontalmente el segundo panel, luego horizontalmente el primero. Si los cuatro paneles están ocupados y ninguno tiene cargado el source, cargarlo en el último (segundo panel, parte inferior).
    - [ ] **Doble Click**: Si se hace doble click sobre un elemento en orbital (o sobre la parte central), abrir el panel de preferencias de la derecha para poder editarlo.
    - [ ] **Eliminación Unificada (Tecla Supr / Menú)**: Si se pulsa la tecla `Supr` (`Delete`) con un elemento seleccionado (que no sea la parte central), eliminarlo tras mostrar un aviso de confirmación que permita cancelar o aceptar.
        - Reutilizar este mismo aviso y flujo de confirmación en la opción "Delete" del menú del botón derecho.
        - Aplicar filosofía DRY para implementar este comportamiento (tecla suprimir y mensaje) tanto en rack como en orbital.
    - [ ] **Movimiento de Grupos**: Al agrupar dos elementos, siempre tienen que moverse juntos.
    - [ ] **Movimiento de Selección**: Al seleccionar dos elementos, siempre tienen que moverse juntos.
    - [ ] **Snap to Guides**:
        - Crear un modo `Snap to Guides` y una opción de menú derecho que sea `Snap to Guides`.
        - Se tendrá que ajustar a la guía más cercana que no esté pegada ya: si está cerca de una guía vertical y más lejos de una horizontal, se pegará a la vertical, y si luego se vuelve a seleccionar, se ajustaría a la horizontal (porque ya estaría pegado a la vertical). Estudiar/definir si dejamos que se mueva de la guía o no.
    - [ ] **Comportamiento Avanzado de Guías y Reglas**:
        - Si se mantiene pulsada la tecla `Mayúsculas` (`Shift`) al crear o mover una guía, esta se moverá alineada a la cuadrícula existente (snap a la rejilla).
        - Si se tiene seleccionada una guía y se pulsa la tecla `Supr` (`Delete`), esta se debe eliminar.
        - Las guías, las reglas y la cuadrícula (grid) no se deben mostrar bajo ningún concepto en el modo `live`.
    - [ ] **Persistencia de Guías**:
        - Guardar las guías en el manifiesto (aunque no se mostrarán en el modo live ni en el sintetizador) para que si se carga un manifiesto guardado en disco no se pierdan sus guías. Estudiar si hay más opciones que se deberían tratar así.

---
*OMEGA — Engineering Standard V9.1.9 — Industrial Governance ERA 9.1.9 — Roadmap Updated 2026-06-10*
