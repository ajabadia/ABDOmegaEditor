'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { OmegaNode } from '@/types/manifest';

import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';

interface CellPreviewProps {
  item: OmegaNode;
  skin?: string;
  resolveAsset?: (id: string | undefined) => string | undefined;
}

export default function CellPreview({ item, skin = 'industrial', resolveAsset }: CellPreviewProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="relative group">
      {/* COLLAPSE TOGGLE */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-2 right-2 z-50 p-1.5 rounded-xs bg-black/40 hover:bg-black/60 border wb-outline text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        title={isCollapsed ? "Expand Preview" : "Collapse Preview"}
      >
        {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 100, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full bg-[#030303] border-b wb-outline flex flex-col items-center justify-center relative overflow-hidden group/canvas"
          >
            {/* SCANLINE EFFECT */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-10 bg-[length:100%_2px,3px_100%]" />
            
            {/* RENDERER BRIDGE — COMPACT SCALE */}
            <div className="relative scale-[1.2] flex items-center justify-center transition-transform duration-500 group-hover/canvas:scale-[1.3]">
               <div 
                  dangerouslySetInnerHTML={{ 
                    __html: CellRenderer.renderCellHTML(item, {
                      skin,
                      zoom: 0.8,
                      runtimeValue: 0.5,
                      steps: 100,
                      isSelected: false,
                      isLiveMode: false,
                      resolveAsset
                    }) 
                  }}
               />
            </div>

            {/* MINIMAL RULER */}
            <div className="absolute bottom-1 right-2 opacity-30">
               <span className="text-[5px] font-black uppercase tracking-[0.2em] text-primary/60">PRVW:LOD</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isCollapsed && (
        <div 
          onClick={() => setIsCollapsed(false)}
          className="w-full h-4 bg-black/20 border-b wb-outline flex items-center justify-center cursor-pointer hover:bg-black/40 transition-all"
        >
          <span className="text-[5px] font-black uppercase tracking-[0.2em] text-white/10">Expand Preview</span>
        </div>
      )}
    </div>
  );
}
