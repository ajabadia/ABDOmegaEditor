# OMEGA Manifest Editor - Inventario y Auditoría de Funcionalidades (Usabilidad)

Este documento realiza un análisis metodológico y técnico profundo del workbench del Manifest Editor (Era 7.2.3). Identifica la topología de la interfaz, clasifica cada funcionalidad por su ubicación física, y detalla los hallazgos de **código huérfano (orphan code)** y módulos legacy inactivos en el árbol del proyecto.

---

## 1. Inventario de Funcionalidades por Zona de Interfaz

### A. Cabecera (Header / Toolbar Principal)
Ubicada en la parte superior. Sirve como punto de acceso rápido para control de vista, guardado y sincronización.

| Funcionalidad | Control en UI | Ubicación Lógica | Observaciones / Diagnóstico |
| :--- | :--- | :--- | :--- |
| **Menú Archivo / Edición / Vista / Ayuda** | Desplegables de texto (MenuBar) | Correcta (Estándar de escritorio) | Contiene la mayoría de las acciones pesadas. |
| **Integridad / Diagnósticos de Cumplimiento** | Compliance Badge (Semáforo de cumplimiento) | Correcta | Abre el reporte de conformidad. Duplicado en el menú `Help`. |
| **Selector de Vista Principal** | Botón deslizante (`ViewModeSelector`) | Correcta | Permite alternar entre Orbital, Rack, Source, History. |
| **División de Vista (Split)** | Icono de columnas | Correcta | Permite vista partida (ej. Rack + Código Fuente). |
| **Cambio de Tema (Claro / Oscuro)** | Toggle de icono (Sol/Luna) | Correcta | Control estético directo. |
| **Configuración Global del Módulo** | Botón de engranaje | Correcta | Abre el modal de configuración de metadatos. Duplicado en menú `Edit`. |
| **Consola de Logs (Ver/Ocultar)** | Botón de Terminal con texto | Correcta | Activa el panel inferior de logs. Duplicado en menú `View`. |

### B. Menús Desplegables (MenuBar)
Contiene las acciones de control de archivos, exportación de ingeniería e inicialización de laboratorios.

*   **Menú File (Archivo)**:
    1.  *Link Workspace Folder*: Enlaza carpeta física usando la API File System. (Duplicidad: También aparece en la barra superior si no está enlazado).
    2.  *Load submenu*:
        *   Ingest Module Folder (Carga por lotes).
        *   WASM (Binarios de DSP).
        *   Contract (TypeScript/C++ mappings).
        *   Manifest (.acemm).
        *   Assets (Gráficos/SVGs).
    3.  *Blueprints*: Galería de plantillas rápidas.
    4.  *Save submenu*:
        *   Manifest (.acemm).
        *   OmegaPack (.acepack).
    5.  *Export submenu*:
        *   Industrial CAD Blueprint.
        *   Tech Contract (TS).
        *   Engine Header (C++).
    6.  *Deploy to Engine*: Envío en caliente del manifiesto al motor WASM.
    7.  *Exit*: Salir al portal principal.

*   **Menú Edit (Edición)**:
    1.  *Undo / Redo*: Deshacer/Rehacer histórico. (Duplicidad: Atajos estándar `Ctrl+Z`, `Ctrl+Y`).
    2.  *Document Timeline*: Cambia a la pestaña de historial.
    3.  *Universal Cell Laboratory*: Abre el estudio de celdas aisladas. (Faltante: Acceso directo visual fuera del menú).
    4.  *Module Global Configuration*: Metadatos del módulo. (Duplicidad: Botón de engranaje en cabecera).
    5.  *Generate Studio Render*: Renderizado de imagen mock del módulo.
    6.  *Reset Workspace*: Limpieza total del estado de trabajo.

*   **Menú View (Vista)**:
    1.  *Orbital View*: Pestaña de grafos orbitales.
    2.  *Virtual Rack*: Pestaña de chasis del rack.
    3.  *Source Code*: Pestaña del editor de código Monaco.
    4.  *Toggle Logs Terminal*: Mostrar u ocultar la consola de logs.

*   **Menú Help (Ayuda)**:
    1.  *Engineering Manual*: Manual interactivo vivo.
    2.  *Compliance Report*: Auditoría detallada (Cartilla de Inspección).
    3.  *About OMEGA*: Créditos y versión.

---

## 2. Acciones del Panel Lateral Derecho (Docked Inspector)
El inspector de propiedades interactivo (`WorkbenchInspector.tsx` / `PropertyPanel.tsx`) del elemento seleccionado provee accesos y controles avanzados directamente en la interfaz:

1.  **Essential Identity**:
    *   *CellPreview*: Mini-renderizador en vivo del elemento seleccionado.
    *   *Canonical ID Input*: Entrada de texto con linter de duplicados en caliente.
    *   *Display Label Input*: Nombre visual del control.
2.  **Simulation (Dry-Run)**:
    *   *Start/Stop LFO*: Toggle cliente interactivo para modular controles a 1Hz de forma local (Dry-run).
3.  **Design & Aesthetics**:
    *   *Aesthetic Rules*: Edición de tokens de color, bordes, redondeado, z-index y transparencias.
    *   *Mechanical Specs & Faceplate*: Asignación de tornillos, guías y fondos texturizados (skins).
4.  **Logic & Ports / Architecture**:
    *   *Binding inputs*: Vinculación directa con IDs de puertos del contrato DSP.
    *   *Universal Signal Port editor*: Gestión de la dirección (In/Out) y tipo de señal (audio, CV, MIDI).
5.  **System Diagnostics**:
    *   *Diagnostics table*: Monitor de latencia RPC, estatus del watchdog y estados del lock de escritura de sesión.

---

## 3. Acciones en Modales Co-existentes

1.  **AuditModal (Cartilla de Conformidad)**: Muestra la lista de violaciones y advertencias de diseño. Al hacer clic en un issue, el navegador de auditoría auto-selecciona el elemento conflictivo y enfoca la vista necesaria.
2.  **GlobalGovernanceModal**: Configuración global del instrumento (nombre, versión, dimensiones del chasis, rieles de alimentación, HP).
3.  **UniversalCellEditorModal**: Creador y guardado rápido de plantillas de celda en la biblioteca local.
4.  **ManifestDiffModal**: Línea de tiempo de versiones (Time-travel) que permite comparar diferencias visuales línea por línea y realizar rollbacks controlados.

---

## 4. Auditoría y Estado de Limpieza del Código Muerto

Siguiendo la metodología estricta del proyecto, hemos clasificado y gestionado el código inactivo de la siguiente manera:

### ✅ A. CÓDIGO ELIMINADO (Reemplazado por funciones nuevas)
Los siguientes archivos han sido eliminados físicamente del espacio de trabajo porque sus funciones fueron asumidas por código moderno y eficiente:
1.  **Antiguo Editor YAML**:
    *   `SourceViewer.tsx` (viewport)
    *   `SourceHeader.tsx` (source)
    *   `SourceCodeBlock.tsx` (source)
    *   `useSourceEditor.ts` (hook)
    *   *Reemplazo*: `SourceView.tsx` (Monaco JSON Editor con esquema integrado de validación, mapeo de diagnósticos y saltos de línea).
2.  **Sidebar Izquierdo Legacy**:
    *   `WorkbenchSidebar.tsx` (layout)
    *   `ModuleHub.tsx` (layout)
    *   *Reemplazo*: Los controles de ingesta se movieron a `MenuBar`, la telemetría y diagnóstico al `AboutModal`, y el watchdog al Footer.
3.  **Hooks Redundantes**:
    *   `usePropertyPanel.ts` (*Reemplazo*: Acordeón vertical nativo en `PropertyPanel.tsx`).
    *   `useTransaction.ts` (*Reemplazo*: Mapeo de transacciones directo en `useManifestEditor.ts`).

### 📦 B. CÓDIGO CONSERVADO (Inactivo / Desconectado — Para análisis)
Los siguientes archivos **no han sido eliminados** debido a que no cuentan con un reemplazo funcional moderno, y representan módulos valiosos que deben ser re-evaluados:

#### 1. Estudio de Render Fotorrealista (`MockupModal.tsx` y su suite)
*   **Archivos**: `MockupModal.tsx` (modals) y la carpeta `components/mockup/` conteniendo `MockupHeader.tsx`, `MockupFooter.tsx`, `MockupViewport.tsx`, `MockupLoading.tsx`.
*   **Estado**: Desactivado y comentado en `EditorModals.tsx`.
*   **Función**: Captura y exportación de previsualizaciones del rack con simulación de iluminación física y sombras.
*   **Diagnóstico**: Funcionalidad inconclusa o inestable. Se conserva para decidir si se refactoriza o se reactiva en el futuro.

#### 2. Laboratorio Aislado de Celdas (`CellStudioContainer.tsx` y su suite)
*   **Archivos**: `CellStudioContainer.tsx` (lab), `AssetBehaviorPresetSelector.tsx` (lab), `BehaviorMappingInspector.tsx` (lab) y `LayerRecipeEditor.tsx` (lab).
*   **Estado**: **Totalmente desconectado**. El componente existe, pero la acción `actions.setStudioMode(true)` nunca es llamada desde ningún botón o menú del editor.
*   **Función**: Prototipado y edición visual aislada de celdas con recetas de capas y mapeo de animaciones.
*   **Diagnóstico**: El botón *"Universal Cell Laboratory"* en el menú `Edit` debería abrir este entorno de laboratorio aislado, pero actualmente está configurado para abrir el modal simple `UniversalCellEditorModal`. Es un vacío de usabilidad crítico.
