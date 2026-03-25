'use server';

import { revalidatePath } from 'next/cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function serverActionFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${url}`, options);
  if (!res.ok) {
    const err = await res.json();
    return { success: false, message: err.error || 'Request failed' };
  }
  return { success: true, data: await res.json() };
}

export async function addUserToUnitAction(data: { 
  UserGroupNo: string, 
  EmployeeID: string, 
  OrgUnitNo: string, 
  CreateBy: string 
}, token: string) {
  const res = await serverActionFetch('/api/user-rights/add-user-to-unit', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (res.success) revalidatePath('/setting/userright');
  return res;
}

export async function removeUserFromUnitAction(data: { 
  UserGroupNo: string, 
  EmployeeID: string, 
  OrgUnitNo: string, 
  UpdateBy: string 
}, token: string) {
  const res = await serverActionFetch('/api/user-rights/remove-user-from-unit', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (res.success) revalidatePath('/setting/userright');
  return res;
}
