/** App surfaces that require a session. Everything else stays public (SEO + marketing). */
export const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/editor',
  '/account',
  '/analytics',
  '/seller',
] as const;

export const AUTH_PAGES = ['/login', '/register'] as const;

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}
