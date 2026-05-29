'use client';

import React from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { UniversalRenderer } from '@/omega-ui-core/renderers/UniversalRenderer';
import { manifestToTree } from '@/omega-ui-core/uca/ucaBridge';

interface InjectionPreviewOverlayProps {
  previewManifest: OMEGA_Manifest;
  resolveAsset?: ((ref: string | undefined) => (string | undefined)) | undefined;
}

/**
 * InjectionPreviewOverlay (Phase 11)
 * Renders the "Ghost" version of the manifest for blueprint pre-visualization.
 */
export const InjectionPreviewOverlay: React.FC<InjectionPreviewOverlayProps> = ({ 
  previewManifest,
  resolveAsset 
}) => {
  if (!previewManifest) return null;

  return (
    <div className="absolute inset-0 z-[60] pointer-events-none opacity-40 mix-blend-screen filter grayscale-[0.5] contrast-[0.8] brightness-[1.2]">
      <UniversalRenderer 
        node={previewManifest.ui.tree || manifestToTree(previewManifest)} 
        manifest={previewManifest} 
        catalog={previewManifest.moduleTemplates || {}}
        resolveAsset={resolveAsset}
        debugContext={{
          enabled: true,
          showLabels: true,
          hideDecorative: false,
          showCADOverlay: true,
          selectedId: null,
          onSelect: () => {},
          onUpdateNode: () => {}
        }}
      />
      
      {/* Visual Indicator of Preview Mode */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-black text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg animate-pulse">
        PREVIEW: GHOST MODE ACTIVE
      </div>
    </div>
  );
};
