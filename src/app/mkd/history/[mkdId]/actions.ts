'use client';

import { 
    saveMainKey, 
    saveDetailKey, 
    deleteMainKey, 
    uploadMKDFile, 
    deleteMKDFile,
    updateManDriverStatus,
    requestApproveMKD,
    updateMKDNote
} from '@/services/mkdService';
import { revalidatePath } from 'next/cache';

export async function saveMainKeyAction(id: string, data: any, token: string) {
    const res = await saveMainKey(id, data, token);
    return res;
}

export async function saveDetailKeyAction(id: string, data: any, token: string) {
    const res = await saveDetailKey(id, data, token);
    return res;
}

export async function deleteMainKeyAction(id: string, keyId: string, token: string) {
    const res = await deleteMainKey(id, keyId, token);
    return res;
}

export async function updateStatusAction(id: string, status: number, user: string, token: string) {
    const res = await updateManDriverStatus(id, status, user, token);
    return res;
}

export async function requestApproveAction(id: string, user: string, token: string) {
    const res = await requestApproveMKD(id, user, token);
    return res;
}

export async function updateNoteAction(id: string, note: string, token: string) {
    const res = await updateMKDNote(id, note, token);
    return res;
}
