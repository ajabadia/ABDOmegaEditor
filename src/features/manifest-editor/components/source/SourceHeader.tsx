'use client';

import React from 'react';
import { FileCode, Pencil, Copy, Check, X } from 'lucide-react';

interface SourceHeaderProps {
  manifestId: string;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  copyToClipboard: () => void;
  handleSave: () => void;
  cancelEdit: () => void;
}

export default function SourceHeader({ 
  manifestId, isEditing, setIsEditing, copyToClipboard, handleSave, cancelEdit 
}: SourceHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
         <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center rounded-xs shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <FileCode className="w-5 h-5 wb-text-muted" />
         </div>
         <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] wb-text">Manifest Source</h2>
            <p className="text-[8px] wb-text-muted uppercase tracking-widest">{manifestId}.acemm</p>
         </div>
      </div>
      
      <div className="flex items-center gap-2">
        {!isEditing ? (
          <>
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 hover:bg-accent/20 hover:border-accent/40 text-[8px] font-black uppercase tracking-widest text-accent transition-all rounded-xs group"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Manual Edit</span>
            </button>
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-outline/20 hover:bg-white/10 hover:border-white/40 text-[8px] font-black uppercase tracking-widest text-foreground/60 transition-all rounded-xs group"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/40 hover:bg-green-500/30 text-[8px] font-black uppercase tracking-widest text-green-400 transition-all rounded-xs shadow-[0_0_20px_rgba(34,197,94,0.1)]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Inject Changes</span>
            </button>
            <button 
              onClick={cancelEdit}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-[8px] font-black uppercase tracking-widest text-red-400 transition-all rounded-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
