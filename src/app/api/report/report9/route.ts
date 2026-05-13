import { NextRequest, NextResponse } from 'next/server';
import { buildSafeRoutePathFromSearch, fetchApi, normalizeApiBaseUrl, toSafeHeaderValue } from '@/utils/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const getBackendBaseUrl = () => {
  const rawUrl = (process.env.BACKEND_URL || 'http://localhost:5000').trim().replace(/^['"]|['"]$/g, '');
  return normalizeApiBaseUrl(rawUrl || 'http://localhost:5000');
};

export async function GET(request: NextRequest) {
  const headers = new Headers();

  const authorization = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');

  if (authorization) {
    headers.set('authorization', toSafeHeaderValue(authorization));
  }
  if (cookie) {
    headers.set('cookie', toSafeHeaderValue(cookie));
  }

  try {
    const response = await fetchApi(getBackendBaseUrl(), buildSafeRoutePathFromSearch('report9', request.nextUrl.searchParams), {
      method: 'GET',
      headers,
      cache: 'no-store'
    });
    const body = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8';

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'content-type': contentType
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch report9 data';
    return NextResponse.json({
      status: 500,
      message,
      error: message
    }, { status: 500 });
  }
}
