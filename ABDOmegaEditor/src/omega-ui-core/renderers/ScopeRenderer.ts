/**
 * OMEGA Scope Primitive Renderer
 * Era 7.2.3 Industrial Aseptic
 */

export interface ScopeProps {
  variant: string;
  bind: string;
  size: { width: number; height: number };
  color?: string | undefined;
  font?: string | undefined;
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
}

export function renderScopeHTML(props: ScopeProps): string {
  const { variant, bind, size, color = 'var(--scope-color, #00ff88)' } = props;
  const zoom = 1.5;
  const w = size.width * zoom;
  const h = size.height * zoom;

  return `
    <div class="scope-display variant-${variant}" 
         data-bind="${bind}"
         style="--scope-width: ${w}px; --scope-height: ${h}px; --scope-color: ${color};">
        <canvas class="scope-canvas" width="${w}" height="${h}"></canvas>
        <div class="scope-grid"></div>
    </div>
  `;
}
