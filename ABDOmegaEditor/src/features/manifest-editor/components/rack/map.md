# Domain: Rack
Primitivas físicas y lógica de visualización del chasis industrial.

## Componentes
- [RackContainer.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/rack/RackContainer.tsx): Marco físico de sub-unidades. Gestiona el renderizado de paneles y el estado colapsable.
- [RackEntity.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/rack/RackEntity.tsx): Representación física de un componente (Knob, Slider, Port) en el rack. Gestiona la interacción directa y el feedback visual.
- [RackScrews.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/rack/RackScrews.tsx): Elemento estético de tornillería industrial que refuerza la paridad visual Era 7.2.3.
- [RackHUD.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/rack/RackHUD.tsx): Capa de información superpuesta al rack (Tabs de navegación, Toggle de Live Mode).
- [ModulationCables.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/rack/ModulationCables.tsx): Motor de renderizado de cables físicos para la visualización de ruteos internos.
- [SignalInjector.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/rack/SignalInjector.tsx): Herramienta de pruebas para inyectar valores en tiempo real a los parámetros WASM.
