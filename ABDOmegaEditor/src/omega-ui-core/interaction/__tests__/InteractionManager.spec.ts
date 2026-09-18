/**
 * @jest-environment jsdom
 *
 * Tests for InteractionManager — enlaza celdas del panel (knob/slider/stepper/select)
 * a un transporte de parámetros y debe poder liberar TODOS sus listeners vía dispose().
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { fireEvent } from '@testing-library/react';
import { InteractionManager, KNOB_SENSITIVITY_PX } from '../InteractionManager';
import type { PanelBinding, PanelTransport } from '../../types/panelRenderer';

function makeTransport(): { transport: PanelTransport; sendParamChange: jest.Mock } {
  const sendParamChange = jest.fn();
  return { transport: { sendParamChange }, sendParamChange };
}

/** jsdom no implementa pointer capture; stub para que el drag no explote. */
function stubPointerCapture(): void {
  Object.defineProperty(Element.prototype, 'setPointerCapture', { configurable: true, writable: true, value: () => {} });
  Object.defineProperty(Element.prototype, 'hasPointerCapture', { configurable: true, writable: true, value: () => true });
  Object.defineProperty(Element.prototype, 'releasePointerCapture', { configurable: true, writable: true, value: () => {} });
}

function mountKnob(nodeId = 'knob-1'): { container: HTMLDivElement; knob: HTMLElement } {
  const container = document.createElement('div');
  container.innerHTML = `<div data-node-id="${nodeId}"><div class="knob-container"></div></div>`;
  document.body.appendChild(container);
  const knob = container.querySelector<HTMLElement>('.knob-container')!;
  return { container, knob };
}

function dragKnob(knob: HTMLElement, startY: number, endY: number): void {
  fireEvent.pointerDown(knob, { clientY: startY, pointerId: 1 });
  fireEvent.pointerMove(knob, { clientY: endY, pointerId: 1 });
  fireEvent.pointerUp(knob, { pointerId: 1 });
}

describe('InteractionManager', () => {
  const knobBinding: PanelBinding = {
    nodeId: 'knob-1',
    entityId: 'param.cutoff',
    kind: 'knob',
    range: { min: 0, max: 1, default: 0.5 },
  };

  beforeEach(() => {
    // jsdom no define PointerEvent: polyfill como MouseEvent para que fireEvent
    // conserve clientX/clientY (si no, testing-library cae a Event plano y emite NaN).
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: window.MouseEvent,
    });
    stubPointerCapture();
    document.body.innerHTML = '';
  });

  it('emite el valor normalizado al arrastrar un knob', () => {
    const { transport, sendParamChange } = makeTransport();
    const manager = new InteractionManager(transport, [knobBinding]);
    const { container, knob } = mountKnob();

    manager.bind(container);
    // dy = 100 - 50 = 50px → +50/150 = 0.333 → 0.5 + 0.333 = 0.833
    dragKnob(knob, 100, 50);

    expect(sendParamChange).toHaveBeenCalledTimes(1);
    expect(sendParamChange).toHaveBeenCalledWith({
      target: 'param.cutoff',
      value: expect.closeTo(0.5 + 50 / KNOB_SENSITIVITY_PX, 2),
    });
  });

  it('dispose() elimina los listeners: no emite nada tras liberar', () => {
    const { transport, sendParamChange } = makeTransport();
    const manager = new InteractionManager(transport, [knobBinding]);
    const { container, knob } = mountKnob();

    manager.bind(container);
    dragKnob(knob, 100, 50);
    expect(sendParamChange).toHaveBeenCalledTimes(1);

    manager.dispose();
    dragKnob(knob, 100, 50);
    expect(sendParamChange).toHaveBeenCalledTimes(1); // sin nuevos eventos
  });

  it('bind() dos veces sobre el mismo container no duplica listeners', () => {
    const { transport, sendParamChange } = makeTransport();
    const manager = new InteractionManager(transport, [knobBinding]);
    const { container, knob } = mountKnob();

    manager.bind(container);
    manager.bind(container);
    dragKnob(knob, 100, 50);

    expect(sendParamChange).toHaveBeenCalledTimes(1);
  });

  it('dispose() libera también slider, stepper y select', () => {
    const bindings: PanelBinding[] = [
      { nodeId: 'slider-1', entityId: 'param.vol', kind: 'slider' },
      { nodeId: 'step-1', entityId: 'param.oct', kind: 'stepper', range: { min: -2, max: 2, step: 1 } },
      { nodeId: 'sel-1', entityId: 'param.wave', kind: 'select', range: { min: 0, max: 3, step: 1 } },
    ];
    const { transport, sendParamChange } = makeTransport();
    const manager = new InteractionManager(transport, bindings);

    const container = document.createElement('div');
    container.innerHTML = `
      <div data-node-id="slider-1"><div class="slider-wrapper slider-v"></div></div>
      <div data-node-id="step-1"><button class="stepper-container" data-dir="1">+</button></div>
      <div data-node-id="sel-1"><div class="industrial-select-wrapper"></div></div>
    `;
    document.body.appendChild(container);
    manager.bind(container);

    const slider = container.querySelector<HTMLElement>('.slider-wrapper')!;
    const stepperBtn = container.querySelector<HTMLElement>('.stepper-container')!;
    const select = container.querySelector<HTMLElement>('.industrial-select-wrapper')!;

    // jsdom devuelve rects a ceros; forzamos geometría para el slider absoluto.
    Object.defineProperty(slider, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0, top: 0, width: 12, height: 100, right: 12, bottom: 100, x: 0, y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(slider, { clientY: 25, pointerId: 2 });
    fireEvent.pointerUp(slider, { pointerId: 2 });
    fireEvent.click(stepperBtn);
    fireEvent.click(select);

    // slider (1) + stepper (1) + select (1) = 3 emisiones
    expect(sendParamChange).toHaveBeenCalledTimes(3);
    expect(sendParamChange).toHaveBeenCalledWith({ target: 'param.vol', value: expect.closeTo(0.75, 2) });

    const callsBefore = sendParamChange.mock.calls.length;
    manager.dispose();

    fireEvent.pointerDown(slider, { clientY: 25, pointerId: 3 });
    fireEvent.pointerUp(slider, { pointerId: 3 });
    fireEvent.click(stepperBtn);
    fireEvent.click(select);

    expect(sendParamChange.mock.calls.length).toBe(callsBefore); // nada nuevo
  });
});
