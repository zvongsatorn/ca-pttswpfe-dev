import { buildAuthHeaders, fetchApi, setLocalText } from '@/utils/security';

const API_BASE_URL = '';

export const ACTION_LOG = {
  LOGIN: 1,
  LOGOUT: 2,
  ENTRY_MENU: 3,
  VIEW: 4,
  EXPORT: 8,
} as const;

const ACTIONS_REQUIRE_SUBJECT = new Set<number>([
  ACTION_LOG.LOGOUT,
  ACTION_LOG.ENTRY_MENU,
  ACTION_LOG.VIEW,
  ACTION_LOG.EXPORT,
]);

export interface InsertActionLogPayload {
  actionId: number;
  note?: string;
  subjectId?: number;
  userRole?: string;
  adminFlag?: number;
  employeeId?: string;
}

const getStoredUserData = (): { employeeID?: string } => {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem('user_data');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as { employeeID?: string };
  } catch {
    return {};
  }
};

const toIntOrZero = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const setCookie = (name: string, value: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Strict`;
};

const clearCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
};

export const setSelectedSubjectContext = (subjectId: number, subjectName: string, subjectPath?: string): void => {
  if (typeof window === 'undefined') return;

  const normalizedSubjectId = toIntOrZero(subjectId);
  if (!normalizedSubjectId) return;

  setLocalText('selected_subject_id', String(normalizedSubjectId));
  setLocalText('selected_subject_name', subjectName || '');
  setLocalText('selected_subject_path', subjectPath || '');

  setCookie('selected_subject_id', String(normalizedSubjectId));
  setCookie('selected_subject_name', subjectName || '');
  setCookie('selected_subject_path', subjectPath || '');
};

export const clearSelectedSubjectContext = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('selected_subject_id');
    localStorage.removeItem('selected_subject_name');
    localStorage.removeItem('selected_subject_path');
  }
  clearCookie('selected_subject_id');
  clearCookie('selected_subject_name');
  clearCookie('selected_subject_path');
};

export const insertActionLog = async (payload: InsertActionLogPayload): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem('auth_token');
  if (!token) return false;

  const userData = getStoredUserData();
  const employeeId = String(payload.employeeId || userData.employeeID || '').trim();
  if (!employeeId) return false;

  const storedGroup = String(localStorage.getItem('selected_usergroup') || '').trim();
  const userRole = String(payload.userRole || storedGroup || '').trim();
  const payloadSubjectId = toIntOrZero(payload.subjectId);
  const storedSubjectId = toIntOrZero(localStorage.getItem('selected_subject_id'));
  const subjectId = payloadSubjectId > 0 ? payloadSubjectId : storedSubjectId;
  const adminFlag = toIntOrZero(payload.adminFlag ?? (userRole === '01' ? 1 : 0));

  if (ACTIONS_REQUIRE_SUBJECT.has(payload.actionId) && subjectId <= 0) {
    console.warn('Skip action log because subjectId is missing for action:', payload.actionId);
    return false;
  }

  const requestBody: Record<string, unknown> = {
    employeeId,
    actionId: payload.actionId,
    userRole,
    note: String(payload.note || '').trim(),
    adminFlag,
  };
  if (subjectId > 0) {
    requestBody.subjectId = subjectId;
  }

  try {
    const response = await fetchApi(API_BASE_URL, '/api/log/action', {
      method: 'POST',
      keepalive: true,
      headers: buildAuthHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(requestBody),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to insert action log:', error);
    return false;
  }
};
