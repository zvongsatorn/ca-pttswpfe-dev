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
interface Report7DataType {
    key: string;
    unit_short: string; unit_code: string; unit_name: string;
    level: string; business_unit: string;

    // Frame (SAP)
    frame_contract_out?: number; frame_sub_contract?: number;
    frame_21?: number; frame_18_20?: number; frame_16_17?: number; frame_14_15?: number;
    frame_11_13?: number; frame_9_10?: number; frame_under_8?: number; frame_total?: number;

    // People
    people_21?: number; people_18_20?: number; people_16_17?: number; people_14_15?: number;
    people_11_13?: number; people_9_10?: number; people_under_8?: number; people_total?: number;

    // Recruit
    recruit_total?: number;

    // Vacancy
    vacancy_21?: number; vacancy_18_20?: number; vacancy_16_17?: number; vacancy_14_15?: number;
    vacancy_11_13?: number; vacancy_9_10?: number; vacancy_under_8?: number; vacancy_total?: number;

    // Manpower Landscape
    mp_vp?: number; mp_dm?: number; mp_sr?: number; mp_jr?: number; mp_total?: number;

    // Shape Ratio
    shape_vp?: number; shape_dm?: number; shape_sr?: number; shape_jr?: number; shape_total?: number;

    // % Gap
    gap_vp?: number; gap_dm?: number; gap_sr?: number; gap_jr?: number; gap_total?: number;
}

// --- 2. Constants & Helpers ---
const levelKeys = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', 'under_8', 'total'];
const levelLabels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '8 ลงมา', 'รวม'];

const metricKeys = ['vp', 'dm', 'sr', 'jr', 'total'];
const metricLabels = ['VP', 'DM', 'SR', 'JR', 'Total'];

const renderNumber = (value: any) => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number' && !Number.isInteger(value)) return Number(value.toFixed(2));
    return value;
};

// --- Column Generator for Levels ---
const generateLevelColumns = (
    prefix: string,
    themeColor: string,
    summaryColorClass: string,
    includeContractOut: boolean = false,
    includeSubContract: boolean = false
) => {
    const cols: any[] = [];
    const getCellProps = (record: Report7DataType) => {
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
                className: key === 'total' ? 'bg-yellow-200! text-yellow-900! font-bold' : `${themeColor} text-gray-700`
            }),
            render: renderNumber,
            onCell: getCellProps,
        });
    });

    if (includeContractOut) {
        cols.push({
            title: 'Contract Out', dataIndex: `${prefix}_contract_out`, key: `${prefix}_contract_out`, width: 90, align: 'center',
            onHeaderCell: () => ({ className: `${themeColor} font-bold` }), render: renderNumber,
            onCell: getCellProps,
        });
    }

    if (includeSubContract) {
        cols.push({
            title: 'Contract สัญญาย่อย', dataIndex: `${prefix}_sub_contract`, key: `${prefix}_sub_contract`, width: 100, align: 'center',
            onHeaderCell: () => ({ className: `${themeColor} font-bold` }), render: renderNumber,
            onCell: getCellProps,
        });
    }
    return cols;
};

// --- Column Generator for Metrics ---
const generateMetricColumns = (
    prefix: string,
    themeColor: string,
    summaryColorClass: string
) => {
    const cols: any[] = [];
    const getCellProps = (record: Report7DataType) => {
        if (record.key === 'TOTAL_SUMMARY') {
            return { className: `${summaryColorClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` };
        }
        return { className: 'bg-white' };
    };

    metricKeys.forEach((key, index) => {
        cols.push({
            title: metricLabels[index],
            dataIndex: `${prefix}_${key}`,
            key: `${prefix}_${key}`,
            width: 70,
            align: 'center',
            onHeaderCell: () => ({ className: `${themeColor} text-gray-700 font-bold` }),
            render: renderNumber,
            onCell: getCellProps,
        });
    });
    return cols;
};

// --- Mock Data ---
const mockData: Report7DataType[] = [
    {
        key: '1',
        unit_short: 'รมญ.', unit_code: '80000103', unit_name: 'รองกรรมการผู้จัดการใหญ่กฎหมาย', level: 'รองฯกผญ.', business_unit: 'HO',
        frame_16_17: 1, frame_14_15: 1, frame_11_13: 1, frame_total: 3,
        mp_vp: 1, mp_dm: 1, mp_sr: 1, mp_jr: 3.7, mp_total: 6.7,
        shape_vp: 1, shape_dm: 0.53, shape_sr: 0.35, shape_jr: 1.30, shape_total: 3.18,
        gap_vp: 0, gap_dm: -1, gap_sr: 1.85, gap_jr: -1, gap_total: -0.68
    },
    {
        key: '2',
        unit_short: '- มรญ.', unit_code: '80002087', unit_name: 'ฝ่ายกฎหมายองค์กรและระเบียบ', level: 'ฝ่าย', business_unit: 'HO',
        frame_14_15: 1, frame_11_13: 3, frame_9_10: 3, frame_under_8: 2, frame_total: 9,
        mp_vp: 1, mp_dm: 2.9, mp_sr: 3.6, mp_jr: 3.7, mp_total: 11.2,
        shape_vp: 1, shape_dm: 2.27, shape_sr: 2.14, shape_jr: 2.79, shape_total: 8.21,
        gap_vp: 0, gap_dm: -1, gap_sr: 0.40, gap_jr: -1, gap_total: -0.63
    },
    {
        key: '3',
        unit_short: '- ผมญ.', unit_code: '80002158', unit_name: 'ผู้ช่วยกรรมการผู้จัดการใหญ่กฎหมายองค์กร', level: 'ผช.กผญ.', business_unit: 'HO',
        frame_total: 0,
        mp_vp: 1, mp_dm: 2.9, mp_sr: 3.6, mp_jr: 3.7, mp_total: 11.2,
        shape_vp: 1, shape_dm: 1, shape_sr: 1, shape_jr: 1, shape_total: 4,
        gap_vp: -1, gap_dm: -1, gap_sr: -1, gap_jr: -1, gap_total: -1
    },
    {
        key: '4',
        unit_short: '- มธญ.', unit_code: '80000867', unit_name: 'ฝ่ายกฎหมายลงทุนและธุรกิจองค์กร', level: 'ฝ่าย', business_unit: 'HO',
        frame_14_15: 1, frame_11_13: 4, frame_9_10: 3, frame_under_8: 2, frame_total: 10, frame_contract_out: 1, frame_sub_contract: 1,
        mp_vp: 1, mp_dm: 2.9, mp_sr: 3.6, mp_jr: 3.7, mp_total: 11.2,
        shape_vp: 1, shape_dm: 1, shape_sr: 1, shape_jr: 3.26, shape_total: 6.26,
        gap_vp: 0, gap_dm: -1, gap_sr: 3, gap_jr: -1, gap_total: -0.52
    }
];

const businessUnitOptions = Array.from(new Set(mockData.map(item => item.business_unit))).sort();
const orgUnitOptions = Array.from(new Set(mockData.map(item => item.unit_name))).sort();
const lineOfWorkOptions = ['รอง/ปธ', 'รองกผญ', 'รกญ.'];

const columnOptions = [
    { label: 'ชื่อย่อ', value: 'unit_short' },
    { label: 'รหัส', value: 'unit_code' },
    { label: 'ชื่อเต็มหน่วยงาน', value: 'unit_name' },
    { label: 'ระดับ', value: 'level' },
    { label: 'หน่วยธุรกิจ', value: 'business_unit' },
    { label: 'กรอบอัตรากำลัง (Frame)', value: 'frame' },
    { label: 'จำนวนคน (People)', value: 'people' },
    { label: 'สรรหา (Recruit)', value: 'recruit' },
    { label: 'ว่าง (Vacancy)', value: 'vacancy' },
    { label: 'Manpower Landscape', value: 'mp' },
    { label: 'Shape Ratio', value: 'shape' },
    { label: '% Gap', value: 'gap' },
];

const defaultCheckedList = [
    'unit_short', 'unit_code', 'unit_name', 'level', 'business_unit',
    'frame', 'people', 'vacancy', 'mp', 'shape', 'gap'
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

export default function Report7Page() {
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<any[]>(defaultCheckedList);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Filters
    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>(businessUnitOptions);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>(orgUnitOptions);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>(lineOfWorkOptions);

    const onSearch = (values: any) => {
        setLoading(true);
        setTimeout(() => setLoading(false), 800);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const filteredData = useMemo(() => {
        return mockData.filter(item =>
            selectedBusinessUnits.includes(item.business_unit) &&
            selectedOrgUnits.includes(item.unit_name)
        );
    }, [selectedBusinessUnits, selectedOrgUnits]);

    const tableDataWithSummary = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];
        const totalRow: any = {
            key: 'TOTAL_SUMMARY',
            unit_short: '', unit_code: '', unit_name: 'รวมทั้งสิ้น (Grand Total)',
            level: '', business_unit: '',
        };
        filteredData.forEach(item => {
            Object.keys(item).forEach(key => {
                const value = (item as any)[key];
                if (typeof value === 'number') {
                    totalRow[key] = (totalRow[key] || 0) + value;
                }
            });
        });
        return [...filteredData, totalRow];
    }, [filteredData]);

    // --- Excel Export Logic ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 07');
        const colors = {
            blueHeader: 'FFBFDBFE', blueSub: 'FFF0F9FF',
            orangeHeader: 'FFFED7AA', orangeSub: 'FFFFF7ED',
            greenHeader: 'FFBBF7D0', greenSub: 'FFF0FDF4',
            redHeader: 'FFFECACA', redSub: 'FFFEF2F2',
            purpleHeader: 'FFE9D5FF', purpleSub: 'FFFAF5FF',
            tealHeader: 'FF99F6E4', tealSub: 'FFF0FDFA',
            indigoHeader: 'FFC7D2FE', indigoSub: 'FFEEF2FF',
            grayHeader: 'FFE5E7EB', yellowTotal: 'FFFEF9C3',
            graySummary: 'FFF3F4F6',
            blueSummary: 'FFDBEAFE',
            orangeSummary: 'FFFFEDD5',
            greenSummary: 'FFDCFCE7',
            redSummary: 'FFFEE2E2',
        };

        let headersRow1: string[] = [];
        let headersRow2: string[] = [];
        let dataKeys: string[] = [];

        // Function to add standardized groups
        const addGroup = (title: string, prefix: string, keys: string[], labels: string[], includeContractOut = false, includeSubContract = false) => {
            const subCols = [];
            keys.forEach((k, i) => subCols.push({ title: labels[i], key: `${prefix}_${k}` }));
            if (includeContractOut) subCols.push({ title: 'Contract Out', key: `${prefix}_contract_out` });
            if (includeSubContract) subCols.push({ title: 'Sub-contract', key: `${prefix}_sub_contract` });

            headersRow1.push(title);
            for (let i = 1; i < subCols.length; i++) headersRow1.push('');
            subCols.forEach(c => { headersRow2.push(c.title); dataKeys.push(c.key); });
        };

        const basicCols = [
            { t: 'ชื่อย่อ', k: 'unit_short' }, { t: 'รหัส', k: 'unit_code' }, { t: 'ชื่อเต็ม', k: 'unit_name' },
            { t: 'ระดับ', k: 'level' }, { t: 'หน่วยธุรกิจ', k: 'business_unit' }
        ];
        let basicInfoCount = 0;
        basicCols.forEach(c => { if (checkedList.includes(c.k)) { headersRow1.push(c.t); headersRow2.push(''); dataKeys.push(c.k); basicInfoCount++; } });

        if (checkedList.includes('frame')) addGroup('กรอบอัตรากำลัง ในระบบ SAP', 'frame', levelKeys, levelLabels, true, true);
        if (checkedList.includes('people')) addGroup('จำนวนคน', 'people', levelKeys, levelLabels);
        if (checkedList.includes('recruit')) { headersRow1.push('สรรหา'); headersRow2.push(''); dataKeys.push('recruit_total'); }
        if (checkedList.includes('vacancy')) addGroup('ว่าง', 'vacancy', levelKeys, levelLabels);
        if (checkedList.includes('mp')) addGroup('Manpower Landscape', 'mp', metricKeys, metricLabels);
        if (checkedList.includes('shape')) addGroup('Shape Ratio', 'shape', metricKeys, metricLabels);
        if (checkedList.includes('gap')) addGroup('% Gap', 'gap', metricKeys, metricLabels);

        // Render Headers
        const r1 = worksheet.addRow(headersRow1);
        const r2 = worksheet.addRow(headersRow2);

        // Style Headers
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
                const title = headersRow2[colIndex + i - 1];
                let bg = subColor;
                if (title === 'รวม' || title === 'Total') bg = colors.yellowTotal;
                subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                subCell.alignment = { horizontal: 'center' };
            }
            colIndex += count;
        };

        if (checkedList.includes('frame')) styleGroup(10, colors.blueHeader, colors.blueSub);
        if (checkedList.includes('people')) styleGroup(8, colors.orangeHeader, colors.orangeSub);
        if (checkedList.includes('recruit')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.greenHeader } };
            colIndex++;
        }
        if (checkedList.includes('vacancy')) styleGroup(8, colors.redHeader, colors.redSub);
        if (checkedList.includes('mp')) styleGroup(5, colors.purpleHeader, colors.purpleSub);
        if (checkedList.includes('shape')) styleGroup(5, colors.tealHeader, colors.tealSub);
        if (checkedList.includes('gap')) styleGroup(5, colors.indigoHeader, colors.indigoSub);

        [r1, r2].forEach(row => row.eachCell(cell => {
            cell.font = { bold: true, name: 'Sarabun', size: 10 };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }));

        // Render Data
        tableDataWithSummary.forEach(item => {
            const rowValues = dataKeys.map(key => {
                // @ts-ignore
                const val = item[key];

                // Case 1: Value is a number (including 0)
                if (typeof val === 'number') {
                    // Format decimal points for ratios
                    if (key.startsWith('shape') || key.startsWith('gap') || key.startsWith('mp')) {
                        return Number(val.toFixed(2));
                    }
                    return val;
                }

                // Case 2: Value is missing/null/empty string
                // If it is a numeric column, FORCE return 0
                if (val === undefined || val === null || val === '') {
                    if (
                        key.startsWith('frame_') ||
                        key.startsWith('people_') ||
                        key.startsWith('recruit_') ||
                        key.startsWith('vacancy_') ||
                        key.startsWith('mp_') ||
                        key.startsWith('shape_') ||
                        key.startsWith('gap_')
                    ) {
                        return 0;
                    }
                    // For text columns, return empty string
                    return '';
                }
                return val;
            });
            const row = worksheet.addRow(rowValues);

            // Styling
            if (item.key === 'TOTAL_SUMMARY') {
                row.eachCell((cell, colNumber) => {
                    const key = dataKeys[colNumber - 1];
                    let fillColor = colors.graySummary;
                    if (key) {
                        if (key.startsWith('frame_')) fillColor = colors.blueSummary;
                        else if (key.startsWith('people_')) fillColor = colors.orangeSummary;
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
        saveAs(blob, `Report_07_Summary_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Columns Definition ---
    const columns: ColumnsType<Report7DataType> = useMemo(() => {
        const isShow = (k: string) => checkedList.includes(k);
        const getBasicCellProps = (record: Report7DataType) => record.key === 'TOTAL_SUMMARY' ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' } : { className: 'bg-white' };

        return [
            ...(isShow('unit_short') ? [{ title: 'ชื่อย่อ', dataIndex: 'unit_short', key: 'unit_short', width: 100, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_code') ? [{ title: 'รหัส', dataIndex: 'unit_code', key: 'unit_code', width: 80, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_name') ? [{ title: 'ชื่อเต็มหน่วยงาน', dataIndex: 'unit_name', key: 'unit_name', width: 250, ellipsis: true, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('level') ? [{ title: 'ระดับ', dataIndex: 'level', key: 'level', width: 80, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('business_unit') ? [{ title: 'หน่วยธุรกิจ', dataIndex: 'business_unit', key: 'business_unit', width: 100, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),

            ...(isShow('frame') ? [{
                title: 'กรอบอัตรากำลัง ในระบบ SAP', className: 'bg-blue-200! text-blue-900 font-bold text-center',
                children: generateLevelColumns('frame', 'bg-blue-50!', 'bg-blue-100!', true, true)
            }] : []),

            ...(isShow('people') ? [{
                title: 'จำนวนคน', className: 'bg-orange-200! text-orange-900 font-bold text-center',
                children: generateLevelColumns('people', 'bg-orange-50!', 'bg-orange-100!', false, false)
            }] : []),

            ...(isShow('recruit') ? [{
                title: 'สรรหา', dataIndex: 'recruit_total', key: 'recruit_total', width: 80, align: 'center' as const,
                onHeaderCell: () => ({ className: 'bg-green-200! text-green-900 font-bold text-center ' }),
                render: renderNumber,
                onCell: (record: Report7DataType) => record.key === 'TOTAL_SUMMARY' ? { className: 'bg-green-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' } : { className: 'bg-white' }
            }] : []),

            ...(isShow('vacancy') ? [{
                title: 'ว่าง', className: 'bg-red-200! text-red-900 font-bold text-center ',
                children: generateLevelColumns('vacancy', 'bg-red-50!', 'bg-red-100!')
            }] : []),

            ...(isShow('mp') ? [{
                title: 'Manpower Landscape', className: 'bg-purple-200! text-purple-900 font-bold text-center',
                children: generateMetricColumns('mp', 'bg-purple-50!', 'bg-purple-100!')
            }] : []),

            ...(isShow('shape') ? [{
                title: 'Shape Ratio', className: 'bg-teal-200! text-teal-900 font-bold text-center',
                children: generateMetricColumns('shape', 'bg-teal-50!', 'bg-teal-100!')
            }] : []),

            ...(isShow('gap') ? [{
                title: '% Gap', className: 'bg-indigo-200! text-indigo-900 font-bold text-center',
                children: generateMetricColumns('gap', 'bg-indigo-50!', 'bg-indigo-100!')
            }] : []),
        ];
    }, [checkedList]);

    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">Report 07</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">รายงาน Manpower Landscape</span>
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