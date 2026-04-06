const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

export const getMKDDetails = async (id: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/details`, token);
};

export const saveMainKey = async (id: string, data: { KeyManID: string, KeyManValue: number, user: string, effectiveYear: number }, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/keys/main`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const saveDetailKey = async (id: string, data: { KeyManID: string, KeyManDetailID: string, KeyManDetailValue: number, user: string, effectiveYear: number }, token?: string) => {
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

export const saveMKDHeadcount = async (id: string, data: { positionId: string, headcount: number }[], token?: string) => {
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
    const url = new URL(`${API_BASE_URL}/api/mkd/history-approve`);
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
    });
    return await fetchWithAuth(`/api/mkd/history-approve${url.search}`, token);
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

export const requestApproveMKD = async (id: string, user: string, token?: string) => {
    return await fetchWithAuth(`/api/mkd/${id}/request-approve`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
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
    const url = new URL(`${API_BASE_URL}/api/mkd/export-position`);
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, String(value));
    });
    return await fetchWithAuth(`/api/mkd/export-position${url.search}`, token);
};
