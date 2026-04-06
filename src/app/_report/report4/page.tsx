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
interface Report4DataType {
    key: string;
    unit_short: string; unit_code: string; unit_name: string;
    line_of_work: string; level: string; business_unit: string;

    // Frame Staff (กรอบพนักงาน)
    frame_staff_21?: number; frame_staff_21_change?: number;
    frame_staff_18_20?: number; frame_staff_18_20_change?: number;
    frame_staff_16_17?: number; frame_staff_16_17_change?: number;
    frame_staff_14_15?: number; frame_staff_14_15_change?: number;
    frame_staff_11_13?: number; frame_staff_11_13_change?: number;
    frame_staff_9_10?: number; frame_staff_9_10_change?: number;
    frame_staff_under_8?: number; frame_staff_under_8_change?: number;
    frame_staff_total?: number; frame_staff_total_change?: number;

    // People Normal (คนปกติ & Pool RS)
    people_normal_21?: number; people_normal_21_change?: number;
    people_normal_18_20?: number; people_normal_18_20_change?: number;
    people_normal_16_17?: number; people_normal_16_17_change?: number;
    people_normal_14_15?: number; people_normal_14_15_change?: number;
    people_normal_11_13?: number; people_normal_11_13_change?: number;
    people_normal_9_10?: number; people_normal_9_10_change?: number;
    people_normal_under_8?: number; people_normal_under_8_change?: number;
    people_normal_total?: number; people_normal_total_change?: number;

    // Frame Sec (กรอบ Secondment)
    frame_sec_21?: number; frame_sec_21_change?: number;
    frame_sec_18_20?: number; frame_sec_18_20_change?: number;
    frame_sec_16_17?: number; frame_sec_16_17_change?: number;
    frame_sec_14_15?: number; frame_sec_14_15_change?: number;
    frame_sec_11_13?: number; frame_sec_11_13_change?: number;
    frame_sec_9_10?: number; frame_sec_9_10_change?: number;
    frame_sec_under_8?: number; frame_sec_under_8_change?: number;
    frame_sec_total?: number; frame_sec_total_change?: number;

    // People Sec (คน Secondment)
    people_sec_21?: number; people_sec_21_change?: number;
    people_sec_18_20?: number; people_sec_18_20_change?: number;
    people_sec_16_17?: number; people_sec_16_17_change?: number;
    people_sec_14_15?: number; people_sec_14_15_change?: number;
    people_sec_11_13?: number; people_sec_11_13_change?: number;
    people_sec_9_10?: number; people_sec_9_10_change?: number;
    people_sec_under_8?: number; people_sec_under_8_change?: number;
    people_sec_total?: number; people_sec_total_change?: number;

    // Total Frame (รวมกรอบ)
    total_frame_normal?: number; total_frame_normal_change?: number;
    total_frame_pool?: number; total_frame_pool_change?: number;
    total_frame_trad?: number; total_frame_trad_change?: number;
    total_frame_newbiz?: number; total_frame_newbiz_change?: number;
    total_frame_total?: number; total_frame_total_change?: number;

    // Total People (รวมคน)
    total_people_normal?: number; total_people_normal_change?: number;
    total_people_pool?: number; total_people_pool_change?: number;
    total_people_trad?: number; total_people_trad_change?: number;
    total_people_newbiz?: number; total_people_newbiz_change?: number;
    total_people_total?: number; total_people_total_change?: number;

    // Recruit & Vacancy
    recruit_total?: number; recruit_total_change?: number;

    vacancy_21?: number; vacancy_21_change?: number;
    vacancy_18_20?: number; vacancy_18_20_change?: number;
    vacancy_16_17?: number; vacancy_16_17_change?: number;
    vacancy_14_15?: number; vacancy_14_15_change?: number;
    vacancy_11_13?: number; vacancy_11_13_change?: number;
    vacancy_9_10?: number; vacancy_9_10_change?: number;
    vacancy_under_8?: number; vacancy_under_8_change?: number;
    vacancy_total?: number; vacancy_total_change?: number;

    // Contact Out
    contact_out?: number; contact_out_change?: number;
    contact_out_sub?: number; contact_out_sub_change?: number;

    remark?: string; log?: string;
}

const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];
// --- 2. Constants & Helpers ---
const levelKeys = ['21', '18_20', '16_17', '14_15', '11_13', '9_10', 'under_8', 'total'];
const levelLabels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '8 ลงมา', 'รวม'];

const renderNumber = (value: any) => {
    if (value === undefined || value === null || value === '') return 0;
    return value;
};

const renderChange = (value: any) => {
    if (value === undefined || value === null || value === '') return 0;
    const num = Number(value);
    if (num === 0) return 0;
    if (num > 0) return <span className="text-blue-600 font-bold">+{num}</span>;
    if (num < 0) return <span className="text-red-600 font-bold">{num}</span>;
    return 0;
};

// --- generateColumns ---
const generateColumns = (
    prefix: string,
    themeColor: string,
    summaryColorClass: string,
    isTotalGroup: boolean = false,
    showChange: boolean = true
) => {
    const cols: any[] = [];

    const getCellProps = (record: Report4DataType) => {
        if (record.key === 'TOTAL_SUMMARY') {
            return { className: `${summaryColorClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` };
        }
        return { className: 'bg-white' };
    };

    if (isTotalGroup) {
        // Special case for Total Frame / Total People which have specific sub-columns
        const subKeys = ['normal', 'pool', 'trad', 'newbiz', 'total'];
        const subLabels = ['ปกติ', 'Pool RS', 'Traditional', 'New Biz', 'รวม'];

        subKeys.forEach((key, index) => {
            cols.push({
                title: subLabels[index],
                dataIndex: `${prefix}_${key}`,
                key: `${prefix}_${key}`,
                width: 60,
                align: 'center',
                onHeaderCell: () => ({ className: `${themeColor} text-gray-700` }),
                render: renderNumber,
                onCell: getCellProps,
            });
            if (showChange) {
                cols.push({
                    title: '+/-',
                    dataIndex: `${prefix}_${key}_change`,
                    key: `${prefix}_${key}_change`,
                    width: 50,
                    align: 'center',
                    onHeaderCell: () => ({ className: `${themeColor} text-gray-700` }),
                    render: renderChange,
                    onCell: getCellProps,
                });
            }
        });

    } else {
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

            // Add Change Column
            if (showChange) {
                cols.push({
                    title: '+/-',
                    dataIndex: `${prefix}_${key}_change`,
                    key: `${prefix}_${key}_change`,
                    width: 50,
                    align: 'center',
                    className: headerClassName,
                    onHeaderCell: () => ({
                        className: key === 'total'
                            ? 'bg-yellow-200! text-yellow-900! font-bold'
                            : `${themeColor} text-gray-700`
                    }),
                    render: renderChange,
                    onCell: getCellProps,
                });
            }
        });
    }

    return cols;
};

// Mock Data
const mockData: Report4DataType[] = [
    {
        key: '1',
        unit_short: 'GRP (Sec Pool)', unit_code: '80001883', unit_name: 'บริษัท โกลบอล รีนิวเอเบิล เพาเวอร์ จำกัด (Secondment Pool)',
        line_of_work: 'รอง/ปธ', level: 'ผช.กผญ.', business_unit: 'CNBO-Secondment',

        frame_staff_total: 0, frame_staff_total_change: 0,
        people_normal_total: 0, people_normal_total_change: 0,

        frame_sec_total: 1, frame_sec_total_change: 1,
        people_sec_total: 1, people_sec_total_change: 1,

        total_frame_total: 1, total_frame_total_change: 1,
        total_people_total: 1, total_people_total_change: 1,

        recruit_total: 0, recruit_total_change: 0,
        vacancy_total: 0, vacancy_total_change: 0,
        contact_out: 0, contact_out_change: 0,
        contact_out_sub: 0, contact_out_sub_change: 0,

        remark: '01/01/2568: โอนกรอบอัตรากำลังจาก ปธม.'
    },
    {
        key: '2',
        unit_short: 'PTTEP (Sec Pool)', unit_code: '80000143', unit_name: 'บริษัทปตท.สำรวจและผลิตปิโตรเลียม จำกัด (Secondment Pool)',
        line_of_work: 'รองกผญ', level: 'รองฯกผญ.', business_unit: 'COOU-Secondment',

        frame_staff_16_17: 1, frame_staff_16_17_change: 0,
        frame_staff_11_13: 1, frame_staff_11_13_change: -1,
        frame_staff_total: 2, frame_staff_total_change: -1,

        people_normal_16_17: 1, people_normal_16_17_change: 0,
        people_normal_11_13: 1, people_normal_11_13_change: -1,
        people_normal_total: 2, people_normal_total_change: -1,

        total_frame_total: 2, total_frame_total_change: -1,
        total_people_total: 2, total_people_total_change: -1,

        recruit_total: 0, recruit_total_change: 0,
        vacancy_total: 0, vacancy_total_change: 0,
        contact_out: 0, contact_out_change: 0,
        contact_out_sub: 0, contact_out_sub_change: 0,

        remark: 'PTTMC 42/2567 : ลดกรอบอัตรากำลัง'
    },
    {
        key: '3',
        unit_short: 'PTT Test', unit_code: '80000099', unit_name: 'บริษัท ทดสอบ จำกัด',
        line_of_work: 'รองกผญ', level: 'ผจก.', business_unit: 'CDO-Secondment',

        frame_staff_14_15: 2, frame_staff_14_15_change: 1,
        frame_staff_total: 2, frame_staff_total_change: 1,

        people_normal_14_15: 1, people_normal_14_15_change: 0,
        people_normal_total: 1, people_normal_total_change: 0,

        total_frame_total: 2, total_frame_total_change: 1,
        total_people_total: 1, total_people_total_change: 0,

        recruit_total: 1, recruit_total_change: 1,
        vacancy_total: 1, vacancy_total_change: 1,
        contact_out: 0, contact_out_change: 0,
        contact_out_sub: 0, contact_out_sub_change: 0,

        remark: 'เพิ่มอัตรากำลังใหม่'
    },
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
    { label: 'กรอบพนักงาน', value: 'frame_staff' },
    { label: 'คนปกติ & Pool RS', value: 'people_normal' },
    { label: 'กรอบ Secondment', value: 'frame_sec' },
    { label: 'คน Secondment', value: 'people_sec' },
    { label: 'รวมกรอบ', value: 'total_frame' },
    { label: 'รวมคน', value: 'total_people' },
    { label: 'สรรหา', value: 'recruit' },
    { label: 'ว่าง', value: 'vacancy' },
    { label: 'Contact Out', value: 'contact_out' },
    { label: 'Contact Out สัญญาย่อย', value: 'contact_out_sub' },
    { label: 'หมายเหตุ', value: 'remark' },
    { label: 'Log', value: 'log' },
];

const defaultCheckedList = [
    'unit_short', 'unit_code', 'unit_name', 'line_of_work', 'level', 'business_unit',
    'frame_staff', 'people_normal', 'vacancy', 'remark'
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

export default function Report4Page() {
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
            line_of_work: '', level: '', business_unit: '', remark: '', log: ''
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
        const worksheet = workbook.addWorksheet('Report 04');
        const colors = {
            blueHeader: 'FFBFDBFE', blueSub: 'FFF0F9FF',
            orangeHeader: 'FFFED7AA', orangeSub: 'FFFFF7ED',
            greenHeader: 'FFBBF7D0', greenSub: 'FFF0FDF4',
            redHeader: 'FFFECACA', redSub: 'FFFEF2F2',
            purpleHeader: 'FFD8B4FE',
            grayHeader: 'FFE5E7EB', yellowTotal: 'FFFEF9C3',
            // Summary Colors (Shade 100)
            graySummary: 'FFF3F4F6',
            blueSummary: 'FFDBEAFE',
            orangeSummary: 'FFFFEDD5',
            greenSummary: 'FFDCFCE7',
            redSummary: 'FFFEE2E2',
            purpleSummary: 'FFEDE9FE',
        };

        let headersRow1: string[] = [];
        let headersRow2: string[] = [];
        let dataKeys: string[] = [];

        const addGroup = (title: string, prefix: string, color: string, isTotalGroup = false, showChange = true) => {
            const subCols: { title: string; key: string }[] = [];
            if (isTotalGroup) {
                const subKeys = ['normal', 'pool', 'trad', 'newbiz', 'total'];
                const subLabels = ['ปกติ', 'Pool RS', 'Traditional', 'New Biz', 'รวม'];
                subKeys.forEach((k, i) => {
                    subCols.push({ title: subLabels[i], key: `${prefix}_${k}` });
                    if (showChange) subCols.push({ title: '+/-', key: `${prefix}_${k}_change` });
                });
            } else {
                levelKeys.forEach((k, i) => {
                    subCols.push({ title: levelLabels[i], key: `${prefix}_${k}` });
                    if (showChange) subCols.push({ title: '+/-', key: `${prefix}_${k}_change` });
                });
            }

            headersRow1.push(title);
            for (let i = 1; i < subCols.length; i++) headersRow1.push('');
            subCols.forEach(c => { headersRow2.push(c.title); dataKeys.push(c.key); });
        };

        const basicCols = [
            { t: 'ชื่อย่อ', k: 'unit_short' }, { t: 'รหัส', k: 'unit_code' }, { t: 'ชื่อเต็ม', k: 'unit_name' },
            { t: 'สายงาน', k: 'line_of_work' }, { t: 'ระดับ', k: 'level' }, { t: 'หน่วยธุรกิจ', k: 'business_unit' }
        ];
        let basicInfoCount = 0;
        basicCols.forEach(c => { if (checkedList.includes(c.k)) { headersRow1.push(c.t); headersRow2.push(''); dataKeys.push(c.k); basicInfoCount++; } });

        if (checkedList.includes('frame_staff')) addGroup('กรอบพนักงาน', 'frame_staff', colors.blueHeader);
        if (checkedList.includes('people_normal')) addGroup('คนปกติ & Pool RS', 'people_normal', colors.orangeHeader);
        if (checkedList.includes('frame_sec')) addGroup('กรอบ Secondment', 'frame_sec', colors.blueHeader);
        if (checkedList.includes('people_sec')) addGroup('คน Secondment', 'people_sec', colors.orangeHeader);
        if (checkedList.includes('total_frame')) addGroup('รวมกรอบ', 'total_frame', colors.blueHeader, true);
        if (checkedList.includes('total_people')) addGroup('รวมคน', 'total_people', colors.orangeHeader, true);

        if (checkedList.includes('recruit')) {
            headersRow1.push('สรรหา');
            headersRow2.push('');
            dataKeys.push('recruit_total');
        }
        if (checkedList.includes('vacancy')) addGroup('ว่าง', 'vacancy', colors.redHeader, false, false);

        if (checkedList.includes('contact_out')) {
            headersRow1.push('Contact Out');
            headersRow2.push('');
            dataKeys.push('contact_out');
        }
        if (checkedList.includes('contact_out_sub')) {
            headersRow1.push('Contact Out สัญญาย่อย');
            headersRow2.push('');
            dataKeys.push('contact_out_sub');
        }

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
                // Check if it's a "Total" column or "Change" column for specific coloring
                const title = headersRow2[colIndex + i - 1];
                let cellColor = subColor;
                if (title === 'รวม') cellColor = colors.yellowTotal;

                subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellColor } };
                subCell.alignment = { horizontal: 'center' };
            }
            colIndex += count;
        };

        // Level groups have 8 levels * 2 columns (val + change) = 16 columns
        if (checkedList.includes('frame_staff')) styleGroup(16, colors.blueHeader, colors.blueSub);
        if (checkedList.includes('people_normal')) styleGroup(16, colors.orangeHeader, colors.orangeSub);
        if (checkedList.includes('frame_sec')) styleGroup(16, colors.blueHeader, colors.blueSub);
        if (checkedList.includes('people_sec')) styleGroup(16, colors.orangeHeader, colors.orangeSub);

        // Total groups have 5 types * 2 columns = 10 columns
        if (checkedList.includes('total_frame')) styleGroup(10, colors.blueHeader, colors.blueSub);
        if (checkedList.includes('total_people')) styleGroup(10, colors.orangeHeader, colors.orangeSub);

        if (checkedList.includes('recruit')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.greenHeader } };
            worksheet.getCell(1, colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
            colIndex += 1;
        }
        if (checkedList.includes('vacancy')) styleGroup(8, colors.redHeader, colors.redSub);

        if (checkedList.includes('contact_out')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.purpleHeader } };
            worksheet.getCell(1, colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
            colIndex += 1;
        }
        if (checkedList.includes('contact_out_sub')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.purpleHeader } };
            worksheet.getCell(1, colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
            colIndex += 1;
        }

        if (checkedList.includes('remark')) { worksheet.mergeCells(1, colIndex, 2, colIndex); colIndex++; }
        if (checkedList.includes('log')) { worksheet.mergeCells(1, colIndex, 2, colIndex); colIndex++; }

        [r1, r2].forEach(row => row.eachCell(cell => { cell.font = { bold: true, name: 'Sarabun', size: 10 }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; }));

        tableDataWithSummary.forEach(item => {
            const rowValues = dataKeys.map(key => {
                // @ts-ignore
                const val = item[key];
                if (typeof val === 'number') return val;
                if (val === undefined || val === null || val === '') {
                    if (key.includes('change')) return 0;
                    if (key.includes('frame') || key.includes('people') || key.includes('recruit') || key.includes('vacancy') || key.includes('contact')) return 0;
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
                        if (key.includes('frame')) fillColor = colors.blueSummary;
                        else if (key.includes('people')) fillColor = colors.orangeSummary;
                        else if (key.includes('recruit')) fillColor = colors.greenSummary;
                        else if (key.includes('vacancy')) fillColor = colors.redSummary;
                        else if (key.includes('contact')) fillColor = colors.purpleSummary;
                    }

                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    cell.font = { bold: true, name: 'Sarabun', size: 10 };
                    cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    // Conditional Formatting for Change columns in Summary
                    if (key && key.includes('change')) {
                        // @ts-ignore
                        const val = item[key];
                        if (typeof val === 'number') {
                            if (val > 0) cell.font = { color: { argb: 'FF2563EB' }, bold: true, name: 'Sarabun', size: 10 }; // Blue
                            else if (val < 0) cell.font = { color: { argb: 'FFDC2626' }, bold: true, name: 'Sarabun', size: 10 }; // Red
                        }
                    }
                });
            } else {
                row.eachCell((cell, colNumber) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.font = { name: 'Sarabun', size: 10 };

                    const key = dataKeys[colNumber - 1];
                    // Conditional Formatting for Change columns in Rows
                    if (key && key.includes('change')) {
                        // @ts-ignore
                        const val = item[key];
                        if (typeof val === 'number') {
                            if (val > 0) cell.font = { color: { argb: 'FF2563EB' }, name: 'Sarabun', size: 10, bold: true }; // Blue
                            else if (val < 0) cell.font = { color: { argb: 'FFDC2626' }, name: 'Sarabun', size: 10, bold: true }; // Red
                        }
                    }
                });
            }
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Report_04_ActualSummary_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Columns Definition ---
    const columns: ColumnsType<Report4DataType> = useMemo(() => {
        const isShow = (k: string) => checkedList.includes(k);
        const getBasicCellProps = (record: Report4DataType) => record.key === 'TOTAL_SUMMARY' ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' } : { className: 'bg-white' };
        const getColoredCellProps = (record: Report4DataType, colorClass: string) => record.key === 'TOTAL_SUMMARY' ? { className: `${colorClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` } : { className: 'bg-white' };

        return [
            ...(isShow('unit_short') ? [{ title: 'ชื่อย่อ', dataIndex: 'unit_short', key: 'unit_short', width: 100, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_code') ? [{ title: 'รหัส', dataIndex: 'unit_code', key: 'unit_code', width: 80, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_name') ? [{ title: 'ชื่อเต็มหน่วยงาน', dataIndex: 'unit_name', key: 'unit_name', width: 250, ellipsis: true, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('line_of_work') ? [{ title: 'สายงาน', dataIndex: 'line_of_work', key: 'line_of_work', width: 100, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('level') ? [{ title: 'ระดับ', dataIndex: 'level', key: 'level', width: 80, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('business_unit') ? [{ title: 'หน่วยธุรกิจ', dataIndex: 'business_unit', key: 'business_unit', width: 120, onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }), onCell: getBasicCellProps }] : []),

            ...(isShow('frame_staff') ? [{
                title: 'กรอบพนักงาน', className: 'bg-blue-200! text-blue-900 font-bold text-center',
                children: generateColumns('frame_staff', 'bg-blue-50!', 'bg-blue-100!')
            }] : []),

            ...(isShow('people_normal') ? [{
                title: 'คนปกติ & Pool RS', className: 'bg-orange-200! text-orange-900 font-bold text-center',
                children: generateColumns('people_normal', 'bg-orange-50!', 'bg-orange-100!')
            }] : []),

            ...(isShow('frame_sec') ? [{
                title: 'กรอบ Secondment', className: 'bg-blue-200! text-blue-900 font-bold text-center',
                children: generateColumns('frame_sec', 'bg-blue-50!', 'bg-blue-100!')
            }] : []),

            ...(isShow('people_sec') ? [{
                title: 'คน Secondment', className: 'bg-orange-200! text-orange-900 font-bold text-center',
                children: generateColumns('people_sec', 'bg-orange-50!', 'bg-orange-100!')
            }] : []),

            ...(isShow('total_frame') ? [{
                title: 'รวมกรอบ', className: 'bg-blue-200! text-blue-900 font-bold text-center',
                children: generateColumns('total_frame', 'bg-blue-50!', 'bg-blue-100!', true)
            }] : []),

            ...(isShow('total_people') ? [{
                title: 'รวมคน', className: 'bg-orange-200! text-orange-900 font-bold text-center',
                children: generateColumns('total_people', 'bg-orange-50!', 'bg-orange-100!', true)
            }] : []),

            ...(isShow('recruit') ? [{
                title: 'สรรหา', dataIndex: 'recruit_total', key: 'recruit_total', width: 70, align: 'center' as const,
                onHeaderCell: () => ({ className: 'bg-green-200! text-green-900 font-bold' }), render: renderNumber,
                onCell: (record: Report4DataType) => getColoredCellProps(record, 'bg-green-100!')
            }] : []),

            ...(isShow('vacancy') ? [{
                title: 'ว่าง', className: 'bg-red-200! text-red-900 font-bold text-center ',
                children: generateColumns('vacancy', 'bg-red-50!', 'bg-red-100!', false, false)
            }] : []),

            ...(isShow('contact_out') ? [{
                title: 'Contact Out', dataIndex: 'contact_out', key: 'contact_out', width: 90, align: 'center' as const,
                onHeaderCell: () => ({ className: 'bg-purple-200! text-purple-900 font-bold' }), render: renderNumber,
                onCell: (record: Report4DataType) => getColoredCellProps(record, 'bg-purple-100!')
            }] : []),

            ...(isShow('contact_out_sub') ? [{
                title: 'Contact Out สัญญาย่อย', dataIndex: 'contact_out_sub', key: 'contact_out_sub', width: 120, align: 'center' as const,
                onHeaderCell: () => ({ className: 'bg-purple-200! text-purple-900 font-bold' }), render: renderNumber,
                onCell: (record: Report4DataType) => getColoredCellProps(record, 'bg-purple-100!')
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
                            <h1 className="text-2xl font-bold m-0 text-white">Report 04</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">รายงานสรุปกรอบอัตรากำลังประจำเดือนของหน่วยงาน (ตามประเภทกรอบอัตรา)</span>
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
