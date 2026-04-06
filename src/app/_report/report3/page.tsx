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
interface Report3DataType {
    key: string;
    unit_short: string; unit_code: string; unit_name: string;
    line_of_work: string; level: string; business_unit: string;
    type: string; stg_non: string; sup_bus: string; specific: string;
    frame_contract?: number; frame_sub_contract?: number;
    frame_21?: number; frame_18_20?: number; frame_16_17?: number; frame_14_15?: number;
    frame_11_13?: number; frame_9_10?: number; frame_under_8?: number; frame_total?: number;
    people_contract?: number; people_sub_contract?: number;
    people_21?: number; people_18_20?: number; people_16_17?: number; people_14_15?: number;
    people_11_13?: number; people_9_10?: number; people_under_8?: number; people_total?: number;
    line_21?: number; line_18_20?: number; line_16_17?: number; line_14_15?: number;
    line_11_13?: number; line_9_10?: number; line_under_8?: number; line_total?: number;
    staff_21?: number; staff_18_20?: number; staff_16_17?: number; staff_14_15?: number;
    staff_11_13?: number; staff_9_10?: number; staff_under_8?: number; staff_total?: number;
    recruit_21?: number; recruit_18_20?: number; recruit_16_17?: number; recruit_14_15?: number;
    recruit_11_13?: number; recruit_9_10?: number; recruit_under_8?: number; recruit_total?: number;
    vacancy_21?: number; vacancy_18_20?: number; vacancy_16_17?: number; vacancy_14_15?: number;
    vacancy_11_13?: number; vacancy_9_10?: number; vacancy_under_8?: number; vacancy_total?: number;
    remark?: string; log?: string;
}

const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];
// --- 2. Constants & Helpers ---
const levelKeys = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', 'under_8', 'total'];
const levelLabels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '8 ลงมา', 'รวม'];

const renderNumber = (value: any) => {
    if (value === undefined || value === null || value === '') return 0;
    return value;
};

// --- generateColumns ---
const generateColumns = (
    prefix: string,
    themeColor: string,
    summaryColorClass: string,
    includeContract: boolean = false,
    includeSubContract: boolean = false
) => {
    const cols: any[] = [];

    const getCellProps = (record: Report3DataType) => {
        if (record.key === 'TOTAL_SUMMARY') {
            return { className: `${summaryColorClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` };
        }
        return { className: 'bg-white' };
    };

    levelKeys.forEach((key, index) => {
        let headerClassName = '';
        if (key === 'total') headerClassName = 'bg-yellow-50! font-bold text-gray-900';

        cols.push({
            title: levelLabels[index],
            dataIndex: `${prefix}_${key}`,
            key: `${prefix}_${key}`,
            width: key === 'total' ? 70 : 60,
            align: 'center',
            className: headerClassName,
            onHeaderCell: () => ({
                className: key === 'total'
                    ? 'bg-yellow-200! text-yellow-900! font-bold'
                    : `${themeColor} text-gray-700`
            }),
            render: renderNumber,
            onCell: getCellProps,
        });
    });

    if (includeContract) {
        cols.push({
            title: 'Contract', dataIndex: `${prefix}_contract`, key: `${prefix}_contract`, width: 70, align: 'center',
            onHeaderCell: () => ({ className: `${themeColor} font-bold` }), render: renderNumber,
            onCell: getCellProps,
        });
    }

    if (includeSubContract) {
        cols.push({
            title: 'Contract สัญญาย่อย', dataIndex: `${prefix}_sub_contract`, key: `${prefix}_sub_contract`, width: 80, align: 'center',
            onHeaderCell: () => ({ className: `${themeColor} font-bold` }), render: renderNumber,
            onCell: getCellProps,
        });
    }

    return cols;
};

// Mock Data
const mockData: Report3DataType[] = [
    {
        key: '1',
        unit_short: 'GRP (Sec Pool)', unit_code: '80001883', unit_name: 'บริษัท โกลบอล รีนิวเอเบิล เพาเวอร์ จำกัด (Secondment Pool)',
        line_of_work: 'รอง/ปธ', level: 'ผช.กผญ.', business_unit: 'CNBO-Secondment', type: 'NewBis', stg_non: 'Non-Strategic', sup_bus: 'Business', specific: 'ไม่เป็น',
        frame_contract: 0, frame_sub_contract: 0, frame_21: 0, frame_total: 1,
        people_contract: 0, people_sub_contract: 0, people_21: 0, people_total: 1,
        line_21: 0, line_total: 0,
        staff_21: 0, staff_total: 0,
        recruit_total: 0, vacancy_total: 0,
        remark: '01/01/2568: โอนกรอบอัตรากำลังจาก ปธม.'
    },
    {
        key: '2',
        unit_short: 'PTTEP (Sec Pool)', unit_code: '80000143', unit_name: 'บริษัทปตท.สำรวจและผลิตปิโตรเลียม จำกัด (Secondment Pool)',
        line_of_work: 'รองกผญ', level: 'รองฯกผญ.', business_unit: 'COOU-Secondment', type: 'Traditional', stg_non: 'Non-Strategic', sup_bus: 'Business', specific: 'ไม่เป็น',
        frame_contract: 0, frame_sub_contract: 0, frame_16_17: 1, frame_11_13: 1, frame_total: 2,
        people_contract: 0, people_sub_contract: 0, people_16_17: 1, people_11_13: 1, people_total: 2,
        line_16_17: 1, line_total: 1,
        staff_11_13: 1, staff_total: 1,
        recruit_total: 0, vacancy_total: 0,
        remark: 'PTTMC 42/2567 : ลดกรอบอัตรากำลัง'
    },
    {
        key: '3',
        unit_short: 'PTT Test', unit_code: '80000099', unit_name: 'บริษัท ทดสอบ จำกัด',
        line_of_work: 'รองกผญ', level: 'ผจก.', business_unit: 'CDO-Secondment', type: 'NewBis', stg_non: 'Strategic', sup_bus: 'Support', specific: 'เป็น',
        frame_contract: 0, frame_sub_contract: 0, frame_14_15: 2, frame_total: 2,
        people_contract: 0, people_sub_contract: 0, people_14_15: 1, people_total: 1,
        line_14_15: 1, line_total: 1,
        staff_14_15: 0, staff_total: 0,
        recruit_total: 1, vacancy_total: 1,
        remark: 'เพิ่มอัตรากำลังใหม่'
    },
    {
        key: '4',
        unit_short: 'Test 2', unit_code: '80000056', unit_name: 'โรงแยกก๊าซธรรมชาติ',
        line_of_work: 'รกญ.', level: 'ผจก.ฝ่าย', business_unit: 'Gas Business', type: 'Traditional', stg_non: 'Strategic', sup_bus: 'Business', specific: 'ไม่เป็น',
        frame_contract: 0, frame_sub_contract: 0, frame_11_13: 5, frame_total: 5,
        people_contract: 0, people_sub_contract: 0, people_11_13: 4, people_total: 4,
        line_11_13: 1, line_total: 1,
        staff_11_13: 2, staff_total: 2,
        recruit_total: 0, vacancy_total: 1,
        remark: ''
    }
];

const businessUnitOptions = Array.from(new Set(mockData.map(item => item.business_unit))).sort();
const lineOfWorkOptions = Array.from(new Set(mockData.map(item => item.line_of_work))).sort();
const orgUnitOptions = Array.from(new Set(mockData.map(item => item.unit_name))).sort();

const columnOptions = [
    { label: 'ชื่อย่อ', value: 'unit_short' },
    { label: 'รหัส', value: 'unit_code' },
    { label: 'ชื่อเต็มหน่วยงาน', value: 'unit_name' },
    { label: 'สายงาน', value: 'line_of_work' },
    { label: 'ระดับ', value: 'level' },
    { label: 'หน่วยธุรกิจ', value: 'business_unit' },
    { label: 'ประเภท', value: 'type' },
    { label: 'Stg./Non', value: 'stg_non' },
    { label: 'Sup./Bus.', value: 'sup_bus' },
    { label: 'อัตราเฉพาะตัว', value: 'specific' },
    { label: 'กรอบอัตรากำลัง', value: 'frame' },
    { label: 'จำนวนคน', value: 'people' },
    { label: 'Line', value: 'line' },
    { label: 'Staff', value: 'staff' },
    { label: 'สรรหา', value: 'recruit' },
    { label: 'ว่าง', value: 'vacancy' },
    { label: 'หมายเหตุ', value: 'remark' },
    { label: 'Log', value: 'log' },
];

const defaultCheckedList = [
    'unit_short', 'unit_code', 'unit_name', 'line_of_work', 'level', 'business_unit', 'type', 'stg_non', 'sup_bus', 'specific',
    'frame', 'people', 'line', 'staff', 'vacancy', 'remark'
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

export default function Report3Page() {
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

    const filteredData = useMemo(() => {
        return mockData.filter(item =>
            selectedBusinessUnits.includes(item.business_unit) &&
            selectedLinesOfWork.includes(item.line_of_work) &&
            selectedOrgUnits.includes(item.unit_name)
        );
    }, [selectedBusinessUnits, selectedLinesOfWork, selectedOrgUnits]);

    const tableDataWithSummary = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];
        const totalRow: any = {
            key: 'TOTAL_SUMMARY',
            unit_short: '', unit_code: '', unit_name: 'รวมทั้งสิ้น (Grand Total)',
            line_of_work: '', level: '', business_unit: '', type: '', stg_non: '', sup_bus: '', specific: '', remark: '', log: ''
        };
        filteredData.forEach(item => {
            Object.keys(item).forEach(key => {
                const value = (item as any)[key];
                if (typeof value === 'number') totalRow[key] = (totalRow[key] || 0) + value;
            });
        });
        return [...filteredData, totalRow];
    }, [filteredData]);

    // --- UPDATED: Excel Export Logic to match Web Colors ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 03');
        const colors = {
            blueHeader: 'FFBFDBFE', blueSub: 'FFF0F9FF',
            orangeHeader: 'FFFED7AA', orangeSub: 'FFFFF7ED',
            purpleHeader: 'FFE9D5FF', purpleSub: 'FFFAF5FF',
            indigoHeader: 'FFC7D2FE', indigoSub: 'FFEEF2FF',
            greenHeader: 'FFBBF7D0', greenSub: 'FFF0FDF4',
            redHeader: 'FFFECACA', redSub: 'FFFEF2F2',
            grayHeader: 'FFE5E7EB', yellowTotal: 'FFFEF9C3',
            // Summary Colors (Shade 100)
            graySummary: 'FFF3F4F6',
            blueSummary: 'FFDBEAFE',
            orangeSummary: 'FFFFEDD5',
            purpleSummary: 'FFF3E8FF',
            indigoSummary: 'FFE0E7FF',
            greenSummary: 'FFDCFCE7',
            redSummary: 'FFFEE2E2',
        };

        let headersRow1: string[] = [];
        let headersRow2: string[] = [];
        let dataKeys: string[] = [];

        const addGroup = (title: string, prefix: string, color: string, includeContract = false, includeSubContract = false) => {
            const subCols = [];
            if (includeContract) subCols.push({ title: 'Contract', key: `${prefix}_contract` });
            if (includeSubContract) subCols.push({ title: 'Sub-contract', key: `${prefix}_sub_contract` });
            levelKeys.forEach((k, i) => subCols.push({ title: levelLabels[i], key: `${prefix}_${k}` }));
            headersRow1.push(title);
            for (let i = 1; i < subCols.length; i++) headersRow1.push('');
            subCols.forEach(c => { headersRow2.push(c.title); dataKeys.push(c.key); });
        };

        const basicCols = [
            { t: 'ชื่อย่อ', k: 'unit_short' }, { t: 'รหัส', k: 'unit_code' }, { t: 'ชื่อเต็ม', k: 'unit_name' },
            { t: 'สายงาน', k: 'line_of_work' }, { t: 'ระดับ', k: 'level' }, { t: 'หน่วยธุรกิจ', k: 'business_unit' }, { t: 'ประเภท', k: 'type' },
            { t: 'Stg./Non', k: 'stg_non' }, { t: 'Sup./Bus.', k: 'sup_bus' }, { t: 'อัตราเฉพาะตัว', k: 'specific' }
        ];
        let basicInfoCount = 0;
        basicCols.forEach(c => { if (checkedList.includes(c.k)) { headersRow1.push(c.t); headersRow2.push(''); dataKeys.push(c.k); basicInfoCount++; } });

        if (checkedList.includes('frame')) addGroup('กรอบอัตรากำลัง ในระบบ SAP', 'frame', colors.blueHeader, true, true);
        if (checkedList.includes('people')) addGroup('จำนวนคน', 'people', colors.orangeHeader, false, false);
        if (checkedList.includes('line')) addGroup('Line', 'line', colors.purpleHeader, false, false);
        if (checkedList.includes('staff')) addGroup('Staff', 'staff', colors.indigoHeader, false, false);
        if (checkedList.includes('recruit')) { headersRow1.push('สรรหา'); headersRow2.push(''); dataKeys.push('recruit_total'); }
        if (checkedList.includes('vacancy')) addGroup('ว่าง', 'vacancy', colors.redHeader);
        if (checkedList.includes('remark')) { headersRow1.push('หมายเหตุ'); headersRow2.push(''); dataKeys.push('remark'); }
        if (checkedList.includes('log')) { headersRow1.push('Log'); headersRow2.push(''); dataKeys.push('log'); }

        const r1 = worksheet.addRow(headersRow1);
        const r2 = worksheet.addRow(headersRow2);
        let colIndex = 1;
        for (let i = 0; i < basicInfoCount; i++) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.grayHeader } };
            colIndex++;
        }
        const styleGroup = (count: number, headerColor: string, subColor: string) => {
            worksheet.mergeCells(1, colIndex, 1, colIndex + count - 1);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
            worksheet.getCell(1, colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
            for (let i = 0; i < count; i++) {
                const subCell = worksheet.getCell(2, colIndex + i);
                subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headersRow2[colIndex + i - 1] === 'รวม' ? colors.yellowTotal : subColor } };
                subCell.alignment = { horizontal: 'center' };
            }
            colIndex += count;
        };
        if (checkedList.includes('frame')) styleGroup(10, colors.blueHeader, colors.blueSub);
        if (checkedList.includes('people')) styleGroup(8, colors.orangeHeader, colors.orangeSub);
        if (checkedList.includes('line')) styleGroup(8, colors.purpleHeader, colors.purpleSub);
        if (checkedList.includes('staff')) styleGroup(8, colors.indigoHeader, colors.indigoSub);
        if (checkedList.includes('recruit')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.greenHeader } };
            colIndex++;
        }
        if (checkedList.includes('vacancy')) styleGroup(8, colors.redHeader, colors.redSub);
        if (checkedList.includes('remark')) { worksheet.mergeCells(1, colIndex, 2, colIndex); worksheet.mergeCells(1, colIndex + 1, 2, colIndex + 1); }

        [r1, r2].forEach(row => row.eachCell(cell => { cell.font = { bold: true, name: 'Sarabun', size: 10 }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; }));

        tableDataWithSummary.forEach(item => {
            const rowValues = dataKeys.map(key => {
                // @ts-ignore
                const val = item[key];
                if (typeof val === 'number') return val;
                if (val === undefined || val === null || val === '') {
                    if (key.startsWith('frame_') || key.startsWith('people_') || key.startsWith('recruit_') || key.startsWith('vacancy_') || key.startsWith('staff_') || key.startsWith('line_')) return 0;
                    return '';
                }
                return val;
            });
            const row = worksheet.addRow(rowValues);

            if (item.key === 'TOTAL_SUMMARY') {
                // Iterate through each cell in the summary row to apply specific colors
                row.eachCell((cell, colNumber) => {
                    // dataKeys is 0-indexed, colNumber is 1-indexed
                    const key = dataKeys[colNumber - 1];
                    let fillColor = colors.graySummary; // Default for Basic info

                    if (key) {
                        if (key.startsWith('frame_')) fillColor = colors.blueSummary;
                        else if (key.startsWith('people_')) fillColor = colors.orangeSummary;
                        else if (key.startsWith('line_')) fillColor = colors.purpleSummary;
                        else if (key.startsWith('staff_')) fillColor = colors.indigoSummary;
                        else if (key.startsWith('recruit_')) fillColor = colors.greenSummary;
                        else if (key.startsWith('vacancy_')) fillColor = colors.redSummary;
                    }

                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    cell.font = { bold: true, name: 'Sarabun', size: 10 };
                    cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            } else {
                row.eachCell(cell => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.font = { name: 'Sarabun', size: 10 };
                });
            }
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Report_03_ActualSummary_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Columns Definition ---
    const columns: ColumnsType<Report3DataType> = useMemo(() => {
        const isShow = (k: string) => checkedList.includes(k);
        // ระบุ Type ตรงนี้ด้วยเพื่อความชัวร์
        const getBasicCellProps = (record: Report3DataType) => record.key === 'TOTAL_SUMMARY' ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' } : { className: 'bg-white' };

        return [
            ...(isShow('unit_short') ? [{ title: 'ชื่อย่อ', dataIndex: 'unit_short', key: 'unit_short', width: 100, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_code') ? [{ title: 'รหัส', dataIndex: 'unit_code', key: 'unit_code', width: 80, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_name') ? [{ title: 'ชื่อเต็มหน่วยงาน', dataIndex: 'unit_name', key: 'unit_name', width: 250, ellipsis: true, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('line_of_work') ? [{ title: 'สายงาน', dataIndex: 'line_of_work', key: 'line_of_work', width: 100, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('level') ? [{ title: 'ระดับ', dataIndex: 'level', key: 'level', width: 80, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('business_unit') ? [{ title: 'หน่วยธุรกิจ', dataIndex: 'business_unit', key: 'business_unit', width: 120, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('type') ? [{ title: 'ประเภท', dataIndex: 'type', key: 'type', width: 90, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('stg_non') ? [{ title: 'Stg./Non', dataIndex: 'stg_non', key: 'stg_non', width: 90, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('sup_bus') ? [{ title: 'Sup./Bus.', dataIndex: 'sup_bus', key: 'sup_bus', width: 90, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('specific') ? [{ title: 'อัตราเฉพาะตัว', dataIndex: 'specific', key: 'specific', width: 90, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),

            ...(isShow('frame') ? [{
                title: 'กรอบอัตรากำลัง ในระบบ SAP', className: 'bg-blue-200! text-blue-900 font-bold text-center',
                children: generateColumns('frame', 'bg-blue-50!', 'bg-blue-100!', true, true)
            }] : []),

            ...(isShow('people') ? [{
                title: 'จำนวนคน', className: 'bg-orange-200! text-orange-900 font-bold text-center',
                children: generateColumns('people', 'bg-orange-50!', 'bg-orange-100!', false, false)
            }] : []),

            ...(isShow('line') ? [{
                title: 'Line', className: 'bg-purple-200! text-purple-900 font-bold text-center',
                children: generateColumns('line', 'bg-purple-50!', 'bg-purple-100!', false, false)
            }] : []),

            ...(isShow('staff') ? [{
                title: 'Staff', className: 'bg-indigo-200! text-indigo-900 font-bold text-center',
                children: generateColumns('staff', 'bg-indigo-50!', 'bg-indigo-100!', false, false)
            }] : []),

            ...(isShow('recruit') ? [{
                title: 'สรรหา', dataIndex: 'recruit_total', key: 'recruit_total', width: 100, align: 'center' as const,
                onHeaderCell: () => ({ className: 'bg-green-200! text-green-900 font-bold text-center ' }),
                render: renderNumber,
                // --- แก้ไขตรงนี้: เติม : Report3DataType ---
                onCell: (record: Report3DataType) => record.key === 'TOTAL_SUMMARY' ? { className: 'bg-green-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' } : { className: 'bg-white' }
            }] : []),

            ...(isShow('vacancy') ? [{
                title: 'ว่าง', className: 'bg-red-200! text-red-900 font-bold text-center ',
                children: generateColumns('vacancy', 'bg-red-50!', 'bg-red-100!')
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
                            <h1 className="text-2xl font-bold m-0 text-white">Report 03</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">รายงานสรุปกรอบอัตรากำลังประจำเดือนของหน่วยงาน (ตามกลุ่มระดับ)</span>
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
                        />
                    </div>
                </div>
            </div >
        </Main >
    );
}