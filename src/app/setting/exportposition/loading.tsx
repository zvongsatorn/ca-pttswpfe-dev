'use client';
import React from 'react';
import { Skeleton, Card } from 'antd';

export default function ExportPositionLoading() {
    return (
        <div className="w-full p-6 bg-slate-50 min-h-screen">
            <Skeleton active title={{ width: 400 }} paragraph={false} className="mb-8" />
            <Card className="mb-6 shadow-sm border-slate-200 rounded-xl">
                <div className="flex gap-6 items-end">
                    <Skeleton.Input active style={{ width: 240, height: 44 }} />
                    <Skeleton.Button active style={{ width: 140, height: 44 }} />
                    <Skeleton.Button active style={{ width: 160, height: 44 }} />
                </div>
            </Card>
            <Card className="border-slate-200 rounded-xl shadow-sm">
                <Skeleton active paragraph={{ rows: 15 }} />
            </Card>
        </div>
    );
}
