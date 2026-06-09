/**
 * Backend URL config — no hardcoded URLs in source.
 *
 * Browser:  /api/backend/*  (same-origin proxy, see app/api/backend/[...path]/route.js)
 * Server:   API_BASE env var (NextAuth + proxy route)
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

/** Server-side only — NextAuth + API proxy route. */
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

export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.');
  }
  return value;
}

export function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!value) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return value;
}
