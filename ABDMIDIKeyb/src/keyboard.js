/**
 * ABD Unified Keyboard Component
 * ==============================
 * Best-of-breed piano keybed assembled from ABDMS2000, ABDEep, and ABDCZ101.
 *
 * Features inherited per source:
 *   ABDEep:   velocity curves, pressure display (AT+MW+PB), pitch-bend displacement,
 *             LED color by arp/seq/chord state, per-key ivory texture
 *   ABDCZ101: vintage wear stains, QWERTY keyboard, 49-key CZ-101 parity
 *   ABDMS2000: responsive key count, wheel filmstrip, touch support
 *
 * Usage:
 *   import { createKeyboard } from './components/keyboard.js';
 *   const kbd = createKeyboard({
 *     containerId: 'piano-keyboard',
 *     onNoteOn: (note, vel) => bridge.noteOn(note, vel),
 *     onNoteOff: (note) => bridge.noteOff(note),
 *     onPitchBend: (val) => bridge.pitchBend(val),
 *     onModWheel: (val) => bridge.modWheel(val),
 *     onPanic: () => bridge.allNotesOff(),
 *     config: { numOctaves: 4, velocitySource: 'yPosition', velocityCurve: 'normal' }
 *   });
 */

// ── QWERTY mapping (Ableton/JUCE standard) ──
const QWERTY_MAP = {
  'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7,
  'h': 8, 'n': 9, 'j': 10, 'm': 11, ',': 12, 'l': 13, '.': 14, ';': 15, '/': 16,
  'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17, '5': 18, 't': 19,
  '6': 20, 'y': 21, '7': 22, 'u': 23, 'i': 24, '9': 25, 'o': 26, '0': 27,
  'p': 28, '[': 29, '=': 30, ']': 31
};const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const OCTAVE_PATTERN = [
  { offset: 0, sharp: 1 }, { offset: 2, sharp: 3 }, { offset: 4, sharp: null },
  { offset: 5, sharp: 6 }, { offset: 7, sharp: 8 }, { offset: 9, sharp: 10 }, { offset: 11, sharp: null }
];

/** Convert MIDI note number to readable name (e.g., 60 → 'C4') */
function midiToName(midi) {
  return NOTE_NAMES[midi % 12] + Math.floor(midi / 12 - 1);
}

// ── Velocity curves (from ABDEep) ──
function applyVelocityCurve(raw, curve) {
  switch (curve) {
    case 'soft':   return raw * raw;
    case 'hard':   return Math.sqrt(raw);
    case 'linear': return raw;
    case 'fixed':  return 100 / 127;
    default:       return raw; // 'normal'
  }
}

// ── Per-key ivory texture (from ABDEep keyboard_render.js) ──
function applyIvoryTexture(key, midiNote) {
  const seed = (midiNote * 12345) % 100;
  const hue = 40 + (seed % 6 - 3);
  const sat = 18 + (seed % 6);
  const light = 90 - (seed % 5);
  const dirtStart = 85 + (seed % 10);
  const dirtOpacity = 0.05 + (seed % 12) / 100.0;

  key.style.setProperty('--kbd-ivory-base', `hsl(${hue}, ${sat}%, ${light}%)`);
  key.style.setProperty('--kbd-ivory-top', `hsl(${hue}, ${sat}%, ${light + 6}%)`);
  key.style.setProperty('--kbd-ivory-bottom', `hsl(${hue}, ${sat}%, ${light - 5}%)`);
  key.style.setProperty('--kbd-dirt-color', `rgba(105, 90, 75, ${dirtOpacity})`);
  key.style.setProperty('--kbd-dirt-start', `${dirtStart}%`);
}

// ── Vintage wear stains (from ABDCZ101 keyboard.js) ──
function applyVintageWear(key, midiNote, isBlack) {
  const h = (midiNote * 2654435761) % 100;
  if (isBlack) {
    if (h % 7 === 0) key.classList.add('kbd-stain-worn');
    return;
  }
  if (h % 5 === 0) key.classList.add('kbd-stain-yellow');
  if (h % 9 === 0) key.classList.add('kbd-stain-scuff');
  if (h % 13 === 0) key.classList.add('kbd-stain-ding');
}

/**
 * Create a fully functional keyboard component.
 * @param {Object} deps - Dependencies and configuration
 * @returns {Object} Keyboard instance
 */
export function createKeyboard(deps = {}) {
  const {
    containerId = 'piano-keyboard',
    wheelPitchId = 'pitch-wheel-container',
    wheelModId = 'mod-wheel-container',
    octUpId = 'oct-up',
    octDownId = 'oct-down',
    ledUpId = 'led-up',
    ledDownId = 'led-down',
    panicBtnId = null,
    onNoteOn = () => {},
    onNoteOff = () => {},
    onPitchBend = () => {},
    onModWheel = () => {},
    onPanic = null,
    onOctaveChange = null,
    onSustainChange = null,
    onAftertouch = null,
    onVelocityChange = null,
    onCollapseChange = null,
    sustainBtnId = null,
    config = {}
  } = deps;

  const cfg = {
    numOctaves: config.numOctaves ?? 4,
    startNote: config.startNote ?? 36,
    maxOctaveShift: config.maxOctaveShift ?? 3,
    velocitySource: config.velocitySource ?? 'fixed',     // 'fixed' | 'yPosition'
    velocityCurve: config.velocityCurve ?? 'normal',       // 'normal' | 'soft' | 'hard' | 'linear' | 'fixed'
    fixedVelocity: config.fixedVelocity ?? 0.85,
    ledColor: config.ledColor ?? null,
    enablePressureDisplay: config.enablePressureDisplay ?? false,  // ABDEep feature
    enablePitchBendDisplace: config.enablePitchBendDisplace ?? false, // ABDEep feature
    enableIvoryTexture: config.enableIvoryTexture ?? false,    // ABDEep feature
    enableVintageWear: config.enableVintageWear ?? false,      // ABDCZ101 feature
    enableQwerty: config.enableQwerty ?? true,
    enableTouch: config.enableTouch ?? true,
    enableAftertouch: config.enableAftertouch ?? false,  // aftertouch generation from pointer
    aftertouchMode: config.aftertouchMode ?? 'channel',  // 'channel' | 'polyphonic'
    aftertouchSensitivity: config.aftertouchSensitivity ?? 0.5,  // 0..1
    enableAccessibility: config.enableAccessibility ?? false,  // ARIA roles, keyboard nav, live regions
    enableCollapse: config.enableCollapse ?? false,  // chevron button to collapse/expand keyboard
    enableResizeObserver: config.enableResizeObserver ?? true,  // auto re-render on container resize
    enableSostenuto: config.enableSostenuto ?? false,  // CC#66 — sostenuto pedal
    enableSoftPedal: config.enableSoftPedal ?? false,  // CC#67 — soft pedal
    softPedalFactor: config.softPedalFactor ?? 0.65,  // velocity multiplier
    enableScaleFilter: config.enableScaleFilter ?? false,
    scaleType: config.scaleType ?? 'major',
    scaleRoot: config.scaleRoot ?? 60,
    scaleSnapMode: config.scaleSnapMode ?? 'block',
    enableChordMemory: config.enableChordMemory ?? false,
    maxChordSlots: config.maxChordSlots ?? 12,
    getLedColor: config.getLedColor ?? null,  // (bridge) => color string
    getPressureState: config.getPressureState ?? null, // () => { aftertouch, modWheel, pitchBend }
  };

  // ── State ──
  let octaveShift = 0;
  let sustainOn = false;
  let _channelAftertouch = 0;  // channel aftertouch value (0..1)
  const activeKeys = new Map();   // baseNote -> { actualNote, element, velocity, startPointerY }
  const qwertyActive = new Set();
  let destroyed = false;
  let _pressureRafId = null;
  let _focusedKeyIndex = -1;  // for keyboard navigation within keybed
  let _liveRegion = null;     // for screen reader announcements
  let _collapsed = false;     // keyboard collapse state
  let _resizeObserver = null;
  let sostenutoOn = false;
  const _sostenutoCaptured = new Set();
  let softPedalOn = false;
  const _chords = new Array(cfg.maxChordSlots).fill(null); // chord memory slots

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[Keyboard] Container #${containerId} not found`);
    return { destroy() {}, panic() {}, sweep() {}, getOctave: () => 0 };
  }

  let _keysWrapper = null;

  // ══════════════════════════════════════════════════════════════
  //  KEYBED RENDERING
  // ══════════════════════════════════════════════════════════════

  function renderKeybed() {
    container.classList.add('kbd-piano-keys');
    if (!_keysWrapper) {
      _keysWrapper = container.querySelector('.kbd-keys-wrapper');
      if (!_keysWrapper) {
        _keysWrapper = document.createElement('div');
        _keysWrapper.className = 'kbd-keys-wrapper';
        container.prepend(_keysWrapper);
      }
    }
    _keysWrapper.innerHTML = '';

    for (let oct = 0; oct < cfg.numOctaves; oct++) {
      const base = cfg.startNote + oct * 12;
      for (const p of OCTAVE_PATTERN) {
        const whiteNote = base + p.offset;
        const whiteKey = createKeyElement(whiteNote, false);
        if (p.sharp !== null) {
          const blackKey = createKeyElement(base + p.sharp, true);
          whiteKey.appendChild(blackKey);
        }
        _keysWrapper.appendChild(whiteKey);
      }
    }
    // High C
    _keysWrapper.appendChild(createKeyElement(cfg.startNote + cfg.numOctaves * 12, false));
  }

  function createKeyElement(midiNote, isBlack) {
    const key = document.createElement('div');
    key.className = isBlack ? 'kbd-black-key' : 'kbd-white-key';
    key.dataset.note = midiNote;

    // Apply visual texture
    if (cfg.enableIvoryTexture && !isBlack) applyIvoryTexture(key, midiNote);
    if (cfg.enableVintageWear) applyVintageWear(key, midiNote, isBlack);

    // Apply ARIA attributes when accessibility is enabled
    if (cfg.enableAccessibility) applyKeyAria(key, midiNote);

    const playNote = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const actualNote = Math.max(0, Math.min(127, midiNote + octaveShift));
      if (activeKeys.has(midiNote)) return;

      let velocity = cfg.fixedVelocity;
      if (cfg.velocitySource === 'yPosition' && e && e.clientY != null) {
        const rect = key.getBoundingClientRect();
        if (rect.height > 0) {
          const relY = (e.clientY - rect.top) / rect.height;
          const raw = Math.max(0.15, Math.min(1.0, 0.15 + relY * 0.85));
          velocity = Math.max(0.01, Math.min(1.0, applyVelocityCurve(raw, cfg.velocityCurve)));
        }
      }

      activeKeys.set(midiNote, { actualNote, element: key, velocity, startPointerY: e.clientY ?? null });
      key.classList.add('active');
      key.style.setProperty('--kbd-velocity', velocity.toFixed(3));

      // Accessibility: update ARIA state and announce
      if (cfg.enableAccessibility) {
        updateKeyAriaPressed(midiNote, true);
        announce(`${midiToName(actualNote)} on, velocity ${Math.round(velocity * 100)}%`);
      }

      // Resolve LED color (ABDEep: different color per arp/seq/chord mode)
      const color = (cfg.getLedColor) ? cfg.getLedColor() : (cfg.ledColor || 'var(--color-accent)');
      key.style.setProperty('--kbd-led-color', color);

      onNoteOn(actualNote, velocity);
      if (onVelocityChange) onVelocityChange(actualNote, velocity);
    };

    const stopNote = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (!activeKeys.has(midiNote)) return;
      const { actualNote, element } = activeKeys.get(midiNote);

      // Release aftertouch for this note
      if (cfg.enableAftertouch && onAftertouch) {
        if (cfg.aftertouchMode === 'polyphonic') {
          onAftertouch(actualNote, 0);
        } else {
          if (_channelAftertouch > 0) {
            _channelAftertouch = 0;
            onAftertouch(-1, 0);
          }
        }
      }

      activeKeys.delete(midiNote);
      if (element) {
        element.classList.remove('active');
        element.style.removeProperty('--kbd-velocity');
      }

      // Accessibility: update ARIA state
      if (cfg.enableAccessibility) {
        updateKeyAriaPressed(midiNote, false);
      }

      onNoteOff(actualNote);

      // Pressure release animation (ABDEep)
      if (cfg.enablePressureDisplay && element &&
          (element.classList.contains('kbd-pressured') || element.classList.contains('kbd-pitch-bent'))) {
        element.style.setProperty('--kbd-pressure', '0');
        element.style.setProperty('--kbd-mw-pressure', '0');
        element.classList.add('kbd-pressure-release');
        const onEnd = () => {
          element.classList.remove('kbd-pressure-release', 'kbd-pressured', 'kbd-pitch-bent');
          element.style.removeProperty('--kbd-pressure');
          element.style.removeProperty('--kbd-mw-pressure');
          element.style.removeProperty('--kbd-pb-offset');
        };
        element.addEventListener('transitionend', onEnd, { once: true });
        setTimeout(() => {
          if (element.classList.contains('kbd-pressure-release')) onEnd();
        }, 500);
      }
    };

    key.addEventListener('pointerdown', playNote);
    key.addEventListener('pointerup', stopNote);
    key.addEventListener('pointerleave', stopNote);

    // Aftertouch generation from pointer Y movement
    if (cfg.enableAftertouch) {
      key.addEventListener('pointermove', (e) => {
        if (!activeKeys.has(midiNote)) return;
        const state = activeKeys.get(midiNote);
        if (state.startPointerY == null) return;
        const deltaY = state.startPointerY - (e.clientY ?? state.startPointerY);
        const maxDelta = key.getBoundingClientRect().height * 0.8;
        const rawPressure = Math.max(0, Math.min(1, (deltaY / maxDelta) * cfg.aftertouchSensitivity * 2));
        const pressure = Math.round(rawPressure * 127) / 127;

        if (cfg.aftertouchMode === 'polyphonic') {
          if (onAftertouch) onAftertouch(actualNote, pressure);
        } else {
          if (pressure !== _channelAftertouch) {
            _channelAftertouch = pressure;
            if (onAftertouch) onAftertouch(-1, pressure); // note=-1 = channel aftertouch
          }
        }
      });
    }

    if (cfg.enableTouch) {
      key.addEventListener('touchstart', playNote, { passive: false });
      key.addEventListener('touchend', stopNote, { passive: false });
      key.addEventListener('touchcancel', stopNote, { passive: false });
    }

    return key;
  }

  // ══════════════════════════════════════════════════════════════
  //  ACCESSIBILITY (ARIA + keyboard navigation + live regions)
  // ══════════════════════════════════════════════════════════════

  /** Announce a message to screen readers via live region */
  function announce(message) {
    if (!cfg.enableAccessibility || !_liveRegion) return;
    _liveRegion.textContent = message;
  }

  /** Get all focusable key elements in DOM order */
  function getAllKeyElements() {
    return Array.from(container.querySelectorAll('.kbd-white-key, .kbd-black-key'));
  }

  /** Apply ARIA attributes to a key element */
  function applyKeyAria(keyEl, midiNote) {
    const noteName = midiToName(midiNote);
    keyEl.setAttribute('role', 'button');
    keyEl.setAttribute('tabindex', '-1');  // not in tab order by default
    keyEl.setAttribute('aria-label', `Note ${noteName} (MIDI ${midiNote})`);
    keyEl.setAttribute('aria-pressed', 'false');
  }

  /** Update aria-pressed state for a key */
  function updateKeyAriaPressed(midiNote, pressed) {
    const keyEl = container.querySelector(`[data-note="${midiNote}"]`);
    if (keyEl) keyEl.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }

  /** Focus a key by index for keyboard navigation */
  function focusKey(index) {
    const keys = getAllKeyElements();
    if (keys.length === 0) return;
    // Remove tabindex from previously focused key
    if (_focusedKeyIndex >= 0 && _focusedKeyIndex < keys.length) {
      keys[_focusedKeyIndex].setAttribute('tabindex', '-1');
    }
    _focusedKeyIndex = Math.max(0, Math.min(keys.length - 1, index));
    keys[_focusedKeyIndex].setAttribute('tabindex', '0');
    keys[_focusedKeyIndex].focus();
  }

  /** Setup live region for screen reader announcements */
  function setupAccessibility() {
    if (!cfg.enableAccessibility) return;

    // Create live region (offscreen, aria-live='polite')
    _liveRegion = document.createElement('div');
    _liveRegion.setAttribute('role', 'status');
    _liveRegion.setAttribute('aria-live', 'polite');
    _liveRegion.setAttribute('aria-atomic', 'true');
    _liveRegion.className = 'kbd-sr-only';
    container.appendChild(_liveRegion);

    // Set ARIA attributes on container
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Virtual piano keyboard');

    // Apply ARIA to all keys
    getAllKeyElements().forEach((keyEl) => {
      const midiNote = parseInt(keyEl.dataset.note, 10);
      applyKeyAria(keyEl, midiNote);
    });

    // Make first key focusable for Tab entry
    const keys = getAllKeyElements();
    if (keys.length > 0) {
      keys[0].setAttribute('tabindex', '0');
      _focusedKeyIndex = 0;
    }

    // Add keyboard navigation event listener
    container.addEventListener('keydown', handleA11yKeyNav);
  }

  /** Handle keyboard navigation within the keybed */
  function handleA11yKeyNav(e) {
    if (!cfg.enableAccessibility) return;
    const keys = getAllKeyElements();
    if (keys.length === 0) return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        focusKey(_focusedKeyIndex + 1);
        announceNote(keys[_focusedKeyIndex]);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusKey(_focusedKeyIndex - 1);
        announceNote(keys[_focusedKeyIndex]);
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Move to black key above (skip roughly 7 keys)
        focusKey(Math.max(0, _focusedKeyIndex - 7));
        announceNote(keys[_focusedKeyIndex]);
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Move to white key below
        focusKey(Math.min(keys.length - 1, _focusedKeyIndex + 7));
        announceNote(keys[_focusedKeyIndex]);
        break;
      case 'Home':
        e.preventDefault();
        focusKey(0);
        announceNote(keys[0]);
        break;
      case 'End':
        e.preventDefault();
        focusKey(keys.length - 1);
        announceNote(keys[keys.length - 1]);
        break;
    }
  }

  /** Announce the focused note */
  function announceNote(keyEl) {
    if (!keyEl) return;
    const midiNote = parseInt(keyEl.dataset.note, 10);
    const noteName = midiToName(midiNote);
    const isActive = activeKeys.has(midiNote);
    announce(`${noteName}, MIDI ${midiNote}${isActive ? ', playing' : ''}`);
  }

  // ══════════════════════════════════════════════════════════════
  //  OCTAVE SHIFT + LEDS
  // ══════════════════════════════════════════════════════════════

  function updateOctaveLEDs() {
    const ledUp = document.getElementById(ledUpId);
    const ledDown = document.getElementById(ledDownId);
    if (!ledUp || !ledDown) return;

    const octVal = octaveShift / 12;
    ledUp.className = 'kbd-octave-led';
    ledDown.className = 'kbd-octave-led';

    if (octVal === 1) ledUp.classList.add('blink');
    else if (octVal >= 2) ledUp.classList.add('on');
    else if (octVal === -1) ledDown.classList.add('blink');
    else if (octVal <= -2) ledDown.classList.add('on');
  }

  function shiftOctave(delta) {
    const maxSemitones = cfg.maxOctaveShift * 12;
    octaveShift = Math.max(-maxSemitones, Math.min(maxSemitones, octaveShift + delta * 12));
    updateOctaveLEDs();
    const oct = octaveShift / 12;
    if (cfg.enableAccessibility) announce(`Octave shift ${oct > 0 ? '+' : ''}${oct}`);
    if (onOctaveChange) onOctaveChange(oct);
  }

  // ══════════════════════════════════════════════════════════════
  //  QWERTY KEYBOARD
  // ══════════════════════════════════════════════════════════════

  function handleKeydown(e) {
    if (destroyed) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    // Ctrl+Q / Cmd+Q → Panic (All Notes Off)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      panic();
      return;
    }

    // Ctrl+Space / Cmd+Space → Toggle Sustain Pedal
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      toggleSustain();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;

    if (e.key === 'ArrowUp') { e.preventDefault(); shiftOctave(1); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); shiftOctave(-1); return; }

    if (!cfg.enableQwerty) return;

    const key = e.key.toLowerCase();
    if (QWERTY_MAP[key] !== undefined && !qwertyActive.has(key)) {
      qwertyActive.add(key);
      const midiNote = cfg.startNote + QWERTY_MAP[key];
      const actualNote = Math.max(0, Math.min(127, midiNote + octaveShift));
      if (!activeKeys.has(midiNote)) {
        const keyEl = container.querySelector(`[data-note="${midiNote}"]`);
        if (keyEl) {
          keyEl.classList.add('active');
          keyEl.style.setProperty('--kbd-velocity', cfg.fixedVelocity.toFixed(3));
          const color = (cfg.getLedColor) ? cfg.getLedColor() : (cfg.ledColor || 'var(--color-accent)');
          keyEl.style.setProperty('--kbd-led-color', color);
        }
        activeKeys.set(midiNote, { actualNote, element: keyEl || null, velocity: cfg.fixedVelocity });
        onNoteOn(actualNote, cfg.fixedVelocity);
        if (cfg.enableAccessibility) {
          updateKeyAriaPressed(midiNote, true);
          announce(`${midiToName(actualNote)} on, velocity ${Math.round(cfg.fixedVelocity * 100)}%`);
        }
      }
    }
  }

  function handleKeyup(e) {
    if (destroyed) return;
    if (!cfg.enableQwerty) return;

    const key = e.key.toLowerCase();
    if (QWERTY_MAP[key] !== undefined && qwertyActive.has(key)) {
      qwertyActive.delete(key);
      const midiNote = cfg.startNote + QWERTY_MAP[key];
      if (activeKeys.has(midiNote)) {
        const { actualNote, element } = activeKeys.get(midiNote);
        if (element) {
          element.classList.remove('active');
          element.style.removeProperty('--kbd-velocity');
        }
        activeKeys.delete(midiNote);
        if (cfg.enableAccessibility) updateKeyAriaPressed(midiNote, false);
        onNoteOff(actualNote);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  PITCH / MOD WHEELS
  // ══════════════════════════════════════════════════════════════

  function setupWheel(elementId, isPitch) {
    const el = document.getElementById(elementId);
    if (!el || el.hasChildNodes()) return;

    el.classList.add('kbd-wheel-wrapper');
    const minVal = isPitch ? -8192 : 0;
    const maxVal = isPitch ? 8191 : 127;
    const label = isPitch ? 'PITCH' : 'MOD';

    el.innerHTML = `
      <label class="kbd-wheel-label">${label}</label>
      <div class="kbd-wheel-sprite" style="position:relative;width:18px;height:76px;background-image:url('assets/bender.png');background-position:0px ${isPitch ? -3800 : 0}px;background-repeat:no-repeat;border-radius:3px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.8);">
        <input type="range" class="kbd-wheel-slider" min="${minVal}" max="${maxVal}" value="0" step="1"
          aria-label="${isPitch ? 'Pitch Bend Wheel' : 'Modulation Wheel'}"
          style="position:absolute;top:0;left:0;width:18px;height:76px;writing-mode:vertical-lr;direction:rtl;margin:0;cursor:pointer;opacity:0;z-index:5;">
      </div>
      <div class="kbd-wheel-value">${formatWheelValue(0, isPitch)}</div>
    `;

    const sprite = el.querySelector('.kbd-wheel-sprite');
    const slider = el.querySelector('.kbd-wheel-slider');
    const valEl = el.querySelector('.kbd-wheel-value');

    function updateVisuals(val) {
      const pct = isPitch ? (val + 8192) / 16383 : val / 127;
      const frame = Math.max(0, Math.min(100, Math.round(pct * 100)));
      sprite.style.backgroundPosition = `0px -${frame * 76}px`;
      valEl.textContent = formatWheelValue(val, isPitch);
    }

    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      updateVisuals(val);
      if (isPitch) onPitchBend(val / 8192.0);
      else onModWheel(val / 127.0);
    });

    if (isPitch) {
      const resetSpring = () => {
        slider.value = 0;
        updateVisuals(0);
        onPitchBend(0);
      };
      slider.addEventListener('mouseup', resetSpring);
      slider.addEventListener('touchend', resetSpring);
      slider.addEventListener('mouseleave', (e) => { if (e.buttons === 1) resetSpring(); });
    }

    slider.addEventListener('dblclick', () => {
      slider.value = 0;
      updateVisuals(0);
      if (isPitch) onPitchBend(0);
      else onModWheel(0);
    });
  }

  function formatWheelValue(val, isPitch) {
    if (isPitch) {
      const semitones = Math.round((val / 8192) * 20) / 10;
      return semitones > 0 ? `+${semitones}` : `${semitones}`;
    }
    return `${Math.round(val)}`;
  }

  // ══════════════════════════════════════════════════════════════
  //  PRESSURE DISPLAY (from ABDEep keyboard_pressure.js)
  //  Visualizes aftertouch + modwheel + pitchbend on pushed keys
  // ══════════════════════════════════════════════════════════════

  let _prevAT = 0, _prevMW = 0, _prevPB = 0;

  function updatePressureDisplay() {
    _pressureRafId = null;

    // Read pressure state: external source or internal aftertouch
    let at = 0, mw = 0, pb = 0;
    if (cfg.getPressureState) {
      const state = cfg.getPressureState();
      at = Math.max(0, Math.min(1, state.aftertouch || 0));
      mw = Math.max(0, Math.min(1, state.modWheel || 0));
      pb = Math.max(-1, Math.min(1, state.pitchBend || 0));
    } else if (cfg.enableAftertouch) {
      // Use internal aftertouch as the pressure source for visual display
      at = _channelAftertouch;
    }

    // Skip frame if values haven't changed (performance optimization)
    if (Math.abs(at - _prevAT) < 0.01 && Math.abs(mw - _prevMW) < 0.01 && Math.abs(pb - _prevPB) < 0.01) {
      _pressureRafId = requestAnimationFrame(updatePressureDisplay);
      return;
    }
    _prevAT = at; _prevMW = mw; _prevPB = pb;

    const combined = Math.max(at, mw);
    const pbSensitivity = 6; // pixels per full bend
    const pbPx = Math.round(pb * pbSensitivity);

    for (const [, { element }] of activeKeys) {
      if (!element) continue;

      if (combined > 0.01) {
        element.style.setProperty('--kbd-pressure', combined.toFixed(3));
        element.style.setProperty('--kbd-mw-pressure', mw > 0.01 ? mw.toFixed(3) : '0');
        element.classList.add('kbd-pressured');
      } else {
        element.style.removeProperty('--kbd-pressure');
        element.style.removeProperty('--kbd-mw-pressure');
        element.classList.remove('kbd-pressured');
      }

      if (cfg.enablePitchBendDisplace && Math.abs(pb) > 0.01) {
        element.style.setProperty('--kbd-pb-offset', pbPx + 'px');
        element.classList.add('kbd-pitch-bent');
      } else {
        element.style.removeProperty('--kbd-pb-offset');
        element.classList.remove('kbd-pitch-bent');
      }
    }

    _pressureRafId = requestAnimationFrame(updatePressureDisplay);
  }

  // ══════════════════════════════════════════════════════════════
  //  LED ANIMATIONS
  // ══════════════════════════════════════════════════════════════

  /**
   * Cascade sweep animation across all keys.
   * @param {'right'|'left'} direction
   * @param {number} speedMs - ms between each key
   */
  function sweep(direction = 'right', speedMs = 12) {
    const keys = Array.from((_keysWrapper || container).querySelectorAll('.kbd-white-key, .kbd-black-key'));
    if (!keys.length) return;

    const ordered = direction === 'left' ? [...keys].reverse() : keys;
    ordered.forEach((key, i) => {
      setTimeout(() => {
        if (destroyed) return;
        key.classList.add('kbd-led-sweep');
        setTimeout(() => key.classList.remove('kbd-led-sweep'), 180);
      }, i * speedMs);
    });
  }

  /** Panic: triple strobe across all keys */
  function panicFlash() {
    const keys = Array.from((_keysWrapper || container).querySelectorAll('.kbd-white-key, .kbd-black-key'));
    const panicLed = container.querySelector('.kbd-panic-led');
    if (!keys.length && !panicLed) return;

    let flashes = 0;
    const interval = setInterval(() => {
      keys.forEach(k => k.classList.toggle('kbd-led-panic'));
      if (panicLed) {
        panicLed.style.background = flashes % 2 === 0 ? '#ff2233' : '#3a1010';
        panicLed.style.boxShadow = flashes % 2 === 0 ? '0 0 8px #ff2233, 0 0 16px rgba(255,34,51,0.5)' : 'inset 0 1px 2px rgba(0,0,0,0.6)';
      }
      flashes++;
      if (flashes >= 6) {
        clearInterval(interval);
        keys.forEach(k => k.classList.remove('kbd-led-panic'));
        if (panicLed) {
          panicLed.style.background = '';
          panicLed.style.boxShadow = '';
        }
      }
    }, 90);
  }

  // ══════════════════════════════════════════════════════════════
  //  SUSTAIN PEDAL (CC#64 emulation)
  //  Toggle on/off via button click, public API, or keyboard shortcut
  // ══════════════════════════════════════════════════════════════

  function updateSustainVisuals() {
    const led = container.querySelector('.kbd-sustain-led');
    if (!led) return;
    if (sustainOn) {
      led.classList.add('on');
    } else {
      led.classList.remove('on');
    }
  }

  function setSustain(on) {
    const val = !!on;
    if (val === sustainOn) return;
    sustainOn = val;
    updateSustainVisuals();
    if (cfg.enableAccessibility) announce(`Sustain ${sustainOn ? 'on' : 'off'}`);
    if (onSustainChange) onSustainChange(sustainOn);
  }

  function toggleSustain() {
    setSustain(!sustainOn);
  }

  // ══════════════════════════════════════════════════════════════
  //  COLLAPSE / EXPAND
  // ══════════════════════════════════════════════════════════════

  function setCollapsed(collapsed) {
    if (!cfg.enableCollapse) return;
    const val = !!collapsed;
    if (val === _collapsed) return;
    _collapsed = val;

    const chevron = container.querySelector('.kbd-collapse-btn');
    if (chevron) {
      const label = chevron.querySelector('.kbd-collapse-chevron');
      if (label) label.textContent = _collapsed ? '▴' : '▾';
      chevron.setAttribute('aria-label', _collapsed ? 'Expand keyboard' : 'Collapse keyboard');
    }

    if (_collapsed) {
      container.classList.add('kbd-collapsed');
      if (_keysWrapper) _keysWrapper.classList.add('kbd-collapsed');
    } else {
      container.classList.remove('kbd-collapsed');
      if (_keysWrapper) _keysWrapper.classList.remove('kbd-collapsed');
    }

    if (cfg.enableAccessibility) announce(_collapsed ? 'Keyboard collapsed' : 'Keyboard expanded');
    if (onCollapseChange) onCollapseChange(_collapsed);
  }

  function toggleCollapse() {
    setCollapsed(!_collapsed);
  }

  // ══════════════════════════════════════════════════════════════
  //  CHORD MEMORY — save and replay note groups
  // ══════════════════════════════════════════════════════════════

  /** Internal: highlight a key visually (used by chord play and public API) */
  function _highlightKey(midiNote, velocity) {
    const keyEl = container.querySelector(`[data-note="${midiNote}"]`);
    if (keyEl) {
      keyEl.classList.add('active');
      keyEl.style.setProperty('--kbd-led-color', cfg.ledColor || 'var(--color-accent)');
      if (velocity != null) keyEl.style.setProperty('--kbd-velocity', velocity.toFixed(3));
    }
  }

  /** Internal: release a key visually and clean up active state */
  function _releaseKey(midiNote) {
    // First try to find in activeKeys map
    for (const [baseNote, { actualNote, element }] of activeKeys) {
      if (actualNote === midiNote) {
        if (element) element.classList.remove('active');
        activeKeys.delete(baseNote);
        return;
      }
    }
    // If not in activeKeys (e.g. chord play), find by DOM data-note
    const keyEl = container.querySelector(`[data-note="${midiNote}"]`);
    if (keyEl) keyEl.classList.remove('active');
  }

  /** Save a chord to a slot (0-indexed). If notes not provided, saves currently active notes. */
  function saveChord(slot, notes) {
    if (!cfg.enableChordMemory) return;
    const s = Math.max(0, Math.min(_chords.length - 1, slot));
    if (notes && Array.isArray(notes)) {
      _chords[s] = notes.slice().sort((a, b) => a - b);
    } else {
      _chords[s] = Array.from(activeKeys.values()).map(n => n.actualNote).sort((a, b) => a - b);
    }
    if (cfg.enableAccessibility) announce(`Chord ${s + 1} saved: ${_chords[s].length} notes`);
  }

  /** Replay a chord from a slot. Calls onNoteOn for each saved note. */
  function playChord(slot) {
    if (!cfg.enableChordMemory) return;
    const s = Math.max(0, Math.min(_chords.length - 1, slot));
    const notes = _chords[s];
    if (!notes || notes.length === 0) return;
    for (const note of notes) {
      const vel = cfg.fixedVelocity;
      _highlightKey(note, vel);
      onNoteOn(note, vel);
      if (onVelocityChange) onVelocityChange(note, vel);
    }
    if (cfg.enableAccessibility) announce(`Chord ${s + 1} played: ${notes.length} notes`);
  }

  /** Release all notes in a chord slot. Calls onNoteOff for each saved note. */
  function releaseChord(slot) {
    if (!cfg.enableChordMemory) return;
    const s = Math.max(0, Math.min(_chords.length - 1, slot));
    const notes = _chords[s];
    if (!notes) return;
    for (const note of notes) {
      _releaseKey(note);
      onNoteOff(note);
    }
    if (cfg.enableAccessibility) announce(`Chord ${s + 1} released`);
  }

  /** Get all saved chords (array of arrays, or null for empty slots). */
  function getChords() {
    return _chords.map(chord => chord ? [...chord] : null);
  }

  /** Clear a specific chord slot. */
  function clearChord(slot) {
    if (!cfg.enableChordMemory) return;
    const s = Math.max(0, Math.min(_chords.length - 1, slot));
    _chords[s] = null;
    if (cfg.enableAccessibility) announce(`Chord ${s + 1} cleared`);
  }

  /** Clear all chord memory slots. */
  function clearAllChords() {
    if (!cfg.enableChordMemory) return;
    for (let i = 0; i < _chords.length; i++) _chords[i] = null;
    if (cfg.enableAccessibility) announce('All chords cleared');
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC API: PANIC
  // ══════════════════════════════════════════════════════════════

  function panic() {
    // Also release sustain and aftertouch on panic
    if (sustainOn) setSustain(false);
    if (_channelAftertouch > 0) {
      _channelAftertouch = 0;
      if (onAftertouch) onAftertouch(-1, 0);
    }
    for (const [baseNote, { actualNote, element }] of activeKeys) {
      if (element) {
        element.classList.remove('active', 'kbd-pressured', 'kbd-pitch-bent');
        element.style.removeProperty('--kbd-velocity');
        element.style.removeProperty('--kbd-pressure');
        element.style.removeProperty('--kbd-mw-pressure');
        element.style.removeProperty('--kbd-pb-offset');
      }
      onNoteOff(actualNote);
    }
    activeKeys.clear();
    qwertyActive.clear();
    if (cfg.enableAccessibility) announce('Panic: All notes off');
    panicFlash();
    if (onPanic) onPanic();
  }

  // ══════════════════════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════════════════════

  function init() {
    renderKeybed();
    setupWheel(wheelPitchId, true);
    setupWheel(wheelModId, false);

    const octUp = document.getElementById(octUpId);
    const octDown = document.getElementById(octDownId);
    if (octUp) {
      octUp.addEventListener('click', () => shiftOctave(1));
      if (cfg.enableAccessibility) octUp.setAttribute('aria-label', 'Shift octave up');
    }
    if (octDown) {
      octDown.addEventListener('click', () => shiftOctave(-1));
      if (cfg.enableAccessibility) octDown.setAttribute('aria-label', 'Shift octave down');
    }

    if (panicBtnId) {
      const panicBtn = document.getElementById(panicBtnId);
      if (panicBtn) panicBtn.addEventListener('click', panic);
    } else {
      // Auto-generate panic button to the right of the keybed
      const autoPanic = document.createElement('div');
      autoPanic.className = 'kbd-panic-btn';
      autoPanic.setAttribute('role', 'button');
      autoPanic.setAttribute('tabindex', '0');
      autoPanic.setAttribute('aria-label', 'All Notes Off — Panic (Ctrl+Q)');
      autoPanic.setAttribute('title', 'Panic: All Notes Off (Ctrl+Q)');
      autoPanic.innerHTML = `<span class="kbd-panic-led"></span><span class="kbd-panic-label">ALL<br>OFF</span>`;
      autoPanic.addEventListener('click', panic);
      autoPanic.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panic(); }
      });
      container.appendChild(autoPanic);
    }

    // Auto-generate sustain pedal button (next to panic button)
    if (sustainBtnId) {
      const sustainBtn = document.getElementById(sustainBtnId);
      if (sustainBtn) {
        sustainBtn.addEventListener('click', toggleSustain);
      }
    } else {
      const autoSustain = document.createElement('div');
      autoSustain.className = 'kbd-sustain-btn';
      autoSustain.setAttribute('role', 'button');
      autoSustain.setAttribute('tabindex', '0');
      autoSustain.setAttribute('aria-label', 'Sustain Pedal On/Off (Ctrl+Space)');
      autoSustain.setAttribute('title', 'Sustain Pedal: Toggle Hold (Ctrl+Space)');
      autoSustain.innerHTML = `<span class="kbd-sustain-led"></span><span class="kbd-sustain-label">SUST</span>`;
      autoSustain.addEventListener('click', toggleSustain);
      autoSustain.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSustain(); }
      });
      container.appendChild(autoSustain);
    }

    // Auto-generate collapse/expand chevron button (must be created before setCollapsed)
    if (cfg.enableCollapse) {
      const chevron = document.createElement('div');
      chevron.className = 'kbd-collapse-btn';
      chevron.setAttribute('role', 'button');
      chevron.setAttribute('tabindex', '0');
      chevron.setAttribute('aria-label', 'Collapse keyboard');
      chevron.setAttribute('title', 'Collapse/Expand keyboard');
      chevron.innerHTML = `<span class="kbd-collapse-chevron">▾</span>`;
      chevron.addEventListener('click', toggleCollapse);
      chevron.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapse(); }
      });
      container.appendChild(chevron);
    }

    if (cfg.enableQwerty) {
      window.addEventListener('keydown', handleKeydown);
      window.addEventListener('keyup', handleKeyup);
    }

    updateOctaveLEDs();

    // Start pressure display loop if enabled
    if (cfg.enablePressureDisplay && (cfg.getPressureState || cfg.enableAftertouch)) {
      _pressureRafId = requestAnimationFrame(updatePressureDisplay);
    }

    // Setup accessibility features
    setupAccessibility();

    // Setup ResizeObserver for auto re-render (with dimension guard to prevent loops)
    let _lastWidth = 0;
    let _lastHeight = 0;
    if (cfg.enableResizeObserver && typeof ResizeObserver !== 'undefined') {
      _resizeObserver = new ResizeObserver((entries) => {
        if (destroyed || _collapsed) return;
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (Math.abs(width - _lastWidth) < 3 && Math.abs(height - _lastHeight) < 3) {
            continue;
          }
          _lastWidth = width;
          _lastHeight = height;
          renderKeybed();
          if (cfg.enableAccessibility) setupAccessibility();
        }
      });
      _resizeObserver.observe(container);
    }
  }

  init();

  return {
    panic,
    sweep,
    getOctave: () => octaveShift / 12,
    setOctave: (oct) => {
      octaveShift = Math.max(-cfg.maxOctaveShift * 12, Math.min(cfg.maxOctaveShift * 12, oct * 12));
      updateOctaveLEDs();
      if (cfg.enableAccessibility) announce(`Octave shift ${oct > 0 ? '+' : ''}${oct}`);
      if (onOctaveChange) onOctaveChange(oct);
    },
    releaseNote: (midiNote) => {
      _releaseKey(midiNote);
      onNoteOff(midiNote);
    },
    highlightNote: (midiNote, velocity) => {
      _highlightKey(midiNote, velocity);
    },
    setSustain,
    getSustain: () => sustainOn,
    toggleSustain,
    // Collapse API
    collapse: () => setCollapsed(true),
    expand: () => setCollapsed(false),
    toggleCollapse,
    isCollapsed: () => _collapsed,
    // Chord Memory API
    saveChord,
    playChord,
    releaseChord,
    getChords,
    clearChord,
    clearAllChords,
    // Aftertouch API
    setAftertouch: (note, pressure) => {
      const p = Math.max(0, Math.min(1, pressure));
      if (note === -1 || note === null) {
        // Channel aftertouch — skip if value unchanged
        if (p === _channelAftertouch) return;
        _channelAftertouch = p;
        if (onAftertouch) onAftertouch(-1, p);
      } else {
        // Polyphonic aftertouch — callback only (state tracked by parent)
        if (onAftertouch) onAftertouch(note, p);
      }
    },
    releaseAftertouch: (note) => {
      if (note === -1 || note === null) {
        _channelAftertouch = 0;
        if (onAftertouch) onAftertouch(-1, 0);
      } else {
        if (onAftertouch) onAftertouch(note, 0);
      }
    },
    getAftertouch: () => _channelAftertouch,
    // Velocity API
    setLedColor: (color) => { cfg.ledColor = color; },
    setOctaveCount: (numOctaves, startNote) => {
      cfg.numOctaves = numOctaves;
      if (startNote !== undefined) cfg.startNote = startNote;
      renderKeybed();
    },
    getActiveNotes: () => Array.from(activeKeys.values()).map(n => n.actualNote),
    destroy: () => {
      destroyed = true;
      if (_pressureRafId) cancelAnimationFrame(_pressureRafId);
      if (_resizeObserver) {
        _resizeObserver.disconnect();
        _resizeObserver = null;
      }
      if (cfg.enableQwerty) {
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('keyup', handleKeyup);
      }
      if (cfg.enableAccessibility) {
        container.removeEventListener('keydown', handleA11yKeyNav);
      }
      container.innerHTML = '';
      activeKeys.clear();
      qwertyActive.clear();
    }
  };
}
