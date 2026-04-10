const API_BASE_URL = '';

export interface SecondmentPool {
    OrgUnitNo: string;
    UnitText: string;
    ParentOrgUnitNo: string;
    ConfigStatus: number;
}

export interface UnitCombo {
    OrgUnitNo: string;
    UnitText: string;
}

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

export const getSecondmentPools = async (orgUnitNo: string, token?: string) => {
    return await fetchWithAuth(`/api/secondment/pools?OrgUnitNo=${orgUnitNo}`, token);
};

export const createSecondmentPool = async (orgUnitNo: string, parentOrgUnitNo: string, createBy: string, token?: string) => {
    return await fetchWithAuth('/api/secondment/pools', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgUnitNo, parentOrgUnitNo, createBy })
    });
};

export const updateSecondmentPool = async (orgUnitNo: string, parentOrgUnitNo: string, updateBy: string, token?: string) => {
    return await fetchWithAuth('/api/secondment/pools', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgUnitNo, parentOrgUnitNo, updateBy })
    });
};

export const getParentUnits = async (token?: string) => {
    return await fetchWithAuth('/api/secondment/parent-units', token);
};

export const getUnitCombo = async (month?: number, year?: number, token?: string) => {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return await fetchWithAuth(`/api/secondment/units/combo${query}`, token);
};

export const searchUnits = async (keyword: string, token?: string) => {
    return await fetchWithAuth(`/api/secondment/units/search?q=${encodeURIComponent(keyword)}`, token);
};
