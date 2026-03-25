'use server';

import { revalidatePath } from 'next/cache';
import { insertPIR, deletePIR, copyPIR, insertRemark, deleteRemark } from '@/services/pirService';

export async function addPIRRateAction(data: {
    effectiveYear: string,
    year: string,
    rate: number,
    orgUnitNo: string,
    createBy: string,
    import?: number
}, token: string) {
    const res = await insertPIR(data, token);
    if (res?.success) {
        revalidatePath('/setting/pir');
        return { success: true };
    }
    return { success: false, message: res?.message || 'Failed to add', duplicate: res?.duplicate };
}

export async function deletePIRRateAction(id: number, updateBy: string, token: string) {
    const res = await deletePIR(id, updateBy, token);
    if (res?.success) {
        revalidatePath('/setting/pir');
        return { success: true };
    }
    return { success: false };
}

export async function copyPIRAction(effectiveYear: string, orgUnitNo: string, createBy: string, token: string) {
    const res = await copyPIR(effectiveYear, orgUnitNo, createBy, token);
    if (res?.success) {
        revalidatePath('/setting/pir');
        return { success: true };
    }
    return { success: false };
}

export async function addPIRRemarkAction(effYear: string, remark: string, createBy: string, token: string) {
    const res = await insertRemark(effYear, remark, createBy, token);
    if (res?.success) {
        revalidatePath('/setting/pir');
        return { success: true };
    }
    return { success: false };
}

export async function deletePIRRemarkAction(id: number, updateBy: string, token: string) {
    const res = await deleteRemark(id, updateBy, token);
    if (res?.success) {
        revalidatePath('/setting/pir');
        return { success: true };
    }
    return { success: false };
}
