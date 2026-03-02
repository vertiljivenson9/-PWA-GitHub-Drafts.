import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Draft, DraftType, DraftStatus } from '@/types';
import { db } from '@/db';

interface UseDraftsReturn {
  drafts: Draft[];
  isLoading: boolean;
  error: string | null;
  createDraft: (type: DraftType, repo?: string) => Promise<Draft>;
  updateDraft: (draft: Draft) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  getDraft: (id: string) => Promise<Draft | undefined>;
  applyTemplate: (draft: Draft, templateId: string) => Promise<Draft>;
  duplicateDraft: (draft: Draft) => Promise<Draft>;
  searchDrafts: (query: string, filters?: { type?: DraftType; status?: DraftStatus }) => Draft[];
  refreshDrafts: () => Promise<void>;
}

export function useDrafts(): UseDraftsReturn {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    try {
      setIsLoading(true);
      const allDrafts = await db.getAllDrafts();
      // Sort by updatedAt desc
      allDrafts.sort((a, b) => b.updatedAt - a.updatedAt);
      setDrafts(allDrafts);
      setError(null);
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError('Failed to load drafts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const createDraft = useCallback(async (type: DraftType, repo?: string): Promise<Draft> => {
    const prefs = await db.getPreferences();
    
    const draft: Draft = {
      id: uuidv4(),
      type,
      repo: repo || prefs.lastRepo || '',
      title: '',
      body: '',
      labels: [...prefs.lastUsedLabels],
      assignees: [],
      attachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'draft',
    };

    await db.saveDraft(draft);
    await loadDrafts();
    return draft;
  }, [loadDrafts]);

  const updateDraft = useCallback(async (draft: Draft): Promise<void> => {
    await db.saveDraft(draft);
    
    // Update last used repo and labels
    const prefs = await db.getPreferences();
    if (draft.repo) {
      prefs.lastRepo = draft.repo;
    }
    if (draft.labels.length > 0) {
      prefs.lastUsedLabels = [...new Set([...draft.labels, ...prefs.lastUsedLabels])].slice(0, 5);
    }
    await db.savePreferences(prefs);
    
    await loadDrafts();
  }, [loadDrafts]);

  const deleteDraft = useCallback(async (id: string): Promise<void> => {
    await db.deleteDraft(id);
    await loadDrafts();
  }, [loadDrafts]);

  const getDraft = useCallback(async (id: string): Promise<Draft | undefined> => {
    return db.getDraft(id);
  }, []);

  const applyTemplate = useCallback(async (draft: Draft, templateId: string): Promise<Draft> => {
    const template = await db.getTemplate(templateId);
    if (!template) return draft;

    const updatedDraft: Draft = {
      ...draft,
      title: template.title + draft.title,
      body: template.body,
      labels: [...new Set([...draft.labels, ...template.labels])],
      updatedAt: Date.now(),
    };

    await db.saveDraft(updatedDraft);
    await loadDrafts();
    return updatedDraft;
  }, [loadDrafts]);

  const duplicateDraft = useCallback(async (draft: Draft): Promise<Draft> => {
    const newDraft: Draft = {
      ...draft,
      id: uuidv4(),
      title: `${draft.title} (Copy)`,
      status: 'draft',
      githubNumber: undefined,
      githubUrl: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.saveDraft(newDraft);
    await loadDrafts();
    return newDraft;
  }, [loadDrafts]);

  const searchDrafts = useCallback((
    query: string,
    filters?: { type?: DraftType; status?: DraftStatus }
  ): Draft[] => {
    let filtered = [...drafts];

    // Apply text search
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(lowerQuery) ||
        d.repo.toLowerCase().includes(lowerQuery) ||
        d.body.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply filters
    if (filters?.type) {
      filtered = filtered.filter(d => d.type === filters.type);
    }
    if (filters?.status) {
      filtered = filtered.filter(d => d.status === filters.status);
    }

    return filtered;
  }, [drafts]);

  const refreshDrafts = useCallback(async (): Promise<void> => {
    await loadDrafts();
  }, [loadDrafts]);

  return {
    drafts,
    isLoading,
    error,
    createDraft,
    updateDraft,
    deleteDraft,
    getDraft,
    applyTemplate,
    duplicateDraft,
    searchDrafts,
    refreshDrafts,
  };
}
