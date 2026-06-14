/**
 * @purpose Proporciona un editor de componentes basado en el tipo de nodo seleccionado en el editor del manifiesto OMEGA.
 * @lastUpdated 2026-06-14T16:46:36.715Z
 */

import type { ComponentNode, GroupNode, RackManifest } from '../../../../../omega-ui-core/types/rack';
import { KnobEditor } from './KnobEditor';
import { SliderEditor } from './SliderEditor';
import { LedEditor } from './LedEditor';
import { PortEditor } from './PortEditor';
import { SwitchEditor } from './SwitchEditor';
import { ButtonEditor } from './ButtonEditor';
import { DisplayEditor } from './DisplayEditor';
import { LabelEditor } from './LabelEditor';
import { GroupEditor } from './GroupEditor';
import { RackPropertiesEditor } from './RackPropertiesEditor';

type Selection = { type: 'component'; node: ComponentNode }
  | { type: 'group'; node: GroupNode }
  | { type: 'rack'; manifest: RackManifest };

interface ComponentEditorProps {
  selection: Selection;
  onChange: (updates: Record<string, unknown>) => void;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  /** Called when user clicks "Save as Blueprint..." on a group */
  onSaveGroupAsBlueprint?: ((groupNode: import('@/omega-ui-core/types/rack').GroupNode, exposedParams?: import('@/features/manifest-editor/components/modals/ExposeParametersDialog').ExposedParam[]) => void) | undefined;
  /** Called when user clicks "Ungroup" to dissolve the selected group */
  onUngroupNode?: ((groupId: string) => void) | undefined;
}

function makeHandler<T>(onChange: (u: Record<string, unknown>) => void) {
  return (updates: Partial<T>) => onChange(updates as unknown as Record<string, unknown>);
}

export function ComponentEditor({ selection, onChange, inspectorLevel, onSaveGroupAsBlueprint, onUngroupNode }: ComponentEditorProps) {
  switch (selection.type) {
    case 'component': {
      const node = selection.node;
      const handler = makeHandler<ComponentNode>(onChange);
      switch (node.type) {
        case 'knob': return <KnobEditor node={node} onChange={handler} inspectorLevel={inspectorLevel} />;
        case 'slider': return <SliderEditor node={node} onChange={handler} inspectorLevel={inspectorLevel} />;
        case 'led': return <LedEditor node={node} onChange={handler} inspectorLevel={inspectorLevel} />;
        case 'port': return <PortEditor node={node} onChange={handler} inspectorLevel={inspectorLevel} />;
        case 'switch': return <SwitchEditor node={node} onChange={handler} inspectorLevel={inspectorLevel} />;
        case 'button': return <ButtonEditor node={node} onChange={handler} inspectorLevel={inspectorLevel} />;
        case 'display': return <DisplayEditor node={node} onChange={handler} inspectorLevel={inspectorLevel} />;
        case 'label': return <LabelEditor node={node} onChange={handler} inspectorLevel={inspectorLevel} />;
        default: return <div className="p-3 text-xs text-gray-500">Unknown component type</div>;
      }
    }
    case 'group':
      return <GroupEditor node={selection.node} onChange={makeHandler<GroupNode>(onChange)} onSaveAsBlueprint={onSaveGroupAsBlueprint} onUngroupNode={onUngroupNode} />;
    case 'rack':
      return <RackPropertiesEditor manifest={selection.manifest} onChange={makeHandler<RackManifest>(onChange)} />;
  }
}
