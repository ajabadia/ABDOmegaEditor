'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SourceCodeBlockProps {
  isEditing: boolean;
  editedSource: string;
  setEditedSource: (v: string) => void;
  lines: string[];
  highlightRange: [number, number] | null;
  error: string | null;
}

export default function SourceCodeBlock({
  isEditing, editedSource, setEditedSource, lines, highlightRange, error
}: SourceCodeBlockProps) {
  
  const renderHighlightedLine = (line: string) => {
    const keyMatch = line.match(/^(\s*)([^:]+)(:)(.*)$/);
    if (keyMatch) {
      const [, indent, key, colon, value] = keyMatch;
      const isListItem = key.trim().startsWith('-');
      return (
        <>
          <span className="text-white/20">{indent}</span>
          {isListItem && <span className="text-white/40">- </span>}
          <span className="text-cyan-400 font-bold">{isListItem ? key.trim().substring(2) : key.trim()}</span>
          <span className="text-white/40">{colon}</span>
          <span className="text-amber-200">{value}</span>
        </>
      );
    }
    if (line.trim().startsWith('-')) return <span className="text-amber-200">{line}</span>;
    return <span>{line}</span>;
  };

  return (
    <div className={`flex-1 wb-surface border ${error ? 'border-red-500/50' : 'wb-outline'} rounded-sm overflow-hidden flex flex-col shadow-2xl transition-all duration-500 relative`}>
      <div className="flex items-center justify-between px-4 py-2 border-b wb-outline bg-black/5">
         <div className="flex items-center gap-1.5">
           <div className={`w-2 h-2 rounded-full ${isEditing ? 'bg-accent animate-pulse' : 'bg-red-500/20'}`} />
           <div className="w-2 h-2 rounded-full bg-amber-500/20" />
           <div className="w-2 h-2 rounded-full bg-green-500/20" />
           <span className="ml-4 text-[7px] font-black wb-text-muted uppercase tracking-[0.2em]">
             {isEditing ? 'Live Manual Override Mode' : 'YAML Serialized Output'}
           </span>
         </div>
         {error && (
           <div className="flex items-center gap-2 text-red-400 text-[7px] font-bold uppercase animate-bounce">
             <AlertTriangle className="w-3 h-3" />
             <span>YAML Syntax Error</span>
           </div>
         )}
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        {isEditing ? (
          <textarea
            value={editedSource}
            onChange={(e) => setEditedSource(e.target.value)}
            className="w-full h-full bg-black/20 p-6 text-[11px] font-mono text-cyan-50/80 outline-none resize-none custom-scrollbar leading-relaxed"
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full overflow-auto p-4 custom-scrollbar bg-[#0a0a0a]">
            <pre className="text-[11px] leading-relaxed font-mono text-white/80">
              {lines.map((line, idx) => {
                const isHighlighted = highlightRange && idx >= highlightRange[0] && idx <= highlightRange[1];
                return (
                  <div key={idx} className={`px-4 min-h-[1.5em] transition-colors duration-300 flex ${isHighlighted ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}>
                    <span className={`mr-4 opacity-20 select-none inline-block w-6 text-right wb-text-muted shrink-0`}>{idx + 1}</span>
                    <div className={isHighlighted ? 'font-bold' : 'opacity-80'}>{renderHighlightedLine(line)}</div>
                  </div>
                );
              })}
            </pre>
          </div>
        )}
      </div>

      {error && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-red-950/90 border-t border-red-500/20 backdrop-blur-md">
           <p className="text-[9px] font-mono text-red-300/80 leading-tight">{error}</p>
        </div>
      )}
    </div>
  );
}
