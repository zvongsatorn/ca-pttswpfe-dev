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

export interface LogActionParams {
    fromDate: string;
    toDate: string;
}

export const getLogAction = async (params: LogActionParams, token?: string) => {
    const query = new URLSearchParams({
        fromDate: params.fromDate,
        toDate: params.toDate
    }).toString();
    const res = await fetchWithAuth(`/api/log/action?${query}`, token);
    return res?.data || [];
};

export const exportLogAction = async (params: LogActionParams, token?: string) => {
    const query = new URLSearchParams({
        fromDate: params.fromDate,
        toDate: params.toDate
    }).toString();
    const res = await fetchWithAuth(`/api/log/action/export?${query}`, token);
    return res?.data || [];
};
