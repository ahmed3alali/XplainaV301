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
  const res = await fetch(`${backend}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid response from backend' }, { status: 502 });
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
