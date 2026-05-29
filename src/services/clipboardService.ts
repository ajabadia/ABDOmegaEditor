import type { OmegaNode, ManifestEntity } from '@/omega-ui-core/types/manifest';
import { STORAGE_KEYS } from '@/features/manifest-editor/constants/storage';

import { cloneAndRegenerateNodeIds } from '@/features/manifest-editor/utils/idManagement';

/**
 * OMEGA Clipboard Service (v7.2.3)
 * Industrial cross-document copy/paste engine.
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
