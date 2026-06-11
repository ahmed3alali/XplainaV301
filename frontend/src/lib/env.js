/**
 * Backend URL config — no hardcoded URLs in source.
 *
 * Browser:  /api/backend/*  (same-origin proxy)
 * Server:   API_BASE env var (auth routes + proxy)
 *
 * No Supabase keys. Auth is JWT in httpOnly cookie via /api/auth/*.
 */

function getBackendUrl() {
  const value = (
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    ''
  ).trim().replace(/\/$/, '');

  if (!value) {
    throw new Error(
      'Missing API_BASE. Add API_BASE=https://api.claripath.dev to Vercel env vars (or frontend/.env.local locally), then redeploy.',
    );
  }
  return value;
}

/** Server-side only — auth routes + API proxy. */
export function getServerApiBase() {
  return getBackendUrl();
}

/** api.js / adminApi.js — browser uses proxy, server uses direct URL. */
export function getApiBase() {
  if (typeof window !== 'undefined') {
    return '/api/backend';
  }
  return getBackendUrl();
}

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getServerApiBase()}${normalized}`;
}
