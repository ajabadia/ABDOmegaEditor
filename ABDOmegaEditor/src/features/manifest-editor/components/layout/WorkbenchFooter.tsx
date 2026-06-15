/**
 * @purpose Renderiza un componente de pie de página para el Editor Manifesto OMEGA, mostrando estado industrial, seleccionadores de tablas, vista dividida y funcionalidad de undo/redo.
 * @purpose_en Renders a footer component for the OMEGA Manifest Editor, displaying industrial status, tab selectors, split view toggle, and undo/redo functionality.
 * @fingerprint exports:0,imports:4,sig:ydug41
 * @lastUpdated 2026-06-15T06:32:44.397Z
 */

import { useRef, useState } from 'react';
import { Layers, Cpu, FileCode, History, Columns, Save, AlertTriangle, Circle, Undo2, Map } from 'lucide-react';
import UndoTimelinePopover from './UndoTimelinePopover';
import type { HistoryEntry } from '@/features/manifest-editor/types/history';

interface WorkbenchFooterProps {
  watchdogStatus?: 'idle' | 'connected' | 'error';
  watchdogTime?: string | null;
  activeTabType?: 'orbital' | 'rack' | 'source' | 'history';
  onTabFocus?: (type: 'orbital' | 'rack' | 'source' | 'history') => void;
  isSplit?: boolean;
  onToggleSplit?: () => void;
  activeTool?: 'select' | 'marquee' | 'add' | 'studio' | null;
  /** Whether the active document has unsaved changes */
  isDirty?: boolean;
  /** Total error count from diagnostics */
  errorCount?: number;
  /** Total warning count from diagnostics */
  warningCount?: number;
  /** Human-readable timestamp of last save (e.g. "14:30:01") */
  lastSavedTime?: string | null;
  /** History entries for Undo Timeline */
  historyPast?: HistoryEntry[];
  historyFuture?: HistoryEntry[];
  onUndo?: () => void;
  onRedo?: () => void;
  onUndoTo?: (index: number) => void;
  /** Callback to open the Command Palette (Ctrl+K) */
  onCommandPaletteToggle?: () => void;
  /** Callback to trigger Save (Ctrl+S) */
  onSave?: () => void;
  showMiniMap?: boolean;
  onToggleMiniMap?: () => void;
}

/**
 * WorkbenchFooter (v8.0.0)
 * Industrial status bar for the OMEGA Manifest Editor.
 * Enhanced with dirty state, error count, save timestamp (Era 9.7.0) and Undo Timeline (v9.4.0).
 */
const WorkbenchFooter = ({ 
  watchdogStatus, 
  watchdogTime,
  activeTabType = 'rack',
  onTabFocus,
  isSplit = false,
  onToggleSplit,
  activeTool,
  isDirty = false,
  errorCount = 0,
  warningCount = 0,
  lastSavedTime,
  historyPast = [],
  historyFuture = [],
  onUndo,
  onRedo,
  onUndoTo,
  showMiniMap = true,
  onToggleMiniMap,
  onCommandPaletteToggle,
  onSave,
}: WorkbenchFooterProps) => {
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyBtnRef = useRef<HTMLButtonElement>(null);
  const totalSteps = historyPast.length + historyFuture.length;
  const hasUndo = historyPast.length > 0;
  const hasRedo = historyFuture.length > 0;

  return (
    <footer className="h-6 border-t wb-outline wb-surface flex items-center justify-between px-4 z-50 shrink-0 transition-colors duration-500 select-none">
      {/* LEFT: Build + Watchdog + Active Tool */}
      <div className="flex items-center gap-3 text-[7px] font-mono uppercase tracking-[0.2em] text-foreground/20 min-w-0">
        <span className="text-primary/40 font-black whitespace-nowrap">Build v8.0.0</span>
        <span className="opacity-50 shrink-0">{"//"}</span>
        {watchdogStatus === 'connected' ? (
          <div className="flex items-center gap-2 text-primary animate-in fade-in duration-500 whitespace-nowrap">
            <span className="w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgba(0,240,255,1)] animate-pulse" />
            <span className="font-black hidden md:inline">WATCHDOG SYNC ACTIVE</span>
            {watchdogTime && <span className="opacity-40 italic hidden lg:inline">@ {watchdogTime}</span>}
          </div>
        ) : watchdogStatus === 'error' ? (
          <div className="flex items-center gap-2 text-red-400/60 whitespace-nowrap">
            <span className="w-1 h-1 rounded-full bg-red-400/60" />
            <span className="font-black hidden md:inline">WATCHDOG OFFLINE</span>
          </div>
        ) : (
          <span className="whitespace-nowrap">Aseptic Standard</span>
        )}

        {/* Active tool indicator */}
        {(activeTool === 'marquee' || activeTool === 'add') && (
          <>
            <span className="opacity-50 shrink-0">{"//"}</span>
            <div className="flex items-center gap-1.5 text-primary border border-primary/20 bg-primary/5 rounded-xs px-1.5 py-0.5 shadow-[0_0_6px_rgba(var(--primary-rgb),0.1)] whitespace-nowrap">
              <span className="text-[6px] font-black uppercase tracking-widest">
                {activeTool === 'marquee' ? '[M] Marquee' : '[A] Add'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* CENTER: VIEW SELECTORS AND VERTICAL SPLIT */}
      <div className="flex items-center justify-center gap-1 shrink-0">
        <div className="flex items-center wb-surface border wb-outline rounded-xs p-0.5 pointer-events-auto h-5 bg-black/40">
          <button 
            onClick={() => onTabFocus?.('orbital')}
            className={`flex items-center justify-center w-5 h-4 rounded-xs transition-all ${activeTabType === 'orbital' ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
            title="Orbital View"
          >
            <Layers className="w-2.5 h-2.5" />
          </button>
          <button 
            onClick={() => onTabFocus?.('rack')}
            className={`flex items-center justify-center w-5 h-4 rounded-xs transition-all ${activeTabType === 'rack' ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
            title="Virtual Rack"
          >
            <Cpu className="w-2.5 h-2.5" />
          </button>
          <button 
            onClick={() => onTabFocus?.('source')}
            className={`flex items-center justify-center w-5 h-4 rounded-xs transition-all ${activeTabType === 'source' ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
            title="Source View"
          >
            <FileCode className="w-2.5 h-2.5" />
          </button>
          <button 
            onClick={() => onTabFocus?.('history')}
            className={`flex items-center justify-center w-5 h-4 rounded-xs transition-all ${activeTabType === 'history' ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
            title="Timeline / History"
          >
            <History className="w-2.5 h-2.5" />
          </button>
          
          <div className="w-px h-3 bg-white/10 mx-1" />
          
          <button 
            onClick={onToggleSplit}
            className={`flex items-center justify-center w-5 h-4 rounded-xs transition-all ${isSplit ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
            title="Toggle Split View (Vertical)"
          >
            <Columns className="w-2.5 h-2.5" />
          </button>
          <button 
            onClick={onToggleMiniMap}
            className={`flex items-center justify-center w-5 h-4 rounded-xs transition-all ${showMiniMap ? 'bg-primary/20 text-primary border border-primary/20' : 'wb-text-muted hover:wb-text'}`}
            title="Toggle Mini Map (Ctrl+Shift+M)"
          >
            <Map className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
      
      {/* RIGHT: Undo Timeline + Status indicators */}
      <div className="flex items-center justify-end gap-3 text-[7px] font-mono uppercase tracking-[0.2em] text-foreground/20 min-w-0">
        {/* Undo Timeline button */}
        <button
          ref={historyBtnRef}
          onClick={() => setIsHistoryOpen(prev => !prev)}
          disabled={totalSteps === 0}
          className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-xs transition-all ${
            isHistoryOpen
              ? 'bg-primary/15 text-primary border border-primary/30'
              : totalSteps > 0
                ? 'hover:bg-white/5 text-white/40 hover:text-white/70 border border-transparent'
                : 'text-white/10 cursor-not-allowed'
          }`}
          title={totalSteps > 0 ? `History (${totalSteps} step${totalSteps !== 1 ? 's' : ''})` : 'No history'}
        >
          <Undo2 className="w-2.5 h-2.5" />
          {totalSteps > 0 && (
            <span className="text-[7px] font-bold tabular-nums">{totalSteps}</span>
          )}
        </button>

        {/* Shortcut badges — responsive: hide progressively on smaller screens */}
        <div className="flex items-center gap-1 shrink-0 overflow-hidden">
          {/* Undo (Ctrl+Z) — always visible */}
          <button
            onClick={() => { onUndo?.(); }}
            disabled={!hasUndo}
            className={`flex items-center gap-1 px-1 py-0.5 rounded-xs border text-[6px] font-mono font-bold tracking-wider shrink-0 transition-all ${
              hasUndo
                ? 'border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                : 'border-white/5 bg-transparent text-white/10 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Z</kbd>
          </button>

          {/* Redo (Ctrl+Shift+Z) — hidden below md */}
          <button
            onClick={() => { onRedo?.(); }}
            disabled={!hasRedo}
            className={`hidden md:flex items-center gap-1 px-1 py-0.5 rounded-xs border text-[6px] font-mono font-bold tracking-wider shrink-0 transition-all ${
              hasRedo
                ? 'border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                : 'border-white/5 bg-transparent text-white/10 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Shift</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Z</kbd>
          </button>

          {/* Command Palette (Ctrl+K) — always visible */}
          <button
            onClick={() => onCommandPaletteToggle?.()}
            className="flex items-center gap-1 px-1 py-0.5 rounded-xs border border-white/10 bg-white/5 text-[6px] font-mono font-bold tracking-wider text-white/30 hover:bg-white/10 hover:text-white/50 shrink-0 transition-all cursor-pointer"
            title="Command Palette (Ctrl+K)"
          >
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">K</kbd>
          </button>

          {/* Save (Ctrl+S) — hidden below md */}
          <button
            onClick={() => onSave?.()}
            className="hidden md:flex items-center gap-1 px-1 py-0.5 rounded-xs border border-white/10 bg-white/5 text-[6px] font-mono font-bold tracking-wider text-white/30 hover:bg-white/10 hover:text-white/50 shrink-0 transition-all cursor-pointer"
            title="Save OmegaPack (Ctrl+S)"
          >
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">S</kbd>
          </button>

          {/* View: Orbital (Ctrl+1) — hidden below lg */}
          <button
            onClick={() => onTabFocus?.('orbital')}
            className={`hidden lg:flex items-center gap-1 px-1 py-0.5 rounded-xs border text-[6px] font-mono font-bold tracking-wider shrink-0 transition-all ${
              activeTabType === 'orbital'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
            }`}
            title="Orbital View (Ctrl+1)"
          >
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">1</kbd>
          </button>

          {/* View: Rack (Ctrl+2) — hidden below lg */}
          <button
            onClick={() => onTabFocus?.('rack')}
            className={`hidden lg:flex items-center gap-1 px-1 py-0.5 rounded-xs border text-[6px] font-mono font-bold tracking-wider shrink-0 transition-all ${
              activeTabType === 'rack'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
            }`}
            title="Virtual Rack (Ctrl+2)"
          >
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">2</kbd>
          </button>

          {/* View: Source (Ctrl+3) — hidden below xl */}
          <button
            onClick={() => onTabFocus?.('source')}
            className={`hidden xl:flex items-center gap-1 px-1 py-0.5 rounded-xs border text-[6px] font-mono font-bold tracking-wider shrink-0 transition-all ${
              activeTabType === 'source'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
            }`}
            title="Source Code (Ctrl+3)"
          >
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">3</kbd>
          </button>

          {/* View: History (Ctrl+4) — hidden below xl */}
          <button
            onClick={() => onTabFocus?.('history')}
            className={`hidden xl:flex items-center gap-1 px-1 py-0.5 rounded-xs border text-[6px] font-mono font-bold tracking-wider shrink-0 transition-all ${
              activeTabType === 'history'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
            }`}
            title="History Timeline (Ctrl+4)"
          >
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
            <span className="text-white/20">+</span>
            <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">4</kbd>
          </button>

          {/* Mini Map (Ctrl+Shift+M) — hidden below xl, only in rack view */}
          {activeTabType === 'rack' && (
            <button
              onClick={onToggleMiniMap}
              className={`hidden xl:flex items-center gap-1 px-1 py-0.5 rounded-xs border shrink-0 transition-all cursor-pointer text-[6px] font-mono font-bold tracking-wider ${
                showMiniMap
                  ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                  : 'border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
              }`}
              title="Toggle Mini Map (Ctrl+Shift+M)"
            >
              <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Ctrl</kbd>
              <span className="text-white/20">+</span>
              <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">Shift</kbd>
              <span className="text-white/20">+</span>
              <kbd className="text-[5px] px-0.5 py-px rounded-[1px] bg-white/10 text-white/40 font-mono font-black uppercase leading-none">M</kbd>
            </button>
          )}
        </div>

        <span className="opacity-20 shrink-0">|</span>

        {/* Document dirty/saved state */}
        {isDirty ? (
          <div className="flex items-center gap-1.5 text-amber-400/80 animate-in fade-in duration-300 whitespace-nowrap">
            <Circle className="w-2 h-2 fill-amber-400/60" />
            <span className="font-black">Modified</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-400/60 whitespace-nowrap">
            <Save className="w-2.5 h-2.5" />
            <span className="font-black">Saved</span>
            {lastSavedTime && <span className="opacity-40 italic hidden lg:inline">@ {lastSavedTime}</span>}
          </div>
        )}

        {/* Error / Warning count badge */}
        {(hasErrors || hasWarnings) && (
          <>
            <span className="opacity-30 shrink-0">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <AlertTriangle className={`w-2 h-2 ${hasErrors ? 'text-red-400/80' : 'text-amber-400/60'}`} />
              {hasErrors && (
                <span className="text-red-400/80 font-black">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
              )}
              {hasErrors && hasWarnings && <span className="opacity-30">/</span>}
              {hasWarnings && (
                <span className="text-amber-400/60 font-black">{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          </>
        )}

        {/* Watchdog indicator dot (compact) */}
        <span className="opacity-30 shrink-0">|</span>
        <div className={`w-1.5 h-1.5 rounded-full border transition-all duration-500 shrink-0 ${
          watchdogStatus === 'connected' ? 'bg-green-400/40 border-green-400/60 shadow-[0_0_6px_rgba(34,197,94,0.3)]' :
          watchdogStatus === 'error' ? 'bg-red-400/30 border-red-400/50' :
          'bg-white/5 border-white/10'
        }`} title={watchdogStatus === 'connected' ? 'Watchdog connected' : watchdogStatus === 'error' ? 'Watchdog error' : 'Watchdog idle'} />
      </div>

      {/* ── Undo Timeline Popover ── */}
      <UndoTimelinePopover
        past={historyPast}
        future={historyFuture}
        onUndoTo={(index) => { onUndoTo?.(index); setIsHistoryOpen(false); }}
        onUndo={() => { onUndo?.(); setIsHistoryOpen(false); }}
        onRedo={() => { onRedo?.(); setIsHistoryOpen(false); }}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        triggerRef={historyBtnRef}
      />
    </footer>
  );
};

export default WorkbenchFooter;
