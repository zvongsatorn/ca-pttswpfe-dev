'use client';
import React from 'react';
import { Skeleton, Card, Tabs } from 'antd';

export default function PIRLoading() {
    return (
        <div className="w-full p-6 bg-slate-50 min-h-screen">
            <Skeleton active title={{ width: 400 }} paragraph={false} className="mb-8" />
            <Card className="mb-6 shadow-sm border-slate-200">
                <div className="flex gap-6 items-end flex-wrap">
                    <Skeleton.Input active style={{ width: 180, height: 44 }} />
                    <Skeleton.Input active style={{ width: 400, height: 44 }} />
                    <Skeleton.Button active style={{ width: 120, height: 44 }} />
                    <Skeleton.Button active style={{ width: 140, height: 44 }} />
                </div>
            </Card>
            <Card className="shadow-sm border-slate-200">
                <Tabs
                    items={[
                        { key: '1', label: 'Rate', children: <Skeleton active paragraph={{ rows: 10 }} /> },
                        { key: '2', label: 'File', children: null },
                        { key: '3', label: 'Remark', children: null }
                    ]}
                />
            </Card>
        </div>
    );
}
