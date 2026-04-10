const API_URL = '';

export interface UserGroup {
    userGroupNo: string;
    userGroupName: string;
    userGroupRole: string;
    levelFlag: number;
    chkuser: number;
}

export interface Level {
    levelGroupNo: string;
    nameAll: string;
}

export interface Member {
    employeeID: string;
    nameAll: string;
    userGroupNo: string;
}

export interface UserCombo {
    label: string;
    value: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    // Note: Since this will be used in Server Components as well, 
    // we might need to handle headers differently if cookies are used.
    // For now, we assume standard fetch.
    const response = await fetch(`${API_URL}${url}`, options);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Request failed');
    }
    return response.json();
}

export const getUserGroups = async (token?: string) => {
    try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${API_URL}/api/usergroup`, { headers });
        if (!response.ok) return { success: false, message: 'Failed to fetch' };
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('getUserGroups Error:', error);
        return { success: false, message: 'Internal Error' };
    }
};

export const getLevelsInGroup = async (userGroupNo: string, levelFlag: number, token?: string) => {
    try {
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        return await fetchWithAuth(`/api/usergroup/levels?userGroupNo=${userGroupNo}&levelFlag=${levelFlag}`, { headers });
    } catch {
        return [];
    }
};

export const getLevelCombo = async (userGroupNo: string, levelFlag: number, token?: string) => {
    try {
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        return await fetchWithAuth(`/api/usergroup/level-combo?levelFlag=${levelFlag}&userGroupNo=${userGroupNo}`, { headers });
    } catch {
        return [];
    }
};

export const getMembersInGroup = async (userGroupNo: string, token?: string) => {
    try {
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        return await fetchWithAuth(`/api/usergroup/members?userGroupNo=${userGroupNo}`, { headers });
    } catch {
        return [];
    }
};

export const getAllUsersCombo = async (token?: string) => {
    try {
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        const data = await fetchWithAuth(`/api/usergroup/all-users`, { headers });
        return data.map((u: { employeeID?: string; EmployeeID?: string; nameAll?: string; NameAll?: string }) => ({
            label: `${u.employeeID || u.EmployeeID} : ${u.nameAll || u.NameAll || ''}`,
            value: String(u.employeeID || u.EmployeeID)
        }));
    } catch {
        return [];
    }
};
