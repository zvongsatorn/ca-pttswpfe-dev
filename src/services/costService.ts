import { buildAuthHeaders, fetchApi } from '@/utils/security';

const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const res = await fetchApi(API_BASE_URL, url, {
        ...options,
        headers: buildAuthHeaders(token, options.headers)
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
        console.error(`Fetch failed: ${url}`, res.statusText);
        return payload || { success: false, message: 'Request failed' };
    }

    return payload;
}

export interface CostPayload {
    orgUnitNo: string;
    levelGroupNo: string;
    effectiveDate: string;
    note?: string;
    cost: number;
}

export interface CostRecord {
    OrgUnitNo: string;
    LevelGroupNo: string;
    EffectiveDate: string;
    Note?: string;
    Cost: number;
    LevelGroupName?: string;
}

export interface LevelGroupOption {
    LevelGroupNo: string;
    LevelGroupName: string;
    LevelGroupOrder?: number | null;
}

export const getCostRecords = async (fromDate: string, toDate: string, token?: string) => {
    const query = new URLSearchParams({ fromDate, toDate });
    return fetchWithAuth(`/api/cost?${query.toString()}`, token);
};

export const upsertCostRecord = async (payload: CostPayload, token?: string) => {
    return fetchWithAuth('/api/cost', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
};

export const updateCostRecord = async (
    original: CostPayload,
    next: CostPayload,
    token?: string
) => {
    return fetchWithAuth('/api/cost', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original, next })
    });
};

export const deleteCostRecord = async (original: CostPayload, token?: string) => {
    return fetchWithAuth('/api/cost/delete', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original })
    });
};

export const importCostRecords = async (rows: CostPayload[], token?: string) => {
    return fetchWithAuth('/api/cost/import', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
    });
};

export const exportCostRecords = async (fromDate: string, toDate: string, token?: string) => {
    const query = new URLSearchParams({ fromDate, toDate });
    return fetchWithAuth(`/api/cost/export?${query.toString()}`, token);
};

export const getCostTemplateMeta = async (token?: string) => {
    return fetchWithAuth('/api/cost/template', token);
};

export const getCostLevelGroupOptions = async (effectiveDate?: string, token?: string) => {
    const query = new URLSearchParams();
    if (effectiveDate) query.set('effectiveDate', effectiveDate);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/api/cost/level-groups${suffix}`, token);
};
