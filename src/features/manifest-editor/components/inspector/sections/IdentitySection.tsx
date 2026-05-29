'use client';
 
import React from 'react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
 
// Modular Sub-components
import EntityIdentity from '@/features/manifest-editor/components/inspector/sections/identity/EntityIdentity';
import ModuleSignature from '@/features/manifest-editor/components/inspector/sections/identity/ModuleSignature';
import ModuleTaxonomy from '@/features/manifest-editor/components/inspector/sections/identity/ModuleTaxonomy';
import ModuleMechanicalSpec from '@/features/manifest-editor/components/inspector/sections/identity/ModuleMechanicalSpec';
import ModuleSkinSelector from '@/features/manifest-editor/components/inspector/sections/identity/ModuleSkinSelector';
import ModulePlaneSelector from '@/features/manifest-editor/components/inspector/sections/identity/ModulePlaneSelector';
 
interface IdentitySectionProps {
  item: OMEGA_Manifest | OmegaNode;
  onUpdate: (updates: Partial<OMEGA_Manifest> | Partial<OmegaNode>) => void;
  onHelp?: ((sectionId: string) => void) | undefined;
  rootManifest?: OMEGA_Manifest | undefined;
  rootTree?: OmegaNode | undefined;
  highlightPath?: (string | null) | undefined;
  resolveAsset: (id: string | undefined) => string | undefined;
}
 
export default function IdentitySection({ 
  item, 
  onUpdate, 
  rootManifest, 
  rootTree,
  highlightPath,
  resolveAsset
}: IdentitySectionProps) {
  const isModule = 'metadata' in item;
  const isHighlighted = (key: string) => !!highlightPath?.includes(key);
 
  if (!isModule) {
    return (
      <EntityIdentity 
        entity={item as OmegaNode} 
        rootManifest={rootManifest} 
        rootTree={rootTree}
        onUpdate={(u) => onUpdate(u)} 
        isHighlighted={isHighlighted} 
      />
    );
  }
 
  const manifest = item as OMEGA_Manifest;
 
  return (
    <div className="space-y-2">
      <ModuleSignature 
        manifest={manifest} 
        onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)} 
        resolveAsset={resolveAsset}
      />
 
      <div className="grid grid-cols-2 gap-2">
        <ModuleSkinSelector 
          manifest={manifest} 
          onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)} 
        />
        <ModulePlaneSelector 
          manifest={manifest}
          onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)}
        />
      </div>
      
      <ModuleTaxonomy 
        manifest={manifest} 
        onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)} 
        isHighlighted={isHighlighted} 
      />

      <ModuleMechanicalSpec 
        manifest={manifest} 
        onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)} 
      />
    </div>
  );
}
