'use client';

import React, { useCallback } from 'react';

interface HorizontalSplitDividerProps {
  onDrag: (delta: number) => void;
  onDragEnd?: (() => void) | undefined;
}

export const HorizontalSplitDivider = React.memo(({ onDrag, onDragEnd }: HorizontalSplitDividerProps) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const totalHeight = window.innerHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      onDrag(delta / totalHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (onDragEnd) onDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDrag, onDragEnd]);

  return (
    <div 
      onMouseDown={handleMouseDown}
      className="h-3 w-full bg-transparent hover:bg-amber-500/10 cursor-row-resize transition-all duration-200 z-50 flex items-center justify-center group relative"
    >
       <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/5 group-hover:bg-amber-500/30 transition-colors" />
       <div className="w-8 h-[2px] bg-white/10 group-hover:bg-amber-500/60 z-10 transition-colors" />
    </div>
  );
});

HorizontalSplitDivider.displayName = 'HorizontalSplitDivider';
