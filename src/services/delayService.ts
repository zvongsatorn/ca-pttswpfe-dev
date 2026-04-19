const API_BASE_URL = '';

export interface DelayRetirementDataType {
    key: string;
    DelayID: string;
    EmployeeID: string;
    EmployeeName: string;
    PosName: string;
    DelayYear: string;
    DelayStatus: number;
}

export interface DelayEmployeeOptionType {
    value: string;
    label: string;
    name: string;
    position: string;
}

export interface DelayUpsertPayload {
    EmployeeID: string;
    PosName: string;
    DelayYear: string | number;
    DelayStatus: number;
    UserID?: string;
}

interface DelayServiceResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

async function fetchWithAuth<T>(url: string, token?: string, options: RequestInit = {}): Promise<DelayServiceResponse<T>> {
    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        return payload || { success: false, message: 'Request failed' };
    }

    return payload as DelayServiceResponse<T>;
}

export const getDelayRetirementData = async (token?: string, delayYear?: string) => {
    const query = new URLSearchParams();
    if (delayYear) query.set('year', delayYear);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth<DelayRetirementDataType[]>(`/api/delay${suffix}`, token);
};

export const getEmployeeOptions = async (token?: string, delayYear?: string | number, keyword?: string) => {
    const query = new URLSearchParams();
    if (delayYear !== undefined && delayYear !== null && String(delayYear).trim() !== '') {
        query.set('year', String(delayYear).trim());
    }
    if (keyword && keyword.trim()) query.set('q', keyword.trim());
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth<DelayEmployeeOptionType[]>(`/api/delay/employees${suffix}`, token);
};

export const getDelayRetireYears = async (token?: string) => {
    return fetchWithAuth<number[]>('/api/delay/retire-years', token);
};

export const createDelayRetirement = async (payload: DelayUpsertPayload, token?: string) => {
    return fetchWithAuth<DelayRetirementDataType>('/api/delay', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
};

export const updateDelayRetirement = async (delayId: string, payload: DelayUpsertPayload, token?: string) => {
    return fetchWithAuth<DelayRetirementDataType>(`/api/delay/${encodeURIComponent(delayId)}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
};

export const deleteDelayRetirement = async (delayId: string, updateBy?: string, token?: string) => {
    const query = new URLSearchParams();
    if (updateBy) query.set('updateBy', updateBy);
    const suffix = query.toString() ? `?${query.toString()}` : '';

    return fetchWithAuth<null>(`/api/delay/${encodeURIComponent(delayId)}${suffix}`, token, {
        method: 'DELETE'
    });
};
