const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const getApiBaseUrl = (): string => {
    const envBaseUrl = normalizeBaseUrl((process.env.NEXT_PUBLIC_BACKEND_URL || '').trim());
    if (envBaseUrl) return envBaseUrl;

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:5000`;
        }
    }

    return '';
};

export interface InfoDataUploadSummary {
    parsedRows: number;
    insertedRows: number;
    skippedRows: number;
    replaceExisting: boolean;
}

export type HrpTargetTable = 'HRP1001' | 'HRP1002';

export interface HrpDataUploadSummary {
    parsedRows: number;
    insertedRows: number;
    skippedRows: number;
    replaceExisting: boolean;
    targetTable: HrpTargetTable;
    sourceFile: string;
}

interface UploadResponse<TData> {
    success: boolean;
    message?: string;
    data?: TData;
}

const buildUploadRequest = (
    file: File,
    replaceExisting: boolean,
    token?: string,
    extraFields?: Record<string, string>
) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replaceExisting', String(replaceExisting));

    if (extraFields) {
        Object.entries(extraFields).forEach(([key, value]) => {
            formData.append(key, value);
        });
    }

    const headers: HeadersInit = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return { formData, headers };
};

const uploadFile = async <TData>(
    endpoint: string,
    file: File,
    replaceExisting: boolean,
    token?: string,
    extraFields?: Record<string, string>
): Promise<UploadResponse<TData>> => {
    const apiBaseUrl = getApiBaseUrl();
    const { formData, headers } = buildUploadRequest(file, replaceExisting, token, extraFields);
    const res = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
        return payload || { success: false, message: 'Upload failed' };
    }

    return payload;
}

export const uploadInfoDataFile = async (
    file: File,
    replaceExisting: boolean,
    token?: string
): Promise<UploadResponse<InfoDataUploadSummary>> => {
    return uploadFile<InfoDataUploadSummary>(
        '/api/interface/infodata/upload',
        file,
        replaceExisting,
        token
    );
};

export const uploadHrpDataFile = async (
    file: File,
    replaceExisting: boolean,
    targetTable: HrpTargetTable,
    token?: string
): Promise<UploadResponse<HrpDataUploadSummary>> => {
    return uploadFile<HrpDataUploadSummary>(
        '/api/interface/hrp/upload',
        file,
        replaceExisting,
        token,
        { targetTable }
    );
};
