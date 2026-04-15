'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Modal, Card, Typography, Tag, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Search, Eye, Activity, MapPin, ClipboardList, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import {
    getTrackingUsers,
    getTrackingUnits,
    getTransactionPendingByEmployeeId,
} from '@/services/trackingService';

const { Title } = Typography;

interface UserGroup {
    userGroupNo: string;
    userGroupName: string;
    userGroupRole: string;
}

interface CurrentUser {
    employeeID?: string;
    role?: string;
    userGroupNo?: string;
    userGroups?: UserGroup[];
}

interface UserTrackingDataType {
    key: string;
    EmployeeID: string;
    Name: string;
    UserGroupName: string;
    UserGroupNo: string;
    BGName: string;
}

interface UnitTrackingDataType {
    key: string;
    OrgUnitNo: string;
    UnitName: string;
}

interface TransactionPendingDataType {
    key: string;
    displayId: string;
    title: string;
    createDate: string;
    currentStepLabel: string;
    currentHandler: string;
    pendingDays: number;
}

interface TrackingClientProps {
    token: string;
    currentUser: CurrentUser | null;
    initialMonth: string;
    initialYear: string;
}

const MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

export default function TrackingClient({ token, currentUser, initialMonth, initialYear }: TrackingClientProps) {
    const { message: messageApi } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
    const [selectedYear, setSelectedYear] = useState<string>(initialYear);
    const [activeUserGroupNo, setActiveUserGroupNo] = useState('');
    const [activeEmployeeId, setActiveEmployeeId] = useState('');

    const [columnFilters, setColumnFilters] = useState({
        EmployeeID: '',
        Name: '',
        UserGroupName: '',
        BGName: '',
    });

    const [data, setData] = useState<UserTrackingDataType[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [unitLoading, setUnitLoading] = useState(false);
    const [unitData, setUnitData] = useState<UnitTrackingDataType[]>([]);
    const [unitFilters, setUnitFilters] = useState({ OrgUnitNo: '', UnitName: '' });

    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [trackingData, setTrackingData] = useState<TransactionPendingDataType[]>([]);
    const [pendingCountByEmployee, setPendingCountByEmployee] = useState<Record<string, number>>({});
    const [pendingRowsByEmployee, setPendingRowsByEmployee] = useState<Record<string, Array<Record<string, unknown>>>>({});
    const [pendingCountLoading, setPendingCountLoading] = useState(false);
    const [trackingOwner, setTrackingOwner] = useState<{ employeeId: string; name: string }>({
        employeeId: '',
        name: '',
    });

    const years = useMemo(() => {
        const currentYearBE = dayjs().year() + 543;
        const range: string[] = [];
        for (let i = currentYearBE + 1; i >= 2561; i -= 1) {
            range.push(i.toString());
        }
        return range;
    }, []);

    const resolveUserGroupNo = useCallback(() => {
        if (typeof window === 'undefined') return '';

        const selectedUserGroup = localStorage.getItem('selected_usergroup')?.trim();
        if (selectedUserGroup) return selectedUserGroup;

        const userGroupFromCurrent = currentUser?.userGroupNo?.trim();
        if (userGroupFromCurrent) return userGroupFromCurrent;

        if (currentUser?.userGroups && currentUser.userGroups.length > 0) {
            const firstGroup = currentUser.userGroups[0]?.userGroupNo?.trim();
            if (firstGroup) return firstGroup;
        }

        try {
            const rawUserData = localStorage.getItem('user_data');
            if (rawUserData) {
                const parsed = JSON.parse(rawUserData) as { userGroupNo?: string; roleId?: string; role?: string };
                const groupNo = (parsed.userGroupNo || parsed.roleId || parsed.role || '').trim();
                if (groupNo) return groupNo;
            }
        } catch {
            // noop
        }

        const role = currentUser?.role?.trim() || '';
        return /^\d+$/.test(role) ? role : '';
    }, [currentUser]);

    const resolveEmployeeId = useCallback(() => {
        const fromCurrent = currentUser?.employeeID?.trim();
        if (fromCurrent) return fromCurrent;

        if (typeof window === 'undefined') return '';
        try {
            const rawUserData = localStorage.getItem('user_data');
            if (rawUserData) {
                const parsed = JSON.parse(rawUserData) as { employeeID?: string };
                return (parsed.employeeID || '').trim();
            }
        } catch {
            // noop
        }

        return '';
    }, [currentUser]);

    useEffect(() => {
        const syncUserContext = () => {
            setActiveUserGroupNo(resolveUserGroupNo());
            setActiveEmployeeId(resolveEmployeeId());
        };

        syncUserContext();
        window.addEventListener('user-group-changed', syncUserContext);
        return () => window.removeEventListener('user-group-changed', syncUserContext);
    }, [resolveUserGroupNo, resolveEmployeeId]);

    const handleSearch = useCallback(async () => {
        if (!activeEmployeeId || !activeUserGroupNo) {
            setData([]);
            return;
        }

        setLoading(true);
        try {
            const adYear = (parseInt(selectedYear, 10) - 543).toString();
            const monthIndex = MONTHS.indexOf(selectedMonth) + 1;
            const monthValue = monthIndex.toString().padStart(2, '0');

            const res = await getTrackingUsers({
                dmonth: monthValue,
                dyear: adYear,
                userGroupNo: activeUserGroupNo,
                employeeId: activeEmployeeId,
            }, token);

            const mappedData = (Array.isArray(res) ? res : []).map((item: Record<string, unknown>, idx: number) => ({
                key: `tracking-${idx}`,
                EmployeeID: toText(item.EmployeeID),
                Name: toText(item.Name),
                UserGroupName: toText(item.UserGroupName),
                UserGroupNo: toText(item.UserGroupNo),
                BGName: toText(item.BGName),
            }));
            setData(mappedData);
        } catch {
            messageApi.error('ไม่สามารถโหลดข้อมูลติดตามงานได้');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, activeUserGroupNo, activeEmployeeId, token, messageApi]);

    useEffect(() => {
        void handleSearch();
    }, [handleSearch]);

    const mapPendingRows = useCallback((rows: Array<Record<string, unknown>>): TransactionPendingDataType[] => {
        return rows.map((item, index) => {
            const createDateRaw = toText(item.CreateDate);
            const lastActionRaw = toText(item.LastActionDate) || createDateRaw;

            const createDate = createDateRaw && dayjs(createDateRaw).isValid()
                ? dayjs(createDateRaw).format('DD/MM/YYYY HH:mm')
                : '-';

            const pendingDays = lastActionRaw && dayjs(lastActionRaw).isValid()
                ? Math.max(0, dayjs().startOf('day').diff(dayjs(lastActionRaw).startOf('day'), 'day'))
                : 0;

            return {
                key: `tracking-pending-${index}`,
                displayId: `[${toText(item.TransactionNo) || '-'}]`,
                title: toText(item.TransactionDesc) || 'ไม่มีคำอธิบาย',
                createDate,
                currentStepLabel: toText(item.UserGroupNo) || 'รอตรวจสอบ',
                currentHandler: toText(item.CurrentHandler) || '-',
                pendingDays,
            };
        });
    }, []);

    useEffect(() => {
        const employeeIds = Array.from(
            new Set(
                data
                    .map((item) => (item.EmployeeID || '').trim())
                    .filter(Boolean)
            )
        );

        if (employeeIds.length === 0) {
            setPendingCountByEmployee({});
            setPendingRowsByEmployee({});
            return;
        }

        let cancelled = false;
        const loadPendingCounts = async () => {
            setPendingCountLoading(true);
            try {
                const results = await Promise.all(
                    employeeIds.map(async (employeeId) => {
                        try {
                            const rows = await getTransactionPendingByEmployeeId(employeeId, token);
                            return { employeeId, rows };
                        } catch {
                            return { employeeId, rows: [] as Array<Record<string, unknown>> };
                        }
                    })
                );

                if (cancelled) return;

                const nextCountMap: Record<string, number> = {};
                const nextRowsMap: Record<string, Array<Record<string, unknown>>> = {};

                results.forEach(({ employeeId, rows }) => {
                    nextCountMap[employeeId] = rows.length;
                    nextRowsMap[employeeId] = rows;
                });

                setPendingCountByEmployee(nextCountMap);
                setPendingRowsByEmployee(nextRowsMap);
            } finally {
                if (!cancelled) {
                    setPendingCountLoading(false);
                }
            }
        };

        void loadPendingCounts();
        return () => {
            cancelled = true;
        };
    }, [data, token]);

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
                employeeId: empId || '',
            }, token);

            const mappedUnits = (Array.isArray(res) ? res : []).map((item: Record<string, unknown>, idx: number) => ({
                key: `unit-${idx}`,
                OrgUnitNo: toText(item.OrgUnitNo),
                UnitName: toText(item.UnitName),
            }));
            setUnitData(mappedUnits);
        } catch {
            messageApi.error('ไม่สามารถโหลดข้อมูลหน่วยงานได้');
        } finally {
            setUnitLoading(false);
        }
    };

    const openTrackingModal = useCallback(async (employeeId: string, name: string) => {
        setTrackingOwner({ employeeId, name });
        setTrackingData([]);
        setIsTrackingModalOpen(true);

        const cachedRows = pendingRowsByEmployee[employeeId];
        if (cachedRows) {
            setTrackingData(mapPendingRows(cachedRows));
            return;
        }

        setTrackingLoading(true);

        try {
            const rows = await getTransactionPendingByEmployeeId(employeeId, token);
            setTrackingData(mapPendingRows(rows));
        } catch {
            messageApi.error('ไม่สามารถโหลดรายการ Transaction Pending ได้');
        } finally {
            setTrackingLoading(false);
        }
    }, [mapPendingRows, messageApi, pendingRowsByEmployee, token]);

    const filteredData = useMemo(() => {
        return data.filter((item) => (
            (item.EmployeeID || '').toLowerCase().includes(columnFilters.EmployeeID.toLowerCase()) &&
            (item.Name || '').toLowerCase().includes(columnFilters.Name.toLowerCase()) &&
            (item.UserGroupName || '').toLowerCase().includes(columnFilters.UserGroupName.toLowerCase()) &&
            (item.BGName || '').toLowerCase().includes(columnFilters.BGName.toLowerCase())
        ));
    }, [data, columnFilters]);

    const filteredUnitData = useMemo(() => {
        return unitData.filter((item) => (
            (item.OrgUnitNo || '').toLowerCase().includes(unitFilters.OrgUnitNo.toLowerCase()) &&
            (item.UnitName || '').toLowerCase().includes(unitFilters.UnitName.toLowerCase())
        ));
    }, [unitData, unitFilters]);

    const getStageBadgeColor = (stageName: string) => {
        const upperStage = (stageName || '').toUpperCase();
        if (upperStage.includes('HRUSER')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (upperStage.includes('HRVERIFY')) return 'bg-green-100 text-green-700 border-green-200';
        if (upperStage.includes('HRPOLICY')) return 'bg-purple-100 text-purple-700 border-purple-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const columns: ColumnsType<UserTrackingDataType> = [
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">รหัสพนักงาน</div>
                    <Input
                        size="middle"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.EmployeeID}
                        onChange={(e) => setColumnFilters({ ...columnFilters, EmployeeID: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'EmployeeID',
            key: 'EmployeeID',
            width: '10%',
            align: 'center',
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">ชื่อผู้ใช้งาน</div>
                    <Input
                        size="middle"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.Name}
                        onChange={(e) => setColumnFilters({ ...columnFilters, Name: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'Name',
            key: 'Name',
            width: '18%',
            ellipsis: true,
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">สิทธิ์</div>
                    <Input
                        size="middle"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.UserGroupName}
                        onChange={(e) => setColumnFilters({ ...columnFilters, UserGroupName: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'UserGroupName',
            key: 'UserGroupName',
            width: '14%',
            ellipsis: true,
            render: (text) => <Tag color="blue" className="rounded-full px-3 m-0">{text}</Tag>,
        },
        {
            title: () => (
                <div className="flex flex-col gap-2 h-full justify-center">
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">หน่วยงานดูแล</div>
                    <div className="h-6" />
                </div>
            ),
            key: 'units',
            width: '8%',
            align: 'center',
            render: (_: unknown, record: UserTrackingDataType) => (
                <Button
                    type="text"
                    icon={<Eye size={18} className="text-blue-500" />}
                    onClick={() => openUnitModal(record.UserGroupNo, record.EmployeeID)}
                    className="hover:bg-blue-50 rounded-full"
                />
            ),
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">BG</div>
                    <Input
                        size="middle"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.BGName}
                        onChange={(e) => setColumnFilters({ ...columnFilters, BGName: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'BGName',
            key: 'BGName',
            width: '32%',
            align: 'left',
        },
        {
            title: () => (
                <div className="flex flex-col gap-2 h-full justify-center">
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">การติดตามงาน</div>
                    <div className="h-6" />
                </div>
            ),
            key: 'tracking',
            width: '18%',
            align: 'center',
            render: (_: unknown, record: UserTrackingDataType) => {
                const count = pendingCountByEmployee[record.EmployeeID];
                const hasCount = typeof count === 'number';

                if (!hasCount && pendingCountLoading) {
                    return (
                        <div className="flex items-center justify-center text-slate-400">
                            <Loader2 size={14} className="animate-spin" />
                        </div>
                    );
                }

                if ((count || 0) <= 0) {
                    return (
                        <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-semibold">
                            <CheckCircle size={14} />
                            <span>ไม่มีงานค้าง</span>
                        </div>
                    );
                }

                return (
                    <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-600 px-2 py-0.5 text-xs font-bold">
                            <AlertCircle size={12} />
                            {count}
                        </span>
                        <Button
                            type="link"
                            icon={<ClipboardList size={16} />}
                            className="font-semibold px-0"
                            onClick={() => openTrackingModal(record.EmployeeID, record.Name)}
                        >
                            ดู
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="w-full max-w-full overflow-x-hidden bg-slate-50 p-6 tracking-modern">
            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Activity className="text-2xl text-white" />
                        <Title level={4} className="m-0 font-bold" style={{ color: '#ffffff' }}>ติดตามสถานะงาน (Transaction Pending)</Title>
                    </div>
                    <div className="flex flex-wrap items-center xl:justify-end gap-3">
                        <div className="flex items-center gap-2 bg-white/15 px-3 py-2 rounded-lg border border-white/30">
                            <label className="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">Month</label>
                            <Select
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                options={MONTHS.map((m) => ({ label: m, value: m }))}
                                size="middle"
                                className="w-[170px]"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white/15 px-3 py-2 rounded-lg border border-white/30">
                            <label className="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">Year</label>
                            <Select
                                value={selectedYear}
                                onChange={setSelectedYear}
                                options={years.map((y) => ({ label: y, value: y }))}
                                size="middle"
                                className="w-[120px]"
                            />
                        </div>
                        <Button
                            type="default"
                            size="middle"
                            onClick={handleSearch}
                            loading={loading}
                            icon={<Search size={18} />}
                            style={{ backgroundColor: '#ffffff', color: '#1d4ed8', borderColor: '#ffffff' }}
                            className="h-10 px-6 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 hover:!bg-blue-50 hover:!text-blue-800"
                        >
                            เรียกดูข้อมูล
                        </Button>
                    </div>
                </div>
            </div>

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
                    size="middle"
                    tableLayout="fixed"
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
                    </Button>,
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
                        onChange={(e) => setUnitFilters({ ...unitFilters, OrgUnitNo: e.target.value })}
                        className="rounded-lg border-slate-200"
                    />
                    <Input
                        placeholder="ชื่อหน่วยงาน..."
                        prefix={<Search size={14} className="text-slate-400" />}
                        value={unitFilters.UnitName}
                        onChange={(e) => setUnitFilters({ ...unitFilters, UnitName: e.target.value })}
                        className="rounded-lg border-slate-200"
                    />
                </div>
                <Table
                    columns={[
                        { title: 'ลำดับ', key: 'idx', render: (_: unknown, __: unknown, i: number) => i + 1, width: 60, align: 'center' as const },
                        { title: 'รหัสหน่วยงาน', dataIndex: 'OrgUnitNo', key: 'OrgUnitNo', width: 150 },
                        { title: 'ชื่อหน่วยงาน', dataIndex: 'UnitName', key: 'UnitName' },
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

            <Modal
                title={
                    <div className="flex items-start gap-2 border-b border-slate-100 pb-3 mb-4">
                        <ClipboardList className="text-indigo-600 mt-0.5" size={20} />
                        <div>
                            <div className="font-bold text-slate-800">การติดตามงาน</div>
                            <div className="text-xs text-slate-500 mt-1">
                                <span className="font-semibold text-blue-600">Transaction Pending</span>
                                <span className="mx-2">|</span>
                                <span>{trackingOwner.employeeId} {trackingOwner.name}</span>
                            </div>
                            <div className="text-[11px] text-amber-600 mt-1">
                                แสดงเฉพาะรายการที่พนักงานนี้เป็นผู้สร้างเอกสาร
                            </div>
                        </div>
                    </div>
                }
                open={isTrackingModalOpen}
                onCancel={() => setIsTrackingModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setIsTrackingModalOpen(false)}>
                        ปิด
                    </Button>,
                ]}
                width={980}
                centered
                styles={{ body: { padding: '0 24px 20px' } }}
            >
                <Table
                    loading={trackingLoading}
                    dataSource={trackingData}
                    rowKey="key"
                    pagination={false}
                    scroll={{ y: 420 }}
                    className="tracking-pending-table"
                    locale={{ emptyText: 'ไม่พบรายการ Transaction Pending ของพนักงานนี้ (ผู้สร้างเอกสาร)' }}
                    columns={[
                        {
                            title: 'Ref ID / Subject',
                            key: 'subject',
                            render: (_: unknown, record: TransactionPendingDataType) => (
                                <div className="py-1">
                                    <div className="text-[12px] font-bold text-gray-800">{record.displayId}</div>
                                    <div className="text-[13px] text-gray-600 mt-1 pr-3">{record.title}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">{record.createDate}</div>
                                </div>
                            ),
                        },
                        {
                            title: 'Stage',
                            dataIndex: 'currentStepLabel',
                            key: 'currentStepLabel',
                            width: 220,
                            align: 'center',
                            render: (stage: string) => (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border max-w-full truncate ${getStageBadgeColor(stage)}`}>
                                    {stage || '-'}
                                </span>
                            ),
                        },
                        {
                            title: 'Current Handler',
                            dataIndex: 'currentHandler',
                            key: 'currentHandler',
                            width: 280,
                            render: (_: unknown, record: TransactionPendingDataType) => (
                                <div>
                                    <div className="text-[13px] font-bold text-gray-700">{record.currentHandler}</div>
                                    {record.pendingDays > 0 ? (
                                        <div className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                                            <Clock size={10} /> Pending {record.pendingDays} days
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-green-600 flex items-center gap-1 mt-0.5">
                                            <Clock size={10} /> Pending today
                                        </div>
                                    )}
                                </div>
                            ),
                        },
                    ]}
                />
            </Modal>

            <style jsx global>{`
                .modern-tracking-table .ant-table-thead > tr > th {
                    background: #bfdbfe !important;
                    color: #000 !important;
                    font-weight: 700 !important;
                    padding: 12px 8px !important;
                    border-bottom: 0 !important;
                }
                .modern-tracking-table .ant-table-row:hover > td {
                    background-color: #f1f5f9 !important;
                }
                .modern-tracking-table .ant-table-cell {
                    white-space: normal !important;
                    word-break: break-word;
                }
                .modern-tracking-table .ant-table-container,
                .modern-tracking-table .ant-table-content,
                .modern-tracking-table .ant-table-body {
                    overflow: visible !important;
                }
                .unit-tracking-table .ant-table-thead > tr > th,
                .tracking-pending-table .ant-table-thead > tr > th {
                    background: #bfdbfe !important;
                    color: #000 !important;
                    font-weight: 700 !important;
                }
            `}</style>
        </div>
    );
}
