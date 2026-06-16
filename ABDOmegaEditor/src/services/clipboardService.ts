import type { OmegaNode, ManifestEntity } from '@/omega-ui-core/types/manifest';
import { STORAGE_KEYS } from '@/features/manifest-editor/constants/storage';

import { cloneAndRegenerateNodeIds } from '@/features/manifest-editor/utils/idManagement';

/**
 * @purpose Gestiona operaciones del portapapeles para copiar y pegar nodos/entidades con regeneración automática de ID en el editor de manifesto OMEGA.
 * @purpose_en Manages clipboard operations for copying and pasting nodes/entites with automatic ID regeneration in the OMEGA manifest editor.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:6or5kr
 * @lastUpdated 2026-06-15T16:56:47.856Z
 */
export const ClipboardService = {
  copy: (item: OmegaNode | ManifestEntity) => {
    const data = JSON.stringify(item);
    localStorage.setItem(STORAGE_KEYS.CLIPBOARD, data);
    console.log(`[CLIPBOARD] Copied item: ${item.id}`);
  },

  paste: (): (OmegaNode | ManifestEntity) | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CLIPBOARD);
    if (!data) return null;
    
    try {
      const item = JSON.parse(data) as OmegaNode | ManifestEntity;
      
      // Industrial ID Regeneration (Phase 20.6)
      if ('kind' in item) {
        const result = cloneAndRegenerateNodeIds(item as OmegaNode);
        return result.node;
      }
      
      return item;
    } catch (e) {
      console.error('[CLIPBOARD] Paste failed:', e);
      return null;
    }
  }
};
