'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Checkbox, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined, FileExcelOutlined, FullscreenOutlined,
    FullscreenExitOutlined, SettingOutlined
} from '@ant-design/icons';
import { ChevronDown, Search, Check } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

dayjs.locale('th');

// --- 1. Type Definitions ---
interface Report8DataType {
    key: string;
    unit: string;
    children?: Report8DataType[];

    // คนปกติ (People)
    people_21?: number; people_18_20?: number; people_16_17?: number; people_14_15?: number;
    people_11_13?: number; people_9_10?: number; people_4_8?: number; people_total?: number;

    // ค่าใช้จ่ายพนักงาน (Expenses)
    expense_21?: number; expense_18_20?: number; expense_16_17?: number; expense_14_15?: number;
    expense_11_13?: number; expense_9_10?: number; expense_4_8?: number; expense_total?: number;

    // สัญญาใหญ่ (Major Contract)
    major_points?: number;      // จำนวนจุดบริการ
    major_budget?: number;      // งบจ้างเหมาบริการสัญญาใหญ่

    // สัญญาย่อย (Minor Contract)
    minor_points?: number;      // จำนวนจุดบริการ
    minor_budget?: number;      // งบจ้างเหมาบริการสัญญาย่อย

    // ค่าใช้จ่ายรวมทั้งหมด
    total_grand_expense?: number;
}
const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];
// --- 2. Constants & Helpers ---
const levels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '4-8', 'รวม'];
const levelKeys = ['21', '18_20', '16_17', '14_15', '11_13', '9_10', '4_8', 'total'];

// Helper formatting numbers
const formatNumber = (val?: number) => val != null ? val.toLocaleString() : '0';
const formatMoney = (val?: number) => val != null ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

const generateLevelColumns = (
    parentKey: 'people' | 'expense',
    themeClass: string,
    totalRowColorClass: string, // รับสีสำหรับ row total
    isMoney: boolean = false,
    totalHeaderClass: string, // New: Custom header class for Total column
    totalCellClass: string    // New: Custom cell class for Total column (normal rows)
) => {
    return levels.map((level, index) => {
        const dataKey = `${parentKey}_${levelKeys[index]}`;
        const isTotalCol = level === 'รวม';

        return {
            title: level,
            dataIndex: dataKey,
            key: dataKey,
            width: isTotalCol ? 90 : 70,
            align: 'right' as const,
            onHeaderCell: () => ({
                className: isTotalCol
                    ? totalHeaderClass
                    : `${themeClass} border-b border-gray-300`
            }),
            render: (val: number) => isMoney ? formatMoney(val) : formatNumber(val),
            onCell: (record: Report8DataType) => {
                if (record.key === 'total') {
                    // *** EXCEPTION: ถ้าเป็นคอลัมน์ "รวม" ในแถว "รวมทั้งหมด" ให้ใช้สีเหลือง ***
                    if (isTotalCol) {
                        // Use the passed totalRowColorClass which should be the dark version for the bottom row
                        return { className: `${totalRowColorClass} font-bold border-t-2! border-t-gray-300` };
                    }
                    // คอลัมน์อื่นใช้สีตาม Theme กลุ่ม (ส้ม/ฟ้า)
                    return { className: `${totalRowColorClass} font-bold border-t-2! border-t-gray-300` };
                }
                if (isTotalCol) {
                    // สำหรับคอลัมน์ "รวม" ในแถวปกติ
                    return { className: totalCellClass };
                }
                return { className: 'bg-white' };
            }
        };
    });
};

// --- 3. Mock Data ---
const initialData: Report8DataType[] = [
    {
        key: '1',
        unit: '1. สำนักงานใหญ่',
        people_21: 1, people_18_20: 2, people_16_17: 5, people_14_15: 10, people_11_13: 20, people_9_10: 15, people_4_8: 5, people_total: 58,
        expense_21: 500000, expense_18_20: 800000, expense_16_17: 1500000, expense_14_15: 2000000, expense_11_13: 3000000, expense_9_10: 1500000, expense_4_8: 200000, expense_total: 9500000,
        major_points: 10, major_budget: 1200000,
        minor_points: 5, minor_budget: 300000,
        total_grand_expense: 11000000,
        children: [
            {
                key: '1-1', unit: 'ฝ่ายบริหาร',
                people_21: 0, people_18_20: 1, people_16_17: 2, people_14_15: 5, people_11_13: 10, people_9_10: 5, people_4_8: 0, people_total: 23,
                expense_21: 0, expense_18_20: 400000, expense_16_17: 600000, expense_14_15: 1000000, expense_11_13: 1500000, expense_9_10: 500000, expense_4_8: 0, expense_total: 4000000,
                major_points: 2, major_budget: 240000,
                minor_points: 1, minor_budget: 50000,
                total_grand_expense: 4290000,
            },
            {
                key: '1-2', unit: 'ฝ่ายบัญชี',
                people_21: 0, people_18_20: 0, people_16_17: 1, people_14_15: 3, people_11_13: 5, people_9_10: 5, people_4_8: 0, people_total: 14,
                expense_21: 0, expense_18_20: 0, expense_16_17: 300000, expense_14_15: 600000, expense_11_13: 750000, expense_9_10: 500000, expense_4_8: 0, expense_total: 2150000,
                major_points: 0, major_budget: 0,
                minor_points: 2, minor_budget: 100000,
                total_grand_expense: 2250000,
            }
        ]
    },
    {
        key: '2',
        unit: '2. สายงานผลิต',
        people_21: 0, people_18_20: 1, people_16_17: 3, people_14_15: 8, people_11_13: 25, people_9_10: 40, people_4_8: 100, people_total: 177,
        expense_21: 0, expense_18_20: 400000, expense_16_17: 900000, expense_14_15: 1600000, expense_11_13: 3750000, expense_9_10: 4000000, expense_4_8: 3000000, expense_total: 13650000,
        major_points: 50, major_budget: 5000000,
        minor_points: 20, minor_budget: 1000000,
        total_grand_expense: 19650000,
    },
    {
        key: 'total',
        unit: 'รวมทั้งหมด',
        people_21: 1, people_18_20: 3, people_16_17: 8, people_14_15: 18, people_11_13: 45, people_9_10: 55, people_4_8: 105, people_total: 235,
        expense_21: 500000, expense_18_20: 1200000, expense_16_17: 2400000, expense_14_15: 3600000, expense_11_13: 6750000, expense_9_10: 5500000, expense_4_8: 3200000, expense_total: 23150000,
        major_points: 60, major_budget: 6200000,
        minor_points: 25, minor_budget: 1300000,
        total_grand_expense: 30650000,
    }
];

const columnOptions = [
    { label: 'จำนวนพนักงานและผู้บริหาร', value: 'people' },
    { label: 'ค่าใช้จ่ายพนักงานและผู้บริหาร', value: 'expense' },
    { label: 'สัญญาใหญ่', value: 'major' },
    { label: 'สัญญาย่อย', value: 'minor' },
    { label: 'ค่าใช้จ่ายรวมทั้งหมด', value: 'grand_total' },
];
const defaultCheckedList = columnOptions.map((opt) => opt.value);

// --- MultiSelect Component (Reused) ---
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

export default function Report8Page() {
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<string[]>(defaultCheckedList);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetOptions);
    const unitOptions = ['สำนักงานใหญ่', 'สายงานผลิต'];
    const [selectedUnits, setSelectedUnits] = useState<string[]>(unitOptions);

    const onSearch = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 800);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    // --- Excel Export Logic ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 08');

        // Colors
        const colors = {
            headerBlue: 'FFBFDBFE', headerBlueSub: 'FFF0F9FF', totalBlue: 'FFDBEAFE', // Blue-100
            headerOrange: 'FFFED7AA', headerOrangeSub: 'FFFFF7ED', totalOrange: 'FFFFEDD5', // Orange-100
            headerGreen: 'FFBBF7D0', headerGreenSub: 'FFF0FDF4', totalGreen: 'FFDCFCE7', // Green-100
            headerPurple: 'FFD8B4FE', headerPurpleSub: 'FFFAF5FF', totalPurple: 'FFF3E8FF', // Purple-100 (Approx)
            totalYellow: 'FFFEF9C3', bgGray: 'FFE5E7EB',
        };

        const row1 = ['กลุ่ม/หน่วยธุรกิจ'];
        const row2 = [''];
        const dataKeys = ['unit'];
        const colWidths = [40];

        const addGroup = (title: string, keys: string[], subTitles: string[], width: number) => {
            row1.push(title);
            for (let i = 1; i < keys.length; i++) row1.push('');
            keys.forEach((k, idx) => {
                row2.push(subTitles[idx]);
                dataKeys.push(k);
                colWidths.push(width);
            });
        };

        if (checkedList.includes('people')) {
            const keys = levelKeys.map(k => `people_${k}`);
            addGroup('จำนวนพนักงานและผู้บริหาร', keys, levels, 10);
        }
        if (checkedList.includes('expense')) {
            const keys = levelKeys.map(k => `expense_${k}`);
            addGroup('ค่าใช้จ่ายพนักงานและผู้บริหาร', keys, levels, 15);
        }
        if (checkedList.includes('major')) {
            addGroup('สัญญาใหญ่', ['major_points', 'major_budget'], ['จำนวนจุดบริการ', 'งบจ้างเหมาบริการ'], 18);
        }
        if (checkedList.includes('minor')) {
            addGroup('สัญญาย่อย', ['minor_points', 'minor_budget'], ['จำนวนจุดบริการ', 'งบจ้างเหมาบริการ'], 18);
        }
        if (checkedList.includes('grand_total')) {
            row1.push('ค่าใช้จ่ายรวมทั้งหมด');
            row2.push('');
            dataKeys.push('total_grand_expense');
            colWidths.push(20);
        }

        worksheet.addRow(row1);
        worksheet.addRow(row2);

        // Header Styling
        let colIdx = 2;
        const mergeAndStyle = (count: number, colorTop: string, colorSub: string) => {
            worksheet.mergeCells(1, colIdx, 1, colIdx + count - 1);
            worksheet.getCell(1, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorTop } };
            for (let i = 0; i < count; i++) {
                const cell = worksheet.getCell(2, colIdx + i);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorSub } };
                // REMOVED: Keep "รวม" column yellow in header sub-row
                // if (cell.value === 'รวม') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalYellow } };
            }
            colIdx += count;
        };

        if (checkedList.includes('people')) mergeAndStyle(8, colors.headerOrange, colors.headerOrangeSub);
        if (checkedList.includes('expense')) mergeAndStyle(8, colors.headerBlue, colors.headerBlueSub);
        if (checkedList.includes('major')) mergeAndStyle(2, colors.headerGreen, colors.headerGreenSub);
        if (checkedList.includes('minor')) mergeAndStyle(2, colors.headerPurple, colors.headerPurpleSub);
        if (checkedList.includes('grand_total')) {
            worksheet.mergeCells(1, colIdx, 2, colIdx);
            worksheet.getCell(1, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalYellow } };
        }

        worksheet.mergeCells(1, 1, 2, 1);
        worksheet.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray } };

        for (let r = 1; r <= 2; r++) {
            worksheet.getRow(r).eachCell(cell => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.font = { bold: true, name: 'Sarabun' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        }

        // Data Processing
        const processData = (list: Report8DataType[], depth = 0) => {
            list.forEach(item => {
                const rowData = dataKeys.map((key, idx) => {
                    if (idx === 0) return '    '.repeat(depth) + item.unit;
                    return (item as any)[key] ?? 0;
                });
                const row = worksheet.addRow(rowData);

                row.eachCell((cell, cIdx) => {
                    cell.font = { name: 'Sarabun' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    if (cIdx > 1) {
                        cell.alignment = { horizontal: 'right' };
                        const key = dataKeys[cIdx - 1];
                        if (key.includes('expense') || key.includes('budget')) cell.numFmt = '#,##0.00';
                        else cell.numFmt = '#,##0';
                    }

                    // *** Total Row Coloring Logic ***
                    if (item.key === 'total') {
                        cell.font = { bold: true, name: 'Sarabun' };
                        cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        const key = dataKeys[cIdx - 1];
                        if (cIdx === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray } }; // Unit column

                        // Override: Total column in Group to be Group Color
                        else if (key === 'people_total') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalOrange } };
                        else if (key === 'expense_total') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalBlue } };

                        else if (key.startsWith('people_')) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalOrange } };
                        else if (key.startsWith('expense_')) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalBlue } };
                        else if (key.startsWith('major_')) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalGreen } };
                        else if (key.startsWith('minor_')) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalPurple } };
                        else if (key === 'total_grand_expense') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalYellow } };

                    } else {
                        // Normal rows
                        if (depth === 0) cell.font = { bold: true, name: 'Sarabun' };

                        // Color Total columns in normal rows to match UI
                        const key = dataKeys[cIdx - 1];
                        if (key === 'people_total') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } }; // Orange-50
                        else if (key === 'expense_total') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }; // Blue-50
                    }
                });

                if (item.children) processData(item.children, depth + 1);
            });
        };
        processData(initialData);

        worksheet.columns = colWidths.map(w => ({ width: w }));
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Report_08_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Column Definitions ---
    const columns: ColumnsType<Report8DataType> = useMemo(() => {
        const isShow = (k: string) => checkedList.includes(k);
        const getUnitCellProps = (record: Report8DataType) => record.key === 'total' ? { className: 'bg-gray-100! font-bold border-t-2! border-t-gray-300' } : { className: 'bg-white' };

        return [
            {
                title: 'กลุ่ม/หน่วยธุรกิจ', dataIndex: 'unit', key: 'unit', fixed: 'left', width: 250,
                className: 'bg-white z-20',
                onHeaderCell: () => ({ className: 'bg-gray-200! text-gray-900! font-bold text-center' }),
                onCell: getUnitCellProps
            },
            ...(isShow('people') ? [{
                title: 'จำนวนพนักงานและผู้บริหาร',
                className: 'bg-orange-50!',
                onHeaderCell: () => ({ className: 'bg-orange-200! text-orange-900! font-bold text-center' }),
                children: generateLevelColumns(
                    'people',
                    'bg-orange-50! text-orange-900!',
                    'bg-orange-100! text-orange-900!',
                    false,
                    'bg-orange-200! text-orange-900! font-bold border-b border-gray-300', // Total Header
                    'bg-orange-50 font-bold' // Total Cell
                ),
            }] : []),
            ...(isShow('expense') ? [{
                title: 'ค่าใช้จ่ายพนักงานและผู้บริหาร',
                className: 'bg-blue-50!',
                onHeaderCell: () => ({ className: 'bg-blue-200! text-blue-900! font-bold text-center' }),
                children: generateLevelColumns(
                    'expense',
                    'bg-blue-50! text-blue-900!',
                    'bg-blue-100! text-blue-900!',
                    true,
                    'bg-blue-200! text-blue-900! font-bold border-b border-gray-300', // Total Header
                    'bg-blue-50 font-bold' // Total Cell
                ),
            }] : []),
            ...(isShow('major') ? [{
                title: 'สัญญาใหญ่',
                className: 'bg-green-50!',
                onHeaderCell: () => ({ className: 'bg-green-200! text-green-900! font-bold text-center' }),
                children: [
                    {
                        title: 'จำนวนจุดบริการ', dataIndex: 'major_points', key: 'major_points', width: 100, align: 'right' as const, render: formatNumber,
                        onHeaderCell: () => ({ className: 'bg-green-50! text-green-900! font-bold border-b border-gray-300' }),
                        onCell: (record: Report8DataType) => record.key === 'total' ? { className: 'bg-green-100! text-green-900! font-bold border-t-2! border-t-gray-300' } : {}
                    },
                    {
                        title: 'งบจ้างเหมาบริการ', dataIndex: 'major_budget', key: 'major_budget', width: 120, align: 'right' as const, render: formatMoney,
                        onHeaderCell: () => ({ className: 'bg-green-50! text-green-900! font-bold border-b border-gray-300' }),
                        onCell: (record: Report8DataType) => record.key === 'total' ? { className: 'bg-green-100! text-green-900! font-bold border-t-2! border-t-gray-300' } : {}
                    },
                ]
            }] : []),
            ...(isShow('minor') ? [{
                title: 'สัญญาย่อย',
                className: 'bg-purple-50!',
                onHeaderCell: () => ({ className: 'bg-purple-200! text-purple-900! font-bold text-center' }),
                children: [
                    {
                        title: 'จำนวนจุดบริการ', dataIndex: 'minor_points', key: 'minor_points', width: 100, align: 'right' as const, render: formatNumber,
                        onHeaderCell: () => ({ className: 'bg-purple-50! text-purple-900! font-bold border-b border-gray-300' }),
                        onCell: (record: Report8DataType) => record.key === 'total' ? { className: 'bg-purple-100! text-purple-900! font-bold border-t-2! border-t-gray-300' } : {}
                    },
                    {
                        title: 'งบจ้างเหมาบริการ', dataIndex: 'minor_budget', key: 'minor_budget', width: 120, align: 'right' as const, render: formatMoney,
                        onHeaderCell: () => ({ className: 'bg-purple-50! text-purple-900! font-bold border-b border-gray-300' }),
                        onCell: (record: Report8DataType) => record.key === 'total' ? { className: 'bg-purple-100! text-purple-900! font-bold border-t-2! border-t-gray-300' } : {}
                    },
                ]
            }] : []),
            ...(isShow('grand_total') ? [{
                title: 'ค่าใช้จ่ายรวมทั้งหมด',
                dataIndex: 'total_grand_expense',
                key: 'total_grand_expense',
                width: 150,
                align: 'right' as const,
                render: (val: number) => <span className="font-bold text-blue-800">{formatMoney(val)}</span>,
                onHeaderCell: () => ({ className: 'bg-yellow-200! text-yellow-900! font-bold text-center' }),
                className: 'bg-yellow-50!',
                onCell: (record: Report8DataType) => record.key === 'total' ? { className: 'bg-yellow-100! text-yellow-900! font-bold border-t-2! border-t-gray-300' } : {}
            }] : []),
        ];
    }, [checkedList]);

    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">Report 08</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50"> รายงานสรุปค่าใช้จ่ายพนักงานและสัญญาจ้างเหมาบริการ</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
                    <Form layout="inline" className="flex items-center gap-2">
                        <Form.Item label="วันที่" className="m-0">
                            <DatePicker format="DD/MM/YYYY" className="w-36" />
                        </Form.Item>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">แสดงข้อมูล</label>
                            <MultiSelectFilter label="เลือกแสดงข้อมูล" options={datasetOptions} selectedValues={selectedDatasets} onChange={setSelectedDatasets} width="w-40" />
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

                <div className={`bg-white rounded-lg shadow-sm border border-gray-100 mt-4 ${isFullscreen ? 'fixed inset-0 z-50 p-4 overflow-auto' : ''}`}>
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