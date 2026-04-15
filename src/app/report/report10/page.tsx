'use client';

import React, { useMemo, useState } from 'react';
import Main from '@/components/layout/main';
import { FileText } from 'lucide-react';
import { Table, DatePicker, Button, Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileExcelOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';

dayjs.locale('th');

interface SearchFormValues {
    date?: Dayjs;
}

interface Report10SummaryApiRow {
    key?: unknown;
    position?: unknown;
    n1?: unknown;
    n2?: unknown;
    n3?: unknown;
    s1?: unknown;
    s2?: unknown;
    s3?: unknown;
    sm1?: unknown;
    sm2?: unknown;
    sm3?: unknown;
    t1?: unknown;
    t2?: unknown;
    t3?: unknown;
    [key: string]: unknown;
}

interface Report10SummaryApiResponse {
    status: number;
    data?: Report10SummaryApiRow[];
    message?: string;
}

type Report10LevelGroup = '010' | '020_030' | '040' | '050' | 'OTHER';
type Report10GroupType = 'PTT' | 'SPEC' | 'SECONDMENT';

interface Report10DetailApiRow {
    key?: unknown;
    level_group?: unknown;
    level_name?: unknown;
    position_name?: unknown;
    position_id?: unknown;
    employee_id?: unknown;
    full_name?: unknown;
    dashboard_group?: unknown;
    group_type?: unknown;
    org_type?: unknown;
    spec_flag?: unknown;
    [key: string]: unknown;
}

interface Report10DetailApiResponse {
    status: number;
    data?: Report10DetailApiRow[];
    message?: string;
}

interface Report10SummaryDataType {
    key: string;
    position: string;
    struct_frame: number;
    struct_emp: number;
    struct_vac: number;
    spec_frame: number;
    spec_emp: number;
    spec_vac: number;
    sec_frame: number;
    sec_emp: number;
    sec_vac: number;
    total_frame: number;
    total_emp: number;
    total_vac: number;
}

interface Report10DetailDataType {
    key: string;
    levelGroup: Report10LevelGroup;
    levelName: string;
    positionName: string;
    positionId: string;
    employeeId: string;
    fullName: string;
    dashboardGroup: string;
    groupType: Report10GroupType;
}

interface ExportEntry {
    position: string;
    name: string;
}

const toNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const resolveUserContext = () => {
    let employeeId = '99999999';
    let userGroupNo = '04';

    if (typeof window !== 'undefined') {
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr) as { employeeID?: string; roleId?: string };
                employeeId = userData.employeeID || employeeId;
                userGroupNo = localStorage.getItem('selected_usergroup') || userData.roleId || userGroupNo;
            } catch {
                // use fallback defaults
            }
        }
    }

    return { employeeId, userGroupNo };
};

const REPORT10_LEVEL_ORDER = [
    'ปธบ./กผญ.',
    'ประธานเจ้าหน้าที่/รองกรรมการผู้จัดการใหญ่',
    'ผู้ช่วยกรรมการผู้จัดการใหญ่',
    'ผู้จัดการฝ่าย',
];

const REPORT10_SHEET_CONFIGS: Array<{ key: Exclude<Report10LevelGroup, 'OTHER'>; name: string; label: string }> = [
    { key: '010', name: 'ปธบ_กผญ.', label: 'ปธบ./กผญ.' },
    { key: '020_030', name: 'ปธ._รองฯกผญ.', label: 'ประธานเจ้าหน้าที่/รองกรรมการผู้จัดการใหญ่' },
    { key: '040', name: 'ผช.กผญ.', label: 'ผู้ช่วยกรรมการผู้จัดการใหญ่' },
    { key: '050', name: 'ฝ่าย', label: 'ผู้จัดการฝ่าย' },
];

const mapLevelGroup = (levelName: string): Report10LevelGroup => {
    if (levelName.includes('ปธบ') || levelName.includes('กผญ')) return '010';
    if (levelName.includes('รองกรรมการผู้จัดการใหญ่') || levelName.includes('ประธานเจ้าหน้าที่')) return '020_030';
    if (levelName.includes('ผู้ช่วยกรรมการผู้จัดการใหญ่')) return '040';
    if (levelName.includes('ผู้จัดการฝ่าย')) return '050';
    return 'OTHER';
};

const mapGroupType = (rawGroupType: unknown, rawDashboardGroup: unknown, rawOrgType: unknown, rawSpecFlag: unknown): Report10GroupType => {
    const groupType = toText(rawGroupType).toUpperCase();
    if (groupType === 'SECONDMENT' || groupType === 'SPEC' || groupType === 'PTT') {
        return groupType;
    }

    const dashboardGroup = toText(rawDashboardGroup).toLowerCase();
    const orgType = toNumber(rawOrgType);
    const specFlag = toNumber(rawSpecFlag);

    if (orgType === 2 || dashboardGroup.includes('second')) return 'SECONDMENT';
    if (specFlag === 1 || dashboardGroup.includes('spec')) return 'SPEC';
    return 'PTT';
};

const transformSummaryRows = (rows: Report10SummaryApiRow[]): Report10SummaryDataType[] => {
    const transformed = rows.map((row, index) => ({
        key: toText(row.key) || `r10-${index + 1}`,
        position: toText(row.position) || toText(row['ตำแหน่ง']),
        struct_frame: toNumber(row.n1),
        struct_emp: toNumber(row.n2),
        struct_vac: toNumber(row.n3),
        spec_frame: toNumber(row.s1),
        spec_emp: toNumber(row.s2),
        spec_vac: toNumber(row.s3),
        sec_frame: toNumber(row.sm1),
        sec_emp: toNumber(row.sm2),
        sec_vac: toNumber(row.sm3),
        total_frame: toNumber(row.t1),
        total_emp: toNumber(row.t2),
        total_vac: toNumber(row.t3),
    }));

    return transformed.sort((a, b) => {
        const idxA = REPORT10_LEVEL_ORDER.indexOf(a.position);
        const idxB = REPORT10_LEVEL_ORDER.indexOf(b.position);

        if (idxA === -1 && idxB === -1) return a.position.localeCompare(b.position, 'th');
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });
};

const transformDetailRows = (rows: Report10DetailApiRow[]): Report10DetailDataType[] => {
    const groupSortOrder: Record<Report10GroupType, number> = {
        PTT: 1,
        SPEC: 2,
        SECONDMENT: 3,
    };

    return rows
        .map((row, index) => {
            const levelName = toText(row.level_name) || toText(row.LevelName);
            const levelGroup = (toText(row.level_group) as Report10LevelGroup) || mapLevelGroup(levelName);
            const positionName = toText(row.position_name) || toText(row.PositionName);
            const positionId = toText(row.position_id) || toText(row.PositionID);
            const fullName = toText(row.full_name) || toText(row.FullName);

            return {
                key: toText(row.key) || `r10e-${index + 1}`,
                levelGroup,
                levelName,
                positionName,
                positionId,
                employeeId: toText(row.employee_id) || toText(row.EmployeeID),
                fullName,
                dashboardGroup: toText(row.dashboard_group) || toText(row.DashboardGroup),
                groupType: mapGroupType(row.group_type, row.dashboard_group || row.DashboardGroup, row.org_type || row.OrgType, row.spec_flag || row.SpecFlag),
            };
        })
        .sort((a, b) => {
            if (a.levelGroup !== b.levelGroup) return a.levelGroup.localeCompare(b.levelGroup);
            if (groupSortOrder[a.groupType] !== groupSortOrder[b.groupType]) return groupSortOrder[a.groupType] - groupSortOrder[b.groupType];

            const posA = a.positionName || a.positionId;
            const posB = b.positionName || b.positionId;
            const byPosition = posA.localeCompare(posB, 'th');
            if (byPosition !== 0) return byPosition;

            return a.fullName.localeCompare(b.fullName, 'th');
        });
};

const createHeaderStyle = (cell: ExcelJS.Cell, fillColor: string) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.font = { name: 'Sarabun', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
};

const createSubHeaderStyle = (cell: ExcelJS.Cell, fillColor: string) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.font = { name: 'Sarabun', bold: true, color: { argb: 'FF0F2B64' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
};

const createBodyStyle = (cell: ExcelJS.Cell) => {
    cell.font = { name: 'Sarabun', color: { argb: 'FF0F2B64' }, size: 11 };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
};

const writeSectionAt = (
    worksheet: ExcelJS.Worksheet,
    row: number,
    startCol: number,
    sectionLabel: string,
    entries: ExportEntry[],
    sectionTheme: { header: string; subHeader: string },
) => {
    const endCol = startCol + 2;

    worksheet.mergeCells(row, startCol, row, endCol);
    const sectionCell = worksheet.getCell(row, startCol);
    sectionCell.value = `${sectionLabel} (${entries.length} กรอบอัตรากำลัง)`;
    createHeaderStyle(sectionCell, sectionTheme.header);

    worksheet.mergeCells(row + 1, startCol, row + 1, endCol);
    const rangeCell = worksheet.getCell(row + 1, startCol);
    rangeCell.value = entries.length > 0 ? `${sectionLabel} ลำดับ 1-${entries.length}` : sectionLabel;
    createHeaderStyle(rangeCell, sectionTheme.header);

    const colNo = worksheet.getCell(row + 2, startCol);
    const colPosition = worksheet.getCell(row + 2, startCol + 1);
    const colName = worksheet.getCell(row + 2, startCol + 2);

    colNo.value = 'ลำดับ';
    colPosition.value = 'ตำแหน่ง';
    colName.value = 'รายชื่อผู้บริหาร';

    createSubHeaderStyle(colNo, sectionTheme.subHeader);
    createSubHeaderStyle(colPosition, sectionTheme.subHeader);
    createSubHeaderStyle(colName, sectionTheme.subHeader);
};

const buildDetailWorkbook = async (rows: Report10DetailDataType[], effectiveDate: Dayjs) => {
    const workbook = new ExcelJS.Workbook();

    for (const sheetConfig of REPORT10_SHEET_CONFIGS) {
        const worksheet = workbook.addWorksheet(sheetConfig.name);

        const sectionRows = rows.filter((item) => item.levelGroup === sheetConfig.key);
        const pttRows = sectionRows.filter((item) => item.groupType !== 'SECONDMENT');
        const secRows = sectionRows.filter((item) => item.groupType === 'SECONDMENT');

        const resolveName = (employeeId: string, fullName: string) => {
            if (!employeeId) return 'ว่าง';
            if (!fullName) return 'ไม่มีชื่อ';
            return fullName;
        };

        const toEntry = (item: Report10DetailDataType): ExportEntry => ({
            position: item.positionName || item.positionId || '-',
            name: resolveName(item.employeeId, item.fullName),
        });

        const pttEntries = pttRows.map(toEntry);
        const secEntries = secRows.map(toEntry);

        const totalCount = sectionRows.length;
        const title = `กรอบอัตรากำลังและผู้บริหาร ระดับ ${sheetConfig.label} (${totalCount} กรอบ : ใน ปตท. ${pttEntries.length} กรอบ / Sec ${secEntries.length} กรอบ)`;

        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = title;
        titleCell.font = { name: 'Sarabun', bold: true, size: 14, color: { argb: 'FF0F2B64' } };
        titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

        const startRow = 3;
        writeSectionAt(worksheet, startRow, 1, 'ใน ปตท.', pttEntries, { header: 'FF2F5597', subHeader: 'FFD9E2F3' });
        writeSectionAt(worksheet, startRow, 5, 'Secondment', secEntries, { header: 'FF375623', subHeader: 'FFE2EFDA' });

        const totalRows = Math.max(pttEntries.length, secEntries.length, 1);
        for (let i = 0; i < totalRows; i++) {
            const pttItem = pttEntries[i];
            const secItem = secEntries[i];

            const pttNoCell = worksheet.getCell(startRow + 3 + i, 1);
            const pttPositionCell = worksheet.getCell(startRow + 3 + i, 2);
            const pttNameCell = worksheet.getCell(startRow + 3 + i, 3);

            pttNoCell.value = pttItem ? i + 1 : '';
            pttPositionCell.value = pttItem ? pttItem.position : '';
            pttNameCell.value = pttItem ? pttItem.name : '';

            createBodyStyle(pttNoCell);
            createBodyStyle(pttPositionCell);
            createBodyStyle(pttNameCell);
            pttNoCell.alignment = { horizontal: 'center', vertical: 'middle' };

            const secNoCell = worksheet.getCell(startRow + 3 + i, 5);
            const secPositionCell = worksheet.getCell(startRow + 3 + i, 6);
            const secNameCell = worksheet.getCell(startRow + 3 + i, 7);

            secNoCell.value = secItem ? i + 1 : '';
            secPositionCell.value = secItem ? secItem.position : '';
            secNameCell.value = secItem ? secItem.name : '';

            createBodyStyle(secNoCell);
            createBodyStyle(secPositionCell);
            createBodyStyle(secNameCell);
            secNoCell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        worksheet.getColumn(1).width = 7;
        worksheet.getColumn(2).width = 33;
        worksheet.getColumn(3).width = 34;
        worksheet.getColumn(4).width = 4;
        worksheet.getColumn(5).width = 7;
        worksheet.getColumn(6).width = 33;
        worksheet.getColumn(7).width = 34;

        for (let r = 3; r <= worksheet.rowCount; r++) {
            worksheet.getRow(r).height = 24;
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    await saveExcelFile(buffer, `รายงานกรอบอัตรากำลังและจำนวนผู้บริหาร_${effectiveDate.format('YYYYMMDD')}.xlsx`);
};

export default function Report10Page() {
    const [form] = Form.useForm<SearchFormValues>();
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentSearchDate, setCurrentSearchDate] = useState<Dayjs>(dayjs());
    const [tableData, setTableData] = useState<Report10SummaryDataType[]>([]);

    const fetchSummaryData = async (date: Dayjs) => {
        const { employeeId, userGroupNo } = resolveUserContext();
        const query = new URLSearchParams({
            effectiveDate: date.format('YYYY-MM-DD'),
            employeeId,
            userGroupNo,
        });

        const res = await fetch(`/api/report/report10?${query.toString()}`);
        const payload: Report10SummaryApiResponse = await res.json();

        if (!res.ok || payload.status !== 200 || !Array.isArray(payload.data)) {
            throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
        }

        return transformSummaryRows(payload.data);
    };

    const onSearch = async (values: SearchFormValues) => {
        const searchDate = values.date || currentSearchDate;
        setCurrentSearchDate(searchDate);
        setLoading(true);

        try {
            const rows = await fetchSummaryData(searchDate);
            setTableData(rows);
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch report10 summary:', error);
            setTableData([]);
            setHasSearched(true);
            alert('ไม่สามารถดึงข้อมูลรายงานได้');
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        const { employeeId, userGroupNo } = resolveUserContext();

        setExporting(true);
        try {
            const query = new URLSearchParams({
                effectiveDate: currentSearchDate.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo,
            });

            const res = await fetch(`/api/report/report10/excel?${query.toString()}`);
            const payload: Report10DetailApiResponse = await res.json();

            if (!res.ok || payload.status !== 200 || !Array.isArray(payload.data)) {
                throw new Error(payload.message || 'ไม่สามารถดึงข้อมูล export ได้');
            }

            const detailRows = transformDetailRows(payload.data);
            await buildDetailWorkbook(detailRows, currentSearchDate);
        } catch (error) {
            console.error('Failed to export report10 excel:', error);
            alert('ไม่สามารถ export Excel ได้');
        } finally {
            setExporting(false);
        }
    };

    const columns: ColumnsType<Report10SummaryDataType> = useMemo(() => {
        const headerBlue200 = 'bg-blue-200! text-blue-900!';
        const headerBlue100 = 'bg-blue-100! text-blue-900!';

        const headerOrange200 = 'bg-orange-200! text-orange-900!';
        const headerOrange100 = 'bg-orange-100! text-orange-900!';

        const headerGreen200 = 'bg-green-200! text-green-900!';
        const headerGreen100 = 'bg-green-100! text-green-900!';

        const headerYellow200 = 'bg-yellow-200! text-yellow-900!';
        const headerYellow100 = 'bg-yellow-100! text-yellow-900!';

        return [
            {
                title: 'ตำแหน่ง',
                dataIndex: 'position',
                key: 'position',
                width: 300,
                fixed: 'left',
                className: 'bg-gray-50! font-medium text-gray-700',
                onHeaderCell: () => ({ className: `${headerBlue100} text-center font-bold border-r border-gray-300` }),
            },
            {
                title: 'ตามโครงสร้าง',
                onHeaderCell: () => ({ className: `${headerBlue200} text-center font-bold border-r border-gray-300` }),
                children: [
                    { title: 'กรอบอัตรากำลัง', dataIndex: 'struct_frame', key: 'struct_frame', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerBlue100} font-bold` }) },
                    { title: 'จำนวนพนักงาน', dataIndex: 'struct_emp', key: 'struct_emp', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerBlue100} font-bold` }) },
                    { title: 'ว่าง', dataIndex: 'struct_vac', key: 'struct_vac', width: 90, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerBlue100} font-bold` }) },
                ],
            },
            {
                title: 'กรอบเฉพาะตัว',
                onHeaderCell: () => ({ className: `${headerOrange200} text-center font-bold border-r border-gray-300` }),
                children: [
                    { title: 'กรอบอัตรากำลัง', dataIndex: 'spec_frame', key: 'spec_frame', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerOrange100} font-bold` }) },
                    { title: 'จำนวนพนักงาน', dataIndex: 'spec_emp', key: 'spec_emp', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerOrange100} font-bold` }) },
                    { title: 'ว่าง', dataIndex: 'spec_vac', key: 'spec_vac', width: 90, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerOrange100} font-bold` }) },
                ],
            },
            {
                title: 'Secondment',
                onHeaderCell: () => ({ className: `${headerGreen200} text-center font-bold border-r border-gray-300` }),
                children: [
                    { title: 'กรอบอัตรากำลัง', dataIndex: 'sec_frame', key: 'sec_frame', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerGreen100} font-bold` }) },
                    { title: 'จำนวนพนักงาน', dataIndex: 'sec_emp', key: 'sec_emp', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerGreen100} font-bold` }) },
                    { title: 'ว่าง', dataIndex: 'sec_vac', key: 'sec_vac', width: 90, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerGreen100} font-bold` }) },
                ],
            },
            {
                title: 'รวมทั้งหมด',
                onHeaderCell: () => ({ className: `${headerYellow200} text-center font-bold` }),
                children: [
                    { title: 'กรอบอัตรากำลัง', dataIndex: 'total_frame', key: 'total_frame', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerYellow100} font-bold` }) },
                    { title: 'จำนวนพนักงาน', dataIndex: 'total_emp', key: 'total_emp', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerYellow100} font-bold` }) },
                    { title: 'ตำแหน่งว่าง', dataIndex: 'total_vac', key: 'total_vac', width: 110, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerYellow100} font-bold` }) },
                ],
            },
        ];
    }, []);

    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <FileText className="text-2xl text-blue-100" />
                            <h1 className="text-2xl font-bold m-0 text-white">Report 10</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">รายงานกรอบอัตรากำลังและจำนวนผู้บริหาร</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={onSearch}
                        initialValues={{ date: currentSearchDate }}
                        className="flex items-center gap-2"
                    >
                        <Form.Item name="date" label="วันที่" className="m-0">
                            <DatePicker format="DD/MM/YYYY" className="w-36" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                            ค้นหา
                        </Button>
                    </Form>

                    {hasSearched && (
                        <div className="flex items-center gap-2">
                            <Button
                                icon={<FileExcelOutlined />}
                                onClick={handleExportExcel}
                                loading={exporting}
                                className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
                            >
                                Excel
                            </Button>
                        </div>
                    )}
                </div>

                {hasSearched && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-4">
                        <div className="w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-7.2rem)] overflow-hidden">
                            <Table
                                columns={columns}
                                dataSource={tableData}
                                loading={loading}
                                bordered
                                size="small"
                                scroll={{ x: 'max-content', y: 600 }}
                                pagination={false}
                                sticky
                            />
                        </div>
                    </div>
                )}
            </div>
        </Main>
    );
}
