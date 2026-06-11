/**
 * OMEGA UCA Path Resolver Utility - Phase 17.3
 * Sovereign logic for hierarchical ID resolution and path parsing.
 */

/**
 * resolvePath
 * Resolves a local ID against a parent path.
 * Rule: Absolute paths (containing '/') are returned as-is (Genetic Authority).
 */
export function resolvePath(localId: string, parentPath?: string): string {
  if (!localId) return 'anonymous_node';
  
  // Absolute path detection
  if (localId.includes('/')) {
    return localId;
  }

  return parentPath ? `${parentPath}/${localId}` : localId;
}

/**
 * parsePath
 * Decomposes a full path into its owning node path and the specific target (port/parameter).
 * Rule: The last segment is always considered the target in the context of modulation/signals.
 */
export function parsePath(fullPath: string): { nodePath: string; target?: string | undefined } {
  const segments = fullPath.split('/');
  
  if (segments.length > 1) {
    return {
      nodePath: segments.slice(0, -1).join('/'),
      target: segments[segments.length - 1]
    };
  }

  return { nodePath: fullPath, target: undefined };
}

/**
 * normalizeModulationTarget
 * Ensures a modulation target is correctly prefixed within its node context.
 */
export function normalizeModulationTarget(target: string, nodePath: string): string {
    // If it's already a path containing the nodePath as a prefix, return as is
    if (target.startsWith(nodePath + '/')) {
        return target;
    }
    // Otherwise, it's relative to the node
    return `${nodePath}/${target}`;
}
