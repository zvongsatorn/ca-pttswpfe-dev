import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import TrackingClient from './TrackingClient';
import dayjs from 'dayjs';

export default async function UserTrackingPage() {
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

    return (
        <Main currentPath="/monitor">
            <AntdApp>
                <TrackingClient 
                    token={token} 
                    currentUser={user}
                    initialMonth={initialMonth}
                    initialYear={initialYear}
                />
            </AntdApp>
        </Main>
    );
}
