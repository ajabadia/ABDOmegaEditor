'use client';

/**
 * @purpose Proporciona un componente de navegación para seleccionar diferentes categorías en el editor del manifiesto OMEGA, permitiendo a los usuarios cambiar entre ver todos los elementos y categorías específicas.
 * @lastUpdated 2026-06-14T16:39:54.564Z
 */

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
