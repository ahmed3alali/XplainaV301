/** HttpOnly session cookie — JWT never exposed to browser JavaScript. */
export const AUTH_COOKIE = 'claripath_token';

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  };
}
