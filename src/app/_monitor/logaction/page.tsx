'use client';

import React, { useState } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Input } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// --- Type Definitions ---
interface LogActionDataType {
    key: string;
    no: number;
    actionDate: string;
    actionTime: string;
    employeeId: string;
    name: string;
    role: string;
    menu: string;
    action: string;
    note: string;
}

// --- Mock Data ---
const mockData: LogActionDataType[] = [
    {
        key: '1',
        no: 1,
        actionDate: '11/11/2025',
        actionTime: '23:03:23',
        employeeId: 'svcsiri',
        name: 'svcsiri',
        role: 'HRPOLICY',
        menu: 'Log Action',
        action: 'Entry Menu',
        note: '',
    },
    {
        key: '2',
        no: 2,
        actionDate: '11/11/2025',
        actionTime: '23:03:23',
        employeeId: 'svcsiri',
        name: 'svcsiri',
        role: 'HRPOLICY',
        menu: 'Log Action',
        action: 'Entry Menu',
        note: '',
    },
];

export default function LogActionPage() {
    const [loading, setLoading] = useState(false);

    // Filter State
    const [startDate, setStartDate] = useState('01/11/2568');
    const [endDate, setEndDate] = useState('30/11/2568');

    // Search State
    const [searchEmployeeId, setSearchEmployeeId] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchRole, setSearchRole] = useState('');
    const [searchAction, setSearchAction] = useState('');

    const columns: ColumnsType<LogActionDataType> = [
        {
            title: 'No',
            dataIndex: 'no',
            key: 'no',
            align: 'center',
            width: 60,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! border-b-0!',
            }),
        },
        {
            title: 'ActionDate',
            dataIndex: 'actionDate',
            key: 'actionDate',
            align: 'center',
            width: 120,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! border-b-0!',
            }),
            render: (text, record) => (
                <div className="flex flex-col items-center">
                    <span>{text}</span>
                    <span className="text-gray-500 text-xs">{record.actionTime}</span>
                </div>
            ),
        },
        {
            title: (
                <div className="flex flex-col gap-2">
                    <span>EmployeeID</span>
                    <Input
                        className="rounded-md"
                        value={searchEmployeeId}
                        onChange={(e) => setSearchEmployeeId(e.target.value)}
                    />
                </div>
            ),
            dataIndex: 'employeeId',
            key: 'employeeId',
            align: 'center',
            width: 150,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! pb-2!',
            }),
        },
        {
            title: (
                <div className="flex flex-col gap-2">
                    <span>Name</span>
                    <Input
                        className="rounded-md"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                    />
                </div>
            ),
            dataIndex: 'name',
            key: 'name',
            align: 'left',
            width: 200,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! pb-2!',
            }),
        },
        {
            title: (
                <div className="flex flex-col gap-2">
                    <span>Role</span>
                    <Input
                        className="rounded-md"
                        value={searchRole}
                        onChange={(e) => setSearchRole(e.target.value)}
                    />
                </div>
            ),
            dataIndex: 'role',
            key: 'role',
            align: 'center',
            width: 150,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! pb-2!',
            }),
        },
        {
            title: 'Menu',
            dataIndex: 'menu',
            key: 'menu',
            align: 'left',
            width: 150,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! border-b-0!',
            }),
        },
        {
            title: (
                <div className="flex flex-col gap-2">
                    <span>Action</span>
                    <Input
                        className="rounded-md"
                        value={searchAction}
                        onChange={(e) => setSearchAction(e.target.value)}
                    />
                </div>
            ),
            dataIndex: 'action',
            key: 'action',
            align: 'left',
            width: 200,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! pb-2!',
            }),
        },
        {
            title: 'Note',
            dataIndex: 'note',
            key: 'note',
            align: 'left',
            width: 150,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! border-b-0!',
            }),
        },
    ];

    return (
        <Main currentPath="/monitor">
            <div className="space-y-6 w-full min-w-0">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">

                    <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-baseline gap-3">
                                <h1 className="text-2xl font-bold m-0 text-white">Log Action</h1>
                            </div>
                        </div>
                    </div>



                    <div className="flex flex-wrap items-center justify-center md:justify-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-700 font-medium w-32 md:w28">วันที่เริ่มต้น</span>
                            <Input

                                className="w-40! text-center rounded-md border-gray-300"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-gray-700 font-medium w-32 md:w-28">วันที่สิ้นสุด</span>
                            <Input
                                className="w-40! text-center rounded-md border-gray-300"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <Button
                            type="primary"
                            className="bg-red-500 hover:bg-red-600 border-red-500 px-6 rounded-md"
                        >
                            ตกลง
                        </Button>

                        <Button
                            icon={<FileExcelOutlined />}
                            className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
                        >
                            Excel
                        </Button>
                    </div>

                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <Table
                        columns={columns}
                        dataSource={mockData}
                        loading={loading}
                        pagination={false}
                        scroll={{ x: 1000 }}
                        size="middle"
                        bordered={false}
                        rowClassName={() => 'bg-white hover:bg-gray-50'}
                    />
                </div>
            </div>
        </Main>
    );
}
