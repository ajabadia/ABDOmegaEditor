'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Fingerprint, Settings, Palette, 
  Layout, Wand2
} from 'lucide-react';
import type { ManifestEntity, OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';

export const usePropertyPanel = (
  item: ManifestEntity | OMEGA_Manifest | OmegaNode | null,
  highlightPath?: string | null
) => {
  const [activeSection, setActiveSection] = useState<string>('identity');
  const isModule = item ? 'metadata' in item : false;

  const isCustom = isModule ? (item as OMEGA_Manifest).ui?.skinMode === 'custom' : false;

  const sections = useMemo(() => {
    if (!isModule) {
      return [
        { id: 'core', label: 'Core', icon: Fingerprint, color: 'text-primary' },
        { id: 'design', label: 'Design', icon: Palette, color: 'text-purple-400' },
        { id: 'logic', label: 'Logic', icon: Settings, color: 'text-blue-400' },
      ];
    }

    const baseSections = [
      { id: 'identity', label: 'Identity', icon: Fingerprint, color: 'text-primary' },
      { id: 'architecture', label: 'Architecture', icon: Layout, color: 'text-accent' },
    ];

    if (isCustom) {
      baseSections.push({ id: 'custom-design', label: 'Custom Design', icon: Wand2, color: 'text-pink-400' });
    }

    return baseSections;
  }, [isModule, isCustom]);

  // AUDIT GPS: Auto-switch section based on highlightPath
  useEffect(() => {
    if (!highlightPath) return;

    setTimeout(() => {
      if (isModule) {
         if (highlightPath.includes('layout')) setActiveSection('architecture');
         if (highlightPath.includes('resources') || highlightPath.includes('ui.typography') || highlightPath.includes('ui.colors')) setActiveSection(isCustom ? 'custom-design' : 'identity');
         if (highlightPath.includes('modulations')) setActiveSection('routing');
      } else {
         if (highlightPath.includes('bind') || highlightPath.includes('attachments') || highlightPath.includes('role')) setActiveSection('logic');
         if (highlightPath.includes('variant') || highlightPath.includes('color') || highlightPath.includes('style')) setActiveSection('design');
         if (highlightPath.includes('pos') || highlightPath.includes('size') || highlightPath.includes('container') || highlightPath.includes('label') || highlightPath.includes('id')) setActiveSection('core');
      }
    }, 0);
  }, [highlightPath, isModule, isCustom]);

  // Auto-reset tab if current one disappears
  useEffect(() => {
    if (!sections.find(s => s.id === activeSection)) {
      setTimeout(() => setActiveSection(isModule ? 'identity' : 'core'), 0);
    }
  }, [isModule, sections, activeSection]);

  return {
    activeSection,
    setActiveSection,
    isModule,
    sections
  };
};
