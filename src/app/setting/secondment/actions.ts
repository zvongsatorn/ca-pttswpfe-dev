'use server';

import { revalidatePath } from 'next/cache';
import { createSecondmentPool, updateSecondmentPool } from '@/services/secondmentService';

export async function addUnitToPoolAction(data: {
    orgUnitNo: string,
    parentOrgUnitNo: string,
    createBy: string
}, token: string) {
    const res = await createSecondmentPool(data.orgUnitNo, data.parentOrgUnitNo, data.createBy, token);

    if (!res || res.status !== 200) {
        return { success: false, message: res?.message || 'Failed to add unit' };
    }

    revalidatePath('/setting/secondment');
    return { success: true };
}

export async function removeUnitFromPoolAction(data: {
    orgUnitNo: string,
    parentOrgUnitNo: string,
    updateBy: string
}, token: string) {
    const res = await updateSecondmentPool(data.orgUnitNo, data.parentOrgUnitNo, data.updateBy, token);

    if (!res || res.status !== 200) {
        return { success: false, message: res?.message || 'Failed to remove unit' };
    }

    revalidatePath('/setting/secondment');
    return { success: true };
}
