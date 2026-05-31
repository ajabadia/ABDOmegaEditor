import { LayoutGrid, Layers, Cpu } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
import { IndustrialField, IndustrialInput } from '@/features/manifest-editor/components/primitives';
import PropertyField from '../../PropertyField';

interface ModuleMechanicalSpecProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  onHelp?: ((id: string) => void) | undefined;
  standalone?: boolean;
}

const HP_TO_MM = 5.08;

export default function ModuleMechanicalSpec({ manifest, onUpdate, onHelp, standalone }: ModuleMechanicalSpecProps) {
  const metadata = manifest.metadata || {};
  const rack = metadata.rack || { width: 0, height: 0 };

  const updateRack = (field: string, value: unknown) => {
    onUpdate({ 
      metadata: { 
        ...metadata, 
        rack: { ...rack, [field]: value } 
      } 
    } as Partial<OMEGA_Manifest>);
  };

  const hp = rack.hp || 12;
  const widthMm = (hp * HP_TO_MM).toFixed(1);

  const content = (
    <div className="space-y-4 pt-2">
      {/* DIMENSIONES VISUALES */}
      <div className="grid grid-cols-2 gap-3">
        <PropertyField label="Panel Width (HP)" helper={`≈ ${widthMm} mm`}>
          <IndustrialInput 
            type="number" 
            value={String(hp)} 
            onChange={(v: string) => updateRack('hp', Math.max(1, parseInt(v) || 1))} 
            mono 
            align="center" 
          />
        </PropertyField>

        <PropertyField label="Panel Depth (mm)">
          <IndustrialInput 
            type="number" 
            value={String(rack.depth || 20)} 
            onChange={(v: string) => updateRack('depth', Math.max(0, parseInt(v) || 0))} 
            mono 
            align="center" 
          />
        </PropertyField>
      </div>

      {/* MOUNTING UNITS — theme-safe */}
      <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase wb-text-muted tracking-wider ml-1 flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-primary/60" />
          Mounting Units
        </label>
        <div className="grid grid-cols-2 wb-surface-strong border wb-outline rounded-xs overflow-hidden">
          {['3U', '1U'].map(u => (
            <button
              key={u}
              onClick={() => updateRack('units', u)}
              className={`py-2.5 text-[10px] font-black uppercase tracking-tighter transition-all border-b-2 ${
                rack.units === u 
                  ? 'bg-primary/15 text-primary border-primary' 
                  : 'wb-text-muted border-transparent hover:bg-primary/5 hover:wb-text'
              }`}
            >
              {u}
              <span className="block text-[6px] font-normal opacity-60 lowercase mt-0.5">
                {u === '3U' ? 'Standard Eurorack' : 'Intellijel / low-profile'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DIVIDER — theme-safe */}
      <div className="h-px wb-surface-strong" />

      {/* PARIDAD HARDWARE */}
      <div className="space-y-3">
        <div className="text-[8px] font-black uppercase wb-text-muted flex items-center gap-2 tracking-wider">
          <Cpu className="w-3 h-3 text-primary/60" />
          <span>Hardware Power Parity</span>
          <span className="text-[6px] normal-case opacity-50 font-normal">optional</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <PropertyField label="+12V (mA)">
            <IndustrialInput 
              type="number" 
              value={String(rack.power?.plus12 || 0)} 
              onChange={(v: string) => updateRack('power', { ...(rack.power || {}), plus12: parseInt(v) || 0 })} 
              mono 
              size="xs"
              align="center"
            />
          </PropertyField>
          <PropertyField label="-12V (mA)">
            <IndustrialInput 
              type="number" 
              value={String(rack.power?.minus12 || 0)} 
              onChange={(v: string) => updateRack('power', { ...(rack.power || {}), minus12: parseInt(v) || 0 })} 
              mono 
              size="xs"
              align="center"
            />
          </PropertyField>
          <PropertyField label="+5V (mA)">
            <IndustrialInput 
              type="number" 
              value={String(rack.power?.five || 0)} 
              onChange={(v: string) => updateRack('power', { ...(rack.power || {}), five: parseInt(v) || 0 })} 
              mono 
              size="xs"
              align="center"
            />
          </PropertyField>
        </div>

        <p className="text-[6px] wb-text-muted uppercase font-bold tracking-tighter italic opacity-70 px-1">
          Optional hardware-reference current draw for documentation, catalog export, or real-world Eurorack parity.
        </p>
      </div>
    </div>
  );

  if (standalone) return content;

  return (
    <InspectorCollapsible 
      title="Physical Emulation Profile" 
      icon={LayoutGrid} 
      onHelp={() => onHelp?.('mechanical')}
    >
      {content}
    </InspectorCollapsible>
  );
}
