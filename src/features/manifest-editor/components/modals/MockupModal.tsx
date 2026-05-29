import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import type { OMEGA_Manifest } from '@/types/manifest';
import type { AuditResult } from '@/services/auditService';

// Atomic Mockup Components
import { MockupHeader } from '../mockup/MockupHeader';
import { MockupViewport } from '../mockup/MockupViewport';
import { MockupFooter } from '../mockup/MockupFooter';
import { MockupLoading } from '../mockup/MockupLoading';

interface MockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: OMEGA_Manifest;
  audit: AuditResult;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
}

export default function MockupModal({ isOpen, onClose, manifest, audit, resolveAsset }: MockupModalProps) {
  const [status, setStatus] = useState<'idle' | 'rendering' | 'complete'>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasRendered = useRef(false);

  const hasCriticalErrors = audit.issues.some(i => (i.severity as string) === 'critical' || i.severity === 'error');

  React.useEffect(() => {
    if (isOpen && !hasRendered.current) {
      setTimeout(() => setStatus('rendering'), 0);
      const timer = setTimeout(() => setStatus('complete'), 1500);
      hasRendered.current = true;
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      hasRendered.current = false;
      setTimeout(() => setStatus('idle'), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeTab = manifest.ui?.layout?.activeTab || 'MAIN';
  const hp = manifest.metadata?.rack?.hp || 12;
  const isCompact = manifest?.metadata?.rack?.height_mode === 'compact';
  const width = hp * 15 * 1.5;
  const height = (isCompact ? 210 : 420) * 1.5;
  const skin = manifest.ui?.skin || 'industrial';

  const handleExport = async () => {
    if (!viewportRef.current) return;
    
    setIsExporting(true);
    try {
      // High Fidelity Capture (pixelRatio: 4 for 8K-like quality)
      const dataUrl = await toPng(viewportRef.current, {
        quality: 1.0,
        pixelRatio: 4,
        backgroundColor: '#050505',
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `OMEGA_${manifest.id || 'module'}_studio_render.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Render failure:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-12">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-6xl aspect-video bg-[#050505] border border-white/5 rounded-sm shadow-2xl overflow-hidden flex flex-col"
        >
          <MockupHeader 
            name={manifest.metadata?.name || 'Unnamed Module'} 
            activeTab={activeTab} 
            onClose={onClose} 
          />

          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_0%,#000_100%)]">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            {status === 'rendering' ? (
              <MockupLoading />
            ) : (
              <MockupViewport 
                manifest={manifest}
                resolveAsset={resolveAsset}
                width={width}
                height={height}
                skin={skin}
                viewportRef={viewportRef}
              />
            )}
          </div>

          <MockupFooter 
            onExport={handleExport} 
            isExporting={isExporting} 
            hasCriticalErrors={hasCriticalErrors}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
