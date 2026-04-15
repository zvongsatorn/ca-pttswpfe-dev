'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Table, Button, Select, Modal, Card, App, Tag, Input, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserPlus, Search, MapPin, FileText, ArrowRightLeft, MessageSquare, ScrollText } from 'lucide-react';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import {
    getMonitorHistory,
    getMonitorHistoryActionLog,
    getMonitorHistoryUnits,
    type MonitorHistoryUnitOption
} from '@/services/monitorHistoryService';

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

interface HistoryClientProps {
    token: string;
    currentUser: CurrentUser | null;
    initialStartMonth: string;
    initialStartYear: string;
    initialEndMonth: string;
    initialEndYear: string;
}

interface HistoryDataType {
    key: string;
    transactionNo: string;
    createDate: string;
    effectiveDate: string;
    transactionTypeText: string;
    transactionDesc: string;
    note: string;
    fileUpload: string;
    unitReceiveName: string;
    unitTransferName: string;
}

interface ActionLogDataType {
    key: string;
    actionType: number;
    actionTypeText: string;
    note: string;
    name: string;
    actionDate: string;
}

const MONTHS = [
    { value: '01', label: 'มกราคม' },
    { value: '02', label: 'กุมภาพันธ์' },
    { value: '03', label: 'มีนาคม' },
    { value: '04', label: 'เมษายน' },
    { value: '05', label: 'พฤษภาคม' },
    { value: '06', label: 'มิถุนายน' },
    { value: '07', label: 'กรกฎาคม' },
    { value: '08', label: 'สิงหาคม' },
    { value: '09', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' }
];

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const readRowValue = (row: Record<string, unknown>, keys: string[]): unknown => {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
            return row[key];
        }
    }
    return '';
};

const parseDateText = (value: unknown, format: string): string => {
    const text = toText(value);
    if (!text) return '-';

    const candidates = [
        dayjs(text),
        dayjs(text, 'YYYY-MM-DD HH:mm:ss', true),
        dayjs(text, 'YYYY-MM-DDTHH:mm:ss', true),
        dayjs(text, 'DD/MM/YYYY HH:mm:ss', true),
        dayjs(text, 'DD/MM/YYYY', true),
        dayjs(text, 'YYYY-MM-DD', true),
    ];

    for (const candidate of candidates) {
        if (candidate.isValid()) {
            return candidate.format(format);
        }
    }

    return text;
};

const getFileUrl = (fileUpload: string): string => {
    const normalized = fileUpload.trim();
    if (!normalized) return '';
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    if (normalized.startsWith('/api/')) return normalized;
    if (normalized.startsWith('uploads/')) return `/api/${normalized}`;
    if (normalized.includes('/')) return `/api/${normalized.replace(/^\/+/, '')}`;
    return `/api/uploads/transactions/${normalized}`;
};

export default function HistoryClient({
    token,
    currentUser,
    initialStartMonth,
    initialStartYear,
    initialEndMonth,
    initialEndYear
}: HistoryClientProps) {
    const { message: messageApi } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [unitLoading, setUnitLoading] = useState(false);
    const [logLoading, setLogLoading] = useState(false);

    // Filters
    const [startMonth, setStartMonth] = useState<string>(initialStartMonth);
    const [startYear, setStartYear] = useState<string>(initialStartYear);
    const [endMonth, setEndMonth] = useState<string>(initialEndMonth);
    const [endYear, setEndYear] = useState<string>(initialEndYear);
    const [selectedUnit, setSelectedUnit] = useState<string | undefined>(undefined);
    const [units, setUnits] = useState<MonitorHistoryUnitOption[]>([]);

    // Column Filters
    const [columnFilters, setColumnFilters] = useState({
        type: '',
        resolution: '',
        remark: '',
    });

    const [data, setData] = useState<HistoryDataType[]>([]);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logData, setLogData] = useState<ActionLogDataType[]>([]);
    const [selectedRefNo, setSelectedRefNo] = useState('');
    const [activeUserGroupNo, setActiveUserGroupNo] = useState('');

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
                const parsed = JSON.parse(rawUserData) as { userGroupNo?: string; roleId?: string };
                const groupNo = (parsed.userGroupNo || parsed.roleId || '').trim();
                if (groupNo) return groupNo;
            }
        } catch {
            // noop
        }

        const role = currentUser?.role?.trim() || '';
        return /^\d+$/.test(role) ? role : '';
    }, [currentUser]);

    useEffect(() => {
        const syncUserGroupNo = () => {
            setActiveUserGroupNo(resolveUserGroupNo());
        };

        syncUserGroupNo();
        window.addEventListener('user-group-changed', syncUserGroupNo);
        return () => window.removeEventListener('user-group-changed', syncUserGroupNo);
    }, [resolveUserGroupNo]);

    const years = useMemo(() => {
        const currentYearBE = dayjs().year() + 543;
        const range: string[] = [];
        for (let year = currentYearBE + 1; year >= 2561; year -= 1) {
            range.push(year.toString());
        }
        return range;
    }, []);

    const transactionTypeOptions = useMemo(() => {
        const uniqueValues = Array.from(
            new Set(
                data
                    .map((item) => item.transactionTypeText)
                    .filter((item) => item !== '-' && item.length > 0)
            )
        );

        return uniqueValues.map((value) => ({ label: value, value }));
    }, [data]);

    const fetchUnits = useCallback(async () => {
        const employeeId = currentUser?.employeeID || '';
        if (!employeeId || !activeUserGroupNo) {
            setUnits([]);
            return;
        }

        setUnitLoading(true);
        try {
            const rows = await getMonitorHistoryUnits(employeeId, activeUserGroupNo, token);
            setUnits(rows);

            if (rows.length === 1) {
                setSelectedUnit(rows[0].value);
            }
        } catch {
            messageApi.error('ไม่สามารถโหลดรายการหน่วยงานได้');
        } finally {
            setUnitLoading(false);
        }
    }, [currentUser?.employeeID, activeUserGroupNo, token, messageApi]);

    useEffect(() => {
        void fetchUnits();
    }, [fetchUnits]);

    const handleSearch = useCallback(async () => {
        const fromPeriod = Number.parseInt(`${startYear}${startMonth}`, 10);
        const toPeriod = Number.parseInt(`${endYear}${endMonth}`, 10);

        if (!Number.isFinite(fromPeriod) || !Number.isFinite(toPeriod)) {
            messageApi.warning('รูปแบบช่วงเดือน/ปีไม่ถูกต้อง');
            return;
        }
        if (fromPeriod > toPeriod) {
            messageApi.warning('เดือนและปีเริ่มต้นมากกว่าสิ้นสุด กรุณาตรวจสอบ');
            return;
        }

        if (!selectedUnit) {
            messageApi.warning('กรุณาเลือกหน่วยงาน');
            return;
        }

        const employeeId = currentUser?.employeeID || '';
        if (!employeeId || !activeUserGroupNo) {
            messageApi.warning('ไม่พบข้อมูลผู้ใช้งานหรือสิทธิ์');
            return;
        }

        setLoading(true);
        try {
            const rows = await getMonitorHistory({
                dmonth1: startMonth,
                dyear1: startYear,
                dmonth2: endMonth,
                dyear2: endYear,
                employeeId,
                orgUnitNo: selectedUnit,
                userGroupNo: activeUserGroupNo,
            }, token);

            const mappedRows = (rows as Array<Record<string, unknown>>).map((row, index) => ({
                key: `monitor-history-${index}`,
                transactionNo: toText(readRowValue(row, ['TransactionNo', 'transactionNo'])),
                createDate: parseDateText(readRowValue(row, ['CreateDate', 'createDate']), 'DD/MM/YYYY HH:mm:ss'),
                effectiveDate: parseDateText(readRowValue(row, ['EffectiveDate', 'effectiveDate']), 'DD/MM/YYYY'),
                transactionTypeText: toText(readRowValue(row, ['TransactionTypeText', 'transactionTypeText'])) || '-',
                transactionDesc: toText(readRowValue(row, ['TransactionDesc', 'transactionDesc'])) || '-',
                note: toText(readRowValue(row, ['note', 'Note'])) || '-',
                fileUpload: toText(readRowValue(row, ['FileUpload', 'fileUpload'])),
                unitReceiveName: toText(readRowValue(row, ['UnitReceiveName', 'unitReceiveName'])) || '-',
                unitTransferName: toText(readRowValue(row, ['UnitTransferName', 'unitTransferName'])) || '-',
            }));

            setData(mappedRows);
        } catch {
            messageApi.error('ไม่สามารถโหลดข้อมูล Monitor History ได้');
        } finally {
            setLoading(false);
        }
    }, [
        startMonth,
        startYear,
        endMonth,
        endYear,
        selectedUnit,
        currentUser?.employeeID,
        activeUserGroupNo,
        token,
        messageApi
    ]);

    const openLogModal = useCallback(async (transactionNo: string) => {
        if (!transactionNo) return;

        setSelectedRefNo(transactionNo);
        setIsLogModalOpen(true);
        setLogLoading(true);

        try {
            const rows = await getMonitorHistoryActionLog(transactionNo, token);
            const mapped = rows.map((row, index) => ({
                key: `action-log-${index}`,
                actionType: Number.parseInt(toText(row.ActionType), 10) || 0,
                actionTypeText: toText(row.ActionTypeText) || '-',
                note: toText(row.Note) || '-',
                name: toText(row.Name) || '-',
                actionDate: parseDateText(row.ActionDate, 'DD/MM/YYYY HH:mm:ss'),
            }));
            setLogData(mapped);
        } catch {
            messageApi.error('ไม่สามารถโหลด Action Log ได้');
            setLogData([]);
        } finally {
            setLogLoading(false);
        }
    }, [token, messageApi]);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const typePass = columnFilters.type
                ? (item.transactionTypeText || '').toLowerCase().includes(columnFilters.type.toLowerCase())
                : true;
            const resolutionPass = (item.transactionDesc || '').toLowerCase().includes(columnFilters.resolution.toLowerCase());
            const remarkPass = (item.note || '').toLowerCase().includes(columnFilters.remark.toLowerCase());

            return typePass && resolutionPass && remarkPass;
        });
    }, [data, columnFilters]);

    const logColumns: ColumnsType<ActionLogDataType> = [
        {
            title: 'Action',
            dataIndex: 'actionTypeText',
            key: 'actionTypeText',
            width: 140,
            align: 'center',
            render: (text, record) => {
                const color = record.actionType === 1 || record.actionType === 3 ? 'green' : 'red';
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: 'Note',
            dataIndex: 'note',
            key: 'note',
            width: 280,
        },
        {
            title: 'ผู้ทำรายการ',
            dataIndex: 'name',
            key: 'name',
            width: 180,
        },
        {
            title: 'วันที่ทำรายการ',
            dataIndex: 'actionDate',
            key: 'actionDate',
            width: 180,
            align: 'center',
        },
    ];

    const columns: ColumnsType<HistoryDataType> = [
        {
            title: 'วันที่สร้าง',
            dataIndex: 'createDate',
            key: 'createDate',
            align: 'center',
            width: 150,
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
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">ประเภท</div>
                    <Select
                        size="small"
                        allowClear
                        options={transactionTypeOptions}
                        value={columnFilters.type || undefined}
                        onChange={(value) => setColumnFilters({ ...columnFilters, type: value || '' })}
                        className="rounded-md"
                    />
                </div>
            ),
            dataIndex: 'transactionTypeText',
            key: 'transactionTypeText',
            width: 160,
            align: 'center',
            render: (text) => <Tag color="blue" className="rounded-full px-3">{text}</Tag>
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">มติ</div>
                    <Input
                        size="small"
                        prefix={<Search size={12} className="text-slate-400" />}
                        value={columnFilters.resolution}
                        onChange={(e) => setColumnFilters({ ...columnFilters, resolution: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'transactionDesc',
            key: 'transactionDesc',
            width: 420,
        },
        {
            title: '',
            key: 'actionLog',
            align: 'center',
            width: 70,
            render: (_value, record) => (
                <Tooltip title="ดู Action Log">
                    <Button
                        type="text"
                        icon={<ScrollText size={18} className="text-indigo-600" />}
                        onClick={() => void openLogModal(record.transactionNo)}
                    />
                </Tooltip>
            )
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold uppercase text-xs tracking-wider text-slate-500">หมายเหตุ</div>
                    <Input
                        size="small"
                        prefix={<MessageSquare size={12} className="text-slate-400" />}
                        value={columnFilters.remark}
                        onChange={(e) => setColumnFilters({ ...columnFilters, remark: e.target.value })}
                        className="rounded-md border-slate-200"
                    />
                </div>
            ),
            dataIndex: 'note',
            key: 'note',
            width: 220,
        },
        {
            title: 'File',
            dataIndex: 'fileUpload',
            key: 'fileUpload',
            align: 'center',
            width: 80,
            render: (fileUpload: string) => {
                const fileUrl = getFileUrl(fileUpload);
                if (!fileUrl) return '-';

                return (
                    <Button
                        type="text"
                        icon={<FileText size={18} className="text-red-500" />}
                        onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                    />
                );
            }
        },
        {
            title: 'หน่วยที่รับโอน',
            dataIndex: 'unitReceiveName',
            key: 'unitReceiveName',
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
            dataIndex: 'unitTransferName',
            key: 'unitTransferName',
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
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                        <UserPlus className="text-xl" />
                        <h1 className="text-2xl font-bold m-0 text-white">
                            การเปลี่ยนแปลงกรอบอัตรากำลัง
                        </h1>
                    </div>
                </div>
            </div>

            <Card className="mb-6 shadow-sm border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <label className="text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">FROM</label>
                        <Select
                            value={startMonth}
                            onChange={setStartMonth}
                            options={MONTHS}
                            size="middle"
                            className="w-[140px]"
                        />
                        <Select
                            value={startYear}
                            onChange={setStartYear}
                            options={years.map((year) => ({ label: year, value: year }))}
                            size="middle"
                            className="w-[110px]"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <label className="text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">TO</label>
                        <Select
                            value={endMonth}
                            onChange={setEndMonth}
                            options={MONTHS}
                            size="middle"
                            className="w-[140px]"
                        />
                        <Select
                            value={endYear}
                            onChange={setEndYear}
                            options={years.map((year) => ({ label: year, value: year }))}
                            size="middle"
                            className="w-[110px]"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 flex-1 min-w-[320px]">
                        <label className="text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">UNIT</label>
                        <Select
                            placeholder="เลือกหน่วยงาน..."
                            allowClear
                            value={selectedUnit}
                            onChange={setSelectedUnit}
                            options={units}
                            loading={unitLoading}
                            size="middle"
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            className="w-full"
                        />
                    </div>

                    <Button
                        type="primary"
                        size="middle"
                        onClick={() => void handleSearch()}
                        loading={loading}
                        icon={<SearchOutlined />}
                        className="bg-blue-500 hover:bg-blue-600 border-blue-500 h-10 px-6 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
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
                        showTotal: (total) => <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">RESULT: {total} LOGS</span>,
                    }}
                    scroll={{ x: 1700 }}
                    size="middle"
                    className="modern-history-table"
                />
            </Card>

            <Modal
                title={`Log: ${selectedRefNo}`}
                open={isLogModalOpen}
                onCancel={() => setIsLogModalOpen(false)}
                footer={null}
                width={860}
            >
                <Table
                    columns={logColumns}
                    dataSource={logData}
                    loading={logLoading}
                    pagination={false}
                    scroll={{ x: 800 }}
                    size="middle"
                />
            </Modal>

            <style jsx global>{`
                .modern-history-table .ant-table-thead > tr > th {
                    background: #bfdbfe !important;
                    color: #000 !important;
                    font-weight: 700 !important;
                    padding: 12px 8px !important;
                    border-bottom: 0 !important;
                }
                .modern-history-table .ant-table-row:hover > td {
                    background-color: #f1f5f9 !important;
                }
            `}</style>
        </div>
    );
}
