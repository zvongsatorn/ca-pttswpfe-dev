import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const getBackendBaseUrl = () => {
  const rawUrl = (process.env.BACKEND_URL || 'http://localhost:5000').trim().replace(/^['"]|['"]$/g, '');
  return rawUrl.replace(/\/$/, '') || 'http://localhost:5000';
};

export async function GET(request: NextRequest) {
  const backendUrl = `${getBackendBaseUrl()}/api/report/report9${request.nextUrl.search}`;
  const headers = new Headers();

  const authorization = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');

  if (authorization) {
    headers.set('authorization', authorization);
  }
  if (cookie) {
    headers.set('cookie', cookie);
  }

  try {
    const response = await fetch(backendUrl, {
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
