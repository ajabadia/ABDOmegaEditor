# ABDKeyboard — Roadmap

## Phase 1: Extraction ✅
- [x] Create shared project structure
- [x] Move keyboard.js and keyboard.css
- [x] Unit tests (16 tests, vitest + jsdom)
- [x] Documentation (README, CHANGELOG, HANDOFF, ROADMAP)
- [x] npm package.json with exports

## Phase 2: ABDMS2000 Integration ✅
- [x] Replace inline keyboard code with import from ABDKeyboard
- [x] Delete old keyboardAnimations.js, wheelFilmstrip.js
- [x] Remove dead CSS from main.css

## Phase 3: ABDEep Integration
- [x] Port velocity curves (soft/hard/linear/normal/fixed, yPosition source)
- [x] Port pressure display (aftertouch + modwheel + pitchbend visual feedback)
- [x] Port pitch-bend displacement (keys shift horizontally)
- [x] Port per-key ivory texture (deterministic HSL variations)
- [x] Port LED color by mode (getLedColor callback)
- [x] Implement aftertouch generation (channel + polyphonic modes)
- [x] Implement velocity callback (onVelocityChange)
- [ ] Port chord memory (ABDEep feature)
- [ ] Test with ABDEep bridge events
- [ ] Update HANDOFF.md

## Phase 4: ABDCZ101 Integration
- [ ] Port ABDCZ101 keyboard features (vintage wear, 49-key mode)
- [ ] QWERTY validation with CZ-101 note range
- [ ] Test with ABDCZ101 bridge events
- [ ] Update HANDOFF.md

## Phase 5: Polish
- [x] Panic button — auto-generated to right of keybed with red LED + tooltip
- [x] Panic keyboard shortcut — Ctrl+Q / Cmd+Q triggers All Notes Off
- [x] Panic accessibility — role, tabindex, aria-label, Enter/Space support
- [x] Sustain pedal (CC#64) — auto-generated toggle button with green LED
- [x] Sustain keyboard shortcut — Ctrl+Space / Cmd+Space toggles sustain
- [x] Sustain public API — setSustain, getSustain, toggleSustain, onSustainChange
- [x] Aftertouch — channel + polyphonic pressure generation from pointer movement
- [x] Aftertouch public API — setAftertouch, releaseAftertouch, getAftertouch, onAftertouch
- [x] Velocity callback — onVelocityChange fires on every note-on
- [x] Pressure display tests (11 tests: AT, MW, combined, skip-frame, release, panic)
- [x] Pitch-bend displacement tests (8 tests: positive/negative/half, combine, panic)
- [x] Ivory texture tests (7 tests: CSS vars, deterministic, black keys)
- [x] Vintage wear stain tests (3 tests: white/black keys, disabled)
- [x] LED color callback tests (4 tests: getLedColor, static, fallback)
- [x] Panic button tests (3 tests: auto-gen, click, external panicBtnId)
- [x] Sustain pedal tests (11 tests: toggle, LED, auto-gen, panic release)
- [x] Velocity tests (6 tests: callback, fixedVelocity, CSS, curves, per-note)
- [x] Aftertouch tests (13 tests: channel, polyphonic, release, clamping, pointer, panic)
- [ ] Accessibility (ARIA labels, keyboard navigation for screen readers)
- [ ] Animation performance audit (will-change, compositor layers)
- [ ] Multi-touch edge cases (simultaneous keys on same octave)
- [ ] README screenshots / GIF demos
