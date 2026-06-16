'use client';

/**
 * @purpose Gestiona un panel para administrar capas en un editor de manifesto OMEGA, incluyendo características como filtrado, deshabilitación de visibilidad, bloqueo y operaciones en lotes.
 * @purpose_en Renders a panel for managing layers in an OMEGA manifest editor, including features like filtering, visibility toggling, locking, and batch operations.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:12,sig:64hv5y
 * @lastUpdated 2026-06-15T11:31:03.390Z
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { List, useListRef } from 'react-window';
import { motion } from 'framer-motion';
import { 
  Search, Sliders, Radio, ListFilter,
  Folder, FolderOpen, Eye, EyeOff, Lock, Unlock, Clock
} from 'lucide-react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findParentInTree, findNodeInTree } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';
import { useBatchHistory, BATCH_VARIANT_PILL, BATCH_VARIANT_TOOLTIP, BATCH_VARIANT_TIMELINE, BATCH_VARIANT_BUTTON } from '@/features/manifest-editor/hooks/useBatchHistory';
import type { HistoryEntry } from '@/features/manifest-editor/hooks/useBatchHistory';
import { useLayerFilters, getNodeComponentType } from '@/features/manifest-editor/hooks/useLayerFilters';
import { type ComponentTypeFilter, COMPONENT_FILTERS } from '@/features/manifest-editor/hooks/useLayerFilters';
import { LayerRow } from './LayerRow';
import type { FlatTreeItem, DropTarget, LayerRowData } from './LayerRow';

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
  onBatchSetVisibility?: ((ids: string[], hidden: boolean) => void) | undefined;
  onBatchSetLocked?: ((ids: string[], locked: boolean) => void) | undefined;
  onBatchUngroup?: ((ids: string[]) => void) | undefined;
  onBatchUndoGroup?: ((childIds: string[]) => void) | undefined;
  auditNodeIds?: string[] | undefined;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  isGroup: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────
const ROW_HEIGHT = 26;

// ── Filter check helper ──────────────────────────────────────────────────
interface FilterParams {
  searchTerm: string;
  typeFilter: ComponentTypeFilter;
  showHidden: boolean;
  showLocked: boolean;
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  propertySearchTerm: string;
  showAuditIssues: boolean;
  auditNodeIds: string[];
  showTemplates: boolean;
}

function checkNodePassesFilters(
  node: OmegaNode,
  filters: FilterParams,
): boolean {
  const {
    searchTerm, typeFilter,
    showHidden, showLocked,
    hiddenNodeIds, lockedNodeIds,
    propertySearchTerm, showAuditIssues,
    auditNodeIds, showTemplates,
  } = filters;

  const nodeType = getNodeComponentType(node);
  const typeOk = typeFilter === 'all' || nodeType === typeFilter;
  const isHidden = hiddenNodeIds.includes(node.id);
  const isLocked = lockedNodeIds.includes(node.id);
  const stateOk = (!showHidden && !showLocked) || (showHidden && isHidden) || (showLocked && isLocked);
  const textOk = !searchTerm ||
    node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.meta?.label as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.cellRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.kind?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.bind?.toLowerCase()?.includes(searchTerm.toLowerCase());
  const term = propertySearchTerm?.toLowerCase();
  const propOk = !term || (
    node.bind?.toLowerCase()?.includes(term) ||
    (typeof node.meta?.value === 'string' && (node.meta.value as string).toLowerCase().includes(term)) ||
    (typeof node.meta?.value === 'number' && String(node.meta.value).toLowerCase().includes(term)) ||
    (typeof node.meta?.min === 'number' && String(node.meta.min).toLowerCase().includes(term)) ||
    (typeof node.meta?.max === 'number' && String(node.meta.max).toLowerCase().includes(term))
  );
  const auditOk: boolean = !showAuditIssues || auditNodeIds.includes(node.id);
  const templateOk: boolean = !showTemplates || !!node.templateRef;
  return !!(typeOk && stateOk && textOk && propOk && auditOk && templateOk);
}

// ── Flatten tree for virtual scrolling ──────────────────────────────────
function flattenVisibleTree(
  root: OmegaNode,
  expandedMap: Record<string, boolean>,
  filterParams: FilterParams,
): { items: FlatTreeItem[]; flatNodeIds: string[]; visibleCount: number } {
  const visibleNodes = new Set<string>();
  function markVisible(node: OmegaNode): boolean {
    const selfVisible = checkNodePassesFilters(node, filterParams);
    let childVisible = false;
    if (node.children) {
      for (const child of node.children) {
        if (markVisible(child)) childVisible = true;
      }
    }
    const isVisible = selfVisible || childVisible;
    if (isVisible) visibleNodes.add(node.id);
    return isVisible;
  }
  markVisible(root);

  const items: FlatTreeItem[] = [];
  const flatNodeIds: string[] = [];
  let visibleCount = 0;

  function buildList(node: OmegaNode, depth: number) {
    if (!visibleNodes.has(node.id)) return;
    const isExpanded = expandedMap[node.id] !== false;
    const hasChildren = !!(node.children?.length);
    items.push({ id: node.id, node, depth, hasChildren, isExpanded });
    flatNodeIds.push(node.id);
    visibleCount++;
    if (hasChildren && isExpanded) {
      for (const child of node.children!) {
        buildList(child, depth + 1);
      }
    }
  }

  buildList(root, 0);
  return { items, flatNodeIds, visibleCount };
}

function variantClass<T>(map: Record<string, T>, key: string): string {
  return (map as unknown as Record<string, string>)[key] ?? '';
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
  onBatchSetVisibility,
  onBatchSetLocked,
  onBatchUngroup,
  onBatchUndoGroup,
  auditNodeIds,
}: LayersPanelProps) {
  // ── Batch History Hook ───────────────────────────────────────────────
  const {
    batchHistory, setBatchHistory,
    batchNotification, setBatchNotification,
    showHistory, setShowHistory,
    hoverHistory, setHoverHistory,
    fadingOut, pushBatchAction, clearBatchHistory, isEntryUndoable,
  } = useBatchHistory();

  // ── Drag Ghost State (R1b) ──────────────────────────────────────────
  const [dragGhost, setDragGhost] = useState<{
    nodeId: string; color: string; label: string; x: number; y: number;
  } | null>(null);

  // ── Virtual scroll refs + dimensions ─────────────────────────────────
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useListRef(null);
  const [treeDimensions, setTreeDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = treeContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setTreeDimensions({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Expanded state ──────────────────────────────────────────────────
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const toggleExpand = useCallback((id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  // ── Context Menu State ───────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Drop target state ────────────────────────────────────────────────
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // ── Layer Filters Hook ───────────────────────────────────────────────
  const tree = manifest.ui?.tree;
  const {
    searchTerm, setSearchTerm,
    typeFilter, setTypeFilter,
    showHidden, setShowHidden,
    showLocked, setShowLocked,
    propertySearchTerm, setPropertySearchTerm,
    showAuditIssues, setShowAuditIssues,
    showTemplates, setShowTemplates,
    visibleCount: filterVisibleCount, totalCount,
    clearAllFilters,
  } = useLayerFilters(tree, hiddenNodeIds, lockedNodeIds, auditNodeIds ?? []);

  // ── Flatten tree for virtual scroll ──────────────────────────────────
  const filterParams: FilterParams = useMemo(() => ({
    searchTerm, typeFilter, showHidden, showLocked,
    hiddenNodeIds, lockedNodeIds,
    propertySearchTerm, showAuditIssues,
    auditNodeIds: auditNodeIds ?? [], showTemplates,
  }), [searchTerm, typeFilter, showHidden, showLocked, hiddenNodeIds, lockedNodeIds,
      propertySearchTerm, showAuditIssues, auditNodeIds, showTemplates]);

  const { items: flatItems, visibleCount } = useMemo(() => {
    if (!tree) return { items: [] as FlatTreeItem[], flatNodeIds: [] as string[], visibleCount: 0 };
    return flattenVisibleTree(tree, expandedMap, filterParams);
  }, [tree, expandedMap, filterParams]);

  // ── Filter progress (R1a) ─────────────────────────────────────────
  const filterProgress = totalCount > 0 ? Math.round((filterVisibleCount / totalCount) * 100) : 100;
  const isFiltered = filterVisibleCount !== totalCount;

  // ── Undo last batch action ───────────────────────────────────────────
  const handleUndoLastBatch = useCallback(() => {
    const last = batchHistory[0];
    if (!last) return;
    if (last.action === 'visibility') {
      onBatchSetVisibility?.(last.ids, !last.value);
    } else if (last.action === 'lock') {
      onBatchSetLocked?.(last.ids, !last.value);
    } else if (last.action === 'group' && last.value === true) {
      onBatchUndoGroup?.(last.ids);
    } else return;
    setBatchNotification({ message: `↶ Undone: ${last.message}`, variant: last.variant });
    setBatchHistory((prev) => prev.slice(1));
    setHoverHistory(false);
  }, [batchHistory, onBatchSetVisibility, onBatchSetLocked, onBatchUndoGroup,
      setBatchNotification, setBatchHistory, setHoverHistory]);

  // ── Batch handlers ───────────────────────────────────────────────────
  const handleBatchHide = useCallback(() => {
    onBatchSetVisibility?.(multiSelectedIds, true);
    pushBatchAction('hide', multiSelectedIds, 'visibility', true);
  }, [onBatchSetVisibility, multiSelectedIds, pushBatchAction]);
  const handleBatchShow = useCallback(() => {
    onBatchSetVisibility?.(multiSelectedIds, false);
    pushBatchAction('show', multiSelectedIds, 'visibility', false);
  }, [onBatchSetVisibility, multiSelectedIds, pushBatchAction]);
  const handleBatchLock = useCallback(() => {
    onBatchSetLocked?.(multiSelectedIds, true);
    pushBatchAction('lock', multiSelectedIds, 'lock', true);
  }, [onBatchSetLocked, multiSelectedIds, pushBatchAction]);
  const handleBatchUnlock = useCallback(() => {
    onBatchSetLocked?.(multiSelectedIds, false);
    pushBatchAction('unlock', multiSelectedIds, 'lock', false);
  }, [onBatchSetLocked, multiSelectedIds, pushBatchAction]);
  const handleBatchGroup = useCallback(() => {
    onGroupSelected?.();
    pushBatchAction('group', multiSelectedIds, 'group', true);
  }, [onGroupSelected, multiSelectedIds, pushBatchAction]);
  const handleBatchUngroupAction = useCallback(() => {
    onBatchUngroup?.(multiSelectedIds);
    pushBatchAction('ungroup', multiSelectedIds, 'group', false);
  }, [onBatchUngroup, multiSelectedIds, pushBatchAction]);

  // ── Tree helpers ─────────────────────────────────────────────────────
  const findParentId = useCallback((targetId: string) => {
    if (!tree) return undefined;
    const parent = findParentInTree(tree, targetId);
    return parent?.id;
  }, [tree]);

  // ── Drag ghost callbacks ─────────────────────────────────────────
  const handleDragGhostStart = useCallback((nodeId: string, color: string, label: string, clientX: number, clientY: number) => {
    setDragGhost({ nodeId, color, label, x: clientX, y: clientY });
  }, []);
  const handleDragGhostEnd = useCallback(() => {
    setDragGhost(null);
    setDropTarget(null);
  }, []);

  const handleContextMenuTrigger = (e: React.MouseEvent, nodeId: string, isGroup: boolean) => {
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId, isGroup });
  };
  const closeContextMenu = () => setContextMenu(null);

  // ── Container-level drag-and-drop ──────────────────────────────────
  const handleTreeDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const containerRect = treeContainerRef.current?.getBoundingClientRect();
    if (!containerRect || flatItems.length === 0) return;
    const scrollEl = listRef.current?.element;
    const currentScrollOffset = scrollEl?.scrollTop ?? 0;
    const relativeY = e.clientY - containerRect.top;
    const absoluteY = relativeY + currentScrollOffset;
    const rowIndex = Math.floor(absoluteY / ROW_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(rowIndex, flatItems.length - 1));
    const targetItem = flatItems[clampedIndex];
    if (!targetItem) return;
    const rowOffset = absoluteY - clampedIndex * ROW_HEIGHT;
    let position: 'top' | 'bottom' | 'inside';
    if (rowOffset < ROW_HEIGHT * 0.25) position = 'top';
    else if (rowOffset > ROW_HEIGHT * 0.75) position = 'bottom';
    else position = targetItem.hasChildren ? 'inside' : 'bottom';
    setDropTarget({ rowIndex: clampedIndex, position, nodeId: targetItem.id });
  }, [flatItems, listRef]);

  const handleTreeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || !dropTarget || !onMoveNode || !tree) {
      handleDragGhostEnd();
      return;
    }
    const targetNode = findNodeInTree(tree, dropTarget.nodeId);
    if (!targetNode || sourceId === dropTarget.nodeId) {
      handleDragGhostEnd();
      return;
    }
    const isContainer = targetNode.kind === 'container' || targetNode.kind === 'rack' ||
      targetNode.kind === 'face' || targetNode.kind === 'group';
    if (dropTarget.position === 'inside' && isContainer) {
      onMoveNode(sourceId, dropTarget.nodeId, 0);
    } else {
      const parentId = findParentId(dropTarget.nodeId);
      if (parentId) {
        const parentNode = findNodeInTree(tree, parentId);
        if (parentNode?.children) {
          const currentIdx = parentNode.children.findIndex((c: OmegaNode) => c.id === dropTarget.nodeId);
          const targetIdx = dropTarget.position === 'top' ? currentIdx : currentIdx + 1;
          onMoveNode(sourceId, parentId, targetIdx);
        }
      }
    }
    handleDragGhostEnd();
  }, [dropTarget, onMoveNode, tree, findParentId, handleDragGhostEnd]);

  // ── Document-level ghost drag listeners ──────────────────────────────
  useEffect(() => {
    if (!dragGhost) return;
    const handleDragOver = (e: DragEvent) => {
      setDragGhost((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    };
    const handleDragEnd = () => { setDragGhost(null); setDropTarget(null); };
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
    };
  }, [!!dragGhost]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcut: Alt+ArrowUp/Down ──────────────────────────────
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

  // ── Keyboard shortcuts: Ctrl+Shift+Alt+H/L/A/T/C for filter toggles ──
  useEffect(() => {
    const handleFilterKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || !e.altKey) return;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'h':
          e.preventDefault();
          e.stopPropagation();
          setShowHidden(!showHidden);
          break;
        case 'l':
          e.preventDefault();
          e.stopPropagation();
          setShowLocked(!showLocked);
          break;
        case 'a':
          e.preventDefault();
          e.stopPropagation();
          setShowAuditIssues(!showAuditIssues);
          break;
        case 't':
          e.preventDefault();
          e.stopPropagation();
          setShowTemplates(!showTemplates);
          break;
        case 'c':
          e.preventDefault();
          e.stopPropagation();
          clearAllFilters();
          break;
      }
    };
    window.addEventListener('keydown', handleFilterKeyDown);
    return () => window.removeEventListener('keydown', handleFilterKeyDown);
  }, [showHidden, showLocked, showAuditIssues, showTemplates, setShowHidden, setShowLocked, setShowAuditIssues, setShowTemplates, clearAllFilters]);

  // ── Keyboard shortcuts: Ctrl+Shift+Alt+0-8 for component type filters ─
  useEffect(() => {
    const handleTypeKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || !e.altKey) return;
      const num = parseInt(e.key, 10);
      if (isNaN(num) || num < 0 || num > 8) return;
      e.preventDefault();
      e.stopPropagation();
      const types: ComponentTypeFilter[] = ['all', 'knob', 'port', 'slider', 'display', 'container', 'label', 'switch', 'button'];
      setTypeFilter(types[num]);
    };
    window.addEventListener('keydown', handleTypeKeyDown);
    return () => window.removeEventListener('keydown', handleTypeKeyDown);
  }, [setTypeFilter]);

  // ── Row props for List ──────────────────────────────────────────────
  const rowProps: LayerRowData = useMemo(() => ({
    items: flatItems,
    selectedItemId,
    multiSelectedIds,
    hiddenNodeIds,
    lockedNodeIds,
    onSelectItem,
    onSelectMultiple,
    onToggleVisibility,
    onToggleLock,
    onRemoveItem,
    onContextMenu: handleContextMenuTrigger,
    onUpdateItem,
    onDragGhostStart: handleDragGhostStart,
    toggleExpand,
    dropTarget,
  }), [flatItems, selectedItemId, multiSelectedIds, hiddenNodeIds, lockedNodeIds,
      onSelectItem, onSelectMultiple, onToggleVisibility, onToggleLock, onRemoveItem,
      onUpdateItem, handleDragGhostStart, toggleExpand, dropTarget]);

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden wb-surface text-[9px] font-sans relative"
      onClick={closeContextMenu}
    >
      {/* ── SEARCH + FILTERS ─────────────────────────────────────────── */}
      <div className="p-2 border-b wb-outline flex flex-col gap-1.5 wb-surface-subtle shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-3 h-3 wb-text-muted opacity-40" />
          <input
            type="text"
            placeholder="Search layers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search layers by name or ID"
            className="w-full pl-7 pr-3 py-1.5 wb-surface-strong border wb-outline text-[9px] uppercase tracking-wider rounded-xs wb-text placeholder-wb-text-muted/40 focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} title="Clear search" className="absolute right-1 p-1 text-white/30 hover:text-white transition-colors">✕</button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {COMPONENT_FILTERS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all ${
                typeFilter === type
                  ? 'bg-primary/20 border-primary text-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.1)]'
                  : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text hover:border-white/20'
              } text-[7px] font-black`}
              title={`Filter by ${label} (Ctrl+Shift+Alt+${COMPONENT_FILTERS.findIndex(f => f.type === type)})`}
              aria-label={`Filter by ${label}`}
            >
              <Icon className="w-2.5 h-2.5" /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHidden(!showHidden)} title="Toggle show hidden (Ctrl+Shift+Alt+H)"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all text-[7px] font-black ${
                showHidden ? 'bg-red-400/20 border-red-400/50 text-red-400' : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'}`}
            ><EyeOff className="w-2.5 h-2.5" /> Hidden</button>
            <button onClick={() => setShowLocked(!showLocked)} title="Toggle show locked (Ctrl+Shift+Alt+L)"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all text-[7px] font-black ${
                showLocked ? 'bg-amber-400/20 border-amber-400/50 text-amber-400' : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'}`}
            ><Lock className="w-2.5 h-2.5" /> Locked</button>
            <button onClick={() => setShowAuditIssues(!showAuditIssues)} title="Toggle show audit issues (Ctrl+Shift+Alt+A)"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all text-[7px] font-black ${
                showAuditIssues ? 'bg-purple-400/20 border-purple-400/50 text-purple-400' : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'}`}
            ><ListFilter className="w-2.5 h-2.5" /> Audit</button>
            <button onClick={() => setShowTemplates(!showTemplates)} title="Toggle show templates (Ctrl+Shift+Alt+T)"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all text-[7px] font-black ${
                showTemplates ? 'bg-sky-400/20 border-sky-400/50 text-sky-400' : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'}`}
            ><Folder className="w-2.5 h-2.5" /> Templates</button>
            {(typeFilter !== 'all' || showHidden || showLocked || showAuditIssues || showTemplates || searchTerm || propertySearchTerm) && (
              <button onClick={clearAllFilters} title="Clear all filters (Ctrl+Shift+Alt+C)" className="text-[6px] font-mono text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">Clear</button>
            )}
          </div>
          <span className="text-[6px] font-mono wb-text-muted opacity-50">{filterVisibleCount}/{totalCount}</span>
        </div>

        <div className="relative flex items-center">
          <Search className="absolute left-2 w-3 h-3 wb-text-muted opacity-30" />
          <input type="text" placeholder="Property → bind, value, min, max..."
            value={propertySearchTerm} onChange={(e) => setPropertySearchTerm(e.target.value)}
            aria-label="Search by property value"
            className="w-full pl-7 pr-3 py-1.5 wb-surface-strong border wb-outline text-[8px] uppercase tracking-wider rounded-xs wb-text placeholder-wb-text-muted/30 focus:outline-none focus:border-purple/50 transition-colors font-mono"
          />
          {propertySearchTerm && (
            <button onClick={() => setPropertySearchTerm('')} title="Clear property search" className="absolute right-1 p-1 text-white/30 hover:text-white transition-colors">✕</button>
          )}
        </div>

        {isFiltered && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${filterProgress}%`,
                  background: filterProgress > 50 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : filterProgress > 25 ? 'linear-gradient(90deg, #eab308, #f97316)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
                }}
              />
            </div>
            <span className="text-[6px] font-black tabular-nums opacity-60 w-8 text-right">{filterProgress}%</span>
          </div>
        )}
      </div>

      {/* ── BATCH ACTIONS TOOLBAR ─────────────────────────────────────── */}
      {multiSelectedIds.length >= 2 && (onBatchSetVisibility || onBatchSetLocked) && (
        <div className="px-2 py-1.5 border-b wb-outline bg-primary/5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[6px] font-black uppercase tracking-widest text-primary/70 whitespace-nowrap">{multiSelectedIds.length} selected</span>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1 flex-wrap">
              {onBatchSetVisibility && (<>
                <button onClick={handleBatchHide} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON['hide']}`} title="Hide all selected"><EyeOff className="w-2.5 h-2.5" /> Hide</button>
                <button onClick={handleBatchShow} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON['show']}`} title="Show all selected"><Eye className="w-2.5 h-2.5" /> Show</button>
              </>)}
              {onBatchSetVisibility && onBatchSetLocked && <div className="w-px h-3 bg-white/10" />}
              {onBatchSetLocked && (<>
                <button onClick={handleBatchLock} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON['lock']}`} title="Lock all selected"><Lock className="w-2.5 h-2.5" /> Lock</button>
                <button onClick={handleBatchUnlock} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON['unlock']}`} title="Unlock all selected"><Unlock className="w-2.5 h-2.5" /> Unlock</button>
              </>)}
              {onGroupSelected && (<>
                {(onBatchSetVisibility || onBatchSetLocked) && <div className="w-px h-3 bg-white/10" />}
                <button onClick={handleBatchGroup} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON['group']}`} title="Group all selected"><Folder className="w-2.5 h-2.5" /> Group</button>
              </>)}
              {onBatchUngroup && (<>
                <div className="w-px h-3 bg-white/10" />
                <button onClick={handleBatchUngroupAction} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs transition-all text-[7px] font-black uppercase tracking-widest ${BATCH_VARIANT_BUTTON['ungroup']}`} title="Ungroup"><FolderOpen className="w-2.5 h-2.5" /> Ungroup</button>
              </>)}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              {batchNotification && (
                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[7px] font-black uppercase tracking-widest ${fadingOut ? 'opacity-0 transition-opacity duration-300' : 'animate-in fade-in slide-in-from-right-2 duration-200'} ${BATCH_VARIANT_PILL[batchNotification.variant] ?? 'bg-white/10 text-white/70 border border-white/20'}`}>
                  ✓ {batchNotification.message}
                </div>
              )}
              {batchHistory.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowHistory(!showHistory)} onMouseEnter={() => setHoverHistory(true)} onMouseLeave={() => setHoverHistory(false)}
                    className={`inline-flex items-center gap-1 px-1 py-0.5 rounded-xs border transition-all text-[7px] font-black uppercase tracking-widest ${showHistory ? 'bg-primary/15 border-primary/40 text-primary' : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/30'}`}
                    title={showHistory ? 'Hide batch history' : 'Show batch history'}
                    aria-label={showHistory ? 'Hide batch history' : 'Show batch history'}
                  ><Clock className="w-2.5 h-2.5" />{batchHistory.length > 0 && <span className="tabular-nums">{batchHistory.length}</span>}</button>
                  {hoverHistory && !showHistory && (
                    <div onMouseEnter={() => setHoverHistory(true)} onMouseLeave={() => setHoverHistory(false)}
                      className="absolute top-full right-0 mt-1 z-[120] min-w-[140px] bg-[#0c0c0d] border border-white/10 rounded-xs shadow-[0_0_15px_rgba(0,0,0,0.7)] p-1.5 flex flex-col gap-0.5">
                      <div className="text-[6px] font-black uppercase tracking-widest text-white/30 pb-0.5 border-b border-white/5 mb-0.5">Recent ({Math.min(3, batchHistory.length)}/{batchHistory.length})</div>
                      {batchHistory.slice(0, 3).map((entry: HistoryEntry, i: number) => {
                        const timeStr = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const undoable = isEntryUndoable(entry);
                        return (
                          <div key={`tip-${entry.time}-${i}`}
                            className={`flex items-center justify-between px-1.5 py-0.5 rounded-xs border-l-2 text-[7px] font-mono ${variantClass(BATCH_VARIANT_TOOLTIP, entry.variant) || 'border-white/20 text-white/60'}`}
                          >
                            <span className="flex items-center gap-1">
                              <span className={`text-[6px] ${undoable ? 'text-primary/60' : 'text-white/20'}`}>{undoable ? '↶' : '—'}</span>
                              <span className="font-black uppercase tracking-widest">{entry.message}</span>
                            </span>
                            <span className="text-[6px] opacity-50 tabular-nums ml-2">{timeStr}</span>
                          </div>
                        );
                      })}
                      {(batchHistory.length > 0 && (batchHistory[0].action === 'visibility' || batchHistory[0].action === 'lock' || (batchHistory[0].action === 'group' && batchHistory[0].value === true))) && (
                        <button onClick={handleUndoLastBatch}
                          className="w-full flex items-center justify-center gap-1 px-1.5 py-1 mt-0.5 rounded-xs border border-white/10 hover:border-primary/40 hover:bg-primary/10 transition-all text-[7px] font-black uppercase tracking-widest text-white/50 hover:text-primary"
                          title="Undo last batch action">↶ Undo {batchHistory[0].message}</button>
                      )}
                      {batchHistory.length > 3 && <div className="text-[6px] text-white/20 text-center pt-0.5 border-t border-white/5 mt-0.5">+{batchHistory.length - 3} more</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BATCH HISTORY TIMELINE ─────────────────────────────────────── */}
      {showHistory && batchHistory.length > 0 && (
        <div className="border-b wb-outline bg-black/30 shrink-0 max-h-36 overflow-y-auto">
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-[6px] font-black uppercase tracking-widest text-white/30">Batch History ({batchHistory.length})</span>
            <button onClick={clearBatchHistory} title="Clear batch history" className="text-[6px] font-mono text-white/20 hover:text-red-400 transition-colors uppercase tracking-wider">Clear</button>
          </div>
          <div className="flex flex-col gap-0.5 px-2 pb-1.5">
            {batchHistory.map((entry: HistoryEntry, i: number) => {
              const timeStr = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const undoable = isEntryUndoable(entry);
              return (
                <div key={`${entry.time}-${i}`}
                  className={`flex items-center justify-between px-1.5 py-0.5 rounded-xs border-l-2 text-[7px] font-mono ${variantClass(BATCH_VARIANT_TIMELINE, entry.variant) || 'border-white/20 bg-white/5 text-white/60'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`text-[7px] ${undoable ? 'text-primary/60' : 'text-white/20'}`}>{undoable ? '↶' : '—'}</span>
                    <span className="font-black uppercase tracking-widest">{entry.message}</span>
                  </span>
                  <span className="text-[6px] opacity-50 tabular-nums">{timeStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* R1b — Drag ghost preview overlay */}
      {dragGhost && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="fixed pointer-events-none z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-xs border shadow-2xl text-[8px] font-bold uppercase tracking-widest"
          style={{
            left: dragGhost.x + 12, top: dragGhost.y - 20,
            backgroundColor: `${dragGhost.color}18`, borderColor: `${dragGhost.color}66`,
            color: dragGhost.color, boxShadow: `0 0 20px ${dragGhost.color}33, 0 4px 12px rgba(0,0,0,0.4)`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dragGhost.color }} />
          <span className="truncate max-w-[160px]">{dragGhost.label}</span>
        </motion.div>
      )}

      {/* ── VIRTUAL SCROLL TREE ────────────────────────────────────────── */}
      {tree ? (
        visibleCount === 0 && (searchTerm || typeFilter !== 'all' || showHidden || showLocked || showAuditIssues || showTemplates || propertySearchTerm) ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-40 gap-1.5">
            <ListFilter className="w-5 h-5 wb-text" />
            <span className="text-[7px] font-black uppercase tracking-widest wb-text">No layers match filters</span>
            <button onClick={clearAllFilters} className="text-[7px] font-mono text-primary/60 hover:text-primary underline underline-offset-2">Clear all filters</button>
          </div>
        ) : (
          <div
            ref={treeContainerRef}
            className="flex-1 overflow-hidden select-none p-1.5"
            onDragOver={handleTreeDragOver}
            onDrop={handleTreeDrop}
          >
            {treeDimensions.height > 0 && flatItems.length > 0 && (
              <List
                listRef={listRef}
                rowCount={flatItems.length}
                rowHeight={ROW_HEIGHT}
                rowComponent={LayerRow}
                rowProps={rowProps}
                overscanCount={15}
              />
            )}
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 gap-1.5">
          <ListFilter className="w-5 h-5 wb-text" />
          <span className="text-[7px] font-black uppercase tracking-widest wb-text">No tree data</span>
        </div>
      )}

      {/* Quick Add */}
      {onAddEntity && visibleCount > 0 && (
        <div className="shrink-0 px-1.5 pb-1.5">
          <div className="pt-2 border-t wb-outline flex flex-col gap-1">
            <div className="px-1.5 text-[7px] font-black wb-text-muted uppercase tracking-widest">Quick Add</div>
            <button onClick={() => onAddEntity('control')} title="Add parameter control"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors wb-text-muted">
              <Sliders className="w-3.5 h-3.5" /> <span>Param Control</span>
            </button>
            <button onClick={() => onAddEntity('jack')} title="Add signal port"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors wb-text-muted">
              <Radio className="w-3.5 h-3.5" /> <span>Signal Port</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CONTEXT MENU ────────────────────────────────────────────────── */}
      {contextMenu && (
        <div className="fixed z-[1000] bg-[#0c0c0d] border border-white/10 rounded-xs shadow-[0_0_15px_rgba(0,0,0,0.7)] p-1 flex flex-col gap-0.5 min-w-[150px] font-sans"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {multiSelectedIds.length >= 2 && onGroupSelected && (
            <button onClick={() => { onGroupSelected(); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
              aria-label="Group selected elements"
            >Group Selected</button>
          )}
          {multiSelectedIds.length === 1 && onGroupDown && (
            <button onClick={() => { onGroupDown(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
              aria-label="Group down"
            >Group Down</button>
          )}
          {multiSelectedIds.length === 1 && onMoveNodeUpDown && (<>
            <button onClick={() => { onMoveNodeUpDown(contextMenu.nodeId, 'up'); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
              aria-label="Move up"
            >Move Up (Alt+▲)</button>
            <button onClick={() => { onMoveNodeUpDown(contextMenu.nodeId, 'down'); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
              aria-label="Move down"
            >Move Down (Alt+▼)</button>
          </>)}
          {multiSelectedIds.length === 1 && !contextMenu.isGroup && onDuplicateItem && (
            <button onClick={() => { onDuplicateItem(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1"
              aria-label="Duplicate layer"
            >Duplicate Layer</button>
          )}
          {multiSelectedIds.length === 1 && contextMenu.isGroup && onDuplicateGroup && (
            <button onClick={() => { onDuplicateGroup(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1"
              aria-label="Duplicate group"
            >Duplicate Group</button>
          )}
          {multiSelectedIds.length === 1 && contextMenu.isGroup && onUngroupNode && (
            <button onClick={() => { onUngroupNode(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
              aria-label="Ungroup"
            >Ungroup</button>
          )}
          {multiSelectedIds.length === 1 && contextMenu.isGroup && onSaveGroupAsBlueprint && (
            <button onClick={() => { onSaveGroupAsBlueprint(contextMenu.nodeId); closeContextMenu(); }}
              className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1.5"
              aria-label="Save as blueprint"
            >Save as Blueprint...</button>
          )}
        </div>
      )}
    </div>
  );
}
