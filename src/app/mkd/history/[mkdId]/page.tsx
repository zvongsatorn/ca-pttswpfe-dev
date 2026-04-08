import React from 'react';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { getMKDDetails, getMasterKeys } from '@/services/mkdService';
import Main from '@/components/layout/main';
import MKDDetailClient from './MKDDetailClient';

export default async function MKDDetailPage({ params }: { params: Promise<{ mkdId: string }> }) {
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
        files: [],
        summary: []
    };

    const masterKeys = masterKeysRes?.success ? masterKeysRes.data : [];

    return (
        <Main currentPath="/mkd/transaction">
            <MKDDetailClient 
                mkdId={mkdId}
                token={token}
                currentUser={user}
                initialData={initialData}
                masterKeys={masterKeys}
            />
        </Main>
    );
}