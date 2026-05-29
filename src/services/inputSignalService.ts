/**
 * OMEGA INPUT SIGNAL SERVICE - ERA 7.1
 * Manages virtual signal generators for input port simulation.
 */

export type SignalType = 'sine' | 'square' | 'saw' | 'triangle' | 'noise' | 'lfo_slow' | 'static';

export interface VirtualSignal {
  type: SignalType;
  frequency: number; // Hz
  amplitude: number; // 0.0 to 1.0
  offset: number;
}

class InputSignalService {
  private activeSignals: Record<string, VirtualSignal> = {};
  private startTime: number = Date.now();

  setSignal(portId: string, signal: VirtualSignal | null) {
    if (!signal) {
      delete this.activeSignals[portId];
    } else {
      this.activeSignals[portId] = signal;
    }
  }

  getSignalValue(portId: string): number {
    const sig = this.activeSignals[portId];
    if (!sig) return 0;

    const t = (Date.now() - this.startTime) / 1000;
    const freq = sig.frequency;
    const amp = sig.amplitude;
    const off = sig.offset;

    switch (sig.type) {
      case 'sine':
        return off + amp * Math.sin(2 * Math.PI * freq * t);
      case 'square':
        return off + (Math.sin(2 * Math.PI * freq * t) >= 0 ? amp : -amp);
      case 'saw':
        return off + amp * (2 * (t * freq - Math.floor(0.5 + t * freq)));
      case 'noise':
        return off + (Math.random() * 2 - 1) * amp;
      case 'lfo_slow':
        return off + amp * Math.sin(2 * Math.PI * 0.5 * t); // 0.5Hz LFO
      case 'static':
        return off + amp;
      default:
        return 0;
    }
  }

  getActiveSignal(portId: string): VirtualSignal | null {
    return this.activeSignals[portId] || null;
  }
}

export const inputSignalService = new InputSignalService();
