/**
 * @purpose Renderiza un botón de toggle de icono reutilizable para las barras de herramientas del OMEGA Workbench con tamaño, estado activo y variedad de color personalizables.
 * @purpose_en Renders a reusable icon toggle button for OMEGA Workbench toolbars with customizable size, active state, and color variant.
 * @fingerprint exports:0,imports:1,sig:ckfvtz
 * @lastUpdated 2026-06-15T08:25:08.958Z
 */

/**
 * ToolbarIconButton — Reusable icon toggle button for OMEGA Workbench toolbars.
 * Used in WorkbenchFooter (size="sm") and Toolbar panel (size="md").
 */

import React from 'react';

interface ToolbarIconButtonProps {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  /** 'sm' (w-5 h-4, footer) or 'md' (w-7 h-7, toolbar panel). Default 'sm'. */
  size?: 'sm' | 'md';
  /** Color scheme for active state: 'primary' (default) or 'accent' (live mode). */
  colorVariant?: 'primary' | 'accent';
  /** Extra CSS classes appended to the button (e.g. tool-active-glow) */
  className?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'w-5 h-4',
  md: 'w-7 h-7',
};

const HOVER_CLASSES: Record<string, string> = {
  sm: '',
  md: 'hover:bg-primary/10',
};

const ACTIVE_CLASSES: Record<string, string> = {
  primary: 'bg-primary/20 text-primary border border-primary/20',
  accent: 'bg-accent/20 text-accent border border-accent/20',
};

const ToolbarIconButton: React.FC<ToolbarIconButtonProps> = ({
  icon,
  active = false,
  onClick,
  title,
  size = 'sm',
  colorVariant = 'primary',
  className,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center rounded-xs transition-all ${SIZE_CLASSES[size]} ${
      active
        ? ACTIVE_CLASSES[colorVariant]
        : `wb-text-muted hover:wb-text ${HOVER_CLASSES[size]}`
    } ${className ?? ''}`}
    title={title}
  >
    {icon}
  </button>
);

export default ToolbarIconButton;
