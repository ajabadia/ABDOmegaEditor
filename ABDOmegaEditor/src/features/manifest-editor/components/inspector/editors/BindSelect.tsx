
interface BindSelectProps {
  value: string;
  onChange: (target: string) => void;
}

const COMMON_BINDS = [
  { id: 'param_1', label: 'Param 1' },
  { id: 'param_2', label: 'Param 2' },
  { id: 'param_3', label: 'Param 3' },
  { id: 'param_4', label: 'Param 4' },
  { id: 'audio_in', label: 'Audio In' },
  { id: 'audio_out', label: 'Audio Out' },
  { id: 'cv_in', label: 'CV In' },
  { id: 'cv_out', label: 'CV Out' },
  { id: 'gate_in', label: 'Gate In' },
  { id: 'midi_in', label: 'MIDI In' },
];

export function BindSelect({ value, onChange }: BindSelectProps) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 block">Bind</label>
      <select
        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— None —</option>
        {COMMON_BINDS.map((b) => (
          <option key={b.id} value={b.id}>{b.label}</option>
        ))}
      </select>
    </div>
  );
}
