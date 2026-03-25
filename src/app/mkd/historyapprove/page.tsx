import React from 'react';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { getStartYear } from '@/services/mkdService';
import { App as AntdApp } from 'antd';
import HistoryApproveClient from './HistoryApproveClient';
import Main from '@/components/layout/main';

export default async function HistoryApprovePage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Fetch initial data
    const startYearRes = await getStartYear(token);
    const startYear = startYearRes?.success ? parseInt(startYearRes.data) : (dayjs().year() + 543 - 5);
    
    const currentYear = new Date().getFullYear() + 543;
    const availableYears: string[] = [];
    for (let y = currentYear + 1; y >= startYear; y--) {
        availableYears.push(y.toString());
    }

    // Fetch units (server-side fetch from own API)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const unitsRes = await fetch(`${baseUrl}/api/units/all?effectiveDate=${new Date().toISOString().split('T')[0]}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const unitsData = await unitsRes.json();
    const availableUnits = unitsData.success ? unitsData.data : [];

    return (
        <Main currentPath="/mkd/transaction">
            <AntdApp>
                <HistoryApproveClient 
                    token={token}
                    currentUser={user}
                    initialYears={availableYears}
                    initialUnits={availableUnits}
                />
            </AntdApp>
        </Main>
    );
}

// Helper for date (next/headers doesn't have dayjs by default, but we can import it)
import dayjs from 'dayjs';
