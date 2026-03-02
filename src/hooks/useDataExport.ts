import { useState, useCallback } from 'react';
import { db } from '@/db';
import type { Draft, Template } from '@/types';

interface UseDataExportReturn {
  isExporting: boolean;
  isImporting: boolean;
  error: string | null;
  exportData: () => Promise<string>;
  importData: (jsonString: string) => Promise<{ success: boolean; imported: number }>;
  downloadBackup: () => Promise<void>;
  loadFromFile: (file: File) => Promise<{ success: boolean; imported: number }>;
}

export function useDataExport(): UseDataExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(async (): Promise<string> => {
    setIsExporting(true);
    setError(null);

    try {
      const data = await db.exportAllData();
      return JSON.stringify(data, null, 2);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const importData = useCallback(async (jsonString: string): Promise<{ success: boolean; imported: number }> => {
    setIsImporting(true);
    setError(null);

    try {
      const data = JSON.parse(jsonString);
      
      if (!data.drafts && !data.templates) {
        throw new Error('Invalid backup file format');
      }

      let imported = 0;

      // Import drafts
      if (Array.isArray(data.drafts)) {
        const draftsToImport: Draft[] = data.drafts.map((d: Draft) => ({
          ...d,
          status: 'draft', // Reset status to draft
          githubNumber: undefined,
          githubUrl: undefined,
        }));
        await db.importData({ drafts: draftsToImport });
        imported += draftsToImport.length;
      }

      // Import templates
      if (Array.isArray(data.templates)) {
        const templatesToImport: Template[] = data.templates.filter((t: Template) => !t.isDefault);
        await db.importData({ templates: templatesToImport });
        imported += templatesToImport.length;
      }

      return { success: true, imported };
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import data');
      return { success: false, imported: 0 };
    } finally {
      setIsImporting(false);
    }
  }, []);

  const downloadBackup = useCallback(async (): Promise<void> => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const filename = `github-drafts-backup-${date}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download backup');
    }
  }, [exportData]);

  const loadFromFile = useCallback(async (file: File): Promise<{ success: boolean; imported: number }> => {
    setIsImporting(true);
    setError(null);

    try {
      const text = await file.text();
      return await importData(text);
    } catch (err) {
      console.error('File load error:', err);
      setError('Failed to read file');
      return { success: false, imported: 0 };
    } finally {
      setIsImporting(false);
    }
  }, [importData]);

  return {
    isExporting,
    isImporting,
    error,
    exportData,
    importData,
    downloadBackup,
    loadFromFile,
  };
}
