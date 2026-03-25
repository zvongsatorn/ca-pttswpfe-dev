'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Button, Select, Card, Typography, Space, App, Tag, Badge, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { History, Search, Calendar, MapPin, Filter, FileText, ArrowRightLeft, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { getUnitFrameworkHistory } from '@/services/monitorHistoryService';

const { Title, Text } = Typography;

interface HistoryDataType {
    key: string;
    RequestNo: string;
    RequestDate: string;
    effectiveDate: string;
    type: string;
    resolution: string;
    remark: string;
    FileUpload: string;
    transferReceivingUnit: string;
    transferGivingUnit: string;
    StatusName: string;
    AppStatusName: string;
}

interface HistoryClientProps {
    token: string;
    currentUser: any;
    initialUnits: { value: string, label: string }[];
    initialStartMonth: string;
    initialStartYear: string;
    initialEndMonth: string;
    initialEndYear: string;
}

const MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function HistoryClient({ 
    token, 
    currentUser, 
    initialUnits,
    initialStartMonth,
    initialStartYear,
    initialEndMonth,
    initialEndYear
}: HistoryClientProps) {
    const { message: messageApi } = App.useApp();
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [startMonth, setStartMonth] = useState<string>(initialStartMonth);
    const [startYear, setStartYear] = useState<string>(initialStartYear);
    const [endMonth, setEndMonth] = useState<string>(initialEndMonth);
    const [endYear, setEndYear] = useState<string>(initialEndYear);
    const [selectedUnit, setSelectedUnit] = useState<string | undefined>(undefined);

    // Column Filters
    const [columnFilters, setColumnFilters] = useState({
        Type: '',
        Resolution: '',
        Remark: ''
    });

    const [data, setData] = useState<HistoryDataType[]>([]);

    const years = useMemo(() => {
        const currentYearBE = dayjs().year() + 543;
        const range = [];
        for (let i = currentYearBE + 1; i >= 2561; i--) {
            range.push(i.toString());
        }
        return range;
    }, []);

    const handleSearch = useCallback(async () => {
        setLoading(true);
        try {
            // In a real app, we might need a date range filter on the backend.
            // For now, based on legacy logic, we'll fetch using the selected parameters.
            
            const adYear = (parseInt(startYear, 10) - 543).toString();
            const monthIndex = MONTHS.indexOf(startMonth) + 1;
            const monthValue = monthIndex.toString().padStart(2, '0');

            const res = await getUnitFrameworkHistory({
                EffectiveMonth: monthValue,
                EffectiveYear: adYear,
                OrgUnitNo: selectedUnit,
                UserGroupNo: currentUser.userGroupNo || '',
                EmployeeID: currentUser.employeeID || '',
                RequestType: 1
            }, token);

            if (res) {
                setData(res.map((item: any, idx: number) => ({
                    key: `history-${idx}`,
                    RequestNo: item.RequestNo || item.fullRequestNo,
                    RequestDate: item.RequestDate ? dayjs(item.RequestDate).format('DD/MM/YYYY') : '-',
                    effectiveDate: item.datebd ? dayjs(item.datebd).format('DD/MM/YYYY') : '-',
                    type: item.TypeName || 'กรอบหน่วยงาน',
                    resolution: item.AppStatusName || '-',
                    remark: item.Remark || item.Note || '-',
                    FileUpload: item.FileUpload || '',
                    transferReceivingUnit: item.ReceivingUnitName || '-',
                    transferGivingUnit: item.GivingUnitName || '-',
                    StatusName: item.StatusName,
                    AppStatusName: item.AppStatusName
                })));
            }
        } catch (error) {
            messageApi.error('ไม่สามารถโหลดข้อมูล History ได้');
        } finally {
            setLoading(false);
        }
    }, [startMonth, startYear, selectedUnit, currentUser, token, messageApi]);

    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    const filteredData = useMemo(() => {
        return data.filter(item => (
            (item.type || '').toLowerCase().includes(columnFilters.Type.toLowerCase()) &&
            (item.resolution || '').toLowerCase().includes(columnFilters.Resolution.toLowerCase()) &&
            (item.remark || '').toLowerCase().includes(columnFilters.Remark.toLowerCase())
        ));
    }, [data, columnFilters]);

    const columns: ColumnsType<HistoryDataType> = [
        {
            title: 'วันที่สร้าง',
            dataIndex: 'RequestDate',
            key: 'RequestDate',
            align: 'center',
            width: 120,
        },
        {
            title: 'วันที่มีผล',
            dataIndex: 'effectiveDate',
            key: 'effectiveDate',
            align: 'center',
            width: 120,
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">ประเภท</div>
                    <Input
                        size="small"
                        prefix={<Filter size={12} className="text-slate-400" />}
                        value={columnFilters.Type}
                        onChange={(e) => setColumnFilters({ ...columnFilters, Type: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'type',
            key: 'type',
            width: 160,
            align: 'center',
            render: (text) => <Tag color="blue" className="rounded-full px-3">{text}</Tag>
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">มติ / สถานะ</div>
                    <Input
                        size="small"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.Resolution}
                        onChange={(e) => setColumnFilters({ ...columnFilters, Resolution: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'resolution',
            key: 'resolution',
            width: 250,
            render: (text) => (
                <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-700">{text}</span>
                    <Badge status="processing" text="Active" className="text-[10px]" />
                </div>
            )
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">หมายเหตุ</div>
                    <Input
                        size="small"
                        prefix={<MessageSquare size={12} className="text-slate-400" />}
                        value={columnFilters.Remark}
                        onChange={(e) => setColumnFilters({ ...columnFilters, Remark: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'remark',
            key: 'remark',
            width: 200,
        },
        {
            title: 'File',
            dataIndex: 'FileUpload',
            key: 'FileUpload',
            align: 'center',
            width: 80,
            render: (file) => file ? <FileText size={18} className="text-red-500 cursor-pointer mx-auto" /> : '-'
        },
        {
            title: 'หน่วยที่รับโอน',
            dataIndex: 'transferReceivingUnit',
            key: 'transferReceivingUnit',
            width: 180,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-500 shrink-0" />
                    <span className="text-xs truncate">{text}</span>
                </div>
            )
        },
        {
            title: 'หน่วยที่โอนให้',
            dataIndex: 'transferGivingUnit',
            key: 'transferGivingUnit',
            width: 180,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <ArrowRightLeft size={14} className="text-amber-500 shrink-0" />
                    <span className="text-xs truncate">{text}</span>
                </div>
            )
        },
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6 history-modern">
            <div className="rounded-xl bg-linear-to-r from-blue-700 to-indigo-600 p-4 shadow-lg mb-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <History className="text-2xl" />
                    <Title level={4} className="m-0 text-white font-bold">History ข้อมูลกรอบหน่วยงาน</Title>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest leading-none mt-0.5">
                    System Logs
                </div>
            </div>

            <Card className="mb-6 shadow-sm border-slate-200">
                <div className="flex flex-wrap items-end gap-6">
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider pl-1 font-mono">ตั้งแต่</label>
                            <Select
                                value={startMonth}
                                onChange={setStartMonth}
                                options={MONTHS.map(m => ({ label: m, value: m }))}
                                className="w-[140px]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider pl-1 font-mono">ปี</label>
                            <Select
                                value={startYear}
                                onChange={setStartYear}
                                options={years.map(y => ({ label: y, value: y }))}
                                className="w-[100px]"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider pl-1 font-mono">ถึง</label>
                            <Select
                                value={endMonth}
                                onChange={setEndMonth}
                                options={MONTHS.map(m => ({ label: m, value: m }))}
                                className="w-[140px]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider pl-1 font-mono">ปี</label>
                            <Select
                                value={endYear}
                                onChange={setEndYear}
                                options={years.map(y => ({ label: y, value: y }))}
                                className="w-[100px]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                        <label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider pl-1 font-mono">หน่วยงาน</label>
                        <Select
                            placeholder="เลือกหน่วยงาน..."
                            allowClear
                            value={selectedUnit}
                            onChange={setSelectedUnit}
                            options={initialUnits}
                            size="large"
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            className="w-full"
                        />
                    </div>

                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={handleSearch} 
                        loading={loading}
                        icon={<Search size={20} />} 
                        className="bg-indigo-600 hover:bg-indigo-700 h-12 px-10 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 border-none transition-all active:scale-95"
                    >
                        ตกลง
                    </Button>
                </div>
            </Card>

            <Card className="shadow-sm border-slate-200 overflow-hidden" bodyStyle={{ padding: 0 }}>
                <div className="bg-slate-800 text-white px-4 py-2 font-bold flex items-center gap-2">
                    <FileText size={16} />
                    <span className="text-xs uppercase tracking-widest font-mono">LOG DATA</span>
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">RESULT: {total} LOGS</span>,
                    }}
                    scroll={{ x: 1300 }}
                    size="middle"
                    className="modern-history-table"
                />
            </Card>

            <style jsx global>{`
                .modern-history-table .ant-table-thead > tr > th {
                    background: #f8fafc !important;
                    padding: 12px 8px !important;
                    border-bottom: 2px solid #e2e8f0 !important;
                }
                .modern-history-table .ant-table-row:hover > td {
                    background-color: #f1f5f9 !important;
                }
            `}</style>
        </div>
    );
}
