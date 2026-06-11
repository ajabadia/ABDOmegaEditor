'use client';

import { useCallback } from 'react';
import type { OMEGA_Manifest, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';

export const useModulationCRUD = (
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void
) => {
  
  const addModulation = useCallback((mod: OMEGA_Modulation) => {
    updateManifest((prev: OMEGA_Manifest) => ({
      modulations: [...(prev.modulations || []), mod]
    }), `Add Modulation: ${mod.id}`);
  }, [updateManifest]);

  const removeModulation = useCallback((id: string) => {
    updateManifest((prev: OMEGA_Manifest) => ({
      modulations: (prev.modulations || []).filter(m => m.id !== id)
    }), `Remove Modulation: ${id}`);
  }, [updateManifest]);

  const updateModulation = useCallback((id: string, updates: Partial<OMEGA_Modulation>) => {
    updateManifest((prev: OMEGA_Manifest) => ({
      modulations: (prev.modulations || []).map(m => m.id === id ? { ...m, ...updates } : m)
    }), `Update Modulation: ${id}`);
  }, [updateManifest]);

  return {
    addModulation,
    removeModulation,
    updateModulation
  };
};
