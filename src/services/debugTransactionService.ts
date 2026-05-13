import { buildAuthHeaders, fetchApi, normalizeApiPath } from '@/utils/security';

const API_BASE_URL = '';

export interface StructureRemarkDebugPayload {
    effectiveMonth: number;
    effectiveYear: number;
}

export interface StructureRemarkDebugItem {
    unitNo: string;
    unitName: string;
    remark: string;
    action: 'INSERTED' | 'SKIPPED_EXISTING';
}

export interface StructureRemarkDebugResult {
    success: boolean;
    effectiveDate: string;
    previousEffectiveDate: string;
    totalDetected: number;
    insertedCount: number;
    skippedCount: number;
    changes: StructureRemarkDebugItem[];
}

interface StructureRemarkDebugApiResponse {
    status: number;
    message: string;
    data: StructureRemarkDebugResult;
}

export const debugGenerateStructureRemarks = async (
    payload: StructureRemarkDebugPayload,
    token?: string
): Promise<StructureRemarkDebugResult> => {
    const headers = buildAuthHeaders(token, { 'Content-Type': 'application/json' });

    const response = await fetchApi(API_BASE_URL, normalizeApiPath('/api/transactions/debug/structure-remarks'), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body?.message || `Request failed with status ${response.status}`);
    }

    const result = body as StructureRemarkDebugApiResponse;
    return result.data;
};
