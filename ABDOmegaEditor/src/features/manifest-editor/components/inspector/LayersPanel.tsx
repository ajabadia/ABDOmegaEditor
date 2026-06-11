'use client';

import { useState, useMemo, useEffect, createElement } from 'react';
import { 
  Search, Sliders, Radio, ListFilter, ChevronRight, ChevronDown,
  Folder, FolderOpen, Disc, ToggleLeft, Tv, Type
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
  onMoveNode?: ((sourceId: string, targetParentId: string, index?: number) => void) | undefined;
  onMoveNodeUpDown?: ((nodeId: string, direction: 'up' | 'down') => void) | undefined;
  onUpdateItem?: ((id: string, updates: Partial<OmegaNode>) => void) | undefined;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  isGroup: boolean;
}

import { findParentInTree, findNodeInTree } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';

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
  onUpdateItem,
  onMoveNode,
  findParentId,
  tree,
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
  onUpdateItem?: ((id: string, updates: Partial<OmegaNode>) => void) | undefined;
  onMoveNode?: ((sourceId: string, targetParentId: string, index?: number) => void) | undefined;
  findParentId: (id: string) => string | undefined;
  tree: OmegaNode;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState((node.meta?.label as string) || node.id);
  const [dropIndicator, setDropIndicator] = useState<'top' | 'bottom' | 'inside' | null>(null);

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

  const getIcon = () => {
    if (isContainer) {
      return expanded ? FolderOpen : Folder;
    }
    if (node.kind === 'port') {
      return Radio;
    }
    const type = node.cellRef?.toLowerCase() || '';
    if (type === 'knob') return Disc;
    if (type.includes('slider')) return Sliders;
    if (type === 'switch' || type === 'button') return ToggleLeft;
    if (type === 'display') return Tv;
    if (type === 'label') return Type;
    return Sliders;
  };
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue((node.meta?.label as string) || node.id);
  };

  const handleRenameSubmit = () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== ((node.meta?.label as string) || node.id) && onUpdateItem) {
      onUpdateItem(node.id, {
        meta: {
          ...node.meta,
          label: trimmed
        }
      });
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    if (relativeY < height * 0.25) {
      setDropIndicator('top');
    } else if (relativeY > height * 0.75) {
      setDropIndicator('bottom');
    } else {
      if (isContainer) {
        setDropIndicator('inside');
      } else {
        setDropIndicator('bottom');
      }
    }
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropIndicator(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === node.id) return;

    if (onMoveNode) {
      if (dropIndicator === 'inside' && isContainer) {
        onMoveNode(sourceId, node.id, 0);
      } else {
        const parentId = findParentId(node.id);
        if (parentId) {
          const parentNode = findNodeInTree(tree, parentId);
          if (parentNode && parentNode.children) {
            const currentIdx = parentNode.children.findIndex(c => c.id === node.id);
            const targetIdx = dropIndicator === 'top' ? currentIdx : currentIdx + 1;
            onMoveNode(sourceId, parentId, targetIdx);
          }
        }
      }
    }
  };

  return (
    <div>
      <div style={{ paddingLeft: `${indent}px` }}>
        <div
          onClick={handleNodeClick}
          onContextMenu={handleContextMenu}
          draggable={node.kind !== 'rack'}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex items-center justify-between px-2 py-1 border rounded-xs cursor-pointer transition-all group relative ${
            isSelected
              ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.05)]'
              : 'wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text'
          } ${dropIndicator === 'inside' ? 'ring-1 ring-primary/60 bg-primary/5' : ''}`}
        >
          {dropIndicator === 'top' && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] z-10 animate-pulse" />
          )}
          {dropIndicator === 'bottom' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] z-10 animate-pulse" />
          )}

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
            {createElement(getIcon(), { className: `w-3 h-3 shrink-0 ${isSelected ? 'text-primary' : 'wb-text-muted opacity-60'}` })}
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') {
                    setEditValue((node.meta?.label as string) || node.id);
                    setIsEditing(false);
                  }
                }}
                className="bg-black/80 border border-primary/50 text-[8px] font-mono uppercase px-1 py-0.5 rounded-xs text-white focus:outline-none max-w-[120px]"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex flex-col overflow-hidden" onDoubleClick={handleDoubleClick}>
                <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">{node.id}</span>
                {(node.meta?.label as string) && (
                  <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">{node.meta?.label as string}</span>
                )}
              </div>
            )}
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
              onUpdateItem={onUpdateItem}
              onMoveNode={onMoveNode}
              findParentId={findParentId}
              tree={tree}
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
  onMoveNode,
  onMoveNodeUpDown,
  onUpdateItem,
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

  const findParentId = (targetId: string) => {
    if (!tree) return undefined;
    const parent = findParentInTree(tree, targetId);
    return parent ? parent.id : undefined;
  };

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

  // Alt + ArrowUp / ArrowDown keyboard shortcuts reordering
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (selectedItemId && onMoveNodeUpDown) {
          e.preventDefault();
          e.stopPropagation();
          onMoveNodeUpDown(selectedItemId, e.key === 'ArrowUp' ? 'up' : 'down');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, onMoveNodeUpDown]);

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
            onUpdateItem={onUpdateItem}
            onMoveNode={onMoveNode}
            findParentId={findParentId}
            tree={tree}
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

          {multiSelectedIds.length === 1 && onMoveNodeUpDown && (
            <>
              <button
                onClick={() => { onMoveNodeUpDown(contextMenu.nodeId, 'up'); closeContextMenu(); }}
                className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
              >
                Move Up (Alt+▲)
              </button>
              <button
                onClick={() => { onMoveNodeUpDown(contextMenu.nodeId, 'down'); closeContextMenu(); }}
                className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
              >
                Move Down (Alt+▼)
              </button>
            </>
          )}

          {multiSelectedIds.length === 1 && !contextMenu.isGroup && onDuplicateItem && (
            <button
              onClick={() => { onDuplicateItem(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1"
            >
              Duplicate Layer
            </button>
          )}

          {multiSelectedIds.length === 1 && contextMenu.isGroup && onDuplicateGroup && (
            <button
              onClick={() => { onDuplicateGroup(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1"
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
