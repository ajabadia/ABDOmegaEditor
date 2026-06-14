/**
 * @purpose Proporciona un componente de entrada de color con una etiqueta, un campo de entrada para ingresar un color personalizado y un conjunto de paletas de colores predefinidas para seleccionar.
 * @lastUpdated 2026-06-14T16:46:10.013Z
 */

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const SWATCHES = ['#00f2ff', '#ffbf00', '#dc143c', '#00a86b', '#ff6b35', '#a855f7', '#ffffff', '#000000'];

export function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 block">{label}</label>
      <div className="flex items-center gap-1">
        <input
          className="w-5 h-5 rounded border border-[#333] cursor-pointer"
          type="color"
          value={value || '#333333'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="flex gap-0.5 mt-1">
        {SWATCHES.map((s) => (
          <button
            key={s}
            className={`w-4 h-4 rounded border ${value === s ? 'border-white' : 'border-transparent'}`}
            style={{ backgroundColor: s }}
            onClick={() => onChange(s)}
          />
        ))}
      </div>
    </div>
  );
}
