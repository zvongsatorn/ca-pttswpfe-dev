'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Checkbox, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { SearchOutlined, FileExcelOutlined, FullscreenOutlined, FullscreenExitOutlined, SettingOutlined } from '@ant-design/icons';
import { ChevronDown, Search, Check } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';

// --- Import for Export ---
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

dayjs.locale('th');

// --- 1. Type Definitions ---
interface DataType {
    key: string;
    unit: string;
    // Removed children for flat structure
    [key: string]: any;
}

// --- 2. Mock Data Generator ---
const generateMockData = (months: string[]): DataType[] => {
    // Flat Business Groups
    const units = [
        { key: '1', unit: 'CO' },
        { key: '2', unit: 'COOD' },
        { key: '3', unit: 'COOU' },
        { key: '4', unit: 'HO' },
        { key: 'total', unit: 'รวม' }
    ];

    const populateData = (item: any) => {
        months.forEach(month => {
            // Generate data for each column type requested

            // 1. กรอบ พนง.
            item[`frame_staff_${month}`] = Math.floor(Math.random() * 100);

            // 2. ปกติ
            item[`frame_normal_${month}`] = Math.floor(Math.random() * 80);

            // 3. คน ปกติ
            item[`people_normal_${month}`] = Math.floor(Math.random() * 75);

            // 4. Pool RS
            item[`pool_rs_${month}`] = Math.floor(Math.random() * 10);

            // 5. คน Pool RS
            item[`people_pool_rs_${month}`] = Math.floor(Math.random() * 5);

            // 6. กรอบ Sec
            item[`frame_sec_${month}`] = Math.floor(Math.random() * 10);

            // 7. Traditional
            item[`frame_trad_${month}`] = Math.floor(Math.random() * 20);

            // 8. New Biz
            item[`frame_newbiz_${month}`] = Math.floor(Math.random() * 10);

            // 9. คน New Biz
            item[`people_newbiz_${month}`] = Math.floor(Math.random() * 8);

            // 10. รวม Actual
            item[`total_actual_${month}`] = Math.floor(Math.random() * 150);

            // 11. รวม คน
            item[`total_people_${month}`] = Math.floor(Math.random() * 140);

            // 12. Contact Out
            item[`contact_out_${month}`] = Math.floor(Math.random() * 10);

            // 13. Contact Out สัญญาย่อย
            item[`contact_out_sub_${month}`] = Math.floor(Math.random() * 5);

            // 14. หมายเหตุ
            item[`remark_${month}`] = `Note`;
        });
    };

    units.forEach(populateData);
    return units as DataType[];
};

// --- 3. Helper Component: MultiSelectFilter ---
interface MultiSelectFilterProps {
    label: string;
    options: string[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    width?: string;
}

function MultiSelectFilter({ label, options, selectedValues, onChange, width = "w-64" }: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (option: string) => {
        if (selectedValues.includes(option)) {
            onChange(selectedValues.filter(v => v !== option));
        } else {
            onChange([...selectedValues, option]);
        }
    };

    const handleSelectAll = () => {
        if (selectedValues.length === options.length) {
            onChange([]);
        } else {
            onChange(options);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <div
                className={`${width} min-h-[32px] px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer flex items-center justify-between`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="truncate flex gap-1 flex-wrap">
                    {selectedValues.length === 0 ? (
                        <span className="text-gray-400">{label}...</span>
                    ) : selectedValues.length === options.length ? (
                        <span className="text-blue-600 font-medium">เลือกทั้งหมด ({options.length})</span>
                    ) : (
                        <span className="text-gray-800">
                            {selectedValues.length} รายการ
                        </span>
                    )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[60] overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="ค้นหา..."
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1">
                        {/* Select All Option */}
                        {filteredOptions.length > 0 && (
                            <div
                                className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50"
                                onClick={handleSelectAll}
                            >
                                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedValues.length === options.length && options.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                    {selectedValues.length === options.length && options.length > 0 && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm font-semibold text-blue-700">เลือกทั้งหมด</span>
                            </div>
                        )}

                        {filteredOptions.map(option => {
                            const isSelected = selectedValues.includes(option);
                            return (
                                <div
                                    key={option}
                                    className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                    onClick={() => toggleOption(option)}
                                >
                                    <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="text-sm text-gray-700 truncate" title={option}>{option}</span>
                                </div>
                            );
                        })}

                        {filteredOptions.length === 0 && (
                            <div className="text-center py-4 text-xs text-gray-400">ไม่พบข้อมูล</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];

// ตัวเลือกกลุ่มคอลัมน์ (Exact match to user request)
const columnOptions = [
    { label: 'กรอบ พนง.', value: 'frame_staff' },
    { label: 'ปกติ', value: 'frame_normal' },
    { label: 'คน ปกติ', value: 'people_normal' },
    { label: 'Pool RS', value: 'pool_rs' },
    { label: 'คน Pool RS', value: 'people_pool_rs' },
    { label: 'กรอบ Sec', value: 'frame_sec' },
    { label: 'Traditional', value: 'traditional' },
    { label: 'New Biz', value: 'new_biz' },
    { label: 'คน New Biz', value: 'people_new_biz' },
    { label: 'รวม Actual', value: 'total_actual' },
    { label: 'รวม คน', value: 'total_people' },
    { label: 'Contact Out', value: 'contact_out' },
    { label: 'Contact Out สัญญาย่อย', value: 'contact_out_sub' },
    { label: 'หมายเหตุ', value: 'remark' },
];

// ตัวเลือก Business Unit (Updated to simple strings for MultiSelectFilter)
const businessUnitOptions = ['CO', 'COOD', 'COOU', 'HO', 'รวม'];

const defaultCheckedList = columnOptions.map((opt) => opt.value);
type CheckboxValueType = string | number | boolean;

export default function Report2Page() {
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<CheckboxValueType[]>(defaultCheckedList);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetOptions);
    // Updated state for MultiSelectFilter (string[])
    const [selectedUnits, setSelectedUnits] = useState<string[]>(businessUnitOptions);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const [startMonth, setStartMonth] = useState<Dayjs>(dayjs());
    const [endMonth, setEndMonth] = useState<Dayjs>(dayjs());

    const months = useMemo(() => {
        const list: string[] = [];
        let current = startMonth.clone().startOf('month');
        const end = endMonth.clone().endOf('month');

        while (current.isBefore(end) || current.isSame(end, 'month')) {
            list.push(current.format('YYYYMM'));
            current = current.add(1, 'month');
        }
        return list;
    }, [startMonth, endMonth]);

    const [data, setData] = useState<DataType[]>([]);

    useEffect(() => {
        // Generate data including the month before the start month for diff calculation
        const dataMonths = [...months];
        if (months.length > 0) {
            const firstMonth = dayjs(months[0], 'YYYYMM');
            const prevMonth = firstMonth.subtract(1, 'month').format('YYYYMM');
            dataMonths.unshift(prevMonth);
        }

        const allData = generateMockData(dataMonths);
        // Updated filtering logic to use item.unit
        const filteredData = allData.filter(item => selectedUnits.includes(item.unit));
        setData(filteredData);
    }, [months, selectedUnits]);

    const onSearch = (values: any) => {
        console.log('Filter Values:', values);
        setLoading(true);
        if (values.startMonth) setStartMonth(values.startMonth);
        if (values.endMonth) setEndMonth(values.endMonth);

        setTimeout(() => {
            setLoading(false);
        }, 500);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const onCheckboxChange = (list: CheckboxValueType[]) => {
        setCheckedList(list);
    };

    // --- Logic การ Export Excel ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 02');

        // --- 1. กำหนด Palette สี (ARGB Hex) ---
        const colors = {
            textBlack: 'FF000000',
            textWhite: 'FFFFFFFF',
            textBlue900: 'FF1E3A8A',
            textBlue800: 'FF1E40AF',
            textOrange900: 'FF7C2D12',
            textOrange800: 'FF9A3412',
            textPurple900: 'FF581C87',
            textRed800: 'FF991B1B',
            textGray800: 'FF1F2937',
            textYellow800: 'FF854D0E',

            bgBlue200: 'FFBFDBFE',
            bgBlue100: 'FFDBEAFE',
            bgBlue50: 'FFF0F9FF',
            bgOrange200: 'FFFED7AA',
            bgOrange50: 'FFFFF7ED',
            bgPurple200: 'FFE9D5FF',
            bgGray200: 'FFE5E7EB',
            bgGray100: 'FFF3F4F6',
            bgRed50: 'FFFEF2F2',
            bgYellow100: 'FFFEF9C3',
            bgOrange100: 'FFFFEDD5',
            bgWhite: 'FFFFFFFF',
        };

        const isShow = (key: string) => checkedList.includes(key);

        // --- 2. Prepare Headers (3 Rows) ---
        const headerRow1 = ['Business'];
        const headerRow2 = [''];
        const headerRow3 = [''];

        const dataKeys: string[] = ['unit'];
        const colWidths: number[] = [30];
        const colBgColors: { [key: string]: string } = {}; // Store bg color for each key
        const colGroupInfo: { title: string, count: number, colorBg: string, colorText: string }[] = []; // Store column group info for row 2

        months.forEach(monthKey => {
            const monthLabel = dayjs(monthKey, 'YYYYMM').format('MMMM YYYY');

            let activeSubCols = 0;
            const monthGroupInfo: { title: string, count: number, colorBg: string, colorText: string }[] = [];

            // Helper to add sub-col with explicit data key override
            const addCol = (keySuffix: string, title: string, width: number, bg: string, text: string, dataKeyOverride?: string, showDiff: boolean = true) => {
                if (isShow(keySuffix)) {
                    let colCount = 0;
                    // Value Column
                    activeSubCols++;
                    colCount++;
                    headerRow3.push('จำนวน');
                    dataKeys.push(dataKeyOverride ? `${dataKeyOverride}_${monthKey}` : `${keySuffix}_${monthKey}`);
                    colWidths.push(width);
                    colBgColors[dataKeyOverride ? `${dataKeyOverride}_${monthKey}` : `${keySuffix}_${monthKey}`] = bg;

                    // Diff Column
                    if (showDiff) {
                        activeSubCols++;
                        colCount++;
                        headerRow3.push('+/-');
                        dataKeys.push(dataKeyOverride ? `${dataKeyOverride}_${monthKey}_diff` : `${keySuffix}_${monthKey}_diff`);
                        colWidths.push(10);
                        colBgColors[dataKeyOverride ? `${dataKeyOverride}_${monthKey}_diff` : `${keySuffix}_${monthKey}_diff`] = bg;
                    }

                    monthGroupInfo.push({ title, count: colCount, colorBg: bg, colorText: text });
                }
            };

            addCol('frame_staff', 'กรอบ พนง.', 15, colors.bgBlue50, colors.textBlue800);
            addCol('frame_normal', 'ปกติ', 15, colors.bgOrange200, colors.textBlue800);
            addCol('people_normal', 'คน ปกติ', 15, colors.bgBlue50, colors.textBlue800);
            addCol('pool_rs', 'Pool RS', 15, colors.bgOrange200, colors.textOrange900);
            addCol('people_pool_rs', 'คน Pool RS', 15, colors.bgBlue50, colors.textBlue800);
            addCol('frame_sec', 'กรอบ Sec', 15, colors.bgOrange200, colors.textOrange900);
            addCol('traditional', 'Traditional', 15, colors.bgBlue50, colors.textBlue800, 'frame_trad');
            addCol('new_biz', 'New Biz', 15, colors.bgOrange200, colors.textOrange900, 'frame_newbiz');
            addCol('people_new_biz', 'คน New Biz', 15, colors.bgBlue50, colors.textBlue800, 'people_newbiz');
            addCol('total_actual', 'รวม Actual', 15, colors.bgOrange200, colors.textOrange900);
            addCol('total_people', 'รวม คน', 15, colors.bgRed50, colors.textRed800);
            addCol('contact_out', 'Contact Out', 20, colors.bgPurple200, colors.textPurple900, undefined, false);
            addCol('contact_out_sub', 'Contact Out สัญญาย่อย', 25, colors.bgPurple200, colors.textPurple900, undefined, false);

            if (isShow('remark')) {
                activeSubCols++;
                headerRow3.push('หมายเหตุ');
                dataKeys.push(`remark_${monthKey}`);
                colWidths.push(30);
                monthGroupInfo.push({ title: 'หมายเหตุ', count: 1, colorBg: colors.bgGray100, colorText: colors.textGray800 });
            }

            if (activeSubCols > 0) {
                headerRow1.push(`Actual ${monthLabel}`);
                for (let i = 1; i < activeSubCols; i++) headerRow1.push('');

                monthGroupInfo.forEach(group => {
                    headerRow2.push(group.title);
                    for (let i = 1; i < group.count; i++) headerRow2.push('');
                    colGroupInfo.push(group);
                });
            }
        });


        const row1 = worksheet.addRow(headerRow1);
        const row2 = worksheet.addRow(headerRow2);
        const row3 = worksheet.addRow(headerRow3);

        // --- 3. Merge & Style Headers ---
        worksheet.mergeCells(1, 1, 3, 1);
        const businessCell = worksheet.getCell(1, 1);
        businessCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgBlue100 } };
        businessCell.font = { bold: true, color: { argb: colors.textBlue900 }, name: 'Sarabun' };
        businessCell.alignment = { vertical: 'middle', horizontal: 'center' };
        businessCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };


        let colIndex = 2;
        let groupIndex = 0;

        months.forEach(monthKey => {
            let count = 0;
            if (isShow('frame_staff')) count += 2;
            if (isShow('frame_normal')) count += 2;
            if (isShow('people_normal')) count += 2;
            if (isShow('pool_rs')) count += 2;
            if (isShow('people_pool_rs')) count += 2;
            if (isShow('frame_sec')) count += 2;
            if (isShow('traditional')) count += 2;
            if (isShow('new_biz')) count += 2;
            if (isShow('people_new_biz')) count += 2;
            if (isShow('total_actual')) count += 2;
            if (isShow('total_people')) count += 2;
            if (isShow('contact_out')) count += 1;
            if (isShow('contact_out_sub')) count += 1;
            if (isShow('remark')) count += 1;

            if (count > 0) {
                // Merge month header (row 1) across all sub-columns
                if (count > 1) {
                    worksheet.mergeCells(1, colIndex, 1, colIndex + count - 1);
                }

                const monthCell = worksheet.getCell(1, colIndex);
                monthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgBlue200 } };
                monthCell.font = { bold: true, color: { argb: colors.textBlue900 }, size: 12, name: 'Sarabun' };
                monthCell.alignment = { vertical: 'middle', horizontal: 'center' };
                monthCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                // Style and merge column groups (row 2) and sub-columns (row 3)
                let currentSubCol = colIndex;

                const styleColGroup = (keySuffix: string, bg: string, text: string, showDiff: boolean = true) => {
                    if (isShow(keySuffix)) {
                        const group = colGroupInfo[groupIndex];
                        groupIndex++;

                        // Merge column group header (row 2) if it has multiple sub-columns
                        if (group.count > 1) {
                            worksheet.mergeCells(2, currentSubCol, 2, currentSubCol + group.count - 1);
                        }

                        // Style column group header (row 2)
                        const groupCell = worksheet.getCell(2, currentSubCol);
                        groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                        groupCell.font = { bold: true, color: { argb: text }, name: 'Sarabun' };
                        groupCell.alignment = { vertical: 'middle', horizontal: 'center' };
                        groupCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        // Style sub-column headers (row 3)
                        for (let i = 0; i < group.count; i++) {
                            const subCell = worksheet.getCell(3, currentSubCol + i);
                            subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                            subCell.font = { bold: true, color: { argb: text }, name: 'Sarabun' };
                            subCell.alignment = { vertical: 'middle', horizontal: 'center' };
                            subCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        }

                        currentSubCol += group.count;
                    }
                };

                styleColGroup('frame_staff', colors.bgBlue50, colors.textBlue800);
                styleColGroup('frame_normal', colors.bgOrange200, colors.textBlue800);
                styleColGroup('people_normal', colors.bgBlue50, colors.textBlue800);
                styleColGroup('pool_rs', colors.bgOrange200, colors.textOrange900);
                styleColGroup('people_pool_rs', colors.bgBlue50, colors.textBlue800);
                styleColGroup('frame_sec', colors.bgOrange200, colors.textOrange900);
                styleColGroup('traditional', colors.bgBlue50, colors.textBlue800);
                styleColGroup('new_biz', colors.bgOrange200, colors.textOrange900);
                styleColGroup('people_new_biz', colors.bgBlue50, colors.textBlue800);
                styleColGroup('total_actual', colors.bgOrange200, colors.textOrange900);
                styleColGroup('total_people', colors.bgRed50, colors.textRed800);
                styleColGroup('contact_out', colors.bgPurple200, colors.textPurple900, false);
                styleColGroup('contact_out_sub', colors.bgPurple200, colors.textPurple900, false);

                if (isShow('remark')) {
                    const group = colGroupInfo[groupIndex];
                    groupIndex++;

                    const cell2 = worksheet.getCell(2, currentSubCol);
                    cell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray100 } };
                    cell2.font = { bold: true, color: { argb: colors.textGray800 }, name: 'Sarabun' };
                    cell2.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell2.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    const cell3 = worksheet.getCell(3, currentSubCol);
                    cell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray100 } };
                    cell3.font = { bold: true, color: { argb: colors.textGray800 }, name: 'Sarabun' };
                    cell3.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell3.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    currentSubCol++;
                }

                colIndex += count;
            }
        });


        // --- 4. Insert Data ---
        data.forEach(item => {
            const rowData: any[] = [];
            rowData.push(item.unit);

            for (let i = 1; i < dataKeys.length; i++) {
                const key = dataKeys[i];
                if (key.endsWith('_diff')) {
                    const baseKey = key.replace('_diff', '');
                    const parts = baseKey.split('_');
                    const mKey = parts.pop();
                    const prefix = parts.join('_');
                    const prevMKey = dayjs(mKey, 'YYYYMM').subtract(1, 'month').format('YYYYMM');
                    const prevKey = `${prefix}_${prevMKey}`;

                    const current = Number(item[baseKey]) || 0;
                    const prev = Number(item[prevKey]) || 0;
                    const diff = current - prev;
                    rowData.push(diff !== 0 ? (diff > 0 ? `+${diff}` : `${diff}`) : '0');
                } else {
                    // Skip remark for "รวม" row
                    if (item.unit === 'รวม' && key.startsWith('remark_')) {
                        rowData.push('');
                    } else {
                        const value = item[key];
                        rowData.push((value !== undefined && value !== null) ? value : '');
                    }
                }
            }

            const row = worksheet.addRow(rowData);

            row.eachCell((cell, colNumber) => {
                cell.font = { name: 'Sarabun' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center' };

                if (colNumber === 1) {
                    if (item.unit === 'รวม') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgBlue100 } };
                        cell.font = { bold: true, color: { argb: colors.textBlue900 }, name: 'Sarabun' };
                    } else {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgWhite } };
                    }
                } else if (item.unit === 'รวม') {
                    const key = dataKeys[colNumber - 1];
                    const bgColor = colBgColors[key] || colors.bgWhite;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    cell.font = { bold: true, color: { argb: colors.textBlack }, name: 'Sarabun' }; // Use black text for better contrast or keep original? keeping simple for now, maybe use original text color if needed but user asked for "color" which usually implies bg. Let's try to match text color too if possible, but for now just bg as requested. Wait, the previous implementation used specific text colors. Let's try to preserve text color if possible, but the request specifically said "pour color" (เทสี) which means background.
                    // Actually, let's use the text color from the column definition if we can, but we only stored bg.
                    // For simplicity and safety, let's just set the BG. The text color logic for diffs is handled below.
                    // For non-diff columns, we might want to keep the default text color or make it bold.
                    // Let's stick to bold black or dark gray for Total row to be safe, or maybe the column's text color?
                    // The previous plan said "match header color". Headers have specific text colors too.
                    // Let's just set the BG for now as that's the main request.
                }

                // Diff Color
                const key = dataKeys[colNumber - 1];
                if (key && key.endsWith('_diff')) {
                    const valStr = cell.value?.toString() || '';
                    if (valStr.startsWith('+')) {
                        cell.font = { color: { argb: 'FF3B82F6' }, name: 'Sarabun' }; // Blue
                    } else if (valStr.startsWith('-')) {
                        cell.font = { color: { argb: 'FFEF4444' }, name: 'Sarabun' }; // Red
                    }
                }
            });
        });

        worksheet.columns = colWidths.map(w => ({ width: w }));

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Report_02_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const columns: ColumnsType<DataType> = useMemo(() => {
        const isShow = (key: string) => checkedList.includes(key);
        const bgWhite = 'bg-white';

        const baseColumns: ColumnsType<DataType> = [
            {
                title: 'Business',
                dataIndex: 'unit',
                key: 'unit',
                fixed: 'left',
                width: 150,
                className: 'bg-white z-20',
                onHeaderCell: () => ({
                    className: 'bg-blue-100! text-blue-900! font-bold',
                }),
                onCell: (record: DataType) => ({
                    className: record.unit === 'รวม' ? 'bg-blue-100! font-semibold text-blue-900!' : 'bg-white'
                }),
                render: (text: any) => <span className="font-medium text-gray-700">{text}</span>
            }
        ];

        months.forEach(monthKey => {
            const monthLabel = dayjs(monthKey, 'YYYYMM').format('MMMM YYYY');
            const prevMonthKey = dayjs(monthKey, 'YYYYMM').subtract(1, 'month').format('YYYYMM');

            const monthGroup: any = {
                title: `Actual ${monthLabel}`,
                onHeaderCell: () => ({
                    className: 'bg-blue-200! text-blue-900! font-bold! text-[14px]!'
                }),
                children: []
            };

            const createCol = (key: string, title: string, width: number, bgHeader: string, textHeader: string, dataKeyOverride?: string, showDiff: boolean = true) => {
                if (!isShow(key)) return null;

                const currentKey = dataKeyOverride ? `${dataKeyOverride}_${monthKey}` : `${key}_${monthKey}`;
                const prevKey = dataKeyOverride ? `${dataKeyOverride}_${prevMonthKey}` : `${key}_${prevMonthKey}`;

                const children: any[] = [
                    {
                        title: 'จำนวน',
                        dataIndex: currentKey,
                        key: currentKey,
                        width: width,
                        align: 'center' as const,
                        className: bgWhite,
                        onHeaderCell: () => ({ className: `${bgHeader} ${textHeader}` }),
                        onCell: (record: DataType) => ({
                            className: record.unit === 'รวม' ? `${bgHeader} font-semibold` : 'bg-white'
                        })
                    }
                ];

                if (showDiff) {
                    children.push({
                        title: '+/-',
                        key: `${currentKey}_diff`,
                        width: 60,
                        align: 'center' as const,
                        className: bgWhite,
                        onHeaderCell: () => ({ className: `${bgHeader} ${textHeader}` }),
                        onCell: (record: DataType) => ({
                            className: record.unit === 'รวม' ? `${bgHeader} font-semibold` : 'bg-white'
                        }),
                        render: (_: any, record: DataType) => {
                            const current = Number(record[currentKey]) || 0;
                            const prev = Number(record[prevKey]) || 0;
                            const diff = current - prev;
                            let colorClass = 'text-gray-900';
                            let prefix = '';
                            if (diff > 0) {
                                colorClass = 'text-blue-500';
                                prefix = '+';
                            } else if (diff < 0) {
                                colorClass = 'text-red-500';
                            }
                            return <span className={colorClass}>{diff !== 0 ? `${prefix}${diff}` : '0'}</span>;
                        }
                    });
                }

                return {
                    title: title,
                    className: bgWhite,
                    onHeaderCell: () => ({ className: `${bgHeader} ${textHeader}` }),
                    children: children
                };
            };

            const cols = [
                createCol('frame_staff', 'กรอบ พนง.', 60, 'bg-blue-50!', 'text-blue-800!'),
                createCol('frame_normal', 'ปกติ', 60, 'bg-blue-50!', 'text-blue-800!'),
                createCol('people_normal', 'คน ปกติ', 60, 'bg-blue-50!', 'text-blue-800!'),
                createCol('pool_rs', 'Pool RS', 60, 'bg-orange-200!', 'text-orange-900!'),
                createCol('people_pool_rs', 'คน Pool RS', 60, 'bg-blue-50!', 'text-blue-800!'),
                createCol('frame_sec', 'กรอบ Sec', 60, 'bg-orange-200!', 'text-orange-900!'),
                createCol('traditional', 'Traditional', 70, 'bg-blue-50!', 'text-blue-800!', 'frame_trad'),
                createCol('new_biz', 'New Biz', 60, 'bg-orange-200!', 'text-orange-900!', 'frame_newbiz'),
                createCol('people_new_biz', 'คน New Biz', 60, 'bg-blue-50!', 'text-blue-800!', 'people_newbiz'),
                createCol('total_actual', 'รวม Actual', 60, 'bg-orange-200!', 'text-orange-900!'),
                createCol('total_people', 'รวม คน', 60, 'bg-red-50!', 'text-red-800!'),
                createCol('contact_out', 'Contact Out', 80, 'bg-purple-200!', 'text-purple-900!', undefined, false),
                createCol('contact_out_sub', 'Contact Out สัญญาย่อย', 100, 'bg-purple-200!', 'text-purple-900!', undefined, false)
            ];

            cols.forEach(col => {
                if (col) monthGroup.children.push(col);
            });

            if (isShow('remark')) {
                monthGroup.children.push({
                    title: 'หมายเหตุ',
                    dataIndex: `remark_${monthKey}`,
                    key: `remark_${monthKey}`,
                    width: 150,
                    align: 'left',
                    className: bgWhite,
                    onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-800!' }),
                    render: (text: any, record: DataType) => {
                        // Don't show remark for "รวม" row
                        if (record.unit === 'รวม') return null;
                        return <span className="text-xs text-gray-500">{text}</span>;
                    }
                });
            }

            baseColumns.push(monthGroup);
        });

        return baseColumns;
    }, [checkedList, months]);


    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                {/* Header */}
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">Report 02</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50"> รายงานสรุปภาพรวมการเปลี่ยนแปลงกรอบอัตราเปรียบเทียบรายเดือน</span>
                        </div>
                    </div >
                </div >


                {/* Filter */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">

                    <Form
                        layout="inline"
                        onFinish={onSearch}
                        initialValues={{ startMonth: startMonth, endMonth: endMonth }}
                        className="flex items-center gap-2"
                    >
                        <Form.Item label="ตั้งแต่" name="startMonth" className="m-0">
                            <DatePicker picker="month" format="MMMM YYYY" allowClear={false} />
                        </Form.Item>
                        <Form.Item label="ถึง" name="endMonth" className="m-0">
                            <DatePicker picker="month" format="MMMM YYYY" allowClear={false} />
                        </Form.Item>

                        {/* New MultiSelectFilter */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                หน่วยธุรกิจ
                            </label>
                            <MultiSelectFilter
                                label="เลือกหน่วยธุรกิจ"
                                options={businessUnitOptions}
                                selectedValues={selectedUnits}
                                onChange={setSelectedUnits}
                                width="w-48"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">แสดงข้อมูล</label>
                            <MultiSelectFilter label="เลือกแสดงข้อมูล" options={datasetOptions} selectedValues={selectedDatasets} onChange={setSelectedDatasets} width="w-40" />
                        </div>


                        <Form.Item className="m-0">
                            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                                ค้นหา
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="flex items-center gap-2">
                        <Button
                            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={toggleFullscreen}
                            className={`
        border-none! shadow-sm! text-white!
        ${isFullscreen
                                    ? 'bg-red-500! hover:bg-red-600!'
                                    : 'bg-blue-500! hover:bg-blue-600!'
                                }
      `}
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
                        <Popover
                            placement="bottomLeft"
                            trigger="click"
                            content={
                                <div className="w-64 max-h-80 overflow-y-auto">
                                    <div className="mb-2 font-bold text-gray-700 border-b pb-1">เลือกแสดงข้อมูล</div>
                                    <Checkbox.Group
                                        options={columnOptions}
                                        value={checkedList}
                                        onChange={onCheckboxChange}
                                        className="flex flex-col gap-2"
                                    />
                                </div>
                            }
                        >
                            <Button icon={<SettingOutlined />} className="text-gray-600 border-gray-300 border-dashed hover:text-blue-600 hover:border-blue-500">
                                ({checkedList.length})
                            </Button>
                        </Popover>
                    </div>

                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-4">
                    <div className="w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-7.2rem)] overflow-hidden">
                        <Table
                            columns={columns}
                            dataSource={data}
                            loading={loading}
                            bordered
                            size="small"
                            scroll={{
                                x: 'max-content',
                                y: 600
                            }}
                            pagination={false}
                            sticky
                            className="[&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                        />
                    </div>
                </div>

            </div>
        </Main>
    );
}
