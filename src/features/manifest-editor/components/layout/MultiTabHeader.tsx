"use client";

import React from 'react';
import { X, type LucideIcon } from 'lucide-react';
import type { WorkbenchTab, WorkbenchPaneId } from '@/features/manifest-editor/hooks/useWorkbenchState';
import type { Diagnostic } from '@/features/manifest-editor/types/diagnostics';
import { SimulationStatusBadge } from '@/features/manifest-editor/components/header/SimulationStatusBadge';
import type { SimulationBridgeState } from '@/features/manifest-editor/hooks/useSimulationBridge';

interface MultiTabHeaderProps {
  paneId: WorkbenchPaneId;
  tabs: WorkbenchTab[];
  activeTabId: string | null;
  isFocused: boolean;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onPaneFocus: () => void;
  onDiagnosticClick?: (tabId: string, diagnostic: Diagnostic) => void;
  simulationBridge?: SimulationBridgeState;
}

export default function MultiTabHeader({
  paneId,
  tabs,
  activeTabId,
  isFocused,
  onTabSelect,
  onTabClose,
  onPaneFocus,
  onDiagnosticClick,
  simulationBridge
}: MultiTabHeaderProps) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    // Avoid synchronous cascading render lint error
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (tabs.length === 0) return null;

  return (
    <div 
      className={`flex items-center bg-black/40 border-b wb-outline h-9 px-1 gap-1 select-none transition-colors duration-300 ${isFocused ? 'bg-black/60 border-primary/20' : 'border-transparent'}`}
      onClick={onPaneFocus}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const Icon = tab.icon as LucideIcon;

        return (
          <div
            key={tab.id}
            onClick={(e) => {
              e.stopPropagation();
              onTabSelect(tab.id);
            }}
            className={`
              relative flex items-center gap-2 h-7 px-3 rounded-xs cursor-pointer transition-all duration-300 group
              ${isActive 
                ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]' 
                : 'text-foreground/40 hover:text-foreground/70 hover:bg-white/5 border border-transparent'}
            `}
          >
            {/* Active Indicator Glow */}
            {isActive && mounted && (
              <div className="absolute inset-x-0 -bottom-[5px] h-[2px] bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
            )}

            {Icon && typeof Icon !== 'string' && (
              <Icon className={`w-3 h-3 ${isActive ? 'text-primary' : 'text-foreground/40 group-hover:text-foreground/60'}`} />
            )}

            <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
              {tab.title}
            </span>

            {/* Diagnostic Badges (Phase 6.3 Aggregation) */}
            {tab.diagnostics && tab.diagnostics.errorCount > 0 && (
              <div 
                className="ml-1.5 px-1 min-w-[14px] h-3.5 flex items-center justify-center bg-red-500 text-white text-[7px] font-black rounded-xs shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse-subtle cursor-help"
                title={`${tab.diagnostics.errorCount} Errors:\n${tab.diagnostics.errors.map(e => `• [${e.source}] ${e.message}`).join('\n')}`}
                onClick={(e) => {
                  if (onDiagnosticClick) {
                    e.stopPropagation();
                    onDiagnosticClick(tab.id, tab.diagnostics!.errors[0]);
                  }
                }}
              >
                {tab.diagnostics.errorCount}
              </div>
            )}

            {tab.diagnostics && tab.diagnostics.errorCount === 0 && tab.diagnostics.warningCount > 0 && (
              <div 
                className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)] cursor-help" 
                title={`${tab.diagnostics.warningCount} Warnings:\n${tab.diagnostics.warnings.map(w => `• [${w.source}] ${w.message}`).join('\n')}`}
                onClick={(e) => {
                  if (onDiagnosticClick) {
                    e.stopPropagation();
                    onDiagnosticClick(tab.id, tab.diagnostics!.warnings[0]);
                  }
                }}
              />
            )}

            {tab.diagnostics && tab.diagnostics.errorCount === 0 && tab.diagnostics.warningCount === 0 && tab.diagnostics.infoCount > 0 && (
              <div 
                className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-400/50 cursor-help" 
                title={`${tab.diagnostics.infoCount} Info:\n${tab.diagnostics.infos.map(i => `• [${i.source}] ${i.message}`).join('\n')}`}
                onClick={(e) => {
                  if (onDiagnosticClick) {
                    e.stopPropagation();
                    onDiagnosticClick(tab.id, tab.diagnostics!.infos[0]);
                  }
                }}
              />
            )}

            {/* Dirty Indicator (Aseptic Standard) */}
            {tab.isDirty && (!tab.diagnostics || tab.diagnostics.errorCount === 0) && (
              <div className="relative w-3.5 h-3.5 flex items-center justify-center ml-1">
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_4px_rgba(var(--primary-rgb),0.8)] animate-pulse-subtle" 
                  title="Unsaved changes"
                />
              </div>
            )}

            {tab.closable !== false && !tab.persistent && (
              <div className="relative w-3.5 h-3.5 flex items-center justify-center ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className={`
                    p-0.5 rounded-full hover:bg-white/10 text-foreground/20 hover:text-red-400 transition-all duration-200
                    ${tab.isDirty ? 'opacity-0 hover:opacity-100' : 'opacity-60'}
                  `}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex-1 h-full" />
      
      {simulationBridge && (
        <div className="mr-2">
          <SimulationStatusBadge 
            status={simulationBridge.status}
            lastSyncAt={simulationBridge.lastSuccessfulSyncAt}
            onForceResync={simulationBridge.forceResync}
          />
        </div>
      )}

      {/* Pane ID Indicator (Subtle) */}
      <div className="px-2 opacity-10 flex items-center">
        <span className="text-[7px] font-black uppercase tracking-tighter italic">
          PANE::{paneId.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
