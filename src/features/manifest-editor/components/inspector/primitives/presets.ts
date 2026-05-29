import { Globe, Activity, Zap, List } from 'lucide-react';

export interface OptionPreset {
  label: string;
  icon: React.ElementType;
  options: { label: string; value: number }[];
}

export const INDUSTRIAL_PRESETS: Record<string, OptionPreset> = {
  midi_ch: {
    label: 'MIDI Channels',
    icon: Globe,
    options: [
      { label: 'OMNI (ALL)', value: 0 },
      ...Array.from({ length: 16 }, (_, i) => ({ label: `CHANNEL ${i + 1}`, value: i + 1 }))
    ]
  },
  sample_rate: {
    label: 'Sample Rates',
    icon: Activity,
    options: [
      { label: '44.1 kHz', value: 44100 },
      { label: '48.0 kHz', value: 48000 },
      { label: '88.2 kHz', value: 88200 },
      { label: '96.0 kHz', value: 96000 },
      { label: '192 kHz', value: 192000 },
    ]
  },
  waveforms: {
    label: 'Standard Waves',
    icon: Zap,
    options: [
      { label: 'SINE', value: 0 },
      { label: 'SAW', value: 1 },
      { label: 'SQUARE', value: 2 },
      { label: 'TRIANGLE', value: 3 },
      { label: 'NOISE', value: 4 },
    ]
  },
  boolean: {
    label: 'Binary State',
    icon: List,
    options: [
      { label: 'OFF / BYPASS', value: 0 },
      { label: 'ON / ACTIVE', value: 1 },
    ]
  }
};
