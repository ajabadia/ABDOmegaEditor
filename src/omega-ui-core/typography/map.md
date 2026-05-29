# OMEGA Typography System — Architecture Map
 
> **Status**: INDUSTRIALIZED (SYS_READY)
> **Standard**: Era 7.2.3 Typography Shield
 
## 1. Overview
The typography system provides a centralized way to manage fonts across the OMEGA ecosystem. It distinguishes between **Protected System Fonts** (always available) and **Custom Module Fonts** (registered per-module).
 
## 2. File Structure
- **registry.ts**: The Single Source of Truth for font names, categories, and theme defaults.
- **fonts.css**: The master CSS file that defines `@font-face` rules for system fonts.
- **fonts/**: Physical font files (`.ttf`, `.woff2`) organized by family.
 
## 3. Governance Rules
1. **Source of Truth**: All font additions must be made in `registry.ts` first.
2. **Protection**: System font names (`Inter`, `Outfit`, `Seven Segment`, `Microgramma`) are reserved and cannot be overridden by modules.
3. **Inheritance**: Components should use the category-based inheritance system (`headings`, `labels`, `displays`, `technical`) instead of hardcoding font names.
