'use client';
import React from 'react';
import { Skeleton, Card } from 'antd';

export default function MKDLoading() {
    return (
        <div className="w-full p-6 bg-slate-50 min-h-screen">
            <Skeleton active title={{ width: 400 }} paragraph={false} className="mb-8" />
            <div className="max-w-4xl mx-auto">
                <Card className="mb-6 border-slate-200">
                    <div className="flex justify-between items-end">
                        <Skeleton.Button active style={{ width: 150, height: 48 }} />
                        <div className="flex gap-3">
                            <Skeleton.Input active style={{ width: 240, height: 48 }} />
                            <Skeleton.Button active style={{ width: 100, height: 48 }} />
                            <Skeleton.Button active style={{ width: 100, height: 48 }} />
                        </div>
                    </div>
                </Card>
                <Card className="border-slate-200">
                    <Skeleton active paragraph={{ rows: 12 }} />
                </Card>
            </div>
        </div>
    );
}
