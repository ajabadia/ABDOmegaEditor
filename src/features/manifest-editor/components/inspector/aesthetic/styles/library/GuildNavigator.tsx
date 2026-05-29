'use client';

import React from 'react';
import type { ElementCategory } from '@/omega-ui-core/governance/ElementCatalog';

interface GuildNavigatorProps {
  categories: ElementCategory[];
  activeGuild: ElementCategory | 'ALL';
  onSelect: (guild: ElementCategory | 'ALL') => void;
}

export default function GuildNavigator({ categories, activeGuild, onSelect }: GuildNavigatorProps) {
  return (
    <div className="flex flex-wrap gap-1.5 border-b wb-outline pb-4">
      <button
        onClick={() => onSelect('ALL')}
        className={`px-2.5 py-1 rounded-xs text-[7px] font-black uppercase tracking-widest transition-all ${
          activeGuild === 'ALL' 
            ? 'bg-primary text-black' 
            : 'wb-surface-subtle wb-text-muted hover:wb-text'
        }`}
      >
        ALL
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-2.5 py-1 rounded-xs text-[7px] font-black uppercase tracking-widest transition-all ${
            activeGuild === cat 
              ? 'bg-primary text-black' 
              : 'wb-surface-subtle wb-text-muted hover:wb-text'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
