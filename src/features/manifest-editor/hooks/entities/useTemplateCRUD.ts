'use client';

import { useCallback } from 'react';
import type { OMEGA_Manifest, ModuleTemplate, OmegaNode } from '@/omega-ui-core/types/manifest';

/**
 * useTemplateCRUD (Phase 5.4)
 * Handles injection of template-based nodes into the UCA tree.
 */
export const useTemplateCRUD = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest>, label?: string) => void,
  addLog: (msg: string) => void
) => {

  const registerTemplate = useCallback((template: ModuleTemplate) => {
    const nextLibrary = { ...(manifest.moduleTemplates || {}) };
    nextLibrary[template.id] = template;

    updateManifest({
      moduleTemplates: nextLibrary
    }, `[DNA] Register Template: ${template.label}`);

    addLog(`[DNA] Template '${template.label}' certified and registered in library.`);
  }, [manifest, updateManifest, addLog]);

  const removeTemplate = useCallback((id: string) => {
    const nextLibrary = { ...(manifest.moduleTemplates || {}) };
    const label = nextLibrary[id]?.label || id;
    delete nextLibrary[id];

    updateManifest({ moduleTemplates: nextLibrary } as Partial<OMEGA_Manifest>, `Update Template: ${id}`);

    addLog(`[DNA] Template '${label}' removed from library.`);
  }, [manifest, updateManifest, addLog]);

  const applyTemplate = useCallback((template: ModuleTemplate) => {
    addLog(`[SYSTEM] Injecting Blueprint: ${template.label} (v${template.version || '1.0'})...`);

    // 1. Ensure the manifest supports UCA
    const currentTree = manifest.ui?.tree || {
      id: 'root',
      kind: 'rack',
      role: 'structure',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
      children: []
    };

    // 2. Create the Template Instance Node
    const newNode: OmegaNode = {
      id: `${template.id}_${Math.random().toString(36).substr(2, 4)}`,
      kind: 'cell',
      role: template.category || 'structure',
      cellRef: template.id,
      layout: {
        pos: { x: 10, y: 10 }, 
        mode: (template.baseNode)?.layout?.mode || 'absolute'
      },
      overrides: {},
      slotMappings: {}
    };

    // 3. Initialize required slot mappings
    (template.slots || []).forEach((slot: { id: string }) => {
      if (newNode.slotMappings) {
        newNode.slotMappings[slot.id] = ''; 
      }
    });

    const updatedTree = {
      ...currentTree,
      children: [...(currentTree.children || []), newNode]
    };

    updateManifest({
      ui: {
        ...manifest.ui,
        tree: updatedTree
      }
    }, `Apply Template: ${template.label}`);

    addLog(`[SUCCESS] Template '${template.label}' injected into workspace.`);
  }, [manifest, updateManifest, addLog]);

  return {
    registerTemplate,
    removeTemplate,
    applyTemplate
  };
};
