/**
 * @jest-environment jsdom
 *
 * Tests for useWorkbenchShortcuts hook — Ctrl+Shift+E shortcut
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useWorkbenchShortcuts } from '../useWorkbenchShortcuts';

// ── Helpers ─────────────────────────────────────────────────────────────
function createMockEditor() {
  return {
    addLog: jest.fn(),
    exportManifest: jest.fn(),
    exportOmegaPack: jest.fn(),
    copyToClipboard: jest.fn(),
    pasteFromClipboard: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    groupSelected: jest.fn() as (...args: unknown[]) => string | undefined,
    ungroupNode: jest.fn() as (...args: unknown[]) => string[] | undefined,
  };
}

function dispatchKeydown(key: string, options: KeyboardEventInit = {}): void {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
}

beforeEach(() => {
  jest.restoreAllMocks();
  // Ensure no input is focused by default
  if (document.activeElement && document.activeElement !== document.body) {
    (document.activeElement as HTMLElement).blur();
  }
});

afterEach(() => {
  // Clean up any lingering focused elements
  document.body.innerHTML = '';
});

// ── Ctrl+Shift+E → onOpenCellStudio ─────────────────────────────────────

describe('useWorkbenchShortcuts — Ctrl+Shift+E', () => {
  it('should call onOpenCellStudio when Ctrl+Shift+E is pressed', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).toHaveBeenCalledTimes(1);
  });

  it('should call onOpenCellStudio when Meta+Shift+E is pressed (macOS)', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { metaKey: true, shiftKey: true });

    expect(onOpenCellStudio).toHaveBeenCalledTimes(1);
  });

  it('should not call onOpenCellStudio when no callback is provided (omitted param)', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    // Omit the 4th parameter entirely — hook should not crash
    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', []));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
  });

  it('should not call onOpenCellStudio for Ctrl+E without Shift', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: false });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
  });

  it('should not call onOpenCellStudio for Shift+E without Ctrl/Cmd', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: false, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
  });

  it('should not call onOpenCellStudio when an input field is focused', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    // Create and focus an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement?.tagName.toLowerCase()).toBe('input');

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should not call onOpenCellStudio when textarea is focused', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('should not call onOpenCellStudio when contenteditable element is focused', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);
    editable.focus();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
    document.body.removeChild(editable);
  });

  it('should call preventDefault when Ctrl+Shift+E is pressed', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    const event = new KeyboardEvent('keydown', {
      key: 'e',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle uppercase E (case insensitive)', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    // Ctrl+Shift+E with uppercase 'E' (e.g. CapsLock or Shift held)
    dispatchKeydown('E', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).toHaveBeenCalledTimes(1);
  });

  it('should not call onOpenCellStudio for other Ctrl+Shift keys', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('a', { ctrlKey: true, shiftKey: true });
    dispatchKeydown('r', { ctrlKey: true, shiftKey: true });
    dispatchKeydown('z', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
  });

  it('should not call onOpenCellStudio when a <select> element is focused', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();
    expect(document.activeElement?.tagName.toLowerCase()).toBe('select');

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
    document.body.removeChild(select);
  });

  it('should not call onOpenCellStudio when a monaco-editor element is focused', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    const monaco = document.createElement('div');
    monaco.classList.add('monaco-editor');
    monaco.tabIndex = -1; // make div focusable
    document.body.appendChild(monaco);
    monaco.focus();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
    document.body.removeChild(monaco);
  });

  it('should not call onOpenCellStudio when a child of monaco-editor is focused', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    const monaco = document.createElement('div');
    monaco.classList.add('monaco-editor');
    const child = document.createElement('span');
    child.tabIndex = -1; // make child focusable
    monaco.appendChild(child);
    document.body.appendChild(monaco);
    child.focus();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
    document.body.removeChild(monaco);
  });
});

// ── Cleanup ─────────────────────────────────────────────────────────────

describe('useWorkbenchShortcuts — cleanup', () => {
  it('should remove keydown listener on unmount', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    // Verify listener was added
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unmount();

    // Verify listener was removed
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('should not fire callbacks after unmount', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    const { unmount } = renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    unmount();

    dispatchKeydown('e', { ctrlKey: true, shiftKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
  });
});

// ── Coexistence with other shortcuts ────────────────────────────────────

describe('useWorkbenchShortcuts — coexistence', () => {
  it('should not interfere with Ctrl+S (export)', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('s', { ctrlKey: true });

    expect(onOpenCellStudio).not.toHaveBeenCalled();
    expect(editor.exportOmegaPack).toHaveBeenCalledTimes(1);
  });

  it('should not interfere with Ctrl+Z (undo)', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', [], onOpenCellStudio));

    dispatchKeydown('z', { ctrlKey: true });

    expect(editor.undo).toHaveBeenCalledTimes(1);
    expect(onOpenCellStudio).not.toHaveBeenCalled();
  });

  it('should not interfere with Ctrl+G (group)', () => {
    const editor = createMockEditor();
    const onOpenCellStudio = jest.fn();

    renderHook(() => useWorkbenchShortcuts(editor, 'node-1', ['node-1', 'node-2'], onOpenCellStudio));

    dispatchKeydown('g', { ctrlKey: true });

    expect(editor.groupSelected).toHaveBeenCalledTimes(1);
    expect(onOpenCellStudio).not.toHaveBeenCalled();
  });
});
