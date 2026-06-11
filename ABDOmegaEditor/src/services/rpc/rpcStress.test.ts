import { OmegaRPCBridge } from './omegaRPCBridge';
import type { OmegaNode, OMEGA_Manifest } from '../../omega-ui-core/types/manifest';
import type { SnapshotParams, DeltaPatch } from './rpcTypes';

/**
 * OMEGA Phase 20.3 Stress Test
 * Validates ACK synchronization, delta buffering, and heartbeat health.
 */

/**
 * OmegaTestBridge
 * Test-only subclass to expose protected members for stress validation.
 */
class OmegaTestBridge extends OmegaRPCBridge {
  public get mockWS(): MockWebSocket {
    return this.ws as unknown as MockWebSocket;
  }
  public get currentDeltaBuffer(): DeltaPatch[] {
    return this.deltaBuffer;
  }
  public get currentSessionId(): string {
    return this.sessionId;
  }
}

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public readyState = MockWebSocket.OPEN;
  public messagesSent: string[] = [];
  public autoAck = true;
  public ackDelay = 50;

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  send(data: string) {
    this.messagesSent.push(data);
    const parsed = JSON.parse(data);
    
    if (this.autoAck) {
        setTimeout(() => {
            if (this.onmessage) {
                this.onmessage({
                  data: JSON.stringify({
                    jsonrpc: '2.0',
                    id: parsed.id,
                    sessionId: parsed.sessionId,
                    result: { success: true, hash: 'STABLE_HASH' }
                  })
                });
              }
        }, this.ackDelay);
    }
  }

  simulateHeartbeat(sessionId: string) {
    if (this.onmessage) {
        this.onmessage({
            data: JSON.stringify({
                jsonrpc: '2.0',
                sessionId: sessionId,
                method: 'engine.heartbeat',
                params: { cpu: 0.1 }
            })
        });
    }
  }
}

// Global WebSocket Mock (Industrial Root Fix)
Object.defineProperty(globalThis, 'WebSocket', {
  value: MockWebSocket,
  writable: true
});

async function runStressTest() {
    console.log('--- STARTING PHASE 20.3 STRESS TEST ---');
    
    const bridge = new OmegaTestBridge('ws://stress-test');
    bridge.connect((s) => { console.log(`[STATUS] -> ${s}`); });

    const ws = bridge.mockWS;
    ws.onopen!();

    // TEST 1: DELTA BUFFERING DURING SLOW SNAPSHOT
    console.log('\n[TEST 1: Delta Buffering during Slow Snapshot]');
    ws.ackDelay = 500; // 500ms delay for ACK
    
    const snapshot: SnapshotParams = {
        manifestVersion: '7.2.3',
        documentId: 'stress-doc',
        graph: { id: 'root' } as OmegaNode,
        modulations: []
    };

    // Start sync (async)
    const dummyManifest = { id: 'stress-doc', ui: { tree: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 } } } } } as unknown as OMEGA_Manifest;
    const syncPromise = bridge.syncSnapshot(snapshot, dummyManifest);
    console.log('Snapshot sync started. Status:', bridge.getStatus());

    // Push deltas while syncing
    bridge.applyDelta({ targetId: 'osc/freq', value: 100, type: 'parameter' });
    bridge.applyDelta({ targetId: 'osc/freq', value: 200, type: 'parameter' });
    
    console.log('Buffered Deltas count (expected 2):', bridge.currentDeltaBuffer.length);
    if (bridge.currentDeltaBuffer.length === 2) {
        console.log('✅ Deltas successfully buffered during sync.');
    }

    // Wait for ACK
    await syncPromise;
    console.log('Snapshot sync finished. Status:', bridge.getStatus());
    
    // Check if deltas were flushed
    console.log('Buffered Deltas count (expected 0):', bridge.currentDeltaBuffer.length);
    if (bridge.currentDeltaBuffer.length === 0 && ws.messagesSent.length >= 3) {
        console.log('✅ Deltas successfully flushed after ACK.');
    }

    // TEST 2: HEARTBEAT & DEGRADATION
    console.log('\n[TEST 2: Heartbeat & Health Monitoring]');
    console.log('Initial Status:', bridge.getStatus());
    
    // Wait for 4 seconds without heartbeat (Threshold is 3s)
    console.log('Waiting for heartbeat timeout (4s)...');
    await new Promise(r => setTimeout(r, 4000));
    
    console.log('Status after timeout (expected degraded):', bridge.getStatus());
    if (bridge.getStatus() === 'degraded') {
        console.log('✅ Heartbeat timeout detected degradation.');
    } else {
        console.error('❌ Heartbeat timeout NOT detected. Status:', bridge.getStatus());
    }

    // Recover with heartbeat
    console.log('Simulating heartbeat...');
    ws.simulateHeartbeat(bridge.currentSessionId);
    await new Promise(r => setTimeout(r, 500)); // Processing delay
    
    console.log('Status after heartbeat (expected in-sync):', bridge.getStatus());
    if (bridge.getStatus() === 'in-sync') {
        console.log('✅ Heartbeat recovered health status.');
    }

    bridge.disconnect();
    console.log('\n--- PHASE 20.3 STRESS TEST COMPLETE ---');
    process.exit(0);
}

runStressTest().catch(console.error);
