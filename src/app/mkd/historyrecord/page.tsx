import React from 'react';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { getStartYear } from '@/services/mkdService';
import { App as AntdApp } from 'antd';
import HistoryRecordClient from './HistoryRecordClient';
import Main from '@/components/layout/main';
import dayjs from 'dayjs';

export default async function HistoryRecordPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Fetch start year
    const startYearRes = await getStartYear(token);
    const startYear = startYearRes?.success ? parseInt(startYearRes.data) : (dayjs().year() + 543 - 5);
    
    const currentYear = dayjs().year() + 543;
    const availableYears: string[] = [];
    for (let y = currentYear + 1; y >= startYear; y--) {
        availableYears.push(y.toString());
    }

    return (
        <Main currentPath="/mkd/transaction">
            <AntdApp>
                <HistoryRecordClient 
                    token={token}
                    currentUser={user}
                    initialYears={availableYears}
                />
            </AntdApp>
        </Main>
    );
}