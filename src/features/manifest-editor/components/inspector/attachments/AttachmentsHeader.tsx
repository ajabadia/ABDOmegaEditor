'use client';

import React from 'react';
import { Paperclip, Info, Plus } from 'lucide-react';

interface AttachmentsHeaderProps {
  onAdd: () => void;
  onHelp?: ((id: string) => void) | undefined;
}

export default function AttachmentsHeader({ onAdd, onHelp }: AttachmentsHeaderProps) {
  return (
    <div className="flex justify-between items-center wb-surface-inset p-2 rounded-xs border wb-outline transition-colors duration-500">
      <div className="flex items-center gap-2">
         <Paperclip className="w-3 h-3 text-primary" />
         <span className="text-[8px] font-black wb-text uppercase tracking-widest">Aesthetic Components</span>
         <button onClick={() => onHelp?.('attachments')} className="wb-text-muted hover:text-primary transition-colors ml-1">
            <Info className="w-3 h-3" />
         </button>
      </div>
      <button 
        onClick={onAdd}
        className="flex items-center gap-1.5 px-2 py-1 bg-primary text-background hover:scale-105 transition-all rounded-xs shadow-lg shadow-primary/20"
      >
        <Plus className="w-2.5 h-2.5" />
        <span className="text-[8px] font-black uppercase">Add Fragment</span>
      </button>
    </div>
  );
}
