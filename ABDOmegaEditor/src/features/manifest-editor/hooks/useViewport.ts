import { useState, useCallback } from 'react';

/**
 * useViewport (v7.2.3)
 * Manages pan and zoom state for the manifest editor canvas/rack.
 */
export const useViewport = (initialState?: { zoom: number; offsetX: number; offsetY: number }) => {
  const [zoom, setZoom] = useState(initialState?.zoom ?? 1.0);
  const [pan, setPan] = useState({ x: initialState?.offsetX ?? 0, y: initialState?.offsetY ?? 0 });

  // Sync state when initialState changes (e.g. tab switch)
  const [prevInitial, setPrevInitial] = useState(initialState);
  if (initialState?.zoom !== prevInitial?.zoom || 
      initialState?.offsetX !== prevInitial?.offsetX || 
      initialState?.offsetY !== prevInitial?.offsetY) {
    setZoom(initialState?.zoom ?? 1.0);
    setPan({ x: initialState?.offsetX ?? 0, y: initialState?.offsetY ?? 0 });
    setPrevInitial(initialState);
  }

  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(0.2, Math.min(3, prev + delta)));
  }, []);

  const handlePan = useCallback((dx: number, dy: number) => {
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleResetViewport = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitViewport = useCallback((viewMode: string) => {
    if (viewMode === 'rack') {
      setZoom(0.85);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, []);

  return {
    zoom,
    pan,
    setZoom,
    setPan,
    handleZoom,
    handlePan,
    handleResetViewport,
    handleFitViewport
  };
};
