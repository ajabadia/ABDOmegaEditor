/**
 * @purpose Gestiona y aplica estilos visuales para nodos en el editor de manifesto OMEGA, asegurando consistencia temática a través de una cadena de resolución trilateral.
 * @purpose_en ** Manages and applies visual styles for nodes in the OMEGA manifest editor, ensuring theme consistency across components through a three-level resolution chain.
 * @refactorable ** true (contains too many state variables and UI parts)
 * @classification ** Business Service
 * @complexity ** Medium
 * @fingerprint exports:15,imports:2,sig:sy6k9f
 * @lastUpdated 2026-06-15T16:56:05.612Z
 */

/**
 * OMEGA Style Resolver (Era 9.2.0-dev)
 * 
 * Implements the 3-level resolution chain for the Self-Contained Manifest:
 *   1. node.style.variant → manifest.ui.styles[cellRef][variant].aesthetics
 *   2. token → hex via manifest.ui.palette
 *   3. size letter → pixel via manifest.ui.sizes
 * 
 * Fallback: defaults to "default" variant if specified variant not found.
 */

import type { OmegaNode, OMEGA_Manifest, OmegaStyleNode, StyleVariant, OMEGA_Asset } from '../types/manifest';
import { ColorResolver } from './ColorResolver';

export interface ResolvedNodeStyle {
  /** The fully resolved style object with all tokens converted to hex */
  style: Partial<OmegaStyleNode>;
  /** Which variant was used for resolution */
  variant: string;
  /** Which cellRef (component type) was used for lookup */
  cellRef: string;
}

/**
 * Resolve a node's visual style following the 3-level chain:
 * 
 * 1. Look up node.style.variant in manifest.ui.styles[cellRef]
 * 2. Merge per-node style overrides on top
 * 3. Resolve all color tokens against manifest.ui.palette
 * 4. Resolve size letters against manifest.ui.sizes
 * 
 * @returns A fully resolved style object with hex colors and pixel sizes
 */
export function resolveNodeStyle(
  node: OmegaNode,
  manifest?: OMEGA_Manifest
): ResolvedNodeStyle {
  const cellRef = node.cellRef || node.kind || 'knob';
  const variant = node.style?.variant || 'default';
  
  // Level 1: Get global styles for this component type + variant
  const stylesByType = manifest?.ui?.styles?.[cellRef] || [];
  
  // Look up exact variant first, fall back to "default" variant
  const baseStyle: Partial<OmegaStyleNode> =
    stylesByType.find((s: StyleVariant) => s.id === variant)?.aesthetics ||
    stylesByType.find((s: StyleVariant) => s.id === 'default')?.aesthetics ||
    {};
  
  // Level 2: Merge per-node style on top of global style
  // Node style takes precedence over global style
  const mergedStyle: Partial<OmegaStyleNode> = {
    ...baseStyle,
    ...(node.style || {}),
  };
  
  // Level 3: Resolve color tokens against palette
  const resolvedStyle = ColorResolver.resolveStyle(mergedStyle, manifest);
  
  return {
    style: resolvedStyle,
    variant,
    cellRef,
  };
}

/**
 * Resolve a single size letter (A, B, C, D) to pixel value from manifest.ui.sizes.
 * Falls back to provided default if letter not found in sizes map.
 */
export function resolveSize(
  sizeCode: string | undefined,
  manifest?: OMEGA_Manifest,
  fallback = 24
): number {
  if (!sizeCode) return fallback;
  const sizes = (manifest?.ui?.sizes || {}) as Record<string, number | undefined>;
  return sizes[sizeCode] ?? fallback;
}

/**
 * Convenience: get the resolved color for a token from the manifest palette.
 */
export function resolveColor(
  color: string | undefined,
  manifest?: OMEGA_Manifest,
  fallback = 'transparent'
): string {
  return ColorResolver.resolve(color, manifest) || fallback;
}

// ─── Distill Pipeline: Expansion & Contraction ───────────────────────

/**
 * Expand a node's style: ensures style.variant is set (defaults to "default").
 * This guarantees that every node participates in the 3-level resolution chain.
 *
 * - If node.style exists but has no variant → adds variant: "default"
 * - If node.style doesn't exist → creates { variant: "default" }
 *
 * Returns a new node object (no mutation).
 */
export function expandNodeStyle(
  node: OmegaNode,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _manifest?: OMEGA_Manifest
): OmegaNode {
  if (!node.style) {
    return { ...node, style: { variant: 'default' } };
  }
  if (!node.style.variant) {
    return { ...node, style: { ...node.style, variant: 'default' } };
  }
  return node;
}

/**
 * Contract a node's style: removes the `style` field entirely if its
 * values match the default variant for that component type.
 *
 * "Match" means: every property in node.style exists with the same value
 * in the default variant's aesthetics, AND node.style has no extra
 * properties beyond variant + what the default provides.
 *
 * Returns a new node object (no mutation).
 */
export function contractNodeStyle(
  node: OmegaNode,
  manifest?: OMEGA_Manifest
): OmegaNode {
  if (!node.style) return node;

  const cellRef = node.cellRef || node.kind || 'knob';
  const stylesByType = manifest?.ui?.styles?.[cellRef] || [];
  const defaultAesthetics = stylesByType.find((s: StyleVariant) => s.id === 'default')?.aesthetics;

  // No default defined → keep the style (can't determine equivalence)
  if (!defaultAesthetics) return node;

  // Extract node style without variant (variant is a selector, not a value)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _variant, ...nodeStyleValues } = node.style;

  // If node has no style values beyond variant → safe to remove
  if (Object.keys(nodeStyleValues).length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { style: _removed, ...rest } = node;
    return rest as OmegaNode;
  }

  // Check if all node style properties match the default aesthetics
  for (const [key, value] of Object.entries(nodeStyleValues)) {
    if (!(key in defaultAesthetics)) {
      // Property doesn't exist in default → custom override, keep style
      return node;
    }
    if ((defaultAesthetics as Record<string, unknown>)[key] !== value) {
      // Value differs from default → custom override, keep style
      return node;
    }
  }

  // All properties match default → safe to remove style
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { style: _removed, ...rest } = node;
  return rest as OmegaNode;
}

/**
 * Walk an array of OmegaNode (tree) and apply `contractNodeStyle` to every node.
 * Recursively processes children.
 *
 * Returns a new array of nodes (no mutation).
 */
function walkAndContract(
  nodes: OmegaNode[],
  manifest?: OMEGA_Manifest
): OmegaNode[] {
  return nodes.map((node) => {
    const contracted = contractNodeStyle(node, manifest);
    if (contracted.children && contracted.children.length > 0) {
      return {
        ...contracted,
        children: walkAndContract(contracted.children, manifest),
      };
    }
    return contracted;
  });
}

/**
 * Contract an entire manifest: traverses the canonical tree (nodes[] or ui.tree)
 * and applies `contractNodeStyle` to every node.
 *
 * Returns a new manifest object (no mutation).
 * The manifest.ui.styles section is left untouched — pruning of unused
 * types/variants belongs to Paso 6.
 */
export function contractManifest(
  manifest: OMEGA_Manifest
): OMEGA_Manifest {
  // Contract the main nodes array
  const nodes = manifest.nodes ? walkAndContract(manifest.nodes, manifest) : undefined;

  // Contract ui.tree if present
  const tree = manifest.ui?.tree
    ? contractNodeStyle(manifest.ui.tree, manifest)
    : undefined;

  // If tree has children, walk them too
  const finalTree = tree && tree.children
    ? { ...tree, children: walkAndContract(tree.children, manifest) }
    : tree;

  return {
    ...manifest,
    ...(nodes ? { nodes } : {}),
    ...(finalTree
      ? { ui: { ...manifest.ui, tree: finalTree } }
      : {}),
  };
}

// ─── Distill Pipeline: Pruning ─────────────────────────────────────

/**
 * Collect which component types and variants are actually used in a tree.
 * Walks recursively through all nodes and their children.
 */
function collectStyleUsage(nodes: OmegaNode[]): Map<string, Set<string>> {
  const usage = new Map<string, Set<string>>();

  function walk(node: OmegaNode) {
    const cellRef = node.cellRef || node.kind || 'knob';
    const variant = node.style?.variant || 'default';

    if (!usage.has(cellRef)) {
      usage.set(cellRef, new Set());
    }
    usage.get(cellRef)!.add(variant);

    if (node.children) {
      node.children.forEach(walk);
    }
  }

  nodes.forEach(walk);
  return usage;
}

/**
 * Prune unused styles from a manifest.
 *
 * 1. Scans the canonical tree (nodes[] and ui.tree) to find which
 *    component types and variants are actually in use.
 * 2. Removes `manifest.ui.styles` entries for component types that
 *    have zero nodes in the tree.
 * 3. Within used types, removes variants whose `id` is not referenced
 *    by any node.
 *
 * @note The **"default"** variant is NEVER pruned, even if no node
 *       references it explicitly, because the 3-level resolution chain
 *       always falls back to it.
 *
 * Returns a new manifest object (no mutation).
 */
export function pruneUnusedStyles(
  manifest: OMEGA_Manifest
): OMEGA_Manifest {
  const styles = manifest.ui?.styles;
  if (!styles || Object.keys(styles).length === 0) {
    return manifest;
  }

  // 1. Collect usage from both nodes[] and ui.tree
  const usage = new Map<string, Set<string>>();

  if (manifest.nodes) {
    const fromNodes = collectStyleUsage(manifest.nodes);
    for (const [type, variants] of fromNodes) {
      if (!usage.has(type)) usage.set(type, new Set());
      variants.forEach((v) => usage.get(type)!.add(v));
    }
  }
  if (manifest.ui?.tree) {
    const fromTree = collectStyleUsage([manifest.ui.tree]);
    for (const [type, variants] of fromTree) {
      if (!usage.has(type)) usage.set(type, new Set());
      variants.forEach((v) => usage.get(type)!.add(v));
    }
  }

  // If usage is empty (e.g. empty/legacy manifest), preserve all styles
  if (usage.size === 0) {
    return manifest;
  }

  // 2-3. Prune: keep only used types and their referenced variants
  const prunedStyles: Record<string, StyleVariant[]> = {};

  for (const [type, variants] of Object.entries(styles)) {
    // Skip entire type if no node uses it
    if (!usage.has(type)) {
      continue;
    }

    const usedVariants = usage.get(type)!;
    // Always keep "default" — it is the resolution fallback
    const keep = variants.filter(
      (v) => v.id === 'default' || usedVariants.has(v.id)
    );

    if (keep.length > 0) {
      prunedStyles[type] = keep;
    }
  }

  return {
    ...manifest,
    ui: {
      ...manifest.ui,
      styles: prunedStyles,
    },
  };
}

// ─── Distill Pipeline: Fossilization ──────────────────────────────

/**
 * Canonical palette keys that must always be present in a self-contained manifest.
 * Values match ColorResolver.defaults (Era 7.2.3).
 */
const CANONICAL_PALETTE_KEYS: Record<string, string> = {
  primary: '#00f2ff',
  secondary: '#ff8c00',
  utility: '#a0a0a0',
  feedback: '#32cd32',
  surface: '#121416',
  hardware: '#777777',
  chassis: '#1a1a1a',
  text: '#ffffff',
  glow: '#00f2ff',
  glass: 'rgba(255,255,255,0.05)',
  warning: '#ff3300',
  highlight: '#ffffff',
  weak: '#555555',
};

/**
 * Default typography to inject when the manifest has none.
 */
const DEFAULT_TYPOGRAPHY = {
  defaultFont: 'Inter',
  definitions: [
    { id: 'default', label: 'Default', family: 'Inter' },
    { id: 'technical', label: 'Technical', family: 'JetBrains Mono' },
  ],
};

/**
 * Fossilize (aplanar) legacy style fallbacks into the manifest so that
 * the output is fully self-contained and requires no external theme
 * database (OMEGA_THEMES, CSS variables, or JS defaults).
 *
 * **Phase 1 — Paleta**: Ensures `manifest.ui.palette` contains all
 * canonical color tokens. User-provided values take precedence.
 *
 * **Phase 2 — Aesthetics**: Runs every variant's `aesthetics` through
 * `ColorResolver.resolveStyle()`, converting any token reference
 * (e.g. `"primary"`) to its physical hex value.
 *
 * **Phase 3 — Node styles**: Walks `nodes[]` and `ui.tree`, resolving
 * every node's `style` through `ColorResolver.resolveStyle()`.
 *
 * **Phase 4 — Sizes**: Ensures `manifest.ui.sizes` has entries for
 * A/B/C/D (defaults 24/18/12/9 px).
 *
 * **Phase 5 — Tipografía**: Ensures `manifest.ui.typography` has a
 * `defaultFont` (falls back to `'Inter'`).
 *
 * Returns a new manifest object (no mutation).
 */
export function fossilizeLegacyStyles(
  manifest: OMEGA_Manifest
): OMEGA_Manifest {
  // ─── 1. Palette — merge defaults with user values ──────────────
  const existingPalette = (manifest.ui?.palette || {}) as Record<string, string | undefined>;
  const existingColors = (manifest.ui?.colors || {}) as Record<string, string | undefined>;
  const mergedPalette: Record<string, string> = { ...CANONICAL_PALETTE_KEYS };

  for (const [key, value] of Object.entries(existingPalette)) {
    if (value) mergedPalette[key] = value;
  }
  for (const [key, value] of Object.entries(existingColors)) {
    if (value) mergedPalette[key] = value;
  }

  // Build a pseudo-manifest with the merged palette for resolution
  const resolveManifest: OMEGA_Manifest = {
    ...manifest,
    ui: { ...manifest.ui, palette: mergedPalette },
  };

  // ─── 2. Fossilize style variant aesthetics ─────────────────────
  const styles = manifest.ui?.styles;
  let fossilizedStyles: Record<string, StyleVariant[]> | undefined;

  if (styles && Object.keys(styles).length > 0) {
    fossilizedStyles = {};
    for (const [type, variants] of Object.entries(styles)) {
      if (!variants || variants.length === 0) continue;
      fossilizedStyles[type] = variants.map((v: StyleVariant) => ({
        ...v,
        aesthetics: ColorResolver.resolveStyle(
          v.aesthetics as Record<string, unknown>,
          resolveManifest
        ) as Partial<OmegaStyleNode>,
      }));
    }
  }

  // ─── 3. Fossilize node styles (walk tree) ─────────────────────
  function fossilizeNode(node: OmegaNode): OmegaNode {
    if (!node.style) {
      return node.children
        ? { ...node, children: node.children.map(fossilizeNode) }
        : node;
    }
    const fossilized = ColorResolver.resolveStyle(
      node.style as Record<string, unknown>,
      resolveManifest
    ) as Partial<OmegaStyleNode>;
    return {
      ...node,
      style: fossilized,
      ...(node.children
        ? { children: node.children.map(fossilizeNode) }
        : {}),
    };
  }

  const nodes = manifest.nodes
    ? manifest.nodes.map(fossilizeNode)
    : undefined;

  // ─── 4. Sizes ──────────────────────────────────────────────────
  const existingSizes = (manifest.ui?.sizes || {}) as Record<string, number | undefined>;
  const mergedSizes: Record<string, number> = {
    A: 24,
    B: 18,
    C: 12,
    D: 9,
    ...existingSizes,
  };

  // ─── 5. Typography ─────────────────────────────────────────────
  const existingTypo = manifest.ui?.typography;
  const finalTypography = existingTypo?.defaultFont
    ? existingTypo
    : DEFAULT_TYPOGRAPHY;

  // ─── Build result ───────────────────────────────────────────────
  const uiUpdates: Record<string, unknown> = {
    palette: mergedPalette,
    sizes: mergedSizes,
    typography: finalTypography,
  };
  if (fossilizedStyles) uiUpdates.styles = fossilizedStyles;

  const result: OMEGA_Manifest = {
    ...manifest,
    ...(nodes ? { nodes } : {}),
    ui: { ...manifest.ui, ...uiUpdates },
  };

  // If tree was fossilized, apply tree separately to avoid ui double-spread
  if (manifest.ui?.tree) {
    result.ui = { ...result.ui, tree: fossilizeNode(manifest.ui.tree) };
  }

  return result;
}

/**
 * Distill a manifest: chains fossilizeLegacyStyles -> contractManifest -> pruneUnusedStyles -> pruneUnusedAssets
 */
export function distillManifest(manifest: OMEGA_Manifest): OMEGA_Manifest {
  return pruneUnusedAssets(pruneUnusedStyles(contractManifest(fossilizeLegacyStyles(manifest))));
}

export interface UnusedResources {
  unusedStyles: { type: string; variantId: string }[];
  unusedAssets: string[];
}

/**
 * Detects all unused style variants and assets in the manifest.
 */
export function getUnusedStylesAndAssets(manifest: OMEGA_Manifest): UnusedResources {
  const usedTypes = new Set<string>();
  const usedVariants = new Map<string, Set<string>>();
  const usedAssets = new Set<string>();

  // 1. Scan tree/nodes
  function walk(node: OmegaNode) {
    const cellRef = node.cellRef || node.kind || 'knob';
    const variant = node.style?.variant || 'default';
    usedTypes.add(cellRef);
    if (!usedVariants.has(cellRef)) {
      usedVariants.set(cellRef, new Set());
    }
    usedVariants.get(cellRef)!.add(variant);

    if (node.style?.asset) usedAssets.add(node.style.asset);
    if (node.style?.backgroundAsset) usedAssets.add(node.style.backgroundAsset);
    if ('asset' in node && typeof (node as { asset?: unknown }).asset === 'string') {
      usedAssets.add((node as { asset: string }).asset);
    }

    if (node.children) {
      node.children.forEach(walk);
    }
  }

  if (manifest.nodes) {
    manifest.nodes.forEach(walk);
  }
  if (manifest.ui?.tree) {
    walk(manifest.ui.tree);
  }

  // 2. Scan faceplate
  const faceplate = manifest.ui?.faceplate;
  if (typeof faceplate === 'string') {
    usedAssets.add(faceplate);
  } else if (faceplate && typeof faceplate === 'object') {
    if (faceplate.asset) usedAssets.add(faceplate.asset as string);
    if (faceplate.texture) usedAssets.add(faceplate.texture as string);
  }

  // 3. Scan hardware
  const hardware = manifest.ui?.hardware;
  if (hardware && typeof hardware === 'object') {
    const screwMapping = (hardware as Record<string, unknown>).screwMapping;
    if (Array.isArray(screwMapping)) {
      screwMapping.forEach(asset => {
        if (typeof asset === 'string') usedAssets.add(asset);
      });
    }
  }

  // 4. Scan ui.styles
  const styles = manifest.ui?.styles || {};
  const unusedStyles: { type: string; variantId: string }[] = [];

  for (const [type, variants] of Object.entries(styles)) {
    if (!usedTypes.has(type)) {
      // All variants are unused
      variants.forEach(v => {
        if (v.id !== 'default') {
          unusedStyles.push({ type, variantId: v.id });
        }
      });
    } else {
      const typeVariants = usedVariants.get(type)!;
      variants.forEach(v => {
        if (v.id !== 'default' && !typeVariants.has(v.id)) {
          unusedStyles.push({ type, variantId: v.id });
        }
      });
    }
  }

  // Now, collect assets used by the kept styles to make sure we don't prune them
  for (const [type, variants] of Object.entries(styles)) {
    variants.forEach(v => {
      const isUnused = !usedTypes.has(type) || (v.id !== 'default' && !usedVariants.get(type)!.has(v.id));
      if (!isUnused) {
        if (v.aesthetics?.asset) usedAssets.add(v.aesthetics.asset);
        if (v.aesthetics?.texture) usedAssets.add(v.aesthetics.texture as string);
      }
    });
  }

  // 5. Compare with manifest.resources.assets
  const currentAssets = manifest.resources?.assets || [];
  const unusedAssets: string[] = [];
  currentAssets.forEach(asset => {
    if (!usedAssets.has(asset.id)) {
      unusedAssets.push(asset.id);
    }
  });

  return { unusedStyles, unusedAssets };
}

export interface SubtreeResources {
  /** Filtered styles — only types and variants used by the subtree */
  styles: Record<string, StyleVariant[]>;
  /** Filtered assets — only assets referenced by the subtree */
  assets: OMEGA_Asset[];
}

/**
 * Extract the minimal set of styles and assets required by a specific subtree.
 *
 * Walks `rootNode` recursively to detect which component types, style variants,
 * and asset IDs are in use, then filters the manifest's global `ui.styles` and
 * `resources.assets` to return only what the subtree needs.
 *
 * The **"default"** variant is always preserved, since the 3-level resolution
 * chain falls back to it even when no node references it explicitly.
 *
 * Pure function — no mutation.
 */
export function extractSubtreeResources(
  rootNode: OmegaNode,
  manifest: OMEGA_Manifest
): SubtreeResources {
  // ── 1. Walk subtree to collect usage ────────────────────────────
  const usedTypes = new Set<string>();
  const usedVariants = new Map<string, Set<string>>();
  const usedAssetIds = new Set<string>();

  function walk(node: OmegaNode) {
    const cellRef = node.cellRef || node.kind || 'knob';
    const variant = node.style?.variant || 'default';
    usedTypes.add(cellRef);

    if (!usedVariants.has(cellRef)) {
      usedVariants.set(cellRef, new Set());
    }
    usedVariants.get(cellRef)!.add(variant);

    // Collect asset references from style
    if (node.style?.asset) usedAssetIds.add(node.style.asset);
    if (node.style?.backgroundAsset) usedAssetIds.add(node.style.backgroundAsset);
    // Also check node-level asset (some structures store it at top level)
    if ('asset' in node && typeof (node as { asset?: unknown }).asset === 'string') {
      usedAssetIds.add((node as { asset: string }).asset);
    }

    if (node.children) {
      node.children.forEach(walk);
    }
  }

  walk(rootNode);

  // ── 2. Filter ui.styles ─────────────────────────────────────────
  const allStyles = manifest.ui?.styles || {};
  const prunedStyles: Record<string, StyleVariant[]> = {};

  for (const [type, variants] of Object.entries(allStyles)) {
    // Skip entire type if no node in the subtree uses it
    if (!usedTypes.has(type)) continue;

    const typeVariants = usedVariants.get(type)!;
    // Always keep "default" variant (resolution fallback)
    const keep = variants.filter(
      (v) => v.id === 'default' || typeVariants.has(v.id)
    );

    if (keep.length > 0) {
      prunedStyles[type] = keep;
    }
  }

  // ── 3. Also collect assets referenced by kept style variants ────
  for (const variants of Object.values(prunedStyles)) {
    for (const v of variants) {
      if (v.aesthetics?.asset) usedAssetIds.add(v.aesthetics.asset);
      if (v.aesthetics?.texture) usedAssetIds.add(v.aesthetics.texture as string);
    }
  }

  // ── 4. Filter resources.assets ──────────────────────────────────
  const allAssets = manifest.resources?.assets || [];
  const prunedAssets = allAssets.filter((a) => usedAssetIds.has(a.id));

  return {
    styles: prunedStyles,
    assets: prunedAssets,
  };
}

/**
 * Prunes the specified unused asset IDs from the manifest.
 */
export function pruneUnusedAssets(manifest: OMEGA_Manifest, unusedAssetIds?: string[]): OMEGA_Manifest {
  const targetIds = unusedAssetIds || getUnusedStylesAndAssets(manifest).unusedAssets;
  if (targetIds.length === 0) return manifest;
  const currentAssets = manifest.resources?.assets || [];
  const purgedAssets = currentAssets.filter(a => !targetIds.includes(a.id));

  return {
    ...manifest,
    resources: {
      ...manifest.resources,
      assets: purgedAssets.length > 0 ? purgedAssets : undefined
    } as OMEGA_Manifest['resources']
  };
}


