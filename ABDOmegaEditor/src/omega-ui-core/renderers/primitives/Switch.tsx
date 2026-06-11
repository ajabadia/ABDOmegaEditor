import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface SwitchRendererProps {
  id: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
}

export function Switch({
  id, style, value = 0,
}: SwitchRendererProps) {
  const isActive = value >= 0.5;
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  return (
    <div
      className={`switch-container size-${sizeLabel} color-${style.variant || 'cyan'}`}
      data-source={id}
    >
      <div className={`sw-led ${!isActive ? 'active' : ''}`} />
      <div className={`sw-led ${isActive ? 'active' : ''}`} />
    </div>
  );
}
