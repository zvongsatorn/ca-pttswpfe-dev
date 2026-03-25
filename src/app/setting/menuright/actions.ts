'use server';

import { revalidatePath } from 'next/cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function toggleMenuRightAction(data: {
    userGroupRole: string,
    menuID: number,
    hasRight: boolean
}, token: string) {
    const res = await fetch(`${API_BASE_URL}/api/menu/rights`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json();
        return { success: false, message: err.error || 'Failed to save' };
    }

    revalidatePath('/setting/menuright');
    return { success: true };
}
