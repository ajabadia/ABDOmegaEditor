'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, ShieldAlert, ShieldX, Download } from 'lucide-react';
import { AuditService } from '@/services/auditService';
import type { AuditResult } from '@/services/auditService';
import type { OMEGA_Manifest } from '@/types/manifest';

// Modular Sub-components
import AuditSummary from '../audit/AuditSummary';
import AuditIssuesList from '../audit/AuditIssuesList';
import AuditGuidelines from '../audit/AuditGuidelines';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  audit: AuditResult;
  manifest: OMEGA_Manifest;
}

const STATUS_CONFIG = {
  CERTIFIED: { color: 'text-[#00ff9d]', bg: 'bg-[#00ff9d]/5', border: 'border-[#00ff9d]/20', icon: ShieldCheck, label: 'CERTIFIED_READY' },
  DRAFT: { color: 'text-[#ffcc00]', bg: 'bg-[#ffcc00]/5', border: 'border-[#ffcc00]/20', icon: ShieldAlert, label: 'DRAFT_PENDING' },
  CRITICAL_FAIL: { color: 'text-[#ff3e3e]', bg: 'bg-[#ff3e3e]/5', border: 'border-[#ff3e3e]/20', icon: ShieldX, label: 'CRITICAL_FAILURE' }
};
 
export default function AuditModal({ isOpen, onClose, onNavigate, audit, manifest }: AuditModalProps) {
  if (!isOpen || !audit) return null;
 
  const handleDownload = () => {
    AuditService.downloadCertificationReport(manifest, audit);
  };
 
  const statusConfig = STATUS_CONFIG[audit.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DRAFT;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 overflow-hidden">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline rounded-xs shadow-2xl flex flex-col overflow-hidden transition-colors duration-500"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b wb-outline wb-surface-subtle shrink-0">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xs border flex items-center justify-center ${statusConfig.border} ${statusConfig.bg}`}>
                <statusConfig.icon className={`w-6 h-6 ${statusConfig.color}`} />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black uppercase tracking-widest wb-text">Inspection Report</h2>
                <div className="flex items-center gap-2 mt-1 text-[8px] md:text-[9px] font-mono font-black uppercase tracking-widest wb-text-muted">
                  <span className={statusConfig.color}>{statusConfig.label}</span>
                  <span>{"//"}</span>
                  <span>Module ID: {manifest.id}</span>
                  <span>{"//"}</span>
                  <span>Spec v7.2.3</span>
                </div>
              </div>
            </div>
            
            <button onClick={onClose} className="p-1.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-red-500/10 hover:border-red-500/30 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-12 bg-transparent">
            <AuditSummary audit={audit} manifest={manifest} statusConfig={statusConfig} />
            
            <div className="flex-1 space-y-8">
              <AuditIssuesList audit={audit} onNavigate={onNavigate} onClose={onClose} />
              <AuditGuidelines />
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t wb-outline flex justify-end gap-3 wb-surface-subtle shrink-0">
             <button onClick={onClose} className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-white/5 text-[9px] font-black uppercase tracking-widest transition-all duration-200">
               Dismiss Inspection
             </button>
             <button onClick={handleDownload} className="px-6 py-2.5 rounded-xs bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_20px_var(--wb-bloom)]">
               <Download className="w-3.5 h-3.5" />
               Export Certification
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
