/**
 * Unified type exports for OMEGA UI Core.
 *
 * Re-exports from:
 * - blueprints.ts  (V2 Blueprint formats)
 * - manifest.ts    (OMEGA Manifest, entities, nodes, styles)
 * - rack.ts        (Rack components, groups, guides)
 * - validation.ts  (Validation issues)
 *
 * Note: Both manifest.ts and rack.ts export `ComponentType`.
 * The rack-specific `ComponentType` is re-exported as `RackComponentType`
 * to avoid ambiguity.
 */

export * from './blueprints';
export * from './manifest';

// Rack exports — alias ComponentType to avoid collision with manifest's ComponentType
export type {
  ComponentType as RackComponentType,
  SliderOrientation,
  PortOrientation,
  PortPolarity,
  LedPolarity,
  SwitchStateCount,
  ComponentStyle,
  BindConfig,
  ComponentNode,
  GroupNode,
  GridGuide,
  RackManifest,
} from './rack';

export * from './validation';
