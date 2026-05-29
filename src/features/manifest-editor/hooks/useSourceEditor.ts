'use client';

import { useState, useEffect, useMemo } from 'react';
import yaml from 'js-yaml';

import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

export const useSourceEditor = (
  manifest: OMEGA_Manifest,
  selectedItemId: string | null,
  onUpdate?: (newManifest: OMEGA_Manifest) => void
) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSource, setEditedSource] = useState('');
  const [error, setError] = useState<string | null>(null);

  const yamlSource = useMemo(() => yaml.dump(manifest, { 
    indent: 2, 
    lineWidth: -1, 
    noRefs: true,
    sortKeys: false,
    schema: yaml.JSON_SCHEMA 
  }), [manifest]);

  useEffect(() => {
    if (!isEditing) {
      setTimeout(() => setEditedSource(yamlSource), 0);
    }
  }, [yamlSource, isEditing]);

  const handleSave = () => {
    try {
      const parsed = yaml.load(editedSource);
      if (parsed && typeof parsed === 'object') {
        onUpdate?.(parsed as OMEGA_Manifest);
        setIsEditing(false);
        setError(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const lines = (isEditing ? editedSource : yamlSource).split('\n');
  
  // Highlighting Logic for focus
  const highlightRange = useMemo(() => {
    if (!selectedItemId || isEditing) return null;
    
    const idPattern = new RegExp(`id:\\s*['"]?${selectedItemId}['"]?\\s*$`);
    const idLineIdx = lines.findIndex(line => idPattern.test(line));
    
    if (idLineIdx !== -1) {
      let startIdx = idLineIdx;
      while (startIdx > 0 && !lines[startIdx].trim().startsWith('-') && !lines[startIdx-1].trim().endsWith(':')) {
        startIdx--;
      }
      
      const baseIndent = lines[startIdx].search(/\S/);
      let endIdx = idLineIdx + 1;
      while (endIdx < lines.length) {
        if (lines[endIdx].trim() !== '') {
          const lineIndent = lines[endIdx].search(/\S/);
          if (lineIndent !== -1 && lineIndent <= baseIndent && (lines[endIdx].trim().startsWith('-') || lines[endIdx].includes(':'))) {
            if (lineIndent < baseIndent || (lineIndent === baseIndent && lines[endIdx].trim().startsWith('-'))) break;
          }
        }
        endIdx++;
      }
      return [startIdx, endIdx - 1] as [number, number];
    }
    return null;
  }, [selectedItemId, isEditing, lines]);

  return {
    isEditing, setIsEditing,
    editedSource, setEditedSource,
    error, setError,
    yamlSource,
    lines,
    highlightRange,
    handleSave
  };
};
