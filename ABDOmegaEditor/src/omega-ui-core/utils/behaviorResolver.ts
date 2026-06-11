import type { AssetBehavior, BehaviorMapping } from '../types/assetBehavior';

export interface ResolvedBehavior {
  frame: number;
  rotation?: number;
  offset?: { x: number; y: number };
  opacity?: number;
}

function normalizeValue(value: number, mapping?: BehaviorMapping): number {
  let v = value;
  if (mapping?.polarity === 'inverted') {
    v = 1 - v;
  }
  return v;
}

function resolveRotary(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  return { frame };
}

function resolveSlider(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  return { frame };
}

function resolveSwitch(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
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
  const frame = value > 0.5 ? (frameCount - 1) : 0;
  return { frame };
}

function resolveMeter(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  const v = normalizeValue(value, mapping);
  const frame = Math.floor(v * (frameCount - 1));
  return { frame };
}

function resolveLED(value: number, frameCount: number, mapping?: BehaviorMapping): ResolvedBehavior {
  if (frameCount > 2) {
    const v = normalizeValue(value, mapping);
    const frame = Math.floor(v * (frameCount - 1));
    return { frame };
  }
  const frame = value > 0.1 ? 1 : 0;
  return { frame };
}

export const BehaviorResolver = {
  resolve: (value: number, behavior?: AssetBehavior): ResolvedBehavior => {
    const fallback: ResolvedBehavior = { frame: 0 };
    if (!behavior) return fallback;

    const { preset, mapping, frameCount = 1 } = behavior;

    switch (preset) {
      case 'rotary': return resolveRotary(value, frameCount, mapping);
      case 'slider': return resolveSlider(value, frameCount, mapping);
      case 'switch': return resolveSwitch(value, frameCount, mapping);
      case 'button': return resolveButton(value, frameCount);
      case 'meter': return resolveMeter(value, frameCount, mapping);
      case 'led': return resolveLED(value, frameCount, mapping);
      case 'static':
      case 'plate':
      default: return fallback;
    }
  }
};
