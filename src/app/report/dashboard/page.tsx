'use client';

import React, { useState } from 'react';
import Main from '@/components/layout/main';
import { DatePicker, Select, Button, Table } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

// --- Types ---
interface DashboardData {
    name: string;
    contractOut: number;
    contractSub: number;
    frame: number;
    employee: number;
    recruit: number;
    vacancy: number;
}

// --- Mock Data ---
const mockData: DashboardData[] = [
    { name: 'ปตท.', contractOut: 2, contractSub: 0, frame: 10, employee: 8, recruit: 1, vacancy: 1 },
    { name: 'สผ.', contractOut: 13, contractSub: 3, frame: 20, employee: 18, recruit: 1, vacancy: 1 },
    { name: 'พต.', contractOut: 8, contractSub: 0, frame: 15, employee: 14, recruit: 0, vacancy: 1 },
    { name: 'สก.', contractOut: 51, contractSub: 4, frame: 60, employee: 55, recruit: 2, vacancy: 3 },
    { name: 'กต.', contractOut: 33, contractSub: 7, frame: 40, employee: 35, recruit: 3, vacancy: 2 },
    { name: 'พว.', contractOut: 4, contractSub: 0, frame: 10, employee: 10, recruit: 0, vacancy: 0 },
    { name: 'กม.', contractOut: 33, contractSub: 1, frame: 35, employee: 30, recruit: 2, vacancy: 3 },
    { name: 'วข.', contractOut: 23, contractSub: 14, frame: 30, employee: 25, recruit: 3, vacancy: 2 },
    { name: 'วพ.', contractOut: 21, contractSub: 3, frame: 25, employee: 22, recruit: 1, vacancy: 2 },
    { name: 'วธ.', contractOut: 26, contractSub: 0, frame: 28, employee: 26, recruit: 1, vacancy: 1 },
    { name: 'รว.', contractOut: 21, contractSub: 1, frame: 25, employee: 23, recruit: 1, vacancy: 1 },
    { name: 'มล.', contractOut: 18, contractSub: 4, frame: 22, employee: 18, recruit: 2, vacancy: 2 },
    { name: 'ผต.', contractOut: 1, contractSub: 0, frame: 5, employee: 5, recruit: 0, vacancy: 0 },
    { name: 'ตอ.', contractOut: 19, contractSub: 1, frame: 20, employee: 18, recruit: 1, vacancy: 1 },
    { name: 'ตบ.', contractOut: 13, contractSub: 0, frame: 15, employee: 14, recruit: 0, vacancy: 1 },
    { name: 'กพ.', contractOut: 10, contractSub: 1, frame: 12, employee: 10, recruit: 1, vacancy: 1 },
    { name: 'รต.', contractOut: 3, contractSub: -1, frame: 5, employee: 4, recruit: 0, vacancy: 1 },
    { name: 'รส.', contractOut: 3, contractSub: 0, frame: 4, employee: 4, recruit: 0, vacancy: 0 },
    { name: 'งก.', contractOut: 16, contractSub: 1, frame: 18, employee: 16, recruit: 1, vacancy: 1 },
    { name: 'พก.', contractOut: 1, contractSub: 0, frame: 2, employee: 2, recruit: 0, vacancy: 0 },
    { name: 'กอ.', contractOut: 8, contractSub: 0, frame: 10, employee: 9, recruit: 0, vacancy: 1 },
    { name: 'พม.', contractOut: 16, contractSub: 2, frame: 20, employee: 18, recruit: 1, vacancy: 1 },
];


// --- Custom Tooltip ---
interface CustomTooltipProps {
    active?: boolean;
    payload?: {
        name: string;
        value: number;
        color: string;
        payload: DashboardData;
    }[];
    label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 border border-gray-200 shadow-md rounded text-sm">
                <p className="font-bold mb-1">{label}</p>
                {payload?.map((entry, index) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [filterDate, setFilterDate] = useState(dayjs());
    const [employeeType, setEmployeeType] = useState('all');
    const [showContractOut, setShowContractOut] = useState('show');
    const [unit, setUnit] = useState<string | undefined>(undefined);

    // --- Filter Logic ---
    const filteredData = mockData.filter(item => {
        if (unit && item.name !== unit) return false;
        return true;
    });

    // Determine which bars to show based on filters
    const showContractBars = (employeeType === 'all' || employeeType === 'contract') && (showContractOut === 'show' || employeeType === 'contract');
    const showEmployeeBars = employeeType === 'all' || employeeType === 'ptt' || employeeType === 'sec';

    // --- Summary Calculation ---
    const summary = filteredData.reduce(
        (acc, curr) => ({
            contractOut: acc.contractOut + curr.contractOut,
            contractSub: acc.contractSub + curr.contractSub,
            frame: acc.frame + curr.frame,
            employee: acc.employee + curr.employee,
            recruit: acc.recruit + curr.recruit,
            vacancy: acc.vacancy + curr.vacancy,
        }),
        { contractOut: 0, contractSub: 0, frame: 0, employee: 0, recruit: 0, vacancy: 0 }
    );

    const effectiveSummary = {
        contractOut: showContractBars ? summary.contractOut : 0,
        contractSub: showContractBars ? summary.contractSub : 0,
        frame: showEmployeeBars ? summary.frame : 0,
        employee: showEmployeeBars ? summary.employee : 0,
        recruit: showEmployeeBars ? summary.recruit : 0,
        vacancy: showEmployeeBars ? summary.vacancy : 0,
    };

    const summaryTableData = [
        { key: '1', item: 'Contract out', amount: effectiveSummary.contractOut },
        { key: '2', item: 'Contract สัญญาย่อย', amount: effectiveSummary.contractSub },
        { key: '3', item: 'กรอบอัตรา', amount: effectiveSummary.frame },
        { key: '4', item: 'จำนวนพนักงาน', amount: effectiveSummary.employee },
        { key: '5', item: 'ค้างสรรหา', amount: effectiveSummary.recruit },
        { key: '6', item: 'อัตราว่าง', amount: effectiveSummary.vacancy },
    ];

    const summaryColumns = [
        { title: 'รายการ', dataIndex: 'item', key: 'item', onHeaderCell: () => ({ className: 'bg-orange-100! font-bold' }), className: 'bg-blue-100 font-bold', width: '200px' },
        { title: 'จำนวน', dataIndex: 'amount', key: 'amount', onHeaderCell: () => ({ className: 'bg-orange-100! font-bold' }), align: 'center' as const, render: (val: number) => val.toLocaleString(), width: '200px' },
    ];

    // --- Chart Customization ---



    return (
        <Main currentPath="/report">
            <div className="space-y-6">
                {/* Header */}
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">Dashboard</h1>

                        </div>
                    </div >
                </div >


                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600">วันที่</span>
                        <DatePicker value={filterDate} onChange={(date) => setFilterDate(date || dayjs())} format="DD/MM/YYYY" className="w-32" />
                    </div>

                    <Select
                        value={employeeType}
                        onChange={setEmployeeType}
                        options={[
                            { value: 'all', label: 'พนง. ทั้งหมด' },
                            { value: 'ptt', label: 'พนง. ปตท.' },
                            { value: 'sec', label: 'Secondment' },
                            { value: 'contract', label: 'Contract out' },
                        ]}
                        className="w-40"
                    />

                    <Select
                        value={showContractOut}
                        onChange={setShowContractOut}
                        options={[
                            { value: 'show', label: 'แสดง Contract out' },
                            { value: 'hide', label: 'ไม่แสดง Contract out' },
                        ]}
                        className="w-48"
                    />

                    <Select
                        placeholder="เลือกสายงาน..."
                        value={unit}
                        onChange={setUnit}
                        allowClear
                        className="w-64"
                        options={mockData.map(d => ({ value: d.name, label: d.name }))}
                    />

                    <Button type="primary" danger className="bg-red-600 hover:bg-red-700 border-none">
                        ตกลง
                    </Button>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button icon={<FileExcelOutlined />} className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!">Excel</Button>
                    </div>

                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Chart Section */}
                    <div className="lg:col-span-9 bg-white p-4 rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
                        <ResponsiveContainer width="100%" height={500}>
                            <BarChart
                                data={filteredData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                barGap={2}
                                barCategoryGap="10%"
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    tick={{ fontSize: 12 }}
                                    height={60}
                                />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" height={36} />

                                {/* 6 Bars */}
                                {showContractBars && (
                                    <>
                                        <Bar barSize={5} dataKey="contractOut" name="Contract out" fill="#1f2937" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="contractOut" position="top" fontSize={10} formatter={(val: any) => val > 0 ? val : ''} />
                                        </Bar>
                                        <Bar barSize={5} dataKey="contractSub" name="Contract สัญญาย่อย" fill="#f97316" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="contractSub" position="top" fontSize={10} formatter={(val: any) => val > 0 ? val : ''} />
                                        </Bar>
                                    </>
                                )}

                                {showEmployeeBars && (
                                    <>
                                        <Bar barSize={5} dataKey="frame" name="กรอบอัตรา" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="frame" position="top" fontSize={10} formatter={(val: any) => val > 0 ? val : ''} />
                                        </Bar>
                                        <Bar barSize={5} dataKey="employee" name="จำนวนพนักงาน" fill="#0284c7" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="employee" position="top" fontSize={10} formatter={(val: any) => val > 0 ? val : ''} />
                                        </Bar>
                                        <Bar barSize={5} dataKey="recruit" name="ค้างสรรหา" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="recruit" position="top" fontSize={10} formatter={(val: any) => val > 0 ? val : ''} />
                                        </Bar>
                                        <Bar barSize={5} dataKey="vacancy" name="อัตราว่าง" fill="#ef4444" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="vacancy" position="top" fontSize={10} formatter={(val: any) => val > 0 ? val : ''} />
                                        </Bar>
                                    </>
                                )}

                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary Table Section */}
                    <div className="lg:col-span-3">
                        <Table
                            columns={summaryColumns}
                            dataSource={summaryTableData}
                            pagination={false}
                            bordered

                            size="middle"
                            className="shadow-sm border border-gray-200 rounded-lg overflow-hidden 
                                [&_.ant-table-thead_th]:bg-blue-600 
                                [&_.ant-table-thead_th]:text-white
                                [&_.ant-table-thead_th]:font-bold"
                        />
                    </div>
                </div>
            </div>
        </Main>
    );
}
