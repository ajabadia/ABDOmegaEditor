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
          className="relative w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline rounded-xs shadow-2xl flex flex-col overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex-none p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle">
            <div className="flex flex-col">
              <h2 className="text-base font-black uppercase tracking-widest wb-text">Ingeniería OMEGA v7.2.3</h2>
              <p className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest mt-1 opacity-70">Unified Documentation System</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-red-500/10 hover:border-red-500/30 transition-all">
              <X className="w-4 h-4" />
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
          <div className="flex-none p-5 border-t wb-outline flex items-center justify-between wb-surface-subtle">
            <div className="flex bg-black/20 p-1 rounded-xs border wb-outline">
               <button 
                 onClick={() => { setActiveCategory('user'); setExpandedSection('introduccion'); }}
                 className={`px-6 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'user' ? 'bg-primary/20 border border-primary/40 text-primary' : 'wb-text-muted hover:wb-text'}`}
               >
                 Manual Usuario
               </button>
               <button 
                 onClick={() => { setActiveCategory('developer'); setExpandedSection('sdk_core'); }}
                 className={`px-6 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'developer' ? 'bg-accent/20 border border-accent/40 text-accent' : 'wb-text-muted hover:wb-text'}`}
               >
                 Guía SDK (Dev)
               </button>
            </div>
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-white/5 text-[9px] font-black uppercase tracking-widest transition-all duration-200"
            >
              Dismiss View
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
