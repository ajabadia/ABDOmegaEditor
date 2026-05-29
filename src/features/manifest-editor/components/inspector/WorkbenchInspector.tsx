'use client';

import React from 'react';

// import { motion, AnimatePresence } from 'framer-motion';
import PropertyPanel from './PropertyPanel';
import BlueprintLibraryPanel from './BlueprintLibraryPanel';
import type { OMEGA_Manifest, LayoutContainer, ManifestEntity, OMEGA_Modulation, ExtraResource, OmegaNode, BlueprintDefinition } from '@/omega-ui-core/types/manifest';
import type { AuditResult } from '@/features/manifest-editor/types/diagnostics';
import { Zap, FileText } from 'lucide-react';
import { findNodeInTree } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';

interface WorkbenchInspectorProps {
  // isVisible: boolean; (unused)
  isLiveMode: boolean;
  uiTheme: 'dark' | 'light';
  manifest: OMEGA_Manifest;
  selectedItem: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  selectedItemId: string | null;
  highlightPath: string | null;
  availableBinds: string[];
  extraResources: ExtraResource[];
  audit: AuditResult;
  onUpdateItem: (id: string, updates: Partial<ManifestEntity> | Partial<OmegaNode>) => void;
  onUpdateManifest: (updates: Partial<OMEGA_Manifest>) => void;
  onSelectItem: (id: string | null) => void;
  onAddEntity: (type: 'control' | 'jack') => void;
  onDuplicateItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onAddModulation: (mod: OMEGA_Modulation) => void;
  onRemoveModulation: (id: string) => void;
  onUpdateModulation: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onOpenModGrid: () => void;
  addContainer: (c?: Partial<LayoutContainer>) => void;
  updateContainer: (id: string, updates: Partial<LayoutContainer>) => void;
  removeContainer: (id: string) => void;
  onHelp: (sectionId?: string | undefined) => void;
  onRemoveResource: (name: string) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  onTriggerUpload: (id: string) => void;
  onOpenConfig?: (() => void) | undefined;
  onOpenLibrary?: (() => void) | undefined;
  onSelectBlueprint?: ((blueprint: BlueprintDefinition) => void) | undefined;
  
  // Pin & Route (Era 8)
  pinnedNodeId: string | null;
  onTogglePin: (id: string | null) => void;
  layout: import('../../types/workbench').WorkbenchLayout;
  onSetLayoutRatio: (ratio: number) => void;
  onSetLayoutRatioEnd?: () => void;
  multiSelectedIds: string[];
  onSelectMultiple: (ids: string[]) => void;
}

import { HorizontalSplitDivider } from './layout/HorizontalSplitDivider';

export function WorkbenchInspector({
  pinnedNodeId,
  onTogglePin,
  layout,
  onSetLayoutRatio,
  onSetLayoutRatioEnd,
  ...props
}: WorkbenchInspectorProps) {
  const [activeTab, setActiveTab] = React.useState<'inspector' | 'blueprints'>('inspector');
  
  // ASEPTIC HANDLERS...
  const handleUpdate = (updates: Partial<OMEGA_Manifest> | Partial<ManifestEntity> | Partial<OmegaNode>) => {
    if (props.selectedItemId) {
      props.onUpdateItem(props.selectedItemId, updates as unknown as Partial<OmegaNode>);
      if (updates.id && updates.id !== props.selectedItemId) {
        props.onSelectItem(updates.id);
      }
    } else {
      props.onUpdateManifest(updates as Partial<OMEGA_Manifest>);
    }
  };

  // Resolve Pinned Item (Era 8)
  const pinnedItem = React.useMemo(() => {
    if (!pinnedNodeId || !props.manifest) return null;
    const tree = props.manifest.ui?.tree;
    if (!tree) return null;
    
    // Industrial Resolution (UCA + Entities)
    const treeNode = findNodeInTree(tree, pinnedNodeId);
    if (treeNode) return treeNode;

    return (props.manifest.entities as unknown as OmegaNode[])?.find(e => e.id === pinnedNodeId);
  }, [pinnedNodeId, props.manifest]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0d0d]">
      {/* Tab Switcher */}
      <div className="flex border-b border-[#222] bg-[#111]">
        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            activeTab === 'inspector' ? 'text-white border-b-2 border-blue-600 bg-white/5' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <FileText className="w-3 h-3" />
          Inspector
        </button>
        <button
          onClick={() => setActiveTab('blueprints')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            activeTab === 'blueprints' ? 'text-blue-400 border-b-2 border-blue-600 bg-blue-600/5' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Zap className="w-3 h-3" />
          Blueprints
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'inspector' && !props.isLiveMode && (
          <div className="flex-1 flex flex-col overflow-hidden divide-y divide-white/5">
            {/* PINNED PANEL (REFERENCE) */}
            {pinnedItem && (
               <div 
                 className="overflow-hidden flex flex-col bg-amber-500/[0.02]"
                 style={{ height: `${layout.ratio * 100}%` }}
               >
                  <PropertyPanel 
                    {...props}
                    item={pinnedItem}
                    mode="reference"
                    onClose={() => onTogglePin(null)}
                    onPin={() => onTogglePin(null)}
                    isPinned={true}
                  />
               </div>
            )}

            {/* RESIZABLE DIVIDER (Era 8) */}
            {pinnedItem && (
               <HorizontalSplitDivider 
                 onDrag={(delta) => onSetLayoutRatio(Math.min(0.8, Math.max(0.2, layout.ratio + delta)))} 
                 onDragEnd={onSetLayoutRatioEnd}
               />
            )}

            {/* ACTIVE PANEL (SELECTION) */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <PropertyPanel 
                {...props}
                item={props.selectedItem!} 
                multiSelectedIds={props.multiSelectedIds}
                mode={props.multiSelectedIds.length > 1 ? "bulk" : "active"}
                onClose={() => {
                  props.onSelectItem(null);
                  props.onSelectMultiple([]);
                }}
                onPin={() => onTogglePin(props.selectedItemId)}
                isPinned={pinnedNodeId === props.selectedItemId}
                onUpdate={handleUpdate}
              />
            </div>
          </div>
        )}

        {activeTab === 'blueprints' && (
          <BlueprintLibraryPanel 
            manifest={props.manifest}
            onSelectBlueprint={props.onSelectBlueprint || (() => {})}
          />
        )}
      </div>
    </div>
  );
}
