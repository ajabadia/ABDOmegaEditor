'use client';

import React, { useRef } from 'react';
import type { OMEGA_Manifest, HybridEntityUpdate, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { AuditResult } from '@/services/auditService';

// Modular Components & Hooks
import { SignalInjector } from '../rack/SignalInjector';
import { RackHUD } from '../rack/RackHUD';
import { useRackSimulation } from '@/features/manifest-editor/hooks/rack/useRackSimulation';
import { useRackLayout } from '@/features/manifest-editor/hooks/rack/useRackLayout';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import { UniversalRenderer } from '@/omega-ui-core/renderers/UniversalRenderer';
import { manifestToTree } from '@/omega-ui-core/utils/ucaBridge';
import { findNodeInTree, findParentInTree } from '@/omega-ui-core/uca/treeUtils';
import { snapToGrid } from '@/omega-ui-core/uca/spatialConstraints';
import { InjectionPreviewOverlay } from './InjectionPreviewOverlay';
import RackContextMenu from './RackContextMenu';
import RackStartupAssistant from './RackStartupAssistant';
 
interface VirtualRackProps {
  manifest: OMEGA_Manifest;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: HybridEntityUpdate) => void;
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
}



/** Snap a node's position to grid — writes layout: { pos } only (no spread). */
function handleSnapToGrid(
  id: string,
  manifest: OMEGA_Manifest,
  onUpdateItem: (id: string, updates: HybridEntityUpdate) => void
) {
  const rootTree = manifest.ui?.tree || manifestToTree(manifest, manifest.ui?.tree);
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
  gridVisible: gridVisibleProp,
  onOpenGallery,
  onLinkWorkspace,
  onCreateFromScratch,
  isDirectoryLinked
}: VirtualRackProps) {
  const rackRef = useRef<HTMLDivElement>(null);
  const skin = manifest.ui?.skin || 'industrial';
  const { allVars } = useDesignTokens(manifest);
  const [activePlane, setActivePlane] = React.useState('MAIN');
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; targetId: string | null; multiSelectedIds: string[] } | null>(null);
  const [activeDragOffset, setActiveDragOffset] = React.useState<{ x: number; y: number; draggedNodeId: string } | null>(null);
  const [isStartupDismissed, setIsStartupDismissed] = React.useState(false);


  
  // ASEPTIC LAYOUT & SIMULATION
  const { width, height, allElements } = useRackLayout(manifest);
  const { runtimeValues, activeInjectorPort, setActiveInjectorPort, updateValue } = useRackSimulation(allElements, isLiveMode, pushParameterUpdate);

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
        onClick={(e) => { e.stopPropagation(); onSelectItem(null); }}
        onContextMenu={(e) => {
          if (isLiveMode) return;
          e.preventDefault();
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const ucaNode = target.closest('[id^="uca-"]');
          const targetId = ucaNode ? ucaNode.id.replace('uca-', '') : null;
          if (targetId) {
            // Capture multi-selection BEFORE onSelectItem clears it
            const currentMultiSelection = multiSelectedIds.length >= 2 && multiSelectedIds.includes(targetId)
              ? [...multiSelectedIds]
              : [targetId];
            onSelectItem(targetId);
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

            const rootTree = manifest.ui?.tree || manifestToTree(manifest, manifest.ui?.tree);
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

        {/* BLUEPRINT STUDIO GHOST LAYER (Phase 11) */}
        {previewManifest && (
          <InjectionPreviewOverlay 
            previewManifest={previewManifest} 
            resolveAsset={resolveAsset} 
          />
        )}

        {activeInjectorPort && <SignalInjector portId={activeInjectorPort} onClose={() => setActiveInjectorPort(null)} />}

      </div>

      {/* EMPTY-RACK STARTUP ASSISTANT (v9.1.7-dev, REGRESSION_RECOVERY_PLAN item 23) */}
      {/* Only renders in ENGINEERING mode AND when the UCA tree has no elements loaded. */}
      {/* Uses the tree directly (not legacy projections) so that synchronous mutations from injectBlueprint
          are reflected immediately — fixes the async gap where cells render in DOM but the gate stays open. */}
      {(() => {
        const tree = manifest.ui?.tree || manifestToTree(manifest, manifest.ui?.tree);
        const treeHasContent = !!tree && !!tree.children && tree.children.length > 0;

        if (!isLiveMode && !treeHasContent && !isStartupDismissed) {
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
        const rootTree = manifest.ui?.tree || manifestToTree(manifest, manifest.ui?.tree);

        const getParentGroupId = (id: string): string | undefined => {
          const parent = findParentInTree(rootTree, id);
          return (parent && parent.kind === 'group') ? parent.id : undefined;
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
