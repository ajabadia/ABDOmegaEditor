# Domain: Inspector
Gestión de propiedades y edición detallada de entidades. Arquitectura Era 7.2.3.

## Orquestadores (Root)
- [WorkbenchInspector.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/WorkbenchInspector.tsx): Orquestador del panel lateral derecho. Controla la visibilidad y anima la entrada/salida del inspector.
- [PropertyPanel.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/PropertyPanel.tsx): El panel de control principal. Distribuye la edición en secciones lógicas y proporciona la navegación interna del inspector.

## Estructura de Directorios
- [sections/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/sections/map.md): Orquestadores de pestañas y secciones funcionales.
- [primitives/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/primitives/map.md): Editores de propiedades específicos para cada tipo de componente (Knobs, Leds, Ports, etc).
- [shared/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/shared/map.md): Componentes transversales y consola de gobernanza industrial.
- [identity/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/identity/map.md): Gobernanza de marca, skins y taxonomía.
- [logic/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/logic/map.md): Vinculación WASM y protocolos.
- [attachments/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/attachments/map.md): Gestión de accesorios visuales.
- [layout/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/layout/map.md): Estructura visual del panel.
- [aesthetic/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/aesthetic/map.md): Gestión de planos arquitectónicos.

## Componentes de Apoyo (Root)
- [CellPreview.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/CellPreview.tsx): Miniatura interactiva de la entidad.
- [ArchPreview.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/ArchPreview.tsx): Previsualización de la arquitectura de slots.
- [ModulationItem.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/ModulationItem.tsx): Editor individual de ruteo de modulación.
- [AttachmentItem.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/AttachmentItem.tsx): Editor individual de fragmentos visuales.
