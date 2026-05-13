import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_ALLOWED_BACKEND_HOST_SUFFIXES = ['localhost', '127.0.0.1', 'pttplc.com', 'pttdigital.com'];

const getAllowedBackendHostSuffixes = (): string[] => {
  const configured = (process.env.BACKEND_ALLOWED_HOST_SUFFIXES || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_BACKEND_HOST_SUFFIXES;
};

const isAllowedBackendHostname = (hostname: string): boolean => {
  const normalizedHost = hostname.toLowerCase();
  return getAllowedBackendHostSuffixes().some((suffix) => (
    normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`)
  ));
};

const normalizeProxyPath = (pathname: string): string => {
  const safePath = String(pathname || '').trim();
  if (!safePath.startsWith('/api/') && !safePath.startsWith('/uploads/')) {
    throw new Error('Invalid proxy path');
  }
  if (safePath.includes('..') || /%2e|%5c/i.test(safePath) || safePath.includes('\\')) {
    throw new Error('Invalid proxy path');
  }
  if (/[\u0000-\u001F\u007F]/.test(safePath)) {
    throw new Error('Invalid proxy path');
  }
  return safePath;
};

const buildProxyTargetUrl = (request: NextRequest, backendUrl: URL): URL => {
  const safePath = normalizeProxyPath(request.nextUrl.pathname);
  const safeSearch = request.nextUrl.search
    ? `?${new URLSearchParams(request.nextUrl.search).toString()}`
    : '';
  return new URL(`${safePath}${safeSearch}`, backendUrl);
};

const normalizeBackendUrl = (): URL => {
  const rawUrl = (process.env.BACKEND_URL || 'http://localhost:5000').trim().replace(/^['"]|['"]$/g, '');
  const parsed = new URL(rawUrl || 'http://localhost:5000');
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Invalid backend URL protocol');
  }
  if (parsed.username || parsed.password || parsed.hash) {
    throw new Error('Invalid backend URL parts');
  }
  if (!isAllowedBackendHostname(parsed.hostname)) {
    throw new Error('Backend host is not allowed');
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return parsed;
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  try {
    // 1. Handle API + backend static upload proxying
    if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
      if (pathname === '/api/report/report9') {
        return NextResponse.next();
      }

      let targetUrl: URL;
      try {
        const backendUrl = normalizeBackendUrl();
        targetUrl = buildProxyTargetUrl(request, backendUrl);
      } catch (urlErr) {
        console.error('[Proxy URL Error] Invalid backend URL configuration', urlErr);
        throw new Error('Invalid Backend URL configuration');
      }

      console.log(`[Proxy Runtime] ${request.method} ${pathname} -> ${targetUrl.toString()}`);
      const response = NextResponse.rewrite(targetUrl);
      return response;
    }
  } catch (err) {
    console.error(`[Proxy Fatal Error] ${err}`);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Proxy Configuration Error', 
        message: String(err),
        backend_url_used: 'hidden'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Handle Auth Redirects
  if (!token && pathname !== '/login' && pathname !== '/register' && !pathname.startsWith('/_next') && pathname !== '/favicon.ico') {
    console.log(`[Proxy Auth] No token found. Redirecting ${pathname} to /login`);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  if (token && pathname === '/login') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/home';
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  // 3. Add Security Headers
  const response = NextResponse.next();
  const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
  ];

  securityHeaders.forEach(({ key, value }) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2)$).*)',
  ],
};
