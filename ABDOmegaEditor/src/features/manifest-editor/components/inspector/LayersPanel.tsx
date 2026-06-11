'use client';

import { useState, useMemo } from 'react';
import { 
  Search, Sliders, Radio, ListFilter, Box, ChevronRight, ChevronDown
} from 'lucide-react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';

interface LayersPanelProps {
  manifest: OMEGA_Manifest;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemoveItem?: ((id: string) => void) | undefined;
  onAddEntity?: (type: 'control' | 'jack') => void;
  multiSelectedIds?: string[];
  onSelectMultiple?: ((ids: string[]) => void) | undefined;
  onGroupSelected?: (() => void) | undefined;
  onGroupDown?: ((id: string) => void) | undefined;
  onDuplicateItem?: ((id: string) => void) | undefined;
  onDuplicateGroup?: ((id: string) => void) | undefined;
  onSaveGroupAsBlueprint?: ((id: string) => void) | undefined;
  onUngroupNode?: ((groupId: string) => void) | undefined;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  isGroup: boolean;
}

function TreeNode({
  node,
  depth,
  selectedItemId,
  multiSelectedIds = [],
  hiddenNodeIds,
  lockedNodeIds,
  onSelectItem,
  onSelectMultiple,
  onToggleVisibility,
  onToggleLock,
  onRemoveItem,
  searchTerm,
  flatNodeIds,
  onContextMenu,
}: {
  node: OmegaNode;
  depth: number;
  selectedItemId: string | null;
  multiSelectedIds?: string[];
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  onSelectItem: (id: string | null) => void;
  onSelectMultiple?: ((ids: string[]) => void) | undefined;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemoveItem?: ((id: string) => void) | undefined;
  searchTerm: string;
  flatNodeIds: string[];
  onContextMenu: (e: React.MouseEvent, nodeId: string, isGroup: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isContainer = node.kind === 'container' || node.kind === 'rack' || node.kind === 'face' || node.kind === 'group';
  const isHidden = hiddenNodeIds.includes(node.id);
  const isLocked = lockedNodeIds.includes(node.id);
  const isSelected = selectedItemId === node.id || multiSelectedIds.includes(node.id);

  const matchesSearch = useMemo(() => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (node.id.toLowerCase().includes(term)) return true;
    if ((node.meta?.label as string)?.toLowerCase().includes(term)) return true;
    if (node.children?.some(c => c.id.toLowerCase().includes(term))) return true;
    return false;
  }, [searchTerm, node]);

  if (!matchesSearch) return null;

  const Icon = isContainer ? Box : node.kind === 'port' ? Radio : Sliders;
  const indent = depth * 12;

  const handleNodeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onSelectMultiple) {
      onSelectItem(node.id);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      const activeIds = [...multiSelectedIds];
      const idx = activeIds.indexOf(node.id);
      if (idx !== -1) {
        activeIds.splice(idx, 1);
      } else {
        activeIds.push(node.id);
      }
      onSelectMultiple(activeIds);
      if (activeIds.length > 0) {
        onSelectItem(activeIds[activeIds.length - 1]);
      } else {
        onSelectItem(null);
      }
    } else if (e.shiftKey && selectedItemId) {
      // Range selection
      const startIdx = flatNodeIds.indexOf(selectedItemId);
      const endIdx = flatNodeIds.indexOf(node.id);
      if (startIdx !== -1 && endIdx !== -1) {
        const range = flatNodeIds.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
        onSelectMultiple(range);
      }
    } else {
      // Single selection
      onSelectItem(node.id);
      onSelectMultiple([node.id]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // If context-clicked node is not already in multi-selection, select it singly
    if (!multiSelectedIds.includes(node.id)) {
      onSelectItem(node.id);
      if (onSelectMultiple) {
        onSelectMultiple([node.id]);
      }
    }
    onContextMenu(e, node.id, isContainer);
  };

  return (
    <div>
      <div style={{ paddingLeft: `${indent}px` }}>
        <div
          onClick={handleNodeClick}
          onContextMenu={handleContextMenu}
          className={`flex items-center justify-between px-2 py-1 border rounded-xs cursor-pointer transition-all group ${
            isSelected
              ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.05)]'
              : 'wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text'
          }`}
        >
          <div className="flex items-center gap-1.5 overflow-hidden mr-2">
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="p-0.5 shrink-0 wb-text-muted hover:wb-text"
              >
                {expanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <Icon className={`w-3 h-3 shrink-0 ${isSelected ? 'text-primary' : 'wb-text-muted opacity-60'}`} />
            <div className="flex flex-col overflow-hidden">
              <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">{node.id}</span>
              {(node.meta?.label as string) && (
                <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">{node.meta?.label as string}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onToggleVisibility(node.id)}
              className={`p-1 rounded hover:bg-primary/10 transition-colors ${isHidden ? 'text-red-400' : 'wb-text-muted hover:wb-text'}`}
              title={isHidden ? 'Show' : 'Hide'}
            >
              {isHidden ? <span className="text-[7px]">HID</span> : <span className="text-[7px]">VIS</span>}
            </button>
            <button
              onClick={() => onToggleLock(node.id)}
              className={`p-1 rounded hover:bg-primary/10 transition-colors ${isLocked ? 'text-amber-400' : 'wb-text-muted hover:wb-text'}`}
              title={isLocked ? 'Unlock' : 'Lock'}
            >
              {isLocked ? <span className="text-[7px]">LCK</span> : <span className="text-[7px]">ULK</span>}
            </button>
            {onRemoveItem && node.kind !== 'rack' && (
              <button
                onClick={() => onRemoveItem(node.id)}
                className="p-1 rounded wb-text-muted hover:text-red-400 hover:bg-primary/10 transition-colors"
                title="Delete"
              >
                <span className="text-[7px]">DEL</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedItemId={selectedItemId}
              multiSelectedIds={multiSelectedIds}
              hiddenNodeIds={hiddenNodeIds}
              lockedNodeIds={lockedNodeIds}
              onSelectItem={onSelectItem}
              onSelectMultiple={onSelectMultiple}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onRemoveItem={onRemoveItem}
              searchTerm={searchTerm}
              flatNodeIds={flatNodeIds}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LayersPanel({
  manifest,
  selectedItemId,
  onSelectItem,
  hiddenNodeIds,
  lockedNodeIds,
  onToggleVisibility,
  onToggleLock,
  onRemoveItem,
  onAddEntity,
  multiSelectedIds = [],
  onSelectMultiple,
  onGroupSelected,
  onGroupDown,
  onDuplicateItem,
  onDuplicateGroup,
  onSaveGroupAsBlueprint,
  onUngroupNode,
}: LayersPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const tree = manifest.ui?.tree;

  // Flatten the tree for Shift+Click range selections
  const flatNodeIds = useMemo(() => {
    const ids: string[] = [];
    const traverse = (node: OmegaNode) => {
      ids.push(node.id);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    if (tree) traverse(tree);
    return ids;
  }, [tree]);

  const handleContextMenuTrigger = (e: React.MouseEvent, nodeId: string, isGroup: boolean) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId,
      isGroup,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div 
      className="flex-1 flex flex-col overflow-hidden wb-surface text-[9px] font-sans relative"
      onClick={closeContextMenu}
    >
      {/* SEARCH */}
      <div className="p-2 border-b wb-outline flex flex-col gap-1.5 wb-surface-subtle shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-3 h-3 wb-text-muted opacity-40" />
          <input
            type="text"
            placeholder="Search layers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 wb-surface-strong border wb-outline text-[9px] uppercase tracking-wider rounded-xs wb-text placeholder-wb-text-muted/40 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* TREE */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5 select-none">
        {tree ? (
          <TreeNode
            node={tree}
            depth={0}
            selectedItemId={selectedItemId}
            multiSelectedIds={multiSelectedIds}
            hiddenNodeIds={hiddenNodeIds}
            lockedNodeIds={lockedNodeIds}
            onSelectItem={onSelectItem}
            onSelectMultiple={onSelectMultiple}
            onToggleVisibility={onToggleVisibility}
            onToggleLock={onToggleLock}
            onRemoveItem={onRemoveItem}
            searchTerm={searchTerm}
            flatNodeIds={flatNodeIds}
            onContextMenu={handleContextMenuTrigger}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 gap-1.5">
            <ListFilter className="w-5 h-5 wb-text" />
            <span className="text-[7px] font-black uppercase tracking-widest wb-text">No tree data</span>
          </div>
        )}

        {/* QUICK ADD */}
        {onAddEntity && (
          <div className="mt-2 pt-2 border-t wb-outline flex flex-col gap-1">
            <div className="px-1.5 text-[7px] font-black wb-text-muted uppercase tracking-widest">Quick Add</div>
            <button
              onClick={() => onAddEntity('control')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors wb-text-muted"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Param Control</span>
            </button>
            <button
              onClick={() => onAddEntity('jack')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors wb-text-muted"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Signal Port</span>
            </button>
          </div>
        )}
      </div>

      {/* CONTEXT MENU POPUP */}
      {contextMenu && (
        <div 
          className="fixed z-[1000] bg-[#0c0c0d] border border-white/10 rounded-xs shadow-[0_0_15px_rgba(0,0,0,0.7)] p-1 flex flex-col gap-0.5 min-w-[150px] font-sans"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {multiSelectedIds.length >= 2 && onGroupSelected && (
            <button
              onClick={() => { onGroupSelected(); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
            >
              Group Selected
            </button>
          )}

          {multiSelectedIds.length === 1 && onGroupDown && (
            <button
              onClick={() => { onGroupDown(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
            >
              Group Down
            </button>
          )}

          {multiSelectedIds.length === 1 && !contextMenu.isGroup && onDuplicateItem && (
            <button
              onClick={() => { onDuplicateItem(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
            >
              Duplicate Layer
            </button>
          )}

          {multiSelectedIds.length === 1 && contextMenu.isGroup && onDuplicateGroup && (
            <button
              onClick={() => { onDuplicateGroup(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
            >
              Duplicate Group
            </button>
          )}

          {multiSelectedIds.length === 1 && contextMenu.isGroup && onUngroupNode && (
            <button
              onClick={() => { onUngroupNode(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
            >
              Ungroup
            </button>
          )}

          {multiSelectedIds.length === 1 && contextMenu.isGroup && onSaveGroupAsBlueprint && (
            <button
              onClick={() => { onSaveGroupAsBlueprint(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1.5"
            >
              Save as Blueprint...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
