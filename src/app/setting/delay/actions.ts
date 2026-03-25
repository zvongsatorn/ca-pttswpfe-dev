'use server';

import { revalidatePath } from 'next/cache';

// Stubs for future API integration
export async function saveDelayAction(data: any) {
    console.log('Saving delay:', data);
    revalidatePath('/setting/delay');
    return { success: true };
}

export async function deleteDelayAction(id: string) {
    console.log('Deleting delay:', id);
    revalidatePath('/setting/delay');
    return { success: true };
}
