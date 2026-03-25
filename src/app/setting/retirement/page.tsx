import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import RetirementClient from './RetirementClient';
import { fetchRetirementRates } from '@/services/retirementService';

export default async function RetirementPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Initial Data Fetching on Server (Default year 2569 -> 2026)
    const initialRes = await fetchRetirementRates(2026, token);
    const initialData = {
        rates: initialRes?.data?.rates || [],
        remark: initialRes?.data?.remark || ''
    };

    return (
        <Main currentPath="/setting">
            <AntdApp>
                <RetirementClient 
                    initialData={initialData} 
                    token={token} 
                    currentUser={user} 
                />
            </AntdApp>
        </Main>
    );
}
