import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import MenuRightClient from './MenuRightClient';
import { fetchAllRoles } from '@/services/menuService';

export default async function MenuRightPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';

    // Initial Data Fetching on Server
    const roles = await fetchAllRoles(token) || [];

    return (
        <Main currentPath="/setting">
            <MenuRightClient 
                roles={roles} 
                token={token} 
            />
        </Main>
    );
}
