const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        console.error(`Fetch failed: ${url}`, res.statusText);
        return null;
    }
    return res.json();
}

export interface HistoryParams {
    EffectiveMonth?: string;
    EffectiveYear: string;
    RequestType?: number;
    EmployeeID?: string;
    OrgUnitNo?: string;
    UserGroupNo?: string;
    division?: string;
}

export const getUnitFrameworkHistory = async (params: HistoryParams, token?: string) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            query.append(key, value.toString());
        }
    });

    const res = await fetchWithAuth(`/api/mkd/history?${query.toString()}`, token);
    return res?.data || [];
};
