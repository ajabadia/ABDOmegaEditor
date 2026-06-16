'use client';

/**
 * @purpose Gestiona un contenedor de trabajobench y maneja el estado para modales de auditoría y editor de celda.
 * @purpose_en Renders a main page for the OMEGA manifest editor with a workbench container and manages state for audit and cell editor modals.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1go7wzv
 * @lastUpdated 2026-06-15T20:50:08.955Z
 */

import { Suspense, useState } from 'react';
import WorkbenchContainer from '@/features/manifest-editor/components/WorkbenchContainer';

export default function Home() {
  // Page level modal orchestration (Cell Editor)
  const [isCellEditorOpen, setIsCellEditorOpen] = useState(false);

  return (
    <main id="main-content" className="h-screen w-screen overflow-hidden bg-black">
      <Suspense fallback={<div className="h-full w-full bg-black flex items-center justify-center text-primary font-mono text-[10px] animate-pulse">INITIALIZING OMEGA CORE...</div>}>
        <WorkbenchContainer 
          onOpenCellEditor={() => setIsCellEditorOpen(true)}
          isCellEditorOpen={isCellEditorOpen}
          setIsCellEditorOpen={setIsCellEditorOpen}
        />
      </Suspense>
    </main>
  );
}
