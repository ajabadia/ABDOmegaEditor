/**
 * V2 Blueprint Types — Simplified GroupNode format
 *
 * These types represent the simplified blueprint format used by the
 * Blueprint Library panel and the Right Dock insertion pipeline.
 * Previously duplicated between BlueprintLibraryPanel and RightDockContainer.
 */

export interface V2BlueprintMeta {
  id: string;
  label: string;
  family?: string;
  version: string;
  category: string;
  description?: string;
  path: string;
}

export interface V2BlueprintData {
  id: string;
  label: string;
  pos: { x: number; y: number };
  children: Array<{
    id: string;
    type: string;
    label: string;
    pos: { x: number; y: number };
    size?: { width: number; height: number };
    style?: Record<string, unknown>;
    bind?: { target: string };
  }>;
}
