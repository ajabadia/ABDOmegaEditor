'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Info, Globe, Zap, X } from 'lucide-react';
import IndustrialStatusSection from '../hub/IndustrialStatusSection';
import type { OMEGA_Metric } from '@/types/manifest';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: OMEGA_Metric[];
  sysReady: boolean;
  onDeploy: () => void;
}

export default function AboutModal({ isOpen, onClose, metrics, sysReady, onDeploy }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-[#0a0a0b] border border-outline shadow-2xl rounded-sm overflow-hidden"
      >
        {/* HEADER */}
        <div className="p-6 border-b wb-outline flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-primary/20 border border-primary/40 rounded-xs flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
             </div>
             <div>
                <h2 className="text-xs font-black uppercase tracking-widest wb-text">OMEGA Engineering Suite</h2>
                <p className="text-[8px] wb-text-muted font-bold uppercase opacity-60 italic">Industrial Governance ERA 7.2.3</p>
             </div>
          </div>
          <button onClick={onClose} className="wb-text-muted hover:wb-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* EDITOR DATA */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-3 bg-black/40 border wb-outline rounded-xs space-y-2">
                <div className="flex items-center gap-2">
                   <Info className="w-3 h-3 text-primary/60" />
                   <span className="text-[7px] font-black uppercase wb-text-muted">Editor Version</span>
                </div>
                <p className="text-[10px] font-mono font-black wb-text">v8.1.0-STABLE</p>
             </div>
             <div className="p-3 bg-black/40 border wb-outline rounded-xs space-y-2">
                <div className="flex items-center gap-2">
                   <Globe className="w-3 h-3 text-primary/60" />
                   <span className="text-[7px] font-black uppercase wb-text-muted">Environment</span>
                </div>
                <p className="text-[10px] font-mono font-black wb-text text-primary">PRODUCTION_TIER_1</p>
             </div>
          </div>

          {/* THE "GRÁFICO" (INDUSTRIAL STATUS) */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-accent" />
                <span className="text-[7px] font-black uppercase wb-text-muted">System Preparation Matrix</span>
             </div>
             <IndustrialStatusSection 
               metrics={metrics}
               sysReady={sysReady}
               onDeploy={onDeploy}
             />
          </div>

          <div className="pt-4 border-t wb-outline">
             <p className="text-[7px] wb-text-muted text-center leading-relaxed uppercase font-bold tracking-tight opacity-40">
                Authorized for industrial deployment under OMEGA Unified Workbench protocols. 
                ABD-IA Instruments & Synths. All rights reserved 2026.
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
