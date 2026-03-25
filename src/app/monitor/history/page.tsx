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
    const months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const initialMonth = months[dayjs().month()];
    const initialYear = (dayjs().year() + 543).toString();

    // In a real app, we would fetch units here
    const initialUnits = [
        { value: 'ALL', label: 'ทั้งหมด' }
    ];

    return (
        <Main currentPath="/monitor">
            <AntdApp>
                <HistoryClient 
                    token={token} 
                    currentUser={user}
                    initialUnits={initialUnits}
                    initialStartMonth={initialMonth}
                    initialStartYear={initialYear}
                    initialEndMonth={initialMonth}
                    initialEndYear={initialYear}
                />
            </AntdApp>
        </Main>
    );
}
