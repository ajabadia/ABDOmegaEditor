/**
 * ModalActionButton — Reusable secondary action button for OMEGA modal footers.
 * Eliminates the 7× duplication of the pattern:
 *   <button onClick={fn}
 *     className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted
 *       hover:wb-text hover:bg-white/5 text-[9px] font-black uppercase
 *       tracking-widest transition-all duration-200">
 *     Label
 *   </button>
 */

import type { ReactNode } from 'react';

interface ModalActionButtonProps {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export default function ModalActionButton({ onClick, children, disabled }: ModalActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-2.5 rounded-xs border wb-outline wb-text-muted hover:wb-text hover:bg-white/5 text-[9px] font-black uppercase tracking-widest transition-all duration-200"
    >
      {children}
    </button>
  );
}
