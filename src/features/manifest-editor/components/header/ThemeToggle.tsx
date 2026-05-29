'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  uiTheme: 'dark' | 'light';
  setUiTheme: (theme: 'dark' | 'light') => void;
}

export default function ThemeToggle({ uiTheme, setUiTheme }: ThemeToggleProps) {
  return (
    <button 
      onClick={() => setUiTheme(uiTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 wb-surface border wb-outline rounded-sm hover:bg-primary/10 hover:border-primary/40 transition-all wb-text-muted hover:text-primary group"
      title={`Switch to ${uiTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {uiTheme === 'dark' ? (
        <Sun className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-3.5 h-3.5 group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
