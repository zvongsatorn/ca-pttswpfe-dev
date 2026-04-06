'use client';

import React, { useState, useMemo } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Input, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileTextOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

// --- Type Definitions ---
interface SapMonitorDataType {
    key: string;
    effective_date: string;
    data_status: string;
    sap_status: string;
    sap_date: string;
}

// --- Mock Data ---
const generateMockData = (): SapMonitorDataType[] => {
    const data: SapMonitorDataType[] = [

        { key: '7', effective_date: '01/08/2568', data_status: 'Send Completed', sap_status: 'Success', sap_date: '22/08/2568' },
        { key: '8', effective_date: '01/09/2568', data_status: 'Send Completed', sap_status: 'Success', sap_date: '17/09/2568' },
        { key: '10', effective_date: '01/11/2568', data_status: 'Processing', sap_status: 'Success', sap_date: '' },
        // Add a case for failed SAP status to demonstrate the Send button
        { key: '11', effective_date: '01/12/2568', data_status: 'Send Completed', sap_status: 'Failed', sap_date: '' },
    ];
    return data;
};

export default function SapMonitorPage() {
    const [loading, setLoading] = useState(false);

    // Filter states
    const [filterEffectiveDate, setFilterEffectiveDate] = useState('');
    const [filterDataStatus, setFilterDataStatus] = useState('');
    const [filterSapStatus, setFilterSapStatus] = useState('');
    const [filterSapDate, setFilterSapDate] = useState('');

    const [data, setData] = useState<SapMonitorDataType[]>(generateMockData());

    // Filtered data based on column filters
    const filteredData = useMemo(() => {
        return data.filter(item => {
            return (
                item.effective_date.toLowerCase().includes(filterEffectiveDate.toLowerCase()) &&
                item.data_status.toLowerCase().includes(filterDataStatus.toLowerCase()) &&
                item.sap_status.toLowerCase().includes(filterSapStatus.toLowerCase()) &&
                item.sap_date.toLowerCase().includes(filterSapDate.toLowerCase())
            );
        });
    }, [data, filterEffectiveDate, filterDataStatus, filterSapStatus, filterSapDate]);

    const handleSend = (record: SapMonitorDataType) => {
        setLoading(true);
        message.loading({ content: 'Sending to SAP...', key: 'sap-send' });

        setTimeout(() => {
            setLoading(false);
            message.success({ content: 'Sent to SAP successfully!', key: 'sap-send', duration: 2 });

            // Update mock data to reflect success
            setData(prevData => prevData.map(item =>
                item.key === record.key
                    ? { ...item, sap_status: 'Success', sap_date: dayjs().format('DD/MM/YYYY') }
                    : item
            ));
        }, 1500);
    };

    const columns: ColumnsType<SapMonitorDataType> = [
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">Effective Date</div>
                    <Input
                        size="small"
                        placeholder=""
                        value={filterEffectiveDate}
                        onChange={(e) => setFilterEffectiveDate(e.target.value)}
                        className="w-full"
                    />
                </div>
            ),
            dataIndex: 'effective_date',
            key: 'effective_date',
            width: 150,
            align: 'center',
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! p-2!',
            }),
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">สถานะข้อมูล</div>
                    <Input
                        size="small"
                        placeholder=""
                        value={filterDataStatus}
                        onChange={(e) => setFilterDataStatus(e.target.value)}
                        className="w-full"
                    />
                </div>
            ),
            dataIndex: 'data_status',
            key: 'data_status',
            width: 200,
            align: 'center',
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! p-2!',
            }),
            render: (text: string) => {
                let colorClass = 'text-gray-700';
                if (text === 'Send Completed') colorClass = 'text-green-600';
                else if (text === 'Processing') colorClass = 'text-orange-400';
                return <span className={`font-medium ${colorClass}`}>{text}</span>;
            }
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">สถานะส่งเข้า SAP</div>
                    <Input
                        size="small"
                        placeholder=""
                        value={filterSapStatus}
                        onChange={(e) => setFilterSapStatus(e.target.value)}
                        className="w-full"
                    />
                </div>
            ),
            dataIndex: 'sap_status',
            key: 'sap_status',
            width: 200,
            align: 'center',
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! p-2!',
            }),
            render: (text: string) => {
                let colorClass = 'text-gray-700';
                if (text === 'Success') colorClass = 'text-green-600';
                else if (text === 'Failed') colorClass = 'text-red-600';
                return <span className={`font-medium ${colorClass}`}>{text}</span>;
            }
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">วันที่นำส่งเข้า SAP</div>
                    <Input
                        size="small"
                        placeholder=""
                        value={filterSapDate}
                        onChange={(e) => setFilterSapDate(e.target.value)}
                        className="w-full"
                    />
                </div>
            ),
            dataIndex: 'sap_date',
            key: 'sap_date',
            width: 150,
            align: 'center',
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! p-2!',
            }),
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">ACTION</div>
                </div>
            ),
            key: 'action',
            width: 100,
            align: 'center',
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! p-2!',
            }),
            render: (_, record) => (
                record.sap_status !== 'Success' ? (
                    <Button
                        type="primary"
                        size="small"
                        icon={<SendOutlined />}
                        onClick={() => handleSend(record)}
                        className="bg-blue-500 hover:bg-blue-600"
                    >
                        Send
                    </Button>
                ) : null
            ),
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">LOG</div>
                </div>
            ),
            key: 'log',
            width: 80,
            align: 'center',
            onHeaderCell: () => ({
                className: 'bg-blue-50! text-black! p-2!',
            }),
            render: () => (
                <Tooltip title="View Log">
                    <Button
                        type="text"
                        icon={<FileTextOutlined className="text-gray-400 text-lg" />}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <Main currentPath="/monitor">
            <div className="space-y-6 w-full min-w-0">
                {/* Header */}

                <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">SAP Transfer (Monitor)</h1>
                        </div>
                    </div>
                </div>
                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                        }}
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
