'use server';

import { revalidatePath } from 'next/cache';
import { createMasterKey, updateMasterKey } from '@/services/mkdService';

export async function addMasterKeyAction(data: { KeyManName: string, CreateBy: string }, token: string) {
    const res = await createMasterKey(data, token);
    if (!res || !res.success) {
        return { success: false, message: res?.message || 'Failed to add' };
    }
    revalidatePath('/setting/mkd');
    return { success: true };
}

export async function deleteMasterKeyAction(id: string, data: { UpdateBy: string }, token: string) {
    const res = await updateMasterKey(id, data, token);
    if (!res || !res.success) {
        return { success: false, message: res?.message || 'Failed to delete' };
    }
    revalidatePath('/setting/mkd');
    return { success: true };
}
