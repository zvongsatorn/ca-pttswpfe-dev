import { buildAuthHeaders, fetchApi } from '@/utils/security';

const API_BASE_URL = '';

export interface CalendarConfig {
    id: number | string;
    resourceId: number;
    start: string;
    end?: string;
    title?: string;
    color?: string;
}

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

export const getCalendarConfigs = async (token?: string) => {
    return await fetchWithAuth('/api/calendar', token);
};

export const createCalendarConfig = async (data: {
    configDate: string;
    configType: number;
    timeWarning?: string;
    createBy?: string;
}, token?: string) => {
    return await fetchWithAuth('/api/calendar', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};

export const deleteCalendarConfig = async (id: string, deleteBy: string, token?: string) => {
    return await fetchWithAuth(`/api/calendar/${id}?deleteBy=${deleteBy}`, token, {
        method: 'DELETE'
    });
};

export const checkCalendarDuplicate = async (month: number, year: string, type: number, token?: string) => {
    return await fetchWithAuth(`/api/calendar/check?month=${month}&year=${year}&type=${type}`, token);
};
