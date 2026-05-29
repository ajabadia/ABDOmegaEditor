'use client';
 
import React from 'react';
import { Box, Target } from 'lucide-react';
import Image from 'next/image';
import type { OMEGA_Manifest, ManifestMetadata } from '@/omega-ui-core/types/manifest';
import AssetSelector from '@/features/manifest-editor/components/inspector/shared/AssetSelector';
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
  const metadata = manifest.metadata;
 
  const updateMetadata = (field: keyof ManifestMetadata, value: unknown) => {
    onUpdate({ metadata: { ...metadata, [field]: value } } as Partial<OMEGA_Manifest>);
  };
 
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <PropertyField label="Schema" value={manifest.schemaVersion || '7.2.3'} mono />

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

      <div className="grid grid-cols-6 gap-3">
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

      <PropertyField label="Module Description">
        <IndustrialTextArea 
          value={metadata.description || ''} 
          onChange={(v) => updateMetadata('description', v)}
          placeholder="ENTER MODULE DOCUMENTATION / SPECIFICATIONS..."
          rows={2}
        />
      </PropertyField>

      <div className="space-y-3 pt-2">
         <div className="text-[7px] font-black uppercase wb-text-muted flex items-center gap-2 tracking-[0.2em]">
            <Target className="w-3 h-3 text-primary" />
            <span>Identity Branding</span>
         </div>
         
         <div className="flex gap-4 items-start">
            <div className="w-16 h-16 wb-surface-strong border wb-outline rounded-xs flex items-center justify-center overflow-hidden relative group shrink-0">
               {metadata.icon ? (
                  <div className="w-full h-full p-1 flex items-center justify-center bg-primary/5">
                    <Image 
                      src={resolveAsset(metadata.icon) || ''} 
                      fill
                      unoptimized
                      className="p-1 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                      alt="Module Logo"
                    />
                  </div>
               ) : (
                  <Box className="w-6 h-6 opacity-10" />
               )}
            </div>

            <div className="flex-1 space-y-2">
               <AssetSelector 
                  manifest={manifest}
                  selectedAssetId={metadata.icon}
                  onSelect={(id) => updateMetadata('icon', id)}
                  resolveAsset={resolveAsset}
               />
            </div>
         </div>
      </div>
    </div>
  );
}
