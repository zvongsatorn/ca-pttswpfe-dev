'use server';

import { revalidatePath } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function serverActionFetch(url: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${url}`, options);
    if (!response.ok) {
        const message = await response.text();
        return { success: false, message: message || 'Request failed' };
    }
    return { success: true, data: await response.json() };
}

export async function addLevelAction(userGroupNo: string, levelGroupNo: string, createBy: string, token: string) {
    const res = await serverActionFetch('/api/usergroup/level', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ UserGroupNo: userGroupNo, LevelGroupNo: levelGroupNo, CreateBy: createBy })
    });
    if (res.success) revalidatePath('/setting/usergroups');
    return res;
}

export async function deleteLevelAction(userGroupNo: string, levelGroupNo: string, updateBy: string, token: string) {
    const res = await serverActionFetch('/api/usergroup/delete-level', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ UserGroupNo: userGroupNo, LevelGroupNo: levelGroupNo, UpdateBy: updateBy })
    });
    if (res.success) revalidatePath('/setting/usergroups');
    return res;
}

export async function addMemberAction(userGroupNo: string, employeeId: string, createBy: string, token: string) {
    const res = await serverActionFetch('/api/usergroup/member', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ UserGroupNo: userGroupNo, EmployeeID: employeeId, CreateBy: createBy })
    });
    if (res.success) revalidatePath('/setting/usergroups');
    return res;
}

export async function deleteMemberAction(userGroupNo: string, employeeId: string, updateBy: string, token: string) {
    const res = await serverActionFetch('/api/usergroup/delete-member', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ UserGroupNo: userGroupNo, EmployeeID: employeeId, UpdateBy: updateBy })
    });
    if (res.success) revalidatePath('/setting/usergroups');
    return res;
}
