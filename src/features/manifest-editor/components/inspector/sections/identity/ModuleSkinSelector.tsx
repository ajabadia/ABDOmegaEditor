'use client';

import React from 'react';
import { Palette } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { OMEGA_THEMES } from '@/constants/manifest-editor/themes';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';

interface ModuleSkinSelectorProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
}

export default function ModuleSkinSelector({ manifest, onUpdate }: ModuleSkinSelectorProps) {
  return (
    <InspectorCollapsible title="Global UI Skin" icon={Palette}>
      <div className="space-y-3 pt-2">
        <p className="text-[7px] wb-text-muted font-bold uppercase tracking-tighter italic">
          Choose the canonical rendering skin for the module.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {OMEGA_THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => {
                onUpdate({ 
                  ui: { 
                    ...manifest.ui, 
                    skin: theme.ui.skin,
                    skinMode: 'standard',
                    colors: { ...theme.ui.colors },
                    palette: { 
                      primary: theme.ui.colors.accent, 
                      secondary: '#ff8c00', 
                      utility: '#a0a0a0', 
                      feedback: '#32cd32' 
                    },
                    lighting: { ...theme.ui.lighting },
                    typography: { 
                      ...manifest.ui.typography,
                      ...theme.ui.typography 
                    },
                    layout: {
                      width: manifest.ui?.layout?.width ?? 800,
                      height: manifest.ui?.layout?.height ?? 600,
                      ...manifest.ui?.layout,
                      containers: manifest.ui?.layout?.containers || []
                    }
                  },
                  metadata: {
                    ...manifest.metadata,
                    rack: {
                      width: manifest.metadata.rack?.width ?? 0,
                      height: manifest.metadata.rack?.height ?? 0,
                      ...manifest.metadata.rack
                    }
                  }
                });
              }}
              className={`p-2 border rounded-xs transition-all flex flex-col items-start gap-1 group relative overflow-hidden ${
                manifest.ui.skin === theme.ui.skin && manifest.ui.skinMode !== 'custom'
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-outline text-foreground/40 hover:border-outline/40'
              }`}
            >
              <span className="text-[8px] font-black uppercase tracking-widest">{theme.label}</span>
              <span className="text-[5px] opacity-40 uppercase font-bold leading-tight line-clamp-1">{theme.description}</span>
              {manifest.ui.skin === theme.ui.skin && manifest.ui.skinMode !== 'custom' && (
                <div className="absolute right-1 top-1">
                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </button>
          ))}
          
          <button
            onClick={() => {
              onUpdate({ 
                ui: { 
                  ...manifest.ui, 
                  skinMode: 'custom'
                }
              });
            }}
            className={`p-2 border rounded-xs transition-all flex flex-col items-start gap-1 group relative overflow-hidden ${
              manifest.ui.skinMode === 'custom'
                ? 'border-accent bg-accent/10 text-accent' 
                : 'border-outline text-foreground/40 hover:border-accent/40'
            }`}
          >
            <span className="text-[8px] font-black uppercase tracking-widest">Expert / Custom</span>
            <span className="text-[5px] opacity-40 uppercase font-bold leading-tight">Full Aesthetic Governance Overrides.</span>
            {manifest.ui.skinMode === 'custom' && (
              <div className="absolute right-1 top-1">
                <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
              </div>
            )}
          </button>
        </div>
      </div>
    </InspectorCollapsible>
  );
}
