'use client';

import { useCallback, useState } from 'react';
import type { BlueprintDefinition, ManifestEntity } from '@/omega-ui-core/types/manifest';
import type { ManifestDiffResult } from '../types/diff';

interface WorkbenchActions {
  toggleUIState: (key: 'isAuditModalOpen' | 'isCellEditorOpen' | 'blueprintGalleryOpen' | 'isAboutModalOpen' | 'mockupOpen' | 'showLogs' | 'isLiveMode' | 'showModGrid') => void;
  setIsDiffModalOpen: (open: boolean) => void;
  setActiveDiff: (diff: ManifestDiffResult | null) => void;
  setSelectedNode: (id: string | null) => void;
  setStudioMode: (isOpen: boolean, cellId?: string) => void;
}

interface WorkbenchState {
  blueprintGalleryOpen: boolean;
  isAuditModalOpen: boolean;
  isCellEditorOpen: boolean;
  isDiffModalOpen: boolean;
  activeDiff: ManifestDiffResult | null;
}

interface ManifestEditor {
  applyTemplate: (blueprint: BlueprintDefinition) => void;
  compareWithHistory: (index: number) => ManifestDiffResult | null;
  addEntity: (type: 'control' | 'jack', data?: Partial<ManifestEntity>) => string | null;
}

export function useWorkbenchModals(
  state: WorkbenchState,
  actions: WorkbenchActions,
  editor: ManifestEditor,
  handleSelectItem: (id: string | null) => void,
  selectedItemId: string | null,
  onOpenGovernance?: () => void,
  onOpenAudit?: () => void,
  onOpenCellEditor?: () => void,
  isCellLibraryOpenProp?: boolean,
  setIsCellLibraryOpenProp?: (open: boolean) => void
) {
  // Local state for cell library when not controlled from props
  const [localIsCellLibraryOpen, setLocalIsCellLibraryOpen] = useState(false);
  const isCellLibraryOpen = isCellLibraryOpenProp ?? localIsCellLibraryOpen;
  const setIsCellLibraryOpen = setIsCellLibraryOpenProp ?? setLocalIsCellLibraryOpen;

  // Configuration (Governance) Modal Open Handler
  const handleOpenConfig = useCallback(() => {
    if (onOpenGovernance) {
      onOpenGovernance();
    }
  }, [onOpenGovernance]);

  // Auditor Modal Open Handler
  const handleOpenAudit = useCallback(() => {
    if (onOpenAudit) {
      onOpenAudit();
    } else {
      actions.toggleUIState('isAuditModalOpen');
    }
  }, [onOpenAudit, actions]);

  // Cell Editor Open Handler - Connected to modern CellStudioContainer (setStudioMode)
  const handleOpenCellEditor = useCallback(() => {
    if (!selectedItemId) return;
    if (onOpenCellEditor) {
      onOpenCellEditor();
    } else {
      actions.setStudioMode(true, selectedItemId);
    }
  }, [onOpenCellEditor, actions, selectedItemId]);

  // Gallery visibility handler
  const setIsGalleryOpen = useCallback((open?: boolean) => {
    if (typeof open === 'boolean') {
      if (open !== state.blueprintGalleryOpen) {
        actions.toggleUIState('blueprintGalleryOpen');
      }
    } else {
      actions.toggleUIState('blueprintGalleryOpen');
    }
  }, [state.blueprintGalleryOpen, actions]);

  // Apply template wrapper
  const handleApplyTemplate = useCallback((blueprint: BlueprintDefinition) => {
    editor.applyTemplate(blueprint);
    setIsGalleryOpen(false);
  }, [editor, setIsGalleryOpen]);

  // History Diff helper
  const handleCompareWithHistory = useCallback((index: number) => {
    const diff = editor.compareWithHistory(index);
    if (diff) {
      actions.setActiveDiff(diff);
      actions.setIsDiffModalOpen(true);
    }
  }, [editor, actions]);

  // Library Entity addition
  const handleAddFromLibrary = useCallback((dna: Record<string, unknown>) => {
    const type: 'control' | 'jack' = dna.type === 'port' ? 'jack' : 'control';
    const id = editor.addEntity(type, { ...dna, category: 'primitive' } as unknown as Partial<ManifestEntity>);
    if (id) {
      handleSelectItem(id);
    }
  }, [editor, handleSelectItem]);

  return {
    isCellLibraryOpen,
    setIsCellLibraryOpen,
    handleOpenConfig,
    handleOpenAudit,
    handleOpenCellEditor,
    setIsGalleryOpen,
    handleApplyTemplate,
    handleCompareWithHistory,
    handleAddFromLibrary
  };
}
