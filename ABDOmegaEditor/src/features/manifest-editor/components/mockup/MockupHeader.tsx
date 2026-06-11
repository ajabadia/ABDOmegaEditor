import { Camera, X } from 'lucide-react';

interface MockupHeaderProps {
  name: string;
  activeTab: string;
  onClose: () => void;
}

export const MockupHeader = ({ name, activeTab, onClose }: MockupHeaderProps) => (
  <div className="h-12 border-b wb-outline flex items-center justify-between px-6 wb-surface-subtle z-10">
    <div className="flex items-center gap-3">
      <Camera className="w-4 h-4 text-primary" />
      <span className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest opacity-70">Industrial Render Engine v7.2.3</span>
      <div className="h-4 w-px wb-outline mx-2" />
      <span className="text-[9px] font-mono text-primary/80">{name.toUpperCase()} — {activeTab} PLANE</span>
    </div>
    <button onClick={onClose} className="p-1.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-red-500/10 hover:border-red-500/30 transition-all">
      <X className="w-4 h-4" />
    </button>
  </div>
);
