# Domain: Inspector / Aesthetic
Componentes específicos para la gestión de la física, tipografía y estilos industriales del módulo.

## Architectural Selectors
- [ArchPlaneSelector.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/aesthetic/ArchPlaneSelector.tsx): Selector de plano de renderizado (Front, Panel, Internal).
- [ArchAnchorSelector.tsx](file:///d:/desarrollos\ABDSynthsWeb\abd-ia_synths\src\components\tools\manifest-editor\inspector\aesthetic\ArchAnchorSelector.tsx): Gestión de puntos de anclaje para la alineación de componentes.

## Governance
- [governance/ModuleGlobalAesthetics.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/aesthetic/governance/ModuleGlobalAesthetics.tsx): Orquestador de la física atmosférica, iluminación y paleta funcional global.

## Typography
- [typography/ModuleTypography.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/aesthetic/typography/ModuleTypography.tsx): Consola de gobernanza tipográfica atómica.
    - `components/FontAssetManager.tsx`: Registro de recursos (.ttf/.woff).
    - `components/AbstractFontMap.tsx`: Mapeo de punteros abstractos (Font A, B...).
    - `components/GlobalFallbackSelector.tsx`: Selector de fallback global.

## Styles
- [styles/ModuleStyleLibrary.tsx](file:///d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/components/tools/manifest-editor/inspector/aesthetic/styles/ModuleStyleLibrary.tsx): Librería de variantes estéticas industriales por gremios.
    - `library/GuildNavigator.tsx`: Navegación por gremios industriales.
    - `library/StyleVariantCard.tsx`: Unidad atómica de variante de estilo.
    - `library/LibraryBatchOps.tsx`: Operaciones JSON en lote.
