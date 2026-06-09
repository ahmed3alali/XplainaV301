/**
 * All external URLs come from environment variables — never hardcode backend URLs.
 * Copy env.example → .env.local and fill in values before running the app.
 */

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to frontend/.env.local (see env.example).`,
    );
  }
  return value;
}

/** FastAPI backend root, e.g. http://localhost:8000 */
export function getApiBase() {
  return requireEnv('NEXT_PUBLIC_API_BASE').replace(/\/$/, '');
}

/** Full URL for a backend path */
export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}

export function getSupabaseUrl() {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey() {
  return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
