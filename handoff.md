# OMEGA Manifest Editor - Handoff Briefing (Era 7.3.0)

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
