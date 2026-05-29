'use client';

import { useEffect, useState, useRef } from 'react';

interface WatchdogMessage {
  filename: string;
  content: string;
  timestamp: string;
}

export const useWatchdog = (onUpdate: (content: string) => void) => {
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (eventSource) eventSource.close();
      
      // Use 127.0.0.1 to bypass potential IPv6/DNS resolution issues on Windows
      eventSource = new EventSource('http://127.0.0.1:3001/events');

      eventSource.onopen = () => {
        console.log('[OMEGA WATCHDOG] Industrial Sync Established (127.0.0.1:3001)');
        setStatus('connected');
      };

      eventSource.onmessage = (event) => {
        if (event.data === ': ping') return;
        try {
          const data: WatchdogMessage = JSON.parse(event.data);
          console.log(`[OMEGA WATCHDOG] Atomic update detected: ${data.filename}`);
          onUpdateRef.current(data.content);
          setLastUpdate(new Date().toLocaleTimeString());
        } catch (err) {
          console.error('[OMEGA WATCHDOG] Telemetry parse error:', err);
        }
      };

      eventSource.onerror = () => {
        setStatus('error');
        if (eventSource) eventSource.close();
        
        // Log only if not intentionally closed
        console.warn('[OMEGA WATCHDOG] Connection lost. Attempting industrial recovery in 3s...');
        retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return { status, lastUpdate };
};
