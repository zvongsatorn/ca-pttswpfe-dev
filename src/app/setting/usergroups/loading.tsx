'use client';
import React from 'react';
import { Skeleton, Card, Space } from 'antd';

export default function UserGroupsLoading() {
    return (
        <div className="w-full p-6">
            <Skeleton active title={{ width: 300 }} paragraph={{ rows: 1 }} />
            <Card className="mt-6">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Skeleton active />
                    <Skeleton active />
                    <Skeleton active />
                    <Skeleton active />
                    <Skeleton active />
                </Space>
            </Card>
        </div>
    );
}
