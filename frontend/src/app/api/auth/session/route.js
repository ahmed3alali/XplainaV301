import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerApiBase } from '@/lib/env';
import { AUTH_COOKIE } from '@/lib/auth-cookie';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  let backend;
  try {
    backend = getServerApiBase();
  } catch (err) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }

  const res = await fetch(`${backend}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return NextResponse.json({ detail: 'Invalid session' }, { status: 401 });
  }

  const data = await res.json();
  return NextResponse.json({
    user: {
      id: data.user_id,
      userType: data.user_type,
    },
  });
}
