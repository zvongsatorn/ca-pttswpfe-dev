const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const getUserOther = async () => {
    try {
        const response = await fetch(`${API_URL}/api/users/other`);
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching user other:', error);
        return { success: false, message: message };
    }
};

export const insertUserOther = async (employeeId: string, fullName: string, createBy: string) => {
    try {
        const response = await fetch(`${API_URL}/api/users/other`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, fullName, createBy })
        });
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error inserting user other:', error);
        return { success: false, message: message };
    }
};

export const deleteUserOther = async (employeeId: string, updateBy: string) => {
    try {
        const response = await fetch(`${API_URL}/api/users/other/${employeeId}?updateBy=${updateBy}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error deleting user other:', error);
        return { success: false, message: message };
    }
};
