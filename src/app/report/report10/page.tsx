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
    level_code?: unknown;
    LevelCode?: unknown;
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

interface Report10DetailApiRow {
    key?: unknown;
    level_group?: unknown;
    level_group_no?: unknown;
    LevelGroupNo?: unknown;
    level_code?: unknown;
    LevelCode?: unknown;
    level_name?: unknown;
    position_name?: unknown;
    position_short_name?: unknown;
    unit_name?: unknown;
    parent_unit_name?: unknown;
    unit_level_no?: unknown;
    unit_level_name?: unknown;
    jg?: unknown;
    position_id?: unknown;
    employee_id?: unknown;
    full_name?: unknown;
    org_type?: unknown;
    pool_rs_flag?: unknown;
    strg_flag?: unknown;
    bs_type?: unknown;
    spec_flag?: unknown;
    frame_type?: unknown;
    strategic?: unknown;
    business_support?: unknown;
    specific_rate?: unknown;
    [key: string]: unknown;
}

interface Report10DetailApiResponse {
    status: number;
    data?: Report10DetailApiRow[];
    message?: string;
}

interface UserContext {
    employeeID?: string;
    employeeId?: string;
    EmployeeID?: string;
    userGroupNo?: string;
    roleId?: string;
    role?: string;
    userGroups?: Array<{ userGroupNo?: string }>;
}

interface Report10SummaryDataType {
    key: string;
    levelCode: string;
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
    isSecondment: boolean;
    employeeId: string;
    name: string;
    positionNameFull: string;
    positionNameShort: string;
    unitName: string;
    parentUnitName: string;
    unitLevelNo: string;
    jg: string;
    positionId: string;
    frameType: string;
    strategic: string;
    businessSupport: string;
    specificRate: string;
    orgType: number;
    poolRsFlag: number;
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
    let employeeId = 'SYSTEM';
    let userGroupNo = '';

    if (typeof window !== 'undefined') {
        const selectedGroup = localStorage.getItem('selected_usergroup')?.trim() || '';
        const userDataStr = localStorage.getItem('user_data');

        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr) as UserContext;
                const fallbackGroup = userData.userGroups?.[0]?.userGroupNo?.trim() || '';

                employeeId = (
                    userData.employeeID ||
                    userData.employeeId ||
                    userData.EmployeeID ||
                    employeeId
                ).trim();

                userGroupNo = (
                    selectedGroup ||
                    userData.userGroupNo ||
                    userData.roleId ||
                    userData.role ||
                    fallbackGroup ||
                    ''
                ).trim();
            } catch {
                // use fallback defaults
            }
        } else {
            userGroupNo = selectedGroup;
        }
    }

    return { employeeId, userGroupNo };
};

const readJsonSafely = async <T,>(response: Response): Promise<T | null> => {
    try {
        return (await response.json()) as T;
    } catch {
        return null;
    }
};

const REPORT10_LEVEL_ORDER = ['1007', '1006', '1005', '1004'];
const REPORT10_INCLUDED_LEVEL_GROUPS = new Set<Report10LevelGroup>(['010', '020_030', '040', '050']);

const REPORT10_LEVEL_NAME_BY_CODE: Record<string, string> = {
    '1007': 'ปธบ./กผญ.',
    '1006': 'ประธานเจ้าหน้าที่/รองกรรมการผู้จัดการใหญ่',
    '1005': 'ผู้ช่วยกรรมการผู้จัดการใหญ่',
    '1004': 'ผู้จัดการฝ่าย',
};

const resolveReport10LevelName = (rawLevelCode: unknown, fallbackLevelName: string): string => {
    const normalizedLevelCode = toText(rawLevelCode).replace(/\D/g, '');
    return REPORT10_LEVEL_NAME_BY_CODE[normalizedLevelCode] || fallbackLevelName;
};

const getReport10SummarySortRank = (levelCode: string, position: string): number => {
    const normalizedLevelCode = toText(levelCode).replace(/\D/g, '');
    if (normalizedLevelCode === '1007') return 1;
    if (normalizedLevelCode === '1006') return 2;
    if (normalizedLevelCode === '1005') return 3;
    if (normalizedLevelCode === '1004') return 4;

    const normalizedPosition = toText(position).replace(/\s+/g, '');
    if (normalizedPosition.includes('ปธบ') || normalizedPosition.includes('กผญ')) return 1;
    if (normalizedPosition.includes('รองกรรมการผู้จัดการใหญ่') || normalizedPosition.includes('ประธานเจ้าหน้าที่')) return 2;
    if (normalizedPosition.includes('ผู้ช่วยกรรมการผู้จัดการใหญ่')) return 3;
    if (normalizedPosition.includes('ผู้จัดการฝ่าย')) return 4;
    return 99;
};

const mapLevelGroup = (levelName: string): Report10LevelGroup => {
    if (levelName.includes('ปธบ') || levelName.includes('กผญ')) return '010';
    if (levelName.includes('รองกรรมการผู้จัดการใหญ่') || levelName.includes('ประธานเจ้าหน้าที่')) return '020_030';
    if (levelName.includes('ผู้ช่วยกรรมการผู้จัดการใหญ่')) return '040';
    if (levelName.includes('ผู้จัดการฝ่าย')) return '050';
    return 'OTHER';
};

const mapLevelGroupByLevelCode = (rawLevelCode: unknown, fallbackLevelName: string): Report10LevelGroup => {
    const levelCode = toText(rawLevelCode).replace(/\D/g, '');
    if (levelCode === '1007' || levelCode === '010') return '010';
    if (levelCode === '1006' || levelCode === '020' || levelCode === '030') return '020_030';
    if (levelCode === '1005' || levelCode === '040') return '040';
    if (levelCode === '1004' || levelCode === '050') return '050';
    return mapLevelGroup(fallbackLevelName);
};

const mapFrameType = (rawFrameType: unknown, rawOrgType: unknown, rawPoolRsFlag: unknown): string => {
    const frameType = toText(rawFrameType);
    if (frameType) return frameType;

    const orgType = toNumber(rawOrgType);
    const poolRsFlag = toNumber(rawPoolRsFlag);
    if (poolRsFlag === 1) return 'pool';
    if (orgType === 2) return 'Secondment';
    if (orgType === 1) return 'ปตท';
    return '-';
};

const mapStrategic = (rawStrategic: unknown, rawStrgFlag: unknown): string => {
    const strategic = toText(rawStrategic).toUpperCase();
    if (strategic === 'Y' || strategic === 'N') return strategic;
    return toNumber(rawStrgFlag) === 1 ? 'Y' : 'N';
};

const mapBusinessSupport = (rawBusinessSupport: unknown, rawBsType: unknown): string => {
    const businessSupport = toText(rawBusinessSupport);
    if (businessSupport) return businessSupport;

    const bsType = toNumber(rawBsType);
    if (bsType === 1) return 'Business';
    if (bsType === 2) return 'Support';
    return '-';
};

const mapSpecificRate = (rawSpecificRate: unknown, rawSpecFlag: unknown): string => {
    const specificRate = toText(rawSpecificRate).toUpperCase();
    if (specificRate === 'Y' || specificRate === 'N') return specificRate;
    return toNumber(rawSpecFlag) === 1 ? 'Y' : 'N';
};

const transformSummaryRows = (rows: Report10SummaryApiRow[]): Report10SummaryDataType[] => {
    const transformed = rows.map((row, index) => ({
        key: toText(row.key) || `r10-${index + 1}`,
        levelCode: toText(row.level_code) || toText(row.LevelCode),
        position:
            toText(row.position) ||
            toText(row['ตำแหน่ง']) ||
            resolveReport10LevelName(row.level_code ?? row.LevelCode, ''),
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

    return sortReport10SummaryRows(filterReport10SummaryRows(transformed));
};

const filterReport10SummaryRows = (rows: Report10SummaryDataType[]): Report10SummaryDataType[] => {
    return rows.filter((row) => getReport10SummarySortRank(row.levelCode, row.position) < 99);
};

const sortReport10SummaryRows = (rows: Report10SummaryDataType[]): Report10SummaryDataType[] => {
    return [...rows].sort((a, b) => {
        const rankA = getReport10SummarySortRank(a.levelCode, a.position);
        const rankB = getReport10SummarySortRank(b.levelCode, b.position);
        if (rankA !== rankB) return rankA - rankB;

        const idxA = REPORT10_LEVEL_ORDER.indexOf(a.levelCode);
        const idxB = REPORT10_LEVEL_ORDER.indexOf(b.levelCode);
        if (idxA !== idxB) return idxA - idxB;
        return a.position.localeCompare(b.position, 'th');
    });
};

const transformDetailRows = (rows: Report10DetailApiRow[]): Report10DetailDataType[] => {
    const levelSortOrder: Record<Report10LevelGroup, number> = {
        '010': 1,
        '020_030': 2,
        '040': 3,
        '050': 4,
        'OTHER': 9,
    };

    return rows
        .map((row, index) => {
            const levelCode =
                toText(row.level_group_no) ||
                toText(row.LevelGroupNo) ||
                toText(row.level_code) ||
                toText(row.LevelCode) ||
                toText(row.unit_level_no) ||
                toText(row.UnitLevelNo);
            const levelNameFallback =
                toText(row.level_name) || toText(row.LevelName) || toText(row.unit_level_name) || toText(row.UnitLevelName);
            const levelName = resolveReport10LevelName(levelCode, levelNameFallback);
            const levelGroupRaw = toText(row.level_group) as Report10LevelGroup;
            const levelGroup = levelGroupRaw || mapLevelGroupByLevelCode(levelCode, levelName);
            const orgType = toNumber(row.org_type ?? row.OrgType);
            const poolRsFlag = toNumber(row.pool_rs_flag ?? row.PoolRSFlag);
            const employeeId = toText(row.employee_id) || toText(row.EmployeeID);

            return {
                key: toText(row.key) || `r10e-${index + 1}`,
                levelGroup,
                isSecondment: orgType === 2,
                employeeId,
                name: employeeId ? (toText(row.full_name) || toText(row.FULLNAMETH) || 'ไม่มีชื่อ') : 'ว่าง',
                positionNameFull: toText(row.position_name) || toText(row.POSNAME) || '-',
                positionNameShort: toText(row.position_short_name) || levelName || '-',
                unitName: toText(row.unit_name) || toText(row.UnitName) || '-',
                parentUnitName: toText(row.parent_unit_name) || toText(row.ParentUnitName) || '-',
                unitLevelNo: levelCode || '-',
                jg: toText(row.jg) || toText(row.job_band) || toText(row.JobBand) || '-',
                positionId: toText(row.position_id) || toText(row.POSCODE) || toText(row.PositionID) || '-',
                frameType: mapFrameType(row.frame_type, row.org_type ?? row.OrgType, row.pool_rs_flag ?? row.PoolRSFlag),
                strategic: mapStrategic(row.strategic, row.strg_flag ?? row.StrgFlag),
                businessSupport: mapBusinessSupport(row.business_support, row.bs_type ?? row.BSType),
                specificRate: mapSpecificRate(row.specific_rate, row.spec_flag ?? row.SpecFlag),
                orgType,
                poolRsFlag,
            };
        })
        .filter((row) => REPORT10_INCLUDED_LEVEL_GROUPS.has(row.levelGroup))
        .sort((a, b) => {
            if (levelSortOrder[a.levelGroup] !== levelSortOrder[b.levelGroup]) {
                return levelSortOrder[a.levelGroup] - levelSortOrder[b.levelGroup];
            }

            if (a.isSecondment !== b.isSecondment) {
                return Number(a.isSecondment) - Number(b.isSecondment);
            }

            if (a.poolRsFlag !== b.poolRsFlag) {
                return b.poolRsFlag - a.poolRsFlag;
            }

            const byPosition = a.positionNameFull.localeCompare(b.positionNameFull, 'th');
            if (byPosition !== 0) return byPosition;

            return a.name.localeCompare(b.name, 'th');
        });
};

const createHeaderStyle = (cell: ExcelJS.Cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    cell.font = { name: 'Sarabun', bold: true, color: { argb: 'FF000000' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
};

const createBodyStyle = (cell: ExcelJS.Cell, horizontal: 'left' | 'center' = 'left') => {
    cell.font = { name: 'Sarabun', color: { argb: 'FF000000' }, size: 11 };
    cell.alignment = { horizontal, vertical: 'middle' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
};

const createSummaryHeaderStyle = (cell: ExcelJS.Cell, fillColor: string, textColor: string = 'FF000000') => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.font = { name: 'Sarabun', bold: true, color: { argb: textColor }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
};

const createSummaryBodyStyle = (cell: ExcelJS.Cell, horizontal: 'left' | 'center' = 'center') => {
    cell.font = { name: 'Sarabun', color: { argb: 'FF000000' }, size: 11 };
    cell.alignment = { horizontal, vertical: 'middle' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
};

type SheetFilter = (row: Report10DetailDataType) => boolean;

const REPORT10_EXPORT_SHEETS: Array<{ name: string; label: string; filter: SheetFilter }> = [
    { name: 'รวม', label: 'รวม', filter: () => true },
    { name: 'ปธบ', label: 'ปธบ', filter: (row) => row.levelGroup === '010' && !row.isSecondment },
    { name: 'ปธบ(sec)', label: 'ปธบ (sec)', filter: (row) => row.levelGroup === '010' && row.isSecondment },
    { name: 'รอง', label: 'รอง', filter: (row) => row.levelGroup === '020_030' && !row.isSecondment },
    { name: 'รอง(sec)', label: 'รอง (sec)', filter: (row) => row.levelGroup === '020_030' && row.isSecondment },
    { name: 'ผู้ช่วย', label: 'ผู้ช่วย', filter: (row) => row.levelGroup === '040' && !row.isSecondment },
    { name: 'ผู้ช่วย(sec)', label: 'ผู้ช่วย (sec)', filter: (row) => row.levelGroup === '040' && row.isSecondment },
    { name: 'ฝ่าย', label: 'ฝ่าย', filter: (row) => row.levelGroup === '050' && !row.isSecondment },
    { name: 'ฝ่าย(sec)', label: 'ฝ่าย (sec)', filter: (row) => row.levelGroup === '050' && row.isSecondment },
];

const buildSummaryWorksheet = (workbook: ExcelJS.Workbook, summaryRows: Report10SummaryDataType[], effectiveDate: Dayjs) => {
    const worksheet = workbook.addWorksheet('summary');

    worksheet.mergeCells('A1:M1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `รายงานกรอบอัตรากำลังและจำนวนผู้บริหาร (ภาพรวม) ณ วันที่ ${effectiveDate.format('DD/MM/YYYY')}`;
    titleCell.font = { name: 'Sarabun', bold: true, size: 12, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

    worksheet.mergeCells('A3:A4');
    worksheet.mergeCells('B3:D3');
    worksheet.mergeCells('E3:G3');
    worksheet.mergeCells('H3:J3');
    worksheet.mergeCells('K3:M3');

    worksheet.getCell('A3').value = 'ตำแหน่ง';
    worksheet.getCell('B3').value = 'ตามโครงสร้าง';
    worksheet.getCell('E3').value = 'กรอบเฉพาะตัว';
    worksheet.getCell('H3').value = 'Secondment';
    worksheet.getCell('K3').value = 'รวมทั้งหมด';

    createSummaryHeaderStyle(worksheet.getCell('A3'), 'FFE3E8EF', 'FF1E3A8A');
    createSummaryHeaderStyle(worksheet.getCell('B3'), 'FFA9C0DE', 'FF1E3A8A');
    createSummaryHeaderStyle(worksheet.getCell('E3'), 'FFF1CC9E', 'FF92400E');
    createSummaryHeaderStyle(worksheet.getCell('H3'), 'FFA7DDB8', 'FF14532D');
    createSummaryHeaderStyle(worksheet.getCell('K3'), 'FFF2E58A', 'FF713F12');

    const subHeaders = [
        { col: 2, title: 'กรอบอัตรากำลัง', fill: 'FFBFD0E5', color: 'FF1E3A8A' },
        { col: 3, title: 'จำนวนพนักงาน', fill: 'FFBFD0E5', color: 'FF1E3A8A' },
        { col: 4, title: 'ว่าง', fill: 'FFBFD0E5', color: 'FF1E3A8A' },
        { col: 5, title: 'กรอบอัตรากำลัง', fill: 'FFF5E3CC', color: 'FF92400E' },
        { col: 6, title: 'จำนวนพนักงาน', fill: 'FFF5E3CC', color: 'FF92400E' },
        { col: 7, title: 'ว่าง', fill: 'FFF5E3CC', color: 'FF92400E' },
        { col: 8, title: 'กรอบอัตรากำลัง', fill: 'FFCDEBD6', color: 'FF14532D' },
        { col: 9, title: 'จำนวนพนักงาน', fill: 'FFCDEBD6', color: 'FF14532D' },
        { col: 10, title: 'ว่าง', fill: 'FFCDEBD6', color: 'FF14532D' },
        { col: 11, title: 'กรอบอัตรากำลัง', fill: 'FFF7F0BF', color: 'FF713F12' },
        { col: 12, title: 'จำนวนพนักงาน', fill: 'FFF7F0BF', color: 'FF713F12' },
        { col: 13, title: 'ตำแหน่งว่าง', fill: 'FFF7F0BF', color: 'FF713F12' },
    ];

    subHeaders.forEach((item) => {
        const cell = worksheet.getCell(4, item.col);
        cell.value = item.title;
        createSummaryHeaderStyle(cell, item.fill, item.color);
    });

    if (!summaryRows.length) {
        worksheet.mergeCells('A5:M5');
        const noDataCell = worksheet.getCell('A5');
        noDataCell.value = 'ไม่พบข้อมูล';
        noDataCell.font = { name: 'Sarabun', italic: true, color: { argb: 'FF666666' }, size: 11 };
        noDataCell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
        summaryRows.forEach((row, index) => {
            const rowIndex = 5 + index;
            const values = [
                row.position,
                row.struct_frame,
                row.struct_emp,
                row.struct_vac,
                row.spec_frame,
                row.spec_emp,
                row.spec_vac,
                row.sec_frame,
                row.sec_emp,
                row.sec_vac,
                row.total_frame,
                row.total_emp,
                row.total_vac,
            ];

            values.forEach((value, idx) => {
                const col = idx + 1;
                const cell = worksheet.getCell(rowIndex, col);
                cell.value = value;
                createSummaryBodyStyle(cell, col === 1 ? 'left' : 'center');
            });
        });
    }

    const widths = [42, 16, 16, 12, 16, 16, 12, 16, 16, 12, 16, 16, 15];
    widths.forEach((width, idx) => {
        worksheet.getColumn(idx + 1).width = width;
    });

    worksheet.getRow(1).height = 22;
    worksheet.getRow(3).height = 24;
    worksheet.getRow(4).height = 24;
};

const buildDetailWorkbook = async (
    rows: Report10DetailDataType[],
    summaryRows: Report10SummaryDataType[],
    effectiveDate: Dayjs
) => {
    const workbook = new ExcelJS.Workbook();
    buildSummaryWorksheet(workbook, summaryRows, effectiveDate);
    const headers = [
        'ลำดับที่',
        'ชื่อ',
        'ชื่อตำแหน่งเต็ม',
        'ชื่อย่อตำแหน่ง',
        'หน่วยงาน',
        'สายงาน',
        'ระดับ',
        'JG',
        'เลข Position',
        'ประเภทกรอบ',
        'Strategic',
        'Business/Support',
        'อัตราเฉพาะตัว',
    ];

    const centerColumns = new Set([1, 7, 8, 9, 10, 11, 12, 13]);
    const columnWidths = [10, 32, 34, 18, 25, 22, 10, 8, 16, 14, 12, 18, 14];

    for (const sheetConfig of REPORT10_EXPORT_SHEETS) {
        const worksheet = workbook.addWorksheet(sheetConfig.name);
        const sheetRows = rows.filter(sheetConfig.filter);
        const title = `กรอบอัตรากำลังและผู้บริหาร ${sheetConfig.label} (${sheetRows.length} รายการ) ณ วันที่ ${effectiveDate.format('DD/MM/YYYY')}`;

        worksheet.mergeCells('A1:M1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = title;
        titleCell.font = { name: 'Sarabun', bold: true, size: 12, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

        const headerRowIndex = 3;
        headers.forEach((header, idx) => {
            const cell = worksheet.getCell(headerRowIndex, idx + 1);
            cell.value = header;
            createHeaderStyle(cell);
        });

        if (!sheetRows.length) {
            const noDataCell = worksheet.getCell(headerRowIndex + 1, 1);
            noDataCell.value = 'ไม่พบข้อมูล';
            noDataCell.font = { name: 'Sarabun', italic: true, color: { argb: 'FF666666' }, size: 11 };
        }

        sheetRows.forEach((entry, index) => {
            const rowIndex = headerRowIndex + 1 + index;
            const isVacant = !entry.employeeId;
            const values = [
                index + 1,
                entry.name,
                entry.positionNameFull,
                entry.positionNameShort,
                entry.unitName,
                entry.parentUnitName,
                entry.unitLevelNo,
                entry.jg,
                entry.positionId,
                entry.frameType,
                entry.strategic,
                entry.businessSupport,
                entry.specificRate,
            ];

            values.forEach((value, idx) => {
                const col = idx + 1;
                const cell = worksheet.getCell(rowIndex, col);
                cell.value = value;
                createBodyStyle(cell, centerColumns.has(col) ? 'center' : 'left');

                if (isVacant) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
                }

                if (isVacant && col === 2) {
                    cell.font = { name: 'Sarabun', color: { argb: 'FFFF0000' }, size: 11, bold: true };
                }
            });
        });

        columnWidths.forEach((width, idx) => {
            worksheet.getColumn(idx + 1).width = width;
        });

        worksheet.getRow(1).height = 22;
        worksheet.getRow(headerRowIndex).height = 22;
        for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
            worksheet.getRow(r).height = 20;
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
        const payload = await readJsonSafely<Report10SummaryApiResponse>(res);

        if (!res.ok || !payload || payload.status !== 200 || !Array.isArray(payload.data)) {
            const fallbackText = await res.text().catch(() => '');
            throw new Error(payload?.message || fallbackText || 'ไม่สามารถดึงข้อมูลรายงานได้');
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
            alert(error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูลรายงานได้');
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
            const payload = await readJsonSafely<Report10DetailApiResponse>(res);

            if (!res.ok || !payload || payload.status !== 200 || !Array.isArray(payload.data)) {
                const fallbackText = await res.text().catch(() => '');
                throw new Error(payload?.message || fallbackText || 'ไม่สามารถดึงข้อมูล export ได้');
            }

            const detailRows = transformDetailRows(payload.data);
            const summaryRows = tableData.length ? tableData : await fetchSummaryData(currentSearchDate);
            await buildDetailWorkbook(detailRows, summaryRows, currentSearchDate);
        } catch (error) {
            console.error('Failed to export report10 excel:', error);
            alert(error instanceof Error ? error.message : 'ไม่สามารถ export Excel ได้');
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
