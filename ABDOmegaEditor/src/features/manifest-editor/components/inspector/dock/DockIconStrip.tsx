'use client';

/**
 * @purpose Renderiza una barra vertical de iconos para alternar entre diferentes paneles en el editor del manifiesto OMEGA.
 * @lastUpdated 2026-06-14T16:44:46.454Z
 */

import React from 'react';
import { Layers, Sliders, Info, History, Settings, Zap, Terminal, Shield } from 'lucide-react';

type WindowId = 'window_layers' | 'window_rack_properties' | 'window_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs';

interface DockIconButton {
  id: WindowId;
  icon: React.ReactNode;
  title: string;
}

interface DockIconStripProps {
  isCollapsed: boolean;
  windowStates: Record<string, boolean>;
  onToggleWindow: (id: WindowId) => void;
}

const ICONS: DockIconButton[] = [
  { id: 'window_layers', icon: <Layers className="w-4 h-4" />, title: 'Layers' },
  { id: 'window_rack_properties', icon: <Settings className="w-4 h-4" />, title: 'Rack Properties' },
  { id: 'window_properties', icon: <Sliders className="w-4 h-4" />, title: 'Element Properties' },
  { id: 'window_blueprints', icon: <Zap className="w-4 h-4" />, title: 'Blueprint Library' },
  { id: 'window_compliance', icon: <Shield className="w-4 h-4" />, title: 'Compliance' },
  { id: 'window_info', icon: <Info className="w-4 h-4" />, title: 'Information' },
  { id: 'window_history', icon: <History className="w-4 h-4" />, title: 'History' },
  { id: 'window_logs', icon: <Terminal className="w-4 h-4" />, title: 'Terminal Logs' },
];

/**
 * DockIconStrip — Barra de iconos vertical al estilo Photoshop.
 * Cada botón alterna la visibilidad de su panel correspondiente.
 * Extraído de RightDockContainer.tsx para reducir el monolito.
 */
export function DockIconStrip({ isCollapsed, windowStates, onToggleWindow }: DockIconStripProps) {
  return (
    <div className="w-10 wb-surface border-l wb-outline flex flex-col items-center py-3 gap-3 z-50 shrink-0 shadow-xl">
      {ICONS.map(({ id, icon, title }) => (
        <button
          key={id}
          onClick={() => onToggleWindow(id)}
          className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
            windowStates[id] && !isCollapsed
              ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]'
              : 'wb-text-muted hover:wb-text hover:bg-primary/10'
          }`}
          title={title}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
