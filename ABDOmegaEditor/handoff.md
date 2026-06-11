# OMEGA Manifest Editor - Handoff Briefing (Era 8.0.0)

Este briefing sirve como guía técnica para desarrolladores o agentes de IA que asuman el mantenimiento o desarrollo de este repositorio independiente.

---

## 🏗️ Resumen del Proyecto y Arquitectura

El **OMEGA Manifest Editor** es una SPA reactiva desarrollada sobre Next.js 16 (App Router) y React 19. Su único propósito es la creación, visualización y edición interactiva de manifiestos de configuración de módulos `.acemm` para el motor modular **ABDOmega**.

La separación de la web principal garantiza ciclos de compilación sumamente rápidos y un despliegue aislado en Vercel en la URL oficial de producción [https://abd-omega-editor.vercel.app/](https://abd-omega-editor.vercel.app/) (apuntando al dominio de utilidad definitivo `manifests.ajabadia.es`).

---

## 🔗 Integraciones Críticas y Canales de Datos

1.  **File System Access API (Local Pickers)**:
    *   **Implementación**: [useManifestTransfer.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/hooks/io/useManifestTransfer.ts).
    *   Permite al usuario vincular una carpeta local mediante `window.showDirectoryPicker` para leer y guardar directamente los manifiestos `.acemm` sin intermediación de servidores remotos.
2.  **SSE Watchdog (Sincronización de Host)**:
    *   **Script**: [omega-watchdog.mjs](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/omega-watchdog.mjs).
    *   Un servidor local Node.js ligero que escucha cambios en el sistema de archivos local y actualiza en caliente el editor mediante Server-Sent Events (SSE).
3.  **UI Core (`omega-ui-core`)**:
    *   Ubicado en `src/omega-ui-core/`. Es la biblioteca de diseño analógico compartida que define la apariencia de Knobs, Jacks, Sliders e iluminaciones LED, garantizando consistencia absoluta con el renderizador del sintetizador host.

---

## 📋 Comandos Clave del Ciclo de Vida

*   **Entorno de Desarrollo**:
    ```bash
    npm run dev
    ```
    Inicia el servidor local en [http://localhost:3000](http://localhost:3000).
*   **Auditoría y Certificación Completa**:
    ```bash
    npm run full-audit
    ```
    Limpia caché, valida tipos con TypeScript y ejecuta ESLint y auditorías estructurales antes de desplegar.
*   **Lanzar Watchdog SSE**:
    ```bash
    node omega-watchdog.mjs [ruta_de_los_modulos]
    ```

---

## ⚠️ Consideraciones y Directivas Técnicas

*   **Restricciones de Tipos Strict**:
    *   `exactOptionalPropertyTypes` está habilitado en `tsconfig.json`. Todas las propiedades opcionales en Props o interfaces deben tiparse explícitamente agregando `| undefined` si pueden omitirse (ej. `prop?: type | undefined`).
*   **Tipos Experimentales**:
    *   Debido a que `showDirectoryPicker` y las APIs asociadas no son nativas de la librería estándar `dom` de TS, se realizan castings controlados `(handle as any)` en el flujo de interacción de archivos.
*   **Gobernanza .agent**:
    *   El directorio `.agent` en la raíz contiene las reglas adaptadas del estándar de calidad de `ABDSuite`. Úsalas para guiar a los agentes de IA en las buenas prácticas del proyecto.
*   **Estandarización Estética e Historial Selectivo**:
    *   **Modales**: Todas las ventanas modales de la aplicación deben ceñirse a las dimensiones unificadas de `max-w-7xl` para ancho y `h-full max-h-[850px]` para alto.
    *   **Logs & Live Loop**: La terminal de logs corre de manera asilada en su propio panel del `RightDockContainer.tsx` (con ancho dinámico de 260px) activada desde el manillar lateral de la derecha. El `SimulationStatusBadge` (`LIVE LOOP`) se renderiza de forma centralizada en el `Header.tsx` principal.
    *   **Undo/Redo**: Para evitar ruido en la pila de historial, los cambios de estado de UI pura (como transiciones de paneles, zoom, split) están excluidos de las operaciones semánticas de Undo/Redo. Solo mutaciones de datos del rack son registradas.
    *   **Layout y Multi-Pane Split**: El editor soporta una cuadrícula flexible de 1 a 4 paneles (`primary`, `primary_bottom`, `secondary`, `secondary_bottom`). Cada panel muestra permanentemente las 4 vistas atómicas (`Orbital`, `Rack`, `Source`, `History`), y permite comparaciones lado a lado de la misma vista (ej. dos códigos fuente o dos racks). Las columnas se redimensionan horizontalmente y las filas de forma independiente mediante splitters específicos (`primarySplitRatio` y `secondarySplitRatio`).
    *   **Independencia de Viewports**: El estado de zoom y pan se gestiona a nivel de pestaña individual en cada panel (`useViewport` instanciado localmente dentro de `WorkbenchPane.tsx`). Los cambios se sincronizan a la memoria de la sesión mediante el callback `onCaptureViewState`.
    *   **Aislamiento del Rack HUD**: En la vista de Rack (`VirtualRack.tsx`), los estilos de escala (`zoom`) y traslación (`pan`) se aplican de forma exclusiva al chasis del rack (`RACK_FRAME`), previniendo que afecte a la posición y escala de los botones de modo `ENGINEERING / LIVE` y del menú de planos de cara (`MAIN`, `VOICE`, etc.).
    *   **Gobernanza del Menú Ventana (Window)**: El menú de cabecera `Window` (antes `Ventana`) ofrece accesibilidad completa a todos los paneles del dock derecho. Además, permite desplegar un submenú dinámico para cada sección de propiedades del Rack, con indicadores de verificación (`Check`) sincronizados bidireccionalmente.
    *   **Exportación de renders de Studio**: El generador de renders de alta definición (`MockupModal.tsx`) utiliza `showSaveFilePicker()` para permitir guardar el archivo PNG directamente seleccionando la ubicación de almacenamiento del sistema operativo. Se ha implementado `skipFonts: true` para evitar congelamientos causados por bloqueos de CORS o de red en fuentes web durante la captura del canvas DOM. Además, el botón de exportación se mantiene siempre activo para permitir guardar la previsualización del diseño del rack a pesar de que existan advertencias críticas de gobernanza, las cuales se relegan a un distintivo informativo en la barra inferior.

