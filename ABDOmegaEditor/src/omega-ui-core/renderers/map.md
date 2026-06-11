# Domain: Renderers
Motor de generación de HTML aséptico para el ecosistema OMEGA.

## Orquestadores
- [CellRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/CellRenderer.ts): Punto de entrada principal para renderizar una celda completa del rack.
- [AttachmentRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/AttachmentRenderer.ts): Orquestador de accesorios (labels, LEDs) que orbitan los controles.

## Renderers Atómicos (Primitivas)
- [KnobRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/KnobRenderer.ts): Genera knobs industriales con soporte para assets personalizados y rotación WASM.
- [PortRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/PortRenderer.ts): Jacks de audio/CV con anillos de color dinámicos.
- [LedRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/LedRenderer.ts): Indicadores lumínicos con estados on/off/glow.
- [DisplayRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/DisplayRenderer.ts): Pantallas digitales (OLED/LCD/LED) para visualización de valores.
- [SliderRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/SliderRenderer.ts): Deslizadores horizontales y verticales.
- [StepperRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/StepperRenderer.ts): Botones de incremento/decremento y pulsadores.
- [SelectRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/SelectRenderer.ts): Selectores de lista y menús contextuales.
- [SwitchRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/SwitchRenderer.ts): Conmutadores de palanca o deslizamiento.
- [ScopeRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/ScopeRenderer.ts): Visualizador de formas de onda en tiempo real.
- [TerminalRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/TerminalRenderer.ts): Consola de texto de bajo nivel integrada en el módulo.
- [IllustrationRenderer.ts](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/IllustrationRenderer.ts): Renderizado de gráficos estáticos y decorativos.

## Infraestructura
- [utils/](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/renderers/utils/): Utilidades de cálculo y parseo compartido.
