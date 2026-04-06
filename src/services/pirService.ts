const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            ...authHeader,
        },
    });

    if (!res.ok) {
        console.error(`Fetch failed: ${url}`, res.statusText);
        return null;
    }
    return res.json();
}

// --- Tab 1: PIR ---
export const getPIR = async (effectiveYear: string, orgUnitNo?: string, token?: string) => {
    const query = orgUnitNo ? `?effectiveYear=${effectiveYear}&orgUnitNo=${orgUnitNo}` : `?effectiveYear=${effectiveYear}`;
    return await fetchWithAuth(`/api/pir${query}`, token);
};

export const insertPIR = async (data: { effectiveYear: string, year: string, rate: number, orgUnitNo: string, createBy: string, import?: number }, token?: string) => {
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

    const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE_URL}/api/pir/file/upload`, {
        method: 'POST',
        headers: { ...authHeader },
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
    const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE_URL}/api/pir/template`, {
        headers: { ...authHeader }
    });
    if (!res.ok) return null;
    return await res.blob();
};
