'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BlueprintDefinition, BlueprintPlaceholderDefinition, BlueprintPlaceholderValues } from '@/omega-ui-core/types/manifest';

interface BlueprintPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: BlueprintDefinition | null;
  onConfirm: (values: BlueprintPlaceholderValues) => void;
  onUpdatePlaceholder?: ((id: string, value: string | number | boolean) => void) | undefined;
}

/**
 * OMEGA Phase 9.4A - Industrial Blueprint Prompt Dialog
 * Form generator for formal BlueprintPlaceholderDefinition (§A.2).
 */
export default function BlueprintPromptDialog({
  isOpen,
  onClose,
  blueprint,
  onConfirm,
  onUpdatePlaceholder
}: BlueprintPromptDialogProps) {
  const [values, setValues] = useState<BlueprintPlaceholderValues>(() => {
    if (!blueprint) return {};
    const initial: BlueprintPlaceholderValues = {};
    (blueprint.placeholders || []).forEach(p => {
      if (p.defaultValue !== undefined) {
        initial[p.id] = p.defaultValue;
      }
    });
    return initial;
  });

  if (!blueprint || !blueprint.placeholders) return null;

  const handleConfirm = () => {
    // Validate required fields
    const missing = (blueprint.placeholders || []).filter(p => p.required && (values[p.id] === undefined || values[p.id] === ''));
    if (missing.length > 0) {
      alert(`Missing required parameters: ${missing.map(p => p.label).join(', ')}`);
      return;
    }
    onConfirm(values);
  };

  const updateValue = (id: string, value: string | number | boolean) => {
    setValues(prev => ({ ...prev, [id]: value }));
    onUpdatePlaceholder?.(id, value);
  };

  const renderInput = (p: BlueprintPlaceholderDefinition) => {
    const value = values[p.id] ?? '';

    switch (p.valueType) {
      case 'enumValue':
        return (
          <select
            className="w-full px-4 py-2 bg-[#111] border border-[#333] rounded text-white focus:outline-none focus:border-blue-500"
            value={String(value)}
            onChange={(e) => updateValue(p.id, e.target.value)}
          >
            {(p.allowedValues || []).map((opt: { label: string; value: string | number | boolean } | string | number | boolean) => (
              <option key={String(typeof opt === 'object' ? opt.value : opt)} value={String(typeof opt === 'object' ? opt.value : opt)}>{String(typeof opt === 'object' ? opt.label : opt)}</option>
            ))}
          </select>
        );
      
      case 'color':
        return (
          <input
            type="color"
            className="w-full h-10 bg-[#222] border border-[#444] rounded cursor-pointer"
            value={String(value || '#0070f3')}
            onChange={(e) => updateValue(p.id, e.target.value)}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id={`p-${p.id}`}
              className="w-5 h-5 accent-blue-600 rounded"
              checked={!!value}
              onChange={(e) => updateValue(p.id, e.target.checked)}
            />
            <label htmlFor={`p-${p.id}`} className="text-sm text-gray-400">Enable {p.label}</label>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            className="w-full px-4 py-2 bg-[#111] border border-[#333] rounded text-white focus:outline-none focus:border-blue-500"
            value={Number(value)}
            onChange={(e) => updateValue(p.id, Number(e.target.value))}
          />
        );

      default:
        return (
          <input
            type="text"
            className="w-full px-4 py-2 bg-[#111] border border-[#333] rounded text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder={p.hint || `Enter ${p.label}...`}
            value={String(value)}
            onChange={(e) => updateValue(p.id, e.target.value)}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-[#333] bg-gradient-to-br from-[#222] to-[#1a1a1a]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="p-1.5 bg-blue-600/20 rounded-lg text-blue-400">⚡</span>
                    {blueprint.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-mono">
                    Blueprint Injection • v{blueprint.version}
                  </p>
                </div>
                <div className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded text-gray-400 uppercase">
                  {blueprint.origin}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto industrial-scrollbar">
              {blueprint.description && (
                <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-blue-600/30 pl-4 py-1">
                  {blueprint.description}
                </p>
              )}

              <div className="space-y-6 pt-2">
                {(blueprint.placeholders || []).map((p) => (
                  <div key={p.id} className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                        {p.label}
                        {p.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <span className="text-[9px] text-gray-500 font-mono bg-[#222] px-1.5 rounded">
                        {p.valueType}
                      </span>
                    </div>
                    
                    {renderInput(p)}
                    
                    {p.description && (
                      <p className="text-[10px] text-gray-500 leading-tight">
                        {p.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-[#111] border-t border-[#333] flex justify-end items-center gap-4">
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-900/30 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                Assemble Module
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
