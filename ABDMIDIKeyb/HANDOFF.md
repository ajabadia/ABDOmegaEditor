# ABDKeyboard — Handoff

## What Was Done

Extracted the unified keyboard component from ABDMS2000 into a standalone shared library (`@abdsynths/keyboard`). The component merges the best features from three projects:

- **ABDMS2000**: Responsive key count, wheel filmstrip, touch support
- **ABDEep**: Velocity curves, pressure display, pitch-bend displacement, ivory texture, LED color by mode
- **ABDCZ101**: Vintage wear stains, QWERTY keyboard

### New: Panic Button + Keyboard Shortcut

- **Auto-generated panic button** renders to the right of the keybed when no `panicBtnId` is provided
- **Tooltip**: "Panic: All Notes Off (Ctrl+Q)" on hover
- **Ctrl+Q / Cmd+Q** keyboard shortcut triggers panic from anywhere (works even when `enableQwerty` is false)
- Visual feedback: red LED flash on the button during panic strobe
- Full accessibility: `role="button"`, `tabindex="0"`, `aria-label`, Enter/Space support

## Architecture

```
ABDKeyboard/
├── src/
│   ├── keyboard.js    — createKeyboard() factory, ~430 lines
│   └── keyboard.css   — Theme tokens + panic button styles, ~350 lines
├── tests/
│   └── keyboard.test.js — 58 unit tests (vitest + jsdom)
├── package.json       — @abdsynths/keyboard, exports
└── README.md, CHANGELOG.md, HANDOFF.md, ROADMAP.md
```

## Key Design Decisions

1. **Factory pattern** — `createKeyboard(deps)` returns a public API object. No classes, no singletons.
2. **Bridge-agnostic** — Callbacks (`onNoteOn`, `onNoteOff`, etc.) are injected. No direct bridge imports.
3. **CSS theme tokens** — All colors/fonts via `--kbd-*` CSS variables. Each project overrides via `:root`.
4. **Feature flags** — Each advanced feature is opt-in via config (pressure, ivory, vintage, QWERTY).
5. **Per-key `data-note`** — DOM keys carry `data-note` for external highlight/release.
6. **Auto-generated panic button** — When no `panicBtnId` is provided, a styled button is rendered automatically inside the keybed container. Pass `panicBtnId` to bind to an external element instead.
7. **Ctrl+Q shortcut** — Checked before the `ctrlKey` guard in `handleKeydown`, so it works regardless of `enableQwerty`.

## Integration Status

| Project | Status | Import Path |
|---|---|---|
| ABDMS2000 | ✅ Active | `WebUI/src/components/keyboard.js` (copy) |
| ABDEep | 🔄 Pending | Needs adaptation (velocity curves, pressure display) |
| ABDCZ101 | 🔄 Pending | Needs adaptation (vintage wear, QWERTY) |

## How to Integrate into a New Project

```js
import { createKeyboard } from '@abdsynths/keyboard';
// or from a local copy / submodule

const kbd = createKeyboard({
  containerId: 'piano-keyboard',
  onNoteOn: (n, v) => bridge.noteOn(n, v),
  onNoteOff: (n) => bridge.noteOff(n),
  onPanic: () => bridge.allNotesOff(),
  config: { numOctaves: 4, enableQwerty: true },
});
// Panic button auto-generated to the right of the keys.
// Tooltip: "Panic: All Notes Off (Ctrl+Q)"
// Or pass panicBtnId to bind to an existing DOM element:
//   panicBtnId: 'my-panic-button'
```

```html
<link rel="stylesheet" href="@abdsynths/keyboard/src/keyboard.css">
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+Q / Cmd+Q | Panic — All Notes Off + flash |
| Arrow Up | Shift octave up |
| Arrow Down | Shift octave down |
| Z–M (lower row) | Play notes (when QWERTY enabled) |
| Q–] (upper row) | Play notes (when QWERTY enabled) |

## Test Coverage (58 tests)

| Section | Tests | Coverage |
|---|---|---|
| Core (createKeyboard) | 16 | Render, destroy, octave, panic, API |
| Velocity Curves | 1 | Fixed velocity |
| QWERTY Keyboard | 7 | Note on/off, repeat, arrows, Ctrl+Q |
| LED Animations | 2 | Sweep, empty keybed |
| Pressure Display | 11 | AT, MW, combined, skip-frame, release, panic |
| Pitch-Bend Displacement | 8 | Positive/negative/half, combine, panic |
| Ivory Texture | 7 | CSS vars, deterministic, black keys |
| Vintage Wear Stains | 3 | White/black keys, disabled |
| LED Color Callback | 4 | getLedColor, static, fallback |
| Panic Button | 3 | Auto-gen, click, external panicBtnId |

## Known Issues

- None at extraction time.

## Files to Touch for Modifications

- `src/keyboard.js` — Core logic, key rendering, event handlers, panic button auto-gen
- `src/keyboard.css` — Visual styling, theme tokens, panic button styles
- `tests/keyboard.test.js` — Unit tests (58 tests)
