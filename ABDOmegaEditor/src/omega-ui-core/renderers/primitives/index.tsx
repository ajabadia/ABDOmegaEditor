import React from 'react';
import type { ComponentNode } from '../../types/rack';
import { Knob } from './Knob';
import { Slider } from './Slider';
import { Led } from './Led';
import { Port } from './Port';
import { Switch } from './Switch';
import { Button } from './Button';
import { Display } from './Display';
import { Label } from './Label';

export { Knob } from './Knob';
export { Slider } from './Slider';
export { Led } from './Led';
export { Port } from './Port';
export { Switch } from './Switch';
export { Button } from './Button';
export { Display } from './Display';
export { Label } from './Label';

export interface RenderComponentOptions {
  value?: number | undefined;
  assetUrl?: string | undefined;
  resolvedColor?: string | undefined;
  resolvedIndicatorColor?: string | undefined;
}

export function renderComponentNode(
  node: ComponentNode,
  options: RenderComponentOptions = {},
): React.ReactElement | null {
  const { value = 0, assetUrl, resolvedColor, resolvedIndicatorColor } = options;

  switch (node.type) {
    case 'knob':
      return (
        <Knob
          id={node.id} size={node.size} style={node.style} bind={node.bind} value={value}
          assetUrl={assetUrl} resolvedColor={resolvedColor} resolvedIndicatorColor={resolvedIndicatorColor}
        />
      );
    case 'slider':
      return (
        <Slider
          id={node.id} size={node.size} style={node.style} bind={node.bind} value={value}
          assetUrl={assetUrl} resolvedColor={resolvedColor} resolvedIndicatorColor={resolvedIndicatorColor}
        />
      );
    case 'led':
      return (
        <Led
          id={node.id} size={node.size} style={node.style} bind={node.bind} value={value}
          assetUrl={assetUrl} resolvedColor={resolvedColor}
        />
      );
    case 'port':
      return (
        <Port
          id={node.id} label={node.label} size={node.size} style={node.style} bind={node.bind} value={value}
          resolvedColor={resolvedColor}
        />
      );
    case 'switch':
      return <Switch id={node.id} size={node.size} style={node.style} bind={node.bind} value={value} />;
    case 'button':
      return <Button id={node.id} label={node.label} size={node.size} style={node.style} bind={node.bind} value={value} />;
    case 'display':
      return <Display id={node.id} size={node.size} style={node.style} bind={node.bind} value={value} />;
    case 'label':
      return <Label id={node.id} text={node.label} size={node.size} style={node.style} bind={node.bind} />;
    default:
      return null;
  }
}
