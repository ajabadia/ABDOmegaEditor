'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ManifestEntity } from '@/omega-ui-core/types/manifest';
import { wasmRuntime } from '@/services/wasmRuntime';

/**
 * useRackSimulation (v7.2.3)
 * Handles the real-time simulation loop and container activity (heatmap) logic.
 */
export const useRackSimulation = (
  allElements: ManifestEntity[], 
  isLiveMode: boolean,
  pushParameterUpdate?: (id: string, value: number) => void
) => {
  const [runtimeValues, setRuntimeValues] = useState<Record<string, number>>({});
  const [activeContainers, setActiveContainers] = useState<Record<string, number>>({});
  const [activeInjectorPort, setActiveInjectorPort] = useState<string | null>(null);

  // 1. ACTIVITY DECAY (Heatmap)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveContainers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (next[id] > 0) {
            next[id] = Math.max(0, next[id] - 0.1);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // 2. REAL-TIME SIMULATION LOOP
  useEffect(() => {
    let rafId: number;
    const updateLoop = () => {
      if (isLiveMode) {
        setRuntimeValues(prev => {
          const next = { ...prev };
          allElements.forEach(entity => {
            if (entity.role === 'telemetry' || entity.role === 'stream') {
              const val = wasmRuntime.getTelemetry(entity.id);
              next[entity.id] = val;
              
              const containerId = entity.presentation?.container;
              if (containerId && val > 0.1) {
                setActiveContainers(prevContainers => ({
                  ...prevContainers,
                  [containerId]: Math.max(prevContainers[containerId] || 0, val)
                }));
              }
            }
          });
          return next;
        });
      }
      rafId = requestAnimationFrame(updateLoop);
    };
    rafId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isLiveMode, allElements]);

  // 3. PARAMETER UPDATES
  const updateValue = useCallback((id: string, val: number) => {
    const clampedVal = Math.max(0, Math.min(1, parseFloat(val.toFixed(4))));
    setRuntimeValues(prev => ({ ...prev, [id]: clampedVal }));
    
    if (pushParameterUpdate) {
      pushParameterUpdate(id, clampedVal);
    } else {
      wasmRuntime.setParameter(id, clampedVal);
    }

    const element = allElements.find(e => e.id === id);
    const containerId = element?.presentation?.container;
    if (containerId) {
      setActiveContainers(prev => ({ ...prev, [containerId]: 1.0 }));
    }
  }, [allElements, pushParameterUpdate]);

  return {
    runtimeValues,
    activeContainers,
    updateValue,
    activeInjectorPort,
    setActiveInjectorPort
  };
};
