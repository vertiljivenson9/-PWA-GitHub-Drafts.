import { useState, useEffect, useCallback } from 'react';
import { Octokit } from '@octokit/rest';
import { db } from '../lib/db';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const GITHUB_REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI;

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

export function useAuth() {
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async () => {
    const verifier = generateCodeVerifier();
    localStorage.setItem('github_pkce_verifier', verifier);

    const state = generateState();
    localStorage.setItem('github_oauth_state', state);

    const challenge = await generateCodeChallenge(verifier);

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: 'repo read:user read:org',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.href =
      `https://github.com/login/oauth/authorize?${params.toString()}`;
  }, []);

  const logout = useCallback(async () => {
    await db.preferences.clear();
    localStorage.removeItem('github_pkce_verifier');
    localStorage.removeItem('github_oauth_state');
    setOctokit(null);
    setIsAuthenticated(false);
  }, []);

  const handleCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(`GitHub OAuth Error: ${error}`);
    }

    if (!code || !state) return;

    const savedState = localStorage.getItem('github_oauth_state');
    const verifier = localStorage.getItem('github_pkce_verifier');

    if (!savedState || savedState !== state) {
      throw new Error('Invalid OAuth state');
    }

    if (!verifier) {
      throw new Error('Missing PKCE verifier');
    }

    try {
      const response = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, verifier }),
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const { access_token } = await response.json();

      if (!access_token) {
        throw new Error('No access token received');
      }

      await db.preferences.put({
        id: 'github-auth',
        githubToken: access_token,
        tokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      window.history.replaceState({}, document.title, window.location.pathname);

      localStorage.removeItem('github_oauth_state');
      localStorage.removeItem('github_pkce_verifier');

      const newOctokit = new Octokit({ auth: access_token });
      setOctokit(newOctokit);
      setIsAuthenticated(true);

    } catch (err) {
      console.error(err);
      await logout();
    }
  }, [logout]);

  useEffect(() => {
    const init = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('code')) {
          await handleCallback();
          setLoading(false);
          return;
        }

        const prefs = await db.preferences.get('github-auth');

        if (prefs?.githubToken) {
          const newOctokit = new Octokit({ auth: prefs.githubToken });
          await newOctokit.users.getAuthenticated();

          setOctokit(newOctokit);
          setIsAuthenticated(true);
        }

      } catch (err) {
        console.warn('Stored token invalid');
        await logout();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [handleCallback, logout]);

  return {
    octokit,
    isAuthenticated,
    loading,
    login,
    logout,
  };
}