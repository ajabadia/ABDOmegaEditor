'use client';

import { useCallback } from 'react';
import { ClipboardService } from '@/services/clipboardService';
import type { OmegaNode, ManifestEntity } from '@/omega-ui-core/types/manifest';

interface ClipboardDependencies {
  findItem: (id: string) => OmegaNode | ManifestEntity | undefined;
  pasteEntity: (entity: OmegaNode | ManifestEntity) => string;
  addLog: (msg: string) => void;
}

/**
 * OMEGA ERA 7.2.3 - CLIPBOARD ACTIONS HOOK
 * Handles cross-document entity transfer.
 */
export const useClipboardActions = ({
  findItem,
  pasteEntity,
  addLog
}: ClipboardDependencies) => {
  const copyToClipboard = useCallback((id: string) => {
    const item = findItem(id);
    if (item) {
      ClipboardService.copy(item);
      addLog(`[SYSTEM] Copied item ${id} to clipboard.`);
    }
  }, [findItem, addLog]);

  const pasteFromClipboard = useCallback(() => {
    const item = ClipboardService.paste();
    if (item) {
      const newId = pasteEntity(item);
      addLog(`[SYSTEM] Industrial Paste Complete: ${newId} (Source: ${item.id})`);
    } else {
      addLog(`[WARNING] Clipboard empty or incompatible data.`);
    }
  }, [pasteEntity, addLog]);

  return {
    copyToClipboard,
    pasteFromClipboard
  };
};
