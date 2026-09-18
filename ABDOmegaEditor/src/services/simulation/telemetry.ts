/**
 * @purpose Telemetría simulada determinista para el modo mock del motor: misma entrada (nodeId, t) → mismo valor, sin Math.random().
 * @purpose_en Deterministic simulated telemetry for the engine mock mode: same input (nodeId, t) → same value, no Math.random().
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:new
 * @lastUpdated 2026-08-21
 */

/**
 * simulatedTelemetry — Curva pseudo-senoidal reproducible por (nodeId, t).
 * La fase se deriva del hash del nodeId, así cada celda tiene una señal
 * estable y distinta, pero el mismo input siempre produce el mismo output
 * (testeable, sin ruido aleatorio).
 */
export function simulatedTelemetry(nodeId: string, t: number): number {
  const phase = hashString(nodeId) % 1000; // fase estable 0..999 por id
  const cycles = Math.sin((t / 4000) * 2 * Math.PI + phase); // ciclo ~4s
  const value = 0.5 + 0.4 * cycles;
  return Math.max(0, Math.min(1, value));
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
