'use client';
 
import React from 'react';
import type { OMEGA_Manifest, ManifestMetadata } from '@/omega-ui-core/types/manifest';
import { IndustrialInput } from '@/features/manifest-editor/components/primitives/IndustrialInput';
import { IndustrialTextArea } from '@/features/manifest-editor/components/primitives/IndustrialTextArea';
 
interface ModuleSignatureProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  onHelp?: ((id: string) => void) | undefined;
  isHighlighted?: ((key: string) => boolean) | undefined;
  resolveAsset: (id: string | undefined) => string | undefined;
}
 
import PropertyField from '../../PropertyField';

export default function ModuleSignature({ manifest, onUpdate, resolveAsset }: ModuleSignatureProps) {
  const metadata = manifest.metadata || {};
 
  const updateMetadata = (field: keyof ManifestMetadata, value: unknown) => {
    onUpdate({ metadata: { ...metadata, [field]: value } } as Partial<OMEGA_Manifest>);
  };
 
  return (
    <div className="space-y-3">
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

      <PropertyField label="Module Description">
        <IndustrialTextArea 
          value={metadata.description || ''} 
          onChange={(v) => updateMetadata('description', v)}
          placeholder="ENTER MODULE DOCUMENTATION / SPECIFICATIONS..."
          rows={2}
        />
      </PropertyField>

    </div>
  );
}
