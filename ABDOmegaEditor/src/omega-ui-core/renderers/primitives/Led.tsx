import React from 'react';
import type { ComponentStyle, BindConfig } from '../../types/rack';

export interface LedRendererProps {
  id: string;
  size: { width: number; height: number };
  style: ComponentStyle;
  bind?: BindConfig | undefined;
  value: number;
  assetUrl?: string | undefined;
  resolvedColor?: string | undefined;
}

export function Led({
  id, style, value = 0, assetUrl, resolvedColor,
}: LedRendererProps) {
  const isActive = value > 0.05;
  const opacity = 0.3 + (value * 0.7);
  const sizeLabel = style.variant?.charAt(0)?.toUpperCase() || 'B';

  let assetEl: React.ReactNode = null;
  if (assetUrl) {
    const frames = style.frames || 1;
    const bgStyle: React.CSSProperties = { backgroundImage: `url(${assetUrl})` };
    if (frames > 1) {
      const effectiveValue = style.polarity === 'inverted' ? (1 - value) : value;
      const frameIndex = Math.round(effectiveValue * (frames - 1));
      const percent = frames > 1 ? (frameIndex / (frames - 1)) * 100 : 0;
      if (style.orientation === 'h') {
        bgStyle.backgroundPosition = `${percent}% 0%`;
      } else {
        bgStyle.backgroundPosition = `0% ${percent}%`;
      }
    }
    assetEl = <div className={`led-asset filmstrip-${style.orientation || 'v'}`} style={bgStyle} />;
  }

  const ledColor = resolvedColor || style.color || style.indicatorColor;

  return (
    <div
      className={`led size-${sizeLabel} color-${style.variant || 'cyan'} ${isActive ? 'active' : ''} ${assetUrl ? 'has-asset' : ''}`}
      data-source={id}
      style={{
        opacity,
        '--led-color': ledColor,
        backgroundColor: ledColor,
      } as React.CSSProperties}
    >
      {assetEl}
      <div className="led-glass-overlay" />
      <div className="led-internal-glow" />
    </div>
  );
}
