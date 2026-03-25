'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Form, Select, DatePicker, Popover, Checkbox } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined, FileExcelOutlined, FullscreenOutlined,
    FullscreenExitOutlined, SettingOutlined
} from '@ant-design/icons';
import { ChevronDown, Search, Check } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

dayjs.locale('th');

// --- 1. Type Definitions ---
interface Report5DataType {
    key: string;
    unit_short: string;
    unit_code: string;
    unit_name: string;
    date: string;
    frame_21?: number;
    frame_18_20?: number;
    frame_16_17?: number;
    frame_14_15?: number;
    frame_11_13?: number;
    frame_9_10?: number;
    frame_under_8?: number;
    frame_total?: number;
    operator?: string;
    remark?: string;
    log?: string;
    line_of_work: string; // Added for filtering
    business_unit: string; // Added for filtering
    dataset: string; // Added for filtering
}

// --- 2. Constants & Helpers ---
const levelKeys = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', 'under_8', 'total'];
const levelLabels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '8 ลงมา', 'รวม'];

const renderNumber = (value: any) => {
    if (value === undefined || value === null || value === '') return 0;
    return value;
};

const columnOptions = [
    { label: 'ชื่อย่อ', value: 'unit_short' },
    { label: 'รหัส', value: 'unit_code' },
    { label: 'ชื่อเต็ม', value: 'unit_name' },
    { label: 'วันที่', value: 'date' },
    { label: 'ชุดข้อมูล', value: 'dataset' },
    { label: 'กรอบอัตรากำลัง', value: 'frame' },
    { label: 'ผู้ดำเนินการ', value: 'operator' },
    { label: 'หมายเหตุ', value: 'remark' },
    { label: 'Log', value: 'log' },
];

const defaultCheckedList = ['unit_short', 'unit_code', 'unit_name', 'date', 'dataset', 'frame', 'operator', 'remark', 'log'];

// --- MultiSelectFilter Component (Copied from Report 3) ---
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

// Mock Data
const mockData: Report5DataType[] = [
    // Unit 1: CEO
    {
        key: '1-1', unit_short: 'ปชส./กพญ.', unit_code: '80000001', unit_name: 'ปธ.จท.บริหารและกรรมการผู้จัดการใหญ่', date: '01/11/2025',
        line_of_work: 'กพญ.', business_unit: 'CEO', dataset: 'ปกติ',
        frame_21: 1, frame_18_20: 1, frame_16_17: 0, frame_14_15: 0, frame_11_13: 0, frame_9_10: 0, frame_under_8: 0, frame_total: 2,
        operator: '', remark: '', log: ''
    },


    // Unit 2: Company Secretary
    {
        key: '2-1', unit_short: 'ลธญ.', unit_code: '80000002', unit_name: 'ฝ่ายเลขานุการบริษัท', date: '01/11/2025',
        line_of_work: 'กพญ.', business_unit: 'CEO', dataset: 'ปกติ',
        frame_21: 0, frame_18_20: 0, frame_16_17: 0, frame_14_15: 1, frame_11_13: 3, frame_9_10: 6, frame_under_8: 3, frame_total: 13,
        operator: '', remark: '', log: ''
    },


    // Unit 3: Special Affairs
    {
        key: '3-1', unit_short: 'ผสญ.', unit_code: '80000003', unit_name: 'ผช.กพญ.บริหารสื่อเสียงองค์กรและกิจการพิเศษ', date: '01/11/2025',
        line_of_work: 'กพญ.', business_unit: 'CEO', dataset: 'ปกติ',
        frame_21: 0, frame_18_20: 0, frame_16_17: 1, frame_14_15: 0, frame_11_13: 3, frame_9_10: 3, frame_under_8: 1, frame_total: 8,
        operator: '', remark: '', log: ''
    },


    // Unit 4: Corporate Comm
    {
        key: '4-1', unit_short: 'สสญ.', unit_code: '80000004', unit_name: 'ฝ่ายสื่อสารและภาพลักษณ์องค์กร', date: '01/11/2025',
        line_of_work: 'กพญ.', business_unit: 'CEO', dataset: 'ปกติ',
        frame_21: 0, frame_18_20: 0, frame_16_17: 0, frame_14_15: 1, frame_11_13: 6, frame_9_10: 23, frame_under_8: 21, frame_total: 51,
        operator: '', remark: '', log: ''
    },


    // Unit 5: Social Affairs
    {
        key: '5-1', unit_short: 'สคญ.', unit_code: '80000011', unit_name: 'ฝ่ายกิจการเพื่อสังคม', date: '01/11/2025',
        line_of_work: 'กพญ.', business_unit: 'CEO', dataset: 'ปกติ',
        frame_21: 0, frame_18_20: 0, frame_16_17: 0, frame_14_15: 1, frame_11_13: 5, frame_9_10: 21, frame_under_8: 6, frame_total: 33,
        operator: '', remark: '', log: ''
    },

];

const businessUnitOptions = Array.from(new Set(mockData.map(item => item.business_unit))).sort();
const lineOfWorkOptions = Array.from(new Set(mockData.map(item => item.line_of_work))).sort();
const orgUnitOptions = Array.from(new Set(mockData.map(item => item.unit_name))).sort();
const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];

export default function Report5Page() {
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>(businessUnitOptions);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>(orgUnitOptions);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>(lineOfWorkOptions);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetOptions);
    const [checkedList, setCheckedList] = useState<any[]>(defaultCheckedList);

    // Period Filter State (from Report 2)
    const [startMonth, setStartMonth] = useState<Dayjs>(dayjs());
    const [endMonth, setEndMonth] = useState<Dayjs>(dayjs());

    const onSearch = (values: any) => {
        setLoading(true);
        if (values.startMonth) setStartMonth(values.startMonth);
        if (values.endMonth) setEndMonth(values.endMonth);
        setTimeout(() => setLoading(false), 800);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const filteredData = useMemo(() => {
        return mockData.filter(item =>
            selectedBusinessUnits.includes(item.business_unit) &&
            selectedLinesOfWork.includes(item.line_of_work) &&
            selectedOrgUnits.includes(item.unit_name) &&
            selectedDatasets.includes(item.dataset)
        );
    }, [selectedBusinessUnits, selectedLinesOfWork, selectedOrgUnits, selectedDatasets]);

    const tableDataWithSummary = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];
        const totalRow: any = {
            key: 'TOTAL_SUMMARY',
            unit_short: '', unit_code: '', unit_name: 'รวมทั้งสิ้น (Grand Total)',
            date: '', line_of_work: '', business_unit: '', dataset: '', remark: '', log: ''
        };
        filteredData.forEach(item => {
            Object.keys(item).forEach(key => {
                const value = (item as any)[key];
                if (typeof value === 'number') totalRow[key] = (totalRow[key] || 0) + value;
            });
        });
        return [...filteredData, totalRow];
    }, [filteredData]);

    // --- Excel Export ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 05');

        // Colors matching Tailwind classes
        const colors = {
            blue50: 'FFEFF6FF',
            blue100: 'FFDBEAFE',
            blue200: 'FFBFDBFE',
            yellow50: 'FFFEFCE8',
            yellow200: 'FFFEF08A',
            green100: 'FFDCFCE7',
            gray100: 'FFF3F4F6',
            white: 'FFFFFFFF',
            blue200Bold: 'FFBFDBFE', // For Total Summary Frame columns
        };

        // Header Rows
        const headersRow1 = [
            'ชื่อย่อ', 'รหัส', 'ชื่อเต็ม', 'วันที่', 'ชุดข้อมูล',
            'กรอบอัตรากำลังในระบบ SAP', '', '', '', '', '', '', '',
            'ผู้ดำเนินการ', 'หมายเหตุ', 'Log'
        ];
        const headersRow2 = [
            '', '', 'หน่วยงาน', '', '',
            '21', '18-20', '16-17', '14-15', '11-13', '9-10', '8 ลงมา', 'รวม',
            '', '', ''
        ];
        const dataKeys = [
            'unit_short', 'unit_code', 'unit_name', 'date', 'dataset',
            'frame_21', 'frame_18_20', 'frame_16_17', 'frame_14_15', 'frame_11_13', 'frame_9_10', 'frame_under_8', 'frame_total',
            'operator', 'remark', 'log'
        ];

        const r1 = worksheet.addRow(headersRow1);
        const r2 = worksheet.addRow(headersRow2);

        // Styling Headers
        // Basic Info (Blue 100)
        worksheet.mergeCells(1, 1, 2, 1); // Unit Short
        worksheet.mergeCells(1, 2, 2, 2); // Code
        worksheet.mergeCells(1, 3, 2, 3); // Name
        worksheet.mergeCells(1, 4, 2, 4); // Date
        worksheet.mergeCells(1, 5, 2, 5); // Dataset

        [1, 2, 3, 4, 5].forEach(col => {
            worksheet.getCell(1, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.blue100 } };
        });

        // Frame Group (Blue 200 for main header)
        worksheet.mergeCells(1, 6, 1, 13);
        worksheet.getCell(1, 6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.blue200 } };
        worksheet.getCell(1, 6).alignment = { horizontal: 'center', vertical: 'middle' };

        // Frame Sub-headers (Blue 50, Total is Yellow 200)
        for (let i = 6; i <= 13; i++) {
            const subCell = worksheet.getCell(2, i);
            const isTotal = i === 13;
            subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTotal ? colors.yellow200 : colors.blue50 } };
            subCell.alignment = { horizontal: 'center' };
        }

        // Others (Green 100)
        worksheet.mergeCells(1, 14, 2, 14); // Operator
        worksheet.mergeCells(1, 15, 2, 15); // Remark
        worksheet.mergeCells(1, 16, 2, 16); // Log

        [14, 15, 16].forEach(col => {
            worksheet.getCell(1, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.green100 } };
        });

        [r1, r2].forEach(row => row.eachCell(cell => {
            cell.font = { bold: true, name: 'Sarabun', size: 10 };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (cell.value === 'หน่วยงาน') cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }));

        // Data Rows
        tableDataWithSummary.forEach(item => {
            const rowValues = dataKeys.map(key => {
                // @ts-ignore
                const val = item[key];
                if (typeof val === 'number') return val;
                if (val === undefined || val === null || val === '') {
                    if (key.startsWith('frame_')) return 0;
                    return '';
                }
                return val;
            });
            const row = worksheet.addRow(rowValues);

            if (item.key === 'TOTAL_SUMMARY') {
                row.eachCell((cell, colNumber) => {
                    const key = dataKeys[colNumber - 1];
                    let fillColor = colors.gray100; // Default for summary row
                    if (key && key.startsWith('frame_')) fillColor = colors.blue200; // Frame columns in summary

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
        saveAs(blob, `Report_05_FrameChanges_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Columns Definition ---
    const columns: ColumnsType<Report5DataType> = useMemo(() => {
        const isShow = (k: string) => checkedList.includes(k);
        const getBasicCellProps = (record: Report5DataType) => record.key === 'TOTAL_SUMMARY' ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' } : { className: 'bg-white' };

        const generateFrameColumns = () => {
            return levelKeys.map((key, index) => ({
                title: levelLabels[index],
                dataIndex: `frame_${key}`,
                key: `frame_${key}`,
                width: key === 'total' ? 70 : 60,
                align: 'center' as const,
                className: key === 'total' ? 'bg-yellow-50! font-bold text-gray-900' : '',
                onHeaderCell: () => ({
                    className: key === 'total' ? 'bg-yellow-200! text-yellow-900! font-bold' : 'bg-blue-50! text-blue-700'
                }),
                render: renderNumber,
                onCell: (record: Report5DataType) => {
                    if (record.key === 'TOTAL_SUMMARY') {
                        return { className: 'bg-blue-200! font-bold text-gray-900 border-t-2! border-t-gray-300!' };
                    }
                    return { className: 'bg-white' };
                }
            }));
        };

        return [
            ...(isShow('unit_short') ? [{ title: 'ชื่อย่อ', dataIndex: 'unit_short', key: 'unit_short', width: 100, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_code') ? [{ title: 'รหัส', dataIndex: 'unit_code', key: 'unit_code', width: 80, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_name') ? [{
                title: 'ชื่อเต็ม',
                children: [
                    { title: 'หน่วยงาน', dataIndex: 'unit_name', key: 'unit_name', width: 250, ellipsis: true, onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }), onCell: getBasicCellProps }
                ],
                onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' })
            }] : []),
            ...(isShow('date') ? [{ title: 'วันที่', dataIndex: 'date', key: 'date', width: 100, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }), onCell: getBasicCellProps }] : []),


            ...(isShow('frame') ? [{
                title: 'กรอบอัตรากำลังในระบบ SAP',
                className: 'bg-blue-200! text-black! font-bold text-center',
                children: generateFrameColumns()
            }] : []),

            ...(isShow('operator') ? [{ title: 'ผู้ดำเนินการ', dataIndex: 'operator', key: 'operator', width: 150, onHeaderCell: () => ({ className: 'bg-green-100! text-green-900 font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('remark') ? [{ title: 'หมายเหตุ', dataIndex: 'remark', key: 'remark', width: 200, ellipsis: true, onHeaderCell: () => ({ className: 'bg-green-100! text-green-900 font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('log') ? [{ title: 'Log', dataIndex: 'log', key: 'log', width: 100, ellipsis: true, onHeaderCell: () => ({ className: 'bg-green-100! text-green-900 font-bold' }), onCell: getBasicCellProps }] : []),
        ];
    }, [checkedList]);

    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">Report 05</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">รายงานการเปลี่ยนแปลงกรอบของหน่วยงาน</span>
                        </div>
                    </div >
                </div >


                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
                    <Form layout="inline" onFinish={onSearch} initialValues={{ startMonth: startMonth, endMonth: endMonth }} className="flex items-center gap-2 flex-wrap">
                        <Form.Item label="ตั้งแต่" name="startMonth" className="m-0">
                            <DatePicker picker="month" format="MMMM YYYY" allowClear={false} className="w-40" />
                        </Form.Item>
                        <Form.Item label="ถึง" name="endMonth" className="m-0">
                            <DatePicker picker="month" format="MMMM YYYY" allowClear={false} className="w-40" />
                        </Form.Item>

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
