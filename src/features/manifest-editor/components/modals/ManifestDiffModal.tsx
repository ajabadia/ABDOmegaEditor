'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompare, History } from 'lucide-react';
import type { ManifestDiffResult, DiffEntry } from '../../types/diff';
import { ManifestDiffViewer } from '../inspector/ManifestDiffViewer';

interface ManifestDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: ManifestDiffResult | null;
  onMergeEntries?: ((entries: DiffEntry[]) => void) | undefined;
}

/**
 * ManifestDiffModal (Phase 9.2 MVP)
 * Full-screen modal for detailed structural comparison.
 */
export default function ManifestDiffModal({ isOpen, onClose, diff, onMergeEntries }: ManifestDiffModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl h-[80vh] bg-neutral-900 border border-white/10 rounded-sm shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                  <GitCompare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Structural Comparison</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <History className="w-3 h-3 text-foreground/40" />
                    <span className="text-[9px] font-black uppercase text-foreground/40 tracking-tighter">History Snapshot vs Current Workspace</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-2 rounded-xs hover:bg-white/5 text-foreground/40 hover:text-foreground transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diff Body */}
            <div className="flex-1 overflow-hidden p-6 bg-black/20">
              <ManifestDiffViewer 
                diff={diff} 
                className="h-full" 
                onApplyEntry={(entry) => onMergeEntries?.([entry])}
                onApplyAll={(entries) => onMergeEntries?.(entries)}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xs border border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all duration-200"
              >
                Dismiss View
              </button>
              <button
                onClick={() => diff && onMergeEntries?.(diff.entries)}
                disabled={!diff || diff.entries.length === 0}
                className="px-6 py-2 rounded-xs bg-primary/20 border border-primary/40 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Merge All Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
