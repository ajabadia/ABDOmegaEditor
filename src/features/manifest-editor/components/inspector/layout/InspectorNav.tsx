'use client';

import React from 'react';

interface InspectorSection {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface InspectorNavProps {
  sections: InspectorSection[];
  activeSection: string;
  setActiveSection: (id: string) => void;
}

export default function InspectorNav({ sections, activeSection, setActiveSection }: InspectorNavProps) {
  return (
    <nav className="flex border-b wb-outline bg-black/5 p-1 shrink-0">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          className={`flex-1 py-2 flex flex-col items-center gap-1 rounded-xs transition-all ${
            activeSection === section.id 
              ? 'wb-surface-hover wb-text' 
              : 'wb-text-muted hover:wb-text hover:wb-surface-hover/50'
          }`}
        >
          <section.icon className={`w-3.5 h-3.5 ${activeSection === section.id ? section.color : ''}`} />
          <span className="text-[7px] font-black uppercase tracking-tighter">{section.label}</span>
        </button>
      ))}
    </nav>
  );
}
