'use client';
 
import React from 'react';
import { Layers } from 'lucide-react';
import type { ManifestEntity, TabName, Presentation } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '../shared/InspectorCollapsible';
 
interface ArchPlaneSelectorProps {
  item: ManifestEntity;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  onHelp?: ((id: string) => void) | undefined;
}
 
export default function ArchPlaneSelector({ item, onUpdate, onHelp }: ArchPlaneSelectorProps) {
  return (
    <InspectorCollapsible 
      title="Era 7 Plane (Tab)" 
      icon={Layers}
      onHelp={() => onHelp?.('tabs')}
    >
      <div className="grid grid-cols-5 gap-1.5 pt-2">
        {(['MAIN', 'FX', 'EDIT', 'MIDI', 'MOD'] as TabName[]).map(t => (
          <button
            key={t}
            onClick={() => {
              if (!item.presentation) return;
              onUpdate({ 
                presentation: { 
                  ...item.presentation, 
                  tab: t 
                } as Presentation 
              });
            }}
            className={`py-2 text-[7px] font-black uppercase rounded-xs border transition-all text-center ${
              (item.presentation?.tab || 'MAIN') === t 
                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,240,255,0.1)]' 
                : 'bg-black/5 wb-outline wb-text-muted hover:wb-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </InspectorCollapsible>
  );
}
