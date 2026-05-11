const isUnsafeHeaderChar = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return code < 32 || code === 127;
};

export const toSafeHeaderValue = (value: unknown): string => {
  return String(value ?? '').split('').filter((char) => !isUnsafeHeaderChar(char)).join('').trim();
};

export const buildAuthHeaders = (token?: string, baseHeaders?: HeadersInit): Headers => {
  const headers = new Headers(baseHeaders);
  const safeToken = toSafeHeaderValue(token);
  if (safeToken) headers.set('Authorization', `Bearer ${safeToken}`);
  return headers;
};

export const setAuthCookie = (token: string): void => {
  const safeToken = encodeURIComponent(toSafeHeaderValue(token));
  const secureFlag = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `auth_token=${safeToken}; path=/; max-age=28800; SameSite=Strict${secureFlag}`;
};

export const isSecureSubmissionContext = (): boolean => {
  if (typeof window === 'undefined') return true;
  const { protocol, hostname } = window.location;
  return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
};

export const normalizeApiBaseUrl = (baseUrl: string): string => {
  const trimmed = String(baseUrl || '').trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/g, '');
  if (!trimmed) return '';
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported API base URL protocol');
  }
  return parsed.toString().replace(/\/+$/g, '');
};

export const normalizeApiPath = (path: string): string => {
  const trimmed = String(path || '').trim();
  if (trimmed.includes('..') || trimmed.split('').some(isUnsafeHeaderChar)) {
    throw new Error('Unsupported API path');
  }
  if (!trimmed.startsWith('/api/') && !trimmed.startsWith('/uploads/')) {
    throw new Error('Unsupported API path');
  }
  return trimmed;
};

export const buildApiUrl = (baseUrl: string, path: string): string => {
  const safePath = normalizeApiPath(path);
  const safeBase = normalizeApiBaseUrl(baseUrl);
  return safeBase ? `${safeBase}${safePath}` : safePath;
};

export const buildApiPath = (path: string, params?: Record<string, string | number | boolean | null | undefined>): string => {
  const safePath = normalizeApiPath(path);
  if (!params) return safePath;

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${safePath}?${query}` : safePath;
};

export const buildApiPathFromSearch = (path: string, search: URLSearchParams | string): string => {
  const safePath = normalizeApiPath(path);
  const query = typeof search === 'string'
    ? new URLSearchParams(search.replace(/^\?/, '')).toString()
    : search.toString();
  return query ? `${safePath}?${query}` : safePath;
};

export const buildApiFileHref = (filePath: string): string => {
  const rawPath = String(filePath || '').trim();
  if (!rawPath || rawPath.includes('..') || rawPath.split('').some(isUnsafeHeaderChar)) {
    return '';
  }

  const normalized = rawPath
    .replace(/^\/api\/uploads\//, 'uploads/')
    .replace(/^\/uploads\//, 'uploads/')
    .replace(/^\/+/, '');

  if (!/^uploads\/[A-Za-z0-9._~/%@+-]+$/.test(normalized)) {
    return '';
  }

  return normalizeApiPath(`/api/${normalized}`);
};

export const fetchApi = (baseUrl: string, path: string, options?: RequestInit): Promise<Response> => {
  return fetch(buildApiUrl(baseUrl, path), options);
};

export const setSessionJson = (key: string, value: unknown): void => {
    if (typeof window === 'undefined') return;
    const safeKey = String(key || '').trim();
    if (!safeKey || safeKey.length > 120 || !/^[A-Za-z0-9:_-]+$/.test(safeKey) || safeKey.split('').some(isUnsafeHeaderChar)) return;
    sessionStorage.setItem(safeKey, JSON.stringify(value));
};

export const setLocalText = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  const safeKey = String(key || '').trim();
  if (!safeKey || safeKey.length > 120 || !/^[A-Za-z0-9:_-]+$/.test(safeKey)) return;
  localStorage.setItem(safeKey, toSafeHeaderValue(value));
};

export const setLocalJson = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  const safeKey = String(key || '').trim();
  if (!safeKey || safeKey.length > 120 || !/^[A-Za-z0-9:_-]+$/.test(safeKey)) return;
  localStorage.setItem(safeKey, JSON.stringify(value));
};
