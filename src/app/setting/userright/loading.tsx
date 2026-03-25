'use client';
import React from 'react';
import { Skeleton, Card } from 'antd';

export default function UserRightLoading() {
    return (
        <div className="w-full p-6">
            <Skeleton active title={{ width: 300 }} paragraph={{ rows: 1 }} />
            <div className="flex gap-6 mt-6">
                <Card className="w-1/4">
                    <Skeleton active paragraph={{ rows: 10 }} />
                </Card>
                <Card className="w-3/4 h-[600px]">
                    <Skeleton active paragraph={{ rows: 15 }} />
                </Card>
            </div>
        </div>
    );
}
