export type DraftType = 'issue' | 'pr';
export type DraftStatus = 'draft' | 'pending' | 'created' | 'error';

export interface Attachment {
  id: string;
  name: string;
  data: string; // base64
  type: string;
  size: number;
}

export interface Draft {
  id: string;
  type: DraftType;
  repo: string;
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  milestone?: string;
  branch?: string; // for PR
  baseBranch?: string; // for PR
  attachments: Attachment[];
  createdAt: number;
  updatedAt: number;
  status: DraftStatus;
  errorMessage?: string;
  githubNumber?: number; // issue/PR number after creation
  githubUrl?: string;
}

export interface Template {
  id: string;
  name: string;
  type: DraftType;
  title: string;
  body: string;
  labels: string[];
  isDefault?: boolean;
}

export interface UserPreferences {
  id: 'preferences';
  lastRepo?: string;
  lastUsedLabels: string[];
  favoriteTemplates: string[];
  githubToken?: string;
  tokenExpiresAt?: number;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
  private: boolean;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
}
