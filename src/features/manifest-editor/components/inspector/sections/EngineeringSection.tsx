import React from 'react';
import { Layers } from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

import InspectorCollapsible from '../shared/InspectorCollapsible';

interface EngineeringSectionProps {
  item: OmegaNode;
  onUpdate: (updates: Partial<OmegaNode>) => void;
  onHelp?: ((sectionId: string) => void) | undefined;
  highlightPath?: (string | null) | undefined;
}

export default function EngineeringSection({ item, onUpdate, onHelp, highlightPath }: EngineeringSectionProps) {
  const isHighlighted = (key: string) => !!highlightPath?.includes(key);

  return (
    <InspectorCollapsible 
      title="Low-Level Registry Role" 
      icon={Layers}
      onHelp={() => onHelp?.('logic')}
    >
      <div className="space-y-4 pt-2">
        <p className="text-[7px] wb-text-muted leading-relaxed uppercase font-bold tracking-tighter italic">
          * Roles define the governance behavior of this entity within the OMEGA C++ Registry.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {['control', 'input', 'output', 'telemetry', 'expert', 'stream', 'mod_source', 'mod_target'].map(role => (
            <button
              key={role}
              onClick={() => onUpdate({ role })}
              className={`px-2 py-1 text-[7px] font-black uppercase tracking-tighter border rounded-full transition-all ${
                isHighlighted('role') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : ''
              } ${
                (item.role || 'control') === role
                  ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                  : 'bg-black/5 wb-outline wb-text-muted hover:wb-text'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </InspectorCollapsible>
  );
}
