import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import PIRClient from './PIRClient';
import { fetchAllUnits } from '@/services/userRightService';

export default async function PIRPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Initial Data Fetching on Server (Units)
    const unitsData = await fetchAllUnits(token);
    const initialUnits = Array.isArray(unitsData) ? unitsData.map((u: any) => ({
        value: u.OrgUnitNo || u.id,
        label: u.UnitText || u.unitText || u.name || u.OrgUnitNo || u.id
    })) : [];

    return (
        <Main currentPath="/setting">
            <AntdApp>
                <PIRClient 
                    token={token} 
                    currentUser={user} 
                    initialUnits={initialUnits}
                />
            </AntdApp>
        </Main>
    );
}
