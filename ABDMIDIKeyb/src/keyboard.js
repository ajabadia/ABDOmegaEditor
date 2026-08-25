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
};

const OCTAVE_PATTERN = [
  { offset: 0, sharp: 1 }, { offset: 2, sharp: 3 }, { offset: 4, sharp: null },
  { offset: 5, sharp: 6 }, { offset: 7, sharp: 8 }, { offset: 9, sharp: 10 },
  { offset: 11, sharp: null }
];

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
    getLedColor: config.getLedColor ?? null,  // (bridge) => color string
    getPressureState: config.getPressureState ?? null, // () => { aftertouch, modWheel, pitchBend }
  };

  // ── State ──
  let octaveShift = 0;
  const activeKeys = new Map();   // baseNote -> { actualNote, element, velocity }
  const qwertyActive = new Set();
  let destroyed = false;
  let _pressureRafId = null;

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[Keyboard] Container #${containerId} not found`);
    return { destroy() {}, panic() {}, sweep() {}, getOctave: () => 0 };
  }

  // ══════════════════════════════════════════════════════════════
  //  KEYBED RENDERING
  // ══════════════════════════════════════════════════════════════

  function renderKeybed() {
    container.innerHTML = '';
    container.classList.add('kbd-piano-keys');

    for (let oct = 0; oct < cfg.numOctaves; oct++) {
      const base = cfg.startNote + oct * 12;
      for (const p of OCTAVE_PATTERN) {
        const whiteNote = base + p.offset;
        const whiteKey = createKeyElement(whiteNote, false);
        if (p.sharp !== null) {
          const blackKey = createKeyElement(base + p.sharp, true);
          whiteKey.appendChild(blackKey);
        }
        container.appendChild(whiteKey);
      }
    }
    // High C
    container.appendChild(createKeyElement(cfg.startNote + cfg.numOctaves * 12, false));
  }

  function createKeyElement(midiNote, isBlack) {
    const key = document.createElement('div');
    key.className = isBlack ? 'kbd-black-key' : 'kbd-white-key';
    key.dataset.note = midiNote;

    // Apply visual texture
    if (cfg.enableIvoryTexture && !isBlack) applyIvoryTexture(key, midiNote);
    if (cfg.enableVintageWear) applyVintageWear(key, midiNote, isBlack);

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

      activeKeys.set(midiNote, { actualNote, element: key, velocity });
      key.classList.add('active');
      key.style.setProperty('--kbd-velocity', velocity.toFixed(3));

      // Resolve LED color (ABDEep: different color per arp/seq/chord mode)
      const color = (cfg.getLedColor) ? cfg.getLedColor() : (cfg.ledColor || 'var(--color-accent)');
      key.style.setProperty('--kbd-led-color', color);

      onNoteOn(actualNote, velocity);
    };

    const stopNote = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (!activeKeys.has(midiNote)) return;
      const { actualNote, element } = activeKeys.get(midiNote);
      activeKeys.delete(midiNote);
      if (element) {
        element.classList.remove('active');
        element.style.removeProperty('--kbd-velocity');
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

    if (cfg.enableTouch) {
      key.addEventListener('touchstart', playNote, { passive: false });
      key.addEventListener('touchend', stopNote, { passive: false });
      key.addEventListener('touchcancel', stopNote, { passive: false });
    }

    return key;
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
    if (onOctaveChange) onOctaveChange(octaveShift / 12);
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
    if (!cfg.getPressureState) return;

    const state = cfg.getPressureState();
    let at = Math.max(0, Math.min(1, state.aftertouch || 0));
    let mw = Math.max(0, Math.min(1, state.modWheel || 0));
    let pb = Math.max(-1, Math.min(1, state.pitchBend || 0));

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
    const keys = Array.from(container.querySelectorAll('.kbd-white-key, .kbd-black-key'));
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
    const keys = Array.from(container.querySelectorAll('.kbd-white-key, .kbd-black-key'));
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
  //  PUBLIC API: PANIC
  // ══════════════════════════════════════════════════════════════

  function panic() {
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
    if (octUp) octUp.addEventListener('click', () => shiftOctave(1));
    if (octDown) octDown.addEventListener('click', () => shiftOctave(-1));

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

    if (cfg.enableQwerty) {
      window.addEventListener('keydown', handleKeydown);
      window.addEventListener('keyup', handleKeyup);
    }

    updateOctaveLEDs();

    // Start pressure display loop if enabled
    if (cfg.enablePressureDisplay && cfg.getPressureState) {
      _pressureRafId = requestAnimationFrame(updatePressureDisplay);
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
      if (onOctaveChange) onOctaveChange(oct);
    },
    releaseNote: (midiNote) => {
      for (const [baseNote, { actualNote, element }] of activeKeys) {
        if (actualNote === midiNote) {
          if (element) element.classList.remove('active');
          activeKeys.delete(baseNote);
          onNoteOff(actualNote);
          break;
        }
      }
    },
    highlightNote: (midiNote, velocity) => {
      const keyEl = container.querySelector(`[data-note="${midiNote}"]`);
      if (keyEl) {
        keyEl.classList.add('active');
        keyEl.style.setProperty('--kbd-led-color', cfg.ledColor || 'var(--color-accent)');
        if (velocity != null) keyEl.style.setProperty('--kbd-velocity', velocity.toFixed(3));
      }
    },
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
      if (cfg.enableQwerty) {
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('keyup', handleKeyup);
      }
      container.innerHTML = '';
      activeKeys.clear();
      qwertyActive.clear();
    }
  };
}
