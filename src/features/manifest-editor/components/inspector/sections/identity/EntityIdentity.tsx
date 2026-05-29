'use client';
 
import React from 'react';
import type { ManifestEntity, OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { getInspectorModel, buildInspectorPatch } from '@/features/manifest-editor/hooks/entities/ucaInspectorModel';
 
interface EntityIdentityProps {
  entity: ManifestEntity | OmegaNode;
  rootManifest?: OMEGA_Manifest | undefined;
  rootTree?: OmegaNode | undefined;
  onUpdate: (updates: Partial<ManifestEntity> | Partial<OmegaNode>) => void;
  onHelp?: ((id: string) => void) | undefined;
  isHighlighted?: ((key: string) => boolean) | undefined;
}
 
import PropertyField from '../../PropertyField';

export default function EntityIdentity({ entity, rootManifest, rootTree, onUpdate, isHighlighted }: EntityIdentityProps) {
  const model = getInspectorModel(entity, rootTree, rootManifest?.moduleTemplates);
 
  const getAuthority = () => {
    if (!rootManifest) return null;
    const cIdx = (rootManifest.ui?.controls || []).findIndex(c => c.id === model.id);
    if (cIdx !== -1) return { type: 'ParamId', value: cIdx };
    const jIdx = (rootManifest.ui?.jacks || []).findIndex(j => j.id === model.id);
    if (jIdx !== -1) return { type: 'PortId', value: jIdx };
    return null;
  };
  const auth = getAuthority();
 
  return (
    <div className="space-y-4">
       {auth && (
         <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full w-fit">
           <span className="text-[6px] text-primary font-black uppercase">{auth.type}:</span>
           <span className="text-[6px] text-primary font-mono font-bold">#{auth.value}</span>
         </div>
       )}

      <div className="grid grid-cols-2 gap-3">
        <PropertyField label="Canonical ID">
          <input 
            type="text" 
            value={model.id} 
            onChange={(e) => onUpdate(buildInspectorPatch(entity, { id: e.target.value }))}
            disabled={model.governance?.['id'] === 'locked'}
            className={`w-full bg-black/60 border ${isHighlighted?.('id') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : 'wb-outline'} rounded-xs px-2 py-1 text-[10px] font-mono wb-text outline-none focus:border-primary/40 transition-all font-mono [color-scheme:dark] ${model.governance?.['id'] === 'locked' ? 'opacity-60 cursor-not-allowed bg-black/80' : ''}`}
          />
        </PropertyField>
        
        <PropertyField label="Display Label">
          <input 
            type="text" 
            value={('label' in entity ? entity.label : (entity as OmegaNode).meta?.label as string) || ''} 
            onChange={(e) => onUpdate('label' in entity ? { label: e.target.value } : { meta: { ...((entity as OmegaNode).meta || {}), label: e.target.value } })}
            disabled={model.governance?.['label'] === 'locked'}
            className={`w-full bg-black/60 border ${isHighlighted?.('label') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : 'wb-outline'} rounded-xs px-2 py-1 text-[10px] font-bold wb-text outline-none focus:border-primary/40 transition-all [color-scheme:dark] ${model.governance?.['label'] === 'locked' ? 'opacity-50 cursor-not-allowed bg-black/80' : ''}`}
          />
        </PropertyField>
      </div>
    </div>
  );
}
