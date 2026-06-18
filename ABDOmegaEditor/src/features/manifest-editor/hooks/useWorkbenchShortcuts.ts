'use client';

/**
 * @purpose Gestiona teclas de atajo global para características del tablero en el editor de manifesto OMEGA.
 * @purpose_en Manages global keyboard shortcuts for workbench features in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:61panj
 * @lastUpdated 2026-06-15T15:15:47.519Z
 */

import { useEffect } from 'react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree } from '@/omega-ui-core/uca/treeUtils';
import { computeScaleUpdates, getOriginalNodeSize } from '@/omega-ui-core/renderers/utils/scaleUtils';

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

export interface ShortcutCallbacks {
  onTabFocus?: (type: 'orbital' | 'rack' | 'source' | 'history') => void;
  onToggleGrid?: () => void;
  onToggleGuides?: () => void;
  onToggleWindow?: (name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs') => void;
  onOpenHelp?: () => void;
  onOpenAbout?: () => void;
  onOpenConfig?: () => void;
  onOpenAudit?: () => void;
  onReset?: () => void;
  onRemoveItem?: (id: string) => void;
  onDuplicateItem?: (id: string) => void;
  onSetTool?: (tool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null) => void;
  onOpenGallery?: () => void;
  onToggleMiniMap?: () => void;
  activeTool?: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null;
  onUpdateItems?: (updatesMap: Record<string, Partial<OmegaNode>>) => void;
  manifest?: OMEGA_Manifest;
}

export function useWorkbenchShortcuts(
  editor: WorkbenchEditor,
  selectedItemId: string | null,
  multiSelectedIds?: string[],
  onOpenCellStudio?: () => void,
  callbacks?: ShortcutCallbacks
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
      // 0. Skip if input focused for most shortcuts
      const skipDueToInput = isInputFocused();

      // ── View tab switching (Ctrl+1/2/3/4) ────────────────────────────
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !skipDueToInput) {
        const tabMap: Record<string, 'orbital' | 'rack' | 'source' | 'history'> = {
          '1': 'orbital',
          '2': 'rack',
          '3': 'source',
          '4': 'history',
        };
        const tabType = tabMap[e.key];
        if (tabType && callbacks?.onTabFocus) {
          e.preventDefault();
          callbacks.onTabFocus(tabType);
          return;
        }
      }

      // ── F1: Help manual ──────────────────────────────────────────────
      if (e.key === 'F1' && !skipDueToInput) {
        e.preventDefault();
        callbacks?.onOpenHelp?.();
        return;
      }

      // ── Skip the rest if input is focused ────────────────────────────
      if (skipDueToInput) return;

      // 1. Persistence (Ctrl+S) — export .omega pack
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        editor.addLog("[INPUT] Ctrl+S detected. Exporting .omega pack...");
        editor.exportOmegaPack();
        return;
      }

      // ── Ctrl+Shift+S: Export Definitive Mode (Distilled) ────────────
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        editor.addLog("[INPUT] Ctrl+Shift+S detected. Exporting distilled manifest...");
        editor.exportManifest('distilled');
        return;
      }

      // 2. Clipboard (Ctrl+C / Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedItemId) {
          editor.copyToClipboard(selectedItemId);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        editor.pasteFromClipboard();
        return;
      }

      // ── Ctrl+D: Duplicate selected node ────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedItemId) {
        e.preventDefault();
        callbacks?.onDuplicateItem?.(selectedItemId);
        return;
      }

      // 3. History Engine (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          editor.redo();
        } else {
          editor.undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        editor.redo();
        return;
      }

      // 4. Group/Ungroup (Ctrl+G / Ctrl+Shift+Alt+G — Ctrl+Shift+G is for Grid)
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'g' && !e.shiftKey) {
        e.preventDefault();
        const ids = multiSelectedIds && multiSelectedIds.length > 1 ? multiSelectedIds : (selectedItemId ? [selectedItemId] : []);
        if (ids.length >= 2) {
          editor.groupSelected(ids);
        }
        return;
      }

      // Ungroup (Ctrl+Shift+Alt+G)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (selectedItemId) {
          editor.ungroupNode(selectedItemId);
        }
        return;
      }

      // 5. Cell Studio (Ctrl+Shift+E)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (onOpenCellStudio) {
          onOpenCellStudio();
        }
        return;
      }

      // ── Window panel toggles (Ctrl+Shift + letter) ───────────────────
      // Collision resolution: L/H/B also used by alignment shortcuts in useAlignment.ts.
      // When ≥2 items are selected, alignment takes priority (the event falls through
      // to the alignment handler instead of toggling the panel).
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
        const windowMap: Record<string, 'window_layers' | 'window_properties' | 'window_blueprints' | 'window_info' | 'window_history' | 'window_logs' | 'window_compliance'> = {
          'l': 'window_layers',
          'p': 'window_properties',
          'b': 'window_blueprints',
          'i': 'window_info',
          'h': 'window_history',
          'c': 'window_logs',         // Console
          'a': 'window_compliance',    // Audit/Compliance
        };
        const key = e.key.toLowerCase();
        const windowName = windowMap[key];
        // Alignment collision: when ≥2 items selected for L/H/B, alignment wins over panel toggle
        const skipForAlignment = (key === 'l' || key === 'h' || key === 'b') && (multiSelectedIds?.length ?? 0) >= 2;
        if (windowName && callbacks?.onToggleWindow && !skipForAlignment) {
          e.preventDefault();
          callbacks.onToggleWindow(windowName);
          return;
        }
      }

      // ── Ctrl+Shift+G: Toggle Grid (G with Shift = Grid, not Group) ──
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        callbacks?.onToggleGrid?.();
        return;
      }

      // ── Ctrl+Shift+U: Toggle Guides ─────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        callbacks?.onToggleGuides?.();
        return;
      }

      // ── Ctrl+Shift+M: Toggle Mini Map ─────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        callbacks?.onToggleMiniMap?.();
        return;
      }

      // ── Ctrl+Shift+R: Reset Workspace / Align Right ────────────────
      // Collision resolution: when ≥2 items selected, alignment takes priority.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        if ((multiSelectedIds?.length ?? 0) >= 2) {
          // Let the event fall through to the alignment handler in useAlignment.ts
        } else {
          e.preventDefault();
          callbacks?.onReset?.();
          return;
        }
      }

      // ── Ctrl+Shift+Alt+R: Rack Properties (conflict with Reset) ─────
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        callbacks?.onToggleWindow?.('window_rack_properties');
        return;
      }

      // ── Delete / Backspace: Remove selected node ────────────────────
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault();
        callbacks?.onRemoveItem?.(selectedItemId);
        return;
      }

      // ── V: Select tool ───────────────────────────────────────────────
      if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        callbacks?.onSetTool?.('select');
        return;
      }

      // ── T: Transform tool ──────────────────────────────────────────────
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        callbacks?.onSetTool?.('transform');
        return;
      }

      // ── Keyboard Arrow Resizing (a11y) ───────────────────────────────
      if (
        callbacks?.activeTool === 'transform' &&
        selectedItemId &&
        callbacks.manifest &&
        (e.ctrlKey || e.metaKey) &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        
        const root = callbacks.manifest.ui?.tree;
        if (!root) return;
        const targetNode = findNodeInTree(root, selectedItemId);
        if (!targetNode) return;

        const size = getOriginalNodeSize(targetNode);
        const grid = callbacks.manifest.ui?.layout?.grid;
        const spacingX = grid?.spacingX ?? 24;
        const spacingY = grid?.spacingY ?? 24;
        const stepX = grid?.enabled ? spacingX : 10;
        const stepY = grid?.enabled ? spacingY : 10;

        let newW = size.width;
        let newH = size.height;

        if (e.key === 'ArrowRight') {
          newW += stepX;
        } else if (e.key === 'ArrowLeft') {
          newW = Math.max(16, newW - stepX);
        } else if (e.key === 'ArrowDown') {
          newH += stepY;
        } else if (e.key === 'ArrowUp') {
          newH = Math.max(16, newH - stepY);
        }

        // If shift key is also held, scale proportionally
        if (e.shiftKey) {
          const ratio = size.width > 0 ? size.width / size.height : 1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }
        }

        const updates = computeScaleUpdates(
          selectedItemId,
          Math.round(newW),
          Math.round(newH),
          targetNode.layout?.pos?.x ?? 0,
          targetNode.layout?.pos?.y ?? 0,
          callbacks.manifest
        );

        if (callbacks.onUpdateItems) {
          callbacks.onUpdateItems(updates);
        }
        return;
      }

      // ── M: Marquee tool ─────────────────────────────────────────────
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        callbacks?.onSetTool?.('marquee');
        return;
      }

      // ── A: Add primitives tool ───────────────────────────────────────
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        callbacks?.onSetTool?.('add');
        return;
      }

      // ── B: Blueprints Gallery ────────────────────────────────────────
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        callbacks?.onOpenGallery?.();
        callbacks?.onSetTool?.('select'); // Reset to select after opening gallery
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, selectedItemId, multiSelectedIds, onOpenCellStudio, callbacks]);
}
