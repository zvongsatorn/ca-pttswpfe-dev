import { buildAuthHeaders, fetchApi } from '@/utils/security';

const API_BASE_URL = '';

export type DebugMailTemplateType =
    | 'CALENDAR_START'
    | 'CALENDAR_END'
    | 'TRANSACTION_SUBMIT'
    | 'TRANSACTION_REJECT'
    | 'MKD_NEXT'
    | 'MKD_REJECT'
    | 'MKD_HRUSER';

export interface MailAlertTestPayload {
    email: string;
    templateType: DebugMailTemplateType;
    mkdRequestNo?: string;
    documentNo?: string;
    transactionItems?: Array<{
        transactionNo: string;
        transactionTypeText?: string;
        transactionDesc?: string;
    }>;
}

export interface MailAlertTestResponse {
    success: boolean;
    configKey: 'SendMailAlert' | 'SendMailTrans' | 'SendMailManDriver';
    templateType: DebugMailTemplateType;
    alertType: 'START' | 'END';
    mode: '0' | '1' | '2';
    requestedRecipient: string;
    finalRecipient: string | null;
    isSend: number;
    subject: string;
    message: string;
    mailToId: number;
}

export const testMailAlert = async (
    payload: MailAlertTestPayload,
    token?: string
): Promise<MailAlertTestResponse> => {
    const headers = buildAuthHeaders(token, { 'Content-Type': 'application/json' });

    const response = await fetchApi(API_BASE_URL, '/api/log/mail-alert/test', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.message || `Request failed with status ${response.status}`);
    }

    return data as MailAlertTestResponse;
};
