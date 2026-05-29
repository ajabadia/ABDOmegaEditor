'use client';

import React from 'react';
import { Download, Upload } from 'lucide-react';

interface LibraryBatchOpsProps {
  onExport: () => void;
  onImport: () => void;
}

export default function LibraryBatchOps({ onExport, onImport }: LibraryBatchOpsProps) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <button 
        onClick={onExport} 
        className="flex-1 flex items-center justify-center gap-2 py-2 bg-black/40 border wb-outline rounded-xs hover:bg-primary/5 group transition-all"
      >
        <Download className="w-3 h-3 wb-text-muted group-hover:text-primary" />
        <span className="text-[8px] font-black uppercase wb-text-muted group-hover:text-primary">Export JSON</span>
      </button>
      <button 
        onClick={onImport} 
        className="flex-1 flex items-center justify-center gap-2 py-2 bg-black/40 border wb-outline rounded-xs hover:bg-primary/5 group transition-all"
      >
        <Upload className="w-3 h-3 wb-text-muted group-hover:text-primary" />
        <span className="text-[8px] font-black uppercase wb-text-muted group-hover:text-primary">Import JSON</span>
      </button>
    </div>
  );
}
