# Domain: Renderers Utils
Lógica compartida y cálculos geométricos para el motor de renderizado.

## Utilidades
- [VariantParser.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/utils/VariantParser.ts): Fuente única de verdad para descomponer strings de variante (ej: `B_cyan`) en sus componentes de tamaño y color.
- [CellMetrics.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/utils/CellMetrics.ts): Centraliza el mapa de radios industriales y proporciona funciones de cálculo de dimensiones físicas para asegurar la paridad visual.
- [AttachmentStack.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/utils/AttachmentStack.ts): Orquestador de posicionamiento para accesorios. Gestiona el filtrado por anclaje (top, bottom, etc.) y aplica los offsets industriales de 1.5x.
