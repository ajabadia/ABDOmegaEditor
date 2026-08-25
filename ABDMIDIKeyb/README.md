# ABDKeyboard

Best-of-breed virtual piano keybed, pitch/mod wheels, octave controls, QWERTY support, and LED animations — shared across all ABDSynths projects.

Assembled from the strongest features of **ABDMS2000**, **ABDEep**, and **ABDCZ101**.

## Features

| Feature | Source | Description |
|---|---|---|
| Responsive key count (2–5 octaves) | ABDMS2000 | Key count adapts to container width |
| Velocity curves (soft/hard/linear/fixed) | ABDEep | Per-key velocity by Y-position with configurable curve |
| Pressure display (AT+MW+PB) | ABDEep | Visual aftertouch + modwheel + pitchbend glow on keys |
| Pitch-bend displacement | ABDEep | Keys shift horizontally during pitch bend |
| LED color by mode | ABDEep | Different LED color for arp/seq/chord states |
| Per-key ivory texture | ABDEep | Deterministic HSL variations per key |
| Vintage wear stains | ABDCZ101 | Per-key yellowing, scuffs, dings for aged look |
| QWERTY keyboard | ABDCZ101 | Full 2-row mapping (Ableton/JUCE standard) |
| Arrow key octave shift | ABDCZ101 | ArrowUp/Down shifts octave |
| Wheel filmstrip (101 frames) | ABDMS2000 | Sprite-based pitch/mod wheels with spring return |
| Touch support | ABDMS2000 | Multi-touch on mobile/tablet |
| LED sweep animation | All | Cascade glow across keys on patch/bank change |
| Panic flash | All | Triple strobe on All Notes Off |
| Auto-generated panic button | All | Styled button to right of keybed with red LED + tooltip |
| Panic keyboard shortcut | All | Ctrl+Q / Cmd+Q triggers All Notes Off |

## Installation

### As npm workspace (recommended)

```bash
# From your synth project root
npm install @abdsynths/keyboard --workspace-root
```

```js
// In your synth's package.json
{
  "dependencies": {
    "@abdsynths/keyboard": "0.1.0"
  }
}
```

### As git submodule

```bash
git submodule add ../ABDKeyboard Shared/ABDKeyboard
```

```html
<!-- In your index.html -->
<link rel="stylesheet" href="Shared/ABDKeyboard/src/keyboard.css">
<script type="module">
  import { createKeyboard } from './Shared/ABDKeyboard/src/keyboard.js';
</script>
```

### Copy (simplest)

```bash
cp -r ../ABDKeyboard/src/ ./src/components/keyboard/
```

## Usage

```js
import { createKeyboard } from '@abdsynths/keyboard';
// or: import { createKeyboard } from './components/keyboard/keyboard.js';

const kbd = createKeyboard({
  // DOM IDs
  containerId: 'piano-keyboard',
  wheelPitchId: 'pitch-wheel-container',
  wheelModId: 'mod-wheel-container',
  octUpId: 'oct-up',
  octDownId: 'oct-down',
  ledUpId: 'led-up',
  ledDownId: 'led-down',

  // Callbacks (bridge-agnostic)
  onNoteOn: (note, vel) => bridge.noteOn(note, vel),
  onNoteOff: (note) => bridge.noteOff(note),
  onPitchBend: (val) => bridge.pitchBend(val),
  onModWheel: (val) => bridge.modWheel(val),
  onPanic: () => bridge.allNotesOff(),
  panicBtnId: null,  // omit to auto-generate panic button to right of keys

  // Config
  config: {
    numOctaves: 4,
    startNote: 36,
    maxOctaveShift: 3,
    velocitySource: 'fixed',       // 'fixed' | 'yPosition'
    velocityCurve: 'normal',       // 'normal' | 'soft' | 'hard' | 'linear' | 'fixed'
    enableQwerty: true,
    enableTouch: true,
    enablePressureDisplay: false,  // ABDEep feature
    enablePitchBendDisplace: false,
    enableIvoryTexture: false,
    enableVintageWear: false,
    getLedColor: null,             // () => '#ff3366' for dynamic color
    getPressureState: null,        // () => { aftertouch, modWheel, pitchBend }
  },
});

// Panic: click the auto-generated button to the right of the keys,
// or press Ctrl+Q / Cmd+Q, or call:
kbd.panic();                    // All Notes Off + flash LED
kbd.sweep('right', 8);         // Cascade LED animation
kbd.getOctave();                // -3..+3
kbd.setOctave(2);
kbd.highlightNote(60, 0.8);    // Light key without noteOn
kbd.releaseNote(60);
kbd.setLedColor('#ff3366');
kbd.setOctaveCount(5, 24);     // Re-render with 5 octaves starting at C1
kbd.getActiveNotes();           // [60, 64, 67]
kbd.destroy();                  // Full cleanup
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **Ctrl+Q / Cmd+Q** | **Panic — All Notes Off + flash** |
| Arrow Up | Shift octave up |
| Arrow Down | Shift octave down |
| Z–M (lower row) | Play notes (QWERTY mode) |
| Q–] (upper row) | Play notes (QWERTY mode) |

## Project-Specific Configuration

### ABDMS2000

```js
createKeyboard({
  config: { numOctaves: 4, velocitySource: 'fixed' },
  onNoteOn: (n, v) => bridge.noteOn(n, v),
});
```

### ABDEep (full experience)

```js
createKeyboard({
  config: {
    velocitySource: 'yPosition',
    velocityCurve: 'normal',
    enablePressureDisplay: true,
    enablePitchBendDisplace: true,
    enableIvoryTexture: true,
  },
  getLedColor: () => arpActive ? '#ff3366' : seqActive ? '#9933ff' : 'var(--color-accent)',
  getPressureState: () => ({ aftertouch: at, modWheel: mw, pitchBend: pb }),
});
```

### ABDCZ101 (vintage feel)

```js
createKeyboard({
  config: {
    numOctaves: 4,
    startNote: 36,
    enableVintageWear: true,
    enableQwerty: true,
  },
  wheelPitchId: null,  // CZ-101 has no wheels
  wheelModId: null,
});
```

## CSS Theme Tokens

All colors and fonts are customizable via CSS custom properties:

```css
.kbd-piano-keys { --kbd-bg: #080808; }
.kbd-white-key  { --kbd-white-top: #fdfcf8; --kbd-white-base: #ffffff; }
.kbd-black-key  { --kbd-black-top: #2f2f35; }
.active::before { --kbd-led-color: #00ccff; }
```

## Testing

```bash
cd ABDKeyboard
npm install
npm test  # 58 tests, vitest + jsdom
```

## License

Proprietary — UNLICENSED (internal ABDSynths use only).
