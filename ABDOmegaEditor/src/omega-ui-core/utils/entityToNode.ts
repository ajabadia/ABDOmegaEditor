/**
 * @purpose Gestiona un ManifestEntity para renderizar en el editor de manifesto OMEGA.
 * @purpose_en Converts a ManifestEntity to an OmegaNode for rendering in the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:wwtv5x
 * @lastUpdated 2026-06-15T16:55:48.438Z
 */

import type { ManifestEntity, OmegaNode, NodeRole } from '../types/manifest';

export function entityToNode(entity: ManifestEntity): OmegaNode {
  return {
    id: entity.id,
    kind: 'cell',
    role: (entity.role as NodeRole) || 'control',
    bind: entity.bind || undefined,
    layout: {
      pos: { x: 0, y: 0 },
      size: entity.presentation?.size ? {
        width: entity.presentation.size.width,
        height: entity.presentation.size.height
      } : undefined
    },
    style: {
      ...entity.presentation?.style,
      asset: entity.presentation?.asset || entity.presentation?.style?.asset,
      fitting: entity.presentation?.fitting || entity.presentation?.style?.fitting
    },
    cellRef: entity.type,
    children: (entity.presentation?.attachments || []).map(a => ({
      id: a.id,
      kind: 'asset-layer',
      role: (a.role as NodeRole) || 'decor',
      bind: a.bind || undefined,
      layout: {
        pos: { x: a.offsetX, y: a.offsetY }
      },
      style: {
        ...a.style,
        font: a.fontFamily || a.style?.font,
        fontSize: a.fontSize || a.style?.fontSize,
        fontColor: a.fontColor || a.style?.fontColor
      }
    })) as OmegaNode[]
  };
}
