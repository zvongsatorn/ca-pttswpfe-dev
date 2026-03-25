import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import CalendarClient from './CalendarClient';
import { getCalendarConfigs } from '@/services/calendarService';

export default async function CalendarPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Initial Data Fetching on Server
    const res = await getCalendarConfigs(token);
    const initialEvents = res?.status === 200 ? res.data : [];

    return (
        <Main currentPath="/setting">
            <AntdApp>
                <CalendarClient 
                    initialEvents={initialEvents} 
                    token={token} 
                    currentUser={user} 
                />
            </AntdApp>
        </Main>
    );
}
