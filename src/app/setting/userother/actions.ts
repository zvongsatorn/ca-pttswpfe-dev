'use server';

import { revalidatePath } from 'next/cache';
import { insertUserOther, deleteUserOther } from '@/services/userService';

export async function addUserAction(employeeId: string, fullName: string, createBy: string) {
    try {
        const res = await insertUserOther(employeeId, fullName, createBy);
        if (res.success) {
            revalidatePath('/setting/userother');
        }
        return res;
    } catch (error) {
        console.error('Server Action Error (addUser):', error);
        return { success: false, message: 'Internal Server Error' };
    }
}

export async function deleteUserAction(employeeId: string, updateBy: string) {
    try {
        const res = await deleteUserOther(employeeId, updateBy);
        if (res.success) {
            revalidatePath('/setting/userother');
        }
        return res;
    } catch (error) {
        console.error('Server Action Error (deleteUser):', error);
        return { success: false, message: 'Internal Server Error' };
    }
}
