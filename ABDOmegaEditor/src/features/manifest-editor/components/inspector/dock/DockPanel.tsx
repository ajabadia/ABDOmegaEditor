'use client';

import React from 'react';
import { X } from 'lucide-react';

interface DockPanelProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  variant?: 'default' | 'subtle';
}

/**
 * DockPanel — Panel reutilizable del dock derecho.
 * Cada panel del inspector sigue el mismo patrón: header con icono + título + botón de cierre,
 * y un contenedor interno para el contenido.
 * Extraído de RightDockContainer.tsx para eliminar la repetición manual de 7 paneles casi idénticos.
 */
export function DockPanel({
  title,
  icon,
  onClose,
  children,
  width = 'w-[260px]',
  variant = 'default'
}: DockPanelProps) {
  const headerClass = variant === 'subtle'
    ? 'px-3 py-2 wb-surface-subtle border-b wb-outline flex items-center justify-between cursor-pointer wb-text hover:bg-primary/10 transition-colors'
    : 'px-3 py-2 bg-black/30 border-b wb-outline flex items-center justify-between cursor-pointer text-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors';

  return (
    <div className={`${width} h-full flex flex-col overflow-hidden shrink-0`}>
      <div
        className={headerClass}
        onClick={onClose}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[9px] font-black uppercase tracking-widest">{title}</span>
        </div>
        <X className="w-3 h-3 opacity-30 hover:opacity-100" />
      </div>
      {children}
    </div>
  );
}
