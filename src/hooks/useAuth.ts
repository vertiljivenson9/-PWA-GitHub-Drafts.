import { useState, useEffect, useCallback } from 'react';
import { Octokit } from '@octokit/rest';
import { openDB } from 'idb';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const GITHUB_REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI;

const WORKER_URL =
  'https://morning-recipe-f04e.vertiljivenson9.workers.dev';

/* =========================
   IndexedDB Setup
========================= */

const dbPromise = openDB('github-drafts', 1, {
  upgrade(database) {
    if (!database.objectStoreNames.contains('preferences')) {
      database.createObjectStore('preferences', { keyPath: 'id' });
    }
  },
});

async function getPreference(id: string) {
  const db = await dbPromise;
  return db.get('preferences', id);
}

async function putPreference(value: any) {
  const db = await dbPromise;
  return db.put('preferences', value);
}

async function clearPreferences() {
  const db = await dbPromise;
  return db.clear('preferences');
}

/* =========================
   PKCE Helpers
========================= */

function base64URLEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

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

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/* =========================
   Hook
========================= */

export function useAuth() {
  const [octokit, setOctokit] = useState<Octokit | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  /* =========================
     Login
  ========================= */

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

  /* =========================
     Logout
  ========================= */

  const logout = useCallback(async () => {
    await clearPreferences();
    localStorage.removeItem('github_pkce_verifier');
    localStorage.removeItem('github_oauth_state');
    setOctokit(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  /* =========================
     Handle OAuth Callback
  ========================= */
const handleCallback = useCallback(
  async (code: string): Promise<boolean> => {
    const state = new URLSearchParams(window.location.search).get('state');

    if (!code || !state) return false;

    const savedState = localStorage.getItem('github_oauth_state');
    const verifier = localStorage.getItem('github_pkce_verifier');

    if (!savedState || savedState !== state) {
      console.error('Invalid OAuth state');
      return false;
    }

    if (!verifier) {
      console.error('Missing PKCE verifier');
      return false;
    }

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, verifier }),
      });

      if (!response.ok) {
        console.error('Token exchange failed');
        return false;
      }

      const { access_token } = await response.json();

      if (!access_token) {
        console.error('No access token received');
        return false;
      }

      const newOctokit = new Octokit({ auth: access_token });
      const { data } = await newOctokit.users.getAuthenticated();

      await putPreference({
        id: 'github-auth',
        githubToken: access_token,
        tokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      localStorage.removeItem('github_oauth_state');
      localStorage.removeItem('github_pkce_verifier');

      window.history.replaceState({}, document.title, window.location.pathname);

      setOctokit(newOctokit);
      setUser(data);
      setIsAuthenticated(true);

      return true;
    } catch (err) {
      console.error(err);
      await logout();
      return false;
    }
  },
  [logout]
);
  /* =========================
     Init
  ========================= */

  useEffect(() => {
    const init = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('code')) {
          await handleCallback();
          setIsLoading(false);
          return;
        }

        const prefs = await getPreference('github-auth');

        if (prefs?.githubToken) {
          const newOctokit = new Octokit({
            auth: prefs.githubToken,
          });

          const { data } = await newOctokit.users.getAuthenticated();

          setOctokit(newOctokit);
          setUser(data);
          setIsAuthenticated(true);
        }

      } catch (err) {
        console.warn('Stored token invalid');
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [handleCallback, logout]);

  /* =========================
     Return (ALINEADO CON App.tsx)
  ========================= */

  return {
    octokit,
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    handleCallback,
  };
}