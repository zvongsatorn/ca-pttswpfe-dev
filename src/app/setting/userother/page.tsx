import React from 'react';
import Main from '@/components/layout/main';
import { App } from 'antd';
import { getUserOther } from '@/services/userService';
import UserOtherClient from './UserOtherClient';

export default async function UserOtherPage() {
    // Fetch data on the server
    const res = await getUserOther();
    
    let initialData = [];
    if (res.success && Array.isArray(res.data)) {
        initialData = res.data.map((item: { EmployeeID?: string; FullName?: string }, index: number) => ({
            ...item,
            key: item.EmployeeID || `row-${index}`
        }));
    }

    return (
        <Main currentPath="/setting">
            <App>
                <UserOtherClient initialData={initialData} />
            </App>
        </Main>
    );
}
