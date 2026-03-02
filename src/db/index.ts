import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Draft, UserPreferences, Template, DraftStatus } from '@/types';

interface GitHubDraftsDB extends DBSchema {
  drafts: {
    key: string;
    value: Draft;
    indexes: {
      'by-repo': string;
      'by-type': string;
      'by-status': string;
      'by-updated': number;
    };
  };
  preferences: {
    key: 'preferences';
    value: UserPreferences;
  };
  templates: {
    key: string;
    value: Template;
  };
}

const DB_NAME = 'github-drafts-db';
const DB_VERSION = 1;

class Database {
  private db: IDBPDatabase<GitHubDraftsDB> | null = null;

  async init(): Promise<IDBPDatabase<GitHubDraftsDB>> {
    if (this.db) return this.db;

    this.db = await openDB<GitHubDraftsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Drafts store
        const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
        draftsStore.createIndex('by-repo', 'repo');
        draftsStore.createIndex('by-type', 'type');
        draftsStore.createIndex('by-status', 'status');
        draftsStore.createIndex('by-updated', 'updatedAt');

        // Preferences store
        db.createObjectStore('preferences', { keyPath: 'id' });

        // Templates store
        db.createObjectStore('templates', { keyPath: 'id' });
      },
    });

    // Initialize default templates if none exist
    await this.initDefaultTemplates();

    return this.db;
  }

  private async initDefaultTemplates(): Promise<void> {
    const db = await this.init();
    const existing = await db.getAll('templates');
    
    if (existing.length === 0) {
      const defaultTemplates: Template[] = [
        {
          id: 'bug-report',
          name: 'Bug Report',
          type: 'issue',
          title: '[Bug] ',
          body: `## Description
<!-- Describe the bug clearly -->

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
<!-- What should happen -->

## Actual Behavior
<!-- What actually happens -->

## Environment
- OS: 
- Browser: 
- Version: 

## Screenshots
<!-- If applicable, add screenshots -->
`,
          labels: ['bug'],
          isDefault: true,
        },
        {
          id: 'feature-request',
          name: 'Feature Request',
          type: 'issue',
          title: '[Feature] ',
          body: `## Description
<!-- Describe the feature you'd like -->

## Problem
<!-- What problem does this solve? -->

## Proposed Solution
<!-- How should this work? -->

## Alternatives
<!-- Any alternative solutions considered -->

## Additional Context
<!-- Add any other context -->
`,
          labels: ['enhancement'],
          isDefault: true,
        },
        {
          id: 'question',
          name: 'Question',
          type: 'issue',
          title: '[Question] ',
          body: `## Question
<!-- Your question here -->

## Context
<!-- Any relevant context -->

## What I've Tried
<!-- What have you already tried? -->
`,
          labels: ['question'],
          isDefault: true,
        },
        {
          id: 'good-first-issue',
          name: 'Good First Issue',
          type: 'issue',
          title: '',
          body: `## Description
<!-- A clear description for newcomers -->

## Getting Started
<!-- Steps to get started -->

## Resources
<!-- Helpful links or docs -->

## Acceptance Criteria
<!-- What needs to be done -->
- [ ] 
- [ ] 
`,
          labels: ['good first issue'],
          isDefault: true,
        },
        {
          id: 'pr-template',
          name: 'Pull Request',
          type: 'pr',
          title: '',
          body: `## Description
<!-- Describe your changes -->

## Related Issue
<!-- Link to related issue (Fixes #123) -->

## Changes Made
<!-- List the changes -->
- 
- 
- 

## Testing
<!-- How was this tested? -->

## Screenshots
<!-- If applicable -->
`,
          labels: [],
          isDefault: true,
        },
      ];

      const tx = db.transaction('templates', 'readwrite');
      for (const template of defaultTemplates) {
        await tx.store.put(template);
      }
      await tx.done;
    }
  }

  // Drafts
  async getAllDrafts(): Promise<Draft[]> {
    const db = await this.init();
    return db.getAllFromIndex('drafts', 'by-updated');
  }

  async getDraftsByRepo(repo: string): Promise<Draft[]> {
    const db = await this.init();
    return db.getAllFromIndex('drafts', 'by-repo', repo);
  }

  async getDraftsByType(type: 'issue' | 'pr'): Promise<Draft[]> {
    const db = await this.init();
    return db.getAllFromIndex('drafts', 'by-type', type);
  }

  async getDraftsByStatus(status: DraftStatus): Promise<Draft[]> {
    const db = await this.init();
    return db.getAllFromIndex('drafts', 'by-status', status);
  }

  async getDraft(id: string): Promise<Draft | undefined> {
    const db = await this.init();
    return db.get('drafts', id);
  }

  async saveDraft(draft: Draft): Promise<void> {
    const db = await this.init();
    draft.updatedAt = Date.now();
    await db.put('drafts', draft);
  }

  async deleteDraft(id: string): Promise<void> {
    const db = await this.init();
    await db.delete('drafts', id);
  }

  // Preferences
  async getPreferences(): Promise<UserPreferences> {
    const db = await this.init();
    const prefs = await db.get('preferences', 'preferences');
    return prefs || { id: 'preferences', lastUsedLabels: [], favoriteTemplates: [] };
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    const db = await this.init();
    await db.put('preferences', prefs);
  }

  // Templates
  async getAllTemplates(): Promise<Template[]> {
    const db = await this.init();
    return db.getAll('templates');
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const db = await this.init();
    return db.get('templates', id);
  }

  async saveTemplate(template: Template): Promise<void> {
    const db = await this.init();
    await db.put('templates', template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const db = await this.init();
    await db.delete('templates', id);
  }

  // Export/Import
  async exportAllData(): Promise<{ drafts: Draft[]; templates: Template[]; preferences: UserPreferences }> {
    const db = await this.init();
    const [drafts, templates, preferences] = await Promise.all([
      db.getAll('drafts'),
      db.getAll('templates'),
      db.get('preferences', 'preferences'),
    ]);
    return {
      drafts,
      templates,
      preferences: preferences || { id: 'preferences', lastUsedLabels: [], favoriteTemplates: [] },
    };
  }

  async importData(data: { drafts?: Draft[]; templates?: Template[] }): Promise<void> {
    const db = await this.init();
    
    if (data.drafts) {
      const tx = db.transaction('drafts', 'readwrite');
      for (const draft of data.drafts) {
        await tx.store.put(draft);
      }
      await tx.done;
    }

    if (data.templates) {
      const tx = db.transaction('templates', 'readwrite');
      for (const template of data.templates) {
        if (!template.isDefault) {
          await tx.store.put(template);
        }
      }
      await tx.done;
    }
  }
}

// Singleton instance
export const db = new Database();
