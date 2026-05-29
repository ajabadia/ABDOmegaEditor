'use client';

import React from 'react';
import AttachmentTypeAnchor from './attachments/AttachmentTypeAnchor';
import AttachmentLogicFields from './attachments/AttachmentLogicFields';
import AttachmentPrecisionOffsets from './attachments/AttachmentPrecisionOffsets';
import IndustrialGovernanceConsole from './shared/IndustrialGovernanceConsole';

import type { Attachment, OMEGA_Manifest } from '@/types/manifest';

interface AttachmentItemProps {
  att: Attachment;
  manifest: OMEGA_Manifest;
  hostType: string;
  availableBinds: string[];
  onUpdate: (updates: Partial<Attachment>) => void;
  onOpenConfig?: (() => void) | undefined;
}

export default function AttachmentItem({ att, manifest, hostType, availableBinds, onUpdate, onOpenConfig }: AttachmentItemProps) {
  const isCore = att.isCore === true;

  return (
    <div className="space-y-4">
      <AttachmentTypeAnchor 
        type={att.type} 
        hostType={hostType}
        position={(att.position as 'top' | 'bottom' | 'left' | 'right' | 'center') || 'center'} 
        isCore={isCore} 
        onUpdate={onUpdate} 
      />

      <div className="grid grid-cols-1 gap-4">
        <AttachmentLogicFields 
          att={att} 
          availableBinds={availableBinds} 
          onUpdate={onUpdate} 
        />
        
        <div className="border-t border-outline/10 pt-4">
          <IndustrialGovernanceConsole 
            type={att.type}
            values={att.style || {}}
            manifest={manifest}
            onUpdate={(updates) => onUpdate({ style: { ...(att.style || {}), ...updates } })}
            onOpenConfig={onOpenConfig}
            title={`${att.type.toUpperCase()} Aesthetic Governance`}
          />
        </div>
      </div>

      <AttachmentPrecisionOffsets 
        offsetX={att.offsetX} 
        offsetY={att.offsetY} 
        onUpdate={onUpdate} 
      />
    </div>
  );
}
