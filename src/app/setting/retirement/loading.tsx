'use client';
import React from 'react';
import { Skeleton, Card } from 'antd';

export default function RetirementLoading() {
    return (
        <div className="w-full p-6">
            <Skeleton active title={{ width: 400 }} paragraph={{ rows: 1 }} />
            <div className="flex gap-4 mt-8 mb-8">
                <Skeleton.Button active style={{ width: 120 }} />
                <Skeleton.Button active style={{ width: 100 }} />
            </div>
            <Card className="mb-8">
                <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
            <Card>
                <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
        </div>
    );
}
