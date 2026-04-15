import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import HistoryClient from './HistoryClient';
import dayjs from 'dayjs';

export default async function HistoryPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Initial Defaults
    const initialMonth = String(dayjs().month() + 1).padStart(2, '0');
    const initialYear = (dayjs().year() + 543).toString();

    return (
        <Main currentPath="/monitor">
            <AntdApp>
                <HistoryClient 
                    token={token} 
                    currentUser={user}
                    initialStartMonth={initialMonth}
                    initialStartYear={initialYear}
                    initialEndMonth={initialMonth}
                    initialEndYear={initialYear}
                />
            </AntdApp>
        </Main>
    );
}
