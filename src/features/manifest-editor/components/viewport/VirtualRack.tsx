'use client';

import React, { useRef } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { AuditResult } from '@/services/auditService';

// Modular Components & Hooks
import { SignalInjector } from '../rack/SignalInjector';
import { RackHUD } from '../rack/RackHUD';
import { useRackSimulation } from '@/features/manifest-editor/hooks/rack/useRackSimulation';
import { useRackLayout } from '@/features/manifest-editor/hooks/rack/useRackLayout';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import { UniversalRenderer } from '@/omega-ui-core/renderers/UniversalRenderer';
import { manifestToTree } from '@/omega-ui-core/uca/ucaBridge';
import { InjectionPreviewOverlay } from './InjectionPreviewOverlay';
 
interface VirtualRackProps {
  manifest: OMEGA_Manifest;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<ManifestEntity>) => void;
  zoom?: number;
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  audit: AuditResult;
  resolveAsset?: ((ref: string | undefined) => string | undefined) | undefined;
  pushParameterUpdate?: ((id: string, value: number) => void) | undefined;
  previewManifest?: OMEGA_Manifest | null;
  multiSelectedIds: string[];
  onSelectMultiple: (ids: string[]) => void;
}

/**
 * VirtualRack (v7.2.3) - Aseptic Orchestrator
 * High-fidelity modular instrument viewport.
 */
import { useDesignTokens } from '@/features/manifest-editor/hooks/useDesignTokens';

export default function VirtualRack({ 
  manifest, 
  selectedItemId, 
  onSelectItem, 
  onUpdateItem, 
  zoom = 1.0, 
  isLiveMode, 
  setIsLiveMode, 
  audit,
  resolveAsset,
  pushParameterUpdate,
  previewManifest,
  multiSelectedIds,
  onSelectMultiple
}: VirtualRackProps) {
  const rackRef = useRef<HTMLDivElement>(null);
  const skin = manifest.ui?.skin || 'industrial';
  const { allVars } = useDesignTokens(manifest);
  const [activePlane, setActivePlane] = React.useState('MAIN');
  
  // ASEPTIC LAYOUT & SIMULATION
  const { width, height, allElements, visibleElements, containers } = useRackLayout(manifest);
  const { runtimeValues, activeContainers, activeInjectorPort, setActiveInjectorPort } = useRackSimulation(allElements, isLiveMode, pushParameterUpdate);

  // RACK MASTER ENTITY (Era 7.2.3 Architectural Host)
  const rackNode: OmegaNode = {
    id: 'RACK_MASTER',
    kind: 'rack',
    role: 'infrastructure',
    cellRef: 'rack',
    layout: {
      pos: { x: 0, y: 0 },
      size: { width: manifest.ui?.dimensions?.width || 800, height: manifest.ui?.dimensions?.height || 400 }
    },
    meta: {
      label: 'Master Rack Chassis'
    },
    style: {
      ...((manifest.ui as Record<string, unknown>)?.style || {}),
      attachments: (manifest.ui as Record<string, unknown>)?.attachments || []
    }
  };

  const rackHTML = CellRenderer.renderCellHTML(rackNode, {
    skin,
    zoom: 1.0,
    runtimeValue: 0,
    steps: 100,
    manifest,
    resolveAsset
  });

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center gap-8 p-12 relative overflow-hidden" 
      onClick={() => onSelectItem(null)}
      style={allVars as React.CSSProperties}
    >
      <RackHUD 
        isLiveMode={isLiveMode} 
        setIsLiveMode={setIsLiveMode} 
        activeTab={activePlane} 
        setActiveTab={setActivePlane} 
        allElements={allElements} 
        planes={manifest.ui.layout?.planes || ['MAIN']}
      />
 
      {/* RACK FRAME (UNIFIED ENGINE) */}
      <div 
        ref={rackRef} 
        className={`relative transition-all duration-700 ${isLiveMode ? 'shadow-[0_0_120px_rgba(0,0,0,1)]' : ''}`}
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          boxShadow: isLiveMode ? '0 0 120px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => { e.stopPropagation(); onSelectItem(null); }}
      >
        {/* The Master Chassis HTML */}
        <div 
          className="absolute inset-0 pointer-events-none"
          dangerouslySetInnerHTML={{ __html: rackHTML }}
        />

        {/* UCA NATIVE ENGINE (Recursive Tree) */}
        <div className="absolute inset-0 uca-native-layer">
          <UniversalRenderer 
            node={manifest.ui.tree || manifestToTree(manifest, manifest.ui?.tree)} 
            manifest={manifest} 
            catalog={manifest.moduleTemplates || {}}
            resolveAsset={resolveAsset}
            debugContext={{
              enabled: manifest.ui?.ucaDebug?.enabled || false,
              showLabels: manifest.ui?.ucaDebug?.showLabels !== false,
              hideDecorative: manifest.ui?.ucaDebug?.hideDecorative || false,
              showCADOverlay: manifest.ui?.ucaDebug?.showCADOverlay || false,
              selectedId: selectedItemId,
              multiSelectedIds: multiSelectedIds,
              onSelect: onSelectItem,
              onSelectMultiple: onSelectMultiple,
              onUpdateNode: onUpdateItem
            }}
          />
        </div>

        {/* BLUEPRINT STUDIO GHOST LAYER (Phase 11) */}
        {previewManifest && (
          <InjectionPreviewOverlay 
            previewManifest={previewManifest} 
            resolveAsset={resolveAsset} 
          />
        )}

        {activeInjectorPort && <SignalInjector portId={activeInjectorPort} onClose={() => setActiveInjectorPort(null)} />}
      </div>
    </div>
  );
}
