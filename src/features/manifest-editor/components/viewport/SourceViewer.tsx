'use client';

import React from 'react';
import SourceHeader from '../source/SourceHeader';
import SourceCodeBlock from '../source/SourceCodeBlock';
import { useSourceEditor } from '@/features/manifest-editor/hooks/useSourceEditor';

import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

interface SourceViewerProps {
  manifest: OMEGA_Manifest;
  selectedItemId: string | null;
  onUpdate?: (newManifest: OMEGA_Manifest) => void;
}

export default function SourceViewer({ manifest, selectedItemId, onUpdate }: SourceViewerProps) {
  const editor = useSourceEditor(manifest, selectedItemId, onUpdate);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editor.yamlSource);
  };

  return (
    <div className="h-full flex flex-col wb-bg p-8 overflow-hidden font-mono transition-colors duration-500">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full space-y-4">
        <SourceHeader 
          manifestId={manifest.id || 'unnamed_module'}
          isEditing={editor.isEditing}
          setIsEditing={editor.setIsEditing}
          copyToClipboard={copyToClipboard}
          handleSave={editor.handleSave}
          cancelEdit={() => { editor.setIsEditing(false); editor.setError(null); }}
        />

        <SourceCodeBlock 
          isEditing={editor.isEditing}
          editedSource={editor.editedSource}
          setEditedSource={editor.setEditedSource}
          lines={editor.lines}
          highlightRange={editor.highlightRange}
          error={editor.error}
        />

        <div className="text-center">
           <p className="text-[7px] wb-text-muted font-black uppercase tracking-[0.4em]">
             {editor.isEditing 
               ? 'Caution: Direct manipulation bypasses visual safety constraints' 
               : 'Aseptic Engineering Standard V7.2.3'}
           </p>
        </div>
      </div>
    </div>
  );
}
