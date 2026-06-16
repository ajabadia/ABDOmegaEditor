'use client';

/**
 * @purpose Renderiza una barra de herramientas para activar secciones en el editor de manifesto OMEGA, clasificándolas en opciones esenciales y avanzadas.
 * @purpose_en Renders a toolbar for toggling sections in the OMEGA manifest editor, categorizing them into essential and advanced options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:1fit6cn
 * @lastUpdated 2026-06-15T11:14:06.678Z
 */

import React from 'react';
import { Info, Cpu, LayoutGrid, Palette, Layout, Activity, Tag, Box, Layers } from 'lucide-react';
import { DockIconBar } from './DockIconBar';
import type { DockIconBarButton } from './DockIconBar';

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

const buttons: DockIconBarButton[] = SECTIONS.map(({ id, icon, title }) => ({ id, icon, title }));

const essentialIds = SECTIONS.filter(s => s.level === 'essential').map(s => s.id);
const advancedIds = SECTIONS.filter(s => s.level === 'advanced').map(s => s.id);

export function DockRackSectionToolbar({
  rackSections,
  onToggleRackSection
}: DockRackSectionToolbarProps) {
  return (
    <DockIconBar
      buttons={buttons}
      isActive={(id) => rackSections[id as SectionId] !== false}
      onButtonClick={(id) => onToggleRackSection(id)}
      label="RACK SECT"
      groups={[
        { id: 'essential', buttonIds: essentialIds },
        { id: 'advanced', buttonIds: advancedIds, className: 'overflow-y-auto max-h-[50vh]' },
      ]}
      className="z-45 animate-in slide-in-from-right duration-200 shadow-lg"
    />
  );
}
