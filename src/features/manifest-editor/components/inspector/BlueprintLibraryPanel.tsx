'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Layers, Package, Layout } from 'lucide-react';
import type { OMEGA_Manifest, BlueprintDefinition } from '@/omega-ui-core/types/manifest.js';
import { adaptModuleTemplateToBlueprintDefinition } from '../../utils/blueprintUtils';
import { INDUSTRIAL_TEMPLATES } from '../../constants/templates';

interface BlueprintLibraryPanelProps {
  manifest: OMEGA_Manifest;
  onSelectBlueprint: (blueprint: BlueprintDefinition) => void;
}

/**
 * OMEGA Phase 9.4A - Blueprint Library Panel
 * Categorized browser for industrial synth architectures.
 */
export default function BlueprintLibraryPanel({
  manifest,
  onSelectBlueprint
}: BlueprintLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Extract blueprints from manifest and system registry
  const systemBlueprints = INDUSTRIAL_TEMPLATES.map(tmpl => {
    try {
      return adaptModuleTemplateToBlueprintDefinition(tmpl);
    } catch (err) {
      console.warn("[BLUEPRINT] Skipping invalid system template:", tmpl.id, err);
      return null;
    }
  });

  const manifestBlueprints = Object.values(manifest.moduleTemplates || {}).map(tmpl => {
    try {
      return adaptModuleTemplateToBlueprintDefinition(tmpl);
    } catch (err) {
      console.warn("[BLUEPRINT] Skipping invalid manifest template:", tmpl.id, err);
      return null;
    }
  });

  const blueprints = [...systemBlueprints, ...manifestBlueprints].filter((bp): bp is BlueprintDefinition => bp !== null);

  const categories = ['all', 'voice', 'fx', 'mod', 'utility'];

  const filtered = blueprints.filter(bp => {
    const matchesSearch = bp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          bp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    // In a real scenario, we'd use bp.tags or bp.category
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-[#222]">
      {/* Header */}
      <div className="p-4 border-b border-[#222] bg-[#111]">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
          <Zap className="w-3 h-3" />
          Industrial Blueprint Library
        </h3>
        
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search blueprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-md py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-600 transition-all"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-2 bg-[#0d0d0d] border-b border-[#222]">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 py-1 text-[8px] font-bold uppercase tracking-widest rounded transition-all ${
              activeCategory === cat 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 industrial-scrollbar">
        {filtered.length > 0 ? (
          filtered.map(bp => (
            <motion.button
              key={bp.blueprintId}
              whileHover={{ x: 4 }}
              onClick={() => onSelectBlueprint(bp)}
              className="w-full text-left p-3 bg-[#111] border border-[#222] rounded-lg group hover:border-blue-600/40 hover:bg-[#151515] transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="p-1.5 bg-[#1a1a1a] rounded-md border border-[#333] group-hover:border-blue-600/30">
                  <Package className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                </div>
                <span className="text-[8px] font-mono text-gray-600">v{bp.version}</span>
              </div>

              <h4 className="mt-3 text-xs font-bold text-gray-200 group-hover:text-white">{bp.name}</h4>
              <p className="mt-1 text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                {bp.description}
              </p>

              <div className="mt-3 flex gap-2">
                <div className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#222] rounded text-[8px] font-bold text-gray-600 uppercase">
                  {bp.origin}
                </div>
                {bp.placeholders && bp.placeholders.length > 0 && (
                  <div className="flex items-center gap-1 text-[8px] font-bold text-blue-500/60 uppercase">
                    <Layers className="w-2.5 h-2.5" />
                    {bp.placeholders.length} Params
                  </div>
                )}
              </div>
            </motion.button>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
            <Layout className="w-10 h-10 mb-4" />
            <p className="text-[10px] font-black uppercase">No results found</p>
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-4 bg-[#111] border-t border-[#222]">
        <p className="text-[9px] text-gray-600 leading-tight">
          <span className="text-blue-500 font-bold">PRO TIP:</span> Drag and drop blueprints directly onto rack containers to auto-inject.
        </p>
      </div>
    </div>
  );
}
