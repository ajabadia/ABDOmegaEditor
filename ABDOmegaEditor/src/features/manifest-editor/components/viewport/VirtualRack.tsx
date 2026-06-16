'use client';

/**
 * @purpose Renderiza una vista modular de instrumento de alta fidelidad para editar manifestos OMEGA, incluyendo inyección de señal, líneas de modulación y componentes HUD del rack.
 * @purpose_en Renders a high-fidelity modular instrument view for editing OMEGA manifests, including signal injection, modulation lines, and rack HUD components.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:23,sig:1m2e8p8
 * @lastUpdated 2026-06-15T22:05:27.519Z
 */

import React, { useRef } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract, OMEGA_Modulation, HybridEntityUpdate, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/services/wasmLoader';
import type { AuditResult } from '@/services/auditService';

// Modular Components & Hooks
import { SignalInjector } from '../rack/SignalInjector';
import { ModulationLines } from '../rack/ModulationLines';
import { RackHUD } from '../rack/RackHUD';
import { useRackSimulation } from '@/features/manifest-editor/hooks/rack/useRackSimulation';
import { useRackLayout } from '@/features/manifest-editor/hooks/rack/useRackLayout';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import { UniversalRenderer } from '@/omega-ui-core/renderers/UniversalRenderer';
import { findNodeInTree, findParentInTree } from '@/omega-ui-core/uca/treeUtils';
import { snapToGrid } from '@/omega-ui-core/uca/spatialConstraints';
import { InjectionPreviewOverlay } from './InjectionPreviewOverlay';
import { GhostPreviewOverlay } from './GhostPreviewOverlay';
import BindingOverlay from '../rack/BindingOverlay';
import ConnectionOverlay from '../rack/ConnectionOverlay';
import type { GhostItem as AlignGhostItem } from '@/features/manifest-editor/utils/alignmentConstants';
import AlignGhostOverlay from './AlignGhostOverlay';
import RackContextMenu from './RackContextMenu';
import RackStartupAssistant from './RackStartupAssistant';
import { inputSignalService } from '@/services/inputSignalService';

interface VirtualRackProps {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: HybridEntityUpdate) => void;
  /** Batch update multiple nodes atomically (Bug 1 fix) */
  onUpdateItems?: ((updatesMap: Record<string, Partial<OmegaNode>>) => void) | undefined;
  zoom?: number;
  pan?: { x: number; y: number } | undefined;
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  audit: AuditResult;
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
  pushParameterUpdate?: ((id: string, value: number) => void) | undefined;
  previewManifest?: OMEGA_Manifest | null;
  multiSelectedIds: string[];
  onSelectMultiple: (ids: string[]) => void;
  hiddenNodeIds?: string[] | undefined;
  lockedNodeIds?: string[] | undefined;
  onDuplicateItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onGroupSelected?: (ids: string[]) => void;
  onUngroupNode?: (groupId: string) => void;
  // Phase 39 — wired from WorkbenchViewport (previously passed but not declared → TS2375)
  gridVisible?: boolean | undefined;

  // v9.1.7-dev — RackStartupAssistant wiring (REGRESSION_RECOVERY_PLAN.md item 23)
  onOpenGallery?: (() => void) | undefined;
  onLinkWorkspace?: (() => void) | undefined;
  onCreateFromScratch?: (() => void) | undefined;
  isDirectoryLinked?: boolean | undefined;

  // v9.2.1 — Interactive Ghost Preview Layer
  ghostPosition?: { x: number; y: number } | null | undefined;
  ghostSize?: { width: number; height: number } | undefined;
  isGhostCollision?: boolean | undefined;
  isGhostVisible?: boolean | undefined;
  onGhostMouseMove?: ((clientX: number, clientY: number) => void) | undefined;
  onGhostClick?: ((x: number, y: number) => void) | undefined;
  onGhostCancel?: (() => void) | undefined;

  // AlignGhostOverlay — ghost preview on alignment button hover
  alignGhostItems?: AlignGhostItem[] | undefined;
  alignGhostType?: string | undefined;

  // BindingOverlay — visual binding editor
  isBindingMode?: boolean | undefined;

  // P11 — Visual Connection Editor
  onAddModulation?: ((mod: OMEGA_Modulation) => void) | undefined;
  onRemoveModulation?: ((id: string) => void) | undefined;
}



/** Snap a node's position to grid — writes layout: { pos } only (no spread). */
function handleSnapToGrid(
  id: string,
  manifest: OMEGA_Manifest,
  onUpdateItem: (id: string, updates: HybridEntityUpdate) => void
) {
  const rootTree = manifest.ui?.tree;
  if (!rootTree) return;
  const node = findNodeInTree(rootTree, id);
  if (node && node.layout?.pos) {
    const gridConfig = manifest.ui?.layout?.grid || { spacingX: 24, spacingY: 24, snapMode: 'center', enabled: true, visible: true, showGuides: false };
    const snapped = snapToGrid(node.layout.pos, { ...gridConfig, enabled: true });
    onUpdateItem(id, { layout: { pos: { x: Math.round(snapped.x), y: Math.round(snapped.y) } } });
  }
}



/**
 * VirtualRack (v7.2.3) - Aseptic Orchestrator
 * High-fidelity modular instrument viewport.
 */
import { useDesignTokens } from '@/features/manifest-editor/hooks/useDesignTokens';

export default function VirtualRack({
  manifest,
  contract,
  selectedItemId,
  onSelectItem,
  onUpdateItem,
  zoom = 1.0,
  pan = { x: 0, y: 0 },
  isLiveMode,
  setIsLiveMode,
  resolveAsset,
  pushParameterUpdate,
  previewManifest,
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
  onUpdateItems,
  gridVisible: gridVisibleProp,
  onOpenGallery,
  onLinkWorkspace,
  onCreateFromScratch,
  isDirectoryLinked,
  ghostPosition,
  ghostSize,
  isGhostCollision,
  isGhostVisible = false,
  onGhostMouseMove,
  onGhostClick,
  onGhostCancel,
  alignGhostItems,
  alignGhostType,
  isBindingMode = false,
  onAddModulation,
  onRemoveModulation,
}: VirtualRackProps) {
  const rackRef = useRef<HTMLDivElement>(null);
  const skin = manifest.ui?.skin || 'industrial';
  const { allVars } = useDesignTokens(manifest);
  const [activePlane, setActivePlane] = React.useState('MAIN');
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; targetId: string | null; multiSelectedIds: string[] } | null>(null);
  const [activeDragOffset, setActiveDragOffset] = React.useState<{ x: number; y: number; draggedNodeId: string } | null>(null);
  const [isStartupDismissed, setIsStartupDismissed] = React.useState(false);


  // ── Ghost Preview: keyboard confirm (Enter) & cancel (Escape) ───────
  React.useEffect(() => {
    if (!isGhostVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onGhostCancel) {
        onGhostCancel();
      } else if (e.key === 'Enter' && onGhostClick && ghostPosition) {
        e.preventDefault();
        onGhostClick(ghostPosition.x, ghostPosition.y);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGhostVisible, onGhostCancel, onGhostClick, ghostPosition]);

  // ── Ghost Preview: mouse move tracking ─────────────────────────────
  const handleRackMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!isGhostVisible || !onGhostMouseMove || !rackRef.current) return;
    // Convert screen coordinates to rack-local coordinates
    const rect = rackRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    const rackX = dx / zoom;
    const rackY = dy / zoom;
    onGhostMouseMove(rackX, rackY);
  }, [isGhostVisible, onGhostMouseMove, zoom]);

  // ── Ghost Preview: click to confirm injection ──────────────────────
  const handleRackGhostClick = React.useCallback((x: number, y: number) => {
    if (!isGhostVisible || !onGhostClick) return;
    onGhostClick(x, y);
  }, [isGhostVisible, onGhostClick]);

  // ── Binding Overlay: handle bind change ─────────────────────────────
  const handleBindNode = React.useCallback((nodeId: string, bind: string) => {
    onUpdateItem(nodeId, { bind });
  }, [onUpdateItem]);

  // ASEPTIC LAYOUT & SIMULATION
  const { width, height, allElements } = useRackLayout(manifest);
  const { runtimeValues, activeInjectorPort, setActiveInjectorPort, updateValue } = useRackSimulation(allElements, isLiveMode, pushParameterUpdate);

  // Active signal port IDs for modulation lines visualization
  const activeSignalPortIds = Object.keys(inputSignalService.getAllActiveSignals());

  const grid = manifest.ui?.layout?.grid;
  const gridSpacingX = grid?.spacingX ?? 24;
  const gridSpacingY = grid?.spacingY ?? 24;
  // Phase 39 — prefer prop from WorkbenchViewport, fall back to manifest-derived value.
  // Removes the previous duplicate `gridVisible` (local const + prop pass) that triggered TS2375.
  const gridVisible = gridVisibleProp ?? (grid?.visible ?? false);

  // RACK MASTER ENTITY (Era 7.2.3 Architectural Host)
  const rackNode: OmegaNode = {
    id: 'RACK_MASTER',
    kind: 'rack',
    role: 'infrastructure',
    cellRef: 'rack',
    layout: {
      pos: { x: 0, y: 0 },
      size: { width: manifest.ui?.dimensions?.width || 800, height: manifest.ui?.dimensions?.height || 400 }
    },
    meta: {
      label: 'Master Rack Chassis'
    },
    style: {
      ...((manifest.ui as Record<string, unknown>)?.style || {}),
      attachments: (manifest.ui as Record<string, unknown>)?.attachments || []
    }
  };

  const rackHTML = CellRenderer.renderCellHTML(rackNode, {
    skin,
    zoom: 1.0,
    runtimeValue: 0,
    steps: 100,
    manifest,
    resolveAsset,
    isLiveMode
  });

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center gap-8 p-12 relative overflow-hidden" 
      onClick={() => onSelectItem(null)}
      style={allVars as React.CSSProperties}
    >
      <RackHUD 
        isLiveMode={isLiveMode} 
        setIsLiveMode={setIsLiveMode} 
        activeTab={activePlane} 
        setActiveTab={setActivePlane} 
        allElements={allElements} 
        planes={manifest.ui.layout?.planes || ['MAIN']}
      />
 
      {/* RACK FRAME (UNIFIED ENGINE) */}
      <div 
        ref={rackRef} 
        className={`rack-viewport relative transition-[box-shadow] duration-500 ${isLiveMode ? 'shadow-[0_0_120px_rgba(0,0,0,1)]' : ''}`}
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          boxShadow: isLiveMode ? '0 0 120px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.3)',
          transform: `translate(${pan?.x ?? 0}px, ${pan?.y ?? 0}px) scale(${zoom})`,
          transformOrigin: 'center center'
        }}
        onMouseDown={(e) => {
          if (isGhostVisible && ghostPosition) {
            e.stopPropagation();
            if (e.button === 0) {
              handleRackGhostClick(ghostPosition.x, ghostPosition.y);
            }
            return;
          }
        }}
        onClick={(e) => {
          if (isGhostVisible) {
            e.stopPropagation();
            return;
          }
          e.stopPropagation(); onSelectItem(null);
        }}
        onMouseMove={handleRackMouseMove}
        onContextMenu={(e) => {
          if (isLiveMode) return;
          e.preventDefault();
          e.stopPropagation();
          if (isGhostVisible) {
            if (onGhostCancel) onGhostCancel();
            return;
          }
          const target = e.target as HTMLElement;
          const ucaNode = target.closest('[id^="uca-"]');
          const targetId = ucaNode ? ucaNode.id.replace('uca-', '') : null;
          if (targetId) {
            // Capture multi-selection BEFORE onSelectItem clears it (Bug 2 fix)
            const isAlreadySelected = multiSelectedIds.includes(targetId);
            const currentMultiSelection = multiSelectedIds.length >= 2 && isAlreadySelected
              ? [...multiSelectedIds]
              : [targetId];
            // Only update selection if the clicked node is NOT already part of multi-selection
            if (!isAlreadySelected) {
              onSelectItem(targetId);
            }
            setContextMenu({ x: e.clientX, y: e.clientY, targetId, multiSelectedIds: currentMultiSelection });
          }
        }}
      >
        {/* The Master Chassis HTML */}
        <div 
          className="absolute inset-0 pointer-events-none"
          dangerouslySetInnerHTML={{ __html: rackHTML }}
        />

        {/* GRID OVERLAY */}
        {gridVisible && (
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255, 210, 0, 0.35) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 210, 0, 0.35) 1px, transparent 1px)
              `,
              backgroundSize: `${gridSpacingX}px ${gridSpacingY}px`,
            }}
          />
        )}

        {/* UCA NATIVE ENGINE (Recursive Tree) */}
        <div className="absolute inset-0 uca-native-layer">
          {(() => {
            const filterTree = (n: OmegaNode | null | undefined, hiddenIds: string[]): OmegaNode | null => {
              if (!n) return null;
              if (hiddenIds.includes(n.id)) return null;
              if (n.children) {
                return {
                  ...n,
                  children: n.children
                    .map(c => filterTree(c, hiddenIds))
                    .filter((c): c is OmegaNode => c !== null)
                };
              }
              return n;
            };

            const rootTree = manifest.ui?.tree;
            if (!rootTree) return null;
            const filteredTree = filterTree(rootTree, hiddenNodeIds);

            if (!filteredTree) return null;

            return (
              <UniversalRenderer 
                node={filteredTree} 
                manifest={manifest}
                catalog={manifest.moduleTemplates || {}}
                resolveAsset={resolveAsset}
                debugContext={{
                  enabled: manifest.ui?.ucaDebug?.enabled || false,
                  showLabels: manifest.ui?.ucaDebug?.showLabels !== false,
                  hideDecorative: manifest.ui?.ucaDebug?.hideDecorative || false,
                  showCADOverlay: manifest.ui?.ucaDebug?.showCADOverlay || false,
                  selectedId: selectedItemId,
                  multiSelectedIds: multiSelectedIds,
                  onSelect: onSelectItem,
                  onSelectMultiple: onSelectMultiple,
                  onUpdateNode: onUpdateItem,
                  onUpdateNodes: onUpdateItems,
                  runtimeValues: runtimeValues,
                  lockedNodeIds: lockedNodeIds,
                  isLiveMode: isLiveMode,
                  onUpdateRuntimeValue: updateValue,
                  zoom: zoom,
                  pan: pan,
                  activeDragOffset: activeDragOffset,
                  onUpdateDragOffset: setActiveDragOffset
              }}
              />
            );
          })()}
        </div>

        {/* MODULATION LINES OVERLAY (vR2) */}
        {activeSignalPortIds.length > 0 && (
          <ModulationLines
            activePortIds={activeSignalPortIds}
            containerRef={rackRef}
          />
        )}

        {/* CONNECTION OVERLAY — interactive modulation editor (P11) */}
        {onAddModulation && onRemoveModulation && (
          <ConnectionOverlay
            manifest={manifest}
            containerRef={rackRef}
            onAddModulation={onAddModulation}
            onRemoveModulation={onRemoveModulation}
          />
        )}

        {/* BINDING OVERLAY — visual binding status + editor */}
        <BindingOverlay
          manifest={manifest}
          contract={contract}
          containerRef={rackRef}
          isBindingMode={isBindingMode}
          onBindNode={handleBindNode}
        />

        {/* BLUEPRINT STUDIO GHOST LAYER (Phase 11) */}
        {previewManifest && (
          <InjectionPreviewOverlay 
            previewManifest={previewManifest} 
            resolveAsset={resolveAsset} 
          />
        )}

        {/* INTERACTIVE GHOST PREVIEW LAYER (v9.2.1) */}
        {isGhostVisible && ghostPosition && ghostSize && (
          <GhostPreviewOverlay
            x={ghostPosition.x}
            y={ghostPosition.y}
            width={ghostSize.width}
            height={ghostSize.height}
            isCollision={isGhostCollision ?? false}
          />
        )}

        {/* ALIGNMENT GHOST PREVIEW — shown on hover over align buttons */}
        {alignGhostItems && alignGhostItems.length > 0 && alignGhostType && (
          <div data-ghost-overlay>
            <AlignGhostOverlay
              items={alignGhostItems}
              alignType={alignGhostType}
            />
          </div>
        )}

        {/* SIMULATION SIGNAL INJECTOR (Overlay) */}
        {activeInjectorPort && <SignalInjector portId={activeInjectorPort} onClose={() => setActiveInjectorPort(null)} />}

      </div>

      {/* EMPTY-RACK STARTUP ASSISTANT (v9.1.7-dev, REGRESSION_RECOVERY_PLAN item 23) */}
      {/* Only renders in ENGINEERING mode AND when the UCA tree has no elements loaded. */}
      {/* Uses the tree directly (not legacy projections) so that synchronous mutations from injectBlueprint
          are reflected immediately — fixes the async gap where cells render in DOM but the gate stays open. */}
      {/* v9.3.1 — Reinforced gate: checks both tree.children AND allElements (from useRackLayout) as
          fallback. This ensures the overlay dismisses when cells appear via any code path (tree mutation,
          legacy projections, or third-party integration). */}
      {(() => {
        const tree = manifest.ui?.tree;
        const treeHasContent = !!tree && !!tree.children && tree.children.length > 0;
        const layoutHasContent = allElements.length > 0;

        if (!isLiveMode && !treeHasContent && !layoutHasContent && !isStartupDismissed) {
          return (
            <RackStartupAssistant
              onOpenGallery={onOpenGallery}
              onLinkWorkspace={onLinkWorkspace}
              onCreateFromScratch={() => {
                setIsStartupDismissed(true);
                if (onCreateFromScratch) onCreateFromScratch();
              }}
              isDirectoryLinked={isDirectoryLinked}
              elementCount={0}
            />
          );
        }
        return null;
      })()}

      {contextMenu && (() => {
        const cmMultiCount = contextMenu.multiSelectedIds.length;
        const targetId = contextMenu.targetId;
        const rootTree = manifest.ui?.tree;
        if (!rootTree) return null;

        const getParentGroupId = (id: string): string | undefined => {
          const parent = findParentInTree(rootTree, id);
          const rootId = manifest.ui?.tree?.id || 'root';
          // Include 'container' so injected blueprints (kind: 'container') can be ungrouped
          // but exclude the rack root node to prevent 'Ungroup' from showing for ungrouped elements
          if (parent && parent.id !== rootId && (parent.kind === 'group' || parent.kind === 'container')) {
            return parent.id;
          }
          return undefined;
        };

        const targetGroupId = targetId ? getParentGroupId(targetId) : undefined;
        const selectedIds = cmMultiCount >= 1 ? contextMenu.multiSelectedIds : (targetId ? [targetId] : []);
        const groupIds = selectedIds.map(id => getParentGroupId(id));
        const hasGroup = groupIds.some(gid => gid !== undefined);
        const allInSameGroup = selectedIds.length > 0 && groupIds.every(gid => gid !== undefined && gid === groupIds[0]);

        const isUngroupEnabled = hasGroup;
        const isGroupEnabled = selectedIds.length > 0 && !allInSameGroup;

        return (
          <RackContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            targetId={targetId}
            isLocked={targetId ? lockedNodeIds.includes(targetId) : false}
            isHidden={targetId ? hiddenNodeIds.includes(targetId) : false}
            onClose={() => setContextMenu(null)}
            onSelect={onSelectItem}
            onDuplicate={(dupId) => { if (onDuplicateItem) { onDuplicateItem(dupId); } else { onSelectItem(dupId); } }}
            onDelete={(delId) => { if (onRemoveItem) { onRemoveItem(delId); } else { onSelectItem(null); } }}
            onToggleLock={onToggleLock || (() => {})}
            onToggleVisibility={onToggleVisibility || (() => {})}
            onSnapToGrid={(id) => handleSnapToGrid(id, manifest, onUpdateItem)}
            isGroupEnabled={isGroupEnabled}
            isUngroupEnabled={isUngroupEnabled}
            {...(onGroupSelected ? { onGroup: () => { onGroupSelected(selectedIds); } } : {})}
            {...(onUngroupNode ? { onUngroup: () => { if (targetGroupId) onUngroupNode(targetGroupId); } } : {})}
          />
        );
      })()}
    </div>
  );
}
