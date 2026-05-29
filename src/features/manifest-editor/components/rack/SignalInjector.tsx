import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { inputSignalService, type SignalType, type VirtualSignal } from '@/services/inputSignalService';

interface SignalInjectorProps {
  portId: string;
  onClose: () => void;
}

/**
 * SignalInjector (v7.2.3)
 * Floating industrial UI to configure virtual signal injection.
 */
export const SignalInjector = ({ portId, onClose }: SignalInjectorProps) => {
  const current = inputSignalService.getActiveSignal(portId);
  const [sig, setSig] = useState<VirtualSignal>(current || { type: 'sine', frequency: 440, amplitude: 0.5, offset: 0 });

  const update = (updates: Partial<VirtualSignal>) => {
    const next = { ...sig, ...updates };
    setSig(next);
    inputSignalService.setSignal(portId, next);
  };

  const remove = () => {
    inputSignalService.setSignal(portId, null);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-black/90 backdrop-blur-xl border border-primary/30 rounded-xs shadow-[0_0_50px_rgba(0,255,157,0.2)] z-[200] p-4 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">Signal Injector</span>
        </div>
        <button onClick={onClose} className="text-white/20 hover:text-white">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {(['sine', 'square', 'saw', 'noise', 'lfo_slow', 'static'] as SignalType[]).map(t => (
          <button 
            key={t}
            onClick={() => update({ type: t })}
            className={`py-1.5 rounded-xs text-[7px] font-bold uppercase transition-all border ${sig.type === t ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <div className="space-y-1">
           <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
             <span>Frequency</span>
             <span>{sig.frequency} Hz</span>
           </div>
           <input type="range" min="1" max="2000" value={sig.frequency} onChange={e => update({ frequency: parseInt(e.target.value) })} className="w-full accent-primary h-1" />
        </div>
        <div className="space-y-1">
           <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
             <span>Amplitude</span>
             <span>{(sig.amplitude * 100).toFixed(0)}%</span>
           </div>
           <input type="range" min="0" max="1" step="0.01" value={sig.amplitude} onChange={e => update({ amplitude: parseFloat(e.target.value) })} className="w-full accent-primary h-1" />
        </div>
      </div>

      <button onClick={remove} className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all rounded-xs">
        Kill Signal
      </button>
    </motion.div>
  );
};
