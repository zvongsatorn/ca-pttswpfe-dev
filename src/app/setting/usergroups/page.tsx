import React from 'react';
import Main from '@/components/layout/main';
import { App } from 'antd';
import { cookies } from 'next/headers';
import { getUserGroups, UserGroup } from '@/services/userGroupService';
import { getUserFromToken } from '@/utils/auth';
import UserGroupsClient from './UserGroupsClient';

export default async function UserGroupsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    
    // Fetch user groups on server
    const res = await getUserGroups(token);
    
    // Get current user info for filtering
    const user = getUserFromToken(token);
    const currentUser = {
        employeeID: user?.employeeID || '',
        userGroupNo: user?.userGroups?.[0]?.userGroupNo || ''
    };

    let filteredGroups: UserGroup[] = [];
    if (res.success && Array.isArray(res.data)) {
        filteredGroups = res.data;
        // Apply legacy filtering logic
        if (currentUser.userGroupNo === "07") {
            filteredGroups = res.data.filter((g: UserGroup) => g.userGroupNo !== "01" && g.userGroupNo !== "04");
        }
    }

    return (
        <Main currentPath="/setting">
            <App>
                <UserGroupsClient 
                    initialUserGroups={filteredGroups} 
                    currentUser={currentUser}
                    token={token}
                />
            </App>
        </Main>
    );
}
