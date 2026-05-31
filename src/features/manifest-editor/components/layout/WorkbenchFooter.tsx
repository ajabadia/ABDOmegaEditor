import React from 'react';
import { Layers, Cpu, FileCode, History, Columns } from 'lucide-react';

interface WorkbenchFooterProps {
  watchdogStatus?: 'idle' | 'connected' | 'error';
  watchdogTime?: string | null;
  activeTabType?: 'orbital' | 'rack' | 'source' | 'history';
  onTabFocus?: (type: 'orbital' | 'rack' | 'source' | 'history') => void;
  isSplit?: boolean;
  onToggleSplit?: () => void;
}

/**
 * WorkbenchFooter (v8.0.0)
 * Industrial status bar for the OMEGA Manifest Editor.
 */
const WorkbenchFooter = ({ 
  watchdogStatus, 
  watchdogTime,
  activeTabType = 'rack',
  onTabFocus,
  isSplit = false,
  onToggleSplit
}: WorkbenchFooterProps) => {
  return (
    <footer className="h-6 border-t wb-outline wb-surface flex items-center justify-between px-6 z-50 shrink-0 transition-colors duration-500 select-none">
      <div className="flex-1 flex items-center gap-4 text-[7px] font-mono uppercase tracking-[0.2em] text-foreground/20">
        <span className="text-primary/40 font-black">Build v8.0.0</span>
        <span className="opacity-50">{"//"}</span>
        {watchdogStatus === 'connected' ? (
          <div className="flex items-center gap-2 text-primary animate-in fade-in duration-500">
            <span className="w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgba(0,240,255,1)] animate-pulse" />
            <span className="font-black">WATCHDOG SYNC ACTIVE</span>
            {watchdogTime && <span className="opacity-40 italic">@ {watchdogTime}</span>}
          </div>
        ) : (
          <span>Aseptic Standard</span>
        )}
      </div>

      {/* CENTER: VIEW SELECTORS AND VERTICAL SPLIT */}
      <div className="flex-1 flex items-center justify-center gap-1">
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
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-end gap-4 text-[7px] font-mono uppercase tracking-[0.2em] text-foreground/20">
        <span>Industrial Era 8 Engineering Suite</span>
        <div className={`w-1.5 h-1.5 rounded-full border animate-pulse ${
          watchdogStatus === 'connected' ? 'bg-green-500/20 border-green-500/40 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
          watchdogStatus === 'error' ? 'bg-red-500/20 border-red-500/40' :
          'bg-white/5 border-white/10'
        }`} />
      </div>
    </footer>
  );
};

export default WorkbenchFooter;
