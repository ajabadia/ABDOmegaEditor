import { Shield, Terminal, Settings, Columns } from 'lucide-react';

import type { AuditResult } from '@/services/auditService';
import { ComplianceBadge } from '../shared/ComplianceBadge';
 
import ViewModeSelector from '../header/ViewModeSelector';
import ThemeToggle from '../header/ThemeToggle';
import MenuBar from './MenuBar';

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
}

export default function Header(props: HeaderProps) {
  return (
    <header className="h-11 border-b wb-outline wb-surface backdrop-blur-md flex items-center justify-between px-6 z-50 shrink-0 transition-colors duration-500">
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
        <ComplianceBadge audit={props.audit} onClick={props.onOpenAudit} />
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
          className="w-8 h-8 rounded-full border wb-outline bg-black/40 flex items-center justify-center hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all group"
          title="Global Configuration"
        >
          <Settings className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
        </button>

        <button 
          onClick={props.onToggleLogs}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-xs text-[8px] font-black uppercase tracking-widest transition-all ${props.showLogs ? 'bg-accent border-accent text-black' : 'bg-black/40 border-outline text-foreground/60 hover:border-accent/40'}`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Logs</span>
        </button>
      </div>
    </header>
  );
}
