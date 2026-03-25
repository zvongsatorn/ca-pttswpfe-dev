import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import ExportPositionClient from './ExportPositionClient';

export default async function ExportPositionPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    return (
        <Main currentPath="/setting">
            <AntdApp>
                <ExportPositionClient 
                    token={token} 
                    currentUser={user} 
                />
            </AntdApp>
        </Main>
    );
}
