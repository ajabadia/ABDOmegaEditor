import { Shield, Settings, Columns } from 'lucide-react';

import type { AuditResult } from '@/services/auditService';
import { ComplianceBadge } from '../shared/ComplianceBadge';
 
import ViewModeSelector from '../header/ViewModeSelector';
import ThemeToggle from '../header/ThemeToggle';
import MenuBar from './MenuBar';
import { SimulationStatusBadge } from '@/features/manifest-editor/components/header/SimulationStatusBadge';
import type { SimulationBridgeState } from '@/features/manifest-editor/hooks/useSimulationBridge';

interface HeaderProps {
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportManifest: () => void;
  onExportPack: () => void;
  onExportCAD: () => void;
  onExportContract: (format: 'ts' | 'cpp') => void;
  onGenerateMockup: () => void;
  onDeploy: () => void;
  onToggleLogs: () => void;
  showLogs: boolean;
  activeTabType: 'orbital' | 'rack' | 'source' | 'history';
  onTabFocus: (type: 'orbital' | 'rack' | 'source' | 'history') => void;
  onHelp: () => void;
  uiTheme: 'dark' | 'light';
  setUiTheme: (theme: 'dark' | 'light') => void;
  audit: AuditResult;
  onOpenAudit: () => void;
  onTriggerUpload: (id: string) => void;
  onOpenAbout: () => void;
  onOpenConfig: () => void;
  onOpenCellEditor?: (() => void) | undefined;
  onOpenGallery?: (() => void) | undefined;
  onLinkDirectory?: (() => void) | undefined;
  isDirectoryLinked?: boolean;
  isSplit?: boolean;
  onToggleSplit?: () => void;
  windowStates?: { window_layers: boolean; window_properties: boolean; window_rack_properties: boolean; window_blueprints: boolean; window_info: boolean; window_history: boolean; window_logs: boolean } | undefined;
  onToggleWindow?: ((name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_info' | 'window_history' | 'window_logs') => void) | undefined;
  simulationBridge?: SimulationBridgeState;
}

export default function Header(props: HeaderProps) {
  return (
    <header className="h-11 border-b wb-outline wb-surface backdrop-blur-md flex items-center justify-between px-6 z-[100] shrink-0 transition-colors duration-500">
      {/* LEFT: ENGINEERING MENUS */}
      <div className="flex-1 flex items-center gap-4">
        <MenuBar 
          onTriggerUpload={props.onTriggerUpload}
          onExportManifest={props.onExportManifest}
          onExportPack={props.onExportPack}
          onExportCAD={props.onExportCAD}
          onExportContract={props.onExportContract}
          onDeploy={props.onDeploy}
          onReset={props.onReset}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          onToggleLogs={props.onToggleLogs}
          onHelp={props.onHelp}
          onGenerateMockup={props.onGenerateMockup}
          onTabFocus={props.onTabFocus}
          onOpenAudit={props.onOpenAudit}
          onOpenAbout={props.onOpenAbout}
          onOpenConfig={props.onOpenConfig}
          onOpenCellEditor={props.onOpenCellEditor}
          onOpenGallery={props.onOpenGallery}
          onLinkDirectory={props.onLinkDirectory}
          isDirectoryLinked={props.isDirectoryLinked}
          windowStates={props.windowStates}
          onToggleWindow={props.onToggleWindow}
        />
      </div>

      {/* CENTER: SYSTEM IDENTITY */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary/20 border border-primary/40 rounded-xs flex items-center justify-center">
            <Shield className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] wb-text whitespace-nowrap">
            OMEGA <span className="text-primary/60">Manifest Editor</span>
          </span>
        </div>
      </div>

      {/* RIGHT: SYSTEM CONTROLS */}
      <div className="flex-1 flex items-center justify-end gap-4">
        <div className="opacity-75 border border-red-500/30 rounded bg-red-500/5 line-through decoration-red-500/40" title="[Quitar] Reemplazado por barra lateral">
          <ComplianceBadge audit={props.audit} onClick={props.onOpenAudit} />
        </div>
        <div className="h-6 w-px wb-outline opacity-20 mx-1" />
        <div className="h-6 w-px wb-outline opacity-20 mx-1" />
        <div className="flex items-center gap-1">
          <ViewModeSelector viewMode={props.activeTabType} setViewMode={props.onTabFocus} />
          
          <button
            onClick={props.onToggleSplit}
            className={`w-8 h-8 rounded-xs border flex items-center justify-center transition-all ${props.isSplit ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]' : 'bg-black/40 border-outline text-foreground/40 hover:text-foreground/80 hover:border-outline/60'}`}
            title="Toggle Split View (Vertical)"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-6 w-px wb-outline opacity-20 mx-1" />
        <ThemeToggle uiTheme={props.uiTheme} setUiTheme={props.setUiTheme} />
        
        <button 
          onClick={props.onOpenConfig}
          className="w-8 h-8 rounded-full border border-red-500/40 bg-red-500/5 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-black transition-all group relative"
          title="[Quitar] Reemplazado por barra lateral"
        >
          <Settings className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {props.simulationBridge && (
          <SimulationStatusBadge 
            status={props.simulationBridge.status}
            lastSyncAt={props.simulationBridge.lastSuccessfulSyncAt}
            onForceResync={props.simulationBridge.forceResync}
          />
        )}
      </div>
    </header>
  );
}
