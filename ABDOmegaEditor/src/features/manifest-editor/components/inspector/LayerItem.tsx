'use client';

import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2 } from 'lucide-react';

interface LayerItemProps {
  id: string;
  label?: string;
  icon: React.ComponentType<{ className?: string }>;
  isSelected: boolean;
  isHidden: boolean;
  isLocked: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRemove: (() => void) | undefined;
}

/**
 * Component extracted from LayersPanel.
 * Renders a single layer row with visibility/lock/remove toggles.
 */
export default function LayerItem({
  id,
  label,
  icon: Icon,
  isSelected,
  isHidden,
  isLocked,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRemove
}: LayerItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between px-2 py-1 border rounded-xs cursor-pointer transition-all ${
        isSelected
          ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.05)]'
          : 'wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden mr-2">
        <Icon className={`w-3 h-3 shrink-0 ${isSelected ? 'text-primary' : 'wb-text-muted opacity-60'}`} />
        <div className="flex flex-col overflow-hidden">
          <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">{id}</span>
          {label && (
            <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">{label}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleVisibility}
          className={`p-1 rounded hover:bg-primary/10 transition-colors ${
            isHidden ? 'text-red-400' : 'wb-text-muted hover:wb-text'
          }`}
          title={isHidden ? 'Show component' : 'Hide component'}
        >
          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>

        <button
          onClick={onToggleLock}
          className={`p-1 rounded hover:bg-primary/10 transition-colors ${
            isLocked ? 'text-amber-400' : 'wb-text-muted hover:wb-text'
          }`}
          title={isLocked ? 'Unlock component position' : 'Lock component position'}
        >
          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>

        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded wb-text-muted hover:text-red-400 hover:bg-primary/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
