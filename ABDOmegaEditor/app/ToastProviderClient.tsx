'use client';

/**
 * @purpose Client wrapper for ToastProvider so it can be used from the server-side layout.tsx.
 * @fingerprint exports:1
 */

import { ToastProvider } from '@/features/manifest-editor/components/ToastContainer';
import type { ReactNode } from 'react';

export default function ToastProviderClient({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
