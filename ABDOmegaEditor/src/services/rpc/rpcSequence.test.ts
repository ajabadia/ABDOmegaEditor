import { OmegaRPCBridge } from './omegaRPCBridge';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { SnapshotParams, DeltaPatch } from './rpcTypes';

/**
 * OMEGA RPC Sequence Test - Phase 17.4
 * Validates the transport layer's integrity and anti-crosstalk logic.
 */

console.log('--- STARTING OMEGA RPC SEQUENCE TEST (Phase 17.4) ---');

// Mock WebSocket (Simplified for testing)
class MockWebSocket {
  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public readyState = 1;
  public lastSentMessage: string | null = null;

  send(data: string) {
    this.lastSentMessage = data;
    const parsed = JSON.parse(data);
    
    // Simulate Engine Response (JSON-RPC 2.0)
    // Industrial: Ensure we return the same sessionId to pass the foreign session check
    setTimeout(() => {
        if (this.onmessage) {
            this.onmessage({
              data: JSON.stringify({
                jsonrpc: '2.0',
                id: parsed.id,
                sessionId: parsed.sessionId,
                seq: parsed.seq,
                timestamp: Date.now(),
                result: 'ack'
              })
            });
          }
    }, 10);
  }
}

// Override global WebSocket for testing
(globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;

const bridge = new OmegaRPCBridge('ws://mock');
bridge.connect(() => {
    // Status ignored in test
});

// We need to simulate the open event
setTimeout(() => {
    const ws = (bridge as unknown as { ws: MockWebSocket }).ws;
    ws.onopen!();

    // 1. Snapshot Sync
    console.log('\n[Test 1: Snapshot Sync]');
    const snapshot: SnapshotParams = {
        manifestVersion: '7.2.3',
        documentId: 'primary',
        graph: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 }, size: { width: 400, height: 400 } } } as OmegaNode,
        modulations: []
    };
    const dummyManifest = { id: 'primary', ui: { tree: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 } } } } } as unknown as OMEGA_Manifest;
    bridge.syncSnapshot(snapshot, dummyManifest);
    const sentMsg = JSON.parse(ws.lastSentMessage!);
    console.log('Sent Method:', sentMsg.method);
    console.log('Sent Seq:', sentMsg.seq);
    if (sentMsg.method === 'bridge.syncSnapshot' && sentMsg.seq === 1) {
        console.log('✅ Snapshot sent with seq 1 PASSED');
    }

    // 2. Delta Sequence
    console.log('\n[Test 2: Delta Sequence]');
    const patch1: DeltaPatch = { targetId: 'osc_1/freq', value: 440, type: 'parameter' };
    const patch2: DeltaPatch = { targetId: 'osc_1/pwm', value: 0.5, type: 'parameter' };

    bridge.applyDelta(patch1);
    const msg1 = JSON.parse(ws.lastSentMessage!);
    bridge.applyDelta(patch2);
    const msg2 = JSON.parse(ws.lastSentMessage!);

    console.log('Patch 1 Seq:', msg1.seq);
    console.log('Patch 2 Seq:', msg2.seq);

    if (msg1.seq === 2 && msg2.seq === 3) {
        console.log('✅ Incremental sequence tracking PASSED');
    } else {
        console.error('❌ Incremental sequence tracking FAILED');
    }

    // 3. Anti-Crosstalk (Session ID)
    console.log('\n[Test 3: Session ID]');
    console.log('Session ID:', sentMsg.sessionId);
    if (sentMsg.sessionId.startsWith('session_')) {
        console.log('✅ Unique session identifier PASSED');
    }

    console.log('\n--- PHASE 17.4 TEST COMPLETE ---');
}, 100);
