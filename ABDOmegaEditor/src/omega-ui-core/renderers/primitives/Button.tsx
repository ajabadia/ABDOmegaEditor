import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface ButtonRendererProps {
  id: string;
  label: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
}

export function Button({
  id, label, style, value = 0,
}: ButtonRendererProps) {
  const isPressed = value >= 0.5;
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  const content = label
    ? <span className="stepper-text">{label.toUpperCase()}</span>
    : <div className="stepper-dot" />;

  return (
    <div
      className={`stepper-container type-button size-${sizeLabel} color-${style.variant || 'cyan'} ${isPressed ? 'pressed' : ''}`}
      data-source={id}
      data-type="button"
    >
      {content}
    </div>
  );
}
