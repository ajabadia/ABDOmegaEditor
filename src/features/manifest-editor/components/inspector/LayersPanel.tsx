'use client';

import React, { useState, useMemo } from 'react';
import { 
  Eye, EyeOff, Lock, Unlock, Search, 
  Sliders, Radio, ListFilter, SlidersHorizontal, Trash2, Box, Plus
} from 'lucide-react';
import type { OMEGA_Manifest, ManifestEntity } from '@/omega-ui-core/types/manifest';

interface LayersPanelProps {
  manifest: OMEGA_Manifest;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  hiddenNodeIds: string[];
  lockedNodeIds: string[];
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemoveItem?: ((id: string) => void) | undefined;
  onAddEntity?: (type: 'control' | 'jack') => void;
}

export default function LayersPanel({
  manifest,
  selectedItemId,
  onSelectItem,
  hiddenNodeIds,
  lockedNodeIds,
  onToggleVisibility,
  onToggleLock,
  onRemoveItem,
  onAddEntity
}: LayersPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'containers' | 'controls' | 'jacks'>('all');

  const containers = useMemo(() => manifest.ui?.layout?.containers || [], [manifest]);
  const controls = useMemo(() => (manifest.ui?.controls as ManifestEntity[]) || [], [manifest]);
  const jacks = useMemo(() => (manifest.ui?.jacks as ManifestEntity[]) || [], [manifest]);

  const filteredContainers = useMemo(() => {
    return containers.filter(c => {
      const matchSearch = (c.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.label || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch && (filterType === 'all' || filterType === 'containers');
    });
  }, [containers, searchTerm, filterType]);

  const filteredControls = useMemo(() => {
    return controls.filter(c => {
      const matchSearch = (c.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.label || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch && (filterType === 'all' || filterType === 'controls');
    });
  }, [controls, searchTerm, filterType]);

  const filteredJacks = useMemo(() => {
    return jacks.filter(j => {
      const matchSearch = (j.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (j.label || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch && (filterType === 'all' || filterType === 'jacks');
    });
  }, [jacks, searchTerm, filterType]);

  const totalCount = filteredContainers.length + filteredControls.length + filteredJacks.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden wb-surface text-[9px] font-sans">
      {/* SEARCH AND FILTERS */}
      <div className="p-2 border-b wb-outline flex flex-col gap-1.5 wb-surface-subtle shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-3 h-3 wb-text-muted opacity-40" />
          <input
            type="text"
            placeholder="Search primitives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 wb-surface-strong border wb-outline text-[9px] uppercase tracking-wider rounded-xs wb-text placeholder-wb-text-muted/40 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex gap-1">
          {(['all', 'containers', 'controls', 'jacks'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2 py-0.5 border rounded-xs uppercase tracking-widest text-[7px] font-black transition-all ${
                filterType === type 
                  ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' 
                  : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* LAYERS TREE LIST */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-2 select-none">
        
        {/* CATEGORY: CONTAINERS */}
        {filteredContainers.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <div className="px-1.5 py-0.5 text-[7px] font-black wb-text-muted uppercase tracking-widest flex items-center gap-1">
              <Box className="w-2.5 h-2.5 text-blue-400" />
              <span>Containers / Modules ({filteredContainers.length})</span>
            </div>
            
            {filteredContainers.map((container) => {
              const isSelected = selectedItemId === container.id;
              const isHidden = hiddenNodeIds.includes(container.id);
              const isLocked = lockedNodeIds.includes(container.id);
              
              return (
                <div
                  key={container.id}
                  onClick={() => onSelectItem(container.id)}
                  className={`flex items-center justify-between px-2 py-1 border rounded-xs cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.05)]' 
                      : 'wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <Box className={`w-3 h-3 shrink-0 ${isSelected ? 'text-primary' : 'wb-text-muted opacity-60'}`} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">
                        {container.id}
                      </span>
                      {container.label && (
                        <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">
                          {container.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTION TOGGLES */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* VISIBILITY EYE */}
                    <button
                      onClick={() => onToggleVisibility(container.id)}
                      className={`p-1 rounded hover:bg-primary/10 transition-colors ${
                        isHidden ? 'text-red-400' : 'wb-text-muted hover:wb-text'
                      }`}
                      title={isHidden ? "Show component" : "Hide component"}
                    >
                      {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>

                    {/* LOCK PADLOCK */}
                    <button
                      onClick={() => onToggleLock(container.id)}
                      className={`p-1 rounded hover:bg-primary/10 transition-colors ${
                        isLocked ? 'text-amber-400' : 'wb-text-muted hover:wb-text'
                      }`}
                      title={isLocked ? "Unlock component position" : "Lock component position"}
                    >
                      {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    {/* REMOVE TRASH */}
                    {onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(container.id)}
                        className="p-1 rounded wb-text-muted hover:text-red-400 hover:bg-primary/10 transition-colors"
                        title="Delete Container & Contents"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CATEGORY: CONTROLS */}
        {(filterType === 'all' || filterType === 'controls') && (
          <div className="flex flex-col gap-0.5 mt-1.5">
            <div className="px-1.5 py-0.5 text-[7px] font-black wb-text-muted uppercase tracking-widest flex justify-between items-center">
              <div className="flex items-center gap-1">
                <Sliders className="w-2.5 h-2.5" />
                <span>Param Controls ({filteredControls.length})</span>
              </div>
              {onAddEntity && (
                <button 
                  onClick={() => onAddEntity('control')}
                  className="hover:text-primary transition-colors cursor-pointer"
                  title="Add Param Control"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            
            {filteredControls.map((control) => {
              const isSelected = selectedItemId === control.id;
              const isHidden = hiddenNodeIds.includes(control.id);
              const isLocked = lockedNodeIds.includes(control.id);
              
              return (
                <div
                  key={control.id}
                  onClick={() => onSelectItem(control.id)}
                  className={`flex items-center justify-between px-2 py-1 border rounded-xs cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.05)]' 
                      : 'wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <SlidersHorizontal className={`w-3 h-3 shrink-0 ${isSelected ? 'text-primary' : 'wb-text-muted opacity-60'}`} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">
                        {control.id}
                      </span>
                      {control.label && (
                        <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">
                          {control.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTION TOGGLES */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* VISIBILITY EYE */}
                    <button
                      onClick={() => onToggleVisibility(control.id)}
                      className={`p-1 rounded hover:bg-primary/10 transition-colors ${
                        isHidden ? 'text-red-400' : 'wb-text-muted hover:wb-text'
                      }`}
                      title={isHidden ? "Show component" : "Hide component"}
                    >
                      {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>

                    {/* LOCK PADLOCK */}
                    <button
                      onClick={() => onToggleLock(control.id)}
                      className={`p-1 rounded hover:bg-primary/10 transition-colors ${
                        isLocked ? 'text-amber-400' : 'wb-text-muted hover:wb-text'
                      }`}
                      title={isLocked ? "Unlock component position" : "Lock component position"}
                    >
                      {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    {/* REMOVE TRASH */}
                    {onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(control.id)}
                        className="p-1 rounded wb-text-muted hover:text-red-400 hover:bg-primary/10 transition-colors"
                        title="Delete Control"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CATEGORY: JACKS */}
        {(filterType === 'all' || filterType === 'jacks') && (
          <div className="flex flex-col gap-0.5 mt-1.5">
            <div className="px-1.5 py-0.5 text-[7px] font-black wb-text-muted uppercase tracking-widest flex justify-between items-center">
              <div className="flex items-center gap-1">
                <Radio className="w-2.5 h-2.5" />
                <span>Signal Ports ({filteredJacks.length})</span>
              </div>
              {onAddEntity && (
                <button 
                  onClick={() => onAddEntity('jack')}
                  className="hover:text-primary transition-colors cursor-pointer"
                  title="Add Signal Port"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            
            {filteredJacks.map((jack) => {
              const isSelected = selectedItemId === jack.id;
              const isHidden = hiddenNodeIds.includes(jack.id);
              const isLocked = lockedNodeIds.includes(jack.id);
              
              return (
                <div
                  key={jack.id}
                  onClick={() => onSelectItem(jack.id)}
                  className={`flex items-center justify-between px-2 py-1 border rounded-xs cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.05)]' 
                      : 'wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <Radio className={`w-3 h-3 shrink-0 ${isSelected ? 'text-primary' : 'wb-text-muted opacity-60'}`} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">
                        {jack.id}
                      </span>
                      {jack.label && (
                        <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">
                          {jack.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTION TOGGLES */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* VISIBILITY EYE */}
                    <button
                      onClick={() => onToggleVisibility(jack.id)}
                      className={`p-1 rounded hover:bg-primary/10 transition-colors ${
                        isHidden ? 'text-red-400' : 'wb-text-muted hover:wb-text'
                      }`}
                      title={isHidden ? "Show component" : "Hide component"}
                    >
                      {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>

                    {/* LOCK PADLOCK */}
                    <button
                      onClick={() => onToggleLock(jack.id)}
                      className={`p-1 rounded hover:bg-primary/10 transition-colors ${
                        isLocked ? 'text-amber-400' : 'wb-text-muted hover:wb-text'
                      }`}
                      title={isLocked ? "Unlock component position" : "Lock component position"}
                    >
                      {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    {/* REMOVE TRASH */}
                    {onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(jack.id)}
                        className="p-1 rounded wb-text-muted hover:text-red-400 hover:bg-primary/10 transition-colors"
                        title="Delete Jack"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalCount === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 gap-1.5">
            <ListFilter className="w-5 h-5 wb-text" />
            <span className="text-[7px] font-black uppercase tracking-widest wb-text">No layers found</span>
          </div>
        )}
      </div>
    </div>
  );
}
