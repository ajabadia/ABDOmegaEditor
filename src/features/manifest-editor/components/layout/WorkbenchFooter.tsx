'use client';

import React from 'react';

interface WorkbenchFooterProps {
  watchdogStatus?: 'idle' | 'connected' | 'error';
  watchdogTime?: string | null;
}

/**
 * WorkbenchFooter (v7.2.3)
 * Industrial status bar for the OMEGA Manifest Editor.
 */
const WorkbenchFooter = ({ watchdogStatus, watchdogTime }: WorkbenchFooterProps) => {
  return (
    <footer className="h-6 border-t wb-outline wb-surface flex items-center justify-between px-6 z-50 shrink-0 transition-colors duration-500">
      <div className="flex-1 flex items-center gap-4 text-[7px] font-mono uppercase tracking-[0.2em] text-foreground/20">
        <span className="text-primary/40 font-black">Build v7.2.3</span>
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

      <div className="flex-1 flex items-center justify-center">
        {/* Governance monitoring handled in header */}
      </div>
      
      <div className="flex-1 flex items-center justify-end gap-4 text-[7px] font-mono uppercase tracking-[0.2em] text-foreground/20">
        <span>Industrial Era 7 Engineering Suite</span>
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
