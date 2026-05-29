import type { OmegaNode } from '../types/manifest';
import { getNodeSize } from './spatialConstraints';

/**
 * resolveLayout
 * Phase 4.4.1: Advanced Layout Automation
 * Recursively calculates effective children positions for nodes with stacking modes.
 */
export function resolveLayout(node: OmegaNode, providedSize?: { width: number; height: number }): OmegaNode {
  // Use provided size if present, otherwise fallback to explicit or default
  const effectiveSize = {
    width: providedSize?.width ?? node.layout?.size?.width ?? 0,
    height: providedSize?.height ?? node.layout?.size?.height ?? 0
  };

  const nodeWithEffectiveSize = {
    ...node,
    layout: {
      ...node.layout,
      pos: node.layout?.pos || { x: 0, y: 0 },
      size: effectiveSize
    }
  } as OmegaNode;

  if (!nodeWithEffectiveSize.children || nodeWithEffectiveSize.children.length === 0) return nodeWithEffectiveSize;

  const mode = nodeWithEffectiveSize.layout?.mode || 'absolute';

  // 1. Initial resolution of children (Bottom-up)
  const nestedResolvedChildren = nodeWithEffectiveSize.children.map(c => resolveLayout(c));

  if (mode === 'absolute') {
    return {
      ...nodeWithEffectiveSize,
      children: nestedResolvedChildren
    };
  }

  // 2. Calculate Metrics
  const gap = nodeWithEffectiveSize.layout?.gap || 0;
  const padding = nodeWithEffectiveSize.layout?.padding || 0;
  const containerWidth = effectiveSize.width;
  const containerHeight = effectiveSize.height;

  let totalContentSize = 0;
  const childrenSizes = nestedResolvedChildren.map(c => getNodeSize(c));

  if (mode === 'stack-v') {
    totalContentSize = childrenSizes.reduce((acc, s) => acc + s.height, 0) + (Math.max(0, childrenSizes.length - 1) * gap);
  } else if (mode === 'stack-h') {
    totalContentSize = childrenSizes.reduce((acc, s) => acc + s.width, 0) + (Math.max(0, childrenSizes.length - 1) * gap);
  }

  // 3. Justify & Align Parameters
  const justify = nodeWithEffectiveSize.layout?.justify || 'start';
  const align = nodeWithEffectiveSize.layout?.align || 'start';

  let cursor = padding;
  let effectiveGap = gap;

  if (justify === 'center') {
    const containerSize = mode === 'stack-v' ? containerHeight : containerWidth;
    cursor = padding + Math.max(0, (containerSize - 2 * padding - totalContentSize) / 2);
  } else if (justify === 'end') {
    const containerSize = mode === 'stack-v' ? containerHeight : containerWidth;
    cursor = containerSize - padding - totalContentSize;
  } else if (justify === 'space-between' && nestedResolvedChildren.length > 1) {
    const containerSize = mode === 'stack-v' ? containerHeight : containerWidth;
    const totalChildrenSize = childrenSizes.reduce((acc, s) => acc + (mode === 'stack-v' ? s.height : s.width), 0);
    effectiveGap = Math.max(0, (containerSize - 2 * padding - totalChildrenSize) / (nestedResolvedChildren.length - 1));
    cursor = padding;
  }

  // 4. Apply Stacking Logic (Era 7.2.3 Declarative)
  const stackedChildren = nestedResolvedChildren.map((child, index) => {
    const size = childrenSizes[index];
    if (!size) return child; // Hardened null check

    let resolvedPos = { x: 0, y: 0 };
    const resolvedSize = { ...child.layout?.size || { width: size.width, height: size.height } };
    let needsReResolve = false;

    if (mode === 'stack-v') {
      let x = padding;
      if (align === 'center') x = padding + (containerWidth - 2 * padding - size.width) / 2;
      else if (align === 'end') x = containerWidth - padding - size.width;
      else if (align === 'stretch') {
        x = padding;
        resolvedSize.width = Math.max(0, containerWidth - 2 * padding);
        if (resolvedSize.width !== size.width) needsReResolve = true;
      }

      resolvedPos = { x, y: cursor };
      cursor += size.height + effectiveGap;
    } else if (mode === 'stack-h') {
      let y = padding;
      if (align === 'center') y = padding + (containerHeight - 2 * padding - size.height) / 2;
      else if (align === 'end') y = containerHeight - padding - size.height;
      else if (align === 'stretch') {
        y = padding;
        resolvedSize.height = Math.max(0, containerHeight - 2 * padding);
        if (resolvedSize.height !== size.height) needsReResolve = true;
      }

      resolvedPos = { x: cursor, y };
      cursor += size.width + effectiveGap;
    }

    // Re-resolve if size was forced by parent (Stretch)
    let finalChild = child;
    if (needsReResolve && child.children && child.children.length > 0) {
      finalChild = resolveLayout(child, resolvedSize);
    }

    return {
      ...finalChild,
      layout: {
        ...finalChild.layout,
        pos: resolvedPos,
        size: resolvedSize
      }
    } as OmegaNode;
  });

  return {
    ...nodeWithEffectiveSize,
    children: stackedChildren
  };
}
