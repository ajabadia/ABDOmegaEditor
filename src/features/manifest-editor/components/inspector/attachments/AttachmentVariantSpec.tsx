'use client';

import React from 'react';
import { Box } from 'lucide-react';

import type { Attachment } from '@/types/manifest';

interface AttachmentVariantSpecProps {
  variant: string;
  onUpdate: (updates: Partial<Attachment>) => void;
}

export default function AttachmentVariantSpec({ variant, onUpdate }: AttachmentVariantSpecProps) {
  const currentVariant = variant || 'B_cyan';

  return (
    <div className="space-y-1">
      <label className="text-[7px] wb-text-muted uppercase font-bold flex items-center gap-1 transition-colors duration-500">
        <Box className="w-2 h-2 text-primary" />
        <span>OMEGA Variant (Size_Color)</span>
      </label>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={currentVariant} 
          onChange={(e) => onUpdate({ variant: e.target.value })}
          placeholder="e.g. A_red, B_cyan"
          className="flex-1 wb-surface-inset border wb-outline rounded-xs p-1.5 text-[9px] text-primary font-mono outline-none transition-colors duration-500 shadow-sm"
        />
        <div className="flex gap-1">
          {['A', 'B', 'C', 'D'].map(s => (
            <button 
              key={s}
              onClick={() => {
                const parts = currentVariant.split('_');
                onUpdate({ variant: `${s}_${parts[1] || 'cyan'}` });
              }}
              className={`w-5 h-5 flex items-center justify-center text-[8px] font-black rounded-xs border transition-all ${currentVariant.startsWith(s) ? 'bg-primary/20 border-primary text-primary' : 'bg-black/40 border-outline text-white/20'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
