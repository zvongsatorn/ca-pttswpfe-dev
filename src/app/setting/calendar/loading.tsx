'use client';
import React from 'react';
import { Skeleton, Card } from 'antd';

export default function CalendarLoading() {
    return (
        <div className="w-full p-6 bg-slate-50 min-h-screen">
            <Skeleton active title={{ width: 400 }} paragraph={false} className="mb-8" />
            <Card className="shadow-lg border-slate-200 rounded-2xl p-0 overflow-hidden">
                <div className="p-4 border-b flex justify-between">
                    <Skeleton.Input active style={{ width: 300 }} />
                    <div className="flex gap-3">
                        <Skeleton.Input active style={{ width: 120 }} />
                        <Skeleton.Input active style={{ width: 160 }} />
                    </div>
                </div>
                <div className="p-4 grid grid-cols-7 gap-px bg-slate-100">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="bg-white h-[140px] p-2">
                            <Skeleton active title={{ width: 20 }} paragraph={{ rows: 2 }} />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
