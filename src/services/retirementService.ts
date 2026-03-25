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
