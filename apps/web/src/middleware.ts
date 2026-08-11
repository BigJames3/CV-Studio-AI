import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PAGES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  if (!requestHeaders.get('x-request-id')) {
    requestHeaders.set('x-request-id', crypto.randomUUID());
  }

  // HttpOnly refresh_token (API) and/or cv_session flag
  const hasSession =
    Boolean(request.cookies.get('refresh_token')?.value) ||
    request.cookies.get('cv_session')?.value === '1' ||
    Boolean(request.cookies.get('access_token')?.value);

  const appOnly = ['/dashboard', '/editor', '/account', '/analytics'];
  const mustAuth = appOnly.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (mustAuth && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/editor/:path*',
    '/account/:path*',
    '/analytics/:path*',
    '/login',
    '/register',
  ],
};
