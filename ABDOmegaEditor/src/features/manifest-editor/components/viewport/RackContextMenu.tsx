'use client';

/**
 * @purpose Renderiza un menú de contexto para elementos de rack en el editor de manifesto OMEGA, proporcionando opciones para editar propiedades, duplicar, agrupar, desagrupar, bloquear, desbloquear, mostrar, ocultar y eliminar items.
 * @purpose_en ** Renders a context menu for rack elements in the OMEGA manifest editor, providing options to edit properties, duplicate, group, ungroup, lock, unlock, show, hide, and delete items.
 * @refactorable ** false (contains only static declarations/types/constants)
 * @classification ** UI Component
 * @complexity ** Low
 * @fingerprint exports:1,imports:2,sig:1bbtliq
 * @lastUpdated 2026-06-15T13:01:17.366Z
 */

import React, { useState, useEffect, useRef } from 'react';
import { Copy, Trash2, Eye, EyeOff, Lock, Unlock, Layers, Group, Ungroup, Maximize } from 'lucide-react';

interface RackContextMenuProps {
  x: number;
  y: number;
  targetId: string | null;
  isLocked: boolean;
  isHidden: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onGroup?: (ids: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onSnapToGrid?: (id: string) => void;
  isGroupEnabled?: boolean;
  isUngroupEnabled?: boolean;
}

export default function RackContextMenu({
  x,
  y,
  targetId,
  isLocked,
  isHidden,
  onClose,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleVisibility,
  onGroup,
  onUngroup,
  onSnapToGrid,
  isGroupEnabled = true,
  isUngroupEnabled = true,
}: RackContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      setAdjustedPos({
        x: Math.min(x, maxX),
        y: Math.min(y, maxY),
      });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!targetId) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-[#0a0a0b] border border-white/10 shadow-2xl py-1 min-w-[160px]"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      <MenuItem
        icon={<Layers className="w-3 h-3" />}
        label="Edit Properties"
        onClick={(e) => { e.stopPropagation(); onSelect(targetId); onClose(); }}
      />
      <MenuItem
        icon={<Copy className="w-3 h-3" />}
        label="Duplicate"
        onClick={(e) => { e.stopPropagation(); onDuplicate(targetId); onClose(); }}
      />
      {onSnapToGrid && (
        <MenuItem
          icon={<Maximize className="w-3 h-3" />}
          label="Snap to Grid"
          onClick={(e) => { e.stopPropagation(); onSnapToGrid(targetId); onClose(); }}
        />
      )}
      {onGroup && (
        <MenuItem
          icon={<Group className="w-3 h-3" />}
          label="Group"
          disabled={!isGroupEnabled}
          onClick={(e) => { e.stopPropagation(); onGroup([targetId]); onClose(); }}
        />
      )}
      {onUngroup && (
        <MenuItem
          icon={<Ungroup className="w-3 h-3" />}
          label="Ungroup"
          disabled={!isUngroupEnabled}
          onClick={(e) => { e.stopPropagation(); onUngroup(targetId); onClose(); }}
        />
      )}
      <Divider />
      <MenuItem
        icon={isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        label={isLocked ? 'Unlock' : 'Lock'}
        onClick={(e) => { e.stopPropagation(); onToggleLock(targetId); onClose(); }}
      />
      <MenuItem
        icon={isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        label={isHidden ? 'Show' : 'Hide'}
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(targetId); onClose(); }}
      />
      <Divider />
      <MenuItem
        icon={<Trash2 className="w-3 h-3 text-red-500" />}
        label="Delete"
        danger
        onClick={(e) => { e.stopPropagation(); onDelete(targetId); onClose(); }}
      />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger, disabled }: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
        disabled
          ? 'text-white/30 cursor-not-allowed opacity-40'
          : danger
            ? 'text-red-400 hover:bg-red-500 hover:text-white'
            : 'text-white/70 hover:bg-primary hover:text-black'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-white/10 my-1 mx-2" />;
}
