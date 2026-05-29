'use client';

import React from 'react';
import { Layers, Cpu, FileCode, History } from 'lucide-react';

interface ViewModeSelectorProps {
  viewMode: 'orbital' | 'rack' | 'source' | 'history';
  setViewMode: (mode: 'orbital' | 'rack' | 'source' | 'history') => void;
}

export default function ViewModeSelector({ viewMode, setViewMode }: ViewModeSelectorProps) {
  return (
    <div className="flex wb-surface border wb-outline rounded-sm p-1 transition-colors duration-500">
      <button 
        onClick={() => setViewMode('orbital')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xs text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'orbital' ? 'bg-primary text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'wb-text-muted hover:wb-text'}`}
        title="Orbital View"
      >
        <Layers className="w-3 h-3" />
        <span className="hidden lg:inline">Orbital</span>
      </button>
      <button 
        onClick={() => setViewMode('rack')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xs text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'rack' ? 'bg-accent text-black shadow-[0_0_15px_rgba(255,140,0,0.3)]' : 'wb-text-muted hover:wb-text'}`}
        title="Virtual Rack"
      >
        <Cpu className="w-3 h-3" />
        <span className="hidden lg:inline">Rack</span>
      </button>
      <button 
        onClick={() => setViewMode('source')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xs text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'source' ? 'bg-foreground text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'wb-text-muted hover:wb-text'}`}
        title="Source View"
      >
        <FileCode className="w-3 h-3" />
        <span className="hidden lg:inline">Source</span>
      </button>
      <button 
        onClick={() => setViewMode('history')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xs text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'history' ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'wb-text-muted hover:wb-text'}`}
        title="Timeline / History"
      >
        <History className="w-3 h-3" />
        <span className="hidden lg:inline">History</span>
      </button>
    </div>
  );
}
