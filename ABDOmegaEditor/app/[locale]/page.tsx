'use client';

import { Suspense, useState } from 'react';
import WorkbenchContainer from '@/features/manifest-editor/components/WorkbenchContainer';

export default function Home() {
  // Page level modal orchestration (Governance/Audit/Cell)
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isCellEditorOpen, setIsCellEditorOpen] = useState(false);

  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <Suspense fallback={<div className="h-full w-full bg-black flex items-center justify-center text-primary font-mono text-[10px] animate-pulse">INITIALIZING OMEGA CORE...</div>}>
        <WorkbenchContainer 
          onOpenCellEditor={() => setIsCellEditorOpen(true)}
          onOpenAudit={() => setIsAuditOpen(true)}
          
          isAuditOpen={isAuditOpen}
          setIsAuditOpen={setIsAuditOpen}
          isCellEditorOpen={isCellEditorOpen}
          setIsCellEditorOpen={setIsCellEditorOpen}
        />
      </Suspense>
    </main>
  );
}
