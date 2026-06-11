import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface DisplayRendererProps {
  id: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
}

export function Display({
  id, style, value = 0,
}: DisplayRendererProps) {
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';
  const displayValue = Math.round(value * 100);

  return (
    <div
      className={`mini-display variant-${style.variant || 'oled'} size-${sizeLabel} color-${style.variant || 'cyan'}`}
      data-source={id}
    >
      <div className="display-glass-overlay" />
      <div className="display-internal-glow" />
      <div className="display-scanlines" />
      <button className="display-btn minus" data-action="step-down">−</button>
      <div
        className="display-value"
        style={{
          fontFamily: style.font,
          fontSize: style.fontSize,
          color: style.fontColor,
        }}
      >
        {displayValue}
      </div>
      <button className="display-btn plus" data-action="step-up">+</button>
    </div>
  );
}
