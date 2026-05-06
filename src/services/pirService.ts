import { buildAuthHeaders, fetchApi } from '@/utils/security';

const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const res = await fetchApi(API_BASE_URL, url, {
        ...options,
        headers: buildAuthHeaders(token, options.headers),
    });

    const contentType = res.headers.get('content-type') || '';
    let payload: any = null;
    try {
        payload = contentType.includes('application/json') ? await res.json() : await res.text();
    } catch {
        payload = null;
    }

    if (!res.ok) {
        const errorMessage =
            (payload && typeof payload === 'object' && 'message' in payload ? String(payload.message) : '') ||
            (typeof payload === 'string' ? payload : '') ||
            res.statusText;
        console.error(`Fetch failed: ${url}`, errorMessage);
        return {
            success: false,
            message: errorMessage,
            status: res.status,
            ...(payload && typeof payload === 'object' ? payload : {})
        };
    }
    return payload;
}

// --- Tab 1: PIR ---
export const getPIR = async (effectiveYear: string, orgUnitNo?: string, token?: string) => {
    const query = orgUnitNo ? `?effectiveYear=${effectiveYear}&orgUnitNo=${orgUnitNo}` : `?effectiveYear=${effectiveYear}`;
    return await fetchWithAuth(`/api/pir${query}`, token);
};

export const insertPIR = async (data: { effectiveYear: string, year: string, rate: number | null, orgUnitNo: string, createBy: string, import?: number }, token?: string) => {
    return await fetchWithAuth('/api/pir', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const deletePIR = async (improveRateID: string | number, updateBy: string, token?: string) => {
    return await fetchWithAuth('/api/pir/delete', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ improveRateID, updateBy })
    });
};

export const copyPIR = async (effectiveYear: string, orgUnitNo: string, createBy: string, token?: string) => {
    return await fetchWithAuth('/api/pir/copy', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effectiveYear, orgUnitNo, createBy })
    });
};

export const getPIROrg = async (effectiveYear: string, token?: string) => {
    return await fetchWithAuth(`/api/pir/org?effectiveYear=${effectiveYear}`, token);
};

// --- Tab 2: File Attach ---
export const getFileAttach = async (effectiveYear: string, token?: string) => {
    return await fetchWithAuth(`/api/pir/file?effectiveYear=${effectiveYear}`, token);
};

export const uploadFilePIR = async (file: File, fileName: string, effYear: string, user: string, token?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('effYear', effYear);
    formData.append('user', user);

    const res = await fetchApi(API_BASE_URL, '/api/pir/file/upload', {
        method: 'POST',
        headers: buildAuthHeaders(token),
        body: formData
    });

    if (!res.ok) return null;
    return res.json();
};

export const deleteFileAttach = async (improveRateUploadID: string | number, fileUpload: string, effYear: string, token?: string) => {
    return await fetchWithAuth('/api/pir/file/delete', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ improveRateUploadID, fileUpload, effYear })
    });
};

// --- Tab 3: Remark ---
export const getRemark = async (effectiveYear: string, token?: string) => {
    return await fetchWithAuth(`/api/pir/remark?effectiveYear=${effectiveYear}`, token);
};

export const insertRemark = async (effYear: string, remark: string, createBy: string, token?: string) => {
    return await fetchWithAuth('/api/pir/remark', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effYear, remark, createBy })
    });
};

export const deleteRemark = async (improveRateRemarkID: string | number, updateBy: string, token?: string) => {
    return await fetchWithAuth('/api/pir/remark/delete', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ improveRateRemarkID, updateBy })
    });
};

// --- Tab 4: Export ---
export const exportExcel = async (params: { effectiveMonth?: string, effectiveYear: string, employeeId?: string, userGroupNo?: string, bgNo?: string, divisionNo?: string, orgUnitNo?: string }, token?: string) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
    });

    return await fetchWithAuth(`/api/pir/export?${queryParams.toString()}`, token);
};

export const downloadPIRTemplate = async (token?: string) => {
    const res = await fetchApi(API_BASE_URL, '/api/pir/template', {
        headers: buildAuthHeaders(token)
    });
    if (!res.ok) return null;
    return await res.blob();
};
