'use client';
import React from 'react';
import { Skeleton, Card } from 'antd';

export default function SecondmentLoading() {
    return (
        <div className="w-full p-6">
            <Skeleton active title={{ width: 350 }} paragraph={{ rows: 1 }} />
            <Card className="mt-8 mb-8">
                <div className="flex gap-4 justify-center py-4">
                    <Skeleton.Button active style={{ width: 120 }} />
                    <Skeleton.Button active style={{ width: 400 }} />
                    <Skeleton.Button active style={{ width: 100 }} />
                </div>
            </Card>
            <div className="flex justify-between items-center mb-6">
                <Skeleton active title={{ width: 250 }} paragraph={false} />
                <Skeleton.Button active style={{ width: 150 }} />
            </div>
            <Card>
                <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
        </div>
    );
}
