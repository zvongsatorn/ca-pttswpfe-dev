const API_URL = '/api';

const getHeaders = (token?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

export const getUserOther = async (token?: string) => {
    try {
        const response = await fetch(`${API_URL}/api/users/other`, {
            headers: getHeaders(token)
        });
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching user other:', error);
        return { success: false, message: message };
    }
};

export const insertUserOther = async (employeeId: string, fullName: string, createBy: string, token?: string) => {
    try {
        const response = await fetch(`${API_URL}/api/users/other`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify({ employeeId, fullName, createBy })
        });
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error inserting user other:', error);
        return { success: false, message: message };
    }
};

export const deleteUserOther = async (employeeId: string, updateBy: string, token?: string) => {
    try {
        const response = await fetch(`${API_URL}/api/users/other/${employeeId}?updateBy=${updateBy}`, {
            method: 'DELETE',
            headers: getHeaders(token)
        });
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error deleting user other:', error);
        return { success: false, message: message };
    }
};
