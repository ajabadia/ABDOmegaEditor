'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, Package, Layers, Camera, Zap, FolderOpen, 
  Cpu, Database, Image as ImageIcon, LogOut, Undo2, 
  Redo2, Terminal, HelpCircle, Shield, ChevronRight, Settings, Layout, History,
  Check, Sliders
} from 'lucide-react';

interface MenuBarProps {
  onTriggerUpload: (id: string) => void;
  onExportManifest: () => void;
  onExportPack: () => void;
  onExportCAD: () => void;
  onExportContract: (format: 'ts' | 'cpp') => void;
  onDeploy: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleLogs: () => void;
  onHelp: () => void;
  onGenerateMockup: () => void;
  onTabFocus: (type: 'orbital' | 'rack' | 'source' | 'history') => void;
  onOpenAudit: () => void;
  onOpenAbout: () => void;
  onOpenConfig: () => void;
  onOpenCellEditor?: (() => void) | undefined;
  onOpenGallery?: (() => void) | undefined;
  onLinkDirectory?: (() => void) | undefined;
  isDirectoryLinked?: boolean | undefined;
  windowStates?: { window_layers: boolean; window_properties: boolean; window_rack_properties: boolean; window_blueprints: boolean; window_info: boolean; window_history: boolean; window_logs: boolean } | undefined;
  onToggleWindow?: ((name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_info' | 'window_history' | 'window_logs') => void) | undefined;
}

export default function MenuBar(props: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menus = [
    {
      id: 'file',
      label: 'File',
      items: [
        {
          label: props.isDirectoryLinked ? 'Linked Workspace ✓' : 'Link Workspace Folder',
          icon: FolderOpen,
          onClick: props.onLinkDirectory || (() => {}),
          highlight: 'deprecated'
        },
        { 
          label: 'Load', 
          icon: FolderOpen, 
          submenu: [
            { label: 'Ingest Module Folder', icon: FolderOpen, onClick: () => props.onTriggerUpload('folder-upload') },
            { label: 'WASM', icon: Cpu, onClick: () => props.onTriggerUpload('bulk-upload') },
            { label: 'Contract', icon: Database, onClick: () => props.onTriggerUpload('bulk-upload') },
            { label: 'Manifest (.acemm)', icon: FileCode, onClick: () => props.onTriggerUpload('bulk-upload') },
            { label: 'Assets', icon: ImageIcon, onClick: () => props.onTriggerUpload('resource-upload') },
          ]
        },
        { 
          label: 'Blueprints', 
          icon: Layout, 
          onClick: props.onOpenGallery || (() => {}),
          highlight: 'deprecated'
        },
        { 
          label: 'Save', 
          icon: Package, 
          submenu: [
            { label: 'Manifest (.acemm)', icon: FileCode, onClick: props.onExportManifest },
            { label: 'OmegaPack', icon: Package, onClick: props.onExportPack },
          ]
        },
        {
          label: 'Export',
          icon: Layers,
          submenu: [
            { label: 'Industrial CAD Blueprint', icon: Layers, onClick: props.onExportCAD },
            { label: 'Tech Contract (TS)', icon: FileCode, onClick: () => props.onExportContract('ts') },
            { label: 'Engine Header (C++)', icon: FileCode, onClick: () => props.onExportContract('cpp') },
          ]
        },
        { type: 'divider' },
        { label: 'Deploy to Engine', icon: Zap, onClick: props.onDeploy, highlight: 'deprecated' },
        { type: 'divider' },
        { label: 'Exit', icon: LogOut, onClick: () => window.location.href = '/' },
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { label: 'Undo', icon: Undo2, onClick: props.onUndo },
        { label: 'Redo', icon: Redo2, onClick: props.onRedo },
        { type: 'divider' },
        { label: 'Document Timeline', icon: History, onClick: () => props.onTabFocus('history') },
        { type: 'divider' },
        { label: 'Universal Cell Laboratory', icon: Cpu, onClick: props.onOpenCellEditor || (() => {}), highlight: 'deprecated' },
        { label: 'Module Global Configuration', icon: Settings, onClick: props.onOpenConfig, highlight: 'deprecated' },
        { type: 'divider' },
        {
          label: 'Generate',
          icon: Camera,
          submenu: [
            { label: 'Studio Render', icon: Camera, onClick: props.onGenerateMockup },
          ]
        },
        { type: 'divider' },
        { label: 'Reset Workspace', icon: LogOut, onClick: props.onReset },
      ]
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Orbital View', icon: Layers, onClick: () => props.onTabFocus('orbital') },
        { label: 'Virtual Rack', icon: Layers, onClick: () => props.onTabFocus('rack') },
        { label: 'Source Code', icon: FileCode, onClick: () => props.onTabFocus('source') },
        { type: 'divider' },
        { label: 'Toggle Logs Window', icon: Terminal, onClick: () => props.onToggleWindow?.('window_logs') },
      ]
    },
    {
      id: 'window',
      label: 'Ventana',
      items: [
        { 
          label: 'Capas (Layers)', 
          icon: Layers, 
          checked: props.windowStates?.window_layers, 
          onClick: () => props.onToggleWindow?.('window_layers') 
        },
        { 
          label: 'Propiedades del Rack (Rack)', 
          icon: Settings, 
          checked: props.windowStates?.window_rack_properties, 
          onClick: () => props.onToggleWindow?.('window_rack_properties') 
        },
        { 
          label: 'Propiedades de Elemento (Properties)', 
          icon: Sliders, 
          checked: props.windowStates?.window_properties, 
          onClick: () => props.onToggleWindow?.('window_properties') 
        },
        { 
          label: 'Librería de Blueprints (Blueprints)', 
          icon: Zap, 
          checked: props.windowStates?.window_blueprints, 
          onClick: () => props.onToggleWindow?.('window_blueprints') 
        },
        { 
          label: 'Información (Info)', 
          icon: HelpCircle, 
          checked: props.windowStates?.window_info, 
          onClick: () => props.onToggleWindow?.('window_info') 
        },
        { 
          label: 'Historial (History)', 
          icon: History, 
          checked: props.windowStates?.window_history, 
          onClick: () => props.onToggleWindow?.('window_history') 
        },
        { 
          label: 'Logs (Console)', 
          icon: Terminal, 
          checked: props.windowStates?.window_logs, 
          onClick: () => props.onToggleWindow?.('window_logs') 
        },
      ]
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'Engineering Manual', icon: HelpCircle, onClick: props.onHelp },
        { label: 'Compliance Report', icon: Shield, onClick: props.onOpenAudit, highlight: 'deprecated' },
        { type: 'divider' },
        { label: 'About OMEGA', icon: Shield, onClick: props.onOpenAbout },
      ]
    }
  ];

  return (
    <nav className="flex items-center" ref={menuRef}>
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
            className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
              activeMenu === menu.id ? 'bg-primary text-black' : 'hover:bg-white/5 wb-text-muted hover:wb-text'
            }`}
          >
            {menu.label}
          </button>

          <AnimatePresence>
            {activeMenu === menu.id && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.1 }}
                className="absolute left-0 mt-0 w-56 bg-[#0a0a0b] border border-outline shadow-2xl z-[110] py-1"
              >
                {menu.items.map((item, idx) => (
                  <MenuItem key={idx} item={item} closeMenu={() => setActiveMenu(null)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </nav>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MenuItem({ item, closeMenu }: { item: any, closeMenu: () => void }) {
  const [showSubmenu, setShowSubmenu] = useState(false);

  if (item.type === 'divider') {
    return <div className="h-px bg-outline/20 my-1 mx-2" />;
  }

  const Icon = item.icon;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      <button
        disabled={item.disabled}
        onClick={() => {
          if (!item.submenu) {
            item.onClick();
            closeMenu();
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${
          item.disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-primary hover:text-black hover:text-black group'
        } ${item.highlight === 'accent' ? 'text-accent hover:bg-accent hover:text-black' : item.highlight === 'deprecated' ? 'text-red-500/70 hover:bg-red-500 hover:text-black bg-red-500/5 line-through decoration-red-500/40' : 'wb-text'}`}
      >
        <div className="flex items-center gap-2">
          {item.checked !== undefined && (
            <div className="w-3 h-3 flex items-center justify-center shrink-0 border border-outline/30 rounded-xs bg-black/40 group-hover:border-black/50">
              {item.checked && <Check className="w-2 h-2 text-primary group-hover:text-black" />}
            </div>
          )}
          {Icon && <Icon className="w-3 h-3" />}
          <span>{item.label}</span>
        </div>
        {item.submenu && <ChevronRight className="w-2.5 h-2.5" />}
      </button>

      <AnimatePresence>
        {showSubmenu && item.submenu && (
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute left-full top-0 mt-[-1px] w-56 bg-[#0a0a0b] border border-outline shadow-2xl z-[120] py-1"
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {item.submenu.map((sub: any, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  sub.onClick();
                  closeMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest wb-text hover:bg-primary hover:text-black transition-all"
              >
                {sub.icon && <sub.icon className="w-3 h-3" />}
                <span>{sub.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
