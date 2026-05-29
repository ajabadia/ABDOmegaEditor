'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TieredSectionProps {
  title: string;
  level: 'essential' | 'advanced' | 'diagnostics';
  icon?: LucideIcon;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function TieredSection({
  title,
  level,
  icon: Icon,
  badge,
  defaultOpen = false,
  children
}: TieredSectionProps) {
  const [isOpen, setIsOpen] = useState(level === 'essential' ? true : defaultOpen);

  const levelStyles = {
    essential: 'border-l-2 border-primary bg-primary/5',
    advanced: 'border-l-2 border-outline/20 bg-black/10',
    diagnostics: 'border-l-2 border-amber-500/20 bg-amber-500/5'
  };

  const textStyles = {
    essential: 'text-primary',
    advanced: 'wb-text-muted',
    diagnostics: 'text-amber-500/70'
  };

  return (
    <div className={`mb-1 transition-all duration-300 ${isOpen ? 'pb-4' : 'pb-0'}`}>
      {/* HEADER */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between p-2.5 cursor-pointer group select-none hover:bg-white/5 rounded-t-xs border-b border-white/5 ${levelStyles[level]}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown className="w-3 h-3 opacity-40" />
          </div>
          {Icon && <Icon className={`w-3.5 h-3.5 ${isOpen ? textStyles[level] : 'opacity-40'}`} />}
          <div className="flex flex-col">
            <span className={`text-[8px] font-black uppercase tracking-widest ${isOpen ? 'text-white' : 'wb-text-muted'}`}>
              {title}
            </span>
            {level !== 'essential' && !isOpen && (
              <span className="text-[6px] font-mono opacity-30 lowercase tracking-normal">
                Click to expand {level} settings
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[6px] font-black px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 opacity-40 uppercase">
              {badge}
            </span>
          )}
          {level === 'diagnostics' && (
             <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse" />
          )}
        </div>
      </div>

      {/* CONTENT */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden bg-black/20"
          >
            <div className="p-3 space-y-3 border-x border-b border-white/5 rounded-b-xs">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
