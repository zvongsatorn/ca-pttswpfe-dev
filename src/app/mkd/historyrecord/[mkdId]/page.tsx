import React from 'react';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import { getMKDDetails, getMasterKeys, getMKDHeadcount } from '@/services/mkdService';
import { App as AntdApp } from 'antd';
import HistoryRecordDetailClient from './HistoryRecordDetailClient';
import Main from '@/components/layout/main';

export default async function HistoryRecordDetailPage({ params }: { params: Promise<{ mkdId: string }> }) {
    const { mkdId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Fetch data on server
    const [detailRes, headcountRes, masterKeysRes] = await Promise.all([
        getMKDDetails(mkdId, token),
        getMKDHeadcount(mkdId, undefined, token),
        getMasterKeys(token)
    ]);

    const initialData = {
        header: detailRes?.data?.header || {},
        keys: detailRes?.data?.keys || [],
        years: detailRes?.data?.years || [],
        files: detailRes?.data?.files || [],
        headcount: headcountRes?.success ? headcountRes.data : { headCounts: [], years: [] }
    };

    const masterKeys = masterKeysRes?.success ? masterKeysRes.data : [];

    return (
        <Main currentPath="/mkd/transaction">
            <AntdApp>
                <HistoryRecordDetailClient 
                    mkdId={mkdId}
                    token={token}
                    currentUser={user}
                    initialData={initialData}
                    masterKeys={masterKeys}
                />
            </AntdApp>
        </Main>
    );
}