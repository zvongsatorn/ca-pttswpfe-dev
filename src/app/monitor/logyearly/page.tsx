'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Select, Modal, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { ScrollText } from 'lucide-react';
import dayjs from 'dayjs';
import {
    getTransactionLogYearly,
    getTransactionLogYearlyDetail,
    getTransactionLogYearlyUnits,
    type TransactionLogYearlyUnitOption
} from '@/services/transactionLogYearlyService';

interface LogYearlyDataType {
    key: string;
    month: string;
    monthNum: number;
    amount_1: number;
    amount_2: number;
    amount_3: number;
    amount_4: number;
    amount_5: number;
    amount_6: number;
    amount_7: number;
    total_amount: number;
    amount_8: number;
    amount_10: number;
    t_amount_1: number;
    t_amount_2: number;
    t_amount_3: number;
    t_amount_4: number;
    t_amount_5: number;
    t_amount_6: number;
    t_amount_7: number;
    t_total_amount: number;
    t_amount_8: number;
    t_amount_10: number;
}

interface LogYearlyDetailDataType {
    key: string;
    transactionTypeText: string;
    effectiveDate: string;
    transactionDesc: string;
    note: string;
    createDate: string;
}

interface StoredUserData {
    employeeID?: string;
    userGroupNo?: string;
    roleId?: string;
    role?: string;
}

const MONTHS = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม'
];

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const toNumber = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number.parseFloat(toText(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const readRowValue = (row: Record<string, unknown>, keys: string[]): unknown => {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
            return row[key];
        }
    }
    return '';
};

const formatDate = (value: unknown, format: string): string => {
    const text = toText(value);
    if (!text) return '-';

    const parsed = [
        dayjs(text),
        dayjs(text, 'YYYY-MM-DD HH:mm:ss', true),
        dayjs(text, 'YYYY-MM-DDTHH:mm:ss', true),
        dayjs(text, 'DD/MM/YYYY HH:mm:ss', true),
        dayjs(text, 'DD/MM/YYYY', true),
        dayjs(text, 'YYYY-MM-DD', true),
    ];

    for (const item of parsed) {
        if (item.isValid()) return item.format(format);
    }

    return text;
};

const renderNumberWithDiff = (amount: number, diff: number) => {
    if (diff === 0) {
        return <div className="text-right">{amount.toLocaleString()}</div>;
    }

    const diffClass = diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-500';
    return (
        <div className="flex justify-end items-center gap-1">
            <span className={`text-xs ${diffClass}`}>({diff.toLocaleString()})</span>
            <span>{amount.toLocaleString()}</span>
        </div>
    );
};

const getYears = (): string[] => {
    const currentYearBE = new Date().getFullYear() + 543;
    const endYear = currentYearBE + 1;

    if (typeof window === 'undefined') {
        return [endYear.toString(), currentYearBE.toString()];
    }

    const startYearRaw = localStorage.getItem('StartYear') || '2568';
    const startYear = Number.parseInt(startYearRaw, 10);
    const minYear = Number.isInteger(startYear) && startYear > 2400 ? startYear : 2568;
    const years: string[] = [];

    for (let year = endYear; year >= minYear; year -= 1) {
        years.push(year.toString());
    }

    return years;
};

const normalizeMonthNumber = (row: Record<string, unknown>, index: number): number => {
    const fromField = toNumber(readRowValue(row, ['monthnum', 'MonthNum', 'MonthNo']));
    if (Number.isInteger(fromField) && fromField >= 1 && fromField <= 12) {
        return fromField;
    }

    const monthText = toText(readRowValue(row, ['Month', 'monthName', 'month']));
    const fromName = MONTHS.indexOf(monthText) + 1;
    if (fromName >= 1 && fromName <= 12) {
        return fromName;
    }

    const fromIndex = index + 1;
    if (fromIndex >= 1 && fromIndex <= 12) {
        return fromIndex;
    }

    return 0;
};

export default function LogYearlyPage() {
    const [messageApi, messageContextHolder] = message.useMessage();
    const [loading, setLoading] = useState(false);
    const [unitLoading, setUnitLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    const [selectedUnit, setSelectedUnit] = useState<string | undefined>(undefined);
    const [units, setUnits] = useState<TransactionLogYearlyUnitOption[]>([]);

    const [selectedYear, setSelectedYear] = useState<string>(() => (new Date().getFullYear() + 543).toString());
    const [years, setYears] = useState<string[]>(() => getYears());

    const [token, setToken] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [userGroupNo, setUserGroupNo] = useState('');

    const [data, setData] = useState<LogYearlyDataType[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailMonthLabel, setDetailMonthLabel] = useState('');
    const [detailData, setDetailData] = useState<LogYearlyDetailDataType[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const authToken = localStorage.getItem('auth_token') || '';
        setToken(authToken);
        setYears(getYears());

        try {
            const rawUserData = localStorage.getItem('user_data');
            const parsed = rawUserData ? (JSON.parse(rawUserData) as StoredUserData) : null;
            const empId = parsed?.employeeID?.trim() || '';
            const selectedGroup = localStorage.getItem('selected_usergroup')?.trim() || '';
            const roleGroup = parsed?.userGroupNo?.trim() || parsed?.roleId?.trim() || parsed?.role?.trim() || '';

            setEmployeeId(empId);
            setUserGroupNo(selectedGroup || roleGroup);
        } catch {
            setEmployeeId('');
            setUserGroupNo('');
        }
    }, []);

    const fetchUnits = useCallback(async () => {
        if (!employeeId || !userGroupNo) {
            setUnits([]);
            setSelectedUnit(undefined);
            return;
        }

        setUnitLoading(true);
        try {
            const rows = await getTransactionLogYearlyUnits(employeeId, userGroupNo, token);
            setUnits(rows);

            if (rows.length === 1) {
                setSelectedUnit(rows[0].value);
                return;
            }

            if (selectedUnit && rows.some((item) => item.value === selectedUnit)) {
                return;
            }

            setSelectedUnit(undefined);
        } catch {
            messageApi.error('ไม่สามารถโหลดรายการหน่วยงานได้');
            setUnits([]);
            setSelectedUnit(undefined);
        } finally {
            setUnitLoading(false);
        }
    }, [employeeId, userGroupNo, token, selectedUnit, messageApi]);

    useEffect(() => {
        void fetchUnits();
    }, [fetchUnits]);

    const mapYearlyRows = useCallback((rows: Array<Record<string, unknown>>) => {
        return rows.map((row, index) => {
            const monthNum = normalizeMonthNumber(row, index);
            const monthLabelFromDb = toText(readRowValue(row, ['Month', 'monthName']));
            const monthLabel = monthLabelFromDb || MONTHS[monthNum - 1] || `เดือน ${index + 1}`;

            return {
                key: `${monthNum || index}`,
                month: monthLabel,
                monthNum,
                amount_1: toNumber(readRowValue(row, ['amount_1', 'level_21'])),
                amount_2: toNumber(readRowValue(row, ['amount_2', 'level_18_20'])),
                amount_3: toNumber(readRowValue(row, ['amount_3', 'level_16_17'])),
                amount_4: toNumber(readRowValue(row, ['amount_4', 'level_14_15'])),
                amount_5: toNumber(readRowValue(row, ['amount_5', 'level_11_13'])),
                amount_6: toNumber(readRowValue(row, ['amount_6', 'level_9_10'])),
                amount_7: toNumber(readRowValue(row, ['amount_7', 'level_4_8'])),
                total_amount: toNumber(readRowValue(row, ['total_amount', 'total'])),
                amount_8: toNumber(readRowValue(row, ['amount_8', 'contract'])),
                amount_10: toNumber(readRowValue(row, ['amount_10', 'amount_subcontact', 'contract_sub'])),
                t_amount_1: toNumber(readRowValue(row, ['t_amount_1'])),
                t_amount_2: toNumber(readRowValue(row, ['t_amount_2'])),
                t_amount_3: toNumber(readRowValue(row, ['t_amount_3'])),
                t_amount_4: toNumber(readRowValue(row, ['t_amount_4'])),
                t_amount_5: toNumber(readRowValue(row, ['t_amount_5'])),
                t_amount_6: toNumber(readRowValue(row, ['t_amount_6'])),
                t_amount_7: toNumber(readRowValue(row, ['t_amount_7'])),
                t_total_amount: toNumber(readRowValue(row, ['t_total_amount'])),
                t_amount_8: toNumber(readRowValue(row, ['t_amount_8'])),
                t_amount_10: toNumber(readRowValue(row, ['t_amount_10', 't_amount_subcontact'])),
            };
        });
    }, []);

    const handleSearch = useCallback(async () => {
        if (!selectedUnit) {
            messageApi.warning('กรุณาเลือกหน่วยงาน');
            return;
        }

        const yearBE = Number.parseInt(selectedYear, 10);
        const yearAD = yearBE - 543;
        if (!Number.isInteger(yearAD) || yearAD < 1900 || yearAD > 3000) {
            messageApi.warning('ปีไม่ถูกต้อง');
            return;
        }

        setLoading(true);
        try {
            const rows = await getTransactionLogYearly({
                orgUnitNo: selectedUnit,
                dyear: yearAD
            }, token);

            const mapped = mapYearlyRows(rows as Array<Record<string, unknown>>);
            setData(mapped);
        } catch {
            messageApi.error('ไม่สามารถโหลดข้อมูล Transaction Log Yearly ได้');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [selectedUnit, selectedYear, token, mapYearlyRows, messageApi]);

    const handleOpenDetail = useCallback(async (row: LogYearlyDataType) => {
        if (!selectedUnit || !row.monthNum) return;

        const yearBE = Number.parseInt(selectedYear, 10);
        const yearAD = yearBE - 543;
        if (!Number.isInteger(yearAD)) return;

        setDetailMonthLabel(row.month);
        setIsDetailModalOpen(true);
        setDetailLoading(true);

        try {
            const rows = await getTransactionLogYearlyDetail({
                orgUnitNo: selectedUnit,
                dyear: yearAD,
                dmonth: row.monthNum
            }, token);

            const mapped = (rows as Array<Record<string, unknown>>).map((item, index) => ({
                key: `detail-${index}`,
                transactionTypeText: toText(readRowValue(item, ['TransactionTypeText', 'transactionTypeText'])) || '-',
                effectiveDate: formatDate(readRowValue(item, ['EffectiveDate', 'effectiveDate']), 'DD/MM/YYYY'),
                transactionDesc: toText(readRowValue(item, ['TransactionDesc', 'transactionDesc'])) || '-',
                note: toText(readRowValue(item, ['note', 'Note'])) || '-',
                createDate: formatDate(readRowValue(item, ['CreateDate', 'createDate']), 'DD/MM/YYYY HH:mm:ss'),
            }));

            setDetailData(mapped);
        } catch {
            messageApi.error('ไม่สามารถโหลดรายละเอียดรายการได้');
            setDetailData([]);
        } finally {
            setDetailLoading(false);
        }
    }, [selectedUnit, selectedYear, token, messageApi]);

    const columns: ColumnsType<LogYearlyDataType> = useMemo(() => [
        {
            title: 'เดือน',
            dataIndex: 'month',
            key: 'month',
            align: 'center',
            width: 130,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
        },
        {
            title: '21',
            dataIndex: 'amount_1',
            key: 'amount_1',
            align: 'right',
            width: 90,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_1, record.t_amount_1),
        },
        {
            title: '18-20',
            dataIndex: 'amount_2',
            key: 'amount_2',
            align: 'right',
            width: 95,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_2, record.t_amount_2),
        },
        {
            title: '16-17',
            dataIndex: 'amount_3',
            key: 'amount_3',
            align: 'right',
            width: 95,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_3, record.t_amount_3),
        },
        {
            title: '14-15',
            dataIndex: 'amount_4',
            key: 'amount_4',
            align: 'right',
            width: 95,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_4, record.t_amount_4),
        },
        {
            title: '11-13',
            dataIndex: 'amount_5',
            key: 'amount_5',
            align: 'right',
            width: 95,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_5, record.t_amount_5),
        },
        {
            title: '9-10',
            dataIndex: 'amount_6',
            key: 'amount_6',
            align: 'right',
            width: 95,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_6, record.t_amount_6),
        },
        {
            title: '4-8',
            dataIndex: 'amount_7',
            key: 'amount_7',
            align: 'right',
            width: 95,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_7, record.t_amount_7),
        },
        {
            title: 'รวม',
            dataIndex: 'total_amount',
            key: 'total_amount',
            align: 'right',
            width: 95,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.total_amount, record.t_total_amount),
        },
        {
            title: 'Contract',
            dataIndex: 'amount_8',
            key: 'amount_8',
            align: 'right',
            width: 110,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_8, record.t_amount_8),
        },
        {
            title: 'Contract สัญญาย่อย',
            dataIndex: 'amount_10',
            key: 'amount_10',
            align: 'right',
            width: 150,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => renderNumberWithDiff(record.amount_10, record.t_amount_10),
        },
        {
            title: 'View',
            key: 'view',
            align: 'center',
            width: 80,
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! font-bold!' }),
            render: (_value, record) => (
                <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => void handleOpenDetail(record)}
                    disabled={!record.monthNum}
                />
            ),
        },
    ], [handleOpenDetail]);

    const detailColumns: ColumnsType<LogYearlyDetailDataType> = useMemo(() => [
        {
            title: 'ประเภท',
            dataIndex: 'transactionTypeText',
            key: 'transactionTypeText',
            width: 140,
            align: 'center',
        },
        {
            title: 'วันที่มีผล',
            dataIndex: 'effectiveDate',
            key: 'effectiveDate',
            width: 120,
            align: 'center',
        },
        {
            title: 'มติ',
            dataIndex: 'transactionDesc',
            key: 'transactionDesc',
        },
        {
            title: 'หมายเหตุ',
            dataIndex: 'note',
            key: 'note',
            width: 220,
        },
        {
            title: 'วันที่สร้าง',
            dataIndex: 'createDate',
            key: 'createDate',
            width: 180,
            align: 'center',
        },
    ], []);

    return (
        <Main currentPath="/monitor">
            {messageContextHolder}
            <div className="space-y-6 w-full min-w-0">
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 text-white">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <ScrollText className="w-6 h-6 text-white" />
                            <h1 className="text-2xl font-bold m-0 text-white">Transaction Log Yearly</h1>
                        </div>
                        <div className="flex flex-wrap items-center xl:justify-end gap-3">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-2 rounded-lg border border-white/30">
                                <label className="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">หน่วยงาน</label>
                                <Select
                                    placeholder="เลือกหน่วยงาน..."
                                    className="w-[290px]"
                                    allowClear
                                    loading={unitLoading}
                                    value={selectedUnit}
                                    onChange={setSelectedUnit}
                                    options={units}
                                    showSearch
                                    filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-2 rounded-lg border border-white/30">
                                <label className="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">YEAR</label>
                                <Select
                                    value={selectedYear}
                                    onChange={setSelectedYear}
                                    size="middle"
                                    className="w-[120px]"
                                    options={years.map((year) => ({ value: year, label: year }))}
                                />
                            </div>
                            <Button
                                type="default"
                                icon={<SearchOutlined />}
                                style={{ backgroundColor: '#ffffff', color: '#1d4ed8', borderColor: '#ffffff' }}
                                className="h-10 px-6 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 hover:!bg-blue-50 hover:!text-blue-800"
                                onClick={() => void handleSearch()}
                            >
                                เรียกดูข้อมูล
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <Table
                        columns={columns}
                        dataSource={data}
                        loading={loading}
                        pagination={false}
                        scroll={{ x: 1250 }}
                        size="middle"
                        bordered={false}
                        rowClassName={(_record, index) => index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    />
                </div>
            </div>

            <Modal
                title={`รายละเอียดรายการเดือน ${detailMonthLabel || '-'}`}
                open={isDetailModalOpen}
                onCancel={() => setIsDetailModalOpen(false)}
                footer={null}
                width={1120}
            >
                <Table
                    columns={detailColumns}
                    dataSource={detailData}
                    loading={detailLoading}
                    pagination={false}
                    scroll={{ x: 900, y: 430 }}
                    size="middle"
                />
            </Modal>
        </Main>
    );
}
