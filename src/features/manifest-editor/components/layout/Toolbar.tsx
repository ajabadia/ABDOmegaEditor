'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MousePointer2, Plus, Cpu, Sparkles, 
  Shield, Settings, Zap, Sliders, Radio
} from 'lucide-react';

interface ToolbarProps {
  isLiveMode: boolean;
  onToggleLive: () => void;
  onOpenGallery: () => void;
  onOpenAudit: () => void;
  onOpenConfig: () => void;
  onOpenCellStudio: () => void;
  onAddEntity: (type: 'control' | 'jack') => void;
}

export default function Toolbar({
  isLiveMode,
  onToggleLive,
  onOpenGallery,
  onOpenAudit,
  onOpenConfig,
  onOpenCellStudio,
  onAddEntity
}: ToolbarProps) {
  const [activeTool, setActiveTool] = useState<'select' | 'add' | 'studio' | null>('select');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleSelectTool = (tool: 'select' | 'add' | 'studio') => {
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

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragTransition={{ power: 0 }}
        className="absolute left-3 top-20 z-50 w-11 bg-black/80 backdrop-blur-md border wb-outline rounded-xs flex flex-col items-center py-2.5 gap-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Drag handle dots */}
        <div className="w-5 h-2 flex flex-col gap-0.5 justify-center items-center opacity-30 cursor-move mb-1 shrink-0">
          <div className="w-full h-[1px] bg-white" />
          <div className="w-full h-[1px] bg-white" />
          <div className="w-full h-[1px] bg-white" />
        </div>

        {/* 1. SELECT TOOL */}
        <button
          onClick={() => handleSelectTool('select')}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            activeTool === 'select' 
              ? 'bg-primary text-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]' 
              : 'text-foreground/60 hover:text-foreground hover:bg-white/5'
          }`}
          title="Select & Move Tool (V)"
        >
          <MousePointer2 className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* 2. ADD COMPONENT TOOL */}
        <div className="relative">
          <button
            onClick={() => handleSelectTool('add')}
            className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
              activeTool === 'add' 
                ? 'bg-primary text-black' 
                : 'text-foreground/60 hover:text-foreground hover:bg-white/5'
            }`}
            title="Add Primitives (A)"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Plus flyout menu */}
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute left-12 top-0 w-36 bg-[#0a0a0b]/95 backdrop-blur-md border wb-outline shadow-2xl p-1.5 rounded-xs flex flex-col gap-1 z-50 cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[6px] font-black uppercase text-white/40 px-1.5 pb-1 border-b border-white/5">Inject Primitive</div>
                
                <button
                  onClick={() => {
                    onAddEntity('control');
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary hover:text-black transition-colors"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Param Control</span>
                </button>

                <button
                  onClick={() => {
                    onAddEntity('jack');
                    setShowAddMenu(false);
                    setActiveTool('select');
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-[8px] font-bold uppercase text-left hover:bg-primary hover:text-black transition-colors"
                >
                  <Radio className="w-3 h-3" />
                  <span>Signal Port</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. CELL STUDIO */}
        <button
          onClick={() => handleSelectTool('studio')}
          className="w-7 h-7 rounded-xs flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          title="Universal Cell Laboratory (Studio)"
        >
          <Cpu className="w-3.5 h-3.5" />
        </button>

        <div className="w-6 h-[1px] bg-outline/20 my-1 shrink-0" />

        {/* 4. BLUEPRINTS */}
        <button
          onClick={onOpenGallery}
          className="w-7 h-7 rounded-xs flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          title="Blueprints & Templates (B)"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        {/* 5. AUDIT REPORT */}
        <button
          onClick={onOpenAudit}
          className="w-7 h-7 rounded-xs flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          title="Compliance Auditor"
        >
          <Shield className="w-3.5 h-3.5" />
        </button>

        {/* 6. GLOBAL CONFIGURATION */}
        <button
          onClick={onOpenConfig}
          className="w-7 h-7 rounded-xs flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          title="Module Signature & Governance"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <div className="w-6 h-[1px] bg-outline/20 my-1 shrink-0" />

        {/* 7. LIVE CONFIGURE HIL */}
        <button
          onClick={onToggleLive}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            isLiveMode 
              ? 'bg-accent text-black shadow-[0_0_12px_rgba(255,140,0,0.4)] animate-pulse' 
              : 'text-foreground/60 hover:text-foreground hover:bg-white/5'
          }`}
          title={isLiveMode ? "HIL Engine: Live (Click to disconnect)" : "HIL Engine: Connect to WASM"}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
        </button>
      </motion.div>
    </>
  );
}
