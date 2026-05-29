'use client';

import { useState, useEffect } from 'react';

export interface IngestionFile {
  file: File;
  id: string;
  type: 'manifest' | 'wasm' | 'contract' | 'resource';
  selected: boolean;
}

export const useIngestionLogic = (files: File[]) => {
  const [ingestionList, setIngestionList] = useState<IngestionFile[]>([]);

  useEffect(() => {
    const list: IngestionFile[] = files.map(f => {
      let type: IngestionFile['type'] = 'resource';
      if (f.name.endsWith('.acemm')) type = 'manifest';
      else if (f.name.endsWith('.wasm') || f.name.endsWith('.ace')) type = 'wasm';
      else if (f.name.endsWith('.json')) type = 'contract';
      
      return {
        file: f,
        id: Math.random().toString(36).substr(2, 9),
        type,
        selected: true 
      };
    });

    const seen = new Set();
    const resolved = list.map(item => {
      if (item.type === 'resource') return item;
      if (seen.has(item.type)) return { ...item, selected: false };
      seen.add(item.type);
      return item;
    });

    setTimeout(() => setIngestionList(resolved), 0);
  }, [files]);

  const toggleSelect = (id: string) => {
    setIngestionList(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const setPrimary = (id: string) => {
    const target = ingestionList.find(i => i.id === id);
    if (!target) return;

    setIngestionList(prev => prev.map(item => {
      if (item.type === target.type) {
        return { ...item, selected: item.id === id };
      }
      return item;
    }));
  };

  return {
    ingestionList,
    toggleSelect,
    setPrimary,
    manifestCount: ingestionList.filter(i => i.type === 'manifest').length,
    wasmCount: ingestionList.filter(i => i.type === 'wasm').length,
    contractCount: ingestionList.filter(i => i.type === 'contract').length
  };
};
