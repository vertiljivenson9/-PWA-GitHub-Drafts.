import { useState, useEffect, useCallback } from 'react';
import { Octokit } from '@octokit/core';
import { db } from '@/db';

// GitHub OAuth configuration
// Replace these with your actual GitHub App credentials
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
const GITHUB_REDIRECT_URI = typeof window !== 'undefined' 
  ? `${window.location.origin}/auth/callback`
  : '';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  token: string | null;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  login: () => void;
  logout: () => Promise<void>;
  handleCallback: (code: string) => Promise<boolean>;
  getOctokit: () => Octokit | null;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    error: null,
  });

  // Load token from IndexedDB on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const prefs = await db.getPreferences();
        
        if (prefs.githubToken && prefs.tokenExpiresAt && prefs.tokenExpiresAt > Date.now()) {
          // Validate token by fetching user
          const octokit = new Octokit({ auth: prefs.githubToken });
          const { data: user } = await octokit.request('GET /user');
          
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: {
              login: user.login,
              avatar_url: user.avatar_url,
            },
            token: prefs.githubToken,
            error: null,
          });
        } else {
          // Token expired or not found
          if (prefs.githubToken) {
            await clearAuthData();
          }
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth load error:', error);
        await clearAuthData();
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          token: null,
          error: 'Session expired. Please login again.',
        });
      }
    };

    loadAuth();
  }, []);

  const clearAuthData = async () => {
    const prefs = await db.getPreferences();
    prefs.githubToken = undefined;
    prefs.tokenExpiresAt = undefined;
    await db.savePreferences(prefs);
  };

  const login = useCallback(() => {
    // Generate PKCE verifier
    const verifier = generateCodeVerifier();
    localStorage.setItem('github_pkce_verifier', verifier);
    
    // Generate state
    const state = generateState();
    localStorage.setItem('github_oauth_state', state);

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URI,
      scope: 'repo read:user read:org',
      state: state,
      code_challenge: generateCodeChallenge(verifier),
      code_challenge_method: 'S256',
    });

    // Redirect to GitHub OAuth
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }, []);

  const logout = useCallback(async () => {
    await clearAuthData();
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      error: null,
    });
  }, []);

  const handleCallback = useCallback(async (code: string): Promise<boolean> => {
    const verifier = localStorage.getItem('github_pkce_verifier');
    const savedState = localStorage.getItem('github_oauth_state');
    const urlParams = new URLSearchParams(window.location.search);
    const returnedState = urlParams.get('state');

    if (!verifier || !savedState || savedState !== returnedState) {
      setState(prev => ({ ...prev, error: 'Invalid OAuth state' }));
      return false;
    }

    try {
      // Exchange code for token
      // Note: In production, this should be done through a backend server
      // to keep the client secret secure. For this SPA, we'll use a proxy.
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          code: code,
          redirect_uri: GITHUB_REDIRECT_URI,
          code_verifier: verifier,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      const token = data.access_token;
      const expiresIn = data.expires_in || 28800; // 8 hours default

      // Get user info
      const octokit = new Octokit({ auth: token });
      const { data: user } = await octokit.request('GET /user');

      // Save to IndexedDB
      const prefs = await db.getPreferences();
      prefs.githubToken = token;
      prefs.tokenExpiresAt = Date.now() + (expiresIn * 1000);
      await db.savePreferences(prefs);

      // Clean up
      localStorage.removeItem('github_pkce_verifier');
      localStorage.removeItem('github_oauth_state');

      setState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          login: user.login,
          avatar_url: user.avatar_url,
        },
        token: token,
        error: null,
      });

      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
      return false;
    }
  }, []);

  const getOctokit = useCallback((): Octokit | null => {
    if (!state.token) return null;
    return new Octokit({ auth: state.token });
  }, [state.token]);

  return {
    ...state,
    login,
    logout,
    handleCallback,
    getOctokit,
  };
}

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

function generateCodeChallenge(verifier: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    return base64URLEncode(new Uint8Array(hash));
  }) as unknown as string;
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

function base64URLEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
