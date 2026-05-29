'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, FileCode, Package, Layers, Camera, Zap } from 'lucide-react';

interface DeploymentMenuProps {
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onExportManifest: () => void;
  onExportPack: () => void;
  onExportCAD: () => void;
  onExportContract: (format: 'ts' | 'cpp') => void;
  onGenerateMockup: () => void;
  onDeploy: () => void;
}

export default function DeploymentMenu({
  showMenu, setShowMenu, menuRef,
  onExportManifest, onExportPack, onExportCAD, 
  onExportContract, onGenerateMockup, onDeploy
}: DeploymentMenuProps) {
  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-6 py-2 bg-primary text-black rounded-xs hover:scale-105 transition-transform text-[8px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.2)]"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Production</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-56 bg-black/90 border border-outline backdrop-blur-xl rounded-sm p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
          >
            <div className="p-2 mb-1 border-b border-outline/20">
              <p className="text-[7px] font-mono text-foreground/30 uppercase tracking-widest">Select Deployment Mode</p>
            </div>
            
            <ExportOption onClick={onExportManifest} icon={FileCode} label="Export Manifest" sub="Raw .acemm format" color="primary" setShowMenu={setShowMenu} />
            <ExportOption onClick={onExportPack} icon={Package} label="Export OmegaPack" sub="Bundled industrial ZIP" color="accent" setShowMenu={setShowMenu} />
            <ExportOption onClick={onExportCAD} icon={Layers} label="Industrial CAD Blueprint" sub="Technical SVG Plan" color="primary" setShowMenu={setShowMenu} />
            <ExportOption onClick={() => onExportContract('ts')} icon={FileCode} label="Export Tech Contract (TS)" sub="Registry Schema Enums" color="primary" setShowMenu={setShowMenu} />
            <ExportOption onClick={() => onExportContract('cpp')} icon={FileCode} label="Export Engine Header (C++)" sub="Omega Registry Header" color="primary" setShowMenu={setShowMenu} />
            <ExportOption onClick={onGenerateMockup} icon={Camera} label="Generate Studio Render" sub="Photorealistic 3D Mockup" color="primary" setShowMenu={setShowMenu} />

            <div className="h-px bg-outline/20 my-1.5" />

            <button 
              onClick={() => { onDeploy(); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-accent/10 hover:bg-accent/20 rounded-xs text-[8px] font-black uppercase tracking-widest text-accent transition-all group"
            >
              <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p>Deploy to Engine</p>
                <p className="text-[6px] font-mono opacity-60 italic text-accent/80">Live Engine Injection</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ExportOptionProps {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  sub: string;
  color: 'primary' | 'accent';
  setShowMenu: (v: boolean) => void;
}

function ExportOption({ onClick, icon: Icon, label, sub, color, setShowMenu }: ExportOptionProps) {
  const colorClass = color === 'primary' ? 'text-primary/40 group-hover:text-primary' : 'text-accent/40 group-hover:text-accent';
  const hoverTextClass = color === 'primary' ? 'hover:text-primary' : 'hover:text-accent';

  return (
    <button 
      onClick={() => { onClick(); setShowMenu(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xs text-[8px] font-black uppercase tracking-widest text-foreground/60 ${hoverTextClass} transition-all group`}
    >
      <Icon className={`w-4 h-4 ${colorClass}`} />
      <div className="text-left">
        <p>{label}</p>
        <p className="text-[6px] font-mono opacity-40">{sub}</p>
      </div>
    </button>
  );
}
