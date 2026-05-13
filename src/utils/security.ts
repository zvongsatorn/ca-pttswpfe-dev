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
  document.cookie = `auth_token=${safeToken}; path=/; max-age=3600; SameSite=Strict${secureFlag}`;
};

export const isSecureSubmissionContext = (): boolean => {
  if (typeof window === 'undefined') return true;
  const { protocol, hostname } = window.location;
  return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
};

export const getLocalDevApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname } = window.location;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return '';
  return normalizeApiBaseUrl(`${protocol}//${hostname}:5000`);
};

export const getSafeWindowOrigin = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const { protocol, hostname, port } = window.location;
  if (protocol !== 'http:' && protocol !== 'https:') return undefined;
  if (!/^(localhost|127\.0\.0\.1|[A-Za-z0-9.-]+)$/.test(hostname)) return undefined;
  const safePort = /^\d{1,5}$/.test(port) ? port : '';
  return normalizeApiBaseUrl(`${protocol}//${hostname}${safePort ? `:${safePort}` : ''}`);
};

export const normalizeApiBaseUrl = (baseUrl: string): string => {
  const trimmed = String(baseUrl || '').trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/g, '');
  if (!trimmed) return '';
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported API base URL protocol');
  }
  if (parsed.username || parsed.password || parsed.hash) {
    throw new Error('Unsupported API base URL parts');
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

export const normalizeAppRoutePath = (path: unknown, fallback = '#'): string => {
  const rawPath = String(path || '').trim();
  if (!rawPath || rawPath === '#') return fallback;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(rawPath) || rawPath.startsWith('//')) return fallback;
  if (rawPath.includes('..') || rawPath.includes('\\') || rawPath.split('').some(isUnsafeHeaderChar)) return fallback;
  if (/^#[A-Za-z0-9_-]+$/.test(rawPath)) return rawPath;

  const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const [pathOnly] = normalized.split(/[?#]/, 1);
  if (!/^\/[A-Za-z0-9/_~.-]*$/.test(pathOnly)) return fallback;

  try {
    const url = new URL(normalized, 'http://app.local');
    if (url.origin !== 'http://app.local') return fallback;
    if (!/^\/[A-Za-z0-9/_~.-]*$/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

const SAFE_ROUTE_PATHS = {
  transactionBorrowRecords: '/api/transactions/borrow-records',
  transactionApprovers: '/api/transactions/approvers',
  transactionDrafts: '/api/transactions/drafts',
  transactionFiles: '/api/transactions/files',
  unitsAll: '/api/units/all',
  unitsTransferByReceive: '/api/units/transfer-by-receive',
  unitsLevels: '/api/units/levels',
  report10: '/api/report/report10',
  report10Excel: '/api/report/report10/excel',
  report2: '/api/report/report2',
  report1: '/api/report/report1',
  report3: '/api/report/report3',
  report3Filters: '/api/report/report3/filters',
  report4: '/api/report/report4',
  report4Filters: '/api/report/report4/filters',
  report5: '/api/report/report5',
  report5Filters: '/api/report/report5/filters',
  report8: '/api/report/report8',
  reportDashboard: '/api/report/dashboard',
  reportDashboardExcel: '/api/report/dashboard/excel',
  report6: '/api/report/report6',
  report6Filters: '/api/report/report6/filters',
  report7: '/api/report/report7',
  report7Filters: '/api/report/report7/filters',
  report9: '/api/report/report9',
  documentsInbox: '/api/documents/inbox',
  documentsMyRequests: '/api/documents/my-requests',
  documentsProgress: '/api/documents/progress',
  documentsAll: '/api/documents/all',
  documentsInboxCount: '/api/documents/inbox/count',
  mkdInbox: '/api/mkd/inbox',
  mkdMyRequests: '/api/mkd/my-requests',
  mkdHistory: '/api/mkd/history',
  mkdHistoryApprove: '/api/mkd/history-approve',
  transactionsHrcenter: '/api/transactions/hrcenter',
  transactionsHrcenterSapMinus: '/api/transactions/hrcenter/sap-minus',
  transactionsHrcenterSendToSap: '/api/transactions/hrcenter/send-to-sap',
  unitsByRole: '/api/units/by-role',
  userGroupLevels: '/api/usergroup/levels',
  userGroupLevelCombo: '/api/usergroup/level-combo',
  userGroupMembers: '/api/usergroup/members',
  mkdTemplateMasterKeys: '/api/mkd/template/master-keys',
  authLogin: '/api/auth/login',
  authSso: '/api/auth/sso',
  authConfigLoginAdmin: '/api/auth/config/LoginAdmin',
  authConfigSignupB2C: '/api/auth/config/SignupB2C',
  authRegisterVerify: '/api/auth/register/verify',
  authRegisterCreate: '/api/auth/register/create',
  calendar: '/api/calendar',
  documentsApprove: '/api/documents/approve',
  documentsReject: '/api/documents/reject',
  documentsRejectAll: '/api/documents/reject-all',
  documentsSubmit: '/api/documents/submit',
  transactionDraft: '/api/transactions/draft',
  transactionDirectApprove: '/api/transactions/direct-approve',
  transactionHrcenterSapFile: '/api/transactions/hrcenter/sap-file',
  mkd: '/api/mkd',
  mkdCheckDup: '/api/mkd/check-dup',
  mkdExportList: '/api/mkd/export-list',
  menu: '/api/menu',
  userProfilePicture: '/api/users/profile-picture',
} as const;

export type SafeRouteKey = keyof typeof SAFE_ROUTE_PATHS;

export const toSafePathSegment = (value: unknown): string => {
  const segment = String(value || '').trim();
  if (!segment || segment.includes('..') || !/^[A-Za-z0-9._~-]+$/.test(segment)) {
    throw new Error('Unsupported API path segment');
  }
  return encodeURIComponent(segment);
};

export const buildSafeRoutePath = (
  key: SafeRouteKey,
  params?: Record<string, string | number | boolean | null | undefined>
): string => buildApiPath(SAFE_ROUTE_PATHS[key], params);

export const buildSafeRoutePathFromSearch = (key: SafeRouteKey, search: URLSearchParams | string): string => {
  return buildApiPathFromSearch(SAFE_ROUTE_PATHS[key], search);
};

export const buildDocumentDetailPath = (
  documentNo: unknown,
  params?: Record<string, string | number | boolean | null | undefined>
): string => buildApiPath(`/api/documents/${toSafePathSegment(documentNo)}`, params);

export const buildReturnHistoryPath = (
  documentNo: unknown,
  params?: Record<string, string | number | boolean | null | undefined>
): string => buildApiPath(`/api/transactions/return-history/${toSafePathSegment(documentNo)}`, params);

export const buildTransactionDraftPath = (
  transactionNo: unknown,
  params?: Record<string, string | number | boolean | null | undefined>
): string => buildApiPath(`/api/transactions/draft/${toSafePathSegment(transactionNo)}`, params);

export const buildMenuSubmenuPath = (
  menuKey: unknown,
  params?: Record<string, string | number | boolean | null | undefined>
): string => buildApiPath(`/api/menu/submenu/${toSafePathSegment(menuKey)}`, params);

export const buildMkdPath = (
  mkdId: unknown,
  suffix: 'details' | 'dashboard' | 'dashboard/rate' | 'flow-history',
  params?: Record<string, string | number | boolean | null | undefined>
): string => buildApiPath(`/api/mkd/${toSafePathSegment(mkdId)}/${suffix}`, params);

export const buildMkdFilePath = (mkdId: unknown, fileName: unknown): string => {
  return buildApiPath(`/api/mkd/${toSafePathSegment(mkdId)}/files/${toSafePathSegment(fileName)}`);
};

export const buildPirFilePath = (effectiveYear: unknown, fileName: unknown): string => {
  return buildApiPath(`/api/pir/file/download/${toSafePathSegment(effectiveYear)}/${toSafePathSegment(fileName)}`);
};

export const buildFilesProxyPath = (folder: unknown, fileName: unknown): string => {
  const proxyPath = `${String(toSafePathSegment(folder))}/${String(toSafePathSegment(fileName))}`;
  return buildApiPath('/api/files-proxy', { path: proxyPath });
};

export const buildUserOtherPath = (
  employeeId: unknown,
  params?: Record<string, string | number | boolean | null | undefined>
): string => buildApiPath(`/api/users/other/${toSafePathSegment(employeeId)}`, params);

export const openSafeApiPath = (path: string): void => {
  if (typeof window === 'undefined') return;
  const safePath = normalizeApiPath(path);
  const link = document.createElement('a');
  link.href = safePath;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
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

export const fetchSafeRoute = (
  key: SafeRouteKey,
  params?: Record<string, string | number | boolean | null | undefined>,
  options?: RequestInit
): Promise<Response> => {
  return fetch(buildSafeRoutePath(key, params), options);
};

export const postSafeRouteJson = (
  key: SafeRouteKey,
  body: unknown,
  options?: RequestInit
): Promise<Response> => {
  if (!isSecureSubmissionContext()) {
    return Promise.reject(new Error('Secure connection is required'));
  }
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  return fetchSafeRoute(key, undefined, {
    ...options,
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
};

export const toSafeDisplayText = (value: unknown): string => {
  return String(value ?? '').replace(/[<>&"'`]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
};

const LOCAL_TEXT_KEYS = new Set([
  'auth_token',
  'StartYear',
  'selected_usergroup',
  'selected_usergroup_role',
  'selected_subject_id',
  'selected_subject_name',
  'selected_subject_path',
  'mkd_historyapprove_year',
  'mkd_historyapprove_unit',
  'mkd_historyapprove_status',
  'mkd_history_year',
  'mkd_history_status',
  'mkd_historyrecord_year',
  'mkd_historyrecord_status',
]);

const LOCAL_JSON_KEYS = new Set(['user_data']);
const SESSION_JSON_KEY_PATTERN = /^user_units_cache:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/;
const SESSION_JSON_STORAGE_KEY = 'user_units_cache';

const readSessionJsonCache = (): Record<string, unknown> => {
  if (typeof window === 'undefined') return {};
  const rawCache = sessionStorage.getItem(SESSION_JSON_STORAGE_KEY);
  if (!rawCache || rawCache === 'undefined') return {};
  try {
    const parsed = JSON.parse(rawCache);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
};

export const setSessionJson = (key: string, value: unknown): void => {
    if (typeof window === 'undefined') return;
    const safeKey = String(key || '').trim();
    if (!safeKey || safeKey.length > 120 || !SESSION_JSON_KEY_PATTERN.test(safeKey) || safeKey.split('').some(isUnsafeHeaderChar)) return;
    const cache = readSessionJsonCache();
    cache[safeKey] = value;
    sessionStorage.setItem(SESSION_JSON_STORAGE_KEY, JSON.stringify(cache));
};

export const getSessionJson = <T = unknown>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    const safeKey = String(key || '').trim();
    if (!safeKey || safeKey.length > 120 || !SESSION_JSON_KEY_PATTERN.test(safeKey) || safeKey.split('').some(isUnsafeHeaderChar)) return null;
    const cache = readSessionJsonCache();
    return Object.prototype.hasOwnProperty.call(cache, safeKey) ? cache[safeKey] as T : null;
};

export const setLocalText = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  const safeKey = String(key || '').trim();
  if (!LOCAL_TEXT_KEYS.has(safeKey)) return;
  const safeValue = toSafeHeaderValue(value);
  switch (safeKey) {
    case 'auth_token':
      localStorage.setItem('auth_token', safeValue);
      break;
    case 'StartYear':
      localStorage.setItem('StartYear', safeValue);
      break;
    case 'selected_usergroup':
      localStorage.setItem('selected_usergroup', safeValue);
      break;
    case 'selected_usergroup_role':
      localStorage.setItem('selected_usergroup_role', safeValue);
      break;
    case 'selected_subject_id':
      localStorage.setItem('selected_subject_id', safeValue);
      break;
    case 'selected_subject_name':
      localStorage.setItem('selected_subject_name', safeValue);
      break;
    case 'selected_subject_path':
      localStorage.setItem('selected_subject_path', safeValue);
      break;
    case 'mkd_historyapprove_year':
      localStorage.setItem('mkd_historyapprove_year', safeValue);
      break;
    case 'mkd_historyapprove_unit':
      localStorage.setItem('mkd_historyapprove_unit', safeValue);
      break;
    case 'mkd_historyapprove_status':
      localStorage.setItem('mkd_historyapprove_status', safeValue);
      break;
    case 'mkd_history_year':
      localStorage.setItem('mkd_history_year', safeValue);
      break;
    case 'mkd_history_status':
      localStorage.setItem('mkd_history_status', safeValue);
      break;
    case 'mkd_historyrecord_year':
      localStorage.setItem('mkd_historyrecord_year', safeValue);
      break;
    case 'mkd_historyrecord_status':
      localStorage.setItem('mkd_historyrecord_status', safeValue);
      break;
  }
};

export const setLocalJson = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  const safeKey = String(key || '').trim();
  if (!LOCAL_JSON_KEYS.has(safeKey)) return;
  if (safeKey === 'user_data') {
    localStorage.setItem('user_data', JSON.stringify(value));
  }
};
