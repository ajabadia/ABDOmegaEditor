import { motion, AnimatePresence } from 'framer-motion';
import NodeCanvas from './NodeCanvas';
import VirtualRack from './VirtualRack';
import SourceViewer from './SourceViewer';
import ViewportControls from './ViewportControls';
import type { OMEGA_Manifest, ManifestEntity, LayoutContainer, OMEGA_Contract, HybridEntityUpdate } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/services/wasmLoader';
import type { AuditResult } from '@/services/auditService';

import { HistoryPanel } from '../inspector/HistoryPanel';
import type { HistoryEntry } from '../../types/document';

interface WorkbenchViewportProps {
  viewMode: 'orbital' | 'rack' | 'source' | 'history';
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  selectedItemId: string | null;
  multiSelectedIds: string[];
  onSelectItem: (id: string | null) => void;
  onSelectMultiple: (ids: string[]) => void;
  updateItem: (id: string, updates: HybridEntityUpdate) => void;
  updateManifest: (updates: Partial<OMEGA_Manifest>) => void;
  updateContainer: (id: string, updates: Partial<LayoutContainer>) => void;
  auditResult: AuditResult;
  zoom: number;
  pan: { x: number; y: number };
  handleZoom: (delta: number) => void;
  handlePan: (dx: number, dy: number) => void;
  handleResetViewport: () => void;
  handleFitViewport: (mode: string) => void;
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  resolveAsset?: (ref: string | undefined) => string | undefined;
  pushParameterUpdate?: (id: string, value: number) => void;
  
  // History Integration (Phase 9.2)
  past?: HistoryEntry[];
  onUndoTo?: (index: number) => void;
  onCompareWithHistory?: (index: number) => void;
}


interface ViewWrapperProps {
  children: React.ReactNode;
  id: string;
  applyTransform?: boolean;
  zoom: number;
  pan: { x: number; y: number };
}
 
const ViewWrapper = ({ children, id, applyTransform = true, zoom, pan }: ViewWrapperProps) => (
  <motion.div 
    key={id} 
    initial={{ opacity: 0 }} 
    animate={{ 
      opacity: 1, 
      scale: applyTransform ? zoom : 1, 
      x: applyTransform ? pan.x : 0, 
      y: applyTransform ? pan.y : 0 
    }} 
    exit={{ opacity: 0 }} 
    className={`h-full ${applyTransform ? 'origin-center' : ''}`}
  >
    {children}
  </motion.div>
);
 
export function WorkbenchViewport({
  viewMode,
  manifest,
  contract,
  selectedItemId,
  onSelectItem,
  updateItem,
  updateManifest,
  auditResult,
  zoom,
  pan,
  handleZoom,
  handlePan,
  handleResetViewport,
  handleFitViewport,
  isLiveMode,
  setIsLiveMode,
  resolveAsset,
  pushParameterUpdate,
  past,
  onUndoTo,
  onCompareWithHistory,
  multiSelectedIds,
  onSelectMultiple
}: WorkbenchViewportProps) {
  
  return (
    <section className="flex-1 relative wb-bg overflow-hidden transition-colors duration-500">
      {viewMode !== 'source' && viewMode !== 'history' && (
        <ViewportControls 
          zoom={zoom} 
          onZoom={handleZoom} 
          onPan={handlePan} 
          onReset={handleResetViewport} 
          onFit={() => handleFitViewport(viewMode)} 
        />
      )}
 
      <AnimatePresence mode="wait">
        {viewMode === 'orbital' && (
          <ViewWrapper id="orbital" zoom={zoom} pan={pan}>
            <NodeCanvas 
              manifest={manifest} 
              contract={contract} 
              selectedItemId={selectedItemId} 
              onSelectItem={onSelectItem} 
              multiSelectedIds={multiSelectedIds}
              onSelectMultiple={onSelectMultiple}
              audit={auditResult} 
            />
          </ViewWrapper>
        )}
 
        {viewMode === 'rack' && (
          <ViewWrapper id="rack" zoom={zoom} pan={pan}>
            <VirtualRack 
              manifest={manifest} 
              onSelectItem={onSelectItem} 
              selectedItemId={selectedItemId} 
              multiSelectedIds={multiSelectedIds}
              onSelectMultiple={onSelectMultiple}
              onUpdateItem={updateItem} 
              zoom={zoom} 
              isLiveMode={isLiveMode} 
              setIsLiveMode={setIsLiveMode} 
              audit={auditResult} 
              resolveAsset={resolveAsset}
              pushParameterUpdate={pushParameterUpdate}
            />
          </ViewWrapper>
        )}
 
        {viewMode === 'source' && (
          <ViewWrapper id="source" applyTransform={false} zoom={zoom} pan={pan}>
            <SourceViewer 
              manifest={manifest} 
              selectedItemId={selectedItemId} 
              onUpdate={updateManifest} 
            />
          </ViewWrapper>
        )}

        {viewMode === 'history' && (
          <ViewWrapper id="history" applyTransform={false} zoom={zoom} pan={pan}>
            <div className="h-full p-8 bg-black/40">
              <div className="max-w-2xl mx-auto h-full">
                <HistoryPanel 
                  past={past || []} 
                  onUndoTo={onUndoTo || (() => {})} 
                  onCompare={onCompareWithHistory || (() => {})}
                  className="h-full shadow-2xl border-white/10"
                />
              </div>
            </div>
          </ViewWrapper>
        )}
      </AnimatePresence>
    </section>
  );
}
