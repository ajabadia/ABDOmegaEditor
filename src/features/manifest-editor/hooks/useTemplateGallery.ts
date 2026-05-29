'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ModuleTemplate } from '@/omega-ui-core/types/manifest';

import { INDUSTRIAL_TEMPLATES } from '../constants/templates';

/**
 * useTemplateGallery (Phase 5.4)
 * Manages discovery and selection of UCA blueprints.
 */
export const useTemplateGallery = (
  onSelect: (template: ModuleTemplate) => void
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const templates = useMemo<ModuleTemplate[]>(() => INDUSTRIAL_TEMPLATES, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (t.family || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !activeCategory || t.family === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    const set = new Set(templates.map(t => t.family));
    return Array.from(set);
  }, [templates]);

  const toggleGallery = useCallback(() => setIsOpen(prev => !prev), []);

  const handleSelect = useCallback((template: ModuleTemplate) => {
    onSelect(template);
    setIsOpen(false);
  }, [onSelect]);

  return {
    isOpen,
    setIsOpen,
    toggleGallery,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    templates: filteredTemplates,
    categories,
    handleSelect
  };
};
