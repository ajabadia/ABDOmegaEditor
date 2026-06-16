'use client';

/**
 * @purpose Gestiona una sección para editar la identidad y metadata de un módulo en el editor de manifesto OMEGA.
 * @purpose_en Manages a section for editing the identity and metadata of a module in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:1xg8d2u
 * @lastUpdated 2026-06-15T11:39:45.681Z
 */

import React from 'react';
import { Box, User, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import type { OMEGA_Manifest, ManifestMetadata } from '@/omega-ui-core/types/manifest';
import AssetSelector from '@/features/manifest-editor/components/inspector/shared/AssetSelector';
import PropertyField from '../../PropertyField';
import { IndustrialInput } from '@/features/manifest-editor/components/primitives/IndustrialInput';
import { IndustrialTextArea } from '@/features/manifest-editor/components/primitives/IndustrialTextArea';

const SUGGESTED_TAGS = ['ANALOG', 'VIRTUAL', 'POLYPHONIC', 'VCF', 'VCO', 'LFO', 'ENVELOPE', 'UTILITY', 'FX'];

interface ModuleIdentitySectionProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
}

export default function ModuleIdentitySection({ manifest, onUpdate, resolveAsset }: ModuleIdentitySectionProps) {
  const metadata = manifest.metadata || {};
  const [copied, setCopied] = React.useState(false);

  const updateMetadata = (field: keyof ManifestMetadata, value: unknown) => {
    onUpdate({ metadata: { ...metadata, [field]: value } } as Partial<OMEGA_Manifest>);
  };

  const handleCopyId = () => {
    if (metadata.icon) {
      navigator.clipboard.writeText(metadata.icon).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  const currentTags = metadata.tags || [];

  const toggleTag = (tag: string) => {
    const lower = tag.toLowerCase();
    const exists = currentTags.some((t: string) => t.toLowerCase() === lower);
    const next = exists ? currentTags.filter((t: string) => t.toLowerCase() !== lower) : [...currentTags, tag];
    updateMetadata('tags', next);
  };

  return (
    <div className="space-y-3">
      {/* Schema + ID row */}
      <div className="grid grid-cols-3 gap-3">
        <PropertyField label="Schema">
          <IndustrialInput
            value={manifest.schemaVersion || '7.2.3'}
            onChange={() => {}}
            readOnly
            mono
            align="center"
          />
        </PropertyField>
        <div className="col-span-2">
          <PropertyField label="Canonical ID (Unique)">
            <IndustrialInput
              value={manifest.id || ''}
              onChange={(v) => onUpdate({ id: v })}
              mono
              placeholder="module_id_v1"
            />
          </PropertyField>
        </div>
      </div>

      {/* Name + Version + HP row */}
      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-3">
          <PropertyField label="Commercial Name">
            <IndustrialInput
              value={metadata.name || ''}
              onChange={(v) => updateMetadata('name', v)}
              placeholder="OMEGA NEURONIK"
            />
          </PropertyField>
        </div>
        <div className="col-span-2">
          <PropertyField label="Version">
            <IndustrialInput
              value={metadata.version || '1.0.0'}
              onChange={(v) => updateMetadata('version', v)}
              mono
            />
          </PropertyField>
        </div>
        <div className="col-span-1">
          <PropertyField label="HP">
            <IndustrialInput
              type="number"
              value={metadata.rack?.hp || 12}
              onChange={(v) => updateMetadata('rack', { ...(metadata.rack || {}), hp: Math.max(1, parseInt(v) || 1) })}
              mono
              align="center"
            />
          </PropertyField>
        </div>
      </div>

      {/* Description */}
      <PropertyField label="Module Description">
        <IndustrialTextArea
          value={metadata.description || ''}
          onChange={(v) => updateMetadata('description', v)}
          placeholder="ENTER MODULE DOCUMENTATION / SPECIFICATIONS..."
          rows={2}
        />
      </PropertyField>

      {/* Brand Badge Card */}
      <div className="flex gap-3 p-3 wb-surface-strong border wb-outline rounded-xs items-center">
        <div
          className="w-14 h-14 wb-surface-inset border wb-outline rounded-xs flex items-center justify-center overflow-hidden relative group shrink-0"
          style={{
            backgroundImage: [
              'linear-gradient(var(--wb-outline) 1px, transparent 1px)',
              'linear-gradient(90deg, var(--wb-outline) 1px, transparent 1px)'
            ].join(', '),
            backgroundSize: '8px 8px'
          }}
        >
          {metadata.icon ? (
            <div className="w-full h-full p-1.5 flex items-center justify-center">
              <Image
                src={resolveAsset(metadata.icon) || ''}
                fill
                unoptimized
                className="p-1 object-contain group-hover:scale-105 transition-transform duration-300"
                alt="Module Logo"
              />
            </div>
          ) : (
            <Box className="w-5 h-5 wb-text-muted opacity-30" />
          )}
        </div>

        <div className="flex-grow min-w-0 space-y-1.5">
          <div>
            <span className="text-[6px] font-black uppercase wb-text-muted tracking-widest block">Logo Asset ID</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[8px] font-mono font-bold wb-text truncate block leading-none select-all flex-1">
                {metadata.icon || '—'}
              </span>
              {metadata.icon && (
                <button
                  onClick={handleCopyId}
                  className="shrink-0 p-0.5 wb-text-muted hover:text-primary transition-colors"
                  title="Copy asset ID"
                >
                  {copied
                    ? <Check className="w-3 h-3 text-green-500" />
                    : <Copy className="w-3 h-3" />
                  }
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-[6px] wb-text-muted uppercase font-bold leading-none block">
              SVG or transparent PNG · shown in catalog &amp; presets
            </span>
          </div>
        </div>
      </div>

      {/* Brand / Creator Name */}
      <PropertyField label="Brand / Creator Name" helper="Displayed in catalog listings and module metadata exports.">
        <div className="relative flex items-center">
          <div className="absolute left-2.5 wb-text-muted pointer-events-none">
            <User className="w-3.5 h-3.5" />
          </div>
          <IndustrialInput
            value={metadata.author || ''}
            onChange={(v) => updateMetadata('author', v)}
            placeholder="e.g. ABD VIRTUAL SYNTHS"
            className="pl-8"
          />
        </div>
      </PropertyField>

      {/* Asset Selector */}
      <div className="border-t wb-outline pt-3">
        <AssetSelector
          manifest={manifest}
          selectedAssetId={metadata.icon}
          onSelect={(id) => updateMetadata('icon', id)}
          resolveAsset={resolveAsset}
          label="Available Branding Assets"
        />
      </div>

      {/* Taxonomy fields */}
      <div className="grid grid-cols-2 gap-3">
        <PropertyField label="Primary Family" helper="VCF, OSC, UTILITY…">
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

      {/* Tags */}
      <PropertyField
        label="Custom Tags"
        helper="Comma separated. Used in catalog search and filtering."
      >
        <IndustrialInput
          value={currentTags.join(', ')}
          onChange={(v) => updateMetadata('tags', v.split(',').map((t: string) => t.trim()).filter(Boolean))}
          placeholder="ANALOG, POLYPHONIC, FX..."
          mono
        />
      </PropertyField>

      {/* Quick Tags */}
      <div className="space-y-1.5">
        <span className="text-[7px] font-black uppercase wb-text-muted tracking-widest ml-0.5">Quick Tags</span>
        <div className="flex flex-wrap gap-1">
          {SUGGESTED_TAGS.map((tag: string) => {
            const isActive = currentTags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
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
}
