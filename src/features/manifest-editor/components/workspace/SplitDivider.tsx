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
