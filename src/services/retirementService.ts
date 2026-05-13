import { buildAuthHeaders, fetchApi, normalizeApiPath } from '@/utils/security';

const API_BASE_URL = '';

async function fetchWithAuth(url: string, token?: string, options: RequestInit = {}) {
    const safeUrl = normalizeApiPath(url);
    const res = await fetchApi(API_BASE_URL, safeUrl, {
        ...options,
        headers: buildAuthHeaders(token, options.headers),
    });

    if (!res.ok) {
        console.error(`Fetch failed: ${safeUrl}`, res.statusText);
        return null;
    }
    return res.json();
}

export const fetchRetirementRates = async (effectiveYear: number, token?: string) => {
    return await fetchWithAuth(`/api/retirement?effectiveYear=${effectiveYear}`, token);
};

export const copyRetirementRates = async (fromYear: number, toYear: number, user: string, token?: string) => {
    return await fetchWithAuth('/api/retirement/copy', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromYear, toYear, user })
    });
};
