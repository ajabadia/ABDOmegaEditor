/**
 * OMEGA UI CORE — Stateless LED Renderer (Era 7.2.3)
 * Single Source of Truth for LED HTML Structure.
 */
 
 export interface LedProps {
   size: string;      // A, B, C, D
   colorId: string;   // cyan, red, orange, etc.
   value: number;     // 0.0 to 1.0
   id?: string | undefined;       // Optional binding ID
   transform?: string | undefined; // Optional CSS transform
   explicitColor?: string | undefined; // [NEW] Era 7.2.3 Custom Color Override
   assetUrl?: string | undefined;
   frames?: number | undefined;
   orientation?: 'v' | 'h' | undefined;
 }
 
 export const renderLedHTML = (props: LedProps): string => {
   const { size, colorId, value, id, transform, assetUrl, frames, orientation = 'v' } = props;
   
   // Calculate visibility/glow based on value
   const isActive = value > 0.05;
   const opacity = 0.3 + (value * 0.7);
   
   // Industrial Pattern: .led.size-X.color-Y[.active]
   const classes = [
     'led',
     `size-${size}`,
     `color-${colorId}`,
     isActive ? 'active' : '',
     assetUrl ? 'has-asset' : ''
   ].filter(Boolean).join(' ');
 
   const style = [
     `opacity: ${opacity}`,
     props.explicitColor ? `--led-color: ${props.explicitColor}` : '',
     props.explicitColor ? `background-color: ${props.explicitColor} !important` : '',
     transform || ''
   ].filter(Boolean).join('; ');
 
   let assetHTML = '';
   if (assetUrl) {
     let backgroundStyle = `background-image: url(${assetUrl});`;
     if (frames && frames > 1) {
         const frameIndex = Math.min(Math.floor(value * frames), frames - 1);
         const percent = (frameIndex / (frames - 1)) * 100;
         backgroundStyle += orientation === 'v' 
             ? `background-position: 0% ${percent}%;` 
             : `background-position: ${percent}% 0%;`;
     }
     assetHTML = `<div class="led-asset filmstrip-${orientation}" style="${backgroundStyle}"></div>`;
   }
 
   return `
     <div class="${classes}" ${id ? `data-source="${id}"` : ''} style="${style}">
       ${assetHTML}
       <div class="led-glass-overlay"></div>
       <div class="led-internal-glow"></div>
     </div>
   `.trim();
 };
