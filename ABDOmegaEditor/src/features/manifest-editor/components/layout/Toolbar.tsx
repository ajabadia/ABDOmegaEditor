'use client';

/**
 * @purpose Rendiza una barra de herramientas para el editor de manifesto OMEGA con herramientas para seleccionar, agregar, agrupar y gestionar entidades en modo vivo.
 * @purpose_en Renders a toolbar for the OMEGA manifest editor with tools for selecting, adding, grouping, and managing entities in live mode.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:mgwi2k
 * @lastUpdated 2026-06-15T20:48:21.917Z
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolbarIconButton from './ToolbarIconButton';
import { 
  MousePointer2, Plus, Cpu, Sparkles, 
  Settings, Zap, Sliders, Radio,
  Maximize2, Minimize2,
  Group, Ungroup,
  Disc, ToggleLeft, Lightbulb, Tv, Type, Volume2, Activity, CircleDot,
  GripVertical, Eye, EyeOff, RotateCcw, Settings2
} from 'lucide-react';
import { findParentInTree } from '@/omega-ui-core/uca/treeUtils';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { useToolbarCustomization } from '@/features/manifest-editor/hooks/useToolbarCustomization';
import { TOOLBAR_BUTTONS } from '@/features/manifest-editor/constants/toolbarDefinitions';
 
interface ToolbarProps {
  isLiveMode: boolean;
  onToggleLive: () => void;
  onOpenGallery: () => void;
  onOpenConfig: () => void;
  onOpenCellStudio: () => void;
  onAddEntity: (type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => void;
  isZenMode: boolean;
  onToggleZen: () => void;
  activeTool: 'select' | 'marquee' | 'add' | 'studio' | null;
  setActiveTool: (tool: 'select' | 'marquee' | 'add' | 'studio' | null) => void;
  selectedNodeId?: string | null;
  /** Multi-selection IDs for enabling group/ungroup buttons */
  multiSelectedIds: string[];
  /** Group selected nodes */
  onGroupSelected?: ((ids: string[]) => void) | undefined;
  /** Ungroup a specific group node */
  onUngroupNode?: ((groupId: string) => void) | undefined;
  /** Current manifest for detecting group parents */
  findItem?: ((id: string) => unknown) | undefined;
  /** Current manifest */
  manifest?: OMEGA_Manifest | undefined;
}
 
export default function Toolbar({
  isLiveMode,
  onToggleLive,
  onOpenGallery,
  onOpenConfig,
  onOpenCellStudio,
  onAddEntity,
  isZenMode,
  onToggleZen,
  activeTool,
  setActiveTool,
  selectedNodeId,
  multiSelectedIds,
  onGroupSelected,
  onUngroupNode,
  findItem,
  manifest
}: ToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const customizeRef = useRef<HTMLDivElement>(null);
  
  const {
    config,
    moveButton,
    toggleVisibility,
    resetToDefault,
  } = useToolbarCustomization();

  // Close customize popover on click outside or Escape key
  useEffect(() => {
    if (!showCustomize) return;
    const clickHandler = (e: MouseEvent) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target as Node)) {
        setShowCustomize(false);
      }
    };
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCustomize(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', clickHandler);
      document.addEventListener('keydown', escapeHandler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', clickHandler);
      document.removeEventListener('keydown', escapeHandler);
    };
  }, [showCustomize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
 
  // Get the visible button order from config
  const orderedIds = config.order.filter(id => !config.hidden.includes(id));

  // Group/Ungroup enablement logic
  const isGroupEnabled = multiSelectedIds.length >= 2;
  
  // Find the target group ID for ungrouping (aligns with VirtualRack logic)
  const targetGroupId = (() => {
    if (multiSelectedIds.length !== 1 || !manifest) return undefined;
    const selectedId = multiSelectedIds[0];
    const rootTree = manifest.ui?.tree;
    if (!rootTree) return undefined;
    
    // Check if the selected node itself is a group
    const item = findItem?.(selectedId);
    if (item && typeof item === 'object' && 'kind' in (item as Record<string, unknown>)) {
      const nodeItem = item as { kind?: string };
      if (nodeItem.kind === 'group' || nodeItem.kind === 'container') {
        return selectedId;
      }
    }

    // Otherwise check if it belongs to a parent group
    const parent = findParentInTree(rootTree, selectedId);
    const rootId = manifest.ui?.tree?.id || 'root';
    if (parent && parent.id !== rootId && (parent.kind === 'group' || parent.kind === 'container')) {
      return parent.id;
    }
    return undefined;
  })();

  const isUngroupEnabled = targetGroupId !== undefined;
 
  const handleToolbarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      ((e.currentTarget as HTMLDivElement).querySelectorAll<HTMLButtonElement>('button[aria-label]'))
    );
    const currentIdx = buttons.indexOf(document.activeElement as HTMLButtonElement);

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        e.preventDefault();
        const next = buttons[(currentIdx + 1) % buttons.length];
        next?.focus();
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        e.preventDefault();
        const prev = buttons[(currentIdx - 1 + buttons.length) % buttons.length];
        prev?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        buttons[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        buttons[buttons.length - 1]?.focus();
        break;
      }
    }
  }, []);

  const handleSelectTool = (tool: 'select' | 'marquee' | 'add' | 'studio') => {
    setActiveTool(tool);
    if (tool === 'add') {
      setShowAddMenu(prev => !prev);
    } else {
      setShowAddMenu(false);
    }
 
    if (tool === 'studio') {
      onOpenCellStudio();
      // Auto revert to select tool after launching studio
      setTimeout(() => setActiveTool('select'), 500);
    }
  };

  // Define components for the buttons
  const selectBtn = (
    <ToolbarIconButton
      key="select"
      icon={<MousePointer2 className="w-3.5 h-3.5 fill-current" />}
      active={activeTool === 'select'}
      onClick={() => handleSelectTool('select')}
      title="Select & Move Tool (V)"
      size="md"
      className={activeTool === 'select' ? 'tool-active-glow' : ''}
    />
  );

  const marqueeBtn = (
    <ToolbarIconButton
      key="marquee"
      icon={
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2.5" strokeDasharray="3 3" />
        </svg>
      }
      active={activeTool === 'marquee'}
      onClick={() => handleSelectTool('marquee')}
      title="Marquee Selection Tool (M)"
      size="md"
      className={activeTool === 'marquee' ? 'tool-active-glow' : ''}
    />
  );

  const addBtn = (
    <div key="add" className="relative">
      <ToolbarIconButton
        icon={<Plus className="w-4 h-4" />}
        active={activeTool === 'add'}
        onClick={() => handleSelectTool('add')}
        title="Add Primitives & Ports (A)"
        size="md"
        className={activeTool === 'add' ? 'tool-active-glow' : ''}
      />
 
      {/* Plus flyout menu */}
      <AnimatePresence>
        {showAddMenu && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-full top-0 ml-1.5 w-80 wb-surface border wb-outline shadow-2xl p-2 rounded-xs flex flex-col gap-2 z-50 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[7px] font-black uppercase text-primary/80 px-1.5 pb-1 border-b wb-outline tracking-wider">
              Inject Component
            </div>
            
            <div className="grid grid-cols-2 gap-3 p-1">
              {/* Column 1: Primitives (Controls) */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[6px] font-black uppercase wb-text-muted tracking-widest border-b border-white/5 pb-0.5 mb-1">
                  Primitives
                </div>
                
                <button
                  onClick={() => {
                    onAddEntity('control', { type: 'knob', size: { width: 36, height: 36 } });
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
                  title="Add Knob"
                >
                  <Disc className="w-3 h-3 text-primary/70" />
                  <span>Knob</span>
                </button>

                <button
                  onClick={() => {
                    onAddEntity('control', { type: 'slider-v', size: { width: 20, height: 64 } });
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
                  title="Add Vertical Slider"
                >
                  <Sliders className="w-3 h-3 text-primary/70" />
                  <span>Slider (V)</span>
                </button>

                <button
                  onClick={() => {
                    onAddEntity('control', { type: 'slider-h', size: { width: 64, height: 20 } });
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
                  title="Add Horizontal Slider"
                >
                  <Sliders className="w-3 h-3 text-primary/70 rotate-90" />
                  <span>Slider (H)</span>
                </button>

                <button
                  onClick={() => {
                    onAddEntity('control', { type: 'button', size: { width: 24, height: 24 } });
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
                  title="Add Button"
                >
                  <CircleDot className="w-3 h-3 text-primary/70" />
                  <span>Button</span>
                </button>

                <button
                  onClick={() => {
                    onAddEntity('control', { type: 'switch', size: { width: 24, height: 40 } });
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
                  title="Add Switch"
                >
                  <ToggleLeft className="w-3 h-3 text-primary/70" />
                  <span>Switch</span>
                </button>

                <button
                  onClick={() => {
                    onAddEntity('control', { type: 'led', size: { width: 14, height: 14 } });
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
                  title="Add LED Light"
                >
                  <Lightbulb className="w-3 h-3 text-primary/70" />
                  <span>LED Light</span>
                </button>

                <button
                  onClick={() => {
                    onAddEntity('control', { type: 'display', size: { width: 80, height: 40 } });
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
                  title="Add Display"
                >
                  <Tv className="w-3 h-3 text-primary/70" />
                  <span>Display</span>
                </button>

                <button
                  onClick={() => {
                    onAddEntity('control', { type: 'label', label: 'Label', size: { width: 60, height: 16 } });
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary/20 hover:text-primary transition-colors"
                  title="Add Label"
                >
                  <Type className="w-3 h-3 text-primary/70" />
                  <span>Label</span>
                </button>
              </div>
              
              {/* Column 2: Ports */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[6px] font-black uppercase wb-text-muted tracking-widest border-b border-white/5 pb-0.5 mb-1">
                  Signal Ports
                </div>

                {/* Audio Port */}
                <div className="flex flex-col gap-1 p-1 bg-white/2 rounded-xs border border-white/5">
                  <div className="text-[6px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1">
                    <Volume2 className="w-2.5 h-2.5" />
                    <span>Audio</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        onAddEntity('jack', { type: 'port', label: 'Audio In' });
                        setShowAddMenu(false);
                        setActiveTool('select');
                      }}
                      className="px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 hover:bg-red-500/20 hover:text-red-400 border border-white/5 transition-colors"
                      aria-label="Audio input port"
                    >
                      In
                    </button>
                    <button
                      onClick={() => {
                        onAddEntity('jack', { type: 'port', label: 'Audio Out' });
                        setShowAddMenu(false);
                        setActiveTool('select');
                      }}
                      className="px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 hover:bg-red-500/20 hover:text-red-400 border border-white/5 transition-colors"
                      aria-label="Audio output port"
                    >
                      Out
                    </button>
                  </div>
                </div>

                {/* CV Port */}
                <div className="flex flex-col gap-1 p-1 bg-white/2 rounded-xs border border-white/5">
                  <div className="text-[6px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    <span>CV</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        onAddEntity('jack', { type: 'port', label: 'CV In' });
                        setShowAddMenu(false);
                        setActiveTool('select');
                      }}
                      className="px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 hover:bg-amber-500/20 hover:text-amber-400 border border-white/5 transition-colors"
                      aria-label="CV input port"
                    >
                      In
                    </button>
                    <button
                      onClick={() => {
                        onAddEntity('jack', { type: 'port', label: 'CV Out' });
                        setShowAddMenu(false);
                        setActiveTool('select');
                      }}
                      className="px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 hover:bg-amber-500/20 hover:text-amber-400 border border-white/5 transition-colors"
                      aria-label="CV output port"
                    >
                      Out
                    </button>
                  </div>
                </div>

                {/* Gate / Trig Port */}
                <div className="flex flex-col gap-1 p-1 bg-white/2 rounded-xs border border-white/5">
                  <div className="text-[6px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5" />
                    <span>Gate/Trig</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        onAddEntity('jack', { type: 'port', label: 'Gate In' });
                        setShowAddMenu(false);
                        setActiveTool('select');
                      }}
                      className="px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/5 transition-colors"
                      aria-label="Gate input port"
                    >
                      In
                    </button>
                    <button
                      onClick={() => {
                        onAddEntity('jack', { type: 'port', label: 'Gate Out' });
                        setShowAddMenu(false);
                        setActiveTool('select');
                      }}
                      className="px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/5 transition-colors"
                      aria-label="Gate output port"
                    >
                      Out
                    </button>
                  </div>
                </div>

                {/* MIDI Port */}
                <div className="flex flex-col gap-1 p-1 bg-white/2 rounded-xs border border-white/5">
                  <div className="text-[6px] font-black uppercase text-purple-400 tracking-wider flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5" />
                    <span>MIDI</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        onAddEntity('jack', { type: 'port', label: 'MIDI In' });
                        setShowAddMenu(false);
                        setActiveTool('select');
                      }}
                      className="px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 hover:bg-purple-500/20 hover:text-purple-400 border border-white/5 transition-colors"
                      aria-label="MIDI input port"
                    >
                      In
                    </button>
                    <button
                      onClick={() => {
                        onAddEntity('jack', { type: 'port', label: 'MIDI Out' });
                        setShowAddMenu(false);
                        setActiveTool('select');
                      }}
                      className="px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 hover:bg-purple-500/20 hover:text-purple-400 border border-white/5 transition-colors"
                      aria-label="MIDI output port"
                    >
                      Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const studioBtn = (
    <ToolbarIconButton
      key="studio"
      icon={<Cpu className="w-3.5 h-3.5" />}
      onClick={() => handleSelectTool('studio')}
      title="Universal Cell Laboratory (Studio)"
      size="md"
    />
  );

  const groupBtn = (
    <ToolbarIconButton
      key="group"
      icon={<Group className="w-3.5 h-3.5" />}
      onClick={() => {
        if (isGroupEnabled && onGroupSelected) {
          onGroupSelected(multiSelectedIds);
          setActiveTool('select');
        }
      }}
      title={`Group ${multiSelectedIds.length} selected elements`}
      size="md"
    />
  );

  const ungroupBtn = (
    <ToolbarIconButton
      key="ungroup"
      icon={<Ungroup className="w-3.5 h-3.5" />}
      onClick={() => {
        if (isUngroupEnabled && onUngroupNode && targetGroupId) {
          onUngroupNode(targetGroupId);
          setActiveTool('select');
        }
      }}
      title="Ungroup selected group"
      size="md"
    />
  );

  const blueprintsBtn = (
    <ToolbarIconButton
      key="blueprints"
      icon={<Sparkles className="w-3.5 h-3.5" />}
      onClick={onOpenGallery}
      title="Blueprints & Templates (B)"
      size="md"
    />
  );

  const configBtn = (
    <ToolbarIconButton
      key="config"
      icon={<Settings className="w-3.5 h-3.5" />}
      onClick={onOpenConfig}
      title="Module Signature & Governance"
      size="md"
    />
  );

  const liveBtn = (
    <ToolbarIconButton
      key="live"
      icon={<Zap className="w-3.5 h-3.5 fill-current" />}
      active={isLiveMode}
      onClick={onToggleLive}
      title={isLiveMode ? "HIL Engine: Live (Click to disconnect)" : "HIL Engine: Connect to WASM"}
      size="md"
      colorVariant="accent"
      className={isLiveMode ? 'tool-active-glow-accent' : ''}
    />
  );

  const zenBtn = (
    <ToolbarIconButton
      key="zen"
      icon={isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      active={isZenMode}
      onClick={onToggleZen}
      title={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
      size="md"
      className={isZenMode ? 'shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' : ''}
    />
  );

  const customizeBtn = (
    <ToolbarIconButton
      key="customize"
      icon={<Settings2 className="w-3 h-3" />}
      onClick={() => setShowCustomize(prev => !prev)}
      title="Customize Toolbar"
      size="md"
      className="opacity-40 hover:opacity-100 transition-opacity"
    />
  );

  // Build button map for quick lookup
  const buttonMap: Record<string, React.ReactNode> = {
    select: selectBtn,
    marquee: marqueeBtn,
    add: addBtn,
    studio: selectedNodeId ? studioBtn : null,
    group: isGroupEnabled ? groupBtn : null,
    ungroup: isUngroupEnabled ? ungroupBtn : null,
    blueprints: blueprintsBtn,
    config: configBtn,
    live: liveBtn,
    zen: zenBtn,
  };

  // Render buttons in persisted order, filtering out conditionally hidden and null entries
  const renderedButtons: { id: string; element: React.ReactNode }[] = [];
  for (const id of orderedIds) {
    const el = buttonMap[id];
    if (el !== null && el !== undefined) {
      renderedButtons.push({ id, element: el });
    }
  }

  // Calculate layout parameters based on rendered buttons
  const B = renderedButtons.length;
  const H_item = 34;
  const H_other = 36;
  const maxHeight = Math.max(200, windowHeight - 140);
  const maxRows = Math.max(1, Math.floor((maxHeight - H_other) / H_item));
  const cols = Math.ceil(B / maxRows);

  // Build dividers for single-column mode based on groups
  const buttonGroupMap: Record<string, string> = {
    select: 'tools', marquee: 'tools', add: 'tools',
    studio: 'edit', group: 'edit', ungroup: 'edit',
    blueprints: 'views', config: 'views',
    live: 'system', zen: 'system',
  };
  const items: ({ type: 'button'; id: string; element: React.ReactNode } | { type: 'divider' })[] = [];
  let lastGroup: string | null = null;
  for (const btn of renderedButtons) {
    const group = buttonGroupMap[btn.id] || 'tools';
    if (lastGroup !== null && group !== lastGroup) {
      items.push({ type: 'divider' });
    }
    items.push({ type: 'button', id: btn.id, element: btn.element });
    lastGroup = group;
  }
 
  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragTransition={{ power: 0 }}
        className="absolute left-3 top-20 z-50 wb-surface border wb-outline rounded-xs flex flex-col items-center py-2.5 px-2 gap-1.5 shadow-xl cursor-grab active:cursor-grabbing select-none"
        style={{ 
          touchAction: 'none',
          width: cols === 1 ? 44 : 'auto'
        }}
        role="toolbar"
        aria-label="Floating tools"
        onKeyDown={handleToolbarKeyDown}
      >
        {/* Drag handle dots */}
        <div className="w-5 h-2 flex flex-col gap-0.5 justify-center items-center opacity-30 cursor-move mb-1 shrink-0">
          <div className="w-full h-[1px] bg-foreground" />
          <div className="w-full h-[1px] bg-foreground" />
          <div className="w-full h-[1px] bg-foreground" />
        </div>
 
        {cols === 1 ? (
          <div className="flex flex-col items-center gap-1.5">
            {items.map((item, idx) => {
              if (item.type === 'divider') {
                return (
                  <div 
                    key={`div-${idx}`} 
                    className="w-6 h-[1px] wb-outline opacity-20 my-1 shrink-0" 
                  />
                );
              }
              return item.element;
            })}
            {/* Separator + Customize button */}
            <div className="w-6 h-[1px] wb-outline opacity-20 my-1 shrink-0" />
            {customizeBtn}
          </div>
        ) : (
          <>
            <div 
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
              }}
            >
              {renderedButtons.map(b => b.element)}
            </div>
            {/* Customize button below grid */}
            <div className="w-6 h-[1px] wb-outline opacity-20 my-1 shrink-0" />
            {customizeBtn}
          </>
        )}
      </motion.div>

      {/* ── Customize Popover ── */}
      {showCustomize && (
        <div
          ref={customizeRef}
          className="fixed left-16 top-20 z-[100] w-[260px] wb-surface border wb-outline rounded-xs shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b wb-outline">
            <span className="text-[8px] font-black uppercase tracking-[0.15em] wb-text">
              Customize Toolbar
            </span>
            <button
              onClick={resetToDefault}
              className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-wider wb-text-muted hover:text-primary transition-colors"
              title="Reset to default"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset
            </button>
          </div>

          {/* List */}
          <div className="max-h-[300px] overflow-y-auto py-1">
            {config.order.map((id, idx) => {
              const def = TOOLBAR_BUTTONS.find(b => b.id === id);
              if (!def || def.conditional) return null;
              const hidden = config.hidden.includes(id);
              const Icon = def.icon;

              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(idx);
                  }}
                  onDragEnd={() => {
                    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                      moveButton(dragIndex, dragOverIndex);
                    }
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 transition-all ${
                    dragOverIndex === idx && dragIndex !== idx
                      ? 'border-t border-primary/40'
                      : ''
                  } ${hidden ? 'opacity-40' : ''}`}
                >
                  {/* Drag handle */}
                  <GripVertical className="w-2.5 h-2.5 shrink-0 wb-text-muted cursor-grab active:cursor-grabbing" />

                  {/* Icon */}
                  <span className="shrink-0 wb-text-muted">
                    <Icon className="w-3 h-3" />
                  </span>

                  {/* Label */}
                  <span className="flex-1 text-[8px] font-bold uppercase tracking-wider wb-text truncate">
                    {def.label}
                  </span>

                  {/* Visibility toggle */}
                  <button
                    onClick={() => toggleVisibility(id)}
                    className="p-0.5 rounded-xs hover:bg-white/10 transition-colors"
                    title={hidden ? 'Show button' : 'Hide button'}
                    aria-label={hidden ? 'Show button' : 'Hide button'}
                  >
                    {hidden ? (
                      <EyeOff className="w-2.5 h-2.5 wb-text-muted" />
                    ) : (
                      <Eye className="w-2.5 h-2.5 text-primary/60" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t wb-outline flex items-center justify-between">
            <span className="text-[6px] font-mono wb-text-muted uppercase tracking-wider">
              Drag to reorder
            </span>
            <span className="text-[6px] font-mono wb-text-muted">
              {config.order.length - config.hidden.length} / {config.order.length} visible
            </span>
          </div>
        </div>
      )}
    </>
  );
}
