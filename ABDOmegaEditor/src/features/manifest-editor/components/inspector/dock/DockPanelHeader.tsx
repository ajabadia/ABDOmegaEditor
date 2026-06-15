'use client';

/**
 * @purpose Renderiza un componente de cabecera reutilizable para pestañas de panel con título personalizable, icono y función de cierre.
 * @purpose_en Renders a reusable header component for dock panels with customizable title, icon, and close functionality.
 * @fingerprint exports:2,imports:2,sig:12vxt7q
 * @lastUpdated 2026-06-15T08:25:02.715Z
 */

/**
 * DockPanelHeader — Encabezado reutilizable para dock panels.
 * Extraído de DockPanel.tsx para permitir uso directo en otros contextos
 * que necesiten el mismo patrón visual.
 *
 * Variants:
 * - 'default': bg-black/30, hover:bg-white/5 (paneles principales)
 * - 'subtle': wb-surface-subtle, hover:bg-primary/10 (paneles secundarios)
 */

import React from 'react';
import { X } from 'lucide-react';

export interface DockPanelHeaderProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  variant?: 'default' | 'subtle';
}

const VARIANT_CLASSES: Record<string, string> = {
  default:
    'px-3 py-2 bg-black/30 border-b wb-outline flex items-center justify-between cursor-pointer text-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors',
  subtle:
    'px-3 py-2 wb-surface-subtle border-b wb-outline flex items-center justify-between cursor-pointer wb-text hover:bg-primary/10 transition-colors',
};

export function DockPanelHeader({
  title,
  icon,
  onClose,
  variant = 'default',
}: DockPanelHeaderProps) {
  return (
    <div className={VARIANT_CLASSES[variant]} onClick={onClose}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <X className="w-3 h-3 opacity-30 hover:opacity-100" />
    </div>
  );
}
