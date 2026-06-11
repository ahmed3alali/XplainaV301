import { NextResponse } from 'next/server';
import { getServerApiBase } from '@/lib/env';
import { AUTH_COOKIE, authCookieOptions } from '@/lib/auth-cookie';

export async function POST(request) {
  let backend;
  try {
    backend = getServerApiBase();
  } catch (err) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }

  const body = await request.json();
  let res;
  try {
    res = await fetch(`${backend}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return NextResponse.json(
      { detail: `Cannot reach backend (${backend}): ${err.message}` },
      { status: 502 },
    );
  }

  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').slice(0, 120);
    return NextResponse.json(
      {
        detail: `Backend returned non-JSON (HTTP ${res.status}). The API at ${backend} may be down or misconfigured. Response: ${snippet}`,
      },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Login failed';
    return NextResponse.json({ detail }, { status: res.status });
  }

  const response = NextResponse.json({
    user_id: data.user_id,
    user_type: data.user_type,
  });
  response.cookies.set(AUTH_COOKIE, data.access_token, authCookieOptions());
  return response;
}
