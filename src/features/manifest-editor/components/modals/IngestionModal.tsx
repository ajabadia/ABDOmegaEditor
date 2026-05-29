'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ScrollText, X, AlertTriangle, ChevronRight } from 'lucide-react';
import { useIngestionLogic } from '@/features/manifest-editor/hooks/useIngestionLogic';
import type { IngestionFile } from '@/features/manifest-editor/hooks/useIngestionLogic';
import IngestionFileList from '../ingestion/IngestionFileList';

interface IngestionModalProps {
  files: File[];
  onConfirm: (selectedFiles: File[]) => void;
  onCancel: () => void;
}

export default function IngestionModal({ files, onConfirm, onCancel }: IngestionModalProps) {
  const { ingestionList, toggleSelect, setPrimary, manifestCount, wasmCount, contractCount } = useIngestionLogic(files);

  const handleConfirm = () => {
    onConfirm(ingestionList.filter((i: IngestionFile) => i.selected).map((i: IngestionFile) => i.file));
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl wb-surface border wb-outline rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-colors duration-500"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] wb-text">Industrial Ingestion Wizard</h2>
              <p className="text-[9px] wb-text-muted uppercase font-bold mt-0.5">OMEGA Era 7.2.3 • Asset Synchronization</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/20 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {(manifestCount > 1 || wasmCount > 1 || contractCount > 1) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xs flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-tight">
                Multiple primary files detected. Please select canonical items.
              </p>
            </div>
          )}

          <IngestionFileList ingestionList={ingestionList} setPrimary={setPrimary} toggleSelect={toggleSelect} />
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <button onClick={onCancel} className="px-6 py-2 text-[10px] font-black uppercase wb-text-muted hover:wb-text transition-colors">
            Abort Ingestion
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!ingestionList.some((i: IngestionFile) => i.selected)}
            className="px-8 py-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xs hover:bg-primary/80 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_var(--wb-bloom)]"
          >
            <span>Confirm Injection</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
