'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';

interface ModulePlaneSelectorProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
}

export default function ModulePlaneSelector({ manifest, onUpdate }: ModulePlaneSelectorProps) {
  const activeTab = manifest.ui?.layout?.activeTab || 'front';

  return (
    <InspectorCollapsible title="Active Construction Plane" icon={Layers}>
      <div className="space-y-3 pt-2">
        <p className="text-[7px] wb-text-muted font-bold uppercase tracking-tighter italic">
          Select the industrial plane for editing.
        </p>
        <div className="flex bg-black/20 rounded-xs border wb-outline overflow-hidden">
           {['front', 'back', 'pcb', 'internal'].map(plane => (
             <button
               key={plane}
               onClick={() => {
                  onUpdate({
                    ui: {
                      ...manifest.ui,
                      layout: {
                        width: manifest.ui?.layout?.width ?? 800,
                        height: manifest.ui?.layout?.height ?? 600,
                        ...manifest.ui?.layout,
                        containers: manifest.ui?.layout?.containers || [],
                        activeTab: plane
                      }
                    }
                  });
               }}
               className={`flex-1 py-2 text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === plane ? 'bg-accent/20 text-accent border-b-2 border-accent' : 'wb-text-muted hover:text-white'}`}
             >
               {plane}
             </button>
           ))}
        </div>
      </div>
    </InspectorCollapsible>
  );
}
