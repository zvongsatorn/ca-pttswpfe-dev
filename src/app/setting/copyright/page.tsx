import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { App as AntdApp } from 'antd';
import CopyrightClient from './CopyrightClient';
import { fetchUserGroups } from '@/services/userRightService';

export default async function CopyrightPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Initial Data Fetching on Server (User Groups)
    const groupsRes = await fetchUserGroups(token);
    let initialUserGroups = [];
    
    if (Array.isArray(groupsRes)) {
        // Legacy filtering logic: if current user role is "07", filter out "04" and "01"
        // (Assuming you want to keep this logic from the original page)
        let filtered = groupsRes;
        if (user?.userGroupNo === "07") {
            filtered = groupsRes.filter((g: any) => g.userGroupNo !== '04' && g.userGroupNo !== '01');
        }
        initialUserGroups = filtered.map((g: any) => ({ value: g.userGroupNo, label: g.userGroupName }));
    }

    return (
        <Main currentPath="/setting">
            <AntdApp>
                <CopyrightClient 
                    initialUserGroups={initialUserGroups} 
                    token={token} 
                    currentUser={user} 
                />
            </AntdApp>
        </Main>
    );
}
