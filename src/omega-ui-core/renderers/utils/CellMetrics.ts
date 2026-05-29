/**
 * OMEGA Cell Metrics (Era 7.2.3)
 * Physical dimensions and geometric mapping for industrial components.
 */
 
import type { OmegaNode } from '../../types/manifest';
import { parseVariant } from './VariantParser';
 
const RADIUS_MAP: Record<string, Record<string, number>> = {
  knob: { A: 24, B: 18, C: 12, D: 9 },
  port: { A: 21, B: 18, C: 15, D: 12 },
  display: { A: 16.5, B: 13, C: 10, D: 7 },
  led: { A: 6, B: 4, C: 2.5, D: 1.5 },
  slider: { A: 6, B: 6, C: 6, D: 6 },
  switch: { A: 16, B: 12, C: 10, D: 8 },
  stepper: { A: 12, B: 9, C: 7, D: 6 },
  select: { A: 12, B: 12, C: 12, D: 12 }
};
 
export function getComponentRadius(node: OmegaNode): number {
  const variantStr = node.style?.variant || 'default';
  const { size } = parseVariant(variantStr);
  const comp = node.cellRef || node.kind || 'knob';
  const typeKey = comp.includes('slider') ? 'slider' : comp;
  
  const sizeMap = RADIUS_MAP[typeKey] || RADIUS_MAP.knob;
  const radius = sizeMap ? sizeMap[size] : 12;
  
  return radius || 12;
}
