import type { Position, Dimensions, GridConfig } from './manifest';

export type ComponentType =
  | 'knob'
  | 'slider'
  | 'switch'
  | 'button'
  | 'port'
  | 'led'
  | 'display'
  | 'label';

export type SliderOrientation = 'vertical' | 'horizontal';
export type PortOrientation = 'top' | 'bottom' | 'left' | 'right';
export type PortPolarity = 'unipolar' | 'bipolar';
export type LedPolarity = 'normal' | 'inverted';
export type SwitchStateCount = 2 | 3;

export interface ComponentStyle {
  variant?: string | undefined;
  color?: string | undefined;
  indicatorColor?: string | undefined;
  glowColor?: string | undefined;
  asset?: string | undefined;
  frames?: number | undefined;
  orientation?: 'v' | 'h' | SliderOrientation | PortOrientation | undefined;
  font?: string | undefined;
  fontSize?: number | undefined;
  fontColor?: string | undefined;
  opacity?: number | undefined;
  label?: string | undefined;
  polarity?: PortPolarity | LedPolarity | undefined;
  states?: SwitchStateCount | undefined;
}

export interface BindConfig {
  target: string;
  min?: number | undefined;
  max?: number | undefined;
  default?: number | undefined;
  polarity?: PortPolarity | undefined;
}

export interface ComponentNode {
  id: string;
  type: ComponentType;
  label: string;
  pos: Position;
  size: Dimensions;
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  locked?: boolean | undefined;
  visible?: boolean | undefined;
}

export interface GroupNode {
  id: string;
  label: string;
  pos: Position;
  children: ComponentNode[];
  locked?: boolean | undefined;
  visible?: boolean | undefined;
}

export interface GridGuide {
  id: string;
  orientation: 'vertical' | 'horizontal';
  position: number;
}

export interface RackManifest {
  id: string;
  name: string;
  author?: string | undefined;
  version: string;
  width: number;
  height: number;
  grid: GridConfig;
  skin?: string | undefined;
  children: Array<ComponentNode | GroupNode>;
  metadata?: Record<string, unknown> | undefined;
}
