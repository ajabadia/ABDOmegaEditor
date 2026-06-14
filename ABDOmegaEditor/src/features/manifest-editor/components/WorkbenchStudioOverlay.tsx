'use client';

import CellStudioContainer from './lab/CellStudioContainer';
import type { OMEGA_Manifest, ManifestEntity } from '@/omega-ui-core/types/manifest';

interface WorkbenchStudioOverlayProps {
  studioCell: ManifestEntity | undefined;
  manifest: OMEGA_Manifest;
  resolveAsset: (id: string | undefined) => string | undefined;
  onFreeze: (template: unknown) => void;
  onSave: (cell: unknown) => void;
  onClose: () => void;
}

/**
 * WorkbenchStudioOverlay — Overlay del Cell Studio cuando está en modo edición.
 * Extraído de WorkbenchContainer.tsx para reducir el monolito.
 */
export function WorkbenchStudioOverlay({
  studioCell,
  manifest,
  resolveAsset,
  onFreeze,
  onSave,
  onClose
}: WorkbenchStudioOverlayProps) {
  return (
    <div className="flex-1 p-4 bg-black/20 animate-in fade-in zoom-in-95 duration-500">
      <CellStudioContainer
        initialCell={studioCell}
        manifest={manifest}
        resolveAsset={resolveAsset}
        onFreeze={onFreeze}
        onSave={onSave}
        onClose={onClose}
      />
    </div>
  );
}
