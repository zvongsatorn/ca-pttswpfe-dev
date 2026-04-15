const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            ...authHeader
        }
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
        console.error(`Fetch failed: ${url}`, res.statusText);
        return payload || { success: false, message: 'Request failed' };
    }

    return payload;
}

export interface LandscapePayload {
    orgUnitNo: string | null;
    beginDate: string;
    endDate: string | null;
    vp: number;
    dm: number;
    sr: number;
    jr: number;
}

export interface LandscapeRecord {
    OrgUnitNo: string | null;
    BeginDate: string;
    EndDate: string;
    vp: number;
    dm: number;
    sr: number;
    jr: number;
}

export const getLandscape = async (token?: string) => {
    return fetchWithAuth('/api/landscape', token);
};

export const createLandscape = async (payload: LandscapePayload, createBy: string, token?: string) => {
    return fetchWithAuth('/api/landscape', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, createBy })
    });
};

export const updateLandscape = async (
    original: LandscapePayload,
    next: LandscapePayload,
    updateBy: string,
    token?: string
) => {
    return fetchWithAuth('/api/landscape', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original, next, updateBy })
    });
};

export const deleteLandscape = async (
    original: LandscapePayload,
    updateBy: string,
    token?: string
) => {
    return fetchWithAuth('/api/landscape/delete', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original, updateBy })
    });
};
