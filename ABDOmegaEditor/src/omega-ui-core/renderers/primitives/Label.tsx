import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface LabelRendererProps {
  id: string;
  text: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
}

export function Label({
  text, style,
}: LabelRendererProps) {
  return (
    <div
      className={`attachment-label ${style.variant ? `variant-${style.variant}` : ''}`}
      style={{
        color: style.fontColor || style.color || '#ffffff',
        fontSize: style.fontSize ?? 8,
        fontFamily: style.font || 'Inter',
        fontWeight: style.variant === 'label_display' ? 400 : 900,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        opacity: style.opacity,
      }}
    >
      {text || 'LABEL'}
    </div>
  );
}
