'use client';

import React from 'react';
import { Skeleton, Card, Space, Divider } from 'antd';

export default function HistoryApproveLoading() {
    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Search Card Skeleton */}
                <Card className="mb-6 shadow-sm border-0" styles={{ body: { padding: '20px' } }}>
                    <Skeleton.Input active style={{ width: 400, height: 32 }} className="mb-6" />
                    <div className="flex flex-wrap gap-6 items-end">
                        <Space orientation="vertical" size={4}>
                            <Skeleton.Input active style={{ width: 400 }} />
                        </Space>
                        <Space orientation="vertical" size={4}>
                            <Skeleton.Input active style={{ width: 150 }} />
                        </Space>
                        <Skeleton.Button active style={{ width: 120, height: 40 }} />
                    </div>
                </Card>

                {/* Table Card Skeleton */}
                <Card className="shadow-sm border-0 overflow-hidden" styles={{ body: { padding: 0 } }}>
                    <div className="p-4 bg-slate-100/50 border-b border-slate-200">
                        <Skeleton.Input active style={{ width: 250 }} />
                    </div>
                    <div className="p-2 border-b border-blue-50">
                         <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-1" />
                            {[1, 2, 3, 4, 5, 2].map((w, i) => (
                                <div key={i} className={`col-span-${w}`}>
                                    <Skeleton.Input active block size="small" />
                                </div>
                            ))}
                         </div>
                    </div>
                    <div className="p-6">
                        <Skeleton active paragraph={{ rows: 12 }} />
                    </div>
                </Card>
            </div>
        </div>
    );
}
