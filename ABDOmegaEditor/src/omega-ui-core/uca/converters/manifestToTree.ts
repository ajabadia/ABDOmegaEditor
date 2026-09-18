/**
 * @purpose Convierte un arreglo plano de manifest en un árbol OmegaNode recursivo para la renderización en el editor de manifest OMEGA.
 * @purpose_en Converts a flat manifest array into a recursive OmegaNode tree for rendering in the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:7r2fhv
 * @lastUpdated 2026-08-02T00:00:00.000Z
 */

import type { OmegaNode } from '../../types/manifest';
import type { OMEGA_Manifest } from '../../types/manifest';
import { flatToTree } from './flatToTree';
import type { RuntimeFlatManifest } from './flatToTree';

/**
 * manifestToTree
 * Hydrates a recursive OmegaNode tree from the flat canonical manifest arrays.
 *
 * Delegates to flatToTree: the canonical ACEMM shape (`ui.layout.containers` +
 * `ui.controls` + `ui.jacks`) is a subset of the runtime schema that flatToTree
 * normalizes, so both converters share the same semantics:
 * - jacks (role:'io' | type:*jack* | presentation.component:'port') → cellRef:'port'
 * - controls → cellRef from the VISUAL component (component-first), then type
 * - containers propagate their variant into node.style.variant
 * - when existingTree is supplied, any node with a matching id keeps its prior
 *   layout.pos / layout.size / zIndex / style / meta — editor edits are never
 *   wiped on manifest load, and editor-only nodes survive.
 * - children are deduped by id (fresh nodes win) — no duplicates on re-conversion.
 */
export function manifestToTree(manifest: OMEGA_Manifest, existingTree?: OmegaNode): OmegaNode {
  // El schema canónico es un subconjunto del runtime schema que flatToTree
  // normaliza; el cast refleja que RuntimeFlatManifest es más laxo por diseño.
  return flatToTree(manifest as unknown as Partial<RuntimeFlatManifest>, existingTree);
}
