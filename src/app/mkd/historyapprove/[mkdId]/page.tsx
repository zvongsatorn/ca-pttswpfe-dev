import React from 'react';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { getMKDDetails, getMasterKeys } from '@/services/mkdService';
import HistoryApproveDetailClient from './HistoryApproveDetailClient';
import Main from '@/components/layout/main';

export default async function HistoryApproveDetailPage({ params }: { params: Promise<{ mkdId: string }> }) {
    const { mkdId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Fetch data on server
    const [detailRes, masterKeysRes] = await Promise.all([
        getMKDDetails(mkdId, token),
        getMasterKeys(token)
    ]);

    const initialData = detailRes?.success ? detailRes.data : {
        header: {},
        keys: [],
        years: [],
        files: []
    };

    const masterKeys = masterKeysRes?.success ? masterKeysRes.data : [];

    return (
        <Main currentPath="/mkd/transaction">
            <HistoryApproveDetailClient 
                mkdId={mkdId}
                token={token}
                currentUser={user}
                initialData={initialData}
                masterKeys={masterKeys}
            />
        </Main>
    );
}
