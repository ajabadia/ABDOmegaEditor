'use client';

;
import { X } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import AssetSelector from '../inspector/shared/AssetSelector';

interface CellStudioAssetOverlayProps {
  activeLayerId: string | null;
  activeManifest: OMEGA_Manifest;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  onSelect: (layerId: string, assetId: string) => void;
  onClose: () => void;
}

/**
 * CellStudioAssetOverlay — Overlay del selector de assets para capas de receta.
 * Extraído de CellStudioContainer.tsx.
 */
export function CellStudioAssetOverlay({
  activeLayerId,
  activeManifest,
  resolveAsset,
  onSelect,
  onClose
}: CellStudioAssetOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-[800px] h-[600px] wb-surface border wb-outline rounded-xs overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle shrink-0">
          <h3 className="text-base font-black uppercase tracking-widest text-accent">Select Layer Asset</h3>
          <button onClick={onClose} className="p-1.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-red-500/10 hover:border-red-500/30 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1">
          <AssetSelector
            manifest={activeManifest} resolveAsset={resolveAsset ?? ((id: string | undefined) => id)} restrictToSequences={true}
            onSelect={(assetId) => {
              if (activeLayerId && assetId) {
                onSelect(activeLayerId, assetId as string);
              }
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
