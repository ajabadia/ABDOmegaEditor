'use client';

/**
 * @purpose Gestiona operaciones de archivos para el editor de manifesto OMEGA, incluyendo restaurar paquetes Omega, importar manifests JSON distilados, cargar proyectos Omega y manejar arrastre de archivos.
 * @purpose_en ** Manages file operations for the OMEGA manifest editor, including restoring Omega packages, importing distilled JSON manifests, loading Omega projects, and handling file drops.
 * @refactorable ** true (contains too many state variables and UI parts)
 * @classification ** Custom Hook
 * @complexity ** Medium
 * @fingerprint exports:1,imports:8,sig:06osb0
 * @lastUpdated 2026-06-15T15:15:33.990Z
 */

import { useCallback, useEffect } from 'react';
import type { DocumentState } from '../types/document';
import { isDistilledManifest, upgradeDistilledToWork, UPGRADE_WARNING } from '@/omega-ui-core/utils/upgradeDistilled';
import { validateManifestSchema } from '@/omega-ui-core/utils/manifestValidator';
import { unpackageProject } from '@/services/projectPackager';
import { historyService } from '@/services/historyService';
import { inputSignalService, type VirtualSignal } from '@/services/inputSignalService';
import { toast } from '@/features/manifest-editor/utils/toast';

export const useWorkbenchFileOperations = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any
) => {

  const restoreOmegaPackage = useCallback(async (file: File) => {
    try {
      // ── Case 1: .json (potentially distilled manifest) ──
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          editor.addLog(`[ERROR] Invalid JSON file: ${file.name}`);
          return;
        }

        if (isDistilledManifest(parsed)) {
          editor.addLog(`[SYSTEM] Distilled manifest detected: ${file.name}. Upgrading to work format...`);
          editor.addLog(`[WARN] ${UPGRADE_WARNING}`);

          const upgraded = upgradeDistilledToWork(parsed);
          const docId = editor.activeId;
          editor.orchestrator.updateDocument(docId, { manifest: upgraded });
          editor.addLog(`[OK] Manifest upgraded: ${upgraded.metadata?.name} v${upgraded.metadata?.version}`);
          toast.success(`Manifest upgraded: ${upgraded.metadata?.name}`);
          return;
        }

        // Not distilled — validate schema before loading
        editor.addLog(`[INFO] Validating manifest schema: ${file.name}...`);
        const validation = validateManifestSchema(parsed);
        if (!validation.valid) {
          editor.addLog(`[ERROR] Invalid manifest structure:\n  - ${validation.errors.join('\n  - ')}`);
          editor.addLog('[INFO] Loading cancelled. The file does not match the OMEGA_Manifest schema.');
          return;
        }
        const docId = editor.activeId;
        editor.orchestrator.updateDocument(docId, { manifest: validation.manifest });
        editor.addLog(`[OK] Manifest loaded: ${validation.manifest.metadata?.name || 'Untitled'} v${validation.manifest.metadata?.version || '?'}`);
        toast.success(`Manifest loaded: ${validation.manifest.metadata?.name || 'Untitled'}`);
        return;
      }

      // ── Case 2: .omega (zip) ──
      editor.addLog(`[SYSTEM] Loading .omega project: ${file.name}...`);

      // 1. Unpack the .omega
      const pkg = await unpackageProject(file);

      // 2. Confirm with the user if there are unsaved changes
      const docs = editor.orchestrator.documentsById as Record<string, DocumentState>;
      const hasDirty = Object.values(docs).some(doc => doc.isDirty);
      if (hasDirty && !confirm('Load .omega project? Unsaved changes will be lost.')) {
        editor.addLog('[INFO] Load cancelled by user.');
        return;
      }

      // 3. Restore manifest
      const docId = editor.activeId;
      editor.orchestrator.updateDocument(docId, {
        manifest: pkg.manifest,
      });
      editor.addLog(`[OK] Manifest restored: ${pkg.manifest.metadata?.name || 'Untitled'} v${pkg.manifest.metadata?.version || '?'}`);
      toast.success(`Project loaded: ${pkg.manifest.metadata?.name || 'Untitled'}`);

      // 4. Restore assets (extraResources)
      if (pkg.assets.size > 0) {
        const restoredAssets: { name: string; data: ArrayBuffer; type: string }[] = [];
        for (const [name, buffer] of pkg.assets) {
          const mimeType = name.endsWith('.svg') ? 'image/svg+xml'
            : name.endsWith('.png') ? 'image/png'
            : name.endsWith('.jpg') || name.endsWith('.jpeg') ? 'image/jpeg'
            : 'application/octet-stream';
          restoredAssets.push({ name, data: buffer, type: mimeType });
        }
        editor.orchestrator.updateDocument(docId, {
          extraResources: restoredAssets,
        });
        editor.addLog(`[OK] Restored ${restoredAssets.length} assets from resources/.`);
      }

      // 5. Restore history (undo/redo)
      if (pkg.history.past.length > 0 || pkg.history.future.length > 0) {
        const { past, future } = pkg.history;
        historyService.restore({ past: past as import('@/features/manifest-editor/types/history').HistoryEntry[], future: future as import('@/features/manifest-editor/types/history').HistoryEntry[] });
        editor.addLog(`[OK] History restored: ${pkg.history.past.length} past, ${pkg.history.future.length} future entries.`);
      }

      // 6. Restore WASM if it exists
      if (pkg.wasmBuffer) {
        editor.orchestrator.updateDocument(docId, {
          wasmBuffer: pkg.wasmBuffer,
        });
        editor.addLog('[OK] WASM binary restored.');
      }

      // 7. Restore simulation state (virtual signals)
      const simConfig = (pkg.project.editorState as Record<string, unknown> | undefined)?.simulationConfig;
      if (simConfig && typeof simConfig === 'object' && !Array.isArray(simConfig)) {
        inputSignalService.deserializeState(simConfig as Record<string, VirtualSignal>);
        const signalCount = Object.keys(simConfig).length;
        editor.addLog(`[OK] Simulation state restored: ${signalCount} active signal${signalCount !== 1 ? 's' : ''}.`);
      }

      editor.addLog(`[SUCCESS] Project loaded: ${file.name}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      editor.addLog(`[ERROR] Failed to load project: ${message}`);
      toast.error(`Failed to load project: ${message}`);
    }
  }, [editor]);

  // ── Import Distilled .json via file picker ──
  const handleImportDistilledJson = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      editor.addLog(`[SYSTEM] Importing distilled manifest: ${file.name}...`);
      await restoreOmegaPackage(file);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
    input.remove();
  }, [restoreOmegaPackage, editor]);

  // ── Load .omega project via file picker ──
  const handleLoadOmegaProject = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.omega,.zip,.json';
    input.style.display = 'none';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      await restoreOmegaPackage(file);
      input.remove();
    };
    // Attach to DOM temporarily so Playwright e2e tests can intercept filechooser
    document.body.appendChild(input);
    input.click();
    input.remove();
  }, [restoreOmegaPackage]);

  // Expose handleLoadOmegaProject for use from MenuBar
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__omegaLoadProject = handleLoadOmegaProject;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__omegaLoadProject;
    };
  }, [handleLoadOmegaProject]);

  // ── File Drop Handler ──
  const handleFileDrop = useCallback(async (file: File) => {
    if (file.name.endsWith('.omega')) {
      editor.addLog(`[SYSTEM] Drop detected: ${file.name}`);
      await restoreOmegaPackage(file);
    } else if (file.name.endsWith('.json')) {
      editor.addLog(`[SYSTEM] Drop detected: ${file.name} (JSON manifest)`);
      await restoreOmegaPackage(file);
    } else {
      editor.addLog('[INFO] Drop ignored: no .omega or .json file detected.');
    }
  }, [restoreOmegaPackage, editor]);

  return {
    restoreOmegaPackage,
    handleImportDistilledJson,
    handleLoadOmegaProject,
    handleFileDrop,
  };
};
