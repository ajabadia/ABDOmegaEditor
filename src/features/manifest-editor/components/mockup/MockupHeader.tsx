import React from 'react';
import { Camera, X } from 'lucide-react';

interface MockupHeaderProps {
  name: string;
  activeTab: string;
  onClose: () => void;
}

export const MockupHeader = ({ name, activeTab, onClose }: MockupHeaderProps) => (
  <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-black/60 z-10">
    <div className="flex items-center gap-3">
      <Camera className="w-4 h-4 text-primary" />
      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Industrial Render Engine v7.2.3</span>
      <div className="h-4 w-px bg-white/10 mx-2" />
      <span className="text-[10px] font-mono text-primary/80">{name.toUpperCase()} — {activeTab} PLANE</span>
    </div>
    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
      <X className="w-4 h-4 text-foreground/40" />
    </button>
  </div>
);
