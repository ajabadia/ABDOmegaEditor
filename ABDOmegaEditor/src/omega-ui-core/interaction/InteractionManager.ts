/**
 * @purpose Enlaza las celdas interactivas de un panel (knob/slider/stepper/select) a un transporte de parámetros inyectado, sin conocer la topología del host.
 * @purpose_en Binds a panel's interactive cells (knob/slider/stepper/select) to an injected parameter transport, agnostic of the host topology.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:m2i9qz
 * @lastUpdated 2026-08-02T00:00:00.000Z
 */

import type { PanelBinding, PanelBindingKind, PanelBindingRange, PanelTransport } from '../types/panelRenderer';
import { PANEL_SELECTORS } from '../types/panelRenderer';

/** Sensibilidad de drag vertical del knob (px por unidad 0-1). Heredada de useKnobInteraction/ControlBinder. */
export const KNOB_SENSITIVITY_PX = 150;

/**
 * InteractionManager — Único binder DOM→parámetro de omega-ui-core.
 * Sustituye a ControlBinder (host) y replica la semántica de useKnobInteraction:
 * drag vertical del knob mapeado a 0-1 con pointer capture, slider absoluto,
 * stepper por paso y select cíclico. El transporte (PanelTransport) se inyecta
 * en tiempo de bind: host→rpc.send, editor→store local.
 */
export class InteractionManager {
  private readonly transport: PanelTransport;
  private readonly bindings: PanelBinding[];
  /** AbortControllers activos: uno por llamada a bind(). dispose() los aborta todos. */
  private readonly controllers: AbortController[] = [];

  constructor(transport: PanelTransport, bindings: PanelBinding[]) {
    this.transport = transport;
    this.bindings = bindings;
  }

  /**
   * Enlaza todas las celdas del container por `data-node-id`.
   * Idempotente: si se llama dos veces sobre el mismo container, los binds
   * previos se liberan para evitar listeners duplicados.
   */
  bind(container: HTMLElement): void {
    // Idempotencia real: libera binds previos antes de re-enlazar.
    this.dispose();

    const controller = new AbortController();
    this.controllers.push(controller);
    const { signal } = controller;

    for (const binding of this.bindings) {
      const cell = container.querySelector<HTMLElement>(
        `[${PANEL_SELECTORS.NODE_ID_ATTR}="${binding.nodeId}"]`,
      );
      if (!cell) continue;

      switch (binding.kind) {
        case 'knob':
          this.bindKnob(cell, binding, signal);
          break;
        case 'slider':
          this.bindSlider(cell, binding, signal);
          break;
        case 'stepper':
        case 'display':
          this.bindStepper(cell, binding, signal);
          break;
        case 'select':
          this.bindSelect(cell, binding, signal);
          break;
        case 'jack':
          break; // jacks: no parameter interaction (patch points)
      }
    }
  }

  /** Libera todos los listeners registrados (cleanup en destroy). */
  dispose(): void {
    for (const controller of this.controllers) controller.abort();
    this.controllers.length = 0;
  }

  /* ─── Knob: drag vertical → 0-1 con pointer capture ─── */

  private bindKnob(cell: HTMLElement, binding: PanelBinding, signal: AbortSignal): void {
    const knob = cell.querySelector<HTMLElement>(PANEL_SELECTORS.KNOB);
    if (!knob) return;

    let dragging = false;
    let startY = 0;
    let startValue = 0;

    const onDown = (e: PointerEvent): void => {
      e.preventDefault();
      dragging = true;
      startY = e.clientY;
      startValue = this.initialValue(binding);
      knob.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent): void => {
      if (!dragging) return;
      const dy = startY - e.clientY;
      const next = clamp01(startValue + dy / KNOB_SENSITIVITY_PX);
      this.emit(binding, next);
    };

    const onUp = (e: PointerEvent): void => {
      if (!dragging) return;
      dragging = false;
      if (knob.hasPointerCapture(e.pointerId)) knob.releasePointerCapture(e.pointerId);
    };

    knob.addEventListener('pointerdown', onDown, { signal });
    knob.addEventListener('pointermove', onMove, { signal });
    knob.addEventListener('pointerup', onUp, { signal });
    knob.addEventListener('pointercancel', onUp, { signal });
  }

  /* ─── Slider: posición absoluta (horizontal/vertical) ─── */

  private bindSlider(cell: HTMLElement, binding: PanelBinding, signal: AbortSignal): void {
    const slider = cell.querySelector<HTMLElement>(PANEL_SELECTORS.SLIDER);
    if (!slider) return;

    let dragging = false;

    const apply = (e: PointerEvent): void => {
      const rect = slider.getBoundingClientRect();
      const isHoriz = slider.classList.contains(PANEL_SELECTORS.SLIDER_HORIZONTAL);
      const norm = isHoriz
        ? (e.clientX - rect.left) / Math.max(rect.width, 1)
        : 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      this.emit(binding, clamp01(norm));
    };

    const onDown = (e: PointerEvent): void => {
      e.preventDefault();
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      apply(e);
    };

    const onMove = (e: PointerEvent): void => {
      if (dragging) apply(e);
    };

    const onUp = (e: PointerEvent): void => {
      if (!dragging) return;
      dragging = false;
      if (slider.hasPointerCapture(e.pointerId)) slider.releasePointerCapture(e.pointerId);
    };

    slider.addEventListener('pointerdown', onDown, { signal });
    slider.addEventListener('pointermove', onMove, { signal });
    slider.addEventListener('pointerup', onUp, { signal });
    slider.addEventListener('pointercancel', onUp, { signal });
  }

  /* ─── Stepper / Display button: paso por click (data-dir o data-action) ─── */

  private bindStepper(cell: HTMLElement, binding: PanelBinding, signal: AbortSignal): void {
    const buttons = cell.querySelectorAll<HTMLElement>(PANEL_SELECTORS.STEPPER);
    buttons.forEach((btn) => {
      const onClick = (e: Event): void => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        const dir =
          action === 'step-up' ? 1
          : action === 'step-down' ? -1
          : (parseInt(target.dataset.dir || '0', 10) || 0);
        const range = binding.range || { min: 0, max: 1, step: 0.01 };
        const step = range.step ?? 0.01;
        const current = this.initialValue(binding);
        const next = clamp(current + dir * step, range.min ?? 0, range.max ?? 1);
        this.emit(binding, next);
      };
      btn.addEventListener('click', onClick, { signal });
    });
  }

  /* ─── Select: ciclo de opciones ─── */

  private bindSelect(cell: HTMLElement, binding: PanelBinding, signal: AbortSignal): void {
    const sel = cell.querySelector<HTMLElement>(PANEL_SELECTORS.SELECT);
    if (!sel) return;

    const onClick = (): void => {
      const range = binding.range || { min: 0, max: 1, step: 0.01 };
      const count = Math.max(1, Math.round((range.max ?? 1) - (range.min ?? 0) + 1));
      const current = this.initialValue(binding);
      const norm = (current - (range.min ?? 0)) / Math.max((range.max ?? 1) - (range.min ?? 0), 1);
      const nextIndex = (Math.floor(norm * count) + 1) % count;
      const next = (range.min ?? 0) + (nextIndex / Math.max(count - 1, 1)) * ((range.max ?? 1) - (range.min ?? 0));
      this.emit(binding, clamp(next, range.min ?? 0, range.max ?? 1));
    };

    sel.addEventListener('click', onClick, { signal });
  }

  /* ─── Internals ─── */

  private initialValue(binding: PanelBinding): number {
    return binding.range?.default ?? 0.5;
  }

  private emit(binding: PanelBinding, value: number): void {
    this.transport.sendParamChange({ target: binding.entityId, value });
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export type { PanelBindingKind, PanelBindingRange, PanelTransport };
