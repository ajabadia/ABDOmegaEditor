'use client';

import React from 'react';

interface VariantGovernanceProps {
  value: string;
  onChange: (val: string) => void;
}

export default function VariantGovernance({ value, onChange }: VariantGovernanceProps) {
  const currentVariant = value || 'default';
  const isSizePattern = /^[A-D]_/.test(currentVariant);

  const setSize = (s: string) => {
    const parts = currentVariant.split('_');
    onChange(`${s}_${parts[1] || 'cyan'}`);
  };

  const INDUSTRIAL_VARIANTS = ['default', 'header', 'section', 'panel', 'inset', 'minimal', 'border'];

  return (
    <div className="space-y-3">
      {isSizePattern ? (
        <div className="flex gap-2">
          <input 
            type="text" 
            value={currentVariant} 
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. A_red, B_cyan"
            className="flex-1 border wb-outline rounded-xs px-2 py-1.5 text-[9px] text-primary font-mono outline-none bg-black/40"
          />
          <div className="flex gap-1">
            {['A', 'B', 'C', 'D'].map(s => (
              <button 
                key={s}
                onClick={() => setSize(s)}
                className={`w-6 h-6 flex items-center justify-center text-[9px] font-black rounded-xs border transition-all ${currentVariant.startsWith(s) ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,240,255,0.2)]' : 'bg-black/40 border-outline/10 text-white/20 hover:border-outline/40'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1">
          {INDUSTRIAL_VARIANTS.map(v => (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`py-1.5 border rounded-xs text-[7px] font-black uppercase transition-all ${currentVariant === v ? 'border-accent bg-accent/20 text-accent shadow-[0_0_8px_rgba(0,240,255,0.1)]' : 'bg-black/40 border-outline/10 hover:border-outline/40 text-foreground/40'}`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
