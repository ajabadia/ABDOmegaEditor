# OMEGA Manifest Editor — Project Roadmap

> **Current version:** v9.9.1 · **Updated:** 2026-06-17

---

## ✅ Completed Features (P1–P9 + P11)

| Prioridad | Feature | Versión | Esfuerzo | Impacto | Estado |
|:---------:|---------|:-------:|:--------:|:-------:|:------:|
| **P1** | 🍞 **Toast Notification System** | v9.3.3 | 🟢 Bajo | 🟢 Alto | ✅ Completado |
| **P2** | 🔍 **Command Palette (Ctrl+K)** | v9.4.0 | 🟡 Medio | 🟢 Alto | ✅ Completado |
| **P3** | 📊 **Status Bar (dirty/validación)** | v9.8.0 | 🟡 Medio | 🟡 Medio | ✅ Completado |
| **P4** | 🎓 **Onboarding Walkthrough** | v9.8.0 | 🟡 Medio | 🟢 Alto | ✅ Completado |
| **P5** | 🖼️ **Mini-Map del Rack** | v9.3.3 | 🟡 Medio | 🟢 Alto | ✅ Completado |
| **P6** | ⏪ **Undo Timeline Visual** | v9.9.0 | 🟡 Medio | 🟡 Medio | ✅ Completado |
| **P7** | 🎨 **Temas Visuales (Amber/Cyberpunk/High Contrast)** | v9.8.1 | 🟢 Bajo | 🟡 Medio | ✅ Completado |
| **P8** | 🔧 **Floating Toolbar Customizable** | v9.9.0 | 🟡 Medio | 🟡 Medio | ✅ Completado |
| **P9** | 📐 **Resizable Panels** | v9.9.0 | 🔴 Alto | 🟢 Alto | ✅ Completado |
| **P11** | 🔌 **Pipeline de Integridad WASM & Contratos** | — | 🔴 Alto | 🟢 Alto | ✅ Completado |

### Resumen por Era

| Era | Versiones | Features clave |
|:----|:---------:|:---------------|
| **9.9.x** | 9.9.0–9.9.1 | Resizable Panels (P9), Floating Toolbar Customizable (P8), Undo Timeline Visual (P6), UI Cleanup (audit/shortcuts/overlay reducción) |
| **9.8.x** | 9.8.0–9.8.1 | Status Bar (P3), Onboarding Walkthrough (P4), 3 Temas Visuales (P7), ThemeSelector dropdown |
| **9.7.x** | 9.7.0 | Alignment Shortcuts UI/UX, Ctrl+Alt+E Distribute Both Axes, Ctrl+Shift+A Window toggle, 49/49 shortcuts audit, MenuBar priority indicators |
| **9.6.x** | 9.6.0–9.6.1 | Visual Modulation Matrix, Virtual Scrolling LayersPanel, Ctrl+Shift+E CellStudio shortcut, LayersPanel TS fix |
| **9.5.x** | 9.5.0 | DockIconBar/DockPanelHeader/ToolbarIconButton refactors — 5 componentes reutilizables extraídos, ~60 tests |
| **9.4.x** | 9.4.0 | Command Palette (P2), Ctrl+K badge, 35 tests |
| **9.3.x** | 9.3.2–9.3.3 | Toast System (P1), Mini-Map clamping (P5), Bug fixes, Ghost Preview, E2E stability |
| **9.2.x** | 9.2.0 | Container Format (.omega), JUCE pipeline, Batch actions, Groups, Layers Panel jerárquico, Simulaciones dinámicas |

### Refactors Estructurales

| Componente | Descripción | Tests |
|:-----------|:------------|:-----:|
| **DockIconBar** | Unifica DockIconStrip + DockRackSectionToolbar en un solo componente genérico con grupos | 30 |
| **DockPanelHeader** | Header reutilizable extraído de DockPanel con variants default/subtle | 10 |
| **ToolbarIconButton** | Botón genérico con size/colorVariant — 11/11 botones de Toolbar migrados | 31 |
| **ShortcutBadge** | Extraído de 9 instancias inline en WorkbenchFooter a componente standalone (3 estados) | — |
| **ModalCloseButton** | 10 botones inline de cierre → componente reutilizable | — |
| **ModalActionButton** | 7 botones de acción secundaria → componente reutilizable | — |
| **~10 hooks extraídos** | useBatchHistory, useLayerFilters, useRackSections, useTabDiagnostics, useEntityCrud, useExportOperations, useBatchUngroup, useFileDrop, useCellBlueprint, useGroupBlueprint | 136 |

### UI Cleanup (v9.9.1)

| Acción | Justificación |
|:-------|:--------------|
| ❌ **Audit button eliminado de floating toolbar** | Redundante: Compliance ya en DockIconStrip (Shield), Window menu (Ctrl+Shift+A), ComplianceBadge en Header |
| ❌ **5 ShortcutBadge duplicados eliminados** | Mini iconos (Orbital/Rack/Source/History/Mini Map) ya tenían botones equivalentes; shortcuts movidos a tooltip |
| ❌ **Engine info overlay de Orbital view** | Texto decorativo sin funcionalidad (versión engine, modo, conteo) |
| 🔀 **Compliance Report movido de Help a Window** | Era deprecated en Help; ahora toggle legítimo en Window consistente con Layers/Blueprints |

---

## 🚀 Próximas Direcciones — Priorizadas

| Prioridad | Mejora | Esfuerzo | Impacto | Descripción |
|:---------:|--------|:--------:|:-------:|-------------|
| **P10** | ♿ **Accesibilidad WCAG AA** | 🔴 Alto | 🟢 Alto | Auditoría de contraste, aria-label/role en todos los componentes interactivos, navegación completa por teclado (Tab, Enter, Escape). Skip-to-content link, focus-visible rings, y roles semánticos ya implementados parcialmente en v9.7.0. Pendiente: contraste en temas custom, focus trapping en modales, anuncios de live region. |

### Alternativas

| Opción | Esfuerzo | Impacto | Notas |
|:-------|:--------:|:-------:|-------|
| 🌐 **Internacionalización (i18n)** | 🔴 Grande | 🟡 Medio | Traducir UI a múltiples idiomas. Público técnico/ingenieril — impacto reducido. |
| 🧪 **Testing & Calidad** | 🟡 Medio | 🟢 Alto | Completar cobertura para VisualModulationMatrix y VirtualScrolling LayersPanel. E2E tests con retry logic. |
| 📐 **Diseño Responsivo** | 🟡 Medio | 🟢 Alto | Adaptar layout del workbench para pantallas pequeñas (≤1280px) con colapso automático de paneles. |

---

## 📊 Estado de Salud del Proyecto

| Métrica | Valor |
|:--------|:-----:|
| **TypeScript** | 0 errors |
| **ESLint** | 0 problems |
| **Jest** | 825/825 tests, 46 suites, 51 snapshots |
| **Next build** | ✅ Success |
| **E2E** | 50/52 passing |

---

*Roadmap actualizado: 2026-06-17*
