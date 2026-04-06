'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Modal, Card, Typography, Space, App, Tag, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Search, Eye, Activity, Calendar, Award, User, MapPin, Filter } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { getTrackingUsers, getTrackingUnits } from '@/services/trackingService';

const { Title, Text } = Typography;

interface UserTrackingDataType {
    key: string;
    EmployeeID: string;
    Name: string;
    UserGroupName: string;
    UserGroupNo: string;
    BGName: string;
    statustxt: string;
    work_amount: string;
    actiondate: string;
    finish: number;
    total: number;
}

interface UnitTrackingDataType {
    key: string;
    OrgUnitNo: string;
    UnitName: string;
}

interface TrackingClientProps {
    token: string;
    currentUser: any;
    initialMonth: string;
    initialYear: string;
}

const MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function TrackingClient({ token, currentUser, initialMonth, initialYear }: TrackingClientProps) {
    const { message: messageApi, notification } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
    const [selectedYear, setSelectedYear] = useState<string>(initialYear);

    // Column Filters
    const [columnFilters, setColumnFilters] = useState({
        EmployeeID: '',
        Name: '',
        UserGroupName: '',
        BGName: '',
        Status: '',
        WorkAmount: '',
        ActionDate: ''
    });

    const [data, setData] = useState<UserTrackingDataType[]>([]);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [unitLoading, setUnitLoading] = useState(false);
    const [unitData, setUnitData] = useState<UnitTrackingDataType[]>([]);
    const [unitFilters, setUnitFilters] = useState({ OrgUnitNo: '', UnitName: '' });

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
            const adYear = (parseInt(selectedYear, 10) - 543).toString();
            const monthIndex = MONTHS.indexOf(selectedMonth) + 1;
            const monthValue = monthIndex.toString().padStart(2, '0');

            const res = await getTrackingUsers({
                dmonth: monthValue,
                dyear: adYear,
                userGroupNo: currentUser.userGroupNo || '',
                employeeId: currentUser.employeeID || ''
            }, token);

            if (res) {
                const mappedData = res.map((item: any, idx: number) => {
                    const [finish, total] = (item.work_amount || `${item.finish} / ${item.Total}`).split('/').map((s: string) => parseInt(s.trim(), 10) || 0);
                    return {
                        key: `tracking-${idx}`,
                        EmployeeID: item.EmployeeID,
                        Name: item.Name,
                        UserGroupName: item.UserGroupName,
                        UserGroupNo: item.UserGroupNo,
                        BGName: item.BGName,
                        statustxt: item.statustxt,
                        work_amount: `${item.finish} / ${item.Total}`,
                        finish: item.finish,
                        total: item.Total,
                        actiondate: item.actiondate ? dayjs(item.actiondate).format('DD/MM/YYYY') : ''
                    };
                });
                setData(mappedData);
            }
        } catch (error) {
            messageApi.error('ไม่สามารถโหลดข้อมูล Tracking ได้');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, currentUser, token, messageApi]);

    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    const openUnitModal = async (groupNo: string, empId: string) => {
        setIsModalOpen(true);
        setUnitLoading(true);
        setUnitFilters({ OrgUnitNo: '', UnitName: '' });
        try {
            const adYear = (parseInt(selectedYear, 10) - 543).toString();
            const monthIndex = MONTHS.indexOf(selectedMonth) + 1;
            const monthValue = monthIndex.toString().padStart(2, '0');

            const res = await getTrackingUnits({
                dmonth: monthValue,
                dyear: adYear,
                userGroupNo: groupNo || '',
                employeeId: empId || ''
            }, token);

            if (res) {
                setUnitData(res.map((item: any, idx: number) => ({
                     key: `unit-${idx}`,
                     OrgUnitNo: item.OrgUnitNo,
                     UnitName: item.UnitName
                })));
            }
        } catch(e) { 
            messageApi.error('ไม่สามารถโหลดข้อมูลหน่วยงานได้');
        } finally { 
            setUnitLoading(false); 
        }
    };

    // Filtered Data
    const filteredData = useMemo(() => {
        return data.filter(item => (
            (item.EmployeeID || '').toLowerCase().includes(columnFilters.EmployeeID.toLowerCase()) &&
            (item.Name || '').toLowerCase().includes(columnFilters.Name.toLowerCase()) &&
            (item.UserGroupName || '').toLowerCase().includes(columnFilters.UserGroupName.toLowerCase()) &&
            (item.BGName || '').toLowerCase().includes(columnFilters.BGName.toLowerCase()) &&
            (item.statustxt || '').toLowerCase().includes(columnFilters.Status.toLowerCase()) &&
            (item.work_amount || '').toLowerCase().includes(columnFilters.WorkAmount.toLowerCase()) &&
            (item.actiondate || '').toLowerCase().includes(columnFilters.ActionDate.toLowerCase())
        ));
    }, [data, columnFilters]);

    const filteredUnitData = useMemo(() => {
        return unitData.filter(item => (
            (item.OrgUnitNo || '').toLowerCase().includes(unitFilters.OrgUnitNo.toLowerCase()) &&
            (item.UnitName || '').toLowerCase().includes(unitFilters.UnitName.toLowerCase())
        ));
    }, [unitData, unitFilters]);

    const columns: ColumnsType<UserTrackingDataType> = [
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">รหัสพนักงาน</div>
                    <Input
                        size="small"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.EmployeeID}
                        onChange={(e) => setColumnFilters({ ...columnFilters, EmployeeID: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'EmployeeID',
            key: 'EmployeeID',
            width: 140,
            align: 'center',
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">ชื่อผู้ใช้งาน</div>
                    <Input
                        size="small"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.Name}
                        onChange={(e) => setColumnFilters({ ...columnFilters, Name: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'Name',
            key: 'Name',
            width: 200,
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">สิทธิ์</div>
                    <Input
                        size="small"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.UserGroupName}
                        onChange={(e) => setColumnFilters({ ...columnFilters, UserGroupName: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'UserGroupName',
            key: 'UserGroupName',
            width: 160,
            render: (text) => <Tag color="blue" className="rounded-full px-3 m-0">{text}</Tag>
        },
        {
            title: () => (
                <div className="flex flex-col gap-2 h-full justify-center">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">หน่วยงานดูแล</div>
                    <div className="h-6"></div>
                </div>
            ),
            key: 'units',
            width: 100,
            align: 'center',
            render: (_: any, record: UserTrackingDataType) => (
                <Button 
                    type="text" 
                    icon={<Eye size={18} className="text-blue-500" />} 
                    onClick={() => openUnitModal(record.UserGroupNo, record.EmployeeID)}
                    className="hover:bg-blue-50 rounded-full"
                />
            )
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">BG</div>
                    <Input
                        size="small"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.BGName}
                        onChange={(e) => setColumnFilters({ ...columnFilters, BGName: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'BGName',
            key: 'BGName',
            width: 120,
            align: 'center',
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">สถานะ</div>
                    <Input
                        size="small"
                        prefix={<Filter size={12} className="text-slate-400" />}
                        value={columnFilters.Status}
                        onChange={(e) => setColumnFilters({ ...columnFilters, Status: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'statustxt',
            key: 'statustxt',
            width: 140,
            align: 'center',
            render: (text: string) => {
                const isComplete = text === 'Completed' || text === 'ดำเนินการแล้ว';
                return (
                    <Badge 
                        status={isComplete ? 'success' : 'processing'} 
                        text={<span className={isComplete ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{text}</span>} 
                    />
                );
            }
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">ความกืบหน้า</div>
                    <Input
                        size="small"
                        value={columnFilters.WorkAmount}
                        onChange={(e) => setColumnFilters({ ...columnFilters, WorkAmount: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'work_amount',
            key: 'work_amount',
            width: 160,
            align: 'center',
            render: (_, record) => {
                const isWarning = record.finish < record.total;
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-center items-center gap-1">
                            <span className={isWarning ? 'text-rose-600 font-black text-lg' : 'text-emerald-600 font-bold'}>{record.finish}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-500 font-medium">{record.total}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${isWarning ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${(record.finish / (record.total || 1)) * 100}%` }} 
                            />
                        </div>
                    </div>
                );
            }
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-[10px] tracking-wider text-slate-500">Action Date</div>
                    <Input
                        size="small"
                        prefix={<Calendar size={12} className="text-slate-400" />}
                        value={columnFilters.ActionDate}
                        onChange={(e) => setColumnFilters({ ...columnFilters, ActionDate: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'actiondate',
            key: 'actiondate',
            width: 140,
            align: 'center',
        },
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6 tracking-modern">
            <div className="rounded-xl bg-linear-to-r from-blue-700 to-indigo-600 p-4 shadow-lg mb-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="text-2xl" />
                    <Title level={4} className="m-0 text-white font-bold">User Activity Tracking</Title>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full">
                    <Award size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">System Monitor</span>
                </div>
            </div>

            <Card className="mb-6 shadow-sm border-slate-200">
                <div className="flex flex-wrap items-end gap-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider pl-1 font-mono">Month</label>
                        <Select
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            options={MONTHS.map(m => ({ label: m, value: m }))}
                            size="large"
                            className="w-[180px]"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider pl-1 font-mono">Year (BE)</label>
                        <Select
                            value={selectedYear}
                            onChange={setSelectedYear}
                            options={years.map(y => ({ label: y, value: y }))}
                            size="large"
                            className="w-[120px]"
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
                        เรียกดูข้อมูล
                    </Button>
                </div>
            </Card>

            <Card className="shadow-sm border-slate-200 overflow-hidden" styles={{ body: { padding: 0 } }}>
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => <span className="text-slate-500 text-xs font-mono">TOTAL: {total} USERS</span>,
                    }}
                    scroll={{ x: 1200 }}
                    size="middle"
                    className="modern-tracking-table"
                />
            </Card>

            <Modal
                title={
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                        <MapPin className="text-indigo-600" size={20} />
                        <span className="font-bold text-slate-800">หน่วยงานที่อยู่ภายใต้การดูแล</span>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsModalOpen(false)} className="rounded-lg bg-indigo-600 px-8">
                        ตกลง
                    </Button>
                ]}
                width={800}
                centered
                styles={{ body: { padding: '0 24px 24px' } }}
            >
                <div className="flex gap-4 mb-4">
                    <Input 
                        placeholder="รหัสหน่วยงาน..."
                        prefix={<Search size={14} className="text-slate-400" />}
                        value={unitFilters.OrgUnitNo}
                        onChange={(e) => setUnitFilters({...unitFilters, OrgUnitNo: e.target.value})}
                        className="rounded-lg border-slate-200"
                    />
                    <Input 
                        placeholder="ชื่อหน่วยงาน..."
                        prefix={<Search size={14} className="text-slate-400" />}
                        value={unitFilters.UnitName}
                        onChange={(e) => setUnitFilters({...unitFilters, UnitName: e.target.value})}
                        className="rounded-lg border-slate-200"
                    />
                </div>
                <Table
                    columns={[
                        { title: 'ลำดับ', key: 'idx', render: (_, __, i) => i + 1, width: 60, align: 'center' },
                        { title: 'รหัสหน่วยงาน', dataIndex: 'OrgUnitNo', key: 'OrgUnitNo', width: 150 },
                        { title: 'ชื่อหน่วยงาน', dataIndex: 'UnitName', key: 'UnitName' }
                    ]}
                    dataSource={filteredUnitData}
                    loading={unitLoading}
                    pagination={{ pageSize: 15, size: 'small' }}
                    scroll={{ y: 400 }}
                    size="small"
                    bordered
                    className="unit-tracking-table"
                />
            </Modal>

            <style jsx global>{`
                .modern-tracking-table .ant-table-thead > tr > th {
                    background: #f8fafc !important;
                    padding: 12px 8px !important;
                    border-bottom: 2px solid #e2e8f0 !important;
                }
                .modern-tracking-table .ant-table-row:hover > td {
                    background-color: #f1f5f9 !important;
                }
                .unit-tracking-table .ant-table-thead > tr > th {
                    background: #f1f5f9 !important;
                    font-weight: 700 !important;
                    color: #475569 !important;
                }
            `}</style>
        </div>
    );
}
