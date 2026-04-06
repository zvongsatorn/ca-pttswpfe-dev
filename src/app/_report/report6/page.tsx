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
interface Report6DataType {
    key: string;
    unit_short: string; unit_code: string; unit_name: string;
    line_of_work: string; level: string; business_unit: string;

    // Dynamic keys: {prefix}_{level}_{metric}
    [key: string]: any;

    remark?: string; log?: string;
    children?: Report6DataType[]; // For Hierarchy
}

const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];
// --- 2. Constants & Helpers ---
const levelKeys = ['21', '18_20', '16_17', '14_15', '11_13', '9_10', 'under_8', 'total'];
const levelLabels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '8 ลงมา', 'รวม'];
const metricKeys = ['frame', 'people', 'recruit', 'vacancy'];
const metricLabels = ['กรอบ', 'คน', 'สรรหา', 'ว่าง'];

const renderNumber = (value: any) => {
    if (value === undefined || value === null || value === '') return 0;
    return value;
};

// --- generateColumns ---
const generateColumns = (
    prefix: string,
    themeColor: string,
    summaryColorClass: string,
    totalLabel: string,
    totalHeaderClass: string,
    totalSubHeaderClass: string
) => {
    const cols: any[] = [];

    const getCellProps = (record: Report6DataType) => {
        if (record.key === 'TOTAL_SUMMARY') {
            return { className: `${summaryColorClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` };
        }
        return { className: 'bg-white' };
    };

    levelKeys.forEach((levelKey, levelIndex) => {
        const isTotal = levelKey === 'total';
        let headerClassName = '';
        if (isTotal) headerClassName = `${totalSubHeaderClass} font-bold`;

        const subCols = metricKeys.map((metricKey, metricIndex) => ({
            title: metricLabels[metricIndex],
            dataIndex: `${prefix}_${levelKey}_${metricKey}`,
            key: `${prefix}_${levelKey}_${metricKey}`,
            width: 50,
            align: 'center' as const,
            className: headerClassName,
            onHeaderCell: () => {
                let className = `${themeColor} text-gray-700`;
                if (isTotal) {
                    className = `${totalSubHeaderClass} font-bold`;
                } else if (metricKey === 'recruit') {
                    className = 'bg-green-200! text-green-900! font-bold';
                } else if (metricKey === 'vacancy') {
                    className = 'bg-red-200! text-red-900! font-bold';
                }
                return { className };
            },
            render: renderNumber,
            onCell: getCellProps,
        }));

        cols.push({
            title: isTotal ? totalLabel : levelLabels[levelIndex],
            className: isTotal ? `${totalHeaderClass} text-center` : `${themeColor} text-center`,
            children: subCols
        });
    });

    return cols;
};

// Mock Data with Hierarchy
const mockData: Report6DataType[] = [
    {
        key: '1',
        unit_short: 'ปตท.', unit_code: '80000000', unit_name: 'บริษัท ปตท. จำกัด (มหาชน)',
        line_of_work: '-', level: '-', business_unit: 'PTT',
        normal_total_frame: 100, normal_total_people: 90, normal_total_recruit: 5, normal_total_vacancy: 5,
        sec_total_frame: 20, sec_total_people: 18, sec_total_recruit: 1, sec_total_vacancy: 1,
        children: [
            {
                key: '1-1',
                unit_short: 'สายงาน ก.', unit_code: '80000100', unit_name: 'สายงาน ก.',
                line_of_work: 'สายงาน ก.', level: 'รอง กจญ.', business_unit: 'BU1',
                normal_21_frame: 1, normal_21_people: 1,
                normal_18_20_frame: 2, normal_18_20_people: 2,
                normal_total_frame: 50, normal_total_people: 45, normal_total_recruit: 3, normal_total_vacancy: 2,
                children: [
                    {
                        key: '1-1-1',
                        unit_short: 'ฝ่าย A', unit_code: '80000101', unit_name: 'ฝ่าย A',
                        line_of_work: 'สายงาน ก.', level: 'ผจก.ฝ่าย', business_unit: 'BU1',
                        normal_16_17_frame: 5, normal_16_17_people: 4, normal_16_17_recruit: 1, normal_16_17_vacancy: 0,
                        normal_total_frame: 5, normal_total_people: 4, normal_total_recruit: 1, normal_total_vacancy: 0
                    },
                    {
                        key: '1-1-2',
                        unit_short: 'ฝ่าย B', unit_code: '80000102', unit_name: 'ฝ่าย B',
                        line_of_work: 'สายงาน ก.', level: 'ผจก.ฝ่าย', business_unit: 'BU1',
                        normal_14_15_frame: 5, normal_14_15_people: 4, normal_14_15_recruit: 0, normal_14_15_vacancy: 1,
                        normal_total_frame: 5, normal_total_people: 4, normal_total_recruit: 0, normal_total_vacancy: 1,
                        remark: 'รอสรรหา'
                    }
                ]
            },
            {
                key: '1-2',
                unit_short: 'สายงาน ข. (Sec Pool)', unit_code: '80000200', unit_name: 'สายงาน ข. (Secondment Pool)',
                line_of_work: 'สายงาน ข.', level: 'รอง กจญ.', business_unit: 'BU2',
                sec_total_frame: 10, sec_total_people: 8, sec_total_recruit: 1, sec_total_vacancy: 1,
                children: [
                    {
                        key: '1-2-1',
                        unit_short: 'โครงการพิเศษ', unit_code: '80000201', unit_name: 'โครงการพิเศษ',
                        line_of_work: 'สายงาน ข.', level: 'ผจก.ฝ่าย', business_unit: 'BU2',
                        sec_16_17_frame: 2, sec_16_17_people: 2,
                        sec_11_13_frame: 3, sec_11_13_people: 2, sec_11_13_recruit: 1, sec_11_13_vacancy: 0,
                        sec_total_frame: 5, sec_total_people: 4, sec_total_recruit: 1, sec_total_vacancy: 0
                    }
                ]
            }
        ]
    }
];



const businessUnitOptions = ['PTT', 'BU1', 'BU2'];
const lineOfWorkOptions = ['สายงาน ก.', 'สายงาน ข.'];
const orgUnitOptions = ['บริษัท ปตท. จำกัด (มหาชน)', 'สายงาน ก.', 'สายงาน ข.'];

const columnOptions = [
    { label: 'ชื่อย่อ', value: 'unit_short' },
    { label: 'รหัส', value: 'unit_code' },
    { label: 'ชื่อเต็มหน่วยงาน', value: 'unit_name' },
    { label: 'สายงาน', value: 'line_of_work' },
    { label: 'ระดับ', value: 'level' },
    { label: 'หน่วยธุรกิจ', value: 'business_unit' },
    { label: 'กรอบปกติ', value: 'normal' },
    { label: 'Secondment Pool', value: 'sec' },
    { label: 'รวมทั้งหมด', value: 'grand_total' },
    { label: 'หมายเหตุ', value: 'remark' },
    { label: 'Log', value: 'log' },
];

const defaultCheckedList = [
    'unit_short', 'unit_name',
    'normal', 'sec', 'grand_total', 'remark'
];

// --- MultiSelectFilter Component ---
interface MultiSelectFilterProps {
    label: string; options: string[]; selectedValues: string[];
    onChange: (values: string[]) => void; width?: string;
}
function MultiSelectFilter({ label, options, selectedValues, onChange, width = "w-64" }: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
    const toggleOption = (option: string) => {
        if (selectedValues.includes(option)) onChange(selectedValues.filter(v => v !== option));
        else onChange([...selectedValues, option]);
    };
    const handleSelectAll = () => {
        if (selectedValues.length === options.length) onChange([]);
        else onChange(options);
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className={`${width} min-h-[32px] px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
                <div className="truncate flex gap-1 flex-wrap">
                    {selectedValues.length === 0 ? <span className="text-gray-400">{label}...</span> :
                        selectedValues.length === options.length ? <span className="text-blue-600 font-medium">เลือกทั้งหมด ({options.length})</span> :
                            <span className="text-gray-800">{selectedValues.length} รายการ</span>}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[60] overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input type="text" placeholder="ค้นหา..." className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length > 0 && (
                            <div className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50" onClick={handleSelectAll}>
                                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedValues.length === options.length && options.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                    {selectedValues.length === options.length && options.length > 0 && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm font-semibold text-blue-700">เลือกทั้งหมด</span>
                            </div>
                        )}
                        {filteredOptions.map(option => (
                            <div key={option} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleOption(option)}>
                                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors ${selectedValues.includes(option) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                    {selectedValues.includes(option) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700 truncate" title={option}>{option}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Report6Page() {
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<any[]>(defaultCheckedList);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>(businessUnitOptions);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>(orgUnitOptions);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>(lineOfWorkOptions);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetOptions);
    const onSearch = (values: any) => {
        setLoading(true);
        setTimeout(() => setLoading(false), 800);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    // Calculate Grand Total Helper
    const withGrandTotal = (data: Report6DataType[]): Report6DataType[] => {
        return data.map(item => {
            const newItem = { ...item };

            // Calculate totals for this item
            const normalFrame = newItem.normal_total_frame || 0;
            const secFrame = newItem.sec_total_frame || 0;
            newItem.grand_total_frame = normalFrame + secFrame;

            const normalPeople = newItem.normal_total_people || 0;
            const secPeople = newItem.sec_total_people || 0;
            newItem.grand_total_people = normalPeople + secPeople;

            const normalRecruit = newItem.normal_total_recruit || 0;
            const secRecruit = newItem.sec_total_recruit || 0;
            newItem.grand_total_recruit = normalRecruit + secRecruit;

            const normalVacancy = newItem.normal_total_vacancy || 0;
            const secVacancy = newItem.sec_total_vacancy || 0;
            newItem.grand_total_vacancy = normalVacancy + secVacancy;

            if (newItem.children) {
                newItem.children = withGrandTotal(newItem.children);
            }
            return newItem;
        });
    };

    const processedMockData = useMemo(() => withGrandTotal(mockData), []);

    // Recursive filter function for hierarchy
    const filterData = (data: Report6DataType[]): Report6DataType[] => {
        return data.reduce((acc: Report6DataType[], item) => {
            const matches =
                (selectedBusinessUnits.length === 0 || selectedBusinessUnits.includes(item.business_unit)) &&
                (selectedLinesOfWork.length === 0 || selectedLinesOfWork.includes(item.line_of_work)) &&
                (selectedOrgUnits.length === 0 || selectedOrgUnits.includes(item.unit_name));

            if (item.children) {
                const filteredChildren = filterData(item.children);
                if (filteredChildren.length > 0) {
                    acc.push({ ...item, children: filteredChildren });
                } else if (matches) {
                    acc.push({ ...item, children: [] });
                }
            } else if (matches) {
                acc.push(item);
            }
            return acc;
        }, []);
    };

    const filteredData = useMemo(() => {
        return filterData(processedMockData);
    }, [selectedBusinessUnits, selectedLinesOfWork, selectedOrgUnits, processedMockData]);

    // ... (tableDataWithSummary logic remains mostly the same, but needs to ensure grand_total is summed if not already)
    // Actually, since we calculate grand_total at item level, the summary logic (summing leaf nodes) will automatically handle grand_total keys if we include them in the loop.
    // The current summary logic iterates Object.keys(item), so it should pick up grand_total_* keys.

    const tableDataWithSummary = useMemo(() => {
        // Calculate Total Summary (Flatten first)
        const flatten = (data: Report6DataType[]): Report6DataType[] => {
            let res: Report6DataType[] = [];
            data.forEach(item => {
                res.push(item);
                if (item.children) res = res.concat(flatten(item.children));
            });
            return res;
        };

        const flatData = flatten(filteredData);
        const totalRow: any = {
            key: 'TOTAL_SUMMARY',
            unit_short: '', unit_code: '', unit_name: 'รวมทั้งสิ้น (Grand Total)',
            line_of_work: '', level: '', business_unit: '', remark: '', log: ''
        };

        flatData.forEach(item => {
            if (!item.children || item.children.length === 0) {
                Object.keys(item).forEach(key => {
                    const value = (item as any)[key];
                    if (typeof value === 'number') totalRow[key] = (totalRow[key] || 0) + value;
                });
            }
        });

        return [...filteredData, totalRow];
    }, [filteredData]);

    // --- Excel Export Logic ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 06');
        const colors = {
            blueHeader: 'FFBFDBFE', blueSub: 'FFF0F9FF',
            orangeHeader: 'FFFED7AA', orangeSub: 'FFFFF7ED',
            purpleHeader: 'FFE9D5FF', purpleSub: 'FFF5F3FF', // Purple 200/50
            grayHeader: 'FFE5E7EB', yellowTotal: 'FFFEF9C3',
            // Summary Colors
            graySummary: 'FFF3F4F6',
            blueSummary: 'FFDBEAFE',
            orangeSummary: 'FFFFEDD5',
            purpleSummary: 'FFF3E8FF', // Purple 100
        };

        let headersRow1: string[] = [];
        let headersRow2: string[] = [];
        let headersRow3: string[] = [];
        let dataKeys: string[] = [];

        const addGroup = (title: string, prefix: string, color: string, totalLabel: string) => {
            const totalSpan = levelKeys.length * metricKeys.length;
            headersRow1.push(title);
            for (let i = 1; i < totalSpan; i++) headersRow1.push('');

            levelKeys.forEach(level => {
                const label = level === 'total' ? totalLabel : levelLabels[levelKeys.indexOf(level)];
                headersRow2.push(label);
                for (let i = 1; i < metricKeys.length; i++) headersRow2.push('');

                metricKeys.forEach(metric => {
                    const metricLabel = metricLabels[metricKeys.indexOf(metric)];
                    headersRow3.push(metricLabel);
                    dataKeys.push(`${prefix}_${level}_${metric}`);
                });
            });
        };

        // Special addGroup for Grand Total (only 1 level: Total)
        const addGrandTotalGroup = () => {
            const totalSpan = metricKeys.length;
            headersRow1.push('รวมทั้งหมด');
            for (let i = 1; i < totalSpan; i++) headersRow1.push('');

            // Row 2 is empty/merged for Grand Total? Or just "รวม"?
            // Let's make Row 2 "รวม" to match structure, or merge it.
            // The user request says "Grand Total column group".
            // Let's assume it follows the same metric structure but only for "Total" level.
            // Or does it need all levels? "กรอบ คน สรรหา ว่าง เป็นยอดรวมจาก 2 กลุ่ม"
            // Usually Grand Total is just the sum, so likely just one set of metrics.
            // Let's assume it's just the metrics directly under "รวมทั้งหมด" or under a "รวม" sub-header.
            // To align with other columns (3 rows), let's put "รวม" in Row 2.

            headersRow2.push('รวม');
            for (let i = 1; i < metricKeys.length; i++) headersRow2.push('');

            metricKeys.forEach(metric => {
                const metricLabel = metricLabels[metricKeys.indexOf(metric)];
                headersRow3.push(metricLabel);
                dataKeys.push(`grand_total_${metric}`);
            });
        };

        const basicCols = [
            { t: 'ชื่อย่อ', k: 'unit_short' }, { t: 'รหัส', k: 'unit_code' }, { t: 'ชื่อเต็มหน่วยงาน', k: 'unit_name' },
            { t: 'สายงาน', k: 'line_of_work' }, { t: 'ระดับ', k: 'level' }, { t: 'หน่วยธุรกิจ', k: 'business_unit' }
        ];
        let basicInfoCount = 0;
        basicCols.forEach(c => {
            if (checkedList.includes(c.k)) {
                headersRow1.push(c.t); headersRow2.push(''); headersRow3.push('');
                dataKeys.push(c.k); basicInfoCount++;
            }
        });

        if (checkedList.includes('normal')) addGroup('กรอบปกติ', 'normal', colors.blueHeader, 'รวมปกติ');
        if (checkedList.includes('sec')) addGroup('Secondment Pool', 'sec', colors.orangeHeader, 'รวม secpool');
        if (checkedList.includes('grand_total')) addGrandTotalGroup();

        if (checkedList.includes('remark')) { headersRow1.push('หมายเหตุ'); headersRow2.push(''); headersRow3.push(''); dataKeys.push('remark'); }
        if (checkedList.includes('log')) { headersRow1.push('Log'); headersRow2.push(''); headersRow3.push(''); dataKeys.push('log'); }

        const r1 = worksheet.addRow(headersRow1);
        const r2 = worksheet.addRow(headersRow2);
        const r3 = worksheet.addRow(headersRow3);

        let colIndex = 1;
        for (let i = 0; i < basicInfoCount; i++) {
            worksheet.mergeCells(1, colIndex, 3, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.grayHeader } };
            colIndex++;
        }

        const styleGroup = (headerColor: string, subColor: string, totalColor: string, totalSubColor: string) => {
            const totalSpan = levelKeys.length * metricKeys.length;
            worksheet.mergeCells(1, colIndex, 1, colIndex + totalSpan - 1);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
            worksheet.getCell(1, colIndex).alignment = { horizontal: 'center', vertical: 'middle' };

            let levelColIndex = colIndex;
            levelKeys.forEach(level => {
                worksheet.mergeCells(2, levelColIndex, 2, levelColIndex + metricKeys.length - 1);
                const cell = worksheet.getCell(2, levelColIndex);
                cell.alignment = { horizontal: 'center', vertical: 'middle' };

                if (level === 'total') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalColor } };
                else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subColor } };

                for (let m = 0; m < metricKeys.length; m++) {
                    const metricCell = worksheet.getCell(3, levelColIndex + m);
                    metricCell.alignment = { horizontal: 'center' };
                    const metricKey = metricKeys[m];

                    if (level === 'total') {
                        metricCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalSubColor } };
                    } else if (metricKey === 'recruit') {
                        metricCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBF7D0' } }; // Green-200
                    } else if (metricKey === 'vacancy') {
                        metricCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }; // Red-200
                    } else {
                        metricCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subColor } }; // Default Blue/Orange light
                    }
                }
                levelColIndex += metricKeys.length;
            });
            colIndex += totalSpan;
        };

        if (checkedList.includes('normal')) styleGroup(colors.blueHeader, colors.blueSub, colors.blueHeader, colors.blueSummary);
        if (checkedList.includes('sec')) styleGroup(colors.orangeHeader, colors.orangeSub, colors.orangeHeader, colors.orangeSummary);

        if (checkedList.includes('grand_total')) {
            const totalSpan = metricKeys.length;
            worksheet.mergeCells(1, colIndex, 2, colIndex + totalSpan - 1);
            const cell = worksheet.getCell(1, colIndex);
            cell.value = 'รวมทั้งหมด';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.purpleHeader } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { bold: true, name: 'Sarabun', size: 10 };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            for (let m = 0; m < metricKeys.length; m++) {
                const metricCell = worksheet.getCell(3, colIndex + m);
                metricCell.alignment = { horizontal: 'center' };
                const metricKey = metricKeys[m];

                if (metricKey === 'recruit') {
                    metricCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBF7D0' } }; // Green-200
                } else if (metricKey === 'vacancy') {
                    metricCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9D5FF' } }; // Purple-200
                } else {
                    metricCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } }; // Purple 50
                }
            }
            colIndex += totalSpan;
        }

        if (checkedList.includes('remark')) { worksheet.mergeCells(1, colIndex, 3, colIndex); colIndex++; }
        if (checkedList.includes('log')) { worksheet.mergeCells(1, colIndex, 3, colIndex); colIndex++; }

        [r1, r2, r3].forEach(row => row.eachCell(cell => {
            if (!cell.font) cell.font = { bold: true, name: 'Sarabun', size: 10 };
            if (!cell.border) cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }));

        // Flatten data for Excel export to avoid complexity with grouping in Excel for now
        const flattenForExcel = (data: Report6DataType[], depth: number = 0): any[] => {
            let rows: any[] = [];
            data.forEach(item => {
                // Indent unit_short based on depth
                const indentedItem = { ...item, unit_short: '    '.repeat(depth) + item.unit_short };
                rows.push(indentedItem);
                if (item.children) {
                    rows = rows.concat(flattenForExcel(item.children, depth + 1));
                }
            });
            return rows;
        };

        // We use filteredData but we need to flatten it preserving order
        const excelRows = [...flattenForExcel(filteredData), tableDataWithSummary[tableDataWithSummary.length - 1]];

        excelRows.forEach(item => {
            if (!item) return;
            const rowValues = dataKeys.map(key => {
                // @ts-ignore
                const val = item[key];
                if (typeof val === 'number') return val;
                if (val === undefined || val === null || val === '') {
                    if (key.includes('normal') || key.includes('sec') || key.includes('grand_total')) return 0;
                    return '';
                }
                return val;
            });
            const row = worksheet.addRow(rowValues);

            if (item.key === 'TOTAL_SUMMARY') {
                row.eachCell((cell, colNumber) => {
                    const key = dataKeys[colNumber - 1];
                    let fillColor = colors.graySummary;

                    if (key) {
                        if (key.includes('normal')) fillColor = colors.blueSummary;
                        else if (key.includes('sec')) fillColor = colors.orangeSummary;
                        else if (key.includes('grand_total')) fillColor = colors.purpleSummary;
                    }

                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    cell.font = { bold: true, name: 'Sarabun', size: 10 };
                    cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            } else {
                row.eachCell((cell, colNumber) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.font = { name: 'Sarabun', size: 10 };
                });
            }
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Report_06_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Columns Definition ---
    const columns: ColumnsType<Report6DataType> = useMemo(() => {
        const isShow = (k: string) => checkedList.includes(k);
        const getBasicCellProps = (record: Report6DataType) => record.key === 'TOTAL_SUMMARY' ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' } : { className: 'bg-white' };

        return [
            ...(isShow('unit_short') ? [{ title: 'ชื่อย่อ', dataIndex: 'unit_short', key: 'unit_short', width: 200, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_code') ? [{ title: 'รหัส', dataIndex: 'unit_code', key: 'unit_code', width: 80, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_name') ? [{ title: 'ชื่อเต็มหน่วยงาน', dataIndex: 'unit_name', key: 'unit_name', width: 250, ellipsis: true, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('line_of_work') ? [{ title: 'สายงาน', dataIndex: 'line_of_work', key: 'line_of_work', width: 100, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('level') ? [{ title: 'ระดับ', dataIndex: 'level', key: 'level', width: 80, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('business_unit') ? [{ title: 'หน่วยธุรกิจ', dataIndex: 'business_unit', key: 'business_unit', width: 120, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),

            ...(isShow('normal') ? [{
                title: 'กรอบปกติ', className: 'bg-blue-200! text-blue-900 font-bold text-center',
                children: generateColumns('normal', 'bg-blue-50!', 'bg-blue-100!', 'รวมปกติ', 'bg-blue-200! text-blue-900 font-bold', 'bg-blue-100! text-blue-900!')
            }] : []),

            ...(isShow('sec') ? [{
                title: 'Secondment Pool', className: 'bg-orange-200! text-orange-900 font-bold text-center',
                children: generateColumns('sec', 'bg-orange-50!', 'bg-orange-100!', 'รวม secpool', 'bg-orange-200! text-orange-900 font-bold', 'bg-orange-100! text-orange-900!')
            }] : []),

            ...(isShow('grand_total') ? [{
                title: 'รวมทั้งหมด', className: 'bg-purple-200! text-purple-900 font-bold text-center',
                onHeaderCell: () => ({ rowSpan: 2, className: 'bg-purple-200! text-purple-900 font-bold text-center' }),
                children: [{
                    title: '', className: 'hidden',
                    onHeaderCell: () => ({ style: { display: 'none' } }),
                    children: metricKeys.map((metricKey, index) => ({
                        title: metricLabels[index],
                        dataIndex: `grand_total_${metricKey}`,
                        key: `grand_total_${metricKey}`,
                        width: 50,
                        align: 'center' as const,
                        className: 'bg-purple-50! font-bold text-gray-900',
                        onHeaderCell: () => {
                            let className = 'bg-purple-50! text-gray-700';
                            if (metricKey === 'recruit') className = 'bg-green-200! text-green-900! font-bold';
                            else if (metricKey === 'vacancy') className = 'bg-purple-50! text-purple-900! font-bold';
                            return { className };
                        },
                        render: renderNumber,
                        onCell: (record: Report6DataType) => record.key === 'TOTAL_SUMMARY' ? { className: 'bg-purple-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' } : { className: 'bg-white' }
                    }))
                }]
            }] : []),

            ...(isShow('remark') ? [{
                title: 'หมายเหตุ', dataIndex: 'remark', key: 'remark', width: 200, ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), render: (t: string) => <span className="text-xs">{t}</span>,
                onCell: getBasicCellProps
            }] : []),
            ...(isShow('log') ? [{
                title: 'Log', dataIndex: 'log', key: 'log', width: 100, ellipsis: true, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCellProps
            }] : [])
        ];
    }, [checkedList]);

    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">Report 06</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">รายงานสรุปอัตราค้างสรรหาและอัตราว่าง</span>
                        </div>
                    </div >
                </div >
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
                    <Form layout="inline" onFinish={onSearch} initialValues={{ date: dayjs() }} className="flex items-center gap-2">
                        <Form.Item name="date" label="วันที่" className="m-0"><DatePicker format="DD/MM/YYYY" className="w-34" /></Form.Item>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยธุรกิจ</label>
                            <MultiSelectFilter label="เลือกหน่วยธุรกิจ" options={businessUnitOptions} selectedValues={selectedBusinessUnits} onChange={setSelectedBusinessUnits} width="w-40" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">สายงาน</label>
                            <MultiSelectFilter label="เลือกสายงาน" options={lineOfWorkOptions} selectedValues={selectedLinesOfWork} onChange={setSelectedLinesOfWork} width="w-40" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยงาน</label>
                            <MultiSelectFilter label="เลือกหน่วยงาน" options={orgUnitOptions} selectedValues={selectedOrgUnits} onChange={setSelectedOrgUnits} width="w-48" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">แสดงข้อมูล</label>
                            <MultiSelectFilter label="เลือกแสดงข้อมูล" options={datasetOptions} selectedValues={selectedDatasets} onChange={setSelectedDatasets} width="w-40" />
                        </div>


                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>ค้นหา</Button>
                    </Form>
                    <div className="flex items-center gap-2">
                        <Button icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={toggleFullscreen} className={`border-none! shadow-sm! text-white! ${isFullscreen ? 'bg-red-500! hover:bg-red-600!' : 'bg-blue-500! hover:bg-blue-600!'}`}>{isFullscreen ? 'ปิดเต็มจอ' : 'เต็มจอ'}</Button>
                        <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!">Excel</Button>
                        <Popover placement="bottomLeft" trigger="click" content={
                            <div className="w-64 max-h-96 overflow-y-auto">
                                <div className="mb-2 font-bold text-gray-700 border-b pb-1">เลือกแสดงกลุ่มข้อมูล</div>
                                <Checkbox.Group options={columnOptions} value={checkedList} onChange={setCheckedList} className="flex flex-col gap-2" />
                            </div>
                        }><Button icon={<SettingOutlined />}> ({checkedList.length})</Button></Popover>
                    </div>
                </div>
                <div className={`bg-white rounded-lg shadow-sm border border-gray-100 mt-4 ${isFullscreen ? 'fixed inset-0 z-50 p-4 overflow-auto' : ''}`}>
                    <div className={`${isFullscreen ? '' : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-7.2rem)] overflow-hidden'}`}>
                        <Table
                            columns={columns}
                            dataSource={tableDataWithSummary}
                            loading={loading}
                            bordered
                            size="small"
                            scroll={{ x: 'max-content', y: isFullscreen ? 'calc(100vh - 100px)' : 600 }}
                            pagination={false}
                            sticky
                            className="[&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1! [&_.ant-table-header]:z-20"
                            rowClassName={(record) => record.key === 'TOTAL_SUMMARY' ? 'font-bold' : 'bg-white'}
                            expandable={{
                                defaultExpandAllRows: true,
                            }}
                        />
                    </div>
                </div>
            </div >
        </Main >
    );
}



