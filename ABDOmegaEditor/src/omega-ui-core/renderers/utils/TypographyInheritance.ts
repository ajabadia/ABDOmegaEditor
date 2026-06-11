import type { OMEGA_Manifest } from '../../types/manifest';
 
/**
 * OMEGA Typography Inheritance Engine
 * ---------------------------------------------------------------------------
 * Logic for resolving global design tokens based on component categories.
 */
export interface InheritedTypography {
  font?: string;
  size?: number;
  color?: string;
}
 
export const getInheritedTypography = (compType: string, manifest?: OMEGA_Manifest): InheritedTypography => {
  const mapping = manifest?.ui?.typography;
  if (!mapping) return {};
 
  let cat: 'headings' | 'labels' | 'displays' | 'technical' = 'labels';
  
  // Rule-based category resolution
  if (compType === 'display' || compType === 'scope' || compType === 'terminal') {
    cat = 'displays';
  } else if (compType === 'port' || compType === 'knob' || compType === 'slider-v' || compType === 'slider-h' || compType === 'switch') {
    cat = 'labels';
  } else if (compType === 'stepper' || compType === 'button' || compType === 'push') {
    cat = 'labels'; // Or headings depending on branding
  }
  
  return mapping[cat] || {};
};
