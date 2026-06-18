'use client';

/**
 * @purpose Gestiona el estado para paneles colapsables en el inspector del editor de manifesto OMEGA.
 * @purpose_en Manages the state for collapsible panels in the OMEGA manifest editor's inspector.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:ddhoyf
 * @lastUpdated 2026-06-15T13:22:38.974Z
 */

import { useCallback, useState } from 'react';

/**
 * Rack sections collapsible state — local UI preferences for the inspector panels.
 * Pure state, zero external dependencies.
 */
export interface RackSections {
  identity: boolean;
  essentialIdentity: boolean;
  identityBranding: boolean;
  globalUiSkin: boolean;
  activeConstructionPlane: boolean;
  moduleTaxonomy: boolean;
  physicalEmulationProfile: boolean;
  aestheticsGlobals: boolean;
  aestheticsElements: boolean;
  architecture: boolean;
  diagnostics: boolean;
}

export function useRackSections() {
  const [rackSections, setRackSections] = useState<RackSections>({
    identity: true,
    essentialIdentity: true,
    identityBranding: true,
    globalUiSkin: true,
    activeConstructionPlane: true,
    moduleTaxonomy: true,
    physicalEmulationProfile: true,
    aestheticsGlobals: true,
    aestheticsElements: true,
    architecture: true,
    diagnostics: true,
  });

  const handleToggleRackSection = useCallback((section: string) => {
    setRackSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof RackSections],
    }));
  }, []);

  return { rackSections, handleToggleRackSection };
}
