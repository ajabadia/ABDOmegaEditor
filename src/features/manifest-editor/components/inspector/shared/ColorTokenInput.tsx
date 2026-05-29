'use client';

import React from 'react';

interface ColorTokenInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  labelColorClass?: string;
  className?: string;
  placeholder?: string;
}

export default function ColorTokenInput({ 
  label, 
  value, 
  onChange, 
  labelColorClass = 'wb-text-muted',
  className = '',
  placeholder = ''
}: ColorTokenInputProps) {
  // Simple check for RGBA to decide placeholder color
  const isRGBA = value.startsWith('rgba');
  const previewColor = isRGBA ? '#ffffff' : value;

  return (
    <div className={`p-3 bg-black/40 border wb-outline rounded-xs space-y-2 ${className}`}>
      <label className={`text-[7px] font-black uppercase tracking-widest ${labelColorClass}`}>
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative group">
          <input 
            type="color" 
            value={previewColor} 
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-xs border wb-outline bg-transparent cursor-pointer p-0.5 transition-transform group-hover:scale-105"
          />
          {isRGBA && (
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
             </div>
          )}
        </div>
        <input 
          type="text" 
          value={value} 
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 wb-surface-strong border wb-outline rounded-xs px-2 py-1 text-[9px] font-mono wb-text outline-none focus:border-primary/50 transition-colors"
        />
      </div>
    </div>
  );
}
