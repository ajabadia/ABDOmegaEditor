# OMEGA Manifest Editor (Era 7.3.0)

Bienvenido al repositorio oficial del **OMEGA Manifest Editor**, una herramienta avanzada de diseño visual y parametrización de manifiestos de módulos para el ecosistema de síntesis modular **OMEGA**.

---

## 🚀 Características Principales

*   **Diseño Visual de Racks**: Ubica, escala y maqueta de forma interactiva Knobs, Jacks, Sliders y pantallas de visualización. Rejilla con precisión industrial alineada al estándar de la marca (5px grid).
*   **Validación de Esquema OMEGA**: Soportes para validación contra los esquemas oficiales JSON de la Era 7.0/7.1/7.2/7.3. Detección automática de inconsistencias antes de la exportación.
*   **Visualización de Grafos WASM**: Renderiza dinámicamente la jerarquía del módulo (Core WASM) mediante un grafo de nodos interactivo.
*   **Guardado Directo Local (File System Access API)**: Vincula tu carpeta local de desarrollo del sintetizador directamente en navegadores compatibles (Chrome, Edge, Opera) y escribe archivos `.acemm` directamente sin descargas manuales.
*   **Watchdog SSE con Hot-Reload**: Sincronización en segundo plano con hot-reload en caliente mediante un servidor watchdog Node.js para flujos de desarrollo local en C++/JUCE/WASM.

---

## 🛠️ Stack Tecnológico

*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
*   **Biblioteca**: [React 19](https://react.dev/)
*   **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/)
*   **Edición**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
*   **Validación**: [Ajv (JSON Schema Validator)](https://ajv.js.org/) & [Zod](https://zod.dev/)
*   **Animaciones**: [Framer Motion](https://www.framer.com/motion/)

---

## 📂 Estructura del Workspace

*   `app/` - Estructura de rutas localizadas (`next-intl`) y páginas del App Router de Next.js.
*   `src/components/` - Controles de UI globales y paneles del workbench.
*   `src/features/manifest-editor/` - Dominio principal del editor (Workbenches, inspectores de propiedades, visualizador de nodos, arrastre de racks).
*   `src/omega-ui-core/` - Sistema de diseño unificado, CSS y widgets analógicos base de OMEGA.
*   `scripts/` - Utilidades para control de calidad, watchdog y auditoría arquitectónica.

---

## 💻 Comenzando

### Requisitos

*   [Node.js](https://nodejs.org/) v20 o superior.
*   Navegador con soporte de File System Access API para vincular directorios locales.

### Instalación

```bash
npm install
```

### Ejecutar en Desarrollo

```bash
npm run dev
```

El editor estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🧪 Auditorías y Certificación

Para asegurar la máxima calidad del código y el cumplimiento estricto de las leyes del ecosistema, dispones de scripts automatizados de validación:

*   **Auditoría Estructural (Architectural Guard)**:
    ```bash
    npm run arch-audit
    ```
*   **Certificación Completa (6 Fases)**:
    ```bash
    npm run full-audit
    ```
    Este comando ejecuta la limpieza de caché, validación de tipos estricta (`tsc`), linteo estricto (`eslint`), verificación de manifiestos críticos y generación de reportes detallados en `docs/`.

---

© 2026 / **OMEGA Labs** / Global Digital Matrix
