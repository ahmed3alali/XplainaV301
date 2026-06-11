'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const session = await res.json();
        setData(session);
        setStatus('authenticated');
      } else {
        setData(null);
        setStatus('unauthenticated');
      }
    } catch {
      setData(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ data, status, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSession must be used within AuthProvider');
  return ctx;
}

export function useSession() {
  const { data, status } = useAuthContext();
  return { data, status };
}

export async function signIn(_provider, { identifier, password } = {}) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : 'Login failed';
    return { error: detail, ok: false, status: res.status };
  }

  return { error: null, ok: true, status: 200 };
}

export async function signOut({ callbackUrl } = {}) {
  await fetch('/api/auth/logout', { method: 'POST' });
  if (callbackUrl && typeof window !== 'undefined') {
    window.location.href = callbackUrl;
  } else if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
