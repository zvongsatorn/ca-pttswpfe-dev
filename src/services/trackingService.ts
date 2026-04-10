const API_BASE_URL = '';

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

export interface TrackingParams {
    dmonth: string;
    dyear: string;
    userGroupNo: string;
    employeeId: string;
}

export const getTrackingUsers = async (params: TrackingParams, token?: string) => {
    const query = new URLSearchParams(params as any).toString();
    return await fetchWithAuth(`/api/tracking/users?${query}`, token);
};

export const getTrackingUnits = async (params: TrackingParams, token?: string) => {
    const query = new URLSearchParams(params as any).toString();
    return await fetchWithAuth(`/api/tracking/units?${query}`, token);
};
