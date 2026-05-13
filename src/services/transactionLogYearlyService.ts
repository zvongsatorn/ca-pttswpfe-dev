import { buildAuthHeaders, fetchApi, normalizeApiPath } from '@/utils/security';

const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const headers = buildAuthHeaders(token, options.headers);
    const safeUrl = normalizeApiPath(url);

    const res = await fetchApi(API_BASE_URL, safeUrl, {
        ...options,
        headers,
    });

    if (!res.ok) {
        console.error(`Fetch failed: ${safeUrl}`, res.statusText);
        return null;
    }

    return res.json();
}

export interface TransactionLogYearlyParams {
    orgUnitNo: string;
    dyear: string | number;
}

export interface TransactionLogYearlyDetailParams extends TransactionLogYearlyParams {
    dmonth: string | number;
}

export interface TransactionLogYearlyUnitOption {
    value: string;
    label: string;
}

export const getTransactionLogYearly = async (params: TransactionLogYearlyParams, token?: string) => {
    const query = new URLSearchParams({
        OrgUnitNo: params.orgUnitNo,
        dyear: String(params.dyear),
    }).toString();

    const res = await fetchWithAuth(`/api/transactions/log-yearly?${query}`, token);
    return res?.data || [];
};

export const getTransactionLogYearlyDetail = async (
    params: TransactionLogYearlyDetailParams,
    token?: string
) => {
    const query = new URLSearchParams({
        OrgUnitNo: params.orgUnitNo,
        dyear: String(params.dyear),
        dmonth: String(params.dmonth),
    }).toString();

    const res = await fetchWithAuth(`/api/transactions/log-yearly/detail?${query}`, token);
    return res?.data || [];
};

export const getTransactionLogYearlyUnits = async (
    employeeId: string,
    userGroupNo: string,
    token?: string
): Promise<TransactionLogYearlyUnitOption[]> => {
    if (!employeeId || !userGroupNo) return [];

    const query = new URLSearchParams({
        empId: employeeId,
        roleId: userGroupNo,
    }).toString();

    const res = await fetchWithAuth(`/api/units/by-role?${query}`, token);
    const rows = res?.data as Array<Record<string, unknown>> | undefined;
    if (!rows || rows.length === 0) return [];

    return rows
        .map((row) => {
            const unitNo = String(row.id || '').trim();
            if (!unitNo) return null;
            const unitText = String(row.unitText || '').trim();
            const unitName = String(row.name || '').trim();
            return {
                value: unitNo,
                label: unitText || `${unitNo} ${unitName}`.trim(),
            };
        })
        .filter((item): item is TransactionLogYearlyUnitOption => item !== null);
};
