import { Download, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

interface MockupFooterProps {
  onExport: () => void;
  isExporting: boolean;
  hasCriticalErrors?: boolean;
}

export const MockupFooter = ({ onExport, isExporting, hasCriticalErrors }: MockupFooterProps) => (
  <div className="h-16 border-t wb-outline flex items-center justify-between px-6 wb-surface-subtle">
    <div className="flex items-center gap-2">
       <ShieldCheck className="w-3.5 h-3.5 text-[#00ff9d]" />
       <span className="text-[7px] font-black uppercase text-[#00ff9d] tracking-widest">Literal Parity Verified</span>
    </div>
    <button 
      onClick={onExport}
      disabled={isExporting || hasCriticalErrors}
      className={`flex items-center gap-2 px-8 py-2.5 rounded-xs text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
        hasCriticalErrors 
          ? 'bg-red-500/20 text-red-500 border border-red-500/40 cursor-not-allowed' 
          : 'bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 shadow-[0_0_20px_var(--wb-bloom)]'
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
  </div>
);
