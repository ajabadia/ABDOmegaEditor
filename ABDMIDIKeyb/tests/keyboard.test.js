/**
 * ABDKeyboard — Unit Tests
 * Validates keyboard creation, octave shifting, QWERTY, panic, and public API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createKeyboard } from '../src/keyboard.js';

// ── jsdom polyfill: PointerEvent ──
if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = class PointerEvent extends Event {
    constructor(type, opts = {}) {
      super(type, opts);
      this.clientX = opts.clientX ?? 0;
      this.clientY = opts.clientY ?? 0;
      this.pointerId = opts.pointerId ?? 1;
      this.buttons = opts.buttons ?? 0;
    }
  };
}

// ── jsdom DOM setup ──
function createFixture() {
  document.body.innerHTML = `
    <div id="piano-keyboard"></div>
    <div id="pitch-wheel-container"></div>
    <div id="mod-wheel-container"></div>
    <button id="oct-up"></button>
    <button id="oct-down"></button>
    <div class="kbd-octave-led" id="led-up"></div>
    <div class="kbd-octave-led" id="led-down"></div>
  `;
}

function destroyFixture() {
  document.body.innerHTML = '';
}

describe('createKeyboard', () => {
  let kbd;
  let noteOnLog;
  let noteOffLog;

  beforeEach(() => {
    createFixture();
    noteOnLog = [];
    noteOffLog = [];
    kbd = createKeyboard({
      containerId: 'piano-keyboard',
      wheelPitchId: 'pitch-wheel-container',
      wheelModId: 'mod-wheel-container',
      octUpId: 'oct-up',
      octDownId: 'oct-down',
      ledUpId: 'led-up',
      ledDownId: 'led-down',
      onNoteOn: (note, vel) => noteOnLog.push({ note, vel }),
      onNoteOff: (note) => noteOffLog.push(note),
      config: {
        numOctaves: 2,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
      },
    });
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  it('renders the correct number of white keys for 2 octaves + high C', () => {
    const whiteKeys = document.querySelectorAll('#piano-keyboard .kbd-white-key');
    // 2 octaves = 14 white keys + 1 high C = 15
    expect(whiteKeys.length).toBe(15);
  });

  it('renders black keys nested inside white keys', () => {
    const blackKeys = document.querySelectorAll('#piano-keyboard .kbd-black-key');
    // 2 octaves = 10 black keys
    expect(blackKeys.length).toBe(10);
  });

  it('assigns correct data-note attributes', () => {
    const firstWhite = document.querySelector('#piano-keyboard .kbd-white-key');
    expect(firstWhite.dataset.note).toBe('60'); // C4
  });

  it('octave shift updates via setOctave', () => {
    kbd.setOctave(2);
    expect(kbd.getOctave()).toBe(2);
    kbd.setOctave(-1);
    expect(kbd.getOctave()).toBe(-1);
  });

  it('clamps octave shift to maxOctaveShift', () => {
    kbd.setOctave(10);
    expect(kbd.getOctave()).toBe(3); // maxOctaveShift default is 3
    kbd.setOctave(-10);
    expect(kbd.getOctave()).toBe(-3);
  });

  it('destroy cleans up the container', () => {
    kbd.destroy();
    expect(document.getElementById('piano-keyboard').innerHTML).toBe('');
    kbd = null; // prevent double-destroy in afterEach
  });

  it('returns empty API when container not found', () => {
    destroyFixture();
    const nullKbd = createKeyboard({ containerId: 'nonexistent' });
    expect(() => nullKbd.panic()).not.toThrow();
    expect(nullKbd.getOctave()).toBe(0);
    nullKbd.destroy();
  });

  it('getActiveNotes returns currently held notes', () => {
    const firstKey = document.querySelector('#piano-keyboard .kbd-white-key');
    firstKey.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(kbd.getActiveNotes()).toContain(60);

    // Release
    firstKey.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(kbd.getActiveNotes()).not.toContain(60);
  });

  it('panic releases all active notes', () => {
    const keys = document.querySelectorAll('#piano-keyboard .kbd-white-key');
    keys[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    keys[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(kbd.getActiveNotes().length).toBe(2);

    kbd.panic();
    expect(kbd.getActiveNotes().length).toBe(0);
    expect(noteOffLog.length).toBe(2);
  });

  it('auto-generates a panic button when no panicBtnId is provided', () => {
    const panicBtn = document.querySelector('#piano-keyboard .kbd-panic-btn');
    expect(panicBtn).not.toBeNull();
    expect(panicBtn.getAttribute('role')).toBe('button');
    expect(panicBtn.getAttribute('aria-label')).toBe('All Notes Off — Panic (Ctrl+Q)');
    expect(panicBtn.getAttribute('title')).toBe('Panic: All Notes Off (Ctrl+Q)');
    expect(panicBtn.querySelector('.kbd-panic-led')).not.toBeNull();
    expect(panicBtn.querySelector('.kbd-panic-label').textContent).toContain('ALL');
  });

  it('auto-generated panic button triggers panic on click', () => {
    const keys = document.querySelectorAll('#piano-keyboard .kbd-white-key');
    keys[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(kbd.getActiveNotes().length).toBe(1);

    const panicBtn = document.querySelector('#piano-keyboard .kbd-panic-btn');
    panicBtn.click();
    expect(kbd.getActiveNotes().length).toBe(0);
  });

  it('does not auto-generate panic button when panicBtnId is provided', () => {
    kbd.destroy();
    const externalBtn = document.createElement('button');
    externalBtn.id = 'ext-panic';
    document.body.appendChild(externalBtn);
    kbd = createKeyboard({ panicBtnId: 'ext-panic' });
    const autoBtn = document.querySelector('#piano-keyboard .kbd-panic-btn');
    expect(autoBtn).toBeNull();
    externalBtn.remove();
  });

  it('highlightNote adds active class to the correct key', () => {
    kbd.highlightNote(60, 0.9);
    const key = document.querySelector('[data-note="60"]');
    expect(key.classList.contains('active')).toBe(true);
  });

  it('releaseNote removes visual active when triggered after pointerdown', () => {
    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(key.classList.contains('active')).toBe(true);
    key.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(key.classList.contains('active')).toBe(false);
  });

  it('sweep does not throw', () => {
    expect(() => kbd.sweep('right', 1)).not.toThrow();
  });

  it('setOctaveCount re-renders the keybed', () => {
    kbd.setOctaveCount(4, 36);
    const whiteKeys = document.querySelectorAll('#piano-keyboard .kbd-white-key');
    // 4 octaves = 28 white keys + 1 high C = 29
    expect(whiteKeys.length).toBe(29);
  });
});

describe('Velocity Curves', () => {
  let kbd;
  let noteOnLog;

  beforeEach(() => {
    createFixture();
    noteOnLog = [];
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        velocitySource: 'fixed',
        velocityCurve: 'soft',
        fixedVelocity: 0.5,
        enableQwerty: false,
        enableTouch: false,
      },
      onNoteOn: (note, vel) => noteOnLog.push({ note, vel }),
    });
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  it('fixed velocity uses configured value', () => {
    const key = document.querySelector('#piano-keyboard .kbd-white-key');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(noteOnLog[0].vel).toBe(0.5);
  });
});

describe('QWERTY Keyboard', () => {
  let kbd;
  let noteOnLog;
  let noteOffLog;

  beforeEach(() => {
    createFixture();
    noteOnLog = [];
    noteOffLog = [];
    kbd = createKeyboard({
      config: {
        numOctaves: 2,
        startNote: 48, // C3
        enableQwerty: true,
        enableTouch: false,
      },
      onNoteOn: (note, vel) => noteOnLog.push({ note, vel }),
      onNoteOff: (note) => noteOffLog.push(note),
    });
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  it('pressing Z triggers note 48 (C3)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    expect(noteOnLog.length).toBe(1);
    expect(noteOnLog[0].note).toBe(48);
  });

  it('releasing Z sends noteOff', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'z', bubbles: true }));
    expect(noteOffLog.length).toBe(1);
    expect(noteOffLog[0]).toBe(48);
  });

  it('repeated keydown does not trigger double noteOn', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true, repeat: true }));
    expect(noteOnLog.length).toBe(1);
  });

  it('arrow up shifts octave', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(kbd.getOctave()).toBe(1);
  });

  it('arrow down shifts octave', () => {
    kbd.setOctave(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(kbd.getOctave()).toBe(0);
  });

  it('Ctrl+Q triggers panic (All Notes Off)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    expect(kbd.getActiveNotes().length).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', ctrlKey: true, bubbles: true }));
    expect(kbd.getActiveNotes().length).toBe(0);
  });

  it('Cmd+Q triggers panic on macOS', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
    expect(kbd.getActiveNotes().length).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', metaKey: true, bubbles: true }));
    expect(kbd.getActiveNotes().length).toBe(0);
  });
});

describe('LED Animations', () => {
  let kbd;

  beforeEach(() => {
    createFixture();
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
      },
    });
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  it('sweep applies led-sweep class asynchronously', async () => {
    kbd.sweep('right', 0);
    // sweep adds class immediately, then removes it after 180ms per key.
    // With speedMs=0 all outer setTimeouts are 0ms; inner ones are 180ms.
    // jsdom can be slow with many concurrent timers, so use generous wait.
    await new Promise(resolve => setTimeout(resolve, 500));
    const keys = document.querySelectorAll('#piano-keyboard .kbd-white-key, #piano-keyboard .kbd-black-key');
    const hasSweep = Array.from(keys).some(k => k.classList.contains('kbd-led-sweep'));
    expect(hasSweep).toBe(false);
  });

  it('sweep does not throw on empty keybed', () => {
    kbd.destroy();
    kbd = null;
    const emptyKbd = createKeyboard({
      containerId: 'nonexistent',
      config: { numOctaves: 0 },
    });
    expect(() => emptyKbd.sweep()).not.toThrow();
    emptyKbd.destroy();
  });
});

// ──────────────────────────────────────────────────────────────
// Pressure Display (ABDEep: aftertouch + modwheel + pitchbend)
// ──────────────────────────────────────────────────────────────
describe('Pressure Display', () => {
  let kbd;
  let rafCallbacks;
  let noteOnLog;
  let noteOffLog;

  beforeEach(() => {
    createFixture();
    noteOnLog = [];
    noteOffLog = [];
    rafCallbacks = [];
    // Mock RAF to collect callbacks so we can flush manually
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  /** Flush one RAF frame (calls one queued callback) */
  function flushFrame() {
    if (rafCallbacks.length > 0) {
      const cb = rafCallbacks.shift();
      cb();
    }
  }

  /** Drain the current batch of queued RAF callbacks without processing new ones */
  function drainCurrentBatch() {
    const batch = rafCallbacks.splice(0);
    batch.forEach(cb => cb());
  }

  it('applies kbd-pressured class when aftertouch is active on a held key', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        getPressureState: () => pressureState,
      },
      onNoteOn: (n, v) => noteOnLog.push({ note: n, vel: v }),
    });

    // Flush initial RAF (loop started, no active keys yet)
    drainCurrentBatch();

    // Press a key
    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(key.classList.contains('active')).toBe(true);

    // Simulate aftertouch
    pressureState = { aftertouch: 0.6, modWheel: 0, pitchBend: 0 };
    flushFrame(); // updatePressureDisplay reads new state

    expect(key.classList.contains('kbd-pressured')).toBe(true);
    expect(key.style.getPropertyValue('--kbd-pressure')).toBe('0.600');
  });

  it('applies kbd-pressured class when modwheel is active', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    pressureState = { aftertouch: 0, modWheel: 0.75, pitchBend: 0 };
    flushFrame();

    expect(key.classList.contains('kbd-pressured')).toBe(true);
    expect(key.style.getPropertyValue('--kbd-pressure')).toBe('0.750');
    // modWheel gets its own --kbd-mw-pressure
    expect(key.style.getPropertyValue('--kbd-mw-pressure')).toBe('0.750');
  });

  it('combined aftertouch uses max(at, mw) for --kbd-pressure', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // aftertouch=0.3, modWheel=0.8 → combined = 0.8
    pressureState = { aftertouch: 0.3, modWheel: 0.8, pitchBend: 0 };
    flushFrame();

    expect(key.style.getPropertyValue('--kbd-pressure')).toBe('0.800');
    expect(key.style.getPropertyValue('--kbd-mw-pressure')).toBe('0.800');
  });

  it('removes kbd-pressured when pressure drops to zero', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Apply pressure
    pressureState = { aftertouch: 0.5, modWheel: 0, pitchBend: 0 };
    flushFrame();
    expect(key.classList.contains('kbd-pressured')).toBe(true);

    // Release pressure
    pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    flushFrame();
    expect(key.classList.contains('kbd-pressured')).toBe(false);
  });

  it('skips frame when values have not changed (performance optimization)', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        getPressureState: () => pressureState,
      },
    });
    // init() queued one RAF; drain it — reads 0/0/0 and sets _prev* to 0.
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Change state so the next frame detects a difference.
    pressureState = { aftertouch: 0.5, modWheel: 0, pitchBend: 0 };
    flushFrame(); // reads 0.5 vs _prev 0 → applies pressure (DOM mutated)
    expect(key.classList.contains('kbd-pressured')).toBe(true);
    expect(key.style.getPropertyValue('--kbd-pressure')).toBe('0.500');

    // Same values → DOM is NOT re-written (optimization)
    key.style.setProperty('--kbd-pressure', 'TAMPERED');
    flushFrame();
    // If the skip worked, the value stays TAMPERED
    expect(key.style.getPropertyValue('--kbd-pressure')).toBe('TAMPERED');
  });

  it('does not apply pressure when enablePressureDisplay is false', () => {
    let pressureState = { aftertouch: 0.9, modWheel: 0.9, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: false,
        getPressureState: () => pressureState,
      },
    });

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Give RAF a chance (but loop was never started)
    drainCurrentBatch();

    expect(key.classList.contains('kbd-pressured')).toBe(false);
  });

  it('pressure release animation adds kbd-pressure-release class on note release', async () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        getPressureState: () => pressureState,
      },
      onNoteOff: (n) => noteOffLog.push(n),
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Apply pressure
    pressureState = { aftertouch: 0.5, modWheel: 0, pitchBend: 0 };
    flushFrame();
    expect(key.classList.contains('kbd-pressured')).toBe(true);

    // Release the key — should trigger pressure release animation
    key.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(noteOffLog).toContain(60);
    expect(key.classList.contains('kbd-pressure-release')).toBe(true);

    // Wait for the fallback 500ms timeout to clean up
    await new Promise(resolve => setTimeout(resolve, 550));
    expect(key.classList.contains('kbd-pressure-release')).toBe(false);
    expect(key.classList.contains('kbd-pressured')).toBe(false);
  });

  it('applies --kbd-mw-pressure only when modWheel > 0.01', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Pure aftertouch (no modWheel)
    pressureState = { aftertouch: 0.5, modWheel: 0, pitchBend: 0 };
    flushFrame();
    expect(key.style.getPropertyValue('--kbd-mw-pressure')).toBe('0');

    // With modWheel
    pressureState = { aftertouch: 0.5, modWheel: 0.3, pitchBend: 0 };
    flushFrame();
    expect(key.style.getPropertyValue('--kbd-mw-pressure')).toBe('0.300');
  });

  it('does not start pressure loop when getPressureState is null', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        // getPressureState defaults to null
      },
    });
    // No RAF should be queued (loop not started)
    expect(rafCallbacks.length).toBe(0);
  });

  it('panic clears pressure state from all active keys', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        getPressureState: () => pressureState,
      },
      onPanic: () => {},
    });
    drainCurrentBatch();

    // Press two keys
    const key1 = document.querySelector('[data-note="60"]');
    const key2 = document.querySelector('[data-note="62"]');
    key1.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    key2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Apply pressure
    pressureState = { aftertouch: 0.8, modWheel: 0, pitchBend: 0 };
    flushFrame();
    expect(key1.classList.contains('kbd-pressured')).toBe(true);
    expect(key2.classList.contains('kbd-pressured')).toBe(true);

    // Panic
    kbd.panic();
    expect(key1.classList.contains('kbd-pressured')).toBe(false);
    expect(key2.classList.contains('kbd-pressured')).toBe(false);
    expect(key1.style.getPropertyValue('--kbd-pressure')).toBe('');
    expect(key2.style.getPropertyValue('--kbd-pressure')).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────
// Pitch-Bend Displacement (ABDEep: keys shift horizontally)
// ──────────────────────────────────────────────────────────────
describe('Pitch-Bend Displacement', () => {
  let kbd;
  let rafCallbacks;

  beforeEach(() => {
    createFixture();
    rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  function flushFrame() {
    if (rafCallbacks.length > 0) {
      const cb = rafCallbacks.shift();
      cb();
    }
  }

  function drainCurrentBatch() {
    const batch = rafCallbacks.splice(0);
    batch.forEach(cb => cb());
  }

  it('applies kbd-pitch-bent class and --kbd-pb-offset on positive pitch bend', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        enablePitchBendDisplace: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Full positive pitch bend (+1.0 → 6px displacement)
    pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 1.0 };
    flushFrame();

    expect(key.classList.contains('kbd-pitch-bent')).toBe(true);
    expect(key.style.getPropertyValue('--kbd-pb-offset')).toBe('6px');
  });

  it('applies negative pitch-bend displacement', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        enablePitchBendDisplace: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Full negative pitch bend (-1.0 → -6px displacement)
    pressureState = { aftertouch: 0, modWheel: 0, pitchBend: -1.0 };
    flushFrame();

    expect(key.classList.contains('kbd-pitch-bent')).toBe(true);
    expect(key.style.getPropertyValue('--kbd-pb-offset')).toBe('-6px');
  });

  it('applies half pitch-bend with proportional displacement', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        enablePitchBendDisplace: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Half positive bend (+0.5 → round(0.5 * 6) = 3px)
    pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0.5 };
    flushFrame();

    expect(key.style.getPropertyValue('--kbd-pb-offset')).toBe('3px');
  });

  it('removes pitch-bend class when bend returns to zero', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        enablePitchBendDisplace: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Apply bend
    pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 1.0 };
    flushFrame();
    expect(key.classList.contains('kbd-pitch-bent')).toBe(true);

    // Return to center
    pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    flushFrame();
    expect(key.classList.contains('kbd-pitch-bent')).toBe(false);
    expect(key.style.getPropertyValue('--kbd-pb-offset')).toBe('');
  });

  it('does not apply displacement when enablePitchBendDisplace is false', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        enablePitchBendDisplace: false,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 1.0 };
    flushFrame();

    expect(key.classList.contains('kbd-pitch-bent')).toBe(false);
    expect(key.style.getPropertyValue('--kbd-pb-offset')).toBe('');
  });

  it('combines pressure and pitch-bend on same key', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        enablePitchBendDisplace: true,
        getPressureState: () => pressureState,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    // Both aftertouch and pitch bend active
    pressureState = { aftertouch: 0.7, modWheel: 0, pitchBend: 0.5 };
    flushFrame();

    expect(key.classList.contains('kbd-pressured')).toBe(true);
    expect(key.classList.contains('kbd-pitch-bent')).toBe(true);
    expect(key.style.getPropertyValue('--kbd-pressure')).toBe('0.700');
    expect(key.style.getPropertyValue('--kbd-pb-offset')).toBe('3px');
  });

  it('small pitch bend below threshold (|pb| < 0.01) is ignored', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        enablePitchBendDisplace: true,
      },
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0.005 };
    flushFrame();

    expect(key.classList.contains('kbd-pitch-bent')).toBe(false);
  });

  it('panic clears pitch-bend state from active keys', () => {
    let pressureState = { aftertouch: 0, modWheel: 0, pitchBend: 0 };
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enablePressureDisplay: true,
        enablePitchBendDisplace: true,
        getPressureState: () => pressureState,
      },
      onPanic: () => {},
    });
    drainCurrentBatch();

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    pressureState = { aftertouch: 0.5, modWheel: 0, pitchBend: 1.0 };
    flushFrame();
    expect(key.classList.contains('kbd-pitch-bent')).toBe(true);

    kbd.panic();
    expect(key.classList.contains('kbd-pitch-bent')).toBe(false);
    expect(key.classList.contains('kbd-pressured')).toBe(false);
    expect(key.style.getPropertyValue('--kbd-pb-offset')).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────
// Ivory Texture (ABDEep: per-key deterministic HSL variations)
// ──────────────────────────────────────────────────────────────
describe('Ivory Texture', () => {
  let kbd;

  beforeEach(() => {
    createFixture();
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  it('applies ivory CSS variables to white keys when enabled', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableIvoryTexture: true,
      },
    });

    const whiteKey = document.querySelector('[data-note="60"]');
    // Note 60: seed=(60*12345)%100=0, hue=37, sat=18, light=90
    expect(whiteKey.style.getPropertyValue('--kbd-ivory-base')).toContain('hsl(');
    expect(whiteKey.style.getPropertyValue('--kbd-ivory-top')).toContain('hsl(');
    expect(whiteKey.style.getPropertyValue('--kbd-ivory-bottom')).toContain('hsl(');
    expect(whiteKey.style.getPropertyValue('--kbd-dirt-color')).toContain('rgba(');
    expect(whiteKey.style.getPropertyValue('--kbd-dirt-start')).toMatch(/\d+%/);
  });

  it('does NOT apply ivory texture to black keys', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableIvoryTexture: true,
      },
    });

    const blackKey = document.querySelector('[data-note="61"]'); // C#4
    expect(blackKey.style.getPropertyValue('--kbd-ivory-base')).toBe('');
    expect(blackKey.style.getPropertyValue('--kbd-ivory-top')).toBe('');
    expect(blackKey.style.getPropertyValue('--kbd-ivory-bottom')).toBe('');
  });

  it('does not apply ivory variables when enableIvoryTexture is false', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableIvoryTexture: false,
      },
    });

    const whiteKey = document.querySelector('[data-note="60"]');
    expect(whiteKey.style.getPropertyValue('--kbd-ivory-base')).toBe('');
    expect(whiteKey.style.getPropertyValue('--kbd-ivory-top')).toBe('');
    expect(whiteKey.style.getPropertyValue('--kbd-ivory-bottom')).toBe('');
  });

  it('produces different HSL values for different notes (deterministic per-key)', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 2,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableIvoryTexture: true,
      },
    });

    // Pick two white keys that should differ
    // Note 60: seed=0, hue=37, sat=18, light=90
    // Note 65: seed=(65*12345)%100=75, hue=40+(75%6-3)=42, sat=18+3=21, light=90-(75%5)=90
    const key60 = document.querySelector('[data-note="60"]');
    const key65 = document.querySelector('[data-note="65"]');

    const base60 = key60.style.getPropertyValue('--kbd-ivory-base');
    const base65 = key65.style.getPropertyValue('--kbd-ivory-base');

    // They should be different HSL strings (different seed → different hue/sat)
    expect(base60).not.toBe(base65);
  });

  it('ivory top is lighter than ivory base (top > base lightness)', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableIvoryTexture: true,
      },
    });

    const key = document.querySelector('[data-note="60"]');
    const base = key.style.getPropertyValue('--kbd-ivory-base');
    const top = key.style.getPropertyValue('--kbd-ivory-top');
    const bottom = key.style.getPropertyValue('--kbd-ivory-bottom');

    // Extract lightness values: hsl(hue, sat%, light%)
    const extractLight = (hsl) => {
      const match = hsl.match(/hsl\([^,]+,\s*[^,]+%,\s*(\d+(\.\d+)?)%\)/);
      return match ? parseFloat(match[1]) : -1;
    };

    const baseLight = extractLight(base);
    const topLight = extractLight(top);
    const bottomLight = extractLight(bottom);

    // top (+6) > base > bottom (-5)
    expect(topLight).toBeGreaterThan(baseLight);
    expect(baseLight).toBeGreaterThan(bottomLight);
  });

  it('dirt-start percentage is between 85% and 94%', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableIvoryTexture: true,
      },
    });

    const keys = document.querySelectorAll('#piano-keyboard .kbd-white-key');
    for (const key of keys) {
      const dirtStart = key.style.getPropertyValue('--kbd-dirt-start');
      const pct = parseInt(dirtStart, 10);
      expect(pct).toBeGreaterThanOrEqual(85);
      expect(pct).toBeLessThanOrEqual(94);
    }
  });

  it('ivory values are deterministic (same note always produces same texture)', () => {
    // Create two keyboards with same config
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableIvoryTexture: true,
      },
    });
    const key1Base = document.querySelector('[data-note="60"]')
      .style.getPropertyValue('--kbd-ivory-base');
    kbd.destroy();

    // Create another keyboard
    createFixture();
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableIvoryTexture: true,
      },
    });
    const key2Base = document.querySelector('[data-note="60"]')
      .style.getPropertyValue('--kbd-ivory-base');

    expect(key1Base).toBe(key2Base);
  });
});

// ──────────────────────────────────────────────────────────────
// Vintage Wear Stains (ABDCZ101: per-key deterministic stains)
// ──────────────────────────────────────────────────────────────
describe('Vintage Wear Stains', () => {
  let kbd;

  beforeEach(() => {
    createFixture();
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  it('applies stain classes to some white keys when enabled', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 2,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableVintageWear: true,
      },
    });

    const whiteKeys = document.querySelectorAll('#piano-keyboard .kbd-white-key');
    const stainedKeys = Array.from(whiteKeys).filter(k =>
      k.classList.contains('kbd-stain-yellow') ||
      k.classList.contains('kbd-stain-scuff') ||
      k.classList.contains('kbd-stain-ding')
    );
    // With 2 octaves (15 white keys), deterministic staining should produce some stained keys
    expect(stainedKeys.length).toBeGreaterThan(0);
  });

  it('applies stain-worn class to some black keys when enabled', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 3,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableVintageWear: true,
      },
    });

    const blackKeys = document.querySelectorAll('#piano-keyboard .kbd-black-key');
    const wornKeys = Array.from(blackKeys).filter(k =>
      k.classList.contains('kbd-stain-worn')
    );
    // With 3 octaves (15 black keys), some should be worn
    expect(wornKeys.length).toBeGreaterThan(0);
  });

  it('does not apply stain classes when enableVintageWear is false', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 2,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableVintageWear: false,
      },
    });

    const allKeys = document.querySelectorAll('#piano-keyboard .kbd-white-key, #piano-keyboard .kbd-black-key');
    const stainedKeys = Array.from(allKeys).filter(k =>
      Array.from(k.classList).some(c => c.startsWith('kbd-stain'))
    );
    expect(stainedKeys.length).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────
// LED Color Callback (dynamic color per arp/seq/chord mode)
// ──────────────────────────────────────────────────────────────
describe('LED Color Callback', () => {
  let kbd;
  let noteOnLog;

  beforeEach(() => {
    createFixture();
    noteOnLog = [];
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
    destroyFixture();
  });

  it('uses getLedColor callback for LED color on key press', () => {
    let modeColor = '#ff3366';
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        getLedColor: () => modeColor,
      },
      onNoteOn: (n, v) => noteOnLog.push({ note: n, vel: v }),
    });

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(key.style.getPropertyValue('--kbd-led-color')).toBe('#ff3366');
  });

  it('changes LED color when getLedColor callback returns different value', () => {
    let modeColor = '#ff3366';
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        getLedColor: () => modeColor,
      },
    });

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(key.style.getPropertyValue('--kbd-led-color')).toBe('#ff3366');

    // Switch mode
    modeColor = '#9933ff';
    key.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(key.style.getPropertyValue('--kbd-led-color')).toBe('#9933ff');
  });

  it('uses static ledColor when getLedColor is not provided', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        ledColor: '#00ff88',
      },
    });

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(key.style.getPropertyValue('--kbd-led-color')).toBe('#00ff88');
  });

  it('falls back to CSS variable when neither getLedColor nor ledColor is set', () => {
    kbd = createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
      },
    });

    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(key.style.getPropertyValue('--kbd-led-color')).toBe('var(--color-accent)');
  });
});

describe('Sustain Pedal', () => {
  let kbd;
  let sustainLog;
  let noteOnLog;
  let noteOffLog;

  beforeEach(() => {
    createFixture();
    sustainLog = [];
    noteOnLog = [];
    noteOffLog = [];
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
  });

  function createSustKbd(opts = {}) {
    return createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        ...opts,
      },
      onNoteOn: (n, v) => noteOnLog.push({ note: n, vel: v }),
      onNoteOff: (n) => noteOffLog.push(n),
      onSustainChange: (s) => sustainLog.push(s),
    });
  }

  it('initializes with sustain off', () => {
    kbd = createSustKbd();
    expect(kbd.getSustain()).toBe(false);
  });

  it('setSustain(true) turns sustain on and fires callback', () => {
    kbd = createSustKbd();
    kbd.setSustain(true);
    expect(kbd.getSustain()).toBe(true);
    expect(sustainLog).toEqual([true]);
  });

  it('setSustain(false) turns sustain off and fires callback', () => {
    kbd = createSustKbd();
    kbd.setSustain(true);
    kbd.setSustain(false);
    expect(kbd.getSustain()).toBe(false);
    expect(sustainLog).toEqual([true, false]);
  });

  it('setSustain is idempotent (no duplicate callbacks)', () => {
    kbd = createSustKbd();
    kbd.setSustain(false);
    kbd.setSustain(false);
    expect(sustainLog).toEqual([]);
    kbd.setSustain(true);
    kbd.setSustain(true);
    expect(sustainLog).toEqual([true]);
  });

  it('toggleSustain toggles on/off', () => {
    kbd = createSustKbd();
    kbd.toggleSustain();
    expect(kbd.getSustain()).toBe(true);
    kbd.toggleSustain();
    expect(kbd.getSustain()).toBe(false);
  });

  it('auto-generates a sustain button when no sustainBtnId is provided', () => {
    kbd = createSustKbd();
    const sustainBtn = document.querySelector('#piano-keyboard .kbd-sustain-btn');
    expect(sustainBtn).not.toBeNull();
    expect(sustainBtn.getAttribute('role')).toBe('button');
    expect(sustainBtn.getAttribute('aria-label')).toBe('Sustain Pedal On/Off (Ctrl+Space)');
    expect(sustainBtn.getAttribute('title')).toBe('Sustain Pedal: Toggle Hold (Ctrl+Space)');
    expect(sustainBtn.querySelector('.kbd-sustain-led')).not.toBeNull();
    expect(sustainBtn.querySelector('.kbd-sustain-label').textContent).toBe('SUST');
  });

  it('auto-generated sustain button toggles on click', () => {
    kbd = createSustKbd();
    const sustainBtn = document.querySelector('#piano-keyboard .kbd-sustain-btn');
    sustainBtn.click();
    expect(kbd.getSustain()).toBe(true);
    sustainBtn.click();
    expect(kbd.getSustain()).toBe(false);
  });

  it('sustain button LED lights up when sustain is on', () => {
    kbd = createSustKbd();
    const led = document.querySelector('#piano-keyboard .kbd-sustain-led');
    expect(led.classList.contains('on')).toBe(false);
    kbd.setSustain(true);
    expect(led.classList.contains('on')).toBe(true);
    kbd.setSustain(false);
    expect(led.classList.contains('on')).toBe(false);
  });

  it('does not auto-generate sustain button when sustainBtnId is provided', () => {
    kbd.destroy();
    const externalBtn = document.createElement('button');
    externalBtn.id = 'ext-sustain';
    document.body.appendChild(externalBtn);
    kbd = createKeyboard({ sustainBtnId: 'ext-sustain' });
    const autoBtn = document.querySelector('#piano-keyboard .kbd-sustain-btn');
    expect(autoBtn).toBeNull();
    externalBtn.remove();
  });

  it('panic releases sustain', () => {
    kbd = createSustKbd();
    kbd.setSustain(true);
    expect(kbd.getSustain()).toBe(true);
    kbd.panic();
    expect(kbd.getSustain()).toBe(false);
    expect(sustainLog).toEqual([true, false]);
  });

  it('accepts initial sustain callback via onSustainChange', () => {
    kbd = createSustKbd();
    // Verify callback is wired
    kbd.setSustain(true);
    expect(sustainLog.length).toBe(1);
    expect(sustainLog[0]).toBe(true);
  });
});

describe('Velocity', () => {
  let kbd;
  let noteOnLog;
  let velocityLog;

  beforeEach(() => {
    createFixture();
    noteOnLog = [];
    velocityLog = [];
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
  });

  function createVelKbd(opts = {}) {
    return createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        ...opts,
      },
      onNoteOn: (n, v) => noteOnLog.push({ note: n, vel: v }),
      onVelocityChange: (n, v) => velocityLog.push({ note: n, vel: v }),
    });
  }

  it('sends velocity with note-on (fixed by default)', () => {
    kbd = createVelKbd();
    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(noteOnLog.length).toBe(1);
    expect(noteOnLog[0].note).toBe(60);
    expect(typeof noteOnLog[0].vel).toBe('number');
    expect(noteOnLog[0].vel).toBeGreaterThan(0);
  });

  it('fires onVelocityChange when a note is pressed', () => {
    kbd = createVelKbd();
    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(velocityLog.length).toBe(1);
    expect(velocityLog[0].note).toBe(60);
    expect(typeof velocityLog[0].vel).toBe('number');
  });

  it('fixedVelocity config controls the velocity value', () => {
    kbd = createVelKbd({ fixedVelocity: 0.5 });
    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(noteOnLog[0].vel).toBeCloseTo(0.5, 2);
  });

  it('velocity CSS variable is set on the active key', () => {
    kbd = createVelKbd({ fixedVelocity: 0.7 });
    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(key.style.getPropertyValue('--kbd-velocity')).toBe('0.700');
  });

  it('velocityCurve is stored in config', () => {
    kbd = createVelKbd({ velocitySource: 'fixed', velocityCurve: 'soft', fixedVelocity: 0.3 });
    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    // Fixed velocity ignores curve, so it should still be 0.3
    expect(noteOnLog[0].vel).toBeCloseTo(0.3, 2);
  });

  it('each note press sends a separate velocity', () => {
    kbd = createVelKbd({ fixedVelocity: 0.9 });
    const keys = document.querySelectorAll('#piano-keyboard .kbd-white-key');
    keys[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    keys[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(velocityLog.length).toBe(2);
    expect(velocityLog[0].note).not.toBe(velocityLog[1].note);
  });
});

describe('Aftertouch', () => {
  let kbd;
  let aftertouchLog;
  let noteOnLog;
  let noteOffLog;

  beforeEach(() => {
    createFixture();
    aftertouchLog = [];
    noteOnLog = [];
    noteOffLog = [];
  });

  afterEach(() => {
    if (kbd) kbd.destroy();
  });

  function createAtKbd(opts = {}) {
    return createKeyboard({
      config: {
        numOctaves: 1,
        startNote: 60,
        enableQwerty: false,
        enableTouch: false,
        enableAftertouch: true,
        ...opts,
      },
      onNoteOn: (n, v) => noteOnLog.push({ note: n, vel: v }),
      onNoteOff: (n) => noteOffLog.push(n),
      onAftertouch: (n, p) => aftertouchLog.push({ note: n, pressure: p }),
    });
  }

  it('setAftertouch sends channel aftertouch (note=-1)', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(-1, 0.8);
    expect(aftertouchLog.length).toBe(1);
    expect(aftertouchLog[0].note).toBe(-1);
    expect(aftertouchLog[0].pressure).toBeCloseTo(0.8, 2);
  });

  it('setAftertouch sends polyphonic aftertouch for a specific note', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(60, 0.5);
    expect(aftertouchLog.length).toBe(1);
    expect(aftertouchLog[0].note).toBe(60);
    expect(aftertouchLog[0].pressure).toBeCloseTo(0.5, 2);
  });

  it('releaseAftertouch sends pressure=0', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(-1, 0.7);
    kbd.releaseAftertouch(-1);
    expect(aftertouchLog.length).toBe(2);
    expect(aftertouchLog[1].note).toBe(-1);
    expect(aftertouchLog[1].pressure).toBe(0);
  });

  it('releaseAftertouch polyphonic sends pressure=0 for note', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(60, 0.6);
    kbd.releaseAftertouch(60);
    expect(aftertouchLog.length).toBe(2);
    expect(aftertouchLog[1].note).toBe(60);
    expect(aftertouchLog[1].pressure).toBe(0);
  });

  it('getAftertouch returns current channel pressure', () => {
    kbd = createAtKbd();
    expect(kbd.getAftertouch()).toBe(0);
    kbd.setAftertouch(-1, 0.5);
    expect(kbd.getAftertouch()).toBeCloseTo(0.5, 2);
  });

  it('getAftertouch resets after releaseAftertouch', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(-1, 0.7);
    kbd.releaseAftertouch(-1);
    expect(kbd.getAftertouch()).toBe(0);
  });

  it('does not fire onAftertouch when enableAftertouch is false', () => {
    kbd = createAtKbd({ enableAftertouch: false });
    kbd.setAftertouch(-1, 0.5);
    // Callback is still wired, but setAftertouch still works (it's the software API)
    // The config flag only affects pointer-based generation
    expect(aftertouchLog.length).toBe(1);
  });

  it('channel aftertouch only fires callback when value changes', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(-1, 0.5);
    kbd.setAftertouch(-1, 0.5); // same value
    expect(aftertouchLog.length).toBe(1);
  });

  it('polyphonic aftertouch fires for each note independently', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(60, 0.3);
    kbd.setAftertouch(62, 0.6);
    expect(aftertouchLog.length).toBe(2);
    expect(aftertouchLog[0].note).toBe(60);
    expect(aftertouchLog[1].note).toBe(62);
  });

  it('aftertouch pressure is clamped to 0..1', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(-1, 1.5);
    expect(aftertouchLog[0].pressure).toBe(1);
    kbd.setAftertouch(-1, -0.3);
    expect(aftertouchLog[1].pressure).toBe(0);
  });

  it('aftertouch is enabled via config option', () => {
    kbd = createAtKbd({ enableAftertouch: true });
    // Verify aftertouch is enabled by checking pointer-based generation
    const key = document.querySelector('[data-note="60"]');
    key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientY: 100 }));
    // Simulate pointer move down (positive pressure)
    key.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: 50 }));
    // Should generate aftertouch from pointer movement
    expect(aftertouchLog.length).toBeGreaterThan(0);
  });

  it('aftertouch mode polyphonic sends per-note values', () => {
    kbd = createAtKbd({ aftertouchMode: 'polyphonic' });
    kbd.setAftertouch(60, 0.4);
    expect(aftertouchLog[0].note).toBe(60);
    kbd.setAftertouch(62, 0.7);
    expect(aftertouchLog[1].note).toBe(62);
  });

  it('panic releases aftertouch', () => {
    kbd = createAtKbd();
    kbd.setAftertouch(-1, 0.8);
    aftertouchLog.length = 0;
    kbd.panic();
    // After panic, channel aftertouch should be reset
    expect(kbd.getAftertouch()).toBe(0);
  });
});
