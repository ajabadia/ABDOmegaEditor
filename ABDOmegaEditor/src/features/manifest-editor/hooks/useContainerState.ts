'use client';

import { useState } from 'react';

export const useContainerState = () => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isExpanded = (id: string) => expandedIds[id] ?? true;

  return { toggleExpand, isExpanded };
};
