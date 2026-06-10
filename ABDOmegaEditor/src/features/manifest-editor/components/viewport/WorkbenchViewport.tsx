import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NodeCanvas from './NodeCanvas';
import VirtualRack from './VirtualRack';
import ViewportControls from './ViewportControls';
import RulerOverlay from './RulerOverlay';
import ViewportToolbar from './ViewportToolbar';
import type { OMEGA_Manifest, LayoutContainer, OMEGA_Contract, HybridEntityUpdate, GridGuide } from '@/omega-ui-core/types/manifest';
import { toggleGridField, updateGuides } from '../../utils/gridHelpers';
import type { OmegaContract } from '@/services/wasmLoader';
import type { AuditResult } from '@/services/auditService';
import type { UpdateManifestFn } from './ViewportToolbar';

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
  updateContainer?: ((id: string, updates: Partial<LayoutContainer>) => void) | undefined;
  onUpdateManifest?: UpdateManifestFn | undefined;
  auditResult: AuditResult;
  zoom: number;
  pan: { x: number; y: number };
  handleZoom: (delta: number) => void;
  handlePan: (dx: number, dy: number) => void;
  handleResetViewport: () => void;
  handleFitViewport: (mode: string) => void;
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
  pushParameterUpdate?: ((id: string, value: number) => void) | undefined;
  
  // History Integration (Phase 9.2)
  past?: HistoryEntry[] | undefined;
  onUndoTo?: ((index: number) => void) | undefined;
  onCompareWithHistory?: ((index: number) => void) | undefined;
  hiddenNodeIds?: string[] | undefined;
  lockedNodeIds?: string[] | undefined;
  onDuplicateItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onGroupSelected?: (ids: string[]) => void;
  onUngroupNode?: (groupId: string) => void;
  activeTool?: 'select' | 'marquee' | 'add' | 'studio' | null | undefined;
  uiTheme?: string | undefined;

  // v9.1.7-dev — RackStartupAssistant wiring (REGRESSION_RECOVERY_PLAN.md item 23)
  onOpenGallery?: (() => void) | undefined;
  onLinkWorkspace?: (() => void) | undefined;
  onCreateFromScratch?: (() => void) | undefined;
  isDirectoryLinked?: boolean | undefined;
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
  onUpdateManifest,
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
  onSelectMultiple,
  hiddenNodeIds = [],
  lockedNodeIds = [],
  onDuplicateItem,
  onRemoveItem,
  onToggleLock,
  onToggleVisibility,
  onGroupSelected,
  onUngroupNode,
  activeTool,
  uiTheme,
  onOpenGallery,
  onLinkWorkspace,
  onCreateFromScratch,
  isDirectoryLinked
}: WorkbenchViewportProps) {
  
  const grid = manifest.ui?.layout?.grid;
  const manifestShowGuides = grid?.showGuides ?? false;
  const [showGuides, setShowGuides] = useState(manifestShowGuides);
  const [guides, setGuides] = useState<GridGuide[]>(() => grid?.guides ?? []);

  // Adjust state during render when manifest values change to avoid useEffect setState warnings
  const [prevShowGuides, setPrevShowGuides] = useState(manifestShowGuides);
  if (manifestShowGuides !== prevShowGuides) {
    setPrevShowGuides(manifestShowGuides);
    setShowGuides(manifestShowGuides);
  }

  const externalGuides = grid?.guides;
  const [prevExternalGuides, setPrevExternalGuides] = useState(externalGuides);
  if (externalGuides !== prevExternalGuides) {
    setPrevExternalGuides(externalGuides);
    if (externalGuides) {
      setGuides(externalGuides);
    }
  }

  const sectionRef = useRef<HTMLElement>(null);
  
  // Marquee selection state
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number; sectionLeft: number; sectionTop: number } | null>(null);
  const didMarqueeRef = useRef(false);

  // Marquee window-level mouse handlers
  useEffect(() => {
    if (!marquee) return;
    const handleMove = (e: MouseEvent) => {
      setMarquee(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
    };
    const handleUp = (e: MouseEvent) => {
      if (marquee) {
        const dx = Math.abs(e.clientX - marquee.startX);
        const dy = Math.abs(e.clientY - marquee.startY);
        if (dx > 4 || dy > 4) {
          didMarqueeRef.current = true;
          const section = sectionRef.current;
          if (section) {
            const rect = section.getBoundingClientRect();
            const mLeft = Math.min(marquee.startX, marquee.currentX) - rect.left;
            const mTop = Math.min(marquee.startY, marquee.currentY) - rect.top;
            const mWidth = Math.abs(marquee.currentX - marquee.startX);
            const mHeight = Math.abs(marquee.currentY - marquee.startY);
            // Find all uca nodes and check intersection
            const ucaEls = section.querySelectorAll('[id^="uca-"]');
            const selected: string[] = [];
            ucaEls.forEach(el => {
              const nodeRect = el.getBoundingClientRect();
              const nodeRelX = nodeRect.left - rect.left;
              const nodeRelY = nodeRect.top - rect.top;
              if (
                nodeRelX < mLeft + mWidth && nodeRelX + nodeRect.width > mLeft &&
                nodeRelY < mTop + mHeight && nodeRelY + nodeRect.height > mTop
              ) {
                const id = (el.id as string).replace('uca-', '');
                if (id !== 'RACK_MASTER') selected.push(id);
              }
            });
            if (e.shiftKey || e.ctrlKey) {
              onSelectMultiple([...new Set([...multiSelectedIds, ...selected])]);
            } else {
              onSelectMultiple(selected);
            }
          }
        }
        setMarquee(null);
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [marquee, multiSelectedIds, onSelectMultiple]);

  const handleToggleRulers = useCallback(() => {
    setShowGuides(prev => !prev);
    onUpdateManifest?.(toggleGridField(manifest, 'showGuides'));
  }, [manifest, onUpdateManifest]);

  const handleGuidesChange = useCallback((newGuides: GridGuide[]) => {
    setGuides(newGuides);
    onUpdateManifest?.(updateGuides(manifest, newGuides));
  }, [manifest, onUpdateManifest]);

  const TOOLBAR_H = 28;
  
  return (
    <section 
      ref={sectionRef}
      className="flex-1 relative wb-bg overflow-hidden transition-colors duration-500"
      onMouseDown={(e) => {
        if (viewMode !== 'rack') return; // Marquee selection only on rack, not orbital
        if (activeTool !== 'marquee') return; // Only when marquee/lasso tool is active
        if (isLiveMode) return;
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('[id^="uca-"]')) return;
        if ((e.target as HTMLElement).closest('.viewport-controls, .ruler-overlay, [data-toolbar]')) return;
        const rect = sectionRef.current?.getBoundingClientRect();
        if (!rect) return;
        setMarquee({ startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY, sectionLeft: rect.left, sectionTop: rect.top });
      }}
      onClickCapture={(e) => { if (didMarqueeRef.current) { didMarqueeRef.current = false; e.stopPropagation(); } }}
      onClick={() => { if (didMarqueeRef.current) { didMarqueeRef.current = false; return; } }}
    >
      {viewMode !== 'source' && viewMode !== 'history' && (
        <ViewportControls 
          zoom={zoom} 
          onZoom={handleZoom} 
          onPan={handlePan} 
          onReset={handleResetViewport} 
          onFit={() => handleFitViewport(viewMode)}
          viewMode={viewMode}
          onToggleRulers={viewMode === 'rack' ? handleToggleRulers : undefined}
          rulersVisible={showGuides}
        />
      )}

      {/* RULER OVERLAY — rack view only */}
      {viewMode === 'rack' && (
        <RulerOverlay
          showGuides={showGuides}
          guides={guides}
          onGuidesChange={handleGuidesChange}
          toolbarHeight={TOOLBAR_H}
          pan={pan}
          zoom={zoom}
          rackWidth={manifest.ui?.dimensions?.width || 800}
          rackHeight={manifest.ui?.dimensions?.height || 400}
          uiTheme={uiTheme}
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
          <ViewWrapper id="rack" applyTransform={false} zoom={zoom} pan={pan}>
            {!isLiveMode && (
              <ViewportToolbar
                manifest={manifest}
                selectedIds={multiSelectedIds}
                onUpdateItem={updateItem}
                onUpdateManifest={onUpdateManifest ?? undefined}
              />
            )}
            <VirtualRack 
              manifest={manifest} 
              onSelectItem={onSelectItem} 
              selectedItemId={selectedItemId} 
              multiSelectedIds={multiSelectedIds}
              onSelectMultiple={onSelectMultiple}
              onUpdateItem={updateItem} 
              zoom={zoom} 
              pan={pan}
              isLiveMode={isLiveMode} 
              setIsLiveMode={setIsLiveMode} 
              audit={auditResult} 
              resolveAsset={resolveAsset}
              pushParameterUpdate={pushParameterUpdate}
              hiddenNodeIds={hiddenNodeIds}
              lockedNodeIds={lockedNodeIds}
              {...(onDuplicateItem != null ? { onDuplicateItem } : {})}
              {...(onRemoveItem != null ? { onRemoveItem } : {})}
              {...(onToggleLock != null ? { onToggleLock } : {})}
              {...(onToggleVisibility != null ? { onToggleVisibility } : {})}
              {...(onGroupSelected != null ? { onGroupSelected } : {})}
              {...(onUngroupNode != null ? { onUngroupNode } : {})}
              {...(onOpenGallery != null ? { onOpenGallery } : {})}
              {...(onLinkWorkspace != null ? { onLinkWorkspace } : {})}
              {...(onCreateFromScratch != null ? { onCreateFromScratch } : {})}
              {...(isDirectoryLinked != null ? { isDirectoryLinked } : {})}
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
      {/* MARQUEE SELECTION RECTANGLE */}
      {marquee && (
        <div
          className="absolute pointer-events-none border border-[#00b4ff] bg-[#00b4ff]/10 z-[200]"
          style={{
            left: Math.min(marquee.startX, marquee.currentX) - marquee.sectionLeft,
            top: Math.min(marquee.startY, marquee.currentY) - marquee.sectionTop,
            width: Math.abs(marquee.currentX - marquee.startX),
            height: Math.abs(marquee.currentY - marquee.startY),
          }}
        />
      )}
    </section>
  );
}
