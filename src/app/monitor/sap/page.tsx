'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Tooltip, Modal, Select, DatePicker, App as AntdApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileTextOutlined, SendOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { MonitorCheck } from 'lucide-react';
import localeTh from 'antd/locale/th_TH';
import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import 'dayjs/locale/th';
import {
    getSapMonitorGrid,
    getSapMonitorLog
} from '@/services/sapMonitorService';

dayjs.extend(buddhistEra);
dayjs.locale('th');

interface SapMonitorDataType {
    key: string;
    effective_date: string;
    effective_date_query: string;
    effective_date_iso: string;
    data_status: string;
    sap_status: string;
    sap_date: string;
    sap_date_iso: string;
    status: number;
    interface_status: number;
}

interface SapLogDataType {
    key: string;
    orgUnitNo: string;
    levelGroupNo: string;
    logType: string;
    logMessage: string;
}

interface SendToSapResult {
    resultCode: string;
    fileReady: boolean;
    ftpEnabled: boolean;
    ftpSent: boolean;
    downloadPath: string;
    message: string;
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
    { value: '12', label: 'ธันวาคม' },
];

const DATA_STATUS_OPTIONS = [
    {
        value: 'Processing',
        label: <span className="font-semibold text-amber-600">Processing</span>,
    },
    {
        value: 'Send Completed',
        label: <span className="font-semibold text-emerald-600">Send Completed</span>,
    },
];

const SAP_STATUS_OPTIONS = [
    {
        value: 'Error',
        label: <span className="font-semibold text-red-600">Error</span>,
    },
    {
        value: 'Wait to Send',
        label: <span className="font-semibold text-amber-600">Wait to Send</span>,
    },
    {
        value: 'Success',
        label: <span className="font-semibold text-emerald-600">Success</span>,
    },
];

const FILTER_SELECT_CLASS =
    'w-full rounded-lg shadow-sm [&_.ant-select-selector]:!h-8 [&_.ant-select-selector]:!items-center';
const FILTER_DATE_CLASS =
    'w-full rounded-lg shadow-sm !h-8 [&_.ant-picker-input>input]:!h-6 [&_.ant-picker-input>input]:!text-sm';

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const resolveEmployeeId = (): string => {
    if (typeof window === 'undefined') return 'SYSTEM';

    const userDataRaw = localStorage.getItem('user_data');
    if (!userDataRaw) return 'SYSTEM';

    try {
        const userData = JSON.parse(userDataRaw) as { employeeID?: string };
        return toText(userData.employeeID) || 'SYSTEM';
    } catch {
        return 'SYSTEM';
    }
};

const toNumber = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number.parseInt(toText(value), 10);
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

const toYmd = (value: unknown): string => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = `${value.getMonth() + 1}`.padStart(2, '0');
        const d = `${value.getDate()}`.padStart(2, '0');
        return `${y}${m}${d}`;
    }

    const text = toText(value);
    if (!text) return '';

    const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return `${ymd[1]}${ymd[2]}${ymd[3]}`;

    const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
        const day = dmy[1].padStart(2, '0');
        const month = dmy[2].padStart(2, '0');
        let year = Number.parseInt(dmy[3], 10);
        if (year > 2400) year -= 543;
        return `${year}${month}${day}`;
    }

    const digits = text.replace(/\D/g, '');
    if (digits.length === 8) {
        let year = Number.parseInt(digits.slice(0, 4), 10);
        const month = Number.parseInt(digits.slice(4, 6), 10);
        const day = Number.parseInt(digits.slice(6, 8), 10);
        if (year > 2400) year -= 543;
        if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${year}${digits.slice(4, 8)}`;
        }
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
        const day = `${parsed.getDate()}`.padStart(2, '0');
        return `${year}${month}${day}`;
    }

    return '';
};

const formatDisplayDate = (value: unknown): string => {
    const text = toText(value);
    if (!text) return '';

    const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
        return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
    }

    const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
        return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
        const day = `${parsed.getDate()}`.padStart(2, '0');
        const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}/${month}/${year}`;
    }

    return text;
};

const toIsoDate = (value: unknown): string => {
    const text = toText(value);
    if (!text) return '';

    const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
        return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    }

    const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
        const day = dmy[1].padStart(2, '0');
        const month = dmy[2].padStart(2, '0');
        let year = Number.parseInt(dmy[3], 10);
        if (year > 2400) year -= 543;
        return `${year.toString().padStart(4, '0')}-${month}-${day}`;
    }

    const digits = text.replace(/\D/g, '');
    if (digits.length === 8) {
        let year = Number.parseInt(digits.slice(0, 4), 10);
        const month = digits.slice(4, 6);
        const day = digits.slice(6, 8);
        if (year > 2400) year -= 543;
        return `${year.toString().padStart(4, '0')}-${month}-${day}`;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
        const day = `${parsed.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return '';
};

const mapDataStatus = (status: number): string => {
    switch (status) {
        case 0:
            return 'Processing';
        case 1:
            return 'Send Completed';
        default:
            return '';
    }
};

const mapSapStatus = (status: number): string => {
    switch (status) {
        case -1:
            return 'Error';
        case 0:
            return 'Wait to Send';
        case 1:
            return 'Success';
        default:
            return '';
    }
};

function SapMonitorPageContent() {
    const { message: messageApi, modal } = AntdApp.useApp();
    const [loading, setLoading] = useState(false);
    const [logLoading, setLogLoading] = useState(false);
    const [token, setToken] = useState('');
    const [sendingRowKey, setSendingRowKey] = useState('');

    const [selectedMonth, setSelectedMonth] = useState<string>(() => `${new Date().getMonth() + 1}`.padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState<string>(() => (new Date().getFullYear() + 543).toString());
    const [years, setYears] = useState<string[]>(() => getYears());

    const [filterEffectiveDate, setFilterEffectiveDate] = useState('');
    const [filterDataStatus, setFilterDataStatus] = useState('');
    const [filterSapStatus, setFilterSapStatus] = useState('');
    const [filterSapDate, setFilterSapDate] = useState('');

    const [data, setData] = useState<SapMonitorDataType[]>([]);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logData, setLogData] = useState<SapLogDataType[]>([]);
    const [selectedLogDate, setSelectedLogDate] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setToken(localStorage.getItem('auth_token') || '');
        setYears(getYears());
    }, []);

    const downloadSapFile = useCallback((downloadPath?: string) => {
        const targetPath = toText(downloadPath) || '/api/transactions/hrcenter/sap-file';
        const separator = targetPath.includes('?') ? '&' : '?';
        window.open(`${targetPath}${separator}t=${Date.now()}`, '_blank', 'noopener,noreferrer');
    }, []);

    const loadGrid = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await getSapMonitorGrid({
                dmonth: selectedMonth,
                dyear: selectedYear,
            }, token);

            const mapped = (rows as Array<Record<string, unknown>>).map((row, index) => {
                const status = toNumber(readRowValue(row, ['Status', 'status']));
                const interfaceStatus = toNumber(readRowValue(row, ['InterfaceStatus', 'interfaceStatus']));
                const effectiveDateRaw = readRowValue(row, ['EffectiveDate', 'effectiveDate']);
                const effectiveDateBD = toText(readRowValue(row, ['EffectiveDateBD', 'effectiveDateBD']));

                const effectiveDateDisplay = effectiveDateBD || formatDisplayDate(effectiveDateRaw) || '-';
                const effectiveDateQuery = toYmd(effectiveDateRaw) || toYmd(effectiveDateDisplay);

                const interfaceDateRaw = readRowValue(row, ['InterfaceDate', 'interfaceDate']);
                const dataStatus = mapDataStatus(status) || toText(readRowValue(row, ['Statustxt', 'StatusTxt', 'statustxt'])) || '-';
                const sapStatus = mapSapStatus(interfaceStatus) || toText(readRowValue(row, ['InterfaceStatustxt', 'InterfaceStatusTxt', 'interfaceStatustxt'])) || '-';
                const sapDate = formatDisplayDate(interfaceDateRaw);

                return {
                    key: `sap-${effectiveDateQuery || index}`,
                    effective_date: effectiveDateDisplay,
                    effective_date_query: effectiveDateQuery,
                    effective_date_iso: toIsoDate(effectiveDateRaw) || toIsoDate(effectiveDateDisplay),
                    data_status: dataStatus,
                    sap_status: sapStatus,
                    sap_date: sapDate,
                    sap_date_iso: toIsoDate(interfaceDateRaw) || toIsoDate(sapDate),
                    status,
                    interface_status: interfaceStatus,
                };
            });

            setData(mapped);
        } catch {
            messageApi.error('ไม่สามารถโหลดข้อมูล SAP Transfer Monitor ได้');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, token, messageApi]);

    useEffect(() => {
        void loadGrid();
    }, [loadGrid]);

    const openLogModal = useCallback(async (record: SapMonitorDataType) => {
        const effectiveDate = record.effective_date_query;
        if (!effectiveDate) {
            messageApi.warning('ไม่พบ Effective Date ของรายการนี้');
            return;
        }

        setIsLogModalOpen(true);
        setSelectedLogDate(record.effective_date);
        setLogLoading(true);

        try {
            const rows = await getSapMonitorLog(effectiveDate, token);
            const mapped = (rows as Array<Record<string, unknown>>).map((row, index) => ({
                key: `sap-log-${index}`,
                orgUnitNo: toText(readRowValue(row, ['OrgUnitNo', 'orgUnitNo'])) || '-',
                levelGroupNo: toText(readRowValue(row, ['LevelGroupNo', 'levelGroupNo'])) || '-',
                logType: toText(readRowValue(row, ['LogType', 'logType'])) || '-',
                logMessage: toText(readRowValue(row, ['LogMessage', 'logMessage'])) || '-',
            }));

            setLogData(mapped);
        } catch {
            messageApi.error('ไม่สามารถโหลด Log Interface ได้');
            setLogData([]);
        } finally {
            setLogLoading(false);
        }
    }, [token, messageApi]);

    const executeSend = useCallback(async (record: SapMonitorDataType) => {
        if (sendingRowKey) return;
        setSendingRowKey(record.key);

        try {
            let monthValue = selectedMonth;
            let yearBE = selectedYear;

            const recordDate = dayjs(record.effective_date_iso);
            if (recordDate.isValid()) {
                monthValue = recordDate.format('MM');
                yearBE = (recordDate.year() + 543).toString();
            }

            const monthLabel = MONTHS.find((item) => item.value === monthValue)?.label || MONTHS[0].label;

            const response = await fetch('/api/transactions/hrcenter/send-to-sap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    effectiveMonth: monthLabel,
                    effectiveYear: yearBE,
                    employeeId: resolveEmployeeId(),
                    orgUnits: [],
                }),
            });

            const resultJson = await response.json().catch(() => null) as { data?: SendToSapResult; message?: string } | null;
            const result = resultJson?.data;

            if (!response.ok || !result) {
                messageApi.error(resultJson?.message || 'ไม่สามารถนำส่งข้อมูลเข้า SAP ได้');
                return;
            }

            if (result.resultCode === '-1') {
                messageApi.warning(result.message || 'มีหน่วยงานที่ค่ากรอบติดลบ โปรดตรวจสอบก่อนนำส่งเข้าบันทึกที่ระบบ SAP');
            } else if (result.resultCode === '0') {
                messageApi.error(result.message || 'นำส่งเข้าบันทึกที่ระบบ SAP ไม่สำเร็จ');
            } else if (result.resultCode === '2') {
                messageApi.warning(result.message || 'ส่งไฟล์ FTP ไม่สำเร็จ แต่สามารถดาวน์โหลดไฟล์ได้');
            } else {
                messageApi.success(result.message || 'นำส่งเข้าบันทึกที่ระบบ SAP เสร็จสิ้น');
            }

            if ((result.resultCode === '1' || result.resultCode === '2') && result.fileReady) {
                modal.confirm({
                    title: 'ไฟล์ SAP พร้อมใช้งาน',
                    content: 'ต้องการดาวน์โหลดไฟล์เพื่อนำไปใช้งานตอนนี้หรือไม่?',
                    okText: 'ดาวน์โหลดไฟล์',
                    cancelText: 'ภายหลัง',
                    onOk: () => {
                        downloadSapFile(result.downloadPath);
                    },
                });
            }

            await loadGrid();
        } catch (error) {
            console.error('Error sending SAP data:', error);
            messageApi.error('เกิดข้อผิดพลาดระหว่างนำส่งข้อมูลเข้า SAP');
        } finally {
            setSendingRowKey('');
        }
    }, [sendingRowKey, selectedMonth, selectedYear, messageApi, modal, loadGrid, downloadSapFile]);

    const handleSend = useCallback((record: SapMonitorDataType) => {
        modal.confirm({
            title: 'ต้องการนำส่งเข้าบันทึกที่ระบบ SAP ใช่หรือไม่?',
            okText: 'ตกลง',
            cancelText: 'ยกเลิก',
            onOk: async () => {
                await executeSend(record);
            },
        });
    }, [modal, executeSend]);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const effectiveDatePass = filterEffectiveDate ? item.effective_date_iso === filterEffectiveDate : true;
            const sapDatePass = filterSapDate ? item.sap_date_iso === filterSapDate : true;
            const dataStatusPass = filterDataStatus ? item.data_status === filterDataStatus : true;
            const sapStatusPass = filterSapStatus ? item.sap_status === filterSapStatus : true;

            return (
                effectiveDatePass &&
                dataStatusPass &&
                sapStatusPass &&
                sapDatePass
            );
        });
    }, [data, filterEffectiveDate, filterDataStatus, filterSapStatus, filterSapDate]);

    const columns: ColumnsType<SapMonitorDataType> = [
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">Effective Date</div>
                    <div className="flex items-center gap-1">
                        <DatePicker
                            locale={localeTh.DatePicker}
                            className={FILTER_DATE_CLASS}
                            value={filterEffectiveDate ? dayjs(filterEffectiveDate, 'YYYY-MM-DD') : null}
                            format="DD/MM/BBBB"
                            placeholder="วว/ดด/ปปปป"
                            allowClear
                            onChange={(value) => setFilterEffectiveDate(value ? value.format('YYYY-MM-DD') : '')}
                        />
                        <Button
                            type="text"
                            icon={<CloseCircleOutlined className="text-slate-400" />}
                            onClick={() => setFilterEffectiveDate('')}
                            className="h-8! w-8! min-w-8! border border-slate-200! rounded-lg! hover:bg-slate-100"
                            title="ล้างวันที่"
                        />
                    </div>
                </div>
            ),
            dataIndex: 'effective_date',
            key: 'effective_date',
            width: 160,
            align: 'center',
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! p-2!' }),
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">สถานะข้อมูล</div>
                    <Select
                        value={filterDataStatus}
                        onChange={(value) => setFilterDataStatus(value || '')}
                        allowClear
                        placeholder="เลือกสถานะข้อมูล"
                        className={FILTER_SELECT_CLASS}
                        options={DATA_STATUS_OPTIONS}
                    />
                </div>
            ),
            dataIndex: 'data_status',
            key: 'data_status',
            width: 200,
            align: 'center',
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! p-2!' }),
            render: (text: string) => {
                const lower = text.toLowerCase();
                let colorClass = 'text-gray-700';
                if (lower.includes('send completed')) colorClass = 'text-green-600';
                else if (lower.includes('processing')) colorClass = 'text-orange-500';
                return <span className={`font-medium ${colorClass}`}>{text}</span>;
            },
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">สถานะส่งเข้า SAP</div>
                    <Select
                        value={filterSapStatus}
                        onChange={(value) => setFilterSapStatus(value || '')}
                        allowClear
                        placeholder="เลือกสถานะส่งเข้า SAP"
                        className={FILTER_SELECT_CLASS}
                        options={SAP_STATUS_OPTIONS}
                    />
                </div>
            ),
            dataIndex: 'sap_status',
            key: 'sap_status',
            width: 220,
            align: 'center',
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! p-2!' }),
            render: (text: string) => {
                const lower = text.toLowerCase();
                let colorClass = 'text-gray-700';
                if (lower.includes('success')) colorClass = 'text-green-600';
                else if (lower.includes('error') || lower.includes('failed')) colorClass = 'text-red-600';
                else if (lower.includes('wait')) colorClass = 'text-orange-500';
                return <span className={`font-medium ${colorClass}`}>{text}</span>;
            },
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">วันที่นำส่งเข้า SAP</div>
                    <div className="flex items-center gap-1">
                        <DatePicker
                            locale={localeTh.DatePicker}
                            className={FILTER_DATE_CLASS}
                            value={filterSapDate ? dayjs(filterSapDate, 'YYYY-MM-DD') : null}
                            format="DD/MM/BBBB"
                            placeholder="วว/ดด/ปปปป"
                            allowClear
                            onChange={(value) => setFilterSapDate(value ? value.format('YYYY-MM-DD') : '')}
                        />
                        <Button
                            type="text"
                            icon={<CloseCircleOutlined className="text-slate-400" />}
                            onClick={() => setFilterSapDate('')}
                            className="h-8! w-8! min-w-8! border border-slate-200! rounded-lg! hover:bg-slate-100"
                            title="ล้างวันที่"
                        />
                    </div>
                </div>
            ),
            dataIndex: 'sap_date',
            key: 'sap_date',
            width: 170,
            align: 'center',
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! p-2!' }),
            render: (text: string) => text || '-',
        },
        {
            title: () => (
                <div className="flex flex-col gap-2">
                    <div className="text-center font-bold">ACTION</div>
                </div>
            ),
            key: 'action',
            width: 120,
            align: 'center',
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! p-2!' }),
            render: (_, record) => (
                record.status === 1 && record.interface_status === -1 ? (
                    <Button
                        type="primary"
                        size="small"
                        icon={<SendOutlined />}
                        loading={sendingRowKey === record.key}
                        disabled={Boolean(sendingRowKey) && sendingRowKey !== record.key}
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
            onHeaderCell: () => ({ className: 'bg-blue-50! text-black! p-2!' }),
            render: (_, record) => (
                <Tooltip title="View Log">
                    <Button
                        type="text"
                        icon={<FileTextOutlined className="text-gray-500 text-lg!" />}
                        onClick={() => void openLogModal(record)}
                    />
                </Tooltip>
            ),
        },
    ];

    const logColumns: ColumnsType<SapLogDataType> = [
        {
            title: 'รหัสหน่วยงาน',
            dataIndex: 'orgUnitNo',
            key: 'orgUnitNo',
            width: 140,
            align: 'center',
        },
        {
            title: 'Level Group',
            dataIndex: 'levelGroupNo',
            key: 'levelGroupNo',
            width: 120,
            align: 'center',
        },
        {
            title: 'Log Type',
            dataIndex: 'logType',
            key: 'logType',
            width: 120,
            align: 'center',
        },
        {
            title: 'Log Interface',
            dataIndex: 'logMessage',
            key: 'logMessage',
        },
    ];

    return (
        <Main currentPath="/monitor">
            <div className="space-y-6 w-full min-w-0">
                <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <MonitorCheck className="w-6 h-6 text-white" />
                            <h1 className="text-2xl font-bold m-0 text-white">SAP Transfer (Monitor)</h1>
                        </div>
                        <div className="flex flex-wrap items-center md:justify-end gap-3">
                            <div className="flex items-center gap-2 bg-white/15 px-3 py-2 rounded-lg border border-white/30">
                                <label className="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">MONTH</label>
                                <Select
                                    value={selectedMonth}
                                    onChange={setSelectedMonth}
                                    size="middle"
                                    className="w-[170px]"
                                    options={MONTHS.map((m) => ({ value: m.value, label: m.label }))}
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
                                onClick={() => void loadGrid()}
                            >
                                เรียกดูข้อมูล
                            </Button>
                        </div>
                    </div>
                </div>

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
                        scroll={{ x: 1100 }}
                        size="middle"
                        bordered={false}
                        rowClassName={(_record, index) => (index % 2 === 0 ? 'bg-gray-50' : 'bg-white')}
                    />
                </div>
            </div>

                <Modal
                    title={`Log Interface (Effective Date: ${selectedLogDate || '-'})`}
                    open={isLogModalOpen}
                    onCancel={() => setIsLogModalOpen(false)}
                    footer={null}
                    width={900}
                >
                    <Table
                        columns={logColumns}
                        dataSource={logData}
                        loading={logLoading}
                        pagination={false}
                        scroll={{ x: 760, y: 400 }}
                        size="middle"
                    />
                </Modal>
        </Main>
    );
}

export default function SapMonitorPage() {
    return (
        <AntdApp>
            <SapMonitorPageContent />
        </AntdApp>
    );
}
