/**
 * ⚠️ OMEGA UI CORE — SEQUENCE RENDERER (Era 7.2.3)
 * ---------------------------------------------------------------------------
 * Specialized renderer for filmstrip-based components (Sequence Layer).
 * Handles frame clipping, orientation mapping, and state-based positioning.
 * ---------------------------------------------------------------------------
 */

export interface SequenceProps {
    assetUrl?: string | undefined;
    value: number;
    frames: number;
    frameWidth: number;
    frameHeight: number;
    orientation: 'v' | 'h';
    opacity: number;
    padding?: number[] | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style?: Record<string, any> | undefined;
    isFrameIndex?: boolean | undefined; // If true, value is treated as literal frame index [0...N-1]
}

export const renderSequenceHTML = (props: SequenceProps): string => {
    const { 
        assetUrl, value, frames, frameWidth, frameHeight, 
        orientation, opacity, style 
    } = props;

    const renderWidth = style?.width || frameWidth;
    const renderHeight = style?.height || frameHeight;

    if (!assetUrl) {
        return `
            <div style="width: ${renderWidth}px; height: ${renderHeight}px; border: 1px dashed #555; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 6px; color: #555; font-family: monospace; font-weight: 900;">NO_SEQUENCE</span>
            </div>
        `;
    }

    const backgroundSize = orientation === 'v' 
        ? `100% auto` 
        : `auto 100%`;

    // Polarity handling (Era 7.2.3 Industrial Logic)
    const effectiveValue = props.style?.polarity === 'inverted' ? (1 - value) : value;

    const frameIndex = props.isFrameIndex ? value : Math.round(effectiveValue * (frames - 1));
    const percent = frames > 1 ? (frameIndex / (frames - 1)) * 100 : 0;

    const backgroundPos = orientation === 'v' 
        ? `0% ${percent}%` 
        : `${percent}% 0%`;

    return `
        <div class="omega-sequence-layer" style="
            width: ${renderWidth}px;
            height: ${renderHeight}px;
            background-image: url('${assetUrl}');
            background-position: ${backgroundPos};
            background-size: ${backgroundSize};
            background-repeat: no-repeat;
            opacity: ${opacity};
            position: relative;
            pointer-events: none;
        ">
        </div>
    `;
};
