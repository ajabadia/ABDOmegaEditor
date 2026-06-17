'use client';

/**
 * @purpose Renderiza un menú de barra con secciones y submenús para operaciones de archivo, configuración de visualización, control de ventana y recursos de ayuda en el editor de manifesto OMEGA.
 * @purpose_en Renders a menu bar with various sections and submenus for file operations, view settings, window controls, and help resources in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1fs9703
 * @lastUpdated 2026-06-15T12:47:49.553Z
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, Package, Layers, Camera, Zap, FolderOpen, 
  Cpu, Database, Image as ImageIcon, LogOut, Undo2, 
  Redo2, Terminal, HelpCircle, Shield, ChevronRight, Settings, Layout, History,
  Check, Sliders, Grid3X3, Ruler, Download, Map
} from 'lucide-react';

import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

// Static menu IDs — never changes between renders
const MENU_IDS = ['file', 'edit', 'view', 'window', 'help'];

interface MenuBarProps {
  onTriggerUpload: (id: string) => void;
  onExportManifest: (mode: 'work' | 'distilled') => void;
  onExportPack: () => void;
  onExportOmegaRack: () => void;
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
  onToggleTour?: (() => void) | undefined;
  onOpenGallery?: (() => void) | undefined;
  onImportDistilledJson?: (() => void) | undefined;
  onLinkDirectory?: (() => void) | undefined;
  isDirectoryLinked?: boolean | undefined;
  gridVisible?: boolean | undefined;
  onToggleGrid?: (() => void) | undefined;
  showGuides?: boolean | undefined;
  onToggleGuides?: (() => void) | undefined;
  miniMapVisible?: boolean | undefined;
  onToggleMiniMap?: (() => void) | undefined;
  windowStates?: { window_layers: boolean; window_properties: boolean; window_rack_properties: boolean; window_blueprints: boolean; window_compliance: boolean; window_info: boolean; window_history: boolean; window_logs: boolean } | undefined;
  onToggleWindow?: ((name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs') => void) | undefined;
  // Phase 39 — recovered from backup
  selectedNodeId?: string | null | undefined;
  multiSelectedIds?: string[] | undefined;
  onSaveCellAsBlueprint?: (() => void) | undefined;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  onSetInspectorLevel?: ((level: 'simple' | 'medium' | 'advanced') => void) | undefined;
  manifest?: OMEGA_Manifest | undefined;
  onUpdateManifest?: ((updates: Partial<OMEGA_Manifest>) => void) | undefined;
  rackSections?: {
    identity: boolean;
    essentialIdentity: boolean;
    identityBranding: boolean;
    globalUiSkin: boolean;
    activeConstructionPlane: boolean;
    moduleTaxonomy: boolean;
    physicalEmulationProfile: boolean;
    aestheticsGlobals: boolean;
    aestheticsElements: boolean;
    architecture: boolean;
    diagnostics: boolean;
  } | undefined;
  onToggleRackSection?: ((section: 'identity' | 'essentialIdentity' | 'identityBranding' | 'globalUiSkin' | 'activeConstructionPlane' | 'moduleTaxonomy' | 'physicalEmulationProfile' | 'aestheticsGlobals' | 'aestheticsElements' | 'architecture' | 'diagnostics') => void) | undefined;
}

export default function MenuBar(props: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Recovered from backup: gates File > Export > Cell as Blueprint JSON
  const isSingleCellSelected =
    !!props.selectedNodeId &&
    (!props.multiSelectedIds || props.multiSelectedIds.length === 0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus first item when a menu opens
  useEffect(() => {
    if (!activeMenu) return;
    const timer = setTimeout(() => {
      const container = menuRef.current?.querySelector(`[data-menu-id="${activeMenu}"]`);
      if (container) {
        const firstItem = container.querySelector<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]');
        firstItem?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeMenu]);

  const closeMenu = useCallback(() => {
    setActiveMenu(null);
  }, []);

  const handleMenuBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const currentIdx = activeMenu ? MENU_IDS.indexOf(activeMenu) : -1;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % MENU_IDS.length;
        setActiveMenu(MENU_IDS[nextIdx]);
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIdx = currentIdx < 0 ? 0 : (currentIdx - 1 + MENU_IDS.length) % MENU_IDS.length;
        setActiveMenu(MENU_IDS[prevIdx]);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (!activeMenu && MENU_IDS.length > 0) {
          setActiveMenu(MENU_IDS[0]);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setActiveMenu(null);
        break;
      }
      case 'Home': {
        e.preventDefault();
        if (MENU_IDS.length > 0) setActiveMenu(MENU_IDS[0]);
        break;
      }
      case 'End': {
        e.preventDefault();
        if (MENU_IDS.length > 0) setActiveMenu(MENU_IDS[MENU_IDS.length - 1]);
        break;
      }
    }
  }, [activeMenu]);

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, menuId: string) => {
    const container = menuRef.current?.querySelector(`[data-menu-id="${menuId}"]`);
    if (!container) return;
    const items = Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]'));
    const currentIdx = items.indexOf(e.currentTarget);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = items[(currentIdx + 1) % items.length];
        next?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = items[(currentIdx - 1 + items.length) % items.length];
        prev?.focus();
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setActiveMenu(null);
        // Restore focus to trigger button
        const trigger = menuRef.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${menuId}"]`);
        trigger?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        items[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      }
    }
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
            { label: 'Open .omega Project', icon: Package, onClick: () => (window as unknown as { __omegaLoadProject?: () => void }).__omegaLoadProject?.(), shortcut: 'Ctrl+O' },
            { label: 'Import Distilled .json', icon: FileCode, onClick: () => props.onImportDistilledJson?.() },
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
            { label: 'Save Work Mode', icon: FileCode, onClick: () => props.onExportManifest('work') },
            { label: 'Export Definitive Mode (Distilled)', icon: FileCode, onClick: () => props.onExportManifest('distilled') },
            { label: 'OmegaPack', icon: Package, onClick: props.onExportPack, shortcut: 'Ctrl+S' },
          ]
        },
        {
          label: 'Export',
          icon: Layers,
          submenu: [
            // Phase 39 — recovered from backup
            { label: 'Cell as Blueprint JSON', icon: Download, onClick: props.onSaveCellAsBlueprint || (() => {}), disabled: !isSingleCellSelected },
            { label: 'Studio Render', icon: Camera, onClick: props.onGenerateMockup },
            { label: 'Export to OMEGA Module Rack', icon: Package, onClick: props.onExportOmegaRack },
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
        { label: 'Undo', icon: Undo2, onClick: props.onUndo, shortcut: 'Ctrl+Z' },
        { label: 'Redo', icon: Redo2, onClick: props.onRedo, shortcut: 'Ctrl+Y' },
        { type: 'divider' },
        // Phase 39 — 'Document Timeline' removed (duplicate of View > History, which follows the VSCode convention)
        { label: 'Universal Cell Laboratory', icon: Cpu, onClick: props.onOpenCellEditor || (() => {}), disabled: !isSingleCellSelected, shortcut: 'Ctrl+Shift+E' },
        { label: 'Module Global Configuration', icon: Settings, onClick: props.onOpenConfig, highlight: 'deprecated' },
        { type: 'divider' },
        { label: 'Reset Workspace', icon: LogOut, onClick: props.onReset, shortcut: 'Ctrl+Shift+R' },
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
        // Phase 39 — recovered from backup
        { label: 'History', icon: History, onClick: () => props.onTabFocus('history') },
        { type: 'divider' },
        { label: 'View Grid', icon: Grid3X3, onClick: () => props.onToggleGrid?.(), checked: props.gridVisible },
        { label: 'Show Guides', icon: Ruler, onClick: () => props.onToggleGuides?.(), checked: props.showGuides },
        { type: 'divider' },
        // Phase 39 — recovered from backup
        {
          label: 'Inspector Level',
          icon: Sliders,
          submenu: [
            { label: 'Simple', checked: props.inspectorLevel === 'simple', onClick: () => props.onSetInspectorLevel?.('simple') },
            { label: 'Medium', checked: props.inspectorLevel === 'medium', onClick: () => props.onSetInspectorLevel?.('medium') },
            { label: 'Advanced', checked: props.inspectorLevel === 'advanced', onClick: () => props.onSetInspectorLevel?.('advanced') }
          ]
        },
        { type: 'divider' },
        // Phase 39 — recovered from backup
        {
          label: 'Show Element Boundaries (Debug UI)',
          icon: Layout,
          checked: !!props.manifest?.ui?.ucaDebug?.enabled,
          onClick: () => {
            if (!props.manifest || !props.onUpdateManifest) return;
            const enabled = !props.manifest.ui?.ucaDebug?.enabled;
            props.onUpdateManifest({
              ui: {
                ...props.manifest.ui,
                ucaDebug: {
                  ...props.manifest.ui?.ucaDebug,
                  enabled,
                  showLabels: props.manifest.ui?.ucaDebug?.showLabels ?? true,
                  hideDecorative: props.manifest.ui?.ucaDebug?.hideDecorative ?? false,
                  showCADOverlay: props.manifest.ui?.ucaDebug?.showCADOverlay ?? false,
                  selectedId: props.manifest.ui?.ucaDebug?.selectedId
                }
              }
            });
          }
        },
        {
          label: 'Disable UCA Rendering (Fallback)',
          icon: Layers,
          checked: props.manifest?.ui?.useUCA === false,
          onClick: () => {
            if (!props.manifest || !props.onUpdateManifest) return;
            props.onUpdateManifest({
              ui: { ...props.manifest.ui, useUCA: props.manifest.ui?.useUCA === false ? true : false }
            });
          }
        },
        // Phase 39 — 'Toggle Logs' removed (duplicate of Window > Console, which has checked indicator)
      ]
    },
    {
      id: 'window',
      label: 'Window',
      items: [
        {
          label: 'Layers',
          icon: Layers,
          checked: props.windowStates?.window_layers,
          onClick: () => props.onToggleWindow?.('window_layers'),
          shortcut: 'Ctrl+Shift+L'
        },
        {
          label: 'Mini Map',
          icon: Map,
          checked: props.miniMapVisible,
          onClick: () => props.onToggleMiniMap?.(),
          shortcut: 'Ctrl+Shift+M'
        },
        {
          label: 'Rack Properties',
          icon: Settings,
          checked: props.windowStates?.window_rack_properties,
          onClick: () => props.onToggleWindow?.('window_rack_properties'),
          submenu: [
            // Phase 34 consolidation: 10 granular sections merged into 6 industrial groups.
            // Each group maps to a representative section key for the check indicator;
            // the underlying state in WorkbenchContainer keeps the full 10-key surface.
            { label: 'Identity & Branding', checked: props.rackSections?.essentialIdentity, onClick: () => props.onToggleRackSection?.('essentialIdentity') },
            { label: 'Chassis & Power', checked: props.rackSections?.physicalEmulationProfile, onClick: () => props.onToggleRackSection?.('physicalEmulationProfile') },
            { label: 'Grid & Workspace', checked: props.rackSections?.activeConstructionPlane, onClick: () => props.onToggleRackSection?.('activeConstructionPlane') },
            { label: 'Aesthetics', checked: props.rackSections?.aestheticsGlobals, onClick: () => props.onToggleRackSection?.('aestheticsGlobals') },
            { label: 'Architecture', checked: props.rackSections?.architecture, onClick: () => props.onToggleRackSection?.('architecture') },
            { label: 'System Engineering', checked: props.rackSections?.diagnostics, onClick: () => props.onToggleRackSection?.('diagnostics') },
          ]
        },
        {
          label: 'Element Properties',
          icon: Sliders,
          checked: props.windowStates?.window_properties,
          onClick: () => props.onToggleWindow?.('window_properties')
        },
        {
          label: 'Compliance (Audit)',
          icon: Shield,
          checked: props.windowStates?.window_compliance,
          onClick: () => props.onToggleWindow?.('window_compliance'),
          shortcut: 'Ctrl+Shift+A'
        },
        {
          label: 'Blueprints Library',
          icon: Zap,
          checked: props.windowStates?.window_blueprints,
          onClick: () => props.onToggleWindow?.('window_blueprints')
        },
        {
          label: 'Information',
          icon: HelpCircle,
          checked: props.windowStates?.window_info,
          onClick: () => props.onToggleWindow?.('window_info')
        },
        {
          label: 'History',
          icon: History,
          checked: props.windowStates?.window_history,
          onClick: () => props.onToggleWindow?.('window_history')
        },
        {
          label: 'Console',
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
        { label: 'Guided Tour', icon: HelpCircle, onClick: () => props.onToggleTour?.() },
        { type: 'divider' },
        { label: 'About OMEGA', icon: Shield, onClick: props.onOpenAbout },
      ]
    }
  ];

  return (
    <nav
      className="flex items-center"
      ref={menuRef}
      role="menubar"
      aria-label="Main menu"
      onKeyDown={handleMenuBarKeyDown}
    >
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
            data-menu-trigger={menu.id}
            aria-haspopup="true"
            aria-expanded={activeMenu === menu.id}
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
                role="menu"
                data-menu-id={menu.id}
              >
                {menu.items.map((item, idx) => (
                  <MenuItem key={idx} item={item} closeMenu={closeMenu} menuId={menu.id} onItemKeyDown={handleItemKeyDown} />
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
function MenuItem({ item, closeMenu, menuId, onItemKeyDown }: { item: any; closeMenu: () => void; menuId: string; onItemKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, menuId: string) => void }) {
  const [showSubmenu, setShowSubmenu] = useState(false);

  if (item.type === 'divider') {
    return <div className="h-px bg-outline/20 my-1 mx-2" role="separator" />;
  }

  const Icon = item.icon;
  const isCheckable = item.checked !== undefined;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      <button
        disabled={item.disabled}
        role={isCheckable ? 'menuitemcheckbox' : 'menuitem'}
        aria-label={item.label}
        aria-checked={isCheckable ? item.checked : undefined}
        aria-haspopup={item.submenu ? 'true' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' && item.submenu) {
            e.preventDefault();
            setShowSubmenu(true);
            // Focus first submenu item
            setTimeout(() => {
              const parentWrapper = e.currentTarget.parentElement;
              const submenu = parentWrapper?.querySelector('[role="menu"]');
              const firstSub = submenu?.querySelector<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]');
              firstSub?.focus();
            }, 50);
          } else if (e.key === 'ArrowLeft' && showSubmenu) {
            e.preventDefault();
            setShowSubmenu(false);
          } else {
            onItemKeyDown(e, menuId);
          }
        }}
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
          {isCheckable && (
            <div className="w-3 h-3 flex items-center justify-center shrink-0 border border-outline/30 rounded-xs bg-black/40 group-hover:border-black/50">
              {item.checked && <Check className="w-2 h-2 text-primary group-hover:text-black" />}
            </div>
          )}
          {Icon && <Icon className="w-3 h-3" />}
          <span>{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.shortcut && (
            <span className="text-[7px] text-white/25 font-mono tracking-normal normal-case ml-4">{item.shortcut}</span>
          )}
          {item.submenu && <ChevronRight className="w-2.5 h-2.5" />}
        </div>
      </button>

      <AnimatePresence>
        {showSubmenu && item.submenu && (
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute left-full top-0 mt-[-1px] w-56 bg-[#0a0a0b] border border-outline shadow-2xl z-[120] py-1"
            role="menu"
            data-menu-id={`${menuId}-sub-${item.label}`}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {item.submenu.map((sub: any, idx: number) => {
              const subIsCheckable = sub.checked !== undefined;
              return (
                <button
                  key={idx}
                  role={subIsCheckable ? 'menuitemcheckbox' : 'menuitem'}
                  aria-label={sub.label}
                  aria-checked={subIsCheckable ? sub.checked : undefined}
                  onKeyDown={(e) => {
                    const subContainer = e.currentTarget.closest('[role="menu"]');
                    if (!subContainer) return;
                    const subItems = Array.from(subContainer.querySelectorAll<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]'));
                    const idx2 = subItems.indexOf(e.currentTarget);
                    switch (e.key) {
                      case 'ArrowDown': {
                        e.preventDefault();
                        const next = subItems[(idx2 + 1) % subItems.length];
                        next?.focus();
                        break;
                      }
                      case 'ArrowUp': {
                        e.preventDefault();
                        const prev = subItems[(idx2 - 1 + subItems.length) % subItems.length];
                        prev?.focus();
                        break;
                      }
                      case 'Escape':
                      case 'ArrowLeft': {
                        e.preventDefault();
                        setShowSubmenu(false);
                        // Focus the menu item that opened this submenu
                        const parentMenuWrapper = e.currentTarget.closest('.relative');
                        parentMenuWrapper?.querySelector<HTMLButtonElement>('button[role="menuitem"]')?.focus();
                        break;
                      }
                      case 'Home': {
                        e.preventDefault();
                        subItems[0]?.focus();
                        break;
                      }
                      case 'End': {
                        e.preventDefault();
                        subItems[subItems.length - 1]?.focus();
                        break;
                      }
                      default:
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          sub.onClick();
                          closeMenu();
                        }
                    }
                  }}
                  onClick={() => {
                    sub.onClick();
                    closeMenu();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all hover:bg-primary hover:text-black group"
                >
                  <div className="flex items-center gap-2">
                    {subIsCheckable && (
                      <div className="w-3 h-3 flex items-center justify-center shrink-0 border border-outline/30 rounded-xs bg-black/40 group-hover:border-black/50">
                        {sub.checked && <Check className="w-2 h-2 text-primary group-hover:text-black" />}
                      </div>
                    )}
                    {sub.icon && <sub.icon className="w-3 h-3" />}
                    <span>{sub.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.shortcut && (
                      <span className="text-[7px] text-white/25 font-mono tracking-normal normal-case ml-4">{sub.shortcut}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
