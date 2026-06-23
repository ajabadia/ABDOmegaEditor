'use client';

/**
 * @purpose Gestiona las definiciones de secciones en el inspector del editor de manifesto OMEGA y maneja el estado de la sección activa.
 * @purpose_en Manages the definitions of sections in the OMEGA manifest editor's inspector and handles the state of the active section.
 * @refactorable true (contains too many conditional logic and state variables)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:3,imports:3,sig:smqolb
 * @lastUpdated 2026-06-20T20:07:35.603Z
 */

import { useState, useMemo } from 'react';
import { Info, Layout, Palette, Zap, Activity, Box, Cpu, Paintbrush, Layers, Shield } from 'lucide-react';
import type { InspectorSection } from '@/components/ui/InspectorNav';

export interface UseInspectorSectionsOptions {
  isModule: boolean;
  isBulk: boolean;
  visibleSections?: {
    identity?: boolean;
    essentialIdentity?: boolean;
    globalUiSkin?: boolean;
    activeConstructionPlane?: boolean;
    physicalEmulationProfile?: boolean;
    aestheticsGlobals?: boolean;
    aestheticsElements?: boolean;
    architecture?: boolean;
    diagnostics?: boolean;
  } | undefined;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  /** Sección activa inicial/sincronizada desde el padre */
  activeSectionProp?: string | undefined;
}

export interface UseInspectorSectionsReturn {
  sectionDefs: InspectorSection[];
  activeSection: string;
  setActiveSection: (section: string) => void;
}

/**
 * Hook que construye las secciones del inspector según el nivel, modo y visibilidad,
 * y gestiona el estado de la sección activa con sincronización desde props.
 */
export function useInspectorSections({
  isModule,
  isBulk,
  visibleSections,
  inspectorLevel = 'medium',
  activeSectionProp,
}: UseInspectorSectionsOptions): UseInspectorSectionsReturn {
  const [activeSection, setActiveSection] = useState(activeSectionProp || 'identity');
  const [prevActiveSection, setPrevActiveSection] = useState(activeSectionProp);

  // Sync activeSection when prop changes externally
  if (activeSectionProp !== prevActiveSection) {
    setPrevActiveSection(activeSectionProp);
    if (activeSectionProp) {
      setActiveSection(activeSectionProp);
    }
  }

  // Build section definitions based on level, mode, and visibility
  const sectionDefs = useMemo((): InspectorSection[] => {
    const list: InspectorSection[] = [];
    const lvl = inspectorLevel;

    if (!isModule && !isBulk && visibleSections?.identity !== false) {
      list.push({ id: 'identity', label: 'Identity', icon: Info, color: 'text-cyan-400' });
    }
    if (isModule && !isBulk) {
      if (visibleSections?.essentialIdentity !== false)
        list.push({ id: 'identity', label: 'Identity', icon: Info, color: 'text-cyan-400' });
      if (visibleSections?.globalUiSkin !== false)
        list.push({ id: 'ui-skin', label: 'UI Skin', icon: Paintbrush, color: 'text-cyan-400' });
      if (visibleSections?.activeConstructionPlane !== false)
        list.push({ id: 'plane', label: 'Plane', icon: Layers, color: 'text-cyan-400' });
      if (visibleSections?.physicalEmulationProfile !== false)
        list.push({ id: 'emulation', label: 'Chassis', icon: Cpu, color: 'text-cyan-400' });
    }
    if (!isModule && !isBulk) {
      list.push({ id: 'simulation', label: 'Sim', icon: Activity, color: 'text-emerald-400' });
    }

    // Medium / Advanced only sections
    if (lvl === 'medium' || lvl === 'advanced') {
      if (isModule && !isBulk && visibleSections?.aestheticsGlobals !== false) {
        list.push({ id: 'globals', label: 'Globals', icon: Box, color: 'text-purple-400' });
      }
      if (visibleSections?.aestheticsElements !== false) {
        list.push({ id: 'aesthetics', label: isModule ? 'Elements' : 'Design', icon: Palette, color: 'text-purple-400' });
      }
      if (!isBulk && visibleSections?.architecture !== false) {
        list.push({ id: 'architecture', label: isModule ? 'Arch' : 'Logic', icon: isModule ? Layout : Zap, color: 'text-emerald-400' });
      }
    }

    // Advanced only sections
    if (lvl === 'advanced') {
      if (visibleSections?.diagnostics !== false) {
        list.push({ id: 'diagnostics', label: 'Registry', icon: Shield, color: 'text-amber-400' });
      }
    }

    return list;
  }, [isModule, isBulk, visibleSections, inspectorLevel]);

  // Auto-select first section if current active section is no longer available
  if (sectionDefs.length > 0 && !sectionDefs.find(s => s.id === activeSection)) {
    setActiveSection(sectionDefs[0].id);
  }

  return { sectionDefs, activeSection, setActiveSection };
}
