'use client';

import type { OmegaContract } from '@/services/wasmLoader';
import type { OMEGA_Manifest } from '@/types/manifest';
import ModuleHub from './ModuleHub';

interface WorkbenchSidebarProps {
  manifest: OMEGA_Manifest;
  contract: OmegaContract | null;
  onDeploy: () => Promise<void>;
}

export function WorkbenchSidebar({ manifest, contract, onDeploy }: WorkbenchSidebarProps) {
  const triggerUpload = (id: string) => document.getElementById(id)?.click();

  return (
    <aside className="w-80 border-r wb-outline wb-surface flex flex-col min-w-[320px] transition-colors duration-500">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        <ModuleHub 
          manifest={manifest} 
          contract={contract} 
          triggerUpload={triggerUpload} 
          onDeploy={onDeploy} 
        />
      </div>
    </aside>
  );
}
