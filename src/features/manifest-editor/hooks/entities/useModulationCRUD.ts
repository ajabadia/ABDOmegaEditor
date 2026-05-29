'use client';

import { useCallback } from 'react';
import type { OMEGA_Manifest, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';

export const useModulationCRUD = (
  setManifest: (updater: OMEGA_Manifest | ((prev: OMEGA_Manifest) => OMEGA_Manifest), label?: string) => void
) => {
  
  const addModulation = useCallback((mod: OMEGA_Modulation) => {
    setManifest((prev: OMEGA_Manifest) => ({
      ...prev,
      modulations: [...(prev.modulations || []), mod]
    }), `Add Modulation: ${mod.id}`);
  }, [setManifest]);

  const removeModulation = useCallback((id: string) => {
    setManifest((prev: OMEGA_Manifest) => ({
      ...prev,
      modulations: (prev.modulations || []).filter(m => m.id !== id)
    }), `Remove Modulation: ${id}`);
  }, [setManifest]);

  const updateModulation = useCallback((id: string, updates: Partial<OMEGA_Modulation>) => {
    setManifest((prev: OMEGA_Manifest) => ({
      ...prev,
      modulations: (prev.modulations || []).map(m => m.id === id ? { ...m, ...updates } : m)
    }), `Update Modulation: ${id}`);
  }, [setManifest]);

  return {
    addModulation,
    removeModulation,
    updateModulation
  };
};
