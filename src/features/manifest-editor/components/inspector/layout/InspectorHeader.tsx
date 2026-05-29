'use client';

import React from 'react';
import { X, Package, Settings, Pin } from 'lucide-react';

interface InspectorHeaderProps {
  id?: string | undefined;
  isModule: boolean;
  isPinned?: boolean | undefined;
  onPin?: (() => void) | undefined;
  onClose: () => void;
}

export default function InspectorHeader({ id, isModule, isPinned, onPin, onClose }: InspectorHeaderProps) {
  return (
    <header className="p-4 border-b wb-outline bg-black/5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center">
           {isModule ? <Package className="w-4 h-4 text-primary" /> : <Settings className="w-4 h-4 text-primary" />}
        </div>
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest wb-text">
            {isModule ? 'Module Configuration' : 'Entity Inspector'}
          </h2>
          <p className="text-[8px] font-mono wb-text-muted truncate max-w-[160px]">{id}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onPin && (
          <button 
            onClick={onPin}
            className={`p-1.5 rounded-xs transition-all ${isPinned ? 'text-primary bg-primary/20 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
            title={isPinned ? "Unpin Node" : "Pin Node to Reference View"}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
          </button>
        )}
        
        {!isModule && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:wb-surface-hover rounded-xs wb-text-muted hover:wb-text transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
