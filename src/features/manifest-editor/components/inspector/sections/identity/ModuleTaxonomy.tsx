'use client';
 
import React from 'react';
import { Tag } from 'lucide-react';
import type { OMEGA_Manifest, ManifestMetadata } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
 
interface ModuleTaxonomyProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  isHighlighted: (key: string) => boolean;
}
 
export default function ModuleTaxonomy({ manifest, onUpdate, isHighlighted }: ModuleTaxonomyProps) {
  const metadata = manifest.metadata;
 
  const updateMetadata = (field: keyof ManifestMetadata, value: unknown) => {
    onUpdate({ metadata: { ...metadata, [field]: value } } as Partial<OMEGA_Manifest>);
  };
 
  return (
    <InspectorCollapsible title="Module Taxonomy" icon={Tag}>
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold wb-text-muted uppercase ml-1">Primary Family</label>
            <input 
              type="text" 
              value={metadata.family || ''} 
              onChange={(e) => updateMetadata('family', e.target.value)}
              placeholder="e.g. VCF, OSC, UTILITY"
              className={`w-full wb-surface-subtle border ${isHighlighted('family') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : 'wb-outline'} rounded-xs px-3 py-2 text-[10px] font-bold wb-text outline-none focus:border-primary/40 transition-all`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold wb-text-muted uppercase ml-1">Creator / Author</label>
            <input 
              type="text" 
              value={metadata.author || ''} 
              onChange={(e) => updateMetadata('author', e.target.value)}
              className="w-full wb-surface-subtle border wb-outline rounded-xs px-3 py-2 text-[10px] font-bold wb-text outline-none focus:border-primary/40 transition-all"
            />
          </div>
        </div>
 
        <div className="space-y-1.5">
          <label className="text-[8px] font-bold wb-text-muted uppercase ml-1">Industrial Tags (Comma separated)</label>
          <input 
            type="text" 
            value={metadata.tags?.join(', ') || ''} 
            onChange={(e) => updateMetadata('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="ANALOG, VIRTUAL, POLYPHONIC..."
            className="w-full wb-surface-subtle border wb-outline rounded-xs px-3 py-2 text-[10px] font-mono wb-text outline-none focus:border-primary/40 transition-all"
          />
        </div>
      </div>
    </InspectorCollapsible>
  );
}
