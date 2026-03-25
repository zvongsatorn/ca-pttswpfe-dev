'use client';
import React from 'react';
import { Skeleton, Card, Divider } from 'antd';

export default function CopyrightLoading() {
    return (
        <div className="w-full p-6 bg-slate-50 min-h-screen">
            <Skeleton active title={{ width: 400 }} paragraph={false} className="mb-8" />
            <Card className="max-w-4xl mx-auto border-slate-200 shadow-sm">
                <div className="p-8">
                    <Skeleton active paragraph={{ rows: 2 }} className="mb-10" />
                    <Divider />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
                        <Skeleton active paragraph={{ rows: 2 }} />
                        <Skeleton active paragraph={{ rows: 2 }} />
                    </div>
                    <div className="flex justify-center mt-12">
                        <Skeleton.Button active style={{ width: 250, height: 56, borderRadius: 16 }} />
                    </div>
                </div>
            </Card>
        </div>
    );
}
