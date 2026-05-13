import { buildAuthHeaders, buildUserOtherPath, fetchApi, normalizeApiPath } from '@/utils/security';

const API_URL = '';

const getHeaders = (token?: string) => buildAuthHeaders(token, { 'Content-Type': 'application/json' });

export const getUserOther = async (token?: string) => {
    try {
        const response = await fetchApi(API_URL, normalizeApiPath('/api/users/other'), {
            headers: getHeaders(token)
        });
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching user other:', error);
        return { success: false, message: message };
    }
};

export const insertUserOther = async (employeeId: string, fullName: string, email: string, createBy: string, token?: string) => {
    try {
        const response = await fetchApi(API_URL, normalizeApiPath('/api/users/other'), {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify({ employeeId, fullName, email, createBy })
        });
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error inserting user other:', error);
        return { success: false, message: message };
    }
};

export const updateUserOther = async (employeeId: string, fullName: string, email: string, updateBy: string, token?: string) => {
    try {
        const response = await fetchApi(API_URL, buildUserOtherPath(employeeId),  {
            method: 'PUT',
            headers: getHeaders(token),
            body: JSON.stringify({ fullName, email, updateBy })
        });
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error updating user other:', error);
        return { success: false, message: message };
    }
};

export const deleteUserOther = async (employeeId: string, updateBy: string, token?: string) => {
    try {
        const response = await fetchApi(API_URL, buildUserOtherPath(employeeId, { updateBy }), {
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
