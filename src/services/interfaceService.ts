const API_BASE_URL = '';

export interface InfoDataUploadSummary {
    parsedRows: number;
    insertedRows: number;
    skippedRows: number;
    replaceExisting: boolean;
}

interface UploadResponse {
    success: boolean;
    message?: string;
    data?: InfoDataUploadSummary;
}

export const uploadInfoDataFile = async (
    file: File,
    replaceExisting: boolean,
    token?: string
): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replaceExisting', String(replaceExisting));

    const headers: HeadersInit = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/interface/infodata/upload`, {
        method: 'POST',
        headers,
        body: formData
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
        return payload || { success: false, message: 'Upload failed' };
    }

    return payload;
};
