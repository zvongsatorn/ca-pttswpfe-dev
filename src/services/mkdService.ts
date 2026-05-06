import { buildAuthHeaders, fetchApi } from '@/utils/security';

const API_BASE_URL = typeof window === 'undefined' ? (process.env.BACKEND_URL || 'http://localhost:5000') : '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const headers = buildAuthHeaders(token, options.headers);

    const res = await fetchApi(API_BASE_URL, url, {
        ...options,
        headers,
    });

    if (!res.ok) {
        console.error(`Fetch failed: ${url}`, res.statusText);
        try {
            return await res.json();
        } catch {
            return null;
        }
    }
    return res.json();
}

export const getMKDDetails = async (id: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/details`, token);
};

export interface SaveMainKeyData {
    manDriverKeyId?: string;
    keyManId?: string | number;
    unit?: string;
    keyType?: number;
    weight?: number;
    user?: string;
    insertType?: number;
    effectiveYear?: number;
    parentId?: string | number;
}

export const saveMainKey = async (id: string, data: SaveMainKeyData, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/keys/main`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export interface YearlyData {
    id: number | string;
    year: string;
    amount: number;
}

export interface SaveDetailKeyData {
    manDriverKeyId: string | number;
    definition?: string;
    coefficient?: number;
    remark?: string;
    user?: string;
    insertType?: number;
    effectiveYear?: number | string;
    yearlyData?: YearlyData[];
}

export const saveDetailKey = async (id: string, data: SaveDetailKeyData, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/keys/detail`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const deleteMainKey = async (id: string, keyId: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/keys/${keyId}`, token, { method: 'DELETE' });
};

export const uploadMKDFile = async (id: string, file: File, user: string = 'SYSTEM', token?: string, customFileName?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', user);
    if (customFileName) {
        formData.append('fileName', customFileName);
    }
    return await fetchWithAuth(`/api/mkd/${id}/files`, token, {
        method: 'POST',
        body: formData
    });
};

export const deleteMKDFile = async (id: string, fileId: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/files/${fileId}`, token, { method: 'DELETE' });
};

export const getMasterKeys = async (token?: string) => {
    return await fetchWithAuth('/api/mkd/master-keys', token);
};

export const getStartYear = async (token?: string) => {
    return await fetchWithAuth('/api/mkd/start-year', token);
};

export const updateManDriverStatus = async (id: string, status: number, user: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/status`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, user })
    });
};

export const getMKDHeadcount = async (id: string, effectiveYear?: number, token?: string) => {
    const query = effectiveYear ? `?effectiveYear=${effectiveYear}` : '';
    return await fetchWithAuth(`/api/mkd/${id}/headcount${query}`, token);
};

export interface HeadcountData {
    HeadCountType: string;
    KeyYear: string | number;
    HeadCount: number;
    [key: string]: unknown;
}

export const saveMKDHeadcount = async (id: string, data: HeadcountData[], token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/headcount`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
    });
};

export const updateMKDUnitName = async (id: string, orgUnitName: string, user: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/unitname`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgUnitName, user })
    });
};

export const updateMKDNote = async (id: string, note: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/note`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
    });
};

export const getHistoryManDriverApprove = async (params: { EffectiveYear: string, division?: string, userGroupNo?: string }, token?: string) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
    });
    const queryString = searchParams.toString();
    return await fetchWithAuth(`/api/mkd/history-approve${queryString ? `?${queryString}` : ''}`, token);
};

export const getFlowHistory = async (id: string, approveId: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/flow-history?approveId=${approveId}`, token);
};

export interface ApproveManDriverData {
    status: number;
    user?: string;
    updateBy?: string;
    comment?: string;
    file?: File;
    existingFileUpload?: string;
    existingFileSourceManDriverId?: string;
    existingFileName?: string;
    approveId?: string;
    conclusionNo?: string;
    mkdApproveCount?: number;
    remark?: string;
}

export const approveManDriver = async (id: string, data: ApproveManDriverData, token?: string) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
            formData.append('file', value);
        } else {
            formData.append(key, String(value));
        }
    });

    return await fetchWithAuth(`/api/mkd/${id}/approve`, token, {
        method: 'PUT',
        body: formData
    });
};

export const getReusableMkdFiles = async (
    params: { EffectiveYear: string; EmployeeID: string; UserGroupNo?: string },
    token?: string
) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
    });
    const queryString = searchParams.toString();
    return await fetchWithAuth(`/api/mkd/reusable-files${queryString ? `?${queryString}` : ''}`, token);
};

export const requestApproveMKD = async (id: string, user: string, approveId?: string | number, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/request-approve`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, approveId })
    });
};

export interface MasterKeyCreateData {
    KeyManName: string;
    CreateBy: string;
}

export const createMasterKey = async (data: MasterKeyCreateData, token?: string) => {
    return await fetchWithAuth('/api/mkd/master-keys', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const updateMasterKey = async (id: string, data: { UpdateBy: string }, token?: string) => {
    return await fetchWithAuth(`/api/mkd/master-keys/${id}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const exportPosition = async (params: { effYear?: string, effDate?: string, employeeId: string, userGroupNo: string, exportType: number }, token?: string) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
    });
    const queryString = searchParams.toString();
    return await fetchWithAuth(`/api/mkd/export-position${queryString ? `?${queryString}` : ''}`, token);
};

export const submitMKDApproveAction = async (id: string, data: { approveId: number, employeeId: string, action: 'APPROVE' | 'REJECT', remark: string }, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/submit-approve-action`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const copyMKD = async (id: string, data: { copyFromId: number, employeeId: string, effectiveYear: string }, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/copy`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const getMKDHistory = async (employeeId: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/history-copy?employeeId=${employeeId}`, token);
};

export const cancelMKD = async (id: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/cancel`, token, {
        method: 'PUT'
    });
};
