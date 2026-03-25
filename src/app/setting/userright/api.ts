const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.warn('No auth_token found in localStorage');
  }
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function fetchUserGroups() {
  const res = await fetch(`${API_BASE_URL}/api/usergroup`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch user groups');
  return res.json();
}

export async function fetchAllUnits() {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch(`${API_BASE_URL}/api/units/all?effectiveDate=${today}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch units');
  const result = await res.json();
  return result.data || result;
}

export async function fetchOrgUnitsInGroup(userGroupNo: string) {
  const res = await fetch(`${API_BASE_URL}/api/user-rights/org-unit?userGroupNo=${userGroupNo}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch org units for group');
  return res.json();
}

export async function fetchUsersByOrgUnit(orgUnitNo: string) {
  const res = await fetch(`${API_BASE_URL}/api/user-rights/unit-users?orgUnitNo=${orgUnitNo}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch users by org unit');
  return res.json();
}

export async function fetchUsersInUnit(userGroupNo: string, employeeId: string) {
  const res = await fetch(`${API_BASE_URL}/api/user-rights/users-in-unit?userGroupNo=${userGroupNo}&employeeId=${employeeId}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch users in unit');
  return res.json();
}

export async function fetchAllEmployees() {
  const res = await fetch(`${API_BASE_URL}/api/usergroup/all-users`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch all employees');
  return res.json();
}

export async function addUserToUnit(data: { UserGroupNo: string, EmployeeID: string, OrgUnitNo: string, CreateBy: string }) {
  const res = await fetch(`${API_BASE_URL}/api/user-rights/add-user-to-unit`, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader()
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add user to unit');
  }
  return res.json();
}

export async function removeUserFromUnit(data: { UserGroupNo: string, EmployeeID: string, OrgUnitNo: string, UpdateBy: string }) {
  const res = await fetch(`${API_BASE_URL}/api/user-rights/remove-user-from-unit`, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader()
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to remove user from unit');
  }
  return res.json();
}

// Combos
export async function fetchBGCombo(month: string, year: string) {
  const res = await fetch(`${API_BASE_URL}/api/user-rights/combo/bg?effectiveMonth=${month}&effectiveYear=${year}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch BG combo');
  return res.json();
}

export async function fetchOrgUnitBelongCombo(employeeId: string) {
  const res = await fetch(`${API_BASE_URL}/api/user-rights/combo/org-unit-belong?employeeId=${employeeId}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch unit belong combo');
  return res.json();
}
