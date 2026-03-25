'use client';
import React from 'react';
import { Skeleton, Card } from 'antd';

export default function DelayLoading() {
    return (
        <div className="w-full p-6 bg-slate-50 min-h-screen">
            <Skeleton active title={{ width: 400 }} paragraph={false} className="mb-8" />
            <Card className="mb-8 border-slate-200 shadow-sm">
                <div className="flex justify-between items-end gap-6">
                    <div className="flex gap-6">
                        <Skeleton.Input active size="large" style={{ width: 150 }} />
                        <Skeleton.Input active size="large" style={{ width: 300 }} />
                    </div>
                    <Skeleton.Button active size="large" style={{ width: 150 }} />
                </div>
            </Card>
            <Card className="border-slate-100 shadow-sm">
                <Skeleton active paragraph={{ rows: 10 }} />
            </Card>
        </div>
    );
}
