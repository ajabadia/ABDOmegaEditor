import { Settings2, LayoutGrid, Layers, Cpu } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
import { IndustrialField, IndustrialInput } from '@/features/manifest-editor/components/primitives';

interface ModuleMechanicalSpecProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  onHelp?: ((id: string) => void) | undefined;
}

export default function ModuleMechanicalSpec({ manifest, onUpdate, onHelp }: ModuleMechanicalSpecProps) {
  const metadata = manifest.metadata;
  const rack = metadata.rack || { width: 0, height: 0 };

  const updateRack = (field: string, value: unknown) => {
    onUpdate({ 
      metadata: { 
        ...metadata, 
        rack: { ...rack, [field]: value } 
      } 
    } as Partial<OMEGA_Manifest>);
  };

  return (
    <InspectorCollapsible 
      title="Physical Emulation Profile" 
      icon={Settings2} 
      onHelp={() => onHelp?.('mechanical')}
    >
      <div className="space-y-4 pt-2">
        {/* DIMENSIONES VISUALES */}
        <div className="grid grid-cols-2 gap-3">
          <IndustrialField label="Panel Width (HP)" icon={LayoutGrid}>
            <IndustrialInput 
              type="number" 
              value={String(rack.hp || 12)} 
              onChange={(v: string) => updateRack('hp', Math.max(1, parseInt(v) || 1))} 
              mono 
              align="center" 
            />
          </IndustrialField>
          <IndustrialField label="Panel Depth (mm)" icon={Layers}>
            <IndustrialInput 
              type="number" 
              value={String(rack.depth || 20)} 
              onChange={(v: string) => updateRack('depth', Math.max(0, parseInt(v) || 0))} 
              mono 
              align="center" 
            />
          </IndustrialField>
        </div>

        <div className="space-y-1.5">
          <label className="text-7px font-black uppercase wb-text-muted tracking-widest ml-1">Mounting Units</label>
          <div className="grid grid-cols-2 bg-black/20 rounded-xs border wb-outline overflow-hidden">
             {['3U', '1U'].map(u => (
               <button
                 key={u}
                 onClick={() => updateRack('units', u)}
                 className={`py-2 text-[9px] font-black uppercase tracking-tighter transition-all ${rack.units === u ? 'bg-primary/20 text-primary' : 'wb-text-muted hover:text-white'}`}
               >
                 {u}
               </button>
             ))}
          </div>
        </div>

        <div className="h-px bg-white/5 my-2" />

        {/* PARIDAD HARDWARE (SUB-BLOQUE) */}
        <div className="space-y-3">
          <div className="text-[7px] font-black uppercase wb-text-muted flex items-center gap-2 tracking-[0.1em] opacity-60">
            <Cpu className="w-3 h-3" />
            <span>Hardware Power Parity (Optional)</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <IndustrialField label="+12V mA">
              <IndustrialInput 
                type="number" 
                value={String(rack.power?.plus12 || 0)} 
                onChange={(v: string) => updateRack('power', { ...(rack.power || {}), plus12: parseInt(v) || 0 })} 
                mono 
                size="xs" 
              />
            </IndustrialField>
            <IndustrialField label="-12V mA">
              <IndustrialInput 
                type="number" 
                value={String(rack.power?.minus12 || 0)} 
                onChange={(v: string) => updateRack('power', { ...(rack.power || {}), minus12: parseInt(v) || 0 })} 
                mono 
                size="xs" 
              />
            </IndustrialField>
            <IndustrialField label="5V mA">
              <IndustrialInput 
                type="number" 
                value={String(rack.power?.five || 0)} 
                onChange={(v: string) => updateRack('power', { ...(rack.power || {}), five: parseInt(v) || 0 })} 
                mono 
                size="xs" 
              />
            </IndustrialField>
          </div>
          <p className="text-[6px] wb-text-muted uppercase font-bold tracking-tighter italic opacity-40 px-1">
            Optional hardware-reference current draw for documentation, catalog export, or real-world Eurorack parity.
          </p>
        </div>
      </div>
    </InspectorCollapsible>
  );
}
