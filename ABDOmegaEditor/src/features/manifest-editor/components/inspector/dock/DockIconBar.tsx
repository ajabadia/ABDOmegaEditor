'use client';

/**
 * DockIconBar — Barra de iconos vertical genérica para dock panels.
 * Unifica DockIconStrip y DockRackSectionToolbar en un solo componente reutilizable.
 *
 * Características:
 * - Renderiza botones ToolbarIconButton size="md" con sombra en estado activo
 * - Soporta agrupación con divisores entre grupos (opcional)
 * - Soporta label superior (opcional)
 * - className personalizable para z-index, shadow, animaciones
 */

import React from 'react';
import ToolbarIconButton from '@/features/manifest-editor/components/layout/ToolbarIconButton';

export interface DockIconBarButton {
  id: string;
  icon: React.ReactNode;
  title: string;
}

export interface DockIconBarGroup {
  id: string;
  label?: string;
  buttonIds: string[];
  /** Extra classes for the group container (e.g. overflow-y-auto max-h-[50vh]) */
  className?: string;
}

export interface DockIconBarProps {
  buttons: DockIconBarButton[];
  isActive: (id: string) => boolean;
  onButtonClick: (id: string) => void;
  /** Optional grouping — if provided, buttons are rendered in groups with dividers */
  groups?: DockIconBarGroup[];
  /** Optional label rendered at the top of the bar */
  label?: string;
  /** Extra classes for the bar container (default: 'z-50 shadow-xl') */
  className?: string;
}

export function DockIconBar({
  buttons,
  isActive,
  onButtonClick,
  groups,
  label,
  className = 'z-50 shadow-xl',
}: DockIconBarProps) {
  const buttonMap = new Map(buttons.map(b => [b.id, b]));

  const renderButton = (id: string) => {
    const button = buttonMap.get(id);
    if (!button) return null;
    const active = isActive(id);
    return (
      <ToolbarIconButton
        key={id}
        icon={button.icon}
        active={active}
        onClick={() => onButtonClick(id)}
        title={button.title}
        size="md"
        className={active ? 'shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' : ''}
      />
    );
  };

  return (
    <div
      className={`w-10 wb-surface border-l wb-outline flex flex-col items-center py-3 gap-3 shrink-0 ${className}`}
    >
      {label && (
        <div className="text-[5px] font-black uppercase text-foreground/45 tracking-widest text-center select-none pointer-events-none">
          {label}
        </div>
      )}

      {groups ? (
        groups.map((group, idx) => (
          <React.Fragment key={group.id}>
            {idx > 0 && <div className="w-5 h-px bg-white/10" />}
            <div className={`flex flex-col items-center gap-1.5 ${group.className ?? ''}`}>
              {group.label && (
                <div className="text-[5px] font-black uppercase text-foreground/45 tracking-widest text-center select-none pointer-events-none">
                  {group.label}
                </div>
              )}
              {group.buttonIds.map(renderButton)}
            </div>
          </React.Fragment>
        ))
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          {buttons.map(b => renderButton(b.id))}
        </div>
      )}
    </div>
  );
}
