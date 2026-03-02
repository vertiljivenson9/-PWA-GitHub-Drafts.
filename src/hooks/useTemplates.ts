import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Template } from '@/types';
import { db } from '@/db';

interface UseTemplatesReturn {
  templates: Template[];
  isLoading: boolean;
  error: string | null;
  createTemplate: (template: Omit<Template, 'id'>) => Promise<Template>;
  updateTemplate: (template: Template) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplate: (id: string) => Promise<Template | undefined>;
  getTemplatesByType: (type: 'issue' | 'pr') => Template[];
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const allTemplates = await db.getAllTemplates();
      setTemplates(allTemplates);
      setError(null);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const createTemplate = useCallback(async (
    templateData: Omit<Template, 'id'>
  ): Promise<Template> => {
    const template: Template = {
      ...templateData,
      id: uuidv4(),
    };

    await db.saveTemplate(template);
    await loadTemplates();
    return template;
  }, [loadTemplates]);

  const updateTemplate = useCallback(async (template: Template): Promise<void> => {
    await db.saveTemplate(template);
    await loadTemplates();
  }, [loadTemplates]);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    // Don't delete default templates
    const template = await db.getTemplate(id);
    if (template?.isDefault) {
      throw new Error('Cannot delete default templates');
    }
    
    await db.deleteTemplate(id);
    await loadTemplates();
  }, [loadTemplates]);

  const getTemplate = useCallback(async (id: string): Promise<Template | undefined> => {
    return db.getTemplate(id);
  }, []);

  const getTemplatesByType = useCallback((type: 'issue' | 'pr'): Template[] => {
    return templates.filter(t => t.type === type);
  }, [templates]);

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByType,
  };
}
