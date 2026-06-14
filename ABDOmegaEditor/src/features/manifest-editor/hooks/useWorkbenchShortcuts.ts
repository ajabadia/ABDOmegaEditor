'use client';

/**
 * @purpose Hook que registra atajos de teclado globales del workbench: persistencia, clipboard, historial, agrupación y Cell Studio
 * @lastUpdated 2026-06-14T17:45:00.000Z
 */

import { useEffect } from 'react';

interface WorkbenchEditor {
  addLog: (msg: string) => void;
  exportManifest: (mode?: 'work' | 'distilled') => void;
  exportOmegaPack: () => void;
  copyToClipboard: (id: string) => void;
  pasteFromClipboard: () => void;
  undo: () => void;
  redo: () => void;
  groupSelected: (ids: string[]) => string | undefined;
  ungroupNode: (groupId: string) => string[] | undefined;
}

export function useWorkbenchShortcuts(
  editor: WorkbenchEditor,
  selectedItemId: string | null,
  multiSelectedIds?: string[],
  onOpenCellStudio?: () => void
) {
  useEffect(() => {
    const isInputFocused = () => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      return (
        tag === 'input' || 
        tag === 'textarea' || 
        tag === 'select' || 
        active.hasAttribute('contenteditable') ||
        active.classList.contains('monaco-editor') ||
        active.closest('.monaco-editor') !== null
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Persistence (Ctrl+S) — export .omega pack
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        editor.addLog("[INPUT] Ctrl+S detected. Exporting .omega pack...");
        editor.exportOmegaPack();
      }

      // 2. Clipboard (Ctrl+C / Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedItemId && !isInputFocused()) {
          editor.copyToClipboard(selectedItemId);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (!isInputFocused()) {
          e.preventDefault();
          editor.pasteFromClipboard();
        }
      }

      // 3. History Engine (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isInputFocused()) {
          e.preventDefault();
          if (e.shiftKey) {
            editor.redo();
          } else {
            editor.undo();
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInputFocused()) {
          e.preventDefault();
          editor.redo();
        }
      }

      // 4. Group/Ungroup (Ctrl+G / Ctrl+Shift+G)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        if (!isInputFocused()) {
          e.preventDefault();
          if (e.shiftKey) {
            // Ungroup: if single selected node is a group
            if (selectedItemId) {
              editor.ungroupNode(selectedItemId);
            }
          } else {
            // Group: use multi-selection or fall back to single selection
            const ids = multiSelectedIds && multiSelectedIds.length > 1 ? multiSelectedIds : (selectedItemId ? [selectedItemId] : []);
            if (ids.length >= 2) {
              editor.groupSelected(ids);
            }
          }
        }
      }

      // 5. Cell Studio (Ctrl+Shift+E)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        if (!isInputFocused()) {
          e.preventDefault();
          if (onOpenCellStudio) {
            onOpenCellStudio();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, selectedItemId, multiSelectedIds, onOpenCellStudio]);
}
