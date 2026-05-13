'use client';

import React from 'react';
import { Skeleton, Card, Space } from 'antd';

export default function HistoryRecordLoading() {
    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="max-w-[1400px] mx-auto">
                {/* Header Skeleton */}
                <Card className="mb-6 shadow-sm border-0 bg-blue-600" styles={{ body: { padding: '20px' } }}>
                    <div className="flex justify-between items-center">
                        <Skeleton.Input active style={{ width: 400, height: 32 }} />
                        <Skeleton.Button active style={{ width: 140, height: 40 }} />
                    </div>
                </Card>

                {/* Filter Skeleton */}
                <Card className="mb-6 shadow-sm border-0" styles={{ body: { padding: '20px' } }}>
                    <Space size={24} align="end">
                        <Space orientation="vertical" size={4}>
                            <Skeleton.Input active style={{ width: 200 }} />
                        </Space>
                        <Skeleton.Button active style={{ width: 120, height: 40 }} />
                    </Space>
                </Card>

                {/* Table Skeleton */}
                <Card className="shadow-sm border-0" styles={{ body: { padding: 0 } }}>
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                        <Skeleton.Input active style={{ width: '100%' }} />
                    </div>
                    <div className="p-6">
                        <Skeleton active paragraph={{ rows: 12 }} />
                    </div>
                </Card>
            </div>
        </div>
    );
}
