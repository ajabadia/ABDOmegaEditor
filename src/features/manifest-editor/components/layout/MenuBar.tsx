'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, Package, Layers, Camera, Zap, FolderOpen, 
  Cpu, Database, Image as ImageIcon, LogOut, Undo2, 
  Redo2, Terminal, HelpCircle, Shield, ChevronRight, Settings, Layout, History
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
        { label: 'Toggle Logs Terminal', icon: Terminal, onClick: props.onToggleLogs },
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
                className="absolute left-0 mt-0 w-56 bg-[#0a0a0b] border border-outline shadow-2xl z-[100] py-1"
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
          item.disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-primary hover:text-black'
        } ${item.highlight === 'accent' ? 'text-accent hover:bg-accent hover:text-black' : item.highlight === 'deprecated' ? 'text-red-500/70 hover:bg-red-500 hover:text-black bg-red-500/5 line-through decoration-red-500/40' : 'wb-text'}`}
      >
        <div className="flex items-center gap-2">
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
            className="absolute left-full top-0 mt-[-1px] w-56 bg-[#0a0a0b] border border-outline shadow-2xl py-1"
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
