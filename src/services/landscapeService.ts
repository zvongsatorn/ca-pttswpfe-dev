import { buildAuthHeaders, fetchApi, normalizeApiPath } from '@/utils/security';

const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const safeUrl = normalizeApiPath(url);
    const res = await fetchApi(API_BASE_URL, safeUrl, {
        ...options,
        headers: buildAuthHeaders(token, options.headers)
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
        console.error(`Fetch failed: ${safeUrl}`, res.statusText);
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

export interface LandscapeFormulaPayload {
    formulaKey: string;
    formulaName: string | null;
    beginDate: string;
    endDate: string | null;
    formulaJson: string;
    isActive: boolean;
}

export interface LandscapeFormulaRecord {
    LandscapeFormulaID: number;
    FormulaKey: string;
    FormulaName: string | null;
    BeginDate: string;
    EndDate: string;
    FormulaJson: string;
    IsActive: boolean;
    CreateBy?: string | null;
    CreateDate?: string | null;
    UpdateBy?: string | null;
    UpdateDate?: string | null;
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

export const getLandscapeFormulas = async (token?: string) => {
    return fetchWithAuth('/api/landscape/formula', token);
};

export const getLandscapeFormulaDefault = async (token?: string) => {
    return fetchWithAuth('/api/landscape/formula/default', token);
};

export const createLandscapeFormula = async (
    payload: LandscapeFormulaPayload,
    createBy: string,
    token?: string
) => {
    return fetchWithAuth('/api/landscape/formula', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, createBy })
    });
};

export const updateLandscapeFormula = async (
    formulaId: number,
    payload: LandscapeFormulaPayload,
    updateBy: string,
    token?: string
) => {
    return fetchWithAuth(`/api/landscape/formula/${encodeURIComponent(String(formulaId))}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, updateBy })
    });
};

export const deleteLandscapeFormula = async (formulaId: number, token?: string) => {
    return fetchWithAuth(`/api/landscape/formula/${encodeURIComponent(String(formulaId))}`, token, {
        method: 'DELETE'
    });
};
