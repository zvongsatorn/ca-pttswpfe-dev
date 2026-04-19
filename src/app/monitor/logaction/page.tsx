'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Input, DatePicker, Tag, Select, message } from 'antd';
import { FileExcelOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import ExcelJS from 'exceljs';
import { getLogAction, exportLogAction } from '@/services/logActionService';
import { saveExcelFile } from '@/utils/fileDownload';

dayjs.extend(customParseFormat);
const MIN_TABLE_WIDTH = 1380;
const FIXED_COLUMNS_WIDTH_WITHOUT_NOTE = 1150;

// --- Type Definitions ---
interface LogActionDataType {
    key: string;
    actionDate: string;
    actionTime: string;
    employeeId: string;
    name: string;
    userGroupNo: string;
    role: string;
    menu: string;
    action: string;
    note: string;
}

type LogActionApiRow = Record<string, unknown>;
const USER_GROUP_ROLE_BY_NO: Record<string, string> = {
    '01': 'ADMIN',
    '02': 'HRUSER พนักงาน',
    '03': 'HRVERIFY พนักงาน',
    '04': 'HRPOLICY',
    '05': 'HRUSER ผู้บริหาร',
    '06': 'HRVERIFY ผู้บริหาร',
    '07': 'HRADMIN',
    '08': 'OTHER',
    '99': 'OTHER',
};
const USER_GROUP_COLOR_BY_NO: Record<string, string> = {
    '01': 'red',
    '02': 'blue',
    '03': 'green',
    '04': 'purple',
    '05': 'orange',
    '06': 'cyan',
    '07': 'geekblue',
    '08': 'default',
};

const ROLE_FILTER_CATALOG = [
    'ADMIN',
    'HRPOLICY',
    'HRADMIN',
    'HRVERIFY ผู้บริหาร',
    'HRVERIFY พนักงาน',
    'HRUSER ผู้บริหาร',
    'HRUSER พนักงาน',
    'OTHER',
];

const ACTION_FILTER_CATALOG = [
    'Log In',
    'Log Out',
    'Entry Menu',
    'View',
    'Insert',
    'Delete',
    'Update',
    'Export',
    'Upload',
    'Send To SAP',
];

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const readRowValue = (row: LogActionApiRow, keys: string[]): unknown => {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
            return row[key];
        }
    }
    return '';
};

const parseActionDateTime = (value: unknown): Dayjs | null => {
    if (value instanceof Date) {
        const parsedDate = dayjs(value);
        return parsedDate.isValid() ? parsedDate : null;
    }

    const text = toText(value);
    if (!text) return null;

    // SQL datetime values serialized as ISO UTC (e.g. "...Z") should be treated as
    // clock time for this screen to avoid unintended timezone shifting.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/i.test(text)) {
        const withoutUtcSuffix = text.replace(/Z$/i, '');
        const localIsoCandidates = [
            dayjs(withoutUtcSuffix, 'YYYY-MM-DDTHH:mm:ss.SSS', true),
            dayjs(withoutUtcSuffix, 'YYYY-MM-DDTHH:mm:ss', true),
        ];

        for (const candidate of localIsoCandidates) {
            if (candidate.isValid()) {
                return candidate;
            }
        }
    }

    const candidates = [
        dayjs(text, 'YYYY-MM-DD HH:mm:ss', true),
        dayjs(text, 'YYYY-MM-DDTHH:mm:ss', true),
        dayjs(text, 'YYYY-MM-DDTHH:mm:ss.SSS', true),
        dayjs(text, 'DD/MM/YYYY HH:mm:ss', true),
        dayjs(text, 'DD/MM/YYYY', true),
        dayjs(text),
    ];

    for (const candidate of candidates) {
        if (candidate.isValid()) {
            return candidate;
        }
    }

    return null;
};

const ROLE_TO_GROUP_NO: Record<string, string> = Object.entries(USER_GROUP_ROLE_BY_NO).reduce((acc, [groupNo, groupName]) => {
    acc[groupName.toUpperCase()] = groupNo;
    return acc;
}, {} as Record<string, string>);

const inferUserGroupNoFromRole = (role: string): string => {
    const normalized = role.trim().toUpperCase();
    if (!normalized) return '';

    return ROLE_TO_GROUP_NO[normalized] || '';
};

const getRoleTagColor = (role: string, userGroupNo?: string): string => {
    const normalizedGroupNo = (userGroupNo || '').trim();
    if (normalizedGroupNo && USER_GROUP_COLOR_BY_NO[normalizedGroupNo]) {
        return USER_GROUP_COLOR_BY_NO[normalizedGroupNo];
    }

    const normalized = role.trim().toUpperCase();
    if (!normalized) return 'default';

    if (normalized === 'ADMIN') return 'red';
    if (normalized.includes('HRADMIN')) return 'magenta';
    if (normalized.includes('HRPOLICY') || normalized.includes('POLICY')) return 'cyan';
    if (normalized.includes('HRUSER') && role.includes('ผู้บริหาร')) return 'geekblue';
    if (normalized.includes('HRVERIFY') && role.includes('ผู้บริหาร')) return 'purple';
    if (normalized.includes('HRUSER') || normalized.includes('USER')) return 'blue';
    if (normalized.includes('HRVERIFY') || normalized.includes('VERIFY')) return 'gold';
    if (normalized.includes('OTHER')) return 'default';

    const palette = ['geekblue', 'green', 'orange', 'lime', 'magenta', 'cyan', 'purple', 'blue'];
    const hash = Array.from(normalized).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return palette[hash % palette.length];
};

const mapLogActionRow = (row: LogActionApiRow, index: number): LogActionDataType => {
    const parsedActionDateTime = parseActionDateTime(
        readRowValue(row, ['ActionDate', 'actionDate', 'Actiondate'])
    );
    const userGroupNo = toText(readRowValue(row, ['UserGroupNo', 'userGroupNo', 'UserRole', 'userRole']));
    const userGroupName = toText(readRowValue(row, ['UserGroupName', 'userGroupName', 'UserRoleName', 'userRoleName']));
    const fallbackRole = toText(readRowValue(row, ['Role', 'role', 'UserRoleName', 'userRoleName', 'UserRole', 'userRole']));
    const resolvedRole = userGroupName || USER_GROUP_ROLE_BY_NO[userGroupNo] || fallbackRole;
    const resolvedUserGroupNo = userGroupNo || inferUserGroupNoFromRole(resolvedRole);

    return {
        key: `log-action-${index}`,
        actionDate: parsedActionDateTime ? parsedActionDateTime.format('DD/MM/YYYY') : '',
        actionTime: parsedActionDateTime ? parsedActionDateTime.format('HH:mm:ss') : '',
        employeeId: toText(readRowValue(row, ['EmployeeID', 'employeeID', 'employeeId'])),
        name: toText(readRowValue(row, ['Name', 'name'])),
        userGroupNo: resolvedUserGroupNo,
        role: resolvedRole,
        menu: toText(readRowValue(row, ['SubjectCode', 'Menu', 'menu'])),
        action: toText(readRowValue(row, ['ActionCode', 'Action', 'action'])),
        note: toText(readRowValue(row, ['Note', 'note'])),
    };
};

export default function LogActionPage() {
    const [messageApi, messageContextHolder] = message.useMessage();
    const tableContainerRef = useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [tableScrollY, setTableScrollY] = useState(360);
    const [tableScrollX, setTableScrollX] = useState<number>(MIN_TABLE_WIDTH);
    const [data, setData] = useState<LogActionDataType[]>([]);

    // Filter State
    const [startDate, setStartDate] = useState<Dayjs | null>(() => dayjs().startOf('month'));
    const [endDate, setEndDate] = useState<Dayjs | null>(() => dayjs().endOf('month'));

    // Search State
    const [searchEmployeeId, setSearchEmployeeId] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchRole, setSearchRole] = useState('');
    const [searchAction, setSearchAction] = useState('');

    const getValidatedDateRange = (): { fromDate: Dayjs; toDate: Dayjs } | null => {
        const parsedFromDate = startDate;
        const parsedToDate = endDate;

        if (!parsedFromDate) {
            messageApi.warning('กรุณาระบุวันที่เริ่มต้นให้ถูกต้อง');
            return null;
        }

        if (!parsedToDate) {
            messageApi.warning('กรุณาระบุวันที่สิ้นสุดให้ถูกต้อง');
            return null;
        }

        if (parsedFromDate.isAfter(parsedToDate, 'day')) {
            messageApi.warning('วันที่เริ่มต้นต้องน้อยกว่าหรือเท่ากับวันที่สิ้นสุด');
            return null;
        }

        return { fromDate: parsedFromDate, toDate: parsedToDate };
    };

    const fetchDataByRange = useCallback(async (fromDate: Dayjs, toDate: Dayjs) => {
        setLoading(true);
        try {
            const rows = await getLogAction({
                fromDate: fromDate.format('YYYY-MM-DD'),
                toDate: toDate.format('YYYY-MM-DD'),
            });

            const mappedRows = (rows as LogActionApiRow[]).map((row, index) => mapLogActionRow(row, index));
            setData(mappedRows);
        } catch {
            messageApi.error('ไม่สามารถโหลดข้อมูล Log Action ได้');
        } finally {
            setLoading(false);
        }
    }, [messageApi]);

    const handleSearch = async () => {
        const validatedDateRange = getValidatedDateRange();
        if (!validatedDateRange) return;

        setHasSearched(true);
        await fetchDataByRange(validatedDateRange.fromDate, validatedDateRange.toDate);
    };

    const handleExportExcel = async () => {
        const validatedDateRange = getValidatedDateRange();
        if (!validatedDateRange) return;

        setExporting(true);
        try {
            const rows = await exportLogAction({
                fromDate: validatedDateRange.fromDate.format('YYYY-MM-DD'),
                toDate: validatedDateRange.toDate.format('YYYY-MM-DD'),
            });

            const mappedRows = (rows as LogActionApiRow[]).map((row, index) => mapLogActionRow(row, index));
            const employeeFilter = searchEmployeeId.toLowerCase().trim();
            const nameFilter = searchName.toLowerCase().trim();
            const roleFilter = searchRole.trim();
            const actionFilter = searchAction.trim();
            const rowsForExport = mappedRows.filter((row) => (
                row.employeeId.toLowerCase().includes(employeeFilter) &&
                row.name.toLowerCase().includes(nameFilter) &&
                (!roleFilter || row.role === roleFilter) &&
                (!actionFilter || row.action === actionFilter)
            ));

            if (rowsForExport.length === 0) {
                messageApi.info('ไม่พบข้อมูลสำหรับ Export');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Log Action');

            worksheet.columns = [
                { header: 'No', key: 'no', width: 8 },
                { header: 'ActionDate', key: 'actionDate', width: 14 },
                { header: 'ActionTime', key: 'actionTime', width: 12 },
                { header: 'EmployeeID', key: 'employeeId', width: 16 },
                { header: 'Name', key: 'name', width: 24 },
                { header: 'Role', key: 'role', width: 20 },
                { header: 'Menu', key: 'menu', width: 24 },
                { header: 'Action', key: 'action', width: 18 },
                { header: 'Note', key: 'note', width: 40 },
            ];

            rowsForExport.forEach((row, index) => {
                worksheet.addRow({
                    no: index + 1,
                    actionDate: row.actionDate,
                    actionTime: row.actionTime,
                    employeeId: row.employeeId,
                    name: row.name,
                    role: row.role,
                    menu: row.menu,
                    action: row.action,
                    note: row.note,
                });
            });

            const filename = `ExportLogAction_${validatedDateRange.fromDate.format('DDMMYYYY')}-${validatedDateRange.toDate.format('DDMMYYYY')}.xlsx`;
            const buffer = await workbook.xlsx.writeBuffer();
            await saveExcelFile(buffer, filename);
        } catch {
            messageApi.error('ไม่สามารถ Export ข้อมูล Log Action ได้');
        } finally {
            setExporting(false);
        }
    };

    const filteredData = useMemo(() => {
        const employeeFilter = searchEmployeeId.toLowerCase().trim();
        const nameFilter = searchName.toLowerCase().trim();
        const roleFilter = searchRole.trim();
        const actionFilter = searchAction.trim();

        return data.filter((row) => (
            row.employeeId.toLowerCase().includes(employeeFilter) &&
            row.name.toLowerCase().includes(nameFilter) &&
            (!roleFilter || row.role === roleFilter) &&
            (!actionFilter || row.action === actionFilter)
        ));
    }, [data, searchEmployeeId, searchName, searchRole, searchAction]);

    const roleOptions = useMemo(() => {
        const roleSet = new Set<string>(ROLE_FILTER_CATALOG);
        data.forEach((row) => {
            if (row.role) {
                roleSet.add(row.role);
            }
        });

        return Array.from(roleSet).map((role) => ({
            label: role,
            value: role,
        }));
    }, [data]);

    const actionOptions = useMemo(() => {
        const actionSet = new Set<string>(ACTION_FILTER_CATALOG);
        data.forEach((row) => {
            if (row.action) {
                actionSet.add(row.action);
            }
        });

        return Array.from(actionSet).map((action) => ({
            label: action,
            value: action,
        }));
    }, [data]);

    useEffect(() => {
        if (!hasSearched) return;

        const updateTableHeight = () => {
            if (!tableContainerRef.current) return;

            const container = tableContainerRef.current;
            const containerTop = container.getBoundingClientRect().top;
            const viewportHeight = window.innerHeight;
            const bottomSpacing = 20;

            const tableHeader = container.querySelector('.ant-table-thead') as HTMLElement | null;
            const tablePagination = container.querySelector('.ant-pagination') as HTMLElement | null;
            const containerWidth = container.clientWidth;

            const headerHeight = tableHeader?.getBoundingClientRect().height ?? 96;
            const paginationHeight = tablePagination?.getBoundingClientRect().height ?? 56;

            const availableHeight = viewportHeight - containerTop - bottomSpacing;
            const bodyHeight = Math.floor(availableHeight - headerHeight - paginationHeight - 12);

            setTableScrollY(Math.max(180, bodyHeight));
            setTableScrollX(Math.max(containerWidth, MIN_TABLE_WIDTH));
        };

        const rafId = window.requestAnimationFrame(() => {
            updateTableHeight();
            window.requestAnimationFrame(updateTableHeight);
        });
        window.addEventListener('resize', updateTableHeight);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updateTableHeight);
        };
    }, [hasSearched, filteredData.length, loading]);

    const noteColumnWidth = Math.max(230, tableScrollX - FIXED_COLUMNS_WIDTH_WITHOUT_NOTE);

    const columns: ColumnsType<LogActionDataType> = [
        {
            title: 'No',
            key: 'no',
            align: 'center',
            width: 60,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! border-b-0!',
            }),
            render: (_value: unknown, _record: LogActionDataType, index: number) => index + 1,
        },
        {
            title: 'ActionDate',
            dataIndex: 'actionDate',
            key: 'actionDate',
            align: 'center',
            width: 130,
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
            width: 130,
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
            width: 250,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! pb-2!',
            }),
        },
        {
            title: (
                <div className="flex flex-col gap-2">
                    <span>Role</span>
                    <Select
                        className="w-full"
                        placeholder="ทั้งหมด"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={searchRole || undefined}
                        options={roleOptions}
                        onChange={(value) => setSearchRole(value || '')}
                    />
                </div>
            ),
            dataIndex: 'role',
            key: 'role',
            align: 'center',
            width: 180,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! pb-2!',
            }),
            render: (text: string, record: LogActionDataType) => (
                <Tag color={getRoleTagColor(text, record.userGroupNo)} className="rounded-full px-3 py-0.5 m-0">
                    {text || '-'}
                </Tag>
            ),
        },
        {
            title: 'Menu',
            dataIndex: 'menu',
            key: 'menu',
            align: 'left',
            width: 250,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! border-b-0!',
            }),
        },
        {
            title: (
                <div className="flex flex-col gap-2">
                    <span>Action</span>
                    <Select
                        className="w-full"
                        placeholder="ทั้งหมด"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={searchAction || undefined}
                        options={actionOptions}
                        onChange={(value) => setSearchAction(value || '')}
                    />
                </div>
            ),
            dataIndex: 'action',
            key: 'action',
            align: 'center',
            width: 150,
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
            width: noteColumnWidth,
            className: 'align-top',
            onHeaderCell: () => ({
                className: 'bg-blue-200! text-black! font-bold! border-b-0!',
            }),
        },
    ];

    return (
        <Main currentPath="/monitor">
            {messageContextHolder}
            <div className="space-y-6 w-full min-w-0">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">

                    <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <HistoryOutlined className="text-xl" />
                                <h1 className="text-2xl font-bold m-0 text-white">Log Action</h1>
                            </div>
                        </div>
                    </div>



                    <div className="flex flex-wrap items-center justify-center md:justify-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-700 font-medium w-32 md:w28">วันที่เริ่มต้น</span>
                            <DatePicker
                                className="w-40!"
                                format="DD/MM/YYYY"
                                allowClear={false}
                                value={startDate}
                                onChange={setStartDate}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-gray-700 font-medium w-32 md:w-28">วันที่สิ้นสุด</span>
                            <DatePicker
                                className="w-40!"
                                format="DD/MM/YYYY"
                                allowClear={false}
                                value={endDate}
                                onChange={setEndDate}
                            />
                        </div>

                        <Button
                            type="primary"
                            className="bg-red-500 hover:bg-red-600 border-red-500 px-6 rounded-md"
                            onClick={handleSearch}
                            loading={loading}
                        >
                            เรียกดูข้อมูล
                        </Button>

                        <Button
                            icon={<FileExcelOutlined />}
                            className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
                            onClick={handleExportExcel}
                            loading={exporting}
                        >
                            Excel
                        </Button>
                    </div>

                </div>

                {/* Table */}
                {hasSearched && (
                    <div ref={tableContainerRef} className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            loading={loading}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                            }}
                            scroll={{ x: tableScrollX, y: tableScrollY }}
                            size="middle"
                            bordered={false}
                            rowClassName={() => 'bg-white hover:bg-gray-50'}
                        />
                    </div>
                )}
            </div>
        </Main>
    );
}
