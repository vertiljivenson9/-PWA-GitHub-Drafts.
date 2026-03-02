import { useState, useCallback } from 'react';
import { Octokit } from '@octokit/core';
import type { Draft, GitHubRepo, GitHubLabel, GitHubUser } from '@/types';
import { db } from '@/db';

interface UseGitHubReturn {
  isSubmitting: boolean;
  error: string | null;
  submitDraft: (draft: Draft, octokit: Octokit) => Promise<{ success: boolean; url?: string; number?: number }>;
  fetchUserRepos: (octokit: Octokit, page?: number) => Promise<GitHubRepo[]>;
  fetchRepoLabels: (octokit: Octokit, owner: string, repo: string) => Promise<GitHubLabel[]>;
  fetchRepoAssignees: (octokit: Octokit, owner: string, repo: string) => Promise<GitHubUser[]>;
  fetchRepoMilestones: (octokit: Octokit, owner: string, repo: string) => Promise<{ id: number; title: string }[]>;
}

export function useGitHub(): UseGitHubReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDraft = useCallback(async (
    draft: Draft, 
    octokit: Octokit
  ): Promise<{ success: boolean; url?: string; number?: number }> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Update status to pending
      draft.status = 'pending';
      await db.saveDraft(draft);

      const [owner, repo] = draft.repo.split('/');
      
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Use: owner/repo');
      }

      let result;

      if (draft.type === 'issue') {
        // Create issue
        const { data } = await octokit.request('POST /repos/{owner}/{repo}/issues', {
          owner,
          repo,
          title: draft.title,
          body: draft.body,
          labels: draft.labels.length > 0 ? draft.labels : undefined,
          assignees: draft.assignees.length > 0 ? draft.assignees : undefined,
          milestone: draft.milestone ? parseInt(draft.milestone) : undefined,
        });

        result = {
          success: true,
          url: data.html_url,
          number: data.number,
        };
      } else {
        // Create PR
        if (!draft.branch) {
          throw new Error('Branch name is required for pull requests');
        }

        const { data } = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
          owner,
          repo,
          title: draft.title,
          body: draft.body,
          head: draft.branch,
          base: draft.baseBranch || 'main',
        });

        // Add labels if specified
        if (draft.labels.length > 0) {
          await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
            owner,
            repo,
            issue_number: data.number,
            labels: draft.labels,
          });
        }

        // Add assignees if specified
        if (draft.assignees.length > 0) {
          await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
            owner,
            repo,
            issue_number: data.number,
            assignees: draft.assignees,
          });
        }

        result = {
          success: true,
          url: data.html_url,
          number: data.number,
        };
      }

      // Update draft with success
      draft.status = 'created';
      draft.githubNumber = result.number;
      draft.githubUrl = result.url;
      await db.saveDraft(draft);

      return result;
    } catch (err) {
      console.error('Error submitting draft:', err);
      
      // Update draft with error
      draft.status = 'error';
      draft.errorMessage = err instanceof Error ? err.message : 'Unknown error';
      await db.saveDraft(draft);

      setError(err instanceof Error ? err.message : 'Failed to submit');
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const fetchUserRepos = useCallback(async (
    octokit: Octokit, 
    page = 1
  ): Promise<GitHubRepo[]> => {
    try {
      const { data } = await octokit.request('GET /user/repos', {
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
        page,
      });

      return data.map(repo => ({
        id: repo.id,
        full_name: repo.full_name,
        name: repo.name,
        owner: {
          login: repo.owner.login,
        },
        private: repo.private,
      }));
    } catch (err) {
      console.error('Error fetching repos:', err);
      return [];
    }
  }, []);

  const fetchRepoLabels = useCallback(async (
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<GitHubLabel[]> => {
    try {
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/labels', {
        owner,
        repo,
        per_page: 100,
      });

      return data.map(label => ({
        id: label.id,
        name: label.name,
        color: label.color,
        description: label.description || undefined,
      }));
    } catch (err) {
      console.error('Error fetching labels:', err);
      return [];
    }
  }, []);

  const fetchRepoAssignees = useCallback(async (
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<GitHubUser[]> => {
    try {
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/assignees', {
        owner,
        repo,
        per_page: 100,
      });

      return data.map(user => ({
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
      }));
    } catch (err) {
      console.error('Error fetching assignees:', err);
      return [];
    }
  }, []);

  const fetchRepoMilestones = useCallback(async (
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<{ id: number; title: string }[]> => {
    try {
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/milestones', {
        owner,
        repo,
        state: 'open',
        per_page: 100,
      });

      return data.map(milestone => ({
        id: milestone.number,
        title: milestone.title,
      }));
    } catch (err) {
      console.error('Error fetching milestones:', err);
      return [];
    }
  }, []);

  return {
    isSubmitting,
    error,
    submitDraft,
    fetchUserRepos,
    fetchRepoLabels,
    fetchRepoAssignees,
    fetchRepoMilestones,
  };
}
