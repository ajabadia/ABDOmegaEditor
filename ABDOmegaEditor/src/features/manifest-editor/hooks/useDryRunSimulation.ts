'use client';

/**
 * @purpose Gestiona el estado del botón LFO para elementos seleccionados en el editor de manifesto OMEGA.
 * @purpose_en Manages the LFO toggle state for selected property elements in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:19ar585
 * @lastUpdated 2026-06-15T13:12:53.895Z
 */

import { useState } from 'react';

// Shared transient registry for client-side dry-run LFO simulation
export const dryRunLfoRegistry: Record<string, number> = {};
export const dryRunActiveSimulations: Record<string, boolean> = {};

/**
 * useDryRunSimulation (v8.2)
 * Manages the LFO toggle state for the selected property element.
 */
export function useDryRunSimulation(activeId: string | null) {
  const [, setTick] = useState(0);

  const isPlaying = activeId ? !!dryRunActiveSimulations[activeId] : false;

  const toggleSimulation = () => {
    if (!activeId) return;
    const nextState = !isPlaying;
    dryRunActiveSimulations[activeId] = nextState;

    if (!nextState) {
      delete dryRunLfoRegistry[activeId];
    }
    
    // Force a re-render of the hook consumer
    setTick(t => t + 1);
  };

  return {
    isPlaying,
    toggleSimulation
  };
}
