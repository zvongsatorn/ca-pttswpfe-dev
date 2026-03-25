import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import SecondmentClient from './SecondmentClient';
import { getParentUnits, getUnitCombo } from '@/services/secondmentService';

export default async function SecondmentPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Initial Data Fetching on Server
    const [parentsRes, allUnitsRes] = await Promise.all([
        getParentUnits(token),
        getUnitCombo(undefined, undefined, token)
    ]);

    const initialData = {
        parentUnits: parentsRes?.data || [],
        allUnits: allUnitsRes?.data || []
    };

    return (
        <Main currentPath="/setting">
            <AntdApp>
                <SecondmentClient 
                    initialData={initialData} 
                    token={token} 
                    currentUser={user} 
                />
            </AntdApp>
        </Main>
    );
}
