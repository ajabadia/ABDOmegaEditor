'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { GroupNode } from '../../../../../omega-ui-core/types/rack';

export interface GroupEditorProps {
  node: GroupNode;
  onChange: (updates: Partial<GroupNode>) => void;
  /** Called when user clicks "Save as Blueprint..." */
  onSaveAsBlueprint?: ((group: GroupNode) => void) | undefined;
  /** Called when user clicks "Ungroup" to dissolve this group */
  onUngroupNode?: ((groupId: string) => void) | undefined;
}

/** Accordion row for editing a single child's parameters (Label, Variant, Bind). */
function ChildAccordionRow({
  child,
  index,
  onUpdateChild,
}: {
  child: GroupNode['children'][number];
  index: number;
  onUpdateChild: (updates: Partial<GroupNode['children'][number]>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/5 rounded bg-black/20 overflow-hidden">
      {/* Accordion header */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[9px] text-gray-500 w-4 shrink-0">{index + 1}</span>
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-primary shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
        )}
        <span className="text-[8px] font-mono text-gray-500 uppercase w-16 shrink-0">{child.type}</span>
        <span className="text-[9px] font-bold text-white flex-1 truncate">{child.label || child.id}</span>
      </div>

      {/* Expandable editing panel */}
      {isOpen && (
        <div className="p-2 border-t border-white/5 bg-black/40 space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-[8px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Label</label>
            <input
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white font-mono"
              value={child.label || ''}
              onChange={(e) => onUpdateChild({ label: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[8px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Variant</label>
            <input
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white font-mono"
              value={child.style?.variant || ''}
              onChange={(e) =>
                onUpdateChild({
                  style: { ...child.style, variant: e.target.value },
                })
              }
            />
          </div>
          {(child.type === 'port' || child.bind) && (
            <div className="flex items-center gap-2">
              <label className="text-[8px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Bind</label>
              <input
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white font-mono"
                value={child.bind?.target || ''}
                onChange={(e) =>
                  onUpdateChild({
                    bind: e.target.value ? { target: e.target.value } : undefined,
                  })
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GroupEditor({ node, onChange, onSaveAsBlueprint, onUngroupNode }: GroupEditorProps) {
  const handleUpdateChild = (
    childId: string,
    childUpdates: Partial<GroupNode['children'][number]>
  ) => {
    const updatedChildren = node.children.map((c) =>
      c.id === childId ? ({ ...c, ...childUpdates } as GroupNode['children'][number]) : c
    );
    onChange({ children: updatedChildren });
  };

  return (
    <div className="space-y-3 p-3">
      {/* Group identity header */}
      <div className="text-[8px] text-gray-500 font-mono truncate">ID: {node.id}</div>

      {/* Group label */}
      <div className="flex items-center gap-2">
        <label className="text-[9px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Label</label>
        <input
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white font-mono"
          value={node.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      {/* Group position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[8px] text-gray-500 block uppercase tracking-wider">X</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-[9px] text-white font-mono"
            type="number"
            value={node.pos.x}
            onChange={(e) => onChange({ pos: { x: Number(e.target.value), y: node.pos.y } })}
          />
        </div>
        <div>
          <label className="text-[8px] text-gray-500 block uppercase tracking-wider">Y</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-[9px] text-white font-mono"
            type="number"
            value={node.pos.y}
            onChange={(e) => onChange({ pos: { x: node.pos.x, y: Number(e.target.value) } })}
          />
        </div>
      </div>

      {/* Accordion children list */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[8px] text-gray-500 uppercase tracking-wider">
            Group Components ({node.children.length})
          </label>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          {node.children.map((child, i) => (
            <ChildAccordionRow
              key={child.id}
              child={child}
              index={i}
              onUpdateChild={(upd) => handleUpdateChild(child.id, upd)}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <button
        onClick={() => onUngroupNode?.(node.id)}
        className="w-full text-[8px] font-black uppercase tracking-widest text-yellow-400 border border-yellow-400/30 rounded py-1.5 hover:bg-yellow-400/10 transition-all"
      >
        Ungroup
      </button>

      <button
        onClick={() => onSaveAsBlueprint?.(node)}
        className="w-full text-[8px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-400/30 rounded py-1.5 hover:bg-cyan-400/10 transition-all"
      >
        Save as Blueprint...
      </button>
    </div>
  );
}
