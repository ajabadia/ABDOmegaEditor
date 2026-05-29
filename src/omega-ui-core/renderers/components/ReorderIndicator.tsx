'use client';

import React from 'react';

interface ReorderIndicatorProps {
  targetIndex: number | null | undefined;
  mode: 'stack-v' | 'stack-h';
}

export function ReorderIndicator({ targetIndex, mode }: ReorderIndicatorProps) {
  if (targetIndex === null) return null;

  return (
    <div 
      className="absolute pointer-events-none z-[110] flex items-center justify-center"
      style={{
        left: mode === 'stack-h' ? '-2px' : '0',
        top: mode === 'stack-v' ? '-2px' : '0',
        width: mode === 'stack-h' ? '4px' : '100%',
        height: mode === 'stack-v' ? '4px' : '100%',
      }}
    >
      <div className="w-full h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse rounded-full" />
      <div className="absolute bg-emerald-500 text-black text-[4px] font-black uppercase px-1 rounded-xs -top-4">
        Index: {targetIndex}
      </div>
    </div>
  );
}
