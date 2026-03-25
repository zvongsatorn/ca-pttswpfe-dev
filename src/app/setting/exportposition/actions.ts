'use server';

import { exportPosition } from '@/services/mkdService';

export async function fetchExportPositionAction(params: {
    effYear?: string,
    effDate?: string,
    employeeId: string,
    userGroupNo: string,
    exportType: number
}, token: string) {
    const res = await exportPosition(params, token);
    return res;
}
