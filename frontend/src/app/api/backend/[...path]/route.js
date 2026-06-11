/**
 * Proxies browser requests to the FastAPI backend.
 * Keeps API_BASE server-only — nothing exposed in client bundle.
 */
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth-cookie';
import { getServerApiBase } from '@/lib/env';

const FORWARD = ['authorization', 'content-type', 'accept'];

async function proxy(request, context) {
  let backend;
  try {
    backend = getServerApiBase();
  } catch (err) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }

  const { path } = await context.params;
  const segments = Array.isArray(path) ? path.join('/') : path;
  const { search } = new URL(request.url);
  const target = `${backend}/${segments}${search}`;

  const headers = new Headers();
  for (const key of FORWARD) {
    const val = request.headers.get(key);
    if (val) headers.set(key, val);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const init = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const res = await fetch(target, init);
    const status = res.status;
    // 204/205/304 must not have a body (Fetch API rejects them otherwise)
    const noBody = status === 204 || status === 205 || status === 304;
    const out = new NextResponse(noBody ? null : await res.arrayBuffer(), { status });
    const ct = res.headers.get('content-type');
    if (ct && !noBody) out.headers.set('content-type', ct);
    return out;
  } catch (err) {
    return NextResponse.json(
      { detail: `Cannot reach backend (${backend}): ${err.message}` },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
