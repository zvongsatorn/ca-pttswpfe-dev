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

export interface SapMonitorGridParams {
    dmonth: string;
    dyear: string;
}

export const getSapMonitorGrid = async (params: SapMonitorGridParams, token?: string) => {
    const query = new URLSearchParams({
        dmonth: params.dmonth,
        dyear: params.dyear,
    }).toString();

    const res = await fetchWithAuth(`/api/transactions/sap-monitor?${query}`, token);
    return res?.data || [];
};

export const getSapMonitorLog = async (effectiveDate: string, token?: string) => {
    const query = new URLSearchParams({
        EffectiveDate: effectiveDate,
    }).toString();

    const res = await fetchWithAuth(`/api/transactions/sap-monitor/log?${query}`, token);
    return res?.data || [];
};
