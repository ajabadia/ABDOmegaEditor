'use client';

/**
 * @purpose Renderiza un panel de carga reutilizable para el editor de manifesto OMEGA con título personalizable, icono y contenido.
 * @purpose_en Renders a reusable dock panel for the OMEGA manifest editor with customizable title, icon, and content.
 * @fingerprint exports:1,imports:2,sig:1mvqgv0
 * @lastUpdated 2026-06-15T05:07:34.113Z
 */

import React from 'react';
import { DockPanelHeader } from './DockPanelHeader';

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
  return (
    <div className={`${width} h-full flex flex-col overflow-hidden shrink-0`}>
      <DockPanelHeader
        title={title}
        icon={icon}
        onClose={onClose}
        variant={variant}
      />
      {children}
    </div>
  );
}
