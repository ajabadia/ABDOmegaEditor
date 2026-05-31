'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Palette, Sun, Box, Save, ShieldCheck, Type } from 'lucide-react';
import type { OMEGA_Manifest, StyleVariant } from '@/types/manifest';

// Re-using the specialized governance components
import ThemePaletteGovernance from '../inspector/aesthetic/governance/ThemePaletteGovernance';
import AtmosphericPhysicsGovernance from '../inspector/aesthetic/governance/AtmosphericPhysicsGovernance';
import MasterHardwareGovernance from '../inspector/aesthetic/governance/RackChassisGovernance';
import ModuleTypography from '../inspector/aesthetic/typography/ModuleTypography';

interface GlobalGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
}

type ConfigTab = 'palette' | 'typography' | 'physics' | 'hardware';

export default function GlobalGovernanceModal({ 
  isOpen, onClose, manifest, onUpdate, resolveAsset 
}: GlobalGovernanceModalProps) {
  const [activeTab, setActiveTab] = React.useState<ConfigTab>('palette');


  React.useEffect(() => {
    if (isOpen) {
      // Library logic moved to specialized components
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tabs: { id: ConfigTab; label: string; icon: any; color: string }[] = [
    { id: 'palette', label: 'Color Palette', icon: Palette, color: 'text-primary/80' },
    { id: 'typography', label: 'Global Typography', icon: Type, color: 'text-amber-400' },
    { id: 'physics', label: 'Atmospheric Physics', icon: Sun, color: 'text-accent' },
    { id: 'hardware', label: 'Master Hardware', icon: Box, color: 'text-purple-400' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 overflow-hidden">
        {/* BACKDROP */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* MODAL CONTAINER */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline rounded-xs flex flex-col shadow-2xl overflow-hidden"
        >
          {/* HEADER */}
          <div className="p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center">
                   <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                   <h2 className="text-base md:text-lg font-black uppercase tracking-widest wb-text">Module Global Governance</h2>
                   <p className="text-[8px] md:text-[9px] wb-text-muted font-bold uppercase tracking-widest mt-1 opacity-70">Master configuration for chromatic DNA, physics and structural hardware.</p>
                </div>
             </div>
             <button 
               onClick={onClose}
               className="p-1.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-red-500/10 hover:border-red-500/30 transition-all"
             >
               <X className="w-4 h-4" />
             </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
             {/* SIDEBAR NAVIGATION */}
             <div className="w-64 border-r wb-outline wb-surface-subtle p-4 space-y-1.5 shrink-0">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xs border transition-all duration-200 group ${
                      activeTab === tab.id 
                        ? 'bg-primary/10 border-primary/30 text-primary font-black shadow-none' 
                        : 'border-transparent wb-text-muted hover:wb-text hover:bg-primary/5'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : 'opacity-40'}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}

                <div className="pt-12 px-2">
                   <div className="p-4 wb-surface border wb-outline rounded-xs space-y-2">
                      <div className="flex items-center gap-2 text-primary">
                         <ShieldCheck className="w-3 h-3" />
                         <span className="text-[7px] font-black uppercase">System Integrity</span>
                      </div>
                      <p className="text-[8px] wb-text-muted leading-relaxed uppercase font-bold tracking-tight opacity-75">
                         Aesthetic changes propagate instantly across all architectural planes.
                      </p>
                   </div>
                </div>
             </div>

             {/* CONTENT AREA */}
             <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-transparent">
                <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                   
                   {activeTab === 'palette' && (
                     <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                           <Palette className="w-5 h-5 text-primary" />
                           <h3 className="text-xs font-black uppercase tracking-[0.2em] wb-text">Chromatic DNA</h3>
                        </div>
                        <ThemePaletteGovernance manifest={manifest} onUpdate={onUpdate} />
                     </div>
                   )}

                   {activeTab === 'typography' && (
                       <div className="space-y-6">
                          <div className="flex items-center gap-3 mb-4">
                             <Type className="w-5 h-5 text-amber-400" />
                             <h3 className="text-xs font-black uppercase tracking-[0.2em] wb-text">Global Typography</h3>
                          </div>
                          <ModuleTypography manifest={manifest} onUpdate={onUpdate} />
                       </div>
                   )}

                   {activeTab === 'physics' && (
                     <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                           <Sun className="w-5 h-5 text-accent" />
                           <h3 className="text-xs font-black uppercase tracking-[0.2em] wb-text">Atmospheric Physics</h3>
                        </div>
                        <AtmosphericPhysicsGovernance manifest={manifest} onUpdate={onUpdate} resolveAsset={resolveAsset} />
                     </div>
                   )}

                   {activeTab === 'hardware' && (
                       <div className="space-y-8">
                          <div className="flex items-center gap-3 mb-4">
                             <Box className="w-5 h-5 text-purple-400" />
                             <h3 className="text-xs font-black uppercase tracking-[0.2em] wb-text">Master Structural Hardware</h3>
                          </div>

                          {/* 1. MASTER FACEPLATE SKIN (FROM LIBRARY) */}
                          <div className="p-6 wb-surface-subtle border wb-outline rounded-xs space-y-4">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-purple-400" />
                                   <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Master Faceplate / Global Skin</span>
                                </div>
                                <span className="text-[7px] font-mono wb-text-muted">Target: MAIN PLANE</span>
                             </div>
                             
                             <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                   <span className="text-[7px] font-black uppercase text-primary tracking-widest">Defined Faceplate Styles (Library)</span>
                                   <span className="text-[6px] wb-text-muted font-bold uppercase italic">Select a variant to apply globally</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                   {((manifest.ui.styles as Record<string, StyleVariant[]>)?.rack || []).map((style: StyleVariant) => {
                                     const tabStyles = (manifest.ui.layout?.tabStyles || {}) as Record<string, string | undefined>;
                                     const isActive = tabStyles.MAIN === style.id;
                                     const bgAsset = style.aesthetics?.asset;
                                     const bgColor = style.aesthetics?.color || '#1a1a1b';
                                     const bgUrl = resolveAsset(bgAsset);

                                     return (
                                       <button 
                                         key={style.id}
                                         onClick={() => {
                                           const newTabStyles = { ...tabStyles, MAIN: style.id };
                                           onUpdate({ 
                                             ui: { 
                                               ...manifest.ui, 
                                               layout: { 
                                                 ...manifest.ui.layout, 
                                                 width: manifest.ui.layout?.width || 800,
                                                 height: manifest.ui.layout?.height || 600,
                                                 tabStyles: newTabStyles 
                                               } 
                                             }
                                           });
                                         }}
                                         className={`
                                           p-2 border rounded-xs flex flex-col gap-2 items-center transition-all group
                                           ${isActive ? 'bg-primary/15 border-primary text-primary shadow-none' : 'wb-surface border wb-outline hover:border-primary/40'}
                                         `}
                                       >
                                         <div className="w-full h-20 rounded-xs overflow-hidden border wb-outline relative bg-black/10">
                                           <div 
                                             className="absolute inset-0 transition-transform group-hover:scale-110"
                                             style={{
                                               backgroundColor: bgColor,
                                               backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
                                               backgroundSize: 'cover',
                                               backgroundPosition: 'center'
                                             }}
                                           />
                                           {isActive && (
                                             <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_rgba(0,242,255,1)]" />
                                           )}
                                         </div>
                                         <span className={`text-[7px] font-black uppercase truncate w-full text-center ${isActive ? 'text-primary' : 'wb-text-muted'}`}>
                                           {style.label}
                                         </span>
                                       </button>
                                     );
                                   })}

                                   {/* FALLBACK: NO STYLES */}
                                   {(!(manifest.ui.styles as Record<string, StyleVariant[]>)?.rack || (manifest.ui.styles as Record<string, StyleVariant[]>).rack.length === 0) && (
                                     <div className="col-span-3 p-8 border border-dashed wb-outline flex flex-col items-center justify-center gap-2 opacity-40">
                                       <Box className="w-6 h-6" />
                                       <span className="text-[8px] font-black uppercase">No Faceplate Styles Defined</span>
                                     </div>
                                   )}
                                </div>
                             </div>
                          </div>

                          <div className="h-px wb-outline mx-2" />

                          {/* 2. MECHANICAL COMPONENTS */}
                          <MasterHardwareGovernance manifest={manifest} onUpdate={onUpdate} resolveAsset={resolveAsset} />
                       </div>
                   )}
                </div>
             </div>
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t wb-outline wb-surface-subtle flex justify-end items-center gap-3 shrink-0">
             <button 
               onClick={onClose}
               className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-white/5 text-[9px] font-black uppercase tracking-widest transition-all duration-200"
             >
               Close Configuration
             </button>
             <button 
               onClick={onClose}
               className="px-8 py-2.5 rounded-xs bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_var(--wb-bloom)]"
             >
               <Save className="w-3.5 h-3.5" />
               Apply Changes
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
