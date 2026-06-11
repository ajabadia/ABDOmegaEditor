'use client';

import { useState, useEffect, useMemo } from 'react';
import { Database, Cpu, X } from 'lucide-react';
import { Box, Layers, Activity, Settings2 } from 'lucide-react';

// Core Imports
import type { ManifestEntity, OMEGA_Manifest, CellTemplate, ComponentType } from '@/omega-ui-core/types/manifest';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import { entityToNode } from '@/omega-ui-core/utils/entityToNode';
import { BehaviorResolver } from '@/omega-ui-core/utils/behaviorResolver';

// Hooks & Subcomponents
import { useCellStudioState, DEFAULT_CELL } from './useCellStudioState';
import { useCellStudioMode } from './useCellStudioMode';
import { useCellStudioDraft } from './useCellStudioDraft';
import { CellStudioDraftPrompt } from './CellStudioDraftPrompt';
import { CellStudioPreviewStrip } from './CellStudioPreviewStrip';
import { CellStudioToolbar } from './CellStudioToolbar';
import { CellStudioContentArea } from './CellStudioContentArea';
import { CellStudioAssetOverlay } from './CellStudioAssetOverlay';

interface CellStudioContainerProps {
  initialCell?: ManifestEntity | undefined;
  manifest?: OMEGA_Manifest | undefined;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  onSave: (cell: ManifestEntity) => void;
  onFreeze?: ((template: CellTemplate) => void) | undefined;
  onClose?: (() => void) | undefined;
  isModal?: boolean | undefined;
}

const STEPS = [
  { id: 'fragments', label: 'Parts', icon: Box, tab: 'fragments' },
  { id: 'behavior', label: 'Behavior', icon: Activity, tab: 'behavior' },
  { id: 'recipes', label: 'Layers', icon: Layers, tab: 'recipes' },
  { id: 'properties', label: 'Properties', icon: Settings2, tab: 'properties' }
];

export default function CellStudioContainer({
  initialCell,
  manifest,
  resolveAsset,
  onSave,
  onFreeze,
  onClose,
  isModal = false
}: CellStudioContainerProps) {
  // 1. Initialize Hooks
  const mode = useCellStudioMode();
  const isStepper = mode === 'stepper';

  const stateOptions = useMemo(() => {
    const opts: { initialCell?: ManifestEntity; manifest?: OMEGA_Manifest } = {};
    if (initialCell) opts.initialCell = initialCell;
    if (manifest) opts.manifest = manifest;
    return opts;
  }, [initialCell, manifest]);

  const { state, actions } = useCellStudioState(stateOptions);

  const { saveDraft, loadDraft, hasDraft, clearDraft, isDraftStale } = useCellStudioDraft();
  
  // 2. Draft Prompt State — inicializado con lazy init para evitar setState en effect
  const [showDraftPrompt, setShowDraftPrompt] = useState(() => hasDraft());

  // Auto-save draft on changes (only if it actually differs from the initial state)
  useEffect(() => {
    const isUnmodified = JSON.stringify(state.cellData) === JSON.stringify(initialCell || DEFAULT_CELL);
    if (!isUnmodified) {
      saveDraft({
        step: state.currentStep,
        cellData: state.cellData,
        behavior: state.behavior,
        recipe: state.recipe
      });
    }
  }, [state.currentStep, state.cellData, state.behavior, state.recipe, initialCell]);

  // Sync cell type with presentation component if they differ
  useEffect(() => {
    if (state.cellData.presentation && state.cellData.type !== state.cellData.presentation.component) {
      actions.setCellData(prev => ({
        ...prev,
        presentation: {
          tab: 'MAIN',
          variant: 'standard',
          offsetX: 0,
          offsetY: 0,
          attachments: [],
          ...prev.presentation,
          component: prev.type as ComponentType
        }
      }));
    }
  }, [state.cellData.type, state.cellData.presentation?.component, actions]);

  // Mock manifest for local aesthetic previewing
  const [mockManifest, setMockManifest] = useState<OMEGA_Manifest>(manifest || {
    schemaVersion: '1.0.0',
    id: 'laboratory',
    metadata: { name: 'Laboratory', family: 'Internal', version: '1.0.0', author: 'OMEGA' },
    ui: {
      dimensions: { width: 100, height: 100 },
      controls: [],
      jacks: [],
      layout: { width: 100, height: 100, containers: [], planes: ['MAIN'], tabStyles: {} },
      styles: {},
      skinMode: 'custom',
      palette: {
        primary: '#00f2ff', secondary: '#ff8c00', utility: '#a0a0a0', feedback: '#32cd32',
        hardware: '#777777', chassis: '#1a1a1a', glow: '#00f2ff', glass: 'rgba(255,255,255,0.05)',
        warning: '#ff3300', highlight: '#ffffff'
      },
      colors: { accent: '#00f2ff', surface: '#121416', text: '#ffffff', weak: '#555555' }
    },
    resources: { wasm: 'internal', assets: [] },
    entities: []
  });

  // 3. Computed Calculations
  const testValue = (state.cellData.presentation?.style as Record<string, unknown>)?.testValue as number ?? state.testValue;

  const resolved = useMemo(() => {
    return BehaviorResolver.resolve(testValue, {
      ...state.behavior,
      frameCount: (state.behavior.mapping?.frameRange?.end || 0) - (state.behavior.mapping?.frameRange?.start || 0) + 1
    });
  }, [testValue, state.behavior]);

  const previewHTML = useMemo(() => {
    try {
      return CellRenderer.renderCellHTML(entityToNode(state.cellData), {
        zoom: 2.5,
        runtimeValue: testValue,
        forceFrame: resolved.frame,
        steps: 128,
        skin: (mockManifest.ui as OMEGA_Manifest['ui'] & { skin?: string })?.skin || 'standard',
        manifest: mockManifest,
        resolveAsset: resolveAsset || ((id) => id),
        recipe: state.soloLayerId 
          ? { ...state.recipe, layers: state.recipe.layers.filter(l => l.id === state.soloLayerId) }
          : state.recipe
      });
    } catch (e) {
      return `<div class="p-4 text-[8px] text-red-500 font-mono">RENDER_ERROR: ${e}</div>`;
    }
  }, [state.cellData, mockManifest, resolveAsset, state.recipe, state.soloLayerId, testValue, resolved.frame]);

  // 4. Action Handlers
  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft) {
      actions.setCurrentStep(draft.step as 0 | 1 | 2 | 3);
      actions.setActiveTab(STEPS[draft.step].tab as 'fragments' | 'behavior' | 'recipes' | 'properties');
      actions.setCellData(draft.cellData);
      actions.setBehavior(draft.behavior);
      actions.setRecipe(draft.recipe);
    }
    setShowDraftPrompt(false);
  };

  const handleDismissDraft = () => {
    clearDraft();
    setShowDraftPrompt(false);
  };

  const handleExport = () => {
    const exportData = {
      ...state.cellData,
      description: state.description,
      assetBehavior: state.behavior,
      recipe: state.recipe,
      meta: { exportedAt: new Date().toISOString(), version: 'Era 7.2.3' }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omega_cell_${state.cellData.type}_${(state.cellData.label || 'unnamed').toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
  };

  const handleFreeze = () => {
    const dna = entityToNode(state.cellData);
    const template: CellTemplate = {
      id: state.cellData.id,
      label: state.cellData.label || 'Unnamed DNA',
      category: (state.cellData.role as CellTemplate['category']) || 'control',
      baseNode: dna,
      assetBehavior: state.behavior,
      recipe: state.recipe,
      version: '1.0.0',
      description: state.description || 'Certified UCA Cell Template'
    };
    
    if (onFreeze) {
      onFreeze(template);
    } else {
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${template.id}.json`;
      a.click();
    }
  };

  const handleFinalize = () => {
    clearDraft();
    onSave({ ...state.cellData, assetBehavior: state.behavior, recipe: state.recipe });
  };

  return (
    <div className={`flex flex-col h-full wb-bg overflow-hidden wb-text-muted ${isModal ? '' : 'rounded-xs border wb-outline'}`}>
      {/* HEADER (ASEPTIC STRIP) */}
      <div className="p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black uppercase tracking-widest wb-text">Universal Cell Studio</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[7px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-black uppercase">Phase 15 Isolation</span>
              <span className="text-[8px] md:text-[9px] wb-text-muted font-bold uppercase tracking-widest opacity-70">Era 7.2.3 Industrial Logic</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: PREVIEW PANEL */}
        <CellStudioPreviewStrip
          previewHTML={previewHTML}
          testValue={testValue}
          onScrub={(val) => actions.updateFragment('host', { testValue: val })}
          onReset={() => actions.updateFragment('host', { testValue: 0.75 })}
        />

        {/* CENTER: WORKSPACE */}
        <div className="flex-1 flex flex-col wb-bg overflow-hidden">
          <CellStudioToolbar
            cellData={state.cellData}
            activeTab={state.activeTab}
            currentStep={state.currentStep}
            isTypeLocked={state.isTypeLocked}
            isCommandCenterOpen={state.isCommandCenterOpen}
            isStepperMode={isStepper}
            setCellData={actions.setCellData}
            setActiveTab={actions.setActiveTab}
            setCurrentStep={actions.setCurrentStep}
            setIsCommandCenterOpen={actions.setIsCommandCenterOpen}
            STEPS={STEPS}
          />

          <div className="flex-1 overflow-y-auto p-6">
            <CellStudioContentArea
              activeTab={state.activeTab}
              isCommandCenterOpen={state.isCommandCenterOpen}
              selectedFragmentId={state.selectedFragmentId}
              cellData={state.cellData}
              behavior={state.behavior}
              recipe={state.recipe}
              activeManifest={mockManifest}
              resolveAsset={resolveAsset || ((id) => id)}
              soloLayerId={state.soloLayerId}
              resolved={resolved}
              addFragment={actions.addFragment}
              removeFragment={actions.removeFragment}
              moveFragment={actions.moveFragment}
              updateFragment={actions.updateFragment}
              setBehavior={actions.setBehavior}
              setRecipe={actions.setRecipe}
              setSelectedFragmentId={actions.setSelectedFragmentId}
              setSoloLayerId={actions.setSoloLayerId}
              setActiveTab={actions.setActiveTab}
              openAssetSelector={actions.openAssetSelector}
              setIsCommandCenterOpen={actions.setIsCommandCenterOpen}
              handleManifestUpdate={(updates) => setMockManifest(prev => ({ ...prev, ui: { ...prev.ui, ...updates.ui } }))}
            />
          </div>

          {/* ACTION BAR */}
          <div className="p-6 border-t wb-outline wb-surface-subtle flex items-center justify-end gap-3 shrink-0">
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify({ behavior: state.behavior, recipe: state.recipe }, null, 2))} className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-primary/5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer">Copy DNA</button>
            <button onClick={handleExport} className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-primary/5 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer">Export Entity</button>
            <button onClick={handleFreeze} className="px-6 py-2.5 rounded-xs bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer">
              <Database className="w-3.5 h-3.5" /> Freeze as DNA Template
            </button>
            <button onClick={handleFinalize} className="px-8 py-2.5 rounded-xs bg-accent text-black hover:brightness-110 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-4 shadow-[0_0_15px_rgba(var(--accent-rgb),0.25)] cursor-pointer">Finalize Cell</button>
          </div>
        </div>
      </div>

      {/* DRAFT NOTIFICATION MODAL */}
      {showDraftPrompt && (
        <CellStudioDraftPrompt
          isDraftStale={isDraftStale}
          onRestore={handleRestoreDraft}
          onDismiss={handleDismissDraft}
        />
      )}

      {/* ASSET SELECTOR OVERLAY */}
      {state.isAssetSelectorOpen && (
        <CellStudioAssetOverlay
          activeLayerId={state.activeLayerId}
          activeManifest={mockManifest}
          resolveAsset={resolveAsset}
          onSelect={(layerId, assetId) => {
            actions.setRecipe(prev => ({
              ...prev,
              layers: prev.layers.map(l => l.id === layerId ? { ...l, assetId } : l)
            }));
          }}
          onClose={actions.closeAssetSelector}
        />
      )}
    </div>
  );
}
