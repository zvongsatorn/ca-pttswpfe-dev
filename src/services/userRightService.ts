const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            ...authHeader,
        },
    });

    if (!res.ok) {
        console.error(`Fetch failed: ${url}`, res.statusText);
        return null;
    }
    return res.json();
}

export const fetchUserGroups = async (token?: string) => {
    return await fetchWithAuth('/api/usergroup', token);
};

export const fetchAllUnits = async (token?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const data = await fetchWithAuth(`/api/units/all?effectiveDate=${today}`, token);
    return data?.data || data || [];
};

export const fetchAllEmployees = async (token?: string) => {
    return await fetchWithAuth('/api/usergroup/all-users', token);
};

export const fetchBGCombo = async (month: string, year: string, token?: string) => {
    return await fetchWithAuth(`/api/user-rights/combo/bg?effectiveMonth=${month}&effectiveYear=${year}`, token);
};

export const fetchOrgUnitsInGroup = async (userGroupNo: string, token?: string) => {
    return await fetchWithAuth(`/api/user-rights/org-unit?userGroupNo=${userGroupNo}`, token);
};

export const fetchUserGroupMembers = async (userGroupNo: string, token?: string) => {
    return await fetchWithAuth(`/api/usergroup/members?userGroupNo=${userGroupNo}`, token);
};

export const fetchLineCombo = async (month: string, year: string, token?: string) => {
    return await fetchWithAuth(`/api/user-rights/combo/line?effectiveMonth=${month}&effectiveYear=${year}`, token);
};

export const copyOrgRights = async (data: {
    UserGroupNo: string;
    EmployeeIDFrom: string;
    EmployeeIDTo: string;
    CreateBy: string;
}, token?: string) => {
    return await fetchWithAuth('/api/user-rights/copy-org', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};
