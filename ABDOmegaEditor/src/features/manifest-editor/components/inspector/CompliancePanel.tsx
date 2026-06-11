'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Download, ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuditService } from '@/services/auditService';
import type { AuditResult, AuditIssue } from '@/features/manifest-editor/types/diagnostics';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

interface CompliancePanelProps {
  audit: AuditResult;
  manifest: OMEGA_Manifest;
  onNavigate?: (path: string) => void;
}

const STATUS_CONFIG = {
  CERTIFIED: { color: 'text-[#00ff9d]', bg: 'bg-[#00ff9d]/5', border: 'border-[#00ff9d]/20', icon: ShieldCheck, label: 'CERTIFIED' },
  DRAFT: { color: 'text-[#ffcc00]', bg: 'bg-[#ffcc00]/5', border: 'border-[#ffcc00]/20', icon: ShieldAlert, label: 'DRAFT' },
  CRITICAL_FAIL: { color: 'text-[#ff3e3e]', bg: 'bg-[#ff3e3e]/5', border: 'border-[#ff3e3e]/20', icon: ShieldX, label: 'FAILURE' }
};

type SeverityGroup = 'critical' | 'warning' | 'info';

interface GroupedIssue extends AuditIssue {
  _group: SeverityGroup;
}

function getGroup(issue: AuditIssue): SeverityGroup {
  const s = issue.severity;
  if (s === 'error') return 'critical';
  if (s === 'warning' || s === 'audit') return 'warning';
  return 'info';
}

const GROUP_CONFIG: Record<SeverityGroup, { icon: React.ElementType; label: string; color: string; bg: string; border: string }> = {
  critical: { icon: AlertTriangle, label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20' },
  warning:  { icon: AlertCircle, label: 'Warning',  color: 'text-yellow-400', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' },
  info:     { icon: Info,        label: 'Info',     color: 'text-blue-400', bg: 'bg-blue-500/5',   border: 'border-blue-500/20' },
};

export default function CompliancePanel({ audit, manifest, onNavigate }: CompliancePanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<SeverityGroup, boolean>>({
    critical: true,
    warning: false,
    info: false,
  });

  const toggleGroup = (group: SeverityGroup) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleDownload = () => {
    AuditService.downloadCertificationReport(manifest, audit);
  };

  const statusConfig = STATUS_CONFIG[audit.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DRAFT;
  const StatusIcon = statusConfig.icon;

  // Group issues by severity
  const groupedIssues: Record<SeverityGroup, GroupedIssue[]> = { critical: [], warning: [], info: [] };
  for (const issue of audit.issues || []) {
    const group = getGroup(issue);
    groupedIssues[group].push({ ...issue, _group: group });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-[9px] font-sans select-none">
      {/* ── HEADER: Score + Status ───────────────────────────── */}
      <div className="shrink-0 p-2 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-6 h-6 rounded-xs border flex items-center justify-center ${statusConfig.border} ${statusConfig.bg}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black uppercase tracking-wider text-[8px] wb-text">Compliance</span>
              <span className={`text-[7px] font-mono font-black uppercase ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
            <div className="text-[6px] font-mono wb-text-muted truncate">{manifest.metadata?.name || manifest.id}</div>
          </div>
          <span className={`text-lg font-black font-mono ${statusConfig.color}`}>{audit.score}</span>
        </div>

        {/* Mini progress bar */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${audit.score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${statusConfig.color.replace('text-', 'bg-')}`}
          />
        </div>

        {/* Mini compliance matrix (2x2) */}
        <div className="grid grid-cols-2 gap-1 mt-1.5">
          {[
            { label: 'Governance', val: audit.checks.governance },
            { label: 'Integrity', val: audit.checks.integrity },
            { label: 'Technical', val: audit.checks.technical },
            { label: 'Aesthetic', val: audit.checks.aesthetic },
          ].map(c => (
            <div
              key={c.label}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xs border ${
                c.val ? 'border-[#00ff9d]/20 bg-[#00ff9d]/5' : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${c.val ? 'bg-[#00ff9d]' : 'bg-red-500'}`} />
              <span className={`text-[6px] font-black uppercase tracking-wider ${c.val ? 'text-[#00ff9d]' : 'text-red-400'}`}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ISSUES LIST (accordion by severity) ──────────────── */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
        {(Object.keys(GROUP_CONFIG) as SeverityGroup[]).map(group => {
          const issues = groupedIssues[group];
          if (issues.length === 0) return null;
          const cfg = GROUP_CONFIG[group];
          const isExpanded = expandedGroups[group];
          const GrpIcon = cfg.icon;

          return (
            <div key={group} className="flex flex-col border border-white/5 rounded-xs overflow-hidden">
              {/* Group header — clickable accordion */}
              <button
                onClick={() => toggleGroup(group)}
                className={`flex items-center gap-1.5 px-2 py-1.5 ${cfg.bg} ${cfg.border} border-b border-white/5 hover:bg-white/5 transition-colors text-left`}
              >
                {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                <GrpIcon className={`w-3 h-3 ${cfg.color}`} />
                <span className={`text-[7px] font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[6px] font-mono wb-text-muted ml-auto">{issues.length}</span>
              </button>

              {/* Issues */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    {issues.map((issue, idx) => (
                      <IssueCard key={idx} issue={issue} {...(onNavigate ? { onNavigate } : {})} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {audit.issues?.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2 opacity-40">
            <ShieldCheck className="w-6 h-6 text-[#00ff9d]" />
            <span className="text-[7px] font-black uppercase tracking-widest text-[#00ff9d]">All Clear</span>
            <span className="text-[6px] wb-text-muted text-center">No compliance issues detected</span>
          </div>
        )}
      </div>

      {/* ── FOOTER ACTIONS ──────────────────────────────────── */}
      <div className="shrink-0 p-2 border-t border-white/5 bg-black/20 flex gap-1.5">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xs bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-[7px] font-black uppercase tracking-wider transition-all"
        >
          <Download className="w-3 h-3" />
          Export Cert
        </button>
      </div>
    </div>
  );
}

// ── Issue Card (single issue row with accordion detail) ──────────────────

function IssueCard({ issue, onNavigate }: { issue: AuditIssue; onNavigate?: (path: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const severityColor = issue.severity === 'error'
    ? 'text-red-400 border-red-500/20'
    : issue.severity === 'warning'
      ? 'text-yellow-400 border-yellow-500/20'
      : 'text-blue-400 border-blue-500/20';

  return (
    <div className="border-b border-white/5 last:border-b-0">
      {/* Clickable row — toggle detail */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 transition-colors text-left"
      >
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityColor.split(' ')[0]}`} />
        <span className="text-[7px] font-mono font-bold wb-text truncate flex-1">{issue.message}</span>
        {expanded ? <ChevronDown className="w-2 h-2 shrink-0 wb-text-muted" /> : <ChevronRight className="w-2 h-2 shrink-0 wb-text-muted" />}
      </button>

      {/* Detail panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-1.5 flex flex-col gap-1">
              {/* Technical recommendation */}
              {issue.code && (
                <div className="text-[6px] font-mono wb-text-muted/60 leading-relaxed">
                  <span className="text-[6px] font-black uppercase tracking-wider wb-text-muted/40">Code: </span>
                  {issue.code}
                </div>
              )}

              {/* Locate in Workbench */}
              {onNavigate && issue.path && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(issue.path!);
                  }}
                  className="flex items-center gap-1 text-[6px] font-black uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                >
                  <Target className="w-2.5 h-2.5" />
                  Locate in Workbench
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
