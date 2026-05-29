'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SectionAccordionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

export default function SectionAccordion({ title, icon, children, defaultOpen = true, badge }: SectionAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-outline/10 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className={`transition-colors duration-300 ${isOpen ? 'text-primary' : 'text-foreground/40'}`}>
            {icon}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isOpen ? 'text-foreground' : 'text-foreground/40'}`}>
            {title}
          </span>
          {badge && (
            <span className="bg-primary/10 text-primary text-[7px] px-1.5 py-0.5 rounded-full font-bold">
              {badge}
            </span>
          )}
        </div>
        <div className="text-foreground/20 group-hover:text-foreground/60 transition-colors">
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-6 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
