'use client';

import { useEffect } from 'react';

interface WorkbenchEditor {
  addLog: (msg: string) => void;
  exportManifest: () => void;
  copyToClipboard: (id: string) => void;
  pasteFromClipboard: () => void;
  undo: () => void;
  redo: () => void;
}

export function useWorkbenchShortcuts(
  editor: WorkbenchEditor,
  selectedItemId: string | null
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
      // 1. Persistence (Ctrl+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        editor.addLog("[INPUT] Cmd+S detected. Triggering persistence...");
        editor.exportManifest();
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, selectedItemId]);
}
