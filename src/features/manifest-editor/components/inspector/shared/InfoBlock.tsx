'use client';

import React from 'react';
import { Info, type LucideIcon } from 'lucide-react';

interface InfoBlockProps {
  title: string;
  message: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'accent' | 'muted';
  className?: string;
}

/**
 * InfoBlock
 * Standardized informational panel for technical notes and industrial documentation.
 * Resolves inconsistencies in background colors and spacing across sections.
 */
export default function InfoBlock({
  title,
  message,
  icon: Icon = Info,
  variant = 'primary',
  className = ""
}: InfoBlockProps) {
  
  const variantStyles = {
    primary: "wb-surface-subtle border-primary/20 border-l-primary text-primary",
    accent: "wb-surface-subtle border-accent/20 border-l-accent text-accent",
    muted: "wb-surface-strong wb-outline border-l-outline/40 text-foreground/40"
  };

  return (
    <div className={`p-4 border wb-outline rounded-xs space-y-2 border-l-4 transition-all duration-500 shadow-sm ${variantStyles[variant]} ${className}`}>
      <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest opacity-80">
        <Icon className="w-3 h-3" />
        <span>{title}</span>
      </div>
      <p className="text-[9px] wb-text font-bold uppercase leading-relaxed tracking-tight opacity-70">
        {message}
      </p>
    </div>
  );
}
