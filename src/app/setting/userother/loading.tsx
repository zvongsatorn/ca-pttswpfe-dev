'use client';

import React from 'react';
import { Skeleton, Card, Space } from 'antd';

export default function UserOtherLoading() {
    return (
        <div className="w-full p-6">
            <Skeleton active title={{ width: 300 }} paragraph={{ rows: 1 }} />
            <div className="mt-6 flex justify-start">
                <Skeleton.Button active shape="round" />
            </div>
            <Card className="mt-4">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Skeleton active />
                    <Skeleton active />
                    <Skeleton active />
                </Space>
            </Card>
        </div>
    );
}
