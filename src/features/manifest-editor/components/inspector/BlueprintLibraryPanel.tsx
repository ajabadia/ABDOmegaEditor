'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Layers, Package, Layout } from 'lucide-react';
import type { OMEGA_Manifest, BlueprintDefinition } from '@/omega-ui-core/types/manifest.js';
import { adaptModuleTemplateToBlueprintDefinition } from '../../utils/blueprintUtils';

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
  const [systemBlueprints, setSystemBlueprints] = useState<BlueprintDefinition[]>([]);

  // Load dynamic blueprints from catalog
  React.useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const res = await fetch('/blueprints/index.json');
        if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
        const catalog = await res.json();
        
        const loaded = await Promise.all(
          catalog.map(async (item: { id: string; path: string }) => {
            try {
              const bpRes = await fetch(item.path);
              if (!bpRes.ok) throw new Error(`Blueprint fetch failed: ${bpRes.status}`);
              const bpData = await bpRes.json();
              return adaptModuleTemplateToBlueprintDefinition(bpData);
            } catch (err) {
              console.warn("[BLUEPRINT] Error loading dynamic template:", item.id, err);
              return null;
            }
          })
        );
        
        if (active) {
          setSystemBlueprints(loaded.filter((bp): bp is BlueprintDefinition => bp !== null));
        }
      } catch (err) {
        console.error("[BLUEPRINT] Failed to load blueprints catalog:", err);
      }
    }
    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  const manifestBlueprints = Object.values(manifest.moduleTemplates || {}).map(tmpl => {
    try {
      return adaptModuleTemplateToBlueprintDefinition(tmpl);
    } catch (err) {
      console.warn("[BLUEPRINT] Skipping invalid manifest template:", tmpl.id, err);
      return null;
    }
  });

  const blueprintsMap = new Map<string, BlueprintDefinition>();
  
  systemBlueprints.forEach(bp => {
    if (bp) blueprintsMap.set(bp.blueprintId, bp);
  });
  
  manifestBlueprints.forEach(bp => {
    if (bp) blueprintsMap.set(bp.blueprintId, bp);
  });

  const blueprints = Array.from(blueprintsMap.values());

  const categories = ['all', 'voice', 'fx', 'mod', 'utility'];

  const getCategoryForBlueprint = (bp: BlueprintDefinition): string => {
    const id = bp.blueprintId.toLowerCase();
    const name = bp.name.toLowerCase();
    
    if (id.includes('vcf') || id.includes('vco') || id.includes('osc') || name.includes('filter') || name.includes('oscillator') || name.includes('vco') || name.includes('vcf')) {
      return 'voice';
    }
    if (id.includes('io') || id.includes('jack') || id.includes('port') || id.includes('grid') || id.includes('macro') || name.includes('grid') || name.includes('i/o') || name.includes('jack')) {
      return 'utility';
    }
    if (id.includes('delay') || id.includes('reverb') || id.includes('chorus') || id.includes('fx') || name.includes('delay') || name.includes('reverb') || name.includes('fx')) {
      return 'fx';
    }
    if (id.includes('lfo') || id.includes('env') || id.includes('adsr') || id.includes('mod') || name.includes('lfo') || name.includes('envelope') || name.includes('modulator')) {
      return 'mod';
    }
    return 'voice';
  };

  const filtered = blueprints.filter(bp => {
    const matchesSearch = bp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          bp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === 'all') return matchesSearch;
    return matchesSearch && getCategoryForBlueprint(bp) === activeCategory;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden wb-surface text-[9px] font-sans">
      {/* SEARCH AND FILTERS (Identical to LayersPanel layout) */}
      <div className="p-2 border-b wb-outline flex flex-col gap-1.5 wb-surface-subtle shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-3 h-3 wb-text-muted opacity-40" />
          <input
            type="text"
            placeholder="Search blueprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 wb-surface-strong border wb-outline text-[9px] uppercase tracking-wider rounded-xs wb-text placeholder-wb-text-muted/40 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 border rounded-xs uppercase tracking-widest text-[7px] font-black transition-all ${
                activeCategory === cat 
                  ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                  : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* LIST (Identical scroll and margin parameters to LayersPanel) */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-2 select-none">
        {filtered.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            <div className="px-1.5 py-0.5 text-[7px] font-black wb-text-muted uppercase tracking-widest flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-primary" />
              <span>Available blueprints ({filtered.length})</span>
            </div>

            {filtered.map((bp) => (
              <div
                key={bp.blueprintId}
                onClick={() => onSelectBlueprint(bp)}
                className="flex items-center justify-between px-2 py-1.5 border rounded-xs cursor-pointer transition-all wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text"
              >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <Package className="w-3 h-3 shrink-0 wb-text-muted opacity-60" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">
                      {bp.name}
                    </span>
                    {bp.description && (
                      <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">
                        {bp.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {bp.placeholders && bp.placeholders.length > 0 && (
                    <span className="text-[6px] font-mono font-bold bg-primary/10 border border-primary/20 text-primary px-1 rounded-xs uppercase">
                      {bp.placeholders.length} P
                    </span>
                  )}
                  <span className="text-[6px] font-mono wb-text-muted opacity-60">
                    v{bp.version}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 gap-1.5">
            <Package className="w-5 h-5 wb-text" />
            <span className="text-[7px] font-black uppercase tracking-widest wb-text">No blueprints found</span>
          </div>
        )}
      </div>

    </div>
  );
}
