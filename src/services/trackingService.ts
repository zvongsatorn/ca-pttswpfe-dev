import { buildAuthHeaders, fetchApi } from '@/utils/security';

const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const headers = buildAuthHeaders(token, options.headers);

    const res = await fetchApi(API_BASE_URL, url, {
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
    const query = new URLSearchParams({
        dmonth: params.dmonth,
        dyear: params.dyear,
        userGroupNo: params.userGroupNo,
        employeeId: params.employeeId,
    }).toString();
    return await fetchWithAuth(`/api/tracking/users?${query}`, token);
};

export const getTrackingUnits = async (params: TrackingParams, token?: string) => {
    const query = new URLSearchParams({
        dmonth: params.dmonth,
        dyear: params.dyear,
        userGroupNo: params.userGroupNo,
        employeeId: params.employeeId,
    }).toString();
    return await fetchWithAuth(`/api/tracking/units?${query}`, token);
};

export const getTransactionPendingByEmployeeId = async (employeeId: string, token?: string) => {
    const query = new URLSearchParams({ employeeId }).toString();
    const res = await fetchWithAuth(`/api/documents/my-requests?${query}`, token);

    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    return [];
};
