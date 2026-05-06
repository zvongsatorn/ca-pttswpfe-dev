import { buildAuthHeaders, fetchApi } from '@/utils/security';

const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const res = await fetchApi(API_BASE_URL, url, {
        ...options,
        headers: buildAuthHeaders(token, options.headers),
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
