'use client';

import React from 'react';

interface PropertyFieldProps {
  label: string;
  value?: string | number | undefined;
  children?: React.ReactNode;
  helper?: string;
  status?: 'ok' | 'warning' | 'error' | 'sync';
  compact?: boolean;
  mono?: boolean;
  readOnly?: boolean;
}

export default function PropertyField({
  label,
  value,
  children,
  helper,
  status,
  compact = false,
  mono = false,
  readOnly = false
}: PropertyFieldProps) {
  const statusColors = {
    ok: 'bg-feedback',
    warning: 'bg-warning',
    error: 'bg-red-500',
    sync: 'bg-primary animate-pulse'
  };

  return (
    <div className={`space-y-1.5 ${compact ? 'opacity-80 scale-[0.98] origin-left' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[7px] font-black uppercase wb-text-muted tracking-wider flex items-center gap-1.5">
          {status && <div className={`w-1 h-1 rounded-full ${statusColors[status]}`} />}
          {label}
        </label>
        {readOnly && (
          <span className="text-[6px] font-black uppercase text-white/20 italic">Read Only</span>
        )}
      </div>

      <div className="relative group">
        {children ? (
          children
        ) : (
          <div className={`w-full py-2 px-3 bg-black/40 border wb-outline rounded-xs text-[10px] ${mono ? 'font-mono' : 'font-medium'} ${readOnly ? 'opacity-50 cursor-not-allowed' : 'group-hover:border-primary/30 transition-colors'}`}>
            {value !== undefined ? value : '—'}
          </div>
        )}
      </div>

      {helper && (
        <p className="text-[6px] font-bold uppercase italic wb-text-muted leading-tight">
          {helper}
        </p>
      )}
    </div>
  );
}
