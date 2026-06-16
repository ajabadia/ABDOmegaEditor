'use client';

/**
 * @purpose Gestiona acciones del clipboard para transferir entidades entre documentos en el editor de manifesto OMEGA.
 * @purpose_en Manages clipboard actions for transferring entities between documents in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:1j55r3e
 * @lastUpdated 2026-06-15T13:12:29.331Z
 */

import { useCallback } from 'react';
import { ClipboardService } from '@/services/clipboardService';
import { toast } from '@/features/manifest-editor/utils/toast';
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
      toast.success('Copied to clipboard');
    }
  }, [findItem, addLog]);

  const pasteFromClipboard = useCallback(() => {
    const item = ClipboardService.paste();
    if (item) {
      const newId = pasteEntity(item);
      addLog(`[SYSTEM] Industrial Paste Complete: ${newId} (Source: ${item.id})`);
      toast.success('Pasted from clipboard');
    } else {
      addLog(`[WARNING] Clipboard empty or incompatible data.`);
      toast.warning('Clipboard empty or incompatible data');
    }
  }, [pasteEntity, addLog]);

  return {
    copyToClipboard,
    pasteFromClipboard
  };
};
