'use server';

import { revalidatePath } from 'next/cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function saveRetirementRatesAction(data: {
    effectiveYear: number,
    rates: Array<{ year: number, rate: number }>,
    remark: string,
    user: string
}, token: string) {
    const res = await fetch(`${API_BASE_URL}/api/retirement`, {
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

    revalidatePath('/setting/retirement');
    return { success: true };
}

export async function copyRetirementRatesAction(data: {
    fromYear: number,
    toYear: number,
    user: string
}, token: string) {
    const res = await fetch(`${API_BASE_URL}/api/retirement/copy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json();
        return { success: false, message: err.error || 'Failed to copy' };
    }

    revalidatePath('/setting/retirement');
    return { success: true };
}
