'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Form, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined, FileExcelOutlined, FullscreenOutlined, FullscreenExitOutlined
} from '@ant-design/icons';
import { FileText } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';
import { fetchRetirementRates } from '@/services/retirementService';

dayjs.locale('th');

interface Report9DataType {
    key: string;
    unit: string;
    cut_support: number;
    cut_bu: number;
    cut_total: number;
    children?: Report9DataType[];
    [key: string]: unknown;
}

interface RateRecord {
    Year: number;
    Rate: number;
}

interface RetirementRateResponse {
    success?: boolean;
    data?: {
        rates?: RateRecord[];
        remark?: string;
    };
}

interface GroupDefinition {
    key: string;
    unit: string;
    children: string[];
}

const DISPLAY_YEAR_COUNT = 5;
const yearOptions = Array.from({ length: 12 }, (_, i) => 2568 + i);

const GROUPS: GroupDefinition[] = [
    {
        key: 'bg-1',
        unit: '1. สำนักงานใหญ่',
        children: ['bg1-1', 'bg1-2', 'bg1-3', 'bg1-4', 'bg1-5', 'bg1-6', 'bg1-7', 'bg1-8', 'bg1-9', 'bg1-10', 'bg1-11'],
    },
    {
        key: 'bg-2',
        unit: '2. กลุ่มธุรกิจปิโตรเลี่ยมขั้นต้นฯ',
        children: ['bg2-1', 'bg2-2', 'bg2-3'],
    },
    {
        key: 'bg-3',
        unit: '3. กลุ่มธุรกิจขั้นปลาย',
        children: ['bg3-1', 'bg3-2', 'bg3-3'],
    },
    {
        key: 'bg-4',
        unit: '4. กลุ่มธุรกิจใหม่และความยั่งยืน',
        children: ['bg4-1', 'bg4-2', 'bg4-3'],
    },
];

const UNIT_NAME_MAP: Record<string, string> = {
    'bg1-1': 'ปธบ./กผญ.ขึ้นตรง',
    'bg1-2': 'รพญ.1',
    'bg1-3': 'รพญ.2',
    'bg1-4': 'รพญ.3',
    'bg1-5': 'รมญ.',
    'bg1-6': 'รกญ.',
    'bg1-7': 'รบญ.',
    'bg1-8': 'ปธง.',
    'bg1-9': 'ผตญ.',
    'bg1-10': 'ผสญ.',
    'bg1-11': 'ผลญ.',
    'bg2-1': '› ปธต.ขึ้นตรง',
    'bg2-2': '› รศล.',
    'bg2-3': '› รธก.',
    'bg3-1': '› ปธป.ขึ้นตรง',
    'bg3-2': '› รธท.',
    'bg3-3': '› รกป.',
    'bg4-1': '› ปธม.ขึ้นตรง',
    'bg4-2': '› รยย.',
    'bg4-3': '› รธม.',
};

const toNumber = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const formatNumber = (value: unknown): string => toNumber(value).toLocaleString();

const getToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
};

const toAD = (year: number): number => (year > 2500 ? year - 543 : year);
const toBE = (year: number): number => (year < 2500 ? year + 543 : year);

const getAllExpandableKeys = (rows: Report9DataType[]): string[] => {
    const keys: string[] = [];
    rows.forEach((row) => {
        if (row.children && row.children.length > 0) {
            keys.push(row.key);
        }
    });
    return keys;
};

const buildFallbackRates = (displayYears: number[]) => {
    const fallback: Record<number, number> = {};
    displayYears.forEach((year, index) => {
        fallback[year] = index <= 1 ? 2 : 3;
    });
    return fallback;
};

const splitByRate = (total: number, rate?: number) => {
    if (!rate || rate <= 0) {
        return { support: 0, bu: 0 };
    }

    const bu = Math.round((total * rate) / (rate + 1));
    return {
        support: Math.max(total - bu, 0),
        bu: Math.max(bu, 0),
    };
};

const mockRetirementByUnitYear = (unitKey: string, year: number) => {
    const seed = unitKey.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const offset = year - 2568;
    const isZero = (seed + offset) % 9 === 0;

    if (isZero) {
        return { support: 0, bu: 0 };
    }

    return {
        support: (seed + (offset * 3)) % 4,
        bu: (seed * 3 + (offset * 5)) % 8,
    };
};

const buildLeafRow = (
    key: string,
    unit: string,
    displayYears: number[],
    rateByYear: Record<number, number>
): Report9DataType => {
    const row: Report9DataType = {
        key,
        unit,
        cut_support: 0,
        cut_bu: 0,
        cut_total: 0,
    };

    let fallbackSupport = 0;
    let fallbackBu = 0;
    let calculatedSupport = 0;
    let calculatedBu = 0;
    let hasRate = false;

    displayYears.forEach((year) => {
        const mock = mockRetirementByUnitYear(key, year);
        row[`y${year}_sup`] = mock.support;
        row[`y${year}_bu`] = mock.bu;

        fallbackSupport += mock.support;
        fallbackBu += mock.bu;

        const total = mock.support + mock.bu;
        const rate = rateByYear[year];
        if (rate > 0) {
            hasRate = true;
            const split = splitByRate(total, rate);
            calculatedSupport += split.support;
            calculatedBu += split.bu;
        } else {
            calculatedSupport += mock.support;
            calculatedBu += mock.bu;
        }
    });

    row.cut_support = hasRate ? calculatedSupport : fallbackSupport;
    row.cut_bu = hasRate ? calculatedBu : fallbackBu;
    row.cut_total = row.cut_support + row.cut_bu;

    return row;
};

const aggregateRows = (
    key: string,
    unit: string,
    rows: Report9DataType[],
    displayYears: number[]
): Report9DataType => {
    const summary: Report9DataType = {
        key,
        unit,
        cut_support: 0,
        cut_bu: 0,
        cut_total: 0,
        children: rows,
    };

    displayYears.forEach((year) => {
        summary[`y${year}_sup`] = rows.reduce((acc, row) => acc + toNumber(row[`y${year}_sup`]), 0);
        summary[`y${year}_bu`] = rows.reduce((acc, row) => acc + toNumber(row[`y${year}_bu`]), 0);
    });

    summary.cut_support = rows.reduce((acc, row) => acc + toNumber(row.cut_support), 0);
    summary.cut_bu = rows.reduce((acc, row) => acc + toNumber(row.cut_bu), 0);
    summary.cut_total = summary.cut_support + summary.cut_bu;

    return summary;
};

const buildReportData = (displayYears: number[], rateByYear: Record<number, number>): Report9DataType[] => {
    const groupRows = GROUPS.map((group) => {
        const children = group.children.map((unitKey) =>
            buildLeafRow(unitKey, UNIT_NAME_MAP[unitKey] || unitKey, displayYears, rateByYear)
        );
        return aggregateRows(group.key, group.unit, children, displayYears);
    });

    const totalRow = aggregateRows('total', '5. รวมทุกธุรกิจ', groupRows, displayYears);
    delete totalRow.children;

    return [...groupRows, totalRow];
};

export default function Report9Page() {
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [effectiveYear, setEffectiveYear] = useState<number>(2569);
    const [rateByYear, setRateByYear] = useState<Record<number, number>>({});
    const [rateRemark, setRateRemark] = useState<string>('');
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const displayYears = useMemo(
        () => Array.from({ length: DISPLAY_YEAR_COUNT }, (_, i) => effectiveYear + i),
        [effectiveYear]
    );

    const tableData = useMemo(
        () => buildReportData(displayYears, rateByYear),
        [displayYears, rateByYear]
    );

    useEffect(() => {
        setExpandedKeys(getAllExpandableKeys(tableData));
    }, [tableData]);

    const fetchRateConfig = useCallback(async () => {
        setLoading(true);
        try {
            const token = getToken();
            const result = await fetchRetirementRates(toAD(effectiveYear), token) as RetirementRateResponse | null;

            const nextRates = buildFallbackRates(displayYears);
            const apiRates = result?.data?.rates || [];

            apiRates.forEach((row) => {
                const yearBE = toBE(toNumber(row.Year));
                if (displayYears.includes(yearBE)) {
                    nextRates[yearBE] = toNumber(row.Rate);
                }
            });

            setRateByYear(nextRates);
            setRateRemark(result?.data?.remark || '');
        } catch {
            setRateByYear(buildFallbackRates(displayYears));
            setRateRemark('');
        } finally {
            setLoading(false);
        }
    }, [displayYears, effectiveYear]);

    const toggleFullscreen = () => setIsFullscreen((prev) => !prev);
    const handleSearch = async () => {
        await fetchRateConfig();
        setHasSearched(true);
    };

    useEffect(() => {
        setHasSearched(false);
    }, [effectiveYear]);

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 09');

        const colors = {
            bgGray: 'FFE5E7EB',
            headerBlue: 'FFBFDBFE',
            headerBlueSub: 'FFF0F9FF',
            headerRed: 'FFFECACA',
            headerYellow: 'FFFEF9C3',
            totalYellow: 'FFFEF9C3',
        };

        const row1 = ['กลุ่ม/หน่วยธุรกิจ'];
        const row2 = [''];
        const dataKeys = ['unit'];
        const colWidths = [34];

        displayYears.forEach((year) => {
            row1.push(String(year));
            row1.push('');
            row2.push('เกษียณ Support');
            row2.push('เกษียณ BU');
            dataKeys.push(`y${year}_sup`);
            dataKeys.push(`y${year}_bu`);
            colWidths.push(15);
            colWidths.push(15);
        });

        row1.push('ตัดกรอบ Support');
        row2.push('');
        dataKeys.push('cut_support');
        colWidths.push(16);

        row1.push('ตัดกรอบ BU');
        row2.push('');
        dataKeys.push('cut_bu');
        colWidths.push(16);

        row1.push('รวมตัดกรอบ');
        row2.push('');
        dataKeys.push('cut_total');
        colWidths.push(16);

        worksheet.addRow(row1);
        worksheet.addRow(row2);

        worksheet.mergeCells(1, 1, 2, 1);
        const firstCell = worksheet.getCell(1, 1);
        firstCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray } };
        firstCell.value = row1[0];

        let colIdx = 2;
        displayYears.forEach(() => {
            worksheet.mergeCells(1, colIdx, 1, colIdx + 1);
            const headerCell = worksheet.getCell(1, colIdx);
            headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBlue } };
            headerCell.alignment = { vertical: 'middle', horizontal: 'center' };

            worksheet.getCell(2, colIdx).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colors.headerBlueSub },
            };
            worksheet.getCell(2, colIdx + 1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colors.headerBlueSub },
            };
            colIdx += 2;
        });

        worksheet.mergeCells(1, colIdx, 2, colIdx);
        worksheet.getCell(1, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerRed } };
        worksheet.getCell(1, colIdx).value = row1[colIdx - 1];
        colIdx += 1;

        worksheet.mergeCells(1, colIdx, 2, colIdx);
        worksheet.getCell(1, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerRed } };
        worksheet.getCell(1, colIdx).value = row1[colIdx - 1];
        colIdx += 1;

        worksheet.mergeCells(1, colIdx, 2, colIdx);
        worksheet.getCell(1, colIdx).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colors.headerYellow },
        };
        worksheet.getCell(1, colIdx).value = row1[colIdx - 1];

        [1, 2].forEach((r) =>
            worksheet.getRow(r).eachCell((cell) => {
                cell.font = { bold: true, name: 'Sarabun' };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            })
        );

        const processData = (rows: Report9DataType[], depth = 0) => {
            rows.forEach((row) => {
                const rowData = dataKeys.map((key, idx) => {
                    if (idx === 0) return '    '.repeat(depth) + String(row.unit || '');
                    return toNumber(row[key]);
                });

                const sheetRow = worksheet.addRow(rowData);
                sheetRow.eachCell((cell, cIdx) => {
                    cell.font = { name: 'Sarabun' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };

                    if (cIdx > 1) {
                        cell.alignment = { horizontal: 'center' };
                        cell.numFmt = '#,##0';
                    }

                    const key = dataKeys[cIdx - 1];
                    const isCutTotalCol = key === 'cut_total';
                    const isParent = String(row.key).startsWith('bg-');
                    const isTotal = row.key === 'total';

                    if (isCutTotalCol) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colors.totalYellow },
                        };
                    }

                    if (isParent) {
                        cell.font = { bold: true, name: 'Sarabun' };
                    }

                    if (isTotal) {
                        cell.font = { bold: true, name: 'Sarabun' };
                        cell.border = {
                            top: { style: 'double' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' },
                        };
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colors.totalYellow },
                        };
                    }
                });

                if (row.children && row.children.length > 0) {
                    processData(row.children, depth + 1);
                }
            });
        };

        processData(tableData);

        worksheet.columns = colWidths.map((width) => ({ width }));
        const buffer = await workbook.xlsx.writeBuffer();
        await saveExcelFile(buffer, `รายงานอัตราพนักงานเกษียณ_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const columns: ColumnsType<Report9DataType> = useMemo(() => {
        const valueCell = (record: Report9DataType) => {
            if (record.key === 'total') {
                return { className: 'bg-blue-100! font-bold border-t-2! border-t-gray-300 text-blue-900' };
            }
            return { className: 'bg-white' };
        };

        const yearCols = displayYears.map((year) => ({
            title: String(year),
            className: 'bg-blue-50!',
            onHeaderCell: () => ({ className: 'bg-blue-200! text-blue-900! font-bold text-center' }),
            children: [
                {
                    title: 'เกษียณ Support',
                    dataIndex: `y${year}_sup`,
                    key: `y${year}_sup`,
                    width: 104,
                    align: 'center' as const,
                    render: (value: unknown) => formatNumber(value),
                    onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-900! font-bold border-b border-gray-300' }),
                    onCell: valueCell,
                },
                {
                    title: 'เกษียณ BU',
                    dataIndex: `y${year}_bu`,
                    key: `y${year}_bu`,
                    width: 104,
                    align: 'center' as const,
                    render: (value: unknown) => formatNumber(value),
                    onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-900! font-bold border-b border-gray-300' }),
                    onCell: valueCell,
                },
            ],
        }));

        return [
            {
                title: 'กลุ่ม/หน่วยธุรกิจ',
                dataIndex: 'unit',
                key: 'unit',
                fixed: 'left',
                width: 260,
                className: 'bg-white z-20',
                onHeaderCell: () => ({ className: 'bg-blue-100! text-blue-900! font-bold' }),
                onCell: (record) =>
                    record.key === 'total'
                        ? { className: 'bg-blue-100! font-bold border-t-2! border-t-gray-300 text-blue-900' }
                        : { className: 'bg-white' },
                render: (text: unknown) => <span className="font-medium text-gray-700">{String(text ?? '')}</span>,
            },
            ...yearCols,
            {
                title: 'ตัดกรอบ Support',
                dataIndex: 'cut_support',
                key: 'cut_support',
                width: 130,
                align: 'center' as const,
                className: 'report9-col-cut-support',
                render: (value: unknown) => formatNumber(value),
                onHeaderCell: () => ({ className: 'bg-red-200! text-red-900! font-bold text-center' }),
                onCell: (record: Report9DataType) =>
                    record.key === 'total'
                        ? { className: 'report9-col-cut-support text-red-900! font-bold border-t-2! border-t-gray-300' }
                        : { className: 'report9-col-cut-support' },
            },
            {
                title: 'ตัดกรอบ BU',
                dataIndex: 'cut_bu',
                key: 'cut_bu',
                width: 130,
                align: 'center' as const,
                className: 'report9-col-cut-bu',
                render: (value: unknown) => formatNumber(value),
                onHeaderCell: () => ({ className: 'bg-red-200! text-red-900! font-bold text-center' }),
                onCell: (record: Report9DataType) =>
                    record.key === 'total'
                        ? { className: 'report9-col-cut-bu text-red-900! font-bold border-t-2! border-t-gray-300' }
                        : { className: 'report9-col-cut-bu' },
            },
            {
                title: 'รวมตัดกรอบ',
                dataIndex: 'cut_total',
                key: 'cut_total',
                width: 130,
                align: 'center' as const,
                className: 'report9-col-cut-total',
                render: (value: unknown) => formatNumber(value),
                onHeaderCell: () => ({
                    className: 'bg-yellow-200! text-yellow-900! font-bold text-center border-b border-gray-300',
                }),
                onCell: (record: Report9DataType) =>
                    record.key === 'total'
                        ? { className: 'report9-col-cut-total bg-yellow-100! text-yellow-900! font-bold border-t-2! border-t-gray-300' }
                        : { className: 'report9-col-cut-total bg-yellow-50 font-bold' },
            },
        ];
    }, [displayYears]);

    const ratioText = displayYears
        .map((year) => `${year}: ${toNumber(rateByYear[year] || 0)}:1`)
        .join(' | ');

    return (
        <Main currentPath="/report" hideChrome={isFullscreen}>
            <div className={`w-full min-w-0 ${isFullscreen ? 'h-screen overflow-hidden bg-white p-4 flex flex-col gap-4' : 'space-y-6'}`}>
                {!isFullscreen && (
                    <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="text-2xl text-blue-100" />
                                <h1 className="text-2xl font-bold m-0 text-white">Report 09</h1>
                                <span className="hidden md:inline-block text-blue-100">|</span>
                                <span className="text-xl font-medium text-blue-50">รายงานอัตราพนักงานเกษียณ</span>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 ${isFullscreen ? 'shrink-0' : 'sticky top-0 z-10'}`}
                >
                    <Form layout="inline" className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Effective Year</label>
                            <Select
                                value={effectiveYear}
                                onChange={setEffectiveYear}
                                options={yearOptions.map((year) => ({ label: year, value: year }))}
                                className="w-24"
                            />
                        </div>
                        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
                            ค้นหา
                        </Button>
                        <div className="text-xs text-slate-500">
                            อัตราส่วน BU/Support ที่ใช้คำนวณ: {hasSearched ? ratioText : '-'}
                        </div>
                    </Form>

                    {hasSearched ? (
                        <div className="flex items-center gap-2">
                            <Button
                                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                                onClick={toggleFullscreen}
                                className={`border-none! shadow-sm! text-white! ${isFullscreen ? 'bg-red-500! hover:bg-red-600!' : 'bg-blue-500! hover:bg-blue-600!'}`}
                            >
                                {isFullscreen ? 'ปิดเต็มจอ' : 'เต็มจอ'}
                            </Button>
                            <Button
                                icon={<FileExcelOutlined />}
                                onClick={handleExportExcel}
                                className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
                            >
                                Excel
                            </Button>
                        </div>
                    ) : null}
                </div>

                {hasSearched ? (
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 ${isFullscreen ? 'mt-0 flex-1 min-h-0' : 'mt-4'}`}>
                        <div className={`${isFullscreen ? 'h-[calc(100vh-200px)] min-h-0 overflow-hidden' : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-7.2rem)] overflow-hidden'}`}>
                            <Table
                                columns={columns}
                                dataSource={tableData}
                                loading={loading}
                                bordered
                                size="small"
                                scroll={{ x: 'max-content', y: isFullscreen ? 'calc(100vh - 250px)' : 600 }}
                                pagination={false}
                                sticky
                                expandable={{
                                    expandedRowKeys: expandedKeys,
                                    onExpandedRowsChange: (keys) => setExpandedKeys(keys as string[]),
                                }}
                                className="report9-table [&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                                rowClassName={(record) => {
                                    const key = String(record.key || '');
                                    if (key === 'total') return 'report9-row-total';
                                    if (key.startsWith('bg-')) return 'report9-row-parent';
                                    return '';
                                }}
                            />
                        </div>
                        {rateRemark ? (
                            <div className="relative z-10 border-t border-slate-200 bg-white px-4 pb-3 pt-2 text-xs text-slate-400">
                                หมายเหตุ: {rateRemark}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <style jsx global>{`
                    .report9-table .ant-table-header.ant-table-sticky-holder,
                    .report9-table .ant-table-sticky-holder {
                        z-index: 20 !important;
                    }
                    .report9-table .ant-table-tbody > tr.report9-row-parent > td:not(.report9-col-cut-support):not(.report9-col-cut-bu):not(.report9-col-cut-total) {
                        background-color: #ffffff !important;
                        color: #1e3a8a !important;
                        font-weight: 700;
                        border-bottom: 2px solid #93c5fd !important;
                    }
                    .report9-table .ant-table-tbody > tr.report9-row-total > td:not(.report9-col-cut-support):not(.report9-col-cut-bu):not(.report9-col-cut-total) {
                        background-color: #dbeafe !important;
                        color: #1e3a8a !important;
                        font-weight: 700;
                    }
                    .report9-table .ant-table-tbody > tr.report9-row-parent > td.report9-col-cut-support,
                    .report9-table .ant-table-tbody > tr.report9-row-parent > td.report9-col-cut-bu,
                    .report9-table .ant-table-tbody > tr.report9-row-parent > td.report9-col-cut-total {
                        border-bottom: 2px solid #93c5fd !important;
                        color: #1e3a8a !important;
                        font-weight: 700;
                    }
                    .report9-table .ant-table-tbody > tr.report9-row-total > td.report9-col-cut-support,
                    .report9-table .ant-table-tbody > tr.report9-row-total > td.report9-col-cut-bu,
                    .report9-table .ant-table-tbody > tr.report9-row-total > td.report9-col-cut-total {
                        border-bottom: 1px solid #d1d5db !important;
                    }
                    .report9-table td.report9-col-cut-support {
                        background-color: #fee2e2 !important;
                        border-bottom: 1px solid #d1d5db !important;
                    }
                    .report9-table td.report9-col-cut-bu {
                        background-color: #fee2e2 !important;
                        border-bottom: 1px solid #d1d5db !important;
                    }
                    .report9-table td.report9-col-cut-total {
                        background-color: #fef9c3 !important;
                        border-bottom: 1px solid #d1d5db !important;
                    }
                `}</style>
            </div>
        </Main>
    );
}
