'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import IngestionModal from './IngestionModal';
import HelpModal from './HelpModal';
import AuditModal from './AuditModal';
// import MockupModal from './MockupModal';
import AboutModal from './AboutModal';
import GlobalGovernanceModal from './GlobalGovernanceModal';
import UniversalCellEditorModal from './UniversalCellEditorModal';
// import UniversalCellLibraryModal from './UniversalCellLibraryModal';
import ManifestDiffModal from './ManifestDiffModal';
import BlueprintPromptDialog from './BlueprintPromptDialog';
import type { 
  OMEGA_Manifest, 
  BlueprintDefinition, 
  BlueprintPlaceholderValues 
} from '@/omega-ui-core/types/manifest';
import type { AuditResult } from '@/services/auditService';
import { useModuleMetrics } from '@/features/manifest-editor/hooks/useModuleMetrics';
import type { ManifestDiffResult, DiffEntry } from '@/features/manifest-editor/types/diff';

interface EditorModalsProps {
  manifest: OMEGA_Manifest;
  pendingFiles: File[] | null;
  setPendingFiles: (files: File[] | null) => void;
  handleBulkUpload: (files: File[]) => void;
  helpState: { isOpen: boolean; sectionId?: string | undefined };
  closeHelp: () => void;
  isAuditModalOpen: boolean;
  setIsAuditModalOpen: (open: boolean) => void;
  isAboutModalOpen: boolean;
  setIsAboutModalOpen: (open: boolean) => void;
  handleNavigateToIssue: (path: string) => void;
  auditResult: AuditResult;
  mockupOpen: boolean;
  setMockupOpen: (open: boolean) => void;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  onDeploy: () => void;
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;
  onUpdateManifest: (updates: Partial<OMEGA_Manifest>) => void;
  isCellEditorOpen: boolean;
  setIsCellEditorOpen: (open: boolean) => void;
  isCellLibraryOpen?: boolean | undefined;
  setIsCellLibraryOpen?: ((open: boolean) => void) | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddEntityFromLibrary?: ((template: any) => void) | undefined;
  
  // Phase 9.2 Diff Integration
  isDiffModalOpen?: boolean | undefined;
  setIsDiffModalOpen?: ((open: boolean) => void) | undefined;
  activeDiff?: ManifestDiffResult | null | undefined;
  onMergeEntries?: ((entries: DiffEntry[]) => void) | undefined;

  // Phase 9.4 Blueprint Integration
  blueprintInjection?: {
    activeBlueprint: BlueprintDefinition | null;
    isPromptOpen: boolean;
    setIsPromptOpen: (open: boolean) => void;
    confirmInjection: (values: BlueprintPlaceholderValues) => void;
    cancelInjection: () => void;
    onUpdatePlaceholder?: ((id: string, value: string | number | boolean) => void) | undefined;
  } | undefined;
}

import { STORAGE_KEYS } from '../../constants/storage';

export default function EditorModals({
  manifest,
  pendingFiles,
  setPendingFiles,
  handleBulkUpload,
  helpState,
  closeHelp,
  isAuditModalOpen,
  setIsAuditModalOpen,
  isAboutModalOpen,
  setIsAboutModalOpen,
  handleNavigateToIssue,
  auditResult,
  mockupOpen,
  setMockupOpen,
  resolveAsset,
  onDeploy,
  isConfigModalOpen,
  setIsConfigModalOpen,
  onUpdateManifest,
  isCellEditorOpen,
  setIsCellEditorOpen,
  isCellLibraryOpen,
  setIsCellLibraryOpen,
  onAddEntityFromLibrary,
  isDiffModalOpen,
  setIsDiffModalOpen,
  activeDiff,
  onMergeEntries,
  blueprintInjection
}: EditorModalsProps) {
  const { metrics, sysReady } = useModuleMetrics(manifest);

  return (
    <>
      <ManifestDiffModal 
        isOpen={isDiffModalOpen || false}
        onClose={() => setIsDiffModalOpen?.(false)}
        diff={activeDiff ?? null}
        onMergeEntries={(entries) => {
          onMergeEntries?.(entries);
          setIsDiffModalOpen?.(false);
        }}
      />
      <GlobalGovernanceModal 
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        manifest={manifest}
        onUpdate={onUpdateManifest}
        resolveAsset={resolveAsset || ((id) => id)}
      />
      <AnimatePresence>
        {pendingFiles && pendingFiles.length > 0 && (
          <IngestionModal 
            files={pendingFiles} 
            onConfirm={(selected) => {
              handleBulkUpload(selected);
              setPendingFiles(null);
            }}
            onCancel={() => setPendingFiles(null)}
          />
        )}
      </AnimatePresence>

      <HelpModal 
        isOpen={helpState.isOpen} 
        initialSectionId={helpState.sectionId} 
        onClose={closeHelp} 
      />

      <AuditModal 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
        onNavigate={handleNavigateToIssue}
        audit={auditResult} 
        manifest={manifest} 
      />

      {/* <MockupModal 
        isOpen={mockupOpen} 
        onClose={() => setMockupOpen(false)} 
        manifest={manifest} 
        audit={auditResult}
        resolveAsset={resolveAsset}
      /> */}

      <AboutModal 
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        metrics={metrics}
        sysReady={sysReady}
        onDeploy={onDeploy}
      />

      <AnimatePresence>
        {isCellEditorOpen && (
          <UniversalCellEditorModal 
            isOpen={isCellEditorOpen}
            onClose={() => setIsCellEditorOpen(false)}
            resolveAsset={resolveAsset}
            manifest={manifest}
            onSave={(cell) => {
              console.log("Saving Cell to Library:", cell);
              // ...
              setIsCellEditorOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* <UniversalCellLibraryModal 
        isOpen={isCellLibraryOpen || false}
        onClose={() => setIsCellLibraryOpen?.(false)}
        onSelect={(dna) => {
          onAddEntityFromLibrary?.(dna);
          setIsCellLibraryOpen?.(false);
        }}
        resolveAsset={resolveAsset}
      /> */}

      {/* Phase 9.4 Blueprint Prompt */}
      {blueprintInjection && (
        <BlueprintPromptDialog 
          key={blueprintInjection.activeBlueprint?.blueprintId || 'none'}
          isOpen={blueprintInjection.isPromptOpen}
          blueprint={blueprintInjection.activeBlueprint}
          onClose={blueprintInjection.cancelInjection}
          onConfirm={blueprintInjection.confirmInjection}
          onUpdatePlaceholder={blueprintInjection.onUpdatePlaceholder}
        />
      )}
    </>
  );
}
