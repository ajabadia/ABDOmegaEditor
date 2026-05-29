'use client';

import React from 'react';

interface GovernedOverlayProps {
  enabled: boolean | undefined;
}

export function GovernedOverlay({ enabled }: GovernedOverlayProps) {
  if (!enabled) return null;

  return (
    <div className="absolute inset-0 bg-blue-500/5 pointer-events-none flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
      <div className="px-1.5 py-0.5 bg-blue-500 text-black text-[5px] font-black uppercase tracking-tighter rounded-full flex items-center gap-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2 h-2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        <span>Layout Governed</span>
      </div>
    </div>
  );
}
