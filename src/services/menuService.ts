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

export const fetchAllRoles = async (token?: string) => {
    return await fetchWithAuth('/api/usergroup', token);
};

export const fetchMenuRightsByRole = async (role: string, token?: string) => {
    return await fetchWithAuth(`/api/menu/rights/${role}`, token);
};
