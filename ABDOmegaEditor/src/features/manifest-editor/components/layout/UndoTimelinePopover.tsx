'use client';

/**
 * @purpose Renderiza un componente popover para acciones de undo y redo en el editor de manifesto OMEGA, mostrando una línea del tiempo de eventos históricos con iconos y colores.
 * @purpose_en Renders a popover component for undo and redo actions in the OMEGA manifest editor, displaying a timeline of historical events with icons and colors.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:5,sig:1350fkm
 * @lastUpdated 2026-06-15T16:07:56.309Z
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  Pencil,
  MousePointer,
  Pin,
  Columns,
  Eye,
  Camera,
  Shield,
  History,
} from 'lucide-react';
import type { HistoryEntry, HistoryEventType } from '@/features/manifest-editor/types/history';
import type { HistoryEntry as BatchHistoryEntry } from '@/features/manifest-editor/hooks/useBatchHistory';
import { BATCH_VARIANT_TIMELINE } from '@/features/manifest-editor/hooks/useBatchHistory';

// ── Helpers ─────────────────────────────────────────────────────────────

const eventIcon = (type: HistoryEventType) => {
  switch (type) {
    case 'CONTENT_CHANGE': return <Pencil className="w-2.5 h-2.5" />;
    case 'UI_SELECTION':   return <MousePointer className="w-2.5 h-2.5" />;
    case 'UI_PINNING':     return <Pin className="w-2.5 h-2.5" />;
    case 'UI_LAYOUT_RATIO': return <Columns className="w-2.5 h-2.5" />;
    case 'MODE_CHANGE':    return <Eye className="w-2.5 h-2.5" />;
    case 'SNAPSHOT':       return <Camera className="w-2.5 h-2.5" />;
    case 'RECOVERY_POINT': return <Shield className="w-2.5 h-2.5" />;
    default:               return <History className="w-2.5 h-2.5" />;
  }
};

const eventColor = (type: HistoryEventType) => {
  switch (type) {
    case 'CONTENT_CHANGE': return 'text-cyan-400';
    case 'UI_SELECTION':   return 'text-blue-400';
    case 'UI_PINNING':     return 'text-violet-400';
    case 'UI_LAYOUT_RATIO': return 'text-amber-400';
    case 'MODE_CHANGE':    return 'text-emerald-400';
    case 'SNAPSHOT':       return 'text-white/50';
    case 'RECOVERY_POINT': return 'text-primary/60';
    default:               return 'text-white/40';
  }
};

const relativeTime = (ts: number): string => {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min === 1) return '1m ago';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs === 1) return '1h ago';
  return `${hrs}h ago`;
};

// ── Props ───────────────────────────────────────────────────────────────

export interface UndoTimelinePopoverProps {
  /** Past history entries — most recent is last in array */
  past: HistoryEntry[];
  /** Future (redo) history entries — next is first in array */
  future: HistoryEntry[];
  /** Batch history entries (visibility/lock/group operations) */
  batchEntries?: BatchHistoryEntry[];
  /** Undo a batch history entry by index (0 = most recent) */
  onUndoBatchEntry?: ((index: number) => void) | undefined;
  /** Jump to a specific past entry by index */
  onUndoTo: (index: number) => void;
  /** Undo one step */
  onUndo: () => void;
  /** Redo one step */
  onRedo: () => void;
  /** Whether the popover is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Ref of the trigger element for positioning */
  triggerRef: React.RefObject<HTMLElement | null>;
}

// ── Component ───────────────────────────────────────────────────────────

export default function UndoTimelinePopover({
  past,
  future,
  batchEntries = [],
  onUndoBatchEntry,
  onUndoTo,
  onUndo,
  onRedo,
  isOpen,
  onClose,
  triggerRef,
}: UndoTimelinePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ bottom: number; right: number }>({ bottom: 0, right: 0 });

  // ── Position relative to trigger ────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      bottom: window.innerHeight - rect.top + 4,
      right: window.innerWidth - rect.right,
    });
  }, [isOpen, triggerRef]);

  // ── Click outside + Escape ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Delay to avoid the same click that opened it from closing immediately
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    document.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const totalSteps = past.length + future.length + batchEntries.length;

  // Display past in reverse (newest first) and mark current
  const pastReversed = [...past].reverse();

  // Merge batch entries (already newest-first) with semantic entries for visual timeline
  // We display them in the "Batch History" section below the semantic history
  const hasBatchEntries = batchEntries.length > 0;

  return (
    <div
      ref={popoverRef}
      className="fixed z-[300] w-[280px] max-h-[340px] flex flex-col rounded-xs border wb-outline wb-surface backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      style={{ bottom: position.bottom, right: position.right }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b wb-outline">
        <div className="flex items-center gap-1.5">
          <History className="w-3 h-3 text-primary" />
          <span className="text-[8px] font-black uppercase tracking-[0.15em] wb-text">History</span>
        </div>
        <span className="text-[7px] font-mono text-white/30">{totalSteps} step{totalSteps !== 1 ? 's' : ''}</span>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-0.5 min-h-0">
        {/* ── Past entries ── */}
        {pastReversed.length === 0 && future.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[8px] text-white/20 italic select-none">
            No history yet
          </div>
        )}

        {pastReversed.map((entry, revIdx) => {
          // original index in the non-reversed past array
          const originalIndex = past.length - 1 - revIdx;
          const isCurrent = revIdx === 0; // newest past entry = current state

          return (
            <button
              key={entry.id}
              onClick={() => {
                if (!isCurrent) {
                  onUndoTo(originalIndex);
                  onClose();
                }
              }}
              disabled={isCurrent}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all ${
                isCurrent
                  ? 'bg-primary/10 border-l-2 border-primary cursor-default'
                  : 'hover:bg-white/5 border-l-2 border-transparent cursor-pointer active:bg-white/10'
              }`}
              aria-label={isCurrent ? `Current: ${entry.label || entry.type.replace(/_/g, ' ')}` : `Undo to: ${entry.label || entry.type.replace(/_/g, ' ')}`}
            >
              {/* Dot marker */}
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isCurrent ? 'bg-primary shadow-[0_0_6px_rgba(0,242,255,0.5)]' : 'bg-white/20'
              }`} />

              {/* Icon */}
              <span className={`shrink-0 ${eventColor(entry.type)}`}>
                {eventIcon(entry.type)}
              </span>

              {/* Label */}
              <span className={`flex-1 truncate text-[8px] font-medium leading-tight ${
                isCurrent ? 'text-primary font-bold' : 'text-white/70'
              }`}>
                {entry.label || entry.type.replace(/_/g, ' ')}
              </span>

              {/* Time */}
              <span className="shrink-0 text-[7px] font-mono text-white/25">
                {relativeTime(entry.timestamp)}
              </span>
            </button>
          );
        })}

        {/* ── Future entries divider ── */}
        {future.length > 0 && past.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[6px] font-mono uppercase tracking-widest text-white/20">Redo</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        )}

        {future.length > 0 && (
          <div className="opacity-50">
            {future.map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  onRedo();
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors border-l-2 border-transparent cursor-pointer active:bg-white/10"
                aria-label={`Redo: ${entry.label || entry.type.replace(/_/g, ' ')}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-white/10" />
                <span className={`shrink-0 ${eventColor(entry.type)}`}>
                  {eventIcon(entry.type)}
                </span>
                <span className="flex-1 truncate text-[8px] font-medium text-white/50 leading-tight">
                  {entry.label || entry.type.replace(/_/g, ' ')}
                </span>
                <span className="shrink-0 text-[7px] font-mono text-white/20">
                  {relativeTime(entry.timestamp)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Batch History entries ── */}
        {hasBatchEntries && (
          <>
            <div className="flex items-center gap-2 px-3 py-1">
              <div className="flex-1 h-px bg-amber-400/20" />
              <span className="text-[6px] font-mono uppercase tracking-widest text-amber-400/50">Batch</span>
              <div className="flex-1 h-px bg-amber-400/20" />
            </div>
            {batchEntries.map((entry, idx) => {
              const timeStr = new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const variantClass = BATCH_VARIANT_TIMELINE[entry.variant] || 'border-white/20 bg-white/5 text-white/60';
              const isUndoable = entry.action === 'visibility' || entry.action === 'lock' || (entry.action === 'group' && entry.value === true);
              return (
                <button
                  key={`batch-${entry.time}-${idx}`}
                  onClick={() => {
                    if (isUndoable && onUndoBatchEntry) {
                      onUndoBatchEntry(idx);
                      onClose();
                    }
                  }}
                  disabled={!isUndoable}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all border-l-2 ${
                    isUndoable
                      ? 'hover:bg-white/5 border-transparent cursor-pointer active:bg-white/10'
                      : 'border-transparent cursor-default opacity-50'
                  } ${variantClass}`}
                  aria-label={isUndoable ? `Undo batch: ${entry.message}` : `Batch: ${entry.message}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUndoable ? 'bg-amber-400/60' : 'bg-white/10'}`} />
                  <span className="text-[7px] shrink-0 opacity-60">{isUndoable ? '↶' : '—'}</span>
                  <span className="flex-1 truncate text-[7px] font-black uppercase tracking-widest leading-tight">
                    {entry.message}
                  </span>
                  <span className="shrink-0 text-[6px] font-mono opacity-50">{timeStr}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* FOOTER: Undo / Redo buttons */}
      <div className="flex border-t wb-outline">
        <button
          onClick={() => { onUndo(); onClose(); }}
          disabled={past.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-all border-r wb-outline hover:bg-white/5 active:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Undo last action"
        >
          <Undo2 className="w-2.5 h-2.5" />
          Undo
        </button>
        <button
          onClick={() => { onRedo(); onClose(); }}
          disabled={future.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-all hover:bg-white/5 active:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Redo last action"
        >
          <Redo2 className="w-2.5 h-2.5" />
          Redo
        </button>
      </div>
    </div>
  );
}
