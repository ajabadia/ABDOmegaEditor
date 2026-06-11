/**
 * OMEGA Terminal Primitive Renderer
 * Era 7.2.3 Industrial Aseptic
 */

export interface TerminalProps {
  variant: string;
  bind: string;
  size: { width: number; height: number };
  color?: string | undefined;
  font?: string | undefined;
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
}

export function renderTerminalHTML(props: TerminalProps): string {
  const { variant, bind, size, color = 'var(--terminal-color, #ffcc00)', font = 'monospace' } = props;
  const zoom = 1.5;
  const w = size.width * zoom;
  const h = size.height * zoom;

  return `
    <div class="terminal-display variant-${variant}" 
         data-bind="${bind}"
         style="--terminal-width: ${w}px; --terminal-height: ${h}px; color: ${color}; font-family: ${font};">
        <div class="terminal-container"></div>
    </div>
  `;
}
