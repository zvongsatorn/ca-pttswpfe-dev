import { buildAuthHeaders, fetchApi } from '@/utils/security';

const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const res = await fetchApi(API_BASE_URL, url, {
        ...options,
        headers: buildAuthHeaders(token, options.headers),
    });

    if (!res.ok) {
        console.error(`Fetch failed: ${url}`, res.statusText);
        return null;
    }
    return res.json();
}

export const fetchUserGroups = async (token?: string) => {
    return await fetchWithAuth('/api/usergroup', token);
};

export const fetchAllUnits = async (token?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const data = await fetchWithAuth(`/api/units/all?effectiveDate=${today}`, token);
    return data?.data || data || [];
};

export const fetchAllEmployees = async (token?: string) => {
    const data = await fetchWithAuth('/api/usergroup/all-users', token);
    return Array.isArray(data) ? data : [];
};

export const fetchBGCombo = async (month: string, year: string, token?: string) => {
    return await fetchWithAuth(`/api/user-rights/combo/bg?effectiveMonth=${month}&effectiveYear=${year}`, token);
};

export const fetchOrgUnitsInGroup = async (userGroupNo: string, token?: string) => {
    return await fetchWithAuth(`/api/user-rights/org-unit?userGroupNo=${userGroupNo}`, token);
};

export const fetchUserGroupMembers = async (userGroupNo: string, token?: string) => {
    return await fetchWithAuth(`/api/usergroup/members?userGroupNo=${userGroupNo}`, token);
};

export const fetchLineCombo = async (month: string, year: string, token?: string) => {
    return await fetchWithAuth(`/api/user-rights/combo/line?effectiveMonth=${month}&effectiveYear=${year}`, token);
};

export const copyOrgRights = async (data: {
    UserGroupNo: string;
    EmployeeIDFrom: string;
    EmployeeIDTo: string;
    CreateBy: string;
}, token?: string) => {
    const res = await fetchApi(API_BASE_URL, '/api/user-rights/copy-org', {
        method: 'POST',
        headers: buildAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(data)
    });

    let payload: Record<string, unknown> | null = null;
    try {
        const parsed: unknown = await res.json();
        if (parsed && typeof parsed === 'object') {
            payload = parsed as Record<string, unknown>;
        }
    } catch {
        payload = null;
    }

    if (!res.ok) {
        const errorMessage = typeof payload?.error === 'string'
            ? payload.error
            : typeof payload?.message === 'string'
                ? payload.message
                : `HTTP ${res.status}`;
        console.error('copyOrgRights failed:', res.status, payload);
        return {
            success: false,
            error: errorMessage
        };
    }

    return payload;
};
