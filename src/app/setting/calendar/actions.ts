'use server';

import { revalidatePath } from 'next/cache';
import { createCalendarConfig, deleteCalendarConfig } from '@/services/calendarService';

export async function addCalendarEventAction(data: {
    configDate: string;
    configType: number;
    timeWarning?: string;
    createBy?: string;
}, token: string) {
    const res = await createCalendarConfig(data, token);
    if (!res || res.status !== 200) {
        return { success: false, message: res?.message || 'Failed to add' };
    }
    revalidatePath('/setting/calendar');
    return { success: true };
}

export async function deleteCalendarEventAction(id: string, deleteBy: string, token: string) {
    const res = await deleteCalendarConfig(id, deleteBy, token);
    if (!res || res.status !== 200) {
        return { success: false, message: res?.message || 'Failed to delete' };
    }
    revalidatePath('/setting/calendar');
    return { success: true };
}
