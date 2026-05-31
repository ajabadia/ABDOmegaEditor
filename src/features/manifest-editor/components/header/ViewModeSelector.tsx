'use client';

import React from 'react';
import { Layers, Cpu, FileCode, History } from 'lucide-react';

interface ViewModeSelectorProps {
  viewMode: 'orbital' | 'rack' | 'source' | 'history';
  setViewMode: (mode: 'orbital' | 'rack' | 'source' | 'history') => void;
}

export default function ViewModeSelector({ viewMode, setViewMode }: ViewModeSelectorProps) {
  return (
    <div className="flex wb-surface border wb-outline rounded-xs p-0.5 transition-colors duration-500">
      <button 
        onClick={() => setViewMode('orbital')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[8px] font-black uppercase tracking-wider transition-all ${viewMode === 'orbital' ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
        title="Orbital View"
      >
        <Layers className="w-3 h-3" />
        <span className="hidden lg:inline">Orbital</span>
      </button>
      <button 
        onClick={() => setViewMode('rack')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[8px] font-black uppercase tracking-wider transition-all ${viewMode === 'rack' ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
        title="Virtual Rack"
      >
        <Cpu className="w-3 h-3" />
        <span className="hidden lg:inline">Rack</span>
      </button>
      <button 
        onClick={() => setViewMode('source')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[8px] font-black uppercase tracking-wider transition-all ${viewMode === 'source' ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
        title="Source View"
      >
        <FileCode className="w-3 h-3" />
        <span className="hidden lg:inline">Source</span>
      </button>
      <button 
        onClick={() => setViewMode('history')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[8px] font-black uppercase tracking-wider transition-all ${viewMode === 'history' ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
        title="Timeline / History"
      >
        <History className="w-3 h-3" />
        <span className="hidden lg:inline">History</span>
      </button>
    </div>
  );
}
