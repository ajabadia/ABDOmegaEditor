/**
 * Tests for simulatedTelemetry — telemetría simulada determinista (sin
 * Math.random) y comportamiento del modo mock de WasmRuntime.getTelemetry.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { simulatedTelemetry } from './telemetry';
import { WasmRuntime } from '../wasmRuntime';

describe('simulatedTelemetry — determinismo', () => {
  it('misma entrada (nodeId, t) → mismo valor', () => {
    expect(simulatedTelemetry('osc_1/freq', 1000)).toBe(simulatedTelemetry('osc_1/freq', 1000));
    expect(simulatedTelemetry('osc_1/freq', 12345)).toBe(simulatedTelemetry('osc_1/freq', 12345));
  });

  it('los valores siempre están en [0, 1]', () => {
    for (let t = 0; t < 40000; t += 997) {
      const v = simulatedTelemetry('vco', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('ids distintos producen fases distintas (señal por celda)', () => {
    expect(simulatedTelemetry('vco_a', 0)).not.toBe(simulatedTelemetry('vco_b', 0));
  });

  it('no usa Math.random: la curva es reproducible por t', () => {
    const spy = jest.spyOn(Math, 'random');
    const v1 = simulatedTelemetry('x', 500);
    const v2 = simulatedTelemetry('x', 500);
    expect(spy).not.toHaveBeenCalled();
    expect(v1).toBe(v2);
    spy.mockRestore();
  });
});

describe('WasmRuntime.getTelemetry — modo mock determinista', () => {
  it('devuelve el valor simulado del parámetro si fue seteado', () => {
    const rt = new WasmRuntime();
    try {
      rt.enableMockMode();
      rt.setParameter('osc_1/freq', 0.42);
      expect(rt.getTelemetry('osc_1/freq')).toBe(0.42);
    } finally {
      rt.dispose();
    }
  });

  it('sin valor seteado devuelve una curva determinista en [0, 1]', () => {
    const rt = new WasmRuntime();
    try {
      rt.enableMockMode();
      const v = rt.getTelemetry('unknown_cell');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    } finally {
      rt.dispose();
    }
  });

  it('fuera de mock devuelve 0 (el host real alimenta vía RPC)', () => {
    const rt = new WasmRuntime();
    try {
      expect(rt.getTelemetry('any')).toBe(0);
    } finally {
      rt.dispose();
    }
  });
});
