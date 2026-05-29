'use client';

import React from 'react';
import LogicAssetsSection from '../hub/LogicAssetsSection';

import type { OMEGA_Manifest } from '@/types/manifest';
import type { OmegaContract } from '@/services/wasmLoader';

interface ModuleHubProps {
  manifest: OMEGA_Manifest;
  contract: OmegaContract | null;
  triggerUpload: (id: string) => void;
  onDeploy: () => void | Promise<void>;
}

export default function ModuleHub({ manifest, contract, triggerUpload }: ModuleHubProps) {
  return (
    <div className="flex flex-col gap-8 h-full overflow-y-auto custom-scrollbar pr-2">
      <LogicAssetsSection 
        manifest={manifest} 
        contract={contract} 
        triggerUpload={triggerUpload} 
      />
    </div>
  );
}
