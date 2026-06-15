/**
 * ToolbarIconButton — Reusable icon toggle button for the OMEGA Workbench footer center toolbar.
 * Eliminates the 6× duplication of button markup in WorkbenchFooter (Orbital, Rack, Source,
 * History, Split View, Mini Map).
 */

import React from 'react';

interface ToolbarIconButtonProps {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}

const ToolbarIconButton: React.FC<ToolbarIconButtonProps> = ({
  icon,
  active = false,
  onClick,
  title,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center w-5 h-4 rounded-xs transition-all ${
      active
        ? 'bg-primary/20 text-primary border border-primary/20'
        : 'wb-text-muted hover:wb-text'
    }`}
    title={title}
  >
    {icon}
  </button>
);

export default ToolbarIconButton;
