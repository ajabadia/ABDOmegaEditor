'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  subMessage?: string;
  icon: LucideIcon;
  className?: string;
}

/**
 * EmptyState
 * Standardized placeholder for empty lists or missing data.
 * Adheres to the Era 7.2.3 "Anti-AI" aseptic aesthetic.
 */
export default function EmptyState({
  message,
  subMessage,
  icon: Icon,
  className = ""
}: EmptyStateProps) {
  return (
    <div className={`py-16 border border-dashed wb-outline rounded-xs flex flex-col items-center justify-center gap-4 wb-surface-subtle opacity-40 grayscale hover:grayscale-0 hover:opacity-60 transition-all duration-700 ${className}`}>
      <div className="p-4 rounded-full border wb-outline wb-surface-strong">
        <Icon className="w-8 h-8 text-primary/60" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] wb-text">{message}</p>
        {subMessage && (
          <p className="text-[7px] font-medium uppercase tracking-widest wb-text-muted">{subMessage}</p>
        )}
      </div>
    </div>
  );
}
