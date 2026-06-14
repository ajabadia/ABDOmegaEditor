/**
 * @purpose Gestiona un componente para editar propiedades LED en el editor del manifiesto OMEGA.
 * @lastUpdated 2026-06-14T16:47:58.424Z
 */

import type { ComponentNode, LedPolarity } from '../../../../../omega-ui-core/types/rack';
import { CommonFields } from './CommonFields';
import { ColorInput } from './ColorInput';
import { BindSelect } from './BindSelect';

export interface LedEditorProps {
  node: ComponentNode;
  onChange: (updates: Partial<ComponentNode>) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
}

export function LedEditor({ node, onChange, inspectorLevel }: LedEditorProps) {
  const s = node.style;
  const lvl = inspectorLevel || 'medium';
  const showMedium = lvl === 'medium' || lvl === 'advanced';

  return (
    <div className="space-y-3 p-3">
      <CommonFields
        id={node.id} label={node.label}
        x={node.pos.x} y={node.pos.y}
        width={node.size.width} height={node.size.height}
        onChange={(u) => onChange(u as Partial<ComponentNode>)}
      />
      {showMedium && (
        <>
          <ColorInput
            label="Color"
            value={s.color || ''}
            onChange={(c) => onChange({ style: { ...s, color: c } })}
          />
          <ColorInput
            label="Indicator"
            value={s.indicatorColor || ''}
            onChange={(c) => onChange({ style: { ...s, indicatorColor: c } })}
          />
          <div>
            <label className="text-[10px] text-gray-500 block">Polarity</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-xs text-white"
              value={s.polarity || 'normal'}
              onChange={(e) => onChange({ style: { ...s, polarity: e.target.value as LedPolarity } })}
            >
              <option value="normal">Normal</option>
              <option value="inverted">Inverted</option>
            </select>
          </div>
          <BindSelect
            value={node.bind?.target || ''}
            onChange={(t) => onChange({ bind: { ...node.bind, target: t } })}
          />
        </>
      )}
    </div>
  );
}
