'use client';
 
import React from 'react';
import { Layers, Box, Settings, ExternalLink, ShieldCheck } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import ModuleStyleLibrary from '../aesthetic/styles/ModuleStyleLibrary';
 
interface CustomSkinSectionProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  activeRackTab: string;
  onOpenConfig?: (() => void) | undefined;
}
 
type CustomSubTab = 'globals' | 'elements';
 
export default function CustomSkinSection({ manifest, onUpdate, resolveAsset, activeRackTab, onOpenConfig }: CustomSkinSectionProps) {
  const [activeTab, setActiveTab] = React.useState<CustomSubTab>('elements');
 
  const tabs: { id: CustomSubTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'globals', label: 'Globals', icon: Box, color: 'text-accent' },
    { id: 'elements', label: 'Elements Library', icon: Layers, color: 'text-purple-400' },
  ];
 
  const palette = (manifest.ui?.palette || {}) as Record<string, string | undefined>;
  const typography = manifest.ui?.typography || {};
 
  return (
    <div className="space-y-6">
      {/* SUB-NAVIGATION */}
      <div className="flex border-b wb-outline bg-black/20 rounded-t-xs overflow-hidden">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 transition-all duration-300 relative group ${
              activeTab === tab.id 
                ? 'bg-primary/10 text-foreground' 
                : 'text-foreground/40 hover:bg-white/5 hover:text-foreground/60'
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : 'opacity-40'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
            
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
            )}
          </button>
        ))}
      </div>
 
      {/* CONTENT AREA */}
      <div className="animate-in fade-in slide-in-from-right-2 duration-300">
        {activeTab === 'globals' && (
          <div className="space-y-6">
             {/* 1. GOVERNANCE CTA */}
             <div className="p-5 bg-accent/5 border border-accent/20 rounded-xs space-y-4 shadow-[inset_0_0_20px_rgba(0,240,255,0.02)]">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                      <Settings className="w-5 h-5 text-accent" />
                   </div>
                   <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-accent">Governance Center</h3>
                      <p className="text-[7px] wb-text-muted font-bold uppercase tracking-tighter italic leading-none">Global Architecture & DNA</p>
                   </div>
                </div>
                
                <p className="text-[8px] wb-text-muted leading-relaxed uppercase font-bold">
                   Centralized governance for module-wide foundations. Switch to the command center to modify the core identity.
                </p>
 
                <button 
                  onClick={onOpenConfig}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-black text-[9px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] group"
                >
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  Enter Command Center
                </button>
             </div>
 
             {/* 2. READ-ONLY ARCHITECTURAL SUMMARY */}
             <div className="space-y-3 px-1">
                <div className="flex items-center gap-2 mb-2">
                   <ShieldCheck className="w-3 h-3 text-primary" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">Module State Summary</span>
                </div>
 
                {/* Palette Summary */}
                <div className="p-3 bg-black/20 border wb-outline rounded-xs flex items-center justify-between">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] font-black uppercase wb-text-muted">Chromatic DNA</span>
                      <span className="text-[9px] font-black uppercase text-foreground">Active Palette</span>
                   </div>
                    <div className="flex gap-1">
                       {[
                        palette.primary, 
                        palette.secondary, 
                        palette.chassis, 
                        palette.utility
                       ].map((c, i) => (
                         <div key={i} className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c || '#000' }} />
                       ))}
                    </div>
                </div>
 
                {/* Typography Summary */}
                <div className="p-3 bg-black/20 border wb-outline rounded-xs flex items-center justify-between">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] font-black uppercase wb-text-muted">Text Identity</span>
                      <span className="text-[9px] font-black uppercase text-foreground">Global Typography</span>
                   </div>
                   <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter italic">
                        {typography.defaultFont || 'Inter'}
                      </span>
                      <span className="text-[6px] wb-text-muted uppercase font-bold tracking-widest">Master Family</span>
                   </div>
                </div>
 
                {/* Physics Summary */}
                <div className="p-3 bg-black/20 border wb-outline rounded-xs flex items-center justify-between">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] font-black uppercase wb-text-muted">Environment</span>
                      <span className="text-[9px] font-black uppercase text-foreground">Atmospheric Physics</span>
                   </div>
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[6px] font-black uppercase text-primary">Simulated</span>
                   </div>
                </div>
 
                {/* Hardware Summary */}
                <div className="p-3 bg-black/20 border wb-outline rounded-xs flex items-center justify-between">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] font-black uppercase wb-text-muted">Structure</span>
                      <span className="text-[9px] font-black uppercase text-foreground">Master Hardware</span>
                   </div>
                   <span className="text-[7px] font-mono wb-text-muted uppercase">Era 7.2.3 Standard</span>
                </div>
             </div>
          </div>
        )}
 
        {activeTab === 'elements' && (
          <ModuleStyleLibrary 
            manifest={manifest} 
            onUpdate={onUpdate} 
            resolveAsset={resolveAsset}
            activeTab={activeRackTab}
            onOpenConfig={onOpenConfig}
          />
        )}
      </div>
 
      {/* FOOTER GOVERNANCE INFO */}
      <div className="p-4 border border-dashed wb-outline rounded-xs bg-black/20">
         <p className="text-[7px] wb-text-muted font-bold uppercase tracking-tighter leading-tight italic">
            Industrial Warning: You are editing the module&apos;s custom design DNA. 
            These settings override OMEGA standard themes and define the atomic physics of your instrument.
         </p>
      </div>
    </div>
  );
}
