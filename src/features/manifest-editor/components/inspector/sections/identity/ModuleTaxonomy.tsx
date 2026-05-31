'use client';

import React from 'react';
import { Tag } from 'lucide-react';
import type { OMEGA_Manifest, ManifestMetadata } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
import { IndustrialInput } from '@/features/manifest-editor/components/primitives/IndustrialInput';
import PropertyField from '../../PropertyField';

const SUGGESTED_TAGS = ['ANALOG', 'VIRTUAL', 'POLYPHONIC', 'VCF', 'VCO', 'LFO', 'ENVELOPE', 'UTILITY', 'FX'];

interface ModuleTaxonomyProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  isHighlighted: (key: string) => boolean;
  standalone?: boolean;
}

export default function ModuleTaxonomy({ manifest, onUpdate, isHighlighted, standalone }: ModuleTaxonomyProps) {
  const metadata = manifest.metadata || {};

  const updateMetadata = (field: keyof ManifestMetadata, value: unknown) => {
    onUpdate({ metadata: { ...metadata, [field]: value } } as Partial<OMEGA_Manifest>);
  };

  const currentTags = metadata.tags || [];

  const toggleTag = (tag: string) => {
    const lower = tag.toLowerCase();
    const exists = currentTags.some(t => t.toLowerCase() === lower);
    const next = exists ? currentTags.filter(t => t.toLowerCase() !== lower) : [...currentTags, tag];
    updateMetadata('tags', next);
  };

  const content = (
    <div className="space-y-4 pt-2">
      {/* PRIMARY FIELDS */}
      <div className="grid grid-cols-2 gap-3">
        <PropertyField
          label="Primary Family"
          helper="VCF, OSC, UTILITY…"
          {...(isHighlighted('family') ? { status: 'sync' as const } : {})}
        >
          <IndustrialInput
            value={metadata.family || ''}
            onChange={(v) => updateMetadata('family', v)}
            placeholder="e.g. VCF"
          />
        </PropertyField>

        <PropertyField label="Creator / Author">
          <IndustrialInput
            value={metadata.author || ''}
            onChange={(v) => updateMetadata('author', v)}
            placeholder="e.g. ABD SYNTHS"
          />
        </PropertyField>
      </div>

      {/* TAGS — raw input */}
      <PropertyField
        label="Custom Tags"
        helper="Comma separated. Used in catalog search and filtering."
        {...(isHighlighted('tags') ? { status: 'sync' as const } : {})}
      >
        <IndustrialInput
          value={currentTags.join(', ')}
          onChange={(v) => updateMetadata('tags', v.split(',').map(t => t.trim()).filter(Boolean))}
          placeholder="ANALOG, POLYPHONIC, FX..."
          mono
        />
      </PropertyField>

      {/* QUICK-ADD SUGGESTED TAGS */}
      <div className="space-y-1.5">
        <span className="text-[7px] font-black uppercase wb-text-muted tracking-widest ml-0.5">Quick Tags</span>
        <div className="flex flex-wrap gap-1">
          {SUGGESTED_TAGS.map(tag => {
            const isActive = currentTags.some(t => t.toLowerCase() === tag.toLowerCase());
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-tighter border rounded-xs transition-all ${
                  isActive
                    ? 'bg-primary/15 border-primary/50 text-primary'
                    : 'wb-outline wb-text-muted hover:border-primary/30 hover:wb-text'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (standalone) return content;

  return (
    <InspectorCollapsible title="Module Taxonomy" icon={Tag}>
      {content}
    </InspectorCollapsible>
  );
}
