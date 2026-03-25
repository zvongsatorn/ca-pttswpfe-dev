'use server';

import { revalidatePath } from 'next/cache';
import { copyOrgRights } from '@/services/userRightService';

export async function copyOrgRightsAction(data: {
    UserGroupNo: string;
    EmployeeIDFrom: string;
    EmployeeIDTo: string;
    CreateBy: string;
}, token: string) {
    const res = await copyOrgRights(data, token);
    
    if (!res || !res.success) {
        return { success: false, message: res?.error || 'Failed to copy rights' };
    }

    revalidatePath('/setting/userright');
    return { success: true };
}
