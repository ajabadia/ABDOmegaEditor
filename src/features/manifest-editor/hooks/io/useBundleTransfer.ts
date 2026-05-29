import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import yaml from 'js-yaml';
import type { OMEGA_Manifest, OmegaNode, CellTemplate } from '@/omega-ui-core/types/manifest';
import type { ValidationIssue } from '@/types/validation';
import { purgeUnusedStyles, getUsedResources } from '@/features/manifest-editor/utils/governanceUtils';
import { congealSnapshot } from '@/omega-ui-core/uca/ucaBridge';

export const useBundleTransfer = (
  manifest: OMEGA_Manifest,
  setManifest: Dispatch<SetStateAction<OMEGA_Manifest>>,
  wasmBuffer: ArrayBuffer | null,
  extraResources: { name: string, data: ArrayBuffer, type: string }[],
  setExtraResources: Dispatch<SetStateAction<{ name: string, data: ArrayBuffer, type: string }[]>>,
  addLog: (msg: string) => void,
  issues: ValidationIssue[],
  handleWasmUpload: (file: File) => Promise<void>,
  handleContractUpload: (file: File) => Promise<void>,
  handleManifestUpload: (file: File) => Promise<void>,
  captureStableSnapshot: () => void
) => {

  const sanitizeSVG = (content: string): string => {
    // Saneamiento básico industrial Era 7.2.3
    return content
      .replace(/<metadata>[\s\S]*?<\/metadata>/gi, '') // Eliminar metadatos de editores
      .replace(/<!--[\s\S]*?-->/g, '')               // Eliminar comentarios
      .replace(/sodipodi:[\w-]+="[^"]*"/g, '')        // Eliminar basura de Inkscape
      .replace(/inkscape:[\w-]+="[^"]*"/g, '');
  };

  /**
   * processSnapshots (Phase 5.1)
   * Recursively congeals snapshots for all nodes referencing templates.
   */
  const processSnapshots = useCallback((rootNode: OmegaNode, templates: Record<string, CellTemplate>) => {
    const internalProcess = (node: OmegaNode) => {
      if (node.cellRef && templates[node.cellRef]) {
        addLog(`[SYSTEM] Congealing snapshot for node: ${node.id} (Template: ${node.cellRef})`);
        node.snapshot = congealSnapshot(node, templates[node.cellRef] as CellTemplate);
      }
      
      if (node.children) {
        node.children.forEach(child => internalProcess(child));
      }
    };

    internalProcess(rootNode);
  }, [addLog]);

  const handleResourceUpload = useCallback(async (files: FileList | File[]) => {
    let lastAssetId = '';
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      try {
        let buffer: ArrayBuffer;
        
        // Industrial Renaming & Path Preservation (Era 7.2.3)
        const isLogo = file.name.toLowerCase().includes('logo') || file.name.toLowerCase().includes('icon');
        // Prefer webkitRelativePath for folder-drop support
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relativePath = (file as any).webkitRelativePath || file.name;
        const finalName = isLogo && !relativePath.includes('/') ? 'module_logo.svg' : relativePath;
        const assetId = `resources/${finalName}`;
        lastAssetId = assetId;

        if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
          const text = await file.text();
          const sanitized = sanitizeSVG(text);
          buffer = new TextEncoder().encode(sanitized).buffer;
        } else {
          buffer = await file.arrayBuffer();
        }

        addLog(`[SYSTEM] Processing Resource: ${file.name} -> ${finalName}`);

        setExtraResources(prev => [
          ...prev.filter(r => r.name !== finalName),
          { name: finalName, data: buffer, type: file.type }
        ]);

        // Auto-Register in manifest for immediate selector visibility
        setManifest((prev: OMEGA_Manifest) => ({
          ...prev,
          size: { width: 48, height: 48 },
          presentation: {
            ...prev.resources,
            metadata: {
              name: prev.metadata?.name || 'Imported Module',
              version: prev.metadata?.version || '0.1.0',
              family: prev.metadata?.family || 'utility',
              author: prev.metadata?.author,
              tags: prev.metadata?.tags || [],
              rack: prev.metadata?.rack
            },
            assets: [
              ...(prev.resources?.assets?.filter((a: { id: string }) => a.id !== assetId) || []),
              { 
                id: assetId, 
                url: assetId, 
                type: (file.type.includes('svg') ? 'svg' : 'image') as 'svg' | 'image' 
              }
            ]
          }
        }));
        
        addLog(`[OK] Resource '${finalName}' stored and registered in manifest.`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        addLog(`[CRITICAL] Resource Ingestion Failed: ${message}`);
      }
    }
    return lastAssetId;
  }, [addLog, setExtraResources, setManifest]);

  const exportOmegaPack = useCallback(async () => {
    try {
      addLog(`[SYSTEM] Preparing OmegaPack (.zip)...`);
      
      if (!(window as unknown as { JSZip: unknown }).JSZip) {
        addLog(`[SYSTEM] Loading JSZip dependency...`);
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      interface JSZipInstance {
        file: (name: string, data: string | ArrayBuffer | Uint8Array | Blob) => JSZipInstance;
        folder: (name: string) => JSZipInstance;
        generateAsync: (options: { type: 'blob' }) => Promise<Blob>;
      }
      const JSZip = (window as unknown as { JSZip: new () => JSZipInstance }).JSZip;
      const zip = new JSZip();
      
      const asepticManifest = purgeUnusedStyles(manifest);
      
      // [Phase 5.1] Automated Portability Audit: Congeal Snapshots
      if (asepticManifest.ui?.tree) {
        processSnapshots(asepticManifest.ui.tree, (asepticManifest.moduleTemplates as Record<string, CellTemplate>) || {});
      }

      const yamlContent = yaml.dump(asepticManifest, { indent: 2, lineWidth: -1 });
      zip.file(`${manifest.id}.acemm`, yamlContent);
      
      if (issues.length === 0 || confirm("Audit report will be included. Proceed?")) {
        const contractContent = JSON.stringify(asepticManifest, null, 2);
        zip.file(`${manifest.id}.contract.json`, contractContent);
      }

      const auditReport = `# OMEGA Audit Report\n\nModule ID: ${manifest.id}\nStatus: ${issues.length === 0 ? 'CERTIFIED' : 'DEGRADED'}\nIssues: ${issues.length}\nTimestamp: ${new Date().toISOString()}\n`;
      zip.file(`AUDIT_REPORT.md`, auditReport);

      const { usedAssets } = getUsedResources(asepticManifest);

      if (wasmBuffer) {
        zip.file(`${manifest.id}.wasm`, wasmBuffer);
        addLog(`[SYSTEM] WASM Binary included in pack.`);
      }

      if (extraResources.length > 0) {
        const resFolder = zip.folder("resources");
        let includedCount = 0;
        
        for (const res of extraResources) {
          const resPath = `resources/${res.name}`;
          
          // Only include if actually referenced in the manifest
          if (usedAssets.has(resPath) || res.name === 'module_logo.svg') {
            if (res.name === 'module_logo.svg') {
              zip.file(res.name, res.data); // Root for discovery
              addLog(`[SYSTEM] Identity Logo placed in package root.`);
            } else {
              resFolder.file(res.name, res.data);
            }
            includedCount++;
          }
        }
        addLog(`[SYSTEM] Resources: Included ${includedCount} of ${extraResources.length} total assets.`);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manifest.id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      addLog(`[SUCCESS] OmegaPack exported: ${manifest.id}.zip`);
      captureStableSnapshot();
    } catch (err) {
      addLog(`[ERROR] Failed to generate OmegaPack: ${err}`);
    }
  }, [manifest, issues, wasmBuffer, extraResources, addLog, processSnapshots, captureStableSnapshot]);

  const handleBulkUpload = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;
    
    addLog(`[SYSTEM] Batch Ingestion: Processing ${fileList.length} entities...`);

    const manifests = fileList.filter(f => f.name.endsWith('.acemm'));
    const wasms = fileList.filter(f => f.name.endsWith('.wasm') || f.name.endsWith('.ace'));
    const contracts = fileList.filter(f => f.name.endsWith('.json') && !f.name.endsWith('.acemm'));
    const others = fileList.filter(f => !f.name.endsWith('.acemm') && !f.name.endsWith('.wasm') && !f.name.endsWith('.json'));

    try {
      if (contracts.length > 0) {
        addLog(`[TRACE] Ingesting contract: ${contracts[0].name}`);
        await handleContractUpload(contracts[0]);
      }
      if (wasms.length > 0) {
        addLog(`[TRACE] Ingesting binary: ${wasms[0].name}`);
        await handleWasmUpload(wasms[0]);
      }
      if (manifests.length > 0) {
        addLog(`[TRACE] Ingesting ${manifests.length} manifests...`);
        for (const m of manifests) {
          await handleManifestUpload(m);
        }
      }

      for (const res of others) {
        addLog(`[TRACE] Ingesting resource: ${res.name}`);
        await handleResourceUpload([res]);
      }

      addLog(`[SUCCESS] Industrial Batch Ingestion finalized.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`[CRITICAL] Batch Ingestion Aborted: ${message}`);
    }
  }, [handleContractUpload, handleWasmUpload, handleManifestUpload, handleResourceUpload, addLog]);

  const handleRemoveResource = useCallback((name: string) => {
    setExtraResources(prev => prev.filter(r => r.name !== name));
    addLog(`[SYSTEM] Resource removed: ${name}`);
  }, [setExtraResources, addLog]);

  return {
    exportOmegaPack,
    handleBulkUpload,
    handleResourceUpload,
    handleRemoveResource
  };
};
