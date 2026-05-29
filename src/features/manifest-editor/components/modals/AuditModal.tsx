'use client';

import React from 'react';
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
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-5xl h-full max-h-[800px] wb-surface border wb-outline rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden relative transition-colors duration-500"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between p-8 border-b wb-outline bg-black/5">
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-xs border ${statusConfig.border} ${statusConfig.bg}`}>
                <statusConfig.icon className={`w-8 h-8 ${statusConfig.color}`} />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-black uppercase tracking-[0.3em] text-foreground">Inspection Report</h2>
                <div className="flex items-center gap-3 text-[9px] font-mono font-black uppercase tracking-widest wb-text-muted">
                  <span className={statusConfig.color}>{statusConfig.label}</span>
                  <span>{"//"}</span>
                  <span>Module ID: {manifest.id}</span>
                  <span>{"//"}</span>
                  <span>Spec v7.2.3</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/20 rounded-xs text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary text-white transition-all group">
                <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                Export Certification
              </button>
              <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex gap-12">
            <AuditSummary audit={audit} manifest={manifest} statusConfig={statusConfig} />
            
            <div className="flex-1 space-y-8">
              <AuditIssuesList audit={audit} onNavigate={onNavigate} onClose={onClose} />
              <AuditGuidelines />
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t border-white/5 flex items-center justify-between bg-black/5">
             <div className="flex items-center gap-4 text-[8px] font-mono text-white/10 uppercase tracking-[0.2em]">
               <span>Fingerprint: {audit.fingerprint || 'NOT_CALCULATED'}</span>
               <span className="opacity-20">{'//'}</span>
               <span>Audit Engine v7.2.3</span>
             </div>
             <button onClick={onClose} className="px-8 py-2 bg-white/5 border border-white/10 hover:bg-white/10 wb-text text-[10px] font-black uppercase tracking-widest transition-all rounded-xs">
               Dismiss Inspection
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
