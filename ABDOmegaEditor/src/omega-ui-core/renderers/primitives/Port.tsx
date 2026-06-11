import React from 'react';
import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface PortRendererProps {
  id: string;
  label: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
  resolvedColor?: string | undefined;
}

function inferSignalColor(id: string, label: string): string {
  const search = `${id} ${label}`.toLowerCase();
  if (search.includes('midi')) return 'var(--signal-midi)';
  if (search.includes('gate') || search.includes('trig')) return 'var(--signal-gate)';
  if (search.includes('cv') || search.includes('mod')) return 'var(--signal-cv)';
  if (search.includes('pitch') || search.includes('freq') || search.includes('out') || search.includes('in')) return 'var(--signal-audio)';
  return 'var(--wb-primary)';
}

export function Port({
  id, label, style, value = 0, resolvedColor,
}: PortRendererProps) {
  const signalColor = resolvedColor || style.color || inferSignalColor(id, label);
  const opacity = 0.3 + (value * 0.7);
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  return (
    <div
      className={`port-socket size-${sizeLabel} color-${style.variant || 'cyan'}`}
      data-source={id}
      style={{
        '--omega-color-override': style.color,
        opacity: style.opacity,
      } as React.CSSProperties}
    >
      <div className="port-inner">
        <div
          className="port-led"
          style={{ backgroundColor: signalColor, opacity }}
        />
      </div>
    </div>
  );
}
