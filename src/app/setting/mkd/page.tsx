import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import MKDClient from './MKDClient';
import { getMasterKeys } from '@/services/mkdService';

export default async function MKDSettingPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Initial Data Fetching on Server
    const res = await getMasterKeys(token);
    const initialData = res?.success ? res.data.map((item: any, index: number) => ({
        key: item.KeyManID.toString(),
        no: index + 1,
        driver: item.KeyManName,
        chkuse: item.chkuse
    })) : [];

    return (
        <Main currentPath="/setting">
            <AntdApp>
                <MKDClient 
                    initialData={initialData} 
                    token={token} 
                    currentUser={user} 
                />
            </AntdApp>
        </Main>
    );
}
