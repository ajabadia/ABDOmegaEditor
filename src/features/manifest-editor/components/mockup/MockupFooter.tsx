import { Download, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

interface MockupFooterProps {
  onExport: () => void;
  isExporting: boolean;
  hasCriticalErrors?: boolean;
}

export const MockupFooter = ({ onExport, isExporting, hasCriticalErrors }: MockupFooterProps) => (
  <div className="h-16 border-t border-white/10 flex items-center justify-center gap-4 bg-black/40">
    <button 
      onClick={onExport}
      disabled={isExporting || hasCriticalErrors}
      className={`flex items-center gap-2 px-8 py-2.5 rounded-xs text-[8px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 disabled:scale-100 ${
        hasCriticalErrors 
          ? 'bg-red-600 text-white cursor-not-allowed border border-red-400/20' 
          : 'bg-primary text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
      }`}
    >
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : hasCriticalErrors ? (
        <AlertTriangle className="w-3.5 h-3.5" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      <span>
        {isExporting 
          ? 'Processing 8K Shot...' 
          : hasCriticalErrors 
            ? 'Governance Violation: Fix Assets' 
            : 'Export 8K Studio Shot'}
      </span>
    </button>
    <div className="h-4 w-px bg-white/10 mx-2" />
    <div className="flex items-center gap-2">
       <ShieldCheck className="w-3.5 h-3.5 text-[#00ff9d]" />
       <span className="text-[7px] font-black uppercase text-[#00ff9d]">Literal Parity Verified</span>
    </div>
  </div>
);
