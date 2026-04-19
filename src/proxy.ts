import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  try {
    // 1. Handle API + backend static upload proxying
    if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
      const rawUrl = (process.env.BACKEND_URL || 'http://localhost:5000').trim().replace(/^['"]|['"]$/g, '');
      const backendUrl = rawUrl.replace(/\/$/, '') || 'http://localhost:5000';

      let targetUrl: URL;
      try {
        targetUrl = new URL(
          pathname + request.nextUrl.search,
          backendUrl
        );
      } catch (urlErr) {
        console.error(`[Proxy URL Error] Invalid backendUrl: ${backendUrl}`, urlErr);
        throw new Error(`Invalid Backend URL configuration: ${backendUrl}`);
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
        backend_url_used: process.env.BACKEND_URL || 'UNDEFINED'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Handle Auth Redirects
  if (!token && pathname !== '/login' && pathname !== '/register' && !pathname.startsWith('/_next') && pathname !== '/favicon.ico') {
    console.log(`[Proxy Auth] No token found. Redirecting ${pathname} to /login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url));
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
