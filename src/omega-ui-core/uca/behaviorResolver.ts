import type { AssetBehavior, BehaviorMapping } from '../types/assetBehavior';

/**
 * OMEGA Behavior Resolver - Phase 12
 * Industrial logic for mapping input values to visual frames/states.
 */

export interface ResolvedBehavior {
  frame: number;
  rotation?: number;
  offset?: { x: number; y: number };
  opacity?: number;
}

export const BehaviorResolver = {
  /**
   * Resolves the visual state of an asset based on its behavior preset and current value.
   */
  resolve: (value: number, behavior?: AssetBehavior): ResolvedBehavior => {
    // Default fallback
    const fallback: ResolvedBehavior = { frame: 0 };
    if (!behavior) return fallback;

    const { preset, mapping, frameCount = 1 } = behavior;

    switch (preset) {
      case 'rotary':
        return resolveRotary(value, frameCount, mapping);
      case 'slider':
        return resolveSlider(value, frameCount, mapping);
      case 'switch':
        return resolveSwitch(value, frameCount, mapping);
      case 'button':
        return resolveButton(value, frameCount);
      case 'meter':
        return resolveMeter(value, frameCount, mapping);
      case 'led':
        return resolveLED(value, frameCount, mapping);
      case 'static':
      case 'plate':
      default:
        return fallback;
    }
  }
};

/**
 * Normalizes a 0-1 value based on polarity and zero anchor.
 */
function normalizeValue(value: number, mapping?: BehaviorMapping): number {
  let v = value;
  if (mapping?.polarity === 'inverted') {
    v = 1 - v;
  }
  // TODO: Add zero anchor logic if needed (e.g. for bipolar sliders)
  return v;
}

function resolveRotary(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  
  // If no filmstrip but rotationMode is CSS
  // Rotation typically maps 0-1 to -150 to 150 degrees or similar
  return { frame };
}

function resolveSlider(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  return { frame };
}

function resolveSwitch(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  // Switches are typically binary (0 or 1) or stepped
  if (mapping?.mode === 'stepped' && mapping.frameRange) {
    const steps = mapping.frameRange.end - mapping.frameRange.start + 1;
    const v = normalizeValue(value, mapping);
    const frame = mapping.frameRange.start + Math.floor(v * (steps - 1));
    return { frame };
  }
  
  const frame = value > 0.5 ? (frameCount - 1) : 0;
  return { frame };
}

function resolveButton(value: number, frameCount: number): ResolvedBehavior {
  // 0 = up, 1 = down
  const frame = value > 0.5 ? (frameCount - 1) : 0;
  return { frame };
}

function resolveMeter(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  return { frame };
}

function resolveLED(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  // LEDs can be multi-state or binary brightness
  if (frameCount > 2) {
    const v = normalizeValue(value, mapping);
    const frame = Math.floor(v * (frameCount - 1));
    return { frame };
  }
  const frame = value > 0.1 ? 1 : 0;
  return { frame };
}
