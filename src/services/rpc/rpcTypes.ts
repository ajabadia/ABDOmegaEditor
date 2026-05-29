import type { OmegaNode, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';

export type SyncStatus = 'disconnected' | 'syncing' | 'in-sync' | 'degraded' | 'error';

export interface RPCBaseMessage {
  jsonrpc: '2.0';
  id?: string | number;
  sessionId: string; // Anti-crosstalk session identifier
  seq: number; // Sequence number for ordering
  timestamp: number;
}

export interface RPCRequest<T = unknown> extends RPCBaseMessage {
  method: string;
  params: T;
}

export interface RPCResponse<T = unknown> extends RPCBaseMessage {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Snapshot Payload
 * Complete state reconstruction.
 */
export interface SnapshotParams {
  manifestVersion: string;
  documentId: string;
  graph: OmegaNode; // Serialized UCA tree
  modulations: OMEGA_Modulation[];
}

/**
 * Delta Payload
 * Minimal, typed patches for real-time updates.
 */
export interface DeltaPatch {
  targetId: string; // Fully resolved UCA path (e.g. voice_1/osc_1/freq)
  value: unknown;
  type: 'parameter' | 'structural' | 'modulation';
}

export interface HealthStatus {
  status: SyncStatus;
  engineLatency: number;
  lastSeq: number;
  version: string;
}

export enum RPCErrors {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  OUT_OF_SEQUENCE = 1001,
  VERSION_MISMATCH = 1002
}
