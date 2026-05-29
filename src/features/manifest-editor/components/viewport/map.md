# Domain: Viewport
Motores de visualización y representación del módulo.

## Componentes
- [WorkbenchViewport.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/viewport/WorkbenchViewport.tsx): Orquestador de la vista principal. Gestiona la transición entre los modos Orbital, Rack y Source, y controla el zoom/pan global.
- [VirtualRack.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/viewport/VirtualRack.tsx): Motor de renderizado tipo chasis industrial. Representa el módulo con física de rack, tornillería y cables de modulación.
- [NodeCanvas.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/viewport/NodeCanvas.tsx): Visualizador de nodos orbitales. Representa la estructura lógica del módulo y sus parámetros WASM como un grafo interactivo.
- [SourceViewer.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/viewport/SourceViewer.tsx): Editor de código integrado para la manipulación directa del manifiesto JSON.
- [ViewportControls.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/viewport/ViewportControls.tsx): HUD flotante con herramientas de navegación (Zoom, Reset, Fit-to-Screen).
