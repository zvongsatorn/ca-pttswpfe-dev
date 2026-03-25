'use client';

import React from 'react';
import { Skeleton, Card, Space, Divider } from 'antd';

export default function HistoryRecordDetailLoading() {
    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="max-w-[1600px] mx-auto">
                <Card className="mb-6 shadow-sm border-0 bg-white" bodyStyle={{ padding: '24px' }}>
                    <div className="flex justify-between items-start mb-6">
                        <Space direction="vertical" size={12}>
                            <Skeleton.Input active style={{ width: 400, height: 40 }} />
                            <Space split={<Divider type="vertical" />}>
                                <Skeleton.Input active style={{ width: 200 }} />
                                <Skeleton.Input active style={{ width: 150 }} />
                            </Space>
                        </Space>
                        <Space>
                            <Skeleton.Button active />
                            <Skeleton.Button active />
                        </Space>
                    </div>
                </Card>

                <Card className="shadow-sm border-0">
                    <div className="border-b border-slate-100 bg-slate-50/50 p-2">
                        <Space size={24} className="px-4">
                            <Skeleton.Button active style={{ width: 180 }} />
                            <Skeleton.Button active style={{ width: 120 }} />
                            <Skeleton.Button active style={{ width: 100 }} />
                        </Space>
                    </div>
                    <div className="p-6">
                        <Skeleton active paragraph={{ rows: 15 }} />
                    </div>
                </Card>
            </div>
        </div>
    );
}
