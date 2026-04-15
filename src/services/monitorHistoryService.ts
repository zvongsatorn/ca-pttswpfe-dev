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

export interface MonitorHistoryParams {
    dmonth1: string;
    dyear1: string;
    dmonth2: string;
    dyear2: string;
    employeeId: string;
    orgUnitNo: string;
    userGroupNo: string;
}

export interface MonitorHistoryActionLog {
    ActionType: number;
    ActionTypeText: string;
    Note: string;
    Name: string;
    ActionDate: string;
}

export interface MonitorHistoryUnitOption {
    value: string;
    label: string;
}

export const getMonitorHistory = async (params: MonitorHistoryParams, token?: string) => {
    const query = new URLSearchParams({
        dmonth1: params.dmonth1,
        dyear1: params.dyear1,
        dmonth2: params.dmonth2,
        dyear2: params.dyear2,
        EmployeeID: params.employeeId,
        OrgUnitNo: params.orgUnitNo,
        UserGroupNo: params.userGroupNo,
    }).toString();

    const res = await fetchWithAuth(`/api/transactions/monitor-history?${query}`, token);
    return res?.data || [];
};

export const getMonitorHistoryActionLog = async (refNo: string, token?: string): Promise<MonitorHistoryActionLog[]> => {
    const query = new URLSearchParams({ refNo }).toString();
    const res = await fetchWithAuth(`/api/transactions/action-log?${query}`, token);
    return res?.data || [];
};

export const getMonitorHistoryUnits = async (
    employeeId: string,
    userGroupNo: string,
    token?: string
): Promise<MonitorHistoryUnitOption[]> => {
    if (!employeeId || !userGroupNo) return [];

    const query = new URLSearchParams({
        empId: employeeId,
        roleId: userGroupNo,
    }).toString();

    const res = await fetchWithAuth(`/api/units/by-role?${query}`, token);
    const rows = res?.data as Array<Record<string, unknown>> | undefined;
    if (!rows || rows.length === 0) return [];

    const mapped = rows
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
        .filter((item): item is MonitorHistoryUnitOption => item !== null);

    return mapped;
};
