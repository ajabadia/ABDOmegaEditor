# 🤖 Plan de Documentación Automática para LLM Local (Paralelizado)

Este documento sirve como guía paso a paso y registro de progreso para un LLM local (o script orquestador) encargado de auditar y documentar la funcionalidad de todos los archivos del proyecto **ABDOmegaEditor**.

---

## 🎯 Objetivo General
Analizar cada archivo de código fuente del proyecto, comprender su propósito e inyectar un comentario de cabecera estándar JSDoc con la directiva `@purpose [descripción]`. Esto alimentará automáticamente el generador de grafos de Obsidian.

---

## 📋 Directrices de Entrada (Lo que el LLM debe hacer)

Para cada archivo analizado:
1. **Comprender**: Leer el contenido del archivo y deducir su funcionalidad en el contexto del editor de manifiestos OMEGA.
2. **Redactar**: Escribir una descripción concisa de **1 o 2 líneas máximo** en español.
3. **Inyectar**: Colocar un bloque de comentarios JSDoc en la parte superior del archivo (línea 1 o justo debajo de `'use client';` si existe).
4. **Registrar**: Añadir el archivo procesado a la **Bitácora de Progreso** al final de este documento con la marca de tiempo (timestamp).

---

## ⚠️ Reglas Estrictas de Seguridad y Formato
 
* **NO TOCAR EL CÓDIGO**: Bajo ninguna circunstancia se debe modificar, borrar o alterar ninguna línea de código ejecutable, imports o exportaciones. Solo se inserta el comentario de cabecera.
* **FORMATO CANÓNICO JSDOC**: El comentario debe seguir exactamente esta estructura, incluyendo la fecha y hora de la auditoría en formato ISO 8601 en la etiqueta `@lastUpdated`:
  ```typescript
  /**
   * @purpose [Descripción clara y breve de su rol funcional en el editor]
   * @lastUpdated [Timestamp en formato ISO 8601, ej: 2026-06-14T17:10:00Z]
   */
  ```
  *(Nota: El script orquestador local puede inyectar o sustituir de forma automática el timestamp en la etiqueta `@lastUpdated` en el momento de guardar el archivo, o solicitarle al LLM local que lo devuelva ya formateado).*
* **UBICACIÓN DEL COMENTARIO**:
  * Si el archivo comienza con `'use client';` o `'use strict';`, el JSDoc se coloca **debajo** de esa línea (dejando una línea en blanco por cortesía).
  * En cualquier otro caso, se coloca en la **línea 1**.
* **FILTROS DE ARCHIVOS**:
  * **Procesar**: Archivos con extensión `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` dentro de `src/` y `app/`.
  * **Ignorar**: Archivos de test (`*.test.*`, `*.spec.*`), scripts de compilación (`scripts/`), documentación (`docs/`), dependencias (`node_modules/`, `.next/`), y archivos de configuración en la raíz (ej: `tsconfig.json`, `tailwind.config.*`).

---
 
## 🛠️ Script Orquestador Implementado (`document-codebase.mjs`)
Hemos implementado un script automatizado en Node.js (ESM) para orquestar la comunicación con el LLM local, inyectar el JSDoc de manera limpia y actualizar los grafos de Obsidian.
El script está ubicado en: [document-codebase.mjs](file:///D:/desarrollos/ABDSynths/ABDOmegaEditor/scripts/document-codebase.mjs)

### Características del Script:
1. **Prevención de Alucinaciones**: El script alimenta al LLM no solo con el código del archivo, sino con metadatos contextuales (nombre del archivo, directorio y el rol arquitectónico inferido: servicios, componentes UI, páginas de Next.js, etc.).
2. **Generación de Timestamp Robusta**: El LLM solo genera la descripción en español. El script orquestador se encarga de formatear e inyectar de manera segura el campo `@lastUpdated` con el timestamp ISO 8601 actual en milisegundos.
3. **Control por Lotes (Batch Limit)**: Por defecto, procesa **10 archivos por ejecución**. Esto evita que el LLM local bloquee la máquina y te permite supervisar el avance de manera controlada.
4. **Auto-Regeneración de Obsidian**: Al terminar un lote con éxito, ejecuta automáticamente `npm run generate-graphs` para regenerar la bóveda de Obsidian.
5. **Auto-Lectura y Escritura de esta Bitácora**: Lee la bitácora inferior para omitir los archivos ya procesados y escribe los nuevos al finalizar cada archivo.

### Instrucciones de Ejecución:
Asegúrate de tener tu servidor de LLM local activo (ej: Ollama) y ejecuta en tu terminal:

```bash
# Ejecutar directamente (Ollama en localhost:11434 y modelo por defecto 'llama3.1:8b-instruct-q4_0')
node scripts/document-codebase.mjs

# Personalizar el endpoint, el modelo y el límite del lote si lo deseas
$env:LLM_ENDPOINT="http://localhost:1234/v1/chat/completions" # Ejemplo para LM Studio
$env:LLM_MODEL="gemma4:latest"
$env:BATCH_LIMIT="20"
node scripts/document-codebase.mjs
```

---
 
## 🏁 Lista de Tareas Global
 
- [x] Crear el script de orquestación de llamadas al LLM local ([document-codebase.mjs](file:///D:/desarrollos/ABDSynths/ABDOmegaEditor/scripts/document-codebase.mjs)).
- [ ] Ejecutar un lote inicial de prueba (`BATCH_LIMIT=5`) y verificar que el JSDoc en el código no altera la sintaxis ni rompe el linter.
- [ ] Completar el análisis del total de archivos pendientes en lotes programados.
- [ ] Abrir Obsidian y comprobar que el dashboard `GRAPH.md` lee y muestra las descripciones de los archivos y avisa si ocurre alguna desviación ("Drift Alert") en el futuro.
 
---
 
## 📝 Bitácora de Progreso (Completados)
*El script orquestador añadirá aquí de forma automática los archivos procesados al final en formato markdown.*
 
### Archivos Completados:
<!-- INICIO DE REGISTROS AUTOMÁTICOS -->
- [x] `LLM_DOCUMENTATION_PLAN.md` | Creado y configurado: 2026-06-14 17:06
- [x] `src/services/persistenceService.ts` | Completado: 2026-06-14 17:30
- [x] `src/omega-ui-core/utils/ColorResolver.ts` | Completado: 2026-06-14 17:30
- [x] `src/features/manifest-editor/hooks/useAlignment.ts` | Completado: 2026-06-14 17:30
- [x] `src/features/manifest-editor/components/viewport/ViewportToolbar.tsx` | Completado: 2026-06-14 17:30
- [x] `src/lib/utils.ts` | Completado: 2026-06-14 17:30
- [x] `src/services/historyService.ts` | Completado: 2026-06-14 17:45
- [x] `src/omega-ui-core/utils/blueprintValidator.ts` | Completado: 2026-06-14 17:45
- [x] `src/features/manifest-editor/hooks/useWorkbenchShortcuts.ts` | Completado: 2026-06-14 17:45
- [x] `src/features/manifest-editor/components/layout/MenuBar.tsx` | Completado: 2026-06-14 17:45
- [x] `src/omega-ui-core/renderers/CellRenderer.ts` | Completado: 2026-06-14 17:45
- [x] `src/types/manifest.ts` | Completado: 2026-06-14 17:45
- [x] `src/features/manifest-editor/constants/defaults.ts` | Completado: 2026-06-14 17:45
- [x] `src/features/manifest-editor/components/inspector/LayersPanel.tsx` | Completado: 2026-06-14 17:45
- [x] `src/omega-ui-core/uca/layoutResolver.ts` | Completado: 2026-06-14 17:45
- [x] `src/services/clipboardService.ts` | Completado: 2026-06-14 17:45

- [x] `src/components/ui/audio/AudioControls.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/audio/AudioMetadataGrid.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/audio/AudioPlaylist.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/audio/AudioTrackInfo.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/audio/AudioVisualizer.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/audio/useAudioPlayer.ts` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/AudioShowcase.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/Button.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/CalibrationPanel.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/card/CardFooter.tsx` | Completado: 2026-06-14 15:28
- [x] `src/components/ui/card/CardHeader.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/card/CardImage.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/card/CardSpecs.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/contact/ContactField.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/contact/ContactSuccess.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/contact/MathChallenge.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/contact/useContactForm.ts` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/ContactForm.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/EmulatedComponents.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/gallery/GalleryLightbox.tsx` | Completado: 2026-06-14 15:31
- [x] `src/components/ui/gallery/GalleryThumbnailGrid.tsx` | Completado: 2026-06-14 15:49
- [x] `src/components/ui/GlassPanel.tsx` | Completado: 2026-06-14 15:49
- [x] `src/components/ui/ImageGallery.tsx` | Completado: 2026-06-14 15:49
- [x] `src/components/ui/InspectorNav.tsx` | Completado: 2026-06-14 15:50
- [x] `src/components/ui/InstrumentCard.tsx` | Completado: 2026-06-14 15:50
- [x] `src/components/ui/LocaleSwitcher.tsx` | Completado: 2026-06-14 15:50
- [x] `src/components/ui/SignalPath.tsx` | Completado: 2026-06-14 15:50
- [x] `src/components/ui/SpecsMatrix.tsx` | Completado: 2026-06-14 15:50
- [x] `src/constants/manifest-editor/themes.ts` | Completado: 2026-06-14 15:50
- [x] `src/data/calibration-data.ts` | Completado: 2026-06-14 15:50
- [x] `src/data/instruments/index.ts` | Completado: 2026-06-14 15:55
- [x] `src/data/instruments/junio-601.ts` | Completado: 2026-06-14 15:55
- [x] `src/data/instruments/neuronik.ts` | Completado: 2026-06-14 15:55
- [x] `src/data/instruments/omega.ts` | Completado: 2026-06-14 15:55
- [x] `src/data/instruments/types.ts` | Completado: 2026-06-14 15:55
- [x] `src/data/instruments.ts` | Completado: 2026-06-14 15:55
- [x] `src/features/manifest-editor/components/audit/AuditGuidelines.tsx` | Completado: 2026-06-14 15:55
- [x] `src/features/manifest-editor/components/audit/AuditIssuesList.tsx` | Completado: 2026-06-14 15:55
- [x] `src/features/manifest-editor/components/audit/AuditSummary.tsx` | Completado: 2026-06-14 15:55
- [x] `src/features/manifest-editor/components/audit/InspectionCard.tsx` | Completado: 2026-06-14 15:55
- [x] `src/features/manifest-editor/components/gallery/TemplateGallery.tsx` | Completado: 2026-06-14 16:00
- [x] `src/features/manifest-editor/components/header/SimulationStatusBadge.tsx` | Completado: 2026-06-14 16:08
- [x] `src/features/manifest-editor/components/header/ThemeToggle.tsx` | Completado: 2026-06-14 16:08
- [x] `src/features/manifest-editor/components/help/HelpCodeBlock.tsx` | Completado: 2026-06-14 16:37
- [x] `src/features/manifest-editor/components/help/HelpSectionItem.tsx` | Completado: 2026-06-14 16:37
- [x] `src/features/manifest-editor/components/hub/IndustrialStatusSection.tsx` | Completado: 2026-06-14 16:37
- [x] `src/features/manifest-editor/components/hub/LogicAssetsSection.tsx` | Completado: 2026-06-14 16:38
- [x] `src/features/manifest-editor/components/ingestion/IngestionFileList.tsx` | Completado: 2026-06-14 16:38
- [x] `src/features/manifest-editor/components/inspector/aesthetic/ArchAnchorSelector.tsx` | Completado: 2026-06-14 16:38
- [x] `src/features/manifest-editor/components/inspector/aesthetic/ArchPlaneSelector.tsx` | Completado: 2026-06-14 16:38
- [x] `src/features/manifest-editor/components/inspector/aesthetic/governance/AtmosphericPhysicsGovernance.tsx` | Completado: 2026-06-14 16:38
- [x] `src/features/manifest-editor/components/inspector/aesthetic/governance/ModuleGlobalAesthetics.tsx` | Completado: 2026-06-14 16:39
- [x] `src/features/manifest-editor/components/inspector/aesthetic/governance/RackChassisGovernance.tsx` | Completado: 2026-06-14 16:39
- [x] `src/features/manifest-editor/components/inspector/aesthetic/governance/ThemePaletteGovernance.tsx` | Completado: 2026-06-14 16:39
- [x] `src/features/manifest-editor/components/inspector/aesthetic/styles/library/GuildNavigator.tsx` | Completado: 2026-06-14 16:39
- [x] `src/features/manifest-editor/components/inspector/aesthetic/styles/library/LibraryBatchOps.tsx` | Completado: 2026-06-14 16:40
- [x] `src/features/manifest-editor/components/inspector/aesthetic/styles/library/StyleVariantCard.tsx` | Completado: 2026-06-14 16:40
- [x] `src/features/manifest-editor/components/inspector/aesthetic/styles/ModuleStyleLibrary.tsx` | Completado: 2026-06-14 16:40
- [x] `src/features/manifest-editor/components/inspector/aesthetic/typography/components/AbstractFontMap.tsx` | Completado: 2026-06-14 16:40
- [x] `src/features/manifest-editor/components/inspector/aesthetic/typography/components/FontAssetManager.tsx` | Completado: 2026-06-14 16:41
- [x] `src/features/manifest-editor/components/inspector/aesthetic/typography/components/GlobalFallbackSelector.tsx` | Completado: 2026-06-14 16:41
- [x] `src/features/manifest-editor/components/inspector/aesthetic/typography/ModuleTypography.tsx` | Completado: 2026-06-14 16:41
- [x] `src/features/manifest-editor/components/inspector/AttachmentItem.tsx` | Completado: 2026-06-14 16:41
- [x] `src/features/manifest-editor/components/inspector/attachments/AttachmentCard.tsx` | Completado: 2026-06-14 16:41
- [x] `src/features/manifest-editor/components/inspector/attachments/AttachmentLogicFields.tsx` | Completado: 2026-06-14 16:42
- [x] `src/features/manifest-editor/components/inspector/attachments/AttachmentPrecisionOffsets.tsx` | Completado: 2026-06-14 16:42
- [x] `src/features/manifest-editor/components/inspector/attachments/AttachmentsHeader.tsx` | Completado: 2026-06-14 16:42
- [x] `src/features/manifest-editor/components/inspector/attachments/AttachmentTypeAnchor.tsx` | Completado: 2026-06-14 16:42
- [x] `src/features/manifest-editor/components/inspector/attachments/AttachmentVariantSpec.tsx` | Completado: 2026-06-14 16:42
- [x] `src/features/manifest-editor/components/inspector/BlueprintLibraryPanel.tsx` | Completado: 2026-06-14 16:43
- [x] `src/features/manifest-editor/components/inspector/BlueprintThumbnail.tsx` | Completado: 2026-06-14 16:43
- [x] `src/features/manifest-editor/components/inspector/CellPreview.tsx` | Completado: 2026-06-14 16:43
- [x] `src/features/manifest-editor/components/inspector/CompliancePanel.tsx` | Completado: 2026-06-14 16:43
- [x] `src/features/manifest-editor/components/inspector/container/ContainerCard.tsx` | Completado: 2026-06-14 16:43
- [x] `src/features/manifest-editor/components/inspector/container/ContainerForm.tsx` | Completado: 2026-06-14 16:44
- [x] `src/features/manifest-editor/components/inspector/ContainerSelector.tsx` | Completado: 2026-06-14 16:44
- [x] `src/features/manifest-editor/components/inspector/DiagnosticBlock.tsx` | Completado: 2026-06-14 16:44
- [x] `src/features/manifest-editor/components/inspector/dock/DockIconStrip.tsx` | Completado: 2026-06-14 16:44
- [x] `src/features/manifest-editor/components/inspector/dock/DockInfoPanel.tsx` | Completado: 2026-06-14 16:45
- [x] `src/features/manifest-editor/components/inspector/dock/DockPanel.tsx` | Completado: 2026-06-14 16:45
- [x] `src/features/manifest-editor/components/inspector/dock/DockRackSectionToolbar.tsx` | Completado: 2026-06-14 16:45
- [x] `src/features/manifest-editor/components/inspector/editors/BindSelect.tsx` | Completado: 2026-06-14 16:45
- [x] `src/features/manifest-editor/components/inspector/editors/ButtonEditor.tsx` | Completado: 2026-06-14 16:45
- [x] `src/features/manifest-editor/components/inspector/editors/ColorInput.tsx` | Completado: 2026-06-14 16:46
- [x] `src/features/manifest-editor/components/inspector/editors/CommonFields.tsx` | Completado: 2026-06-14 16:46
- [x] `src/features/manifest-editor/components/inspector/editors/ComponentEditor.tsx` | Completado: 2026-06-14 16:46
- [x] `src/features/manifest-editor/components/inspector/editors/DisplayEditor.tsx` | Completado: 2026-06-14 16:46
- [x] `src/features/manifest-editor/components/inspector/editors/GroupEditor.tsx` | Completado: 2026-06-14 16:47
- [x] `src/features/manifest-editor/components/inspector/editors/index.ts` | Completado: 2026-06-14 16:47
- [x] `src/features/manifest-editor/components/inspector/editors/KnobEditor.tsx` | Completado: 2026-06-14 16:47
- [x] `src/features/manifest-editor/components/inspector/editors/LabelEditor.tsx` | Completado: 2026-06-14 16:47
- [x] `src/features/manifest-editor/components/inspector/editors/LedEditor.tsx` | Completado: 2026-06-14 16:47
- [x] `src/features/manifest-editor/components/inspector/editors/PortEditor.tsx` | Completado: 2026-06-14 16:48
- [x] `src/features/manifest-editor/components/inspector/editors/RackPropertiesEditor.tsx` | Completado: 2026-06-14 16:48
- [x] `src/features/manifest-editor/components/inspector/editors/SliderEditor.tsx` | Completado: 2026-06-14 16:48
- [x] `src/features/manifest-editor/components/inspector/editors/SwitchEditor.tsx` | Completado: 2026-06-14 16:49
- [x] `src/features/manifest-editor/components/inspector/editors/VariantSelect.tsx` | Completado: 2026-06-14 16:49
- [x] `src/features/manifest-editor/components/inspector/fields/fieldDefs.ts` | Completado: 2026-06-14 16:49
- [x] `src/features/manifest-editor/components/inspector/fields/FieldRenderer.tsx` | Completado: 2026-06-14 16:49
- [x] `src/features/manifest-editor/components/inspector/fields/index.ts` | Completado: 2026-06-14 16:49
- [x] `src/features/manifest-editor/components/inspector/HistoryPanel.tsx` | Completado: 2026-06-14 16:49
- [x] `src/features/manifest-editor/components/inspector/layout/HorizontalSplitDivider.tsx` | Completado: 2026-06-14 16:50
- [x] `src/features/manifest-editor/components/inspector/layout/InspectorHeader.tsx` | Completado: 2026-06-14 16:50
- [x] `src/features/manifest-editor/components/inspector/logic/BindingField.tsx` | Completado: 2026-06-14 16:50
- [x] `src/features/manifest-editor/components/inspector/logic/ProtocolFields.tsx` | Completado: 2026-06-14 16:50
- [x] `src/features/manifest-editor/components/inspector/logic/RoleSelector.tsx` | Completado: 2026-06-14 16:50
- [x] `src/features/manifest-editor/components/inspector/ManifestDiffViewer.tsx` | Completado: 2026-06-14 16:51
- [x] `src/features/manifest-editor/components/inspector/ModulationItem.tsx` | Completado: 2026-06-14 16:51
- [x] `src/features/manifest-editor/components/inspector/primitives/DisplayProperties.tsx` | Completado: 2026-06-14 16:51
- [x] `src/features/manifest-editor/components/inspector/primitives/IllustrationProperties.tsx` | Completado: 2026-06-14 16:51
- [x] `src/features/manifest-editor/components/inspector/primitives/KnobProperties.tsx` | Completado: 2026-06-14 16:51
- [x] `src/features/manifest-editor/components/inspector/primitives/LedProperties.tsx` | Completado: 2026-06-14 16:52
- [x] `src/features/manifest-editor/components/inspector/primitives/PortProperties.tsx` | Completado: 2026-06-14 16:52
- [x] `src/features/manifest-editor/components/inspector/primitives/presets.ts` | Completado: 2026-06-14 16:52
- [x] `src/features/manifest-editor/components/inspector/primitives/SelectProperties.tsx` | Completado: 2026-06-14 16:52