'use client';
import React from 'react';
import { Skeleton, Card } from 'antd';

export default function MenuRightLoading() {
    return (
        <div className="w-full p-6">
            <Skeleton active title={{ width: 300 }} paragraph={{ rows: 1 }} />
            <Card className="mt-6 mb-6">
                <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
            <Card>
                <Skeleton active paragraph={{ rows: 10 }} />
            </Card>
        </div>
    );
}
