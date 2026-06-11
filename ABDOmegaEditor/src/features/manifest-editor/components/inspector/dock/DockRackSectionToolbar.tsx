'use client';

import React from 'react';
import { Info, Cpu, LayoutGrid, Palette, Layout, Activity, Tag, Box, Layers } from 'lucide-react';

// Granular section IDs — must match WorkbenchContainer rackSections and PropertyPanel visibleSections
type SectionId =
  | 'identity'
  | 'essentialIdentity'
  | 'identityBranding'
  | 'globalUiSkin'
  | 'activeConstructionPlane'
  | 'moduleTaxonomy'
  | 'physicalEmulationProfile'
  | 'aestheticsGlobals'
  | 'aestheticsElements'
  | 'architecture'
  | 'diagnostics';

interface RackSectionDef {
  id: SectionId;
  icon: React.ReactNode;
  title: string;
  level: 'essential' | 'advanced';
}

interface DockRackSectionToolbarProps {
  rackSections: Partial<Record<SectionId, boolean>>;
  onToggleRackSection: (section: string) => void;
}

const SECTIONS: RackSectionDef[] = [
  { id: 'identity',                icon: <Info className="w-4 h-4" />,        title: 'Toggle Identity',                   level: 'essential' },
  { id: 'essentialIdentity',       icon: <Tag className="w-4 h-4" />,         title: 'Toggle Essential Identity',         level: 'essential' },
  { id: 'identityBranding',        icon: <Cpu className="w-4 h-4" />,         title: 'Toggle Identity Branding',          level: 'essential' },
  { id: 'globalUiSkin',            icon: <Palette className="w-4 h-4" />,     title: 'Toggle Global UI Skin',             level: 'advanced' },
  { id: 'activeConstructionPlane', icon: <LayoutGrid className="w-4 h-4" />,  title: 'Toggle Construction Plane',         level: 'advanced' },
  { id: 'moduleTaxonomy',          icon: <Box className="w-4 h-4" />,         title: 'Toggle Module Taxonomy',            level: 'advanced' },
  { id: 'physicalEmulationProfile',icon: <Activity className="w-4 h-4" />,    title: 'Toggle Physical Emulation Profile', level: 'advanced' },
  { id: 'aestheticsGlobals',       icon: <Layers className="w-4 h-4" />,      title: 'Toggle Aesthetics Globals',         level: 'advanced' },
  { id: 'aestheticsElements',      icon: <Palette className="w-4 h-4" />,     title: 'Toggle Aesthetics Elements',        level: 'advanced' },
  { id: 'architecture',            icon: <Layout className="w-4 h-4" />,      title: 'Toggle Architecture',               level: 'advanced' },
  { id: 'diagnostics',             icon: <Activity className="w-4 h-4" />,    title: 'Toggle Diagnostics',                level: 'advanced' },
];

export function DockRackSectionToolbar({
  rackSections,
  onToggleRackSection
}: DockRackSectionToolbarProps) {
  const essentialButtons = SECTIONS.filter(s => s.level === 'essential');
  const advancedButtons = SECTIONS.filter(s => s.level === 'advanced');

  const renderButton = ({ id, icon, title }: RackSectionDef) => (
    <button
      key={id}
      onClick={() => onToggleRackSection(id)}
      className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all ${
        rackSections[id] !== false
          ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]'
          : 'wb-text-muted hover:wb-text hover:bg-primary/10'
      }`}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className="w-10 wb-surface border-l wb-outline flex flex-col items-center py-3 gap-3 z-45 shrink-0 animate-in slide-in-from-right duration-200 shadow-lg">
      <div className="text-[5px] font-black uppercase text-foreground/45 tracking-widest text-center select-none pointer-events-none">RACK SECT</div>

      <div className="flex flex-col items-center gap-1.5">
        {essentialButtons.map(renderButton)}
      </div>

      <div className="w-5 h-px bg-white/10" />

      <div className="flex flex-col items-center gap-1.5 overflow-y-auto max-h-[50vh]">
        {advancedButtons.map(renderButton)}
      </div>
    </div>
  );
}
