'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Info } from 'lucide-react';
import { HELP_DATA } from './helpData';
import { HelpSectionItem } from '../help/HelpSectionItem';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSectionId?: string | undefined;
}

export default function HelpModal({ isOpen, onClose, initialSectionId }: HelpModalProps) {
  const [activeCategory, setActiveCategory] = useState<'user' | 'developer'>('user');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      return;
    }

    if (isOpen && !hasInitialized.current) {
      if (initialSectionId) {
        const section = HELP_DATA.find(s => 
          s.id === initialSectionId || s.subsections?.some(sub => sub.id === initialSectionId)
        );
        if (section) {
          setTimeout(() => {
            setActiveCategory(section.category);
            setExpandedSection(section.id);
            const element = document.getElementById(`help-anchor-${initialSectionId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 0);
        }
      } else {
        setTimeout(() => {
          setExpandedSection(activeCategory === 'user' ? 'introduccion' : 'sdk_core');
        }, 0);
      }
      hasInitialized.current = true;
    }
  }, [isOpen, initialSectionId, activeCategory]);

  if (!isOpen) return null;

  const filteredData = HELP_DATA.filter(s => s.category === activeCategory);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-12">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />

        <motion.div 
          initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }}
          className="relative w-full max-w-4xl h-[85vh] bg-[#080808] border border-white/10 rounded-sm shadow-2xl flex flex-col overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex-none p-6 border-b border-white/10 bg-black/60 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Ingeniería OMEGA v7.2.3</h2>
                <p className="text-[8px] font-mono text-primary/60 uppercase tracking-widest mt-1">Unified Documentation System</p>
              </div>

              <div className="flex bg-white/5 p-1 rounded-xs border border-white/5 ml-4">
                 <button 
                   onClick={() => { setActiveCategory('user'); setExpandedSection('introduccion'); }}
                   className={`px-6 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'user' ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
                 >
                   Manual Usuario
                 </button>
                 <button 
                   onClick={() => { setActiveCategory('developer'); setExpandedSection('sdk_core'); }}
                   className={`px-6 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'developer' ? 'bg-accent text-black' : 'text-white/40 hover:text-white'}`}
                 >
                   Guía SDK (Dev)
                 </button>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
              <X className="w-5 h-5 text-white/20 group-hover:text-white" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
            {filteredData.map((section) => (
              <HelpSectionItem 
                key={section.id}
                section={section}
                isExpanded={expandedSection === section.id}
                onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              />
            ))}
          </div>

          {/* FOOTER */}
          <div className="flex-none p-5 bg-black border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3 text-primary/40">
              <Cpu className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Protocol: SECURE // ERA 4 Compliance</span>
            </div>
            <div className="flex items-center gap-4 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 text-white/40">
               <Info className="w-3 h-3 text-primary" />
               <span className="text-[9px] font-black uppercase tracking-widest">v7.2.3 Production</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
