import { useState, useEffect, useMemo, useCallback } from 'react';
import type { OMEGA_Manifest, OMEGA_Asset } from '@/omega-ui-core/types/manifest';

/**
 * useAssetRegistry (Era 7.2.3)
 * Centralizes the retrieval and filtering of industrial assets (Manifest & Libraries).
 */
export function useAssetRegistry(manifest: OMEGA_Manifest, mode: 'statics' | 'sequences' = 'statics') {
  const [library, setLibrary] = useState<OMEGA_Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const assets = useMemo(() => manifest.resources?.assets || [], [manifest.resources?.assets]);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        setIsLoading(true);
        const registryPath = mode === 'sequences' 
          ? '/assets/elements/sequences/sequences-registry.json'
          : '/assets/elements/statics/statics-registry.json';
          
        const res = await fetch(registryPath);
        const data = await res.json();
        setLibrary(data[mode] || []);
      } catch (err) {
        console.error(`Error loading ${mode} library:`, err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLibrary();
  }, [mode]);

  const resolveAsset = useCallback((id: string | undefined) => {
    if (!id) return undefined;
    const asset = assets.find(a => a.id === id);
    return asset?.url || id;
  }, [assets]);

  const getSequences = () => assets.filter(a => (a.frames && a.frames > 1) || a.id.includes('sequences'));
  const getStatics = () => assets.filter(a => !(a.frames && a.frames > 1) && !a.id.includes('sequences'));

  return {
    assets,
    library,
    isLoading,
    resolveAsset,
    getSequences,
    getStatics
  };
}
