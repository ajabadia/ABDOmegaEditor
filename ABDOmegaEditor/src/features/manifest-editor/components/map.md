# OMEGA Manifest Editor — Root Topology
Este directorio es el núcleo del workbench de ingeniería para el ecosistema OMEGA Era 7.2.3.

## Entry Point
- [WorkbenchContainer.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/WorkbenchContainer.tsx): El "Cerebro" del editor. Orquestador de primer nivel que gestiona el estado global, la comunicación con los hooks de lógica y la sincronización aséptica del manifiesto.

## Dominios de Arquitectura
- [layout/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/layout/): Pilares estructurales del workbench (Header, Sidebar, Footer, Consola).
- [viewport/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/viewport/): Motores de renderizado visual (Rack Virtual, Mapa Orbital, Editor de Código).
- [inspector/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/): Panel de propiedades detallado y secciones de edición técnica.
- [modals/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/modals/): Diálogos de alto nivel y wizards de procesos (Auditoría, Ingesta, Mockup).
- [shared/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/shared/): Componentes transversales y utilidades de bajo nivel.
- [audit/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/audit/): Lógica y visualización del sistema de cumplimiento normativo.
- [modulation/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/modulation/): Matriz de ruteo de señales internas.
- [rack/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/rack/): Primitivas y lógica física del chasis industrial.
- [orbital/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/orbital/): Nodos y visualización del grafo de parámetros WASM.
- [header/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/header/): Componentes específicos de la barra superior.
- [hub/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/hub/): Secciones del centro de control lateral.
- [primitives/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/primitives/): Elementos UI base (Knobs, Sliders, Ports) con estética Pro.

---
*Estado: SYS_READY | Versión: Era 7.2.3*
