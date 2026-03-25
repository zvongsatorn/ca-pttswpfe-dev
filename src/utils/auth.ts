import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    id: string;
    role: string;
    groups: { userGroupNo: string, userGroupName: string, userGroupRole: string }[];
    name: string;
    email: string;
    position: string;
    orgUnit: string;
    exp: number;
    iat: number;
}

export function getUserFromToken(token?: string) {
    if (typeof window === 'undefined') return null;

    if (!token) {
        // Try to get from cookie first
        const cookieMatch = document.cookie.match(/(?:^|; )auth_token=([^;]*)/);
        token = cookieMatch ? cookieMatch[1] : (localStorage.getItem('auth_token') || undefined);
    }

    if (!token) return null;

    try {
        const decoded = jwtDecode<DecodedToken>(token);

        return {
            employeeID: decoded.id,
            name: decoded.name,
            email: decoded.email,
            position: decoded.position,
            orgUnit: decoded.orgUnit,
            userGroups: decoded.groups || [],
            role: decoded.role
        };
    } catch (error) {
        console.error("Invalid token:", error);
        return null;
    }
}

export function getAuthToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}
