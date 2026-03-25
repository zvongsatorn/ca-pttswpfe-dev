'use client';

import React from 'react';
import { Skeleton, Card } from 'antd';

export default function HistoryLoading() {
    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <Skeleton active title={{ width: 300 }} paragraph={false} className="mb-8" />
            <Card className="mb-6 shadow-sm border-slate-200">
                <div className="flex gap-6 items-end">
                    <Skeleton.Input active style={{ width: 140 }} />
                    <Skeleton.Input active style={{ width: 140 }} />
                    <Skeleton.Input active style={{ width: 200 }} />
                    <Skeleton.Button active style={{ width: 120 }} />
                </div>
            </Card>
            <Card className="shadow-sm border-slate-200" bodyStyle={{ padding: 0 }}>
                <Skeleton active paragraph={{ rows: 12 }} className="p-6" />
            </Card>
        </div>
    );
}
