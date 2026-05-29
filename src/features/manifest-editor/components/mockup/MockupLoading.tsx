import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export const MockupLoading = () => (
  <div className="flex flex-col items-center gap-4">
    <div className="relative">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent animate-pulse" />
    </div>
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">High-Fidelity Capturing</span>
      <span className="text-[6px] font-mono text-white/20 uppercase tracking-widest animate-pulse">Scanning Layout Integrity...</span>
    </div>
  </div>
);
