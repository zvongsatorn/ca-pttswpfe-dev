'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Form, Checkbox, Popover, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined, FileExcelOutlined, FullscreenOutlined,
    FullscreenExitOutlined, SettingOutlined, ExportOutlined,
} from '@ant-design/icons';
import { ChevronDown, Search, Check, } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

dayjs.locale('th');

// --- 1. Type Definitions ---
interface Report9DataType {
    key: string;
    unit: string; // กลุ่ม/หน่วยธุรกิจ

    // Dynamic Year Data
    [key: string]: any;

    // สรุปตัดกรอบ
    cut_support?: number;
    cut_bu?: number;
    cut_total?: number;

    children?: Report9DataType[];
}

// --- 2. Constants & Helpers ---
const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];
const yearOptions = Array.from({ length: 12 }, (_, i) => 2569 + i); // 2569 - 2580

const formatNumber = (val?: number) => (val !== undefined && val !== null) ? val.toLocaleString() : '0';

// --- 3. Mock Data ---
const initialData: Report9DataType[] = [
    {
        key: '1', unit: '1. สำนักงานใหญ่',
        y2569_sup: 1, y2569_bu: 0,
        y2570_sup: 0, y2570_bu: 1,
        y2571_sup: 1, y2571_bu: 0,
        y2572_sup: 0, y2572_bu: 0,
        y2573_sup: 0, y2573_bu: 0,
        cut_support: 2, cut_bu: 1, cut_total: 3,
        children: [
            {
                key: '1-1', unit: 'รพญ.1',
                y2569_sup: 1, y2569_bu: 0, y2570_sup: 0, y2570_bu: 0, y2571_sup: 0, y2571_bu: 0, y2572_sup: 0, y2572_bu: 0, y2573_sup: 0, y2573_bu: 0,
                cut_support: 1, cut_bu: 0, cut_total: 1
            },
            {
                key: '1-2', unit: 'รพญ.2',
                y2569_sup: 0, y2569_bu: 0, y2570_sup: 0, y2570_bu: 0, y2571_sup: 0, y2571_bu: 0, y2572_sup: 0, y2572_bu: 0, y2573_sup: 0, y2573_bu: 0,
                cut_support: 1, cut_bu: 0, cut_total: 1
            }
        ]
    },
    {
        key: '2', unit: '2. กลุ่มธุรกิจปิโตรเลี่ยมขั้นต้นฯ',
        y2569_sup: 2, y2569_bu: 2,
        y2570_sup: 1, y2570_bu: 0,
        y2571_sup: 0, y2571_bu: 0,
        y2572_sup: 0, y2572_bu: 0,
        y2573_sup: 0, y2573_bu: 0,
        cut_support: 1, cut_bu: 2, cut_total: 3,
        children: [
            {
                key: '2-1', unit: '› รศล.',
                y2569_sup: 1, y2569_bu: 2, y2570_sup: 0, y2570_bu: 0, y2571_sup: 0, y2571_bu: 0, y2572_sup: 0, y2572_bu: 0, y2573_sup: 0, y2573_bu: 0,
                cut_support: 1, cut_bu: 0, cut_total: 1
            },
            {
                key: '2-2', unit: '› รธก.',
                y2569_sup: 1, y2569_bu: 1, y2570_sup: 0, y2570_bu: 0, y2571_sup: 0, y2571_bu: 0, y2572_sup: 0, y2572_bu: 0, y2573_sup: 0, y2573_bu: 0,
                cut_support: 1, cut_bu: 0, cut_total: 1
            }
        ]
    },
    {
        key: 'total', unit: 'รวมทั้งสิ้น',
        y2569_sup: 1, y2569_bu: 2,
        y2570_sup: 1, y2570_bu: 1,
        y2571_sup: 1, y2571_bu: 0,
        y2572_sup: 0, y2572_bu: 0,
        y2573_sup: 0, y2573_bu: 0,
        cut_support: 3, cut_bu: 3, cut_total: 6
    }
];

const columnOptions = [
    { label: 'สรุปตัดกรอบ', value: 'summary' },
];
const defaultCheckedList = columnOptions.map((opt) => opt.value);

// --- MultiSelect Component ---
interface MultiSelectFilterProps {
    label: string; options: string[]; selectedValues: string[];
    onChange: (values: string[]) => void; width?: string;
}
function MultiSelectFilter({ label, options, selectedValues, onChange, width = "w-64" }: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const toggleOption = (option: string) => {
        if (selectedValues.includes(option)) onChange(selectedValues.filter(v => v !== option));
        else onChange([...selectedValues, option]);
    };
    const handleSelectAll = () => selectedValues.length === options.length ? onChange([]) : onChange(options);

    return (
        <div className="relative" ref={containerRef}>
            <div className={`${width} min-h-[32px] px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
                <div className="truncate text-gray-700">
                    {selectedValues.length === 0 ? label : `${selectedValues.length} รายการ`}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-[60] p-2 max-h-60 overflow-y-auto">
                    <div className="flex items-center px-2 py-1 hover:bg-gray-50 rounded cursor-pointer mb-1 border-b" onClick={handleSelectAll}>
                        <span className="text-blue-600 font-semibold">เลือกทั้งหมด</span>
                    </div>
                    {options.map(opt => (
                        <div key={opt} className="flex items-center px-2 py-1 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleOption(opt)}>
                            <div className={`w-4 h-4 border mr-2 flex items-center justify-center ${selectedValues.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {selectedValues.includes(opt) && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm">{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Report9Page() {
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<string[]>(defaultCheckedList);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Filters State
    const [startYear, setStartYear] = useState<number>(2569);
    const [endYear, setEndYear] = useState<number>(2573);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(['ปกติ']);

    const displayYears = useMemo(() => {
        const years: number[] = [];
        if (startYear && endYear && startYear <= endYear) {
            for (let i = startYear; i <= endYear; i++) {
                years.push(i);
            }
        }
        return years;
    }, [startYear, endYear]);

    const onSearch = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 800);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    // --- Excel Export Logic ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 09');

        // Colors
        const colors = {
            bgGray: 'FFE5E7EB',
            headerBlue: 'FFBFDBFE', headerBlueSub: 'FFF0F9FF',
            headerRed: 'FFFECACA', headerRedSub: 'FFFEF2F2',
            headerYellow: 'FFFEF9C3', // สำหรับ Header "รวมตัดกรอบ"
            totalYellow: 'FFFEF9C3',  // สำหรับ Cell "รวมตัดกรอบ" และ Row Total
        };

        // Header Setup
        const row1 = ['กลุ่ม/หน่วยธุรกิจ'];
        const row2 = [''];
        const dataKeys = ['unit'];
        const colWidths = [40];

        // Dynamic Year Columns
        displayYears.forEach(year => {
            row1.push(String(year)); row1.push(''); // Merge placeholder
            row2.push('เกษียณ Support'); row2.push('เกษียณ BU');
            dataKeys.push(`y${year}_sup`);
            dataKeys.push(`y${year}_bu`);
            colWidths.push(15); colWidths.push(15);
        });

        // Summary Columns
        if (checkedList.includes('summary')) {
            row1.push('ตัดกรอบ Support'); row2.push('');
            dataKeys.push('cut_support'); colWidths.push(18);

            row1.push('ตัดกรอบ BU'); row2.push('');
            dataKeys.push('cut_bu'); colWidths.push(18);

            row1.push('รวมตัดกรอบ'); row2.push('');
            dataKeys.push('cut_total'); colWidths.push(18);
        }

        worksheet.addRow(row1);
        worksheet.addRow(row2);

        // --- Styling ---
        // Column 1: Group/Unit
        worksheet.mergeCells(1, 1, 2, 1);
        const cell = worksheet.getCell(1, 1);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray } };
        cell.value = row1[0];

        let colIdx = 2;
        // Years Styling (Merge Horizontal)
        displayYears.forEach(year => {
            // Header Row 1 (Year)
            worksheet.mergeCells(1, colIdx, 1, colIdx + 1);
            const headerCell = worksheet.getCell(1, colIdx);
            headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBlue } };
            headerCell.alignment = { vertical: 'middle', horizontal: 'center' };

            // Header Row 2 (Sub)
            worksheet.getCell(2, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBlueSub } };
            worksheet.getCell(2, colIdx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBlueSub } };

            colIdx += 2;
        });

        // Summary Styling (Merge Vertical)
        if (checkedList.includes('summary')) {
            // ตัดกรอบ Support (Red)
            worksheet.mergeCells(1, colIdx, 2, colIdx);
            worksheet.getCell(1, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerRed } };
            worksheet.getCell(1, colIdx).value = row1[colIdx - 1];
            colIdx++;

            // ตัดกรอบ BU (Red)
            worksheet.mergeCells(1, colIdx, 2, colIdx);
            worksheet.getCell(1, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerRed } };
            worksheet.getCell(1, colIdx).value = row1[colIdx - 1];
            colIdx++;

            // รวมตัดกรอบ (Yellow) - ตามที่ขอ
            worksheet.mergeCells(1, colIdx, 2, colIdx);
            worksheet.getCell(1, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerYellow } };
            worksheet.getCell(1, colIdx).value = row1[colIdx - 1];
            colIdx++;
        }

        // Common Header Styles
        [1, 2].forEach(r => worksheet.getRow(r).eachCell(cell => {
            cell.font = { bold: true, name: 'Sarabun' };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }));

        // Data Processing
        const processData = (list: Report9DataType[], depth = 0) => {
            list.forEach(item => {
                const rowData = dataKeys.map((key, idx) => {
                    if (idx === 0) return '    '.repeat(depth) + item.unit;
                    return (item as any)[key] ?? 0;
                });
                const row = worksheet.addRow(rowData);

                row.eachCell((cell, cIdx) => {
                    cell.font = { name: 'Sarabun' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    if (cIdx > 1) { // Numeric columns
                        cell.alignment = { horizontal: 'center' };
                        cell.numFmt = '#,##0';
                    }

                    // Identify if this column is "cut_total"
                    const key = dataKeys[cIdx - 1];
                    const isCutTotalCol = key === 'cut_total';

                    // ** Yellow Color Logic **
                    // 1. If it's the "cut_total" column, always Yellow.
                    if (isCutTotalCol) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalYellow } };
                        cell.font = { bold: true, name: 'Sarabun' };
                    }

                    // 2. If it's the Total Row
                    if (item.key === 'total') {
                        cell.font = { bold: true, name: 'Sarabun' };
                        cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalYellow } };
                    } else if (['1', '2'].includes(item.key)) {
                        // New logic for rows 1 and 2
                        if (!isCutTotalCol) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
                        }
                        cell.font = { bold: true, name: 'Sarabun' };
                    } else if (depth === 0) {
                        if (cIdx === 1) cell.font = { bold: true, name: 'Sarabun' };
                    }
                });

                if (item.children) processData(item.children, depth + 1);
            });
        };
        processData(initialData);

        worksheet.columns = colWidths.map(w => ({ width: w }));
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Report_09_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Column Definition ---
    const columns: ColumnsType<Report9DataType> = useMemo(() => {
        const isShow = (k: string) => checkedList.includes(k);

        // 1. Fixed Group/Unit Column
        const fixedCols: ColumnsType<Report9DataType> = [{
            title: 'กลุ่ม/หน่วยธุรกิจ', dataIndex: 'unit', key: 'unit', fixed: 'left', width: 250,
            className: 'bg-white z-20',
            onHeaderCell: () => ({ className: 'bg-gray-200! text-gray-900! font-bold text-center' }),
            onCell: (record) => {
                if (record.key === 'total') return { className: 'bg-gray-100! font-bold border-t-2! border-t-gray-300' };
                if (['1', '2'].includes(record.key)) return { className: 'bg-blue-100! font-bold' };
                return { className: 'bg-white' };
            }
        }];

        const valueCell = (record: Report9DataType) => {
            if (record.key === 'total') {
                return { className: 'bg-yellow-50! font-bold border-t-2! border-t-gray-300' };
            }
            if (['1', '2'].includes(record.key)) {
                return { className: 'bg-blue-100! font-bold' };
            }
            return { className: 'bg-white' };
        };

        // 2. Dynamic Year Columns
        const yearCols = displayYears.map(year => {
            return {
                title: String(year),
                className: 'bg-blue-50!',
                onHeaderCell: () => ({ className: 'bg-blue-200! text-blue-900! font-bold text-center' }),
                children: [
                    {
                        title: 'เกษียณ Support', dataIndex: `y${year}_sup`, key: `y${year}_sup`, width: 100, align: 'center' as const, render: formatNumber,
                        onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-900! font-bold border-b border-gray-300' }),
                        onCell: valueCell
                    },
                    {
                        title: 'เกษียณ BU', dataIndex: `y${year}_bu`, key: `y${year}_bu`, width: 100, align: 'center' as const, render: formatNumber,
                        onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-900! font-bold border-b border-gray-300' }),
                        onCell: valueCell
                    }
                ]
            };
        });

        // 3. Summary Columns
        const summaryCols = isShow('summary') ? [
            {
                title: 'ตัดกรอบ Support', dataIndex: 'cut_support', key: 'cut_support', width: 120, align: 'center' as const, render: formatNumber,
                onHeaderCell: () => ({ className: 'bg-red-200! text-red-900! font-bold text-center' }),
                onCell: valueCell
            },
            {
                title: 'ตัดกรอบ BU', dataIndex: 'cut_bu', key: 'cut_bu', width: 120, align: 'center' as const, render: formatNumber,
                onHeaderCell: () => ({ className: 'bg-red-200! text-red-900! font-bold text-center' }),
                onCell: valueCell
            },
            // *** สีเหลืองตามคำขอ ***
            {
                title: 'รวมตัดกรอบ', dataIndex: 'cut_total', key: 'cut_total', width: 120, align: 'center' as const, render: formatNumber,
                onHeaderCell: () => ({ className: 'bg-yellow-200! text-yellow-900! font-bold text-center border-b border-gray-300' }),
                onCell: (record: Report9DataType) => {
                    if (record.key === 'total') {
                        return { className: 'bg-yellow-100! text-yellow-900! font-bold border-t-2! border-t-gray-300' };
                    }
                    return { className: 'bg-yellow-50 font-bold' }; // สีเหลืองอ่อนสำหรับ Data ปกติ
                }
            },
        ] : [];

        return [...fixedCols, ...yearCols, ...summaryCols];
    }, [checkedList, displayYears]);

    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                {/* Header */}
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">Report 09</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">รายงานอัตราพนักงานเกษียณ</span>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
                    <Form layout="inline" className="flex items-center gap-4 flex-wrap">

                        {/* Period Filter */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Effective Year</label>
                            <Select
                                value={startYear}
                                onChange={setStartYear}
                                options={yearOptions.map(y => ({ label: y, value: y }))}
                                className="w-24"
                            />

                        </div>

                        {/* Dataset Filter */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">แสดงข้อมูล</label>
                            <MultiSelectFilter label="เลือกข้อมูล" options={datasetOptions} selectedValues={selectedDatasets} onChange={setSelectedDatasets} width="w-48" />
                        </div>

                        <Button type="primary" icon={<SearchOutlined />} onClick={onSearch} loading={loading}>ค้นหา</Button>
                    </Form>

                    <div className="flex items-center gap-2">
                        <Button
                            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={toggleFullscreen}
                            className={`border-none! shadow-sm! text-white! ${isFullscreen ? 'bg-red-500! hover:bg-red-600!' : 'bg-blue-500! hover:bg-blue-600!'}`}
                        >
                            {isFullscreen ? 'ปิดเต็มจอ' : 'เต็มจอ'}
                        </Button>
                        <Button icon={<ExportOutlined />} className="bg-orange-500! text-white! border-none! shadow-sm! hover:bg-orange-600!">Export Detail</Button>
                        <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!">Excel</Button>
                        <Popover
                            placement="bottomLeft"
                            trigger="click"
                            content={
                                <div className="w-64">
                                    <div className="mb-2 font-bold text-gray-700 border-b pb-1">แสดงข้อมูล</div>
                                    <Checkbox.Group options={columnOptions} value={checkedList} onChange={setCheckedList} className="flex flex-col gap-2" />
                                </div>
                            }
                        >
                            <Button icon={<SettingOutlined />}>({checkedList.length})</Button>
                        </Popover>
                    </div>
                </div>

                {/* Table */}
                <div className={`bg-white rounded-lg shadow-sm border border-gray-100 mt-4 ${isFullscreen ? 'fixed inset-0 z-50 p-4 overflow-auto' : ''}`}>
                    <div className="flex justify-start px-4 pt-4">
                        <span className="text-gray-500 text-sm">
                            ข้อมูล ณ วันที่ : {dayjs().add(543, 'year').format('D MMMM YYYY')}
                        </span>
                    </div>
                    <div className={`${isFullscreen ? '' : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-7.2rem)] overflow-hidden'}`}>
                        <Table
                            columns={columns}
                            dataSource={initialData}
                            loading={loading}
                            bordered
                            size="small"
                            scroll={{ x: 'max-content', y: isFullscreen ? 'calc(100vh - 100px)' : 600 }}
                            pagination={false}
                            sticky
                            expandable={{ defaultExpandAllRows: true }}
                            className="[&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                            rowClassName={(record) => record.key === 'total' ? 'font-bold' : ''}
                        />
                    </div>
                </div>
            </div>
        </Main>
    );
}