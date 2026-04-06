'use client';

import React, { useState } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';

// --- Type Definitions ---
interface LogYearlyDataType {
    key: string;
    month: string;
    level_21: number;
    level_18_20: number;
    level_16_17: number;
    level_14_15: number;
    level_11_13: number;
    level_9_10: number;
    level_4_8: number;
    total: number;
    contract: number;
    contract_sub: number;
}

// --- Mock Data ---
const generateMockData = (): LogYearlyDataType[] => {
    const months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    return months.map((month, index) => ({
        key: index.toString(),
        month: month,
        level_21: Math.floor(Math.random() * 10),
        level_18_20: Math.floor(Math.random() * 20),
        level_16_17: Math.floor(Math.random() * 30),
        level_14_15: Math.floor(Math.random() * 40),
        level_11_13: Math.floor(Math.random() * 50),
        level_9_10: Math.floor(Math.random() * 60),
        level_4_8: Math.floor(Math.random() * 70),
        total: Math.floor(Math.random() * 300),
        contract: Math.floor(Math.random() * 50),
        contract_sub: Math.floor(Math.random() * 20),
    }));
};

export default function LogYearlyPage() {
    const [loading, setLoading] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('2568');

    const data = generateMockData();

    const columns: ColumnsType<LogYearlyDataType> = [
        {
            title: 'เดือน',
            dataIndex: 'month',
            key: 'month',
            align: 'center',
            width: 100,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: '21',
            dataIndex: 'level_21',
            key: 'level_21',
            align: 'center',
            width: 60,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: '18-20',
            dataIndex: 'level_18_20',
            key: 'level_18_20',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: '16-17',
            dataIndex: 'level_16_17',
            key: 'level_16_17',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: '14-15',
            dataIndex: 'level_14_15',
            key: 'level_14_15',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: '11-13',
            dataIndex: 'level_11_13',
            key: 'level_11_13',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: '9-10',
            dataIndex: 'level_9_10',
            key: 'level_9_10',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: '4-8',
            dataIndex: 'level_4_8',
            key: 'level_4_8',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: 'รวม',
            dataIndex: 'total',
            key: 'total',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: 'Contract',
            dataIndex: 'contract',
            key: 'contract',
            align: 'center',
            width: 100,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: 'Contract สัญญาย่อย',
            dataIndex: 'contract_sub',
            key: 'contract_sub',
            align: 'center',
            width: 150,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
        },
        {
            title: 'View',
            key: 'view',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! font-bold!',
            }),
            render: () => (
                <Button
                    type="text"
                    icon={<EyeOutlined />}
                />
            ),
        },
    ];

    return (
        <Main currentPath="/monitor">
            <div className="space-y-6 w-full min-w-0">
                {/* Header */}

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-blue-900 m-0">Transaction Log Yearly</h1>

                    <div className="flex items-center gap-2">
                        <span className="text-gray-600">หน่วยงาน</span>
                        <Select
                            placeholder="เลือกหน่วยงาน..."
                            className="w-64"
                            allowClear
                            value={selectedUnit}
                            onChange={setSelectedUnit}
                            options={[
                                { value: 'unit1', label: 'หน่วยงาน 1' },
                                { value: 'unit2', label: 'หน่วยงาน 2' },
                            ]}
                        />
                        <span className="text-gray-600 ml-2">ปี</span>
                        <Select
                            value={selectedYear}
                            onChange={setSelectedYear}
                            className="w-24"
                            options={[
                                { value: '2568', label: '2568' },
                                { value: '2567', label: '2567' },
                            ]}
                        />
                        <Button
                            type="primary"
                            className="bg-red-500 hover:bg-red-600 border-red-500 ml-2"
                            icon={<span>✓</span>}
                        >
                            ตกลง
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <Table
                        columns={columns}
                        dataSource={data}
                        loading={loading}
                        pagination={false}
                        scroll={{ x: 1000 }}
                        size="middle"
                        bordered={false}
                        rowClassName={(record, index) => index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    />
                </div>
            </div>
        </Main>
    );
}
