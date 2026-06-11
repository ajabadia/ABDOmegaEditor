import React, { useCallback } from 'react';

interface SplitDividerProps {
  onDrag: (delta: number) => void;
}

export const SplitDivider = React.memo(({ onDrag }: SplitDividerProps) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const totalWidth = window.innerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      onDrag(delta / totalWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDrag]);

  return (
    <div 
      onMouseDown={handleMouseDown}
      className="w-1 bg-white/5 hover:bg-primary/40 cursor-col-resize transition-colors duration-200 z-10"
    />
  );
});

SplitDivider.displayName = 'SplitDivider';

export const HorizontalSplitDivider = React.memo(({ onDrag }: { onDrag: (delta: number) => void }) => {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const totalHeight = window.innerHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      onDrag(delta / totalHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDrag]);

  return (
    <div 
      onMouseDown={handleMouseDown}
      className="h-1.5 bg-black/40 hover:bg-primary/40 border-t border-b border-white/5 cursor-row-resize transition-colors duration-200 z-10"
    />
  );
});

HorizontalSplitDivider.displayName = 'HorizontalSplitDivider';
