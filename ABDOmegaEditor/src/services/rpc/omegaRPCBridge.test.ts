/**
 * @jest-environment jsdom
 *
 * Tests de nivel protocolo para OmegaRPCBridge con un WebSocket fake:
 * handshake bridge.hello, reconexión con backoff exponencial, manejo de
 * VERSION_MISMATCH y delta batching — sin necesidad de un motor C++ real.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { OmegaRPCBridge } from './omegaRPCBridge';

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState: number = 1;
  url: string;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  /* ─── Helpers de test ─── */
  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  drop(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  respond(obj: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  lastMessage(): { method?: string; params?: Record<string, unknown>; sessionId?: string } | null {
    return this.sent.length > 0 ? JSON.parse(this.sent[this.sent.length - 1]) : null;
  }
}

let bridge: OmegaRPCBridge;

beforeEach(() => {
  jest.useFakeTimers();
  FakeWebSocket.instances = [];
  (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  bridge = new OmegaRPCBridge('ws://fake:8081');
});

afterEach(() => {
  bridge.disconnect();
  jest.useRealTimers();
});

function connectAndOpen(): FakeWebSocket {
  bridge.connect();
  const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  ws.open();
  return ws;
}

describe('OmegaRPCBridge — handshake y protocolo', () => {
  it('envía bridge.hello con versión de protocolo al conectar', () => {
    const ws = connectAndOpen();
    const hello = ws.lastMessage();
    expect(hello?.method).toBe('bridge.hello');
    expect((hello?.params as { protocol?: number })?.protocol).toBe(1);
    expect(hello?.sessionId).toBeTruthy();
  });

  it('VERSION_MISMATCH → estado degraded', () => {
    const ws = connectAndOpen();
    ws.respond({
      jsonrpc: '2.0',
      sessionId: ws.lastMessage()?.sessionId,
      error: { code: 1002, message: 'version mismatch' },
    });
    expect(bridge.getStatus()).toBe('degraded');
  });

  it('applyDeltaBatch transmite los deltas por el socket', () => {
    const ws = connectAndOpen();
    bridge.applyDeltaBatch([{ targetId: 'osc/freq', value: 0.5 }]);
    const msg = ws.lastMessage();
    expect(msg?.method).toBe('bridge.applyDeltaBatch');
    expect((msg?.params as { deltas?: unknown[] })?.deltas).toEqual([{ targetId: 'osc/freq', value: 0.5 }]);
  });
});

describe('OmegaRPCBridge — reconexión con backoff exponencial', () => {
  it('reintenta con delay creciente (2s, 4s, 8s) tras perder la conexión', () => {
    connectAndOpen(); // intento 0

    FakeWebSocket.instances[0].drop(); // → attempt 0 → 2000ms
    expect(FakeWebSocket.instances.length).toBe(1);

    jest.advanceTimersByTime(1999);
    expect(FakeWebSocket.instances.length).toBe(1); // aún no

    jest.advanceTimersByTime(1);
    expect(FakeWebSocket.instances.length).toBe(2); // attempt 1 (delay 2000)

    FakeWebSocket.instances[1].drop(); // → attempt 1 → 4000ms
    jest.advanceTimersByTime(3999);
    expect(FakeWebSocket.instances.length).toBe(2);

    jest.advanceTimersByTime(1);
    expect(FakeWebSocket.instances.length).toBe(3); // attempt 2 (delay 4000)
  });

  it('el delay se limita a 30s (tope del backoff)', () => {
    connectAndOpen();
    // intentos: 0→2s, 1→4s, 2→8s, 3→16s, 4→32s → tope 30s
    for (let i = 0; i < 5; i++) {
      FakeWebSocket.instances[FakeWebSocket.instances.length - 1].drop();
      jest.advanceTimersByTime(30_001);
    }
    expect(FakeWebSocket.instances.length).toBe(6);
  });

  it('disconnect() cancela el reintento pendiente', () => {
    const ws = connectAndOpen();
    ws.drop(); // agenda reconexión
    bridge.disconnect(); // la cancela
    const count = FakeWebSocket.instances.length;
    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances.length).toBe(count); // no se reconecta
  });
});
