'use client';
 
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
 
import type { OMEGA_Manifest, OMEGA_Contract, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/services/wasmLoader';
import type { AuditResult } from '@/services/auditService';
 
import { CenterModuleNode } from '../orbital/CenterModuleNode';
import { OrbitalNode } from '../orbital/OrbitalNode';
  
interface NodeCanvasProps {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  selectedItemId: string | null;
  multiSelectedIds: string[];
  onSelectItem: (id: string | null) => void;
  onSelectMultiple: (ids: string[]) => void;
  audit: AuditResult;
}
 
/**
 * NodeCanvas (Era 7.2.3 - Orbital Mode)
 * Driven by the Canonical UCA Tree.
 */
export default function NodeCanvas({ manifest, contract, selectedItemId, multiSelectedIds, onSelectItem, onSelectMultiple, audit }: NodeCanvasProps) {
  const isV7 = !!manifest?.schemaVersion?.startsWith('7');
  
  // FLATTEN TREE FOR ORBITAL LAYOUT
  const items = useMemo(() => {
    const tree = manifest.ui?.tree;
    if (!tree) return [];
    
    const entities: OmegaNode[] = [];
    const traverse = (node: OmegaNode) => {
      if (node.kind === 'cell') {
        entities.push(node);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    traverse(tree);
    return entities;
  }, [manifest.ui?.tree]);
  
  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden" onClick={() => onSelectItem(null)}>
      {/* BACKGROUND GRID */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, var(--color-primary) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />
 
      <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* CENTER NODE (WASM/MODULE) */}
        <CenterModuleNode manifest={manifest} contract={contract} onSelectItem={onSelectItem} />
 
        {/* PARAMETERS NODES (ORBITAL) */}
        <AnimatePresence>
          {items.map((item, index) => (
            <OrbitalNode 
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              manifest={manifest}
              contract={contract}
              selectedItemId={selectedItemId}
              multiSelectedIds={multiSelectedIds}
              onSelectItem={onSelectItem}
              onSelectMultiple={onSelectMultiple}
              audit={audit}
              isV7={isV7}
            />
          ))}
        </AnimatePresence>
 
        {/* ORBITAL RINGS */}
        <div className="absolute inset-[-180px] rounded-full border border-outline/5 pointer-events-none" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[-185px] rounded-full border border-primary/5 border-dashed pointer-events-none"
        />
      </div>
 
      <div className="absolute bottom-8 left-8 text-[9px] font-mono wb-text-muted uppercase tracking-widest leading-relaxed">
        Engine: OMEGA v7.2.3 (Sovereign)<br />
        Mode: Orbital Hub<br />
        Status: {items.length} Canonical Elements Online
      </div>
    </div>
  );
}
