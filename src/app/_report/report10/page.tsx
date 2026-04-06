'use client';

import React, { useState, useMemo } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileExcelOutlined, FullscreenOutlined, FullscreenExitOutlined, SearchOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

dayjs.locale('th');

// --- 1. Type Definitions ---
interface Report10DataType {
    key: string;
    position: string; // ตำแหน่ง
    level: string;    // ระดับ

    // ตามโครงสร้าง (Structure)
    struct_frame: number;
    struct_emp: number;
    struct_vac: number;

    // กรอบเฉพาะตัว (Specific)
    spec_frame: number;
    spec_emp: number;
    spec_vac: number;

    // Secondment
    sec_frame: number;
    sec_emp: number;
    sec_vac: number;

    // รวมทั้งหมด (Total)
    total_frame: number;
    total_emp: number;
    total_vac: number;

    children?: Report10DataType[];
}

// Detailed Data Type for Export
interface Report10DetailType {
    no: number;
    name: string;
    fullPosition: string;
    shortPosition: string;
    unit: string;
    line: string;
    level: string;
    jg: string;
    positionId: string;
    frameType: string;
    strategic: string;
    businessSupport: string;
    specific: string;
    isSecondment: boolean; // Helper for filtering
    category: 'Deputy' | 'Assistant' | 'Division' | 'Other'; // Helper for filtering
}

// --- 2. Mock Data ---
const initialData: Report10DataType[] = [
    {
        key: '1',
        position: 'ปธบ./กผญ.',
        level: '',
        struct_frame: 10, struct_emp: 8, struct_vac: 2,
        spec_frame: 0, spec_emp: 0, spec_vac: 0,
        sec_frame: 0, sec_emp: 0, sec_vac: 0,
        total_frame: 10, total_emp: 8, total_vac: 2,
    },
    {
        key: '2',
        position: 'ประธานเจ้าหน้าที่/รองกรรมการผู้จัดการใหญ่',
        level: '',
        struct_frame: 5, struct_emp: 5, struct_vac: 0,
        spec_frame: 0, spec_emp: 0, spec_vac: 0,
        sec_frame: 0, sec_emp: 0, sec_vac: 0,
        total_frame: 5, total_emp: 5, total_vac: 0,
    },
    {
        key: '3',
        position: 'ผู้ช่วยกรรมการผู้จัดการใหญ่',
        level: '',
        struct_frame: 12, struct_emp: 10, struct_vac: 2,
        spec_frame: 1, spec_emp: 1, spec_vac: 0,
        sec_frame: 0, sec_emp: 0, sec_vac: 0,
        total_frame: 13, total_emp: 11, total_vac: 2,
    },
    {
        key: '4',
        position: 'ผู้จัดการฝ่าย',
        level: '',
        struct_frame: 45, struct_emp: 40, struct_vac: 5,
        spec_frame: 2, spec_emp: 2, spec_vac: 0,
        sec_frame: 1, sec_emp: 1, sec_vac: 0,
        total_frame: 48, total_emp: 43, total_vac: 5,
    },
];

// --- Mock Detail Data Generator ---
const generateMockDetails = (): Report10DetailType[] => {
    const data: Report10DetailType[] = [];
    let idCounter = 1;

    const categories = [
        { name: 'Deputy', label: 'รองกรรมการผู้จัดการใหญ่', count: 20, secCount: 5 },
        { name: 'Assistant', label: 'ผู้ช่วยกรรมการผู้จัดการใหญ่', count: 30, secCount: 8 },
        { name: 'Division', label: 'ผู้จัดการฝ่าย', count: 50, secCount: 10 },
    ];

    categories.forEach(cat => {
        // Regular (PTT & Pool)
        for (let i = 0; i < cat.count; i++) {
            const isPool = i % 5 === 0; // Every 5th is pool
            const isVacant = i % 7 === 0; // Every 7th is vacant

            data.push({
                no: idCounter++,
                name: isVacant ? '' : `นาย กขค ${idCounter}`,
                fullPosition: `${cat.label} ${i + 1}`,
                shortPosition: `${cat.name.substring(0, 3).toUpperCase()} ${i + 1}`,
                unit: `หน่วยงาน ${i + 1}`,
                line: `สายงาน ${i + 1}`,
                level: '10',
                jg: '10',
                positionId: `POS-${idCounter}`,
                frameType: isPool ? 'pool' : 'ปตท.',
                strategic: 'Yes',
                businessSupport: 'Business',
                specific: i % 3 === 0 ? 'เป็น' : 'ไม่เป็น',
                isSecondment: false,
                category: cat.name as any,
            });
        }
        // Secondment
        for (let i = 0; i < cat.secCount; i++) {
            data.push({
                no: idCounter++,
                name: `นาง งจฉ ${idCounter}`,
                fullPosition: `${cat.label} (Sec) ${i + 1}`,
                shortPosition: `${cat.name.substring(0, 3).toUpperCase()} (Sec) ${i + 1}`,
                unit: `หน่วยงาน (Sec) ${i + 1}`,
                line: `สายงาน (Sec) ${i + 1}`,
                level: '10',
                jg: '10',
                positionId: `POS-${idCounter}`,
                frameType: 'Secondment',
                strategic: 'No',
                businessSupport: 'Support',
                specific: i % 3 === 0 ? 'เป็น' : 'ไม่เป็น',
                isSecondment: true,
                category: cat.name as any,
            });
        }
    });

    return data;
};

export default function Report10Page() {
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const onSearch = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 800);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    // --- Excel Export (Summary) ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 10');

        // Colors (Updated Palette)
        const colors = {
            textBlack: 'FF000000',
            textBlue900: 'FF1E3A8A',

            bgBlue200: 'FFBFDBFE',
            bgBlue100: 'FFDBEAFE',

            bgOrange200: 'FFFED7AA',
            bgOrange100: 'FFFFEDD5',

            bgGreen200: 'FFBBF7D0',
            bgGreen100: 'FFDCFCE7',

            bgYellow200: 'FFFEF9C3',
            bgYellow100: 'FFFEF08A',

            bgGray50: 'FFF9FAFB',
            bgWhite: 'FFFFFFFF',
        };

        // Headers
        const row1 = ['ตำแหน่ง', 'ระดับ', 'ตามโครงสร้าง', '', '', 'กรอบเฉพาะตัว', '', '', 'Secondment', '', '', 'รวมทั้งหมด', '', ''];
        const row2 = ['', '', 'กรอบอัตรากำลัง', 'จำนวนพนักงาน', 'ว่าง', 'กรอบอัตรากำลัง', 'จำนวนพนักงาน', 'ว่าง', 'กรอบอัตรากำลัง', 'จำนวนพนักงาน', 'ว่าง', 'กรอบอัตรากำลัง', 'จำนวนพนักงาน', 'ตำแหน่งว่าง'];

        worksheet.addRow(row1);
        worksheet.addRow(row2);

        // Merge Headers
        worksheet.mergeCells('A1:A2'); // Position
        worksheet.mergeCells('B1:B2'); // Level
        worksheet.mergeCells('C1:E1'); // Structure
        worksheet.mergeCells('F1:H1'); // Specific
        worksheet.mergeCells('I1:K1'); // Secondment
        worksheet.mergeCells('L1:N1'); // Total

        // Styling Helper
        const setStyle = (cell: ExcelJS.Cell, bg: string, isHeader: boolean = false) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.font = { bold: isHeader, color: { argb: colors.textBlack }, name: 'Sarabun' };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        };

        // Row 1 Headers
        setStyle(worksheet.getCell('A1'), colors.bgBlue100, true); // Position
        setStyle(worksheet.getCell('B1'), colors.bgBlue100, true); // Level

        setStyle(worksheet.getCell('C1'), colors.bgBlue200, true); // Structure
        setStyle(worksheet.getCell('F1'), colors.bgOrange200, true); // Specific
        setStyle(worksheet.getCell('I1'), colors.bgGreen200, true); // Secondment
        setStyle(worksheet.getCell('L1'), colors.bgYellow200, true); // Total

        // Row 2 Sub-Headers
        ['C2', 'D2', 'E2'].forEach(k => setStyle(worksheet.getCell(k), colors.bgBlue100, true));
        ['F2', 'G2', 'H2'].forEach(k => setStyle(worksheet.getCell(k), colors.bgOrange100, true));
        ['I2', 'J2', 'K2'].forEach(k => setStyle(worksheet.getCell(k), colors.bgGreen100, true));
        ['L2', 'M2', 'N2'].forEach(k => setStyle(worksheet.getCell(k), colors.bgYellow100, true));

        // Data
        initialData.forEach(item => {
            const row = worksheet.addRow([
                item.position, item.level,
                item.struct_frame, item.struct_emp, item.struct_vac,
                item.spec_frame, item.spec_emp, item.spec_vac,
                item.sec_frame, item.sec_emp, item.sec_vac,
                item.total_frame, item.total_emp, item.total_vac
            ]);

            row.eachCell((cell, colNumber) => {
                cell.font = { name: 'Sarabun' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                // Background Colors
                if (colNumber === 1 || colNumber === 2) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray50 } }; // Position/Level = Gray
                    cell.alignment = { horizontal: 'left' };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgWhite } }; // Data = White
                    cell.alignment = { horizontal: 'right' };
                }
            });
        });

        // Column Widths
        worksheet.getColumn(1).width = 40;
        worksheet.getColumn(2).width = 15;
        for (let i = 3; i <= 14; i++) worksheet.getColumn(i).width = 15;

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Report_10_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Excel Export (Detail) ---
    const handleExportDetailExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const allData = generateMockDetails();

        const sheets = [
            { name: 'รวม', label: 'รวมทุกระดับ', filter: () => true },
            { name: 'รอง', label: 'รองกรรมการผู้จัดการใหญ่', filter: (d: Report10DetailType) => d.category === 'Deputy' && !d.isSecondment },
            { name: 'รอง sec', label: 'รองกรรมการผู้จัดการใหญ่ (Secondment)', filter: (d: Report10DetailType) => d.category === 'Deputy' && d.isSecondment },
            { name: 'ผู้ช่วย', label: 'ผู้ช่วยกรรมการผู้จัดการใหญ่', filter: (d: Report10DetailType) => d.category === 'Assistant' && !d.isSecondment },
            { name: 'ผู้ช่วย sec', label: 'ผู้ช่วยกรรมการผู้จัดการใหญ่ (Secondment)', filter: (d: Report10DetailType) => d.category === 'Assistant' && d.isSecondment },
            { name: 'ฝ่าย', label: 'ผู้จัดการฝ่าย', filter: (d: Report10DetailType) => d.category === 'Division' && !d.isSecondment },
            { name: 'ฝ่าย sec', label: 'ผู้จัดการฝ่าย (Secondment)', filter: (d: Report10DetailType) => d.category === 'Division' && d.isSecondment },
        ];

        const columns = [
            { header: 'ลำดับที่', key: 'no', width: 10 },
            { header: 'ชื่อ', key: 'name', width: 30 },
            { header: 'ชื่อตำแหน่งเต็ม', key: 'fullPosition', width: 40 },
            { header: 'ชื่อย่อตำแหน่ง', key: 'shortPosition', width: 20 },
            { header: 'หน่วยงาน', key: 'unit', width: 30 },
            { header: 'สายงาน', key: 'line', width: 30 },
            { header: 'ระดับ', key: 'level', width: 10 },
            { header: 'JG', key: 'jg', width: 10 },
            { header: 'PositionID', key: 'positionId', width: 15 },
            { header: 'ประเภทกรอบ', key: 'frameType', width: 15 },
            { header: 'Straticgic', key: 'strategic', width: 15 },
            { header: 'Business/Support', key: 'businessSupport', width: 20 },
            { header: 'เฉพาะตัว', key: 'specific', width: 15 },
        ];

        sheets.forEach(sheetConfig => {
            const worksheet = workbook.addWorksheet(sheetConfig.name);
            let sheetData = allData.filter(sheetConfig.filter);

            // Sorting Logic: ปตท. -> pool -> Secondment, then by Level
            const frameTypeOrder: { [key: string]: number } = { 'ปตท.': 1, 'pool': 2, 'Secondment': 3 };
            sheetData.sort((a, b) => {
                const orderA = frameTypeOrder[a.frameType] || 99;
                const orderB = frameTypeOrder[b.frameType] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return a.level.localeCompare(b.level); // Assuming level is string, adjust if number
            });

            // Calculate Counts for Header
            let categoryData = allData;
            if (sheetConfig.name !== 'รวม') {
                if (sheetConfig.name.includes('รอง')) categoryData = allData.filter(d => d.category === 'Deputy');
                else if (sheetConfig.name.includes('ผู้ช่วย')) categoryData = allData.filter(d => d.category === 'Assistant');
                else if (sheetConfig.name.includes('ฝ่าย')) categoryData = allData.filter(d => d.category === 'Division');
            }

            const totalCount = categoryData.length;
            const pttCount = categoryData.filter(d => !d.isSecondment).length;
            const secCount = categoryData.filter(d => d.isSecondment).length;

            // Header Text
            const headerText = `กรอบอัตรากำลังและผู้บริหาร ปตท. ระดับ ${sheetConfig.label} (${totalCount} กรอบ : ใน ปตท. ${pttCount} กรอบ / Sec ${secCount} กรอบ)`;

            // Add Main Header Row
            worksheet.mergeCells('A1:M1');
            const mainHeaderCell = worksheet.getCell('A1');
            mainHeaderCell.value = headerText;
            mainHeaderCell.font = { bold: true, size: 12, name: 'Sarabun' };
            mainHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };


            // Add Column Header Row (Row 2)
            const headerRow = worksheet.addRow(columns.map(c => c.header));
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; // Light Blue
                cell.font = { bold: true, name: 'Sarabun' };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            // Add Data
            sheetData.forEach((item, index) => {
                // Conditional Display Logic
                const strategic = item.frameType === 'Secondment' ? item.strategic : '';
                const businessSupport = item.frameType === 'Secondment' ? item.businessSupport : '';

                const row = worksheet.addRow([
                    index + 1, // Recalculate No. for each sheet
                    item.name || 'ว่าง', // Handle empty name
                    item.fullPosition,
                    item.shortPosition,
                    item.unit,
                    item.line,
                    item.level,
                    item.jg,
                    item.positionId,
                    item.frameType,
                    strategic,
                    businessSupport,
                    item.specific
                ]);

                row.eachCell((cell, colNumber) => {
                    cell.font = { name: 'Sarabun' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };

                    // Red text for "ว่าง" in Name column (Column 2)
                    if (colNumber === 2 && cell.value === 'ว่าง') {
                        cell.font = { color: { argb: 'FFFF0000' }, name: 'Sarabun' }; // Red
                    }
                });
            });

            // Set Column Widths
            columns.forEach((col, idx) => {
                worksheet.getColumn(idx + 1).width = col.width;
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Report_10_Detail_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    // --- Columns ---
    const columns: ColumnsType<Report10DataType> = useMemo(() => {
        // Header Colors
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
                width: 250,
                fixed: 'left',
                className: 'bg-gray-50! font-medium text-gray-700', // Data: Gray
                onHeaderCell: () => ({ className: `${headerBlue100} text-center font-bold border-r border-gray-300` }),
            },
            {
                title: 'ระดับ',
                dataIndex: 'level',
                key: 'level',
                width: 80,
                align: 'center',
                className: 'bg-gray-50!', // Data: Gray
                onHeaderCell: () => ({ className: `${headerBlue100} text-center font-bold border-r border-gray-300` }),
            },
            {
                title: 'ตามโครงสร้าง',
                onHeaderCell: () => ({ className: `${headerBlue200} text-center font-bold border-r border-gray-300` }),
                children: [
                    { title: 'กรอบอัตรากำลัง', dataIndex: 'struct_frame', key: 'struct_frame', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerBlue100} font-bold` }) },
                    { title: 'จำนวนพนักงาน', dataIndex: 'struct_emp', key: 'struct_emp', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerBlue100} font-bold` }) },
                    { title: 'ว่าง', dataIndex: 'struct_vac', key: 'struct_vac', width: 80, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerBlue100} font-bold` }) },
                ]
            },
            {
                title: 'กรอบเฉพาะตัว',
                onHeaderCell: () => ({ className: `${headerOrange200} text-center font-bold border-r border-gray-300` }),
                children: [
                    { title: 'กรอบอัตรากำลัง', dataIndex: 'spec_frame', key: 'spec_frame', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerOrange100} font-bold` }) },
                    { title: 'จำนวนพนักงาน', dataIndex: 'spec_emp', key: 'spec_emp', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerOrange100} font-bold` }) },
                    { title: 'ว่าง', dataIndex: 'spec_vac', key: 'spec_vac', width: 80, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerOrange100} font-bold` }) },
                ]
            },
            {
                title: 'Secondment',
                onHeaderCell: () => ({ className: `${headerGreen200} text-center font-bold border-r border-gray-300` }),
                children: [
                    { title: 'กรอบอัตรากำลัง', dataIndex: 'sec_frame', key: 'sec_frame', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerGreen100} font-bold` }) },
                    { title: 'จำนวนพนักงาน', dataIndex: 'sec_emp', key: 'sec_emp', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerGreen100} font-bold` }) },
                    { title: 'ว่าง', dataIndex: 'sec_vac', key: 'sec_vac', width: 80, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerGreen100} font-bold` }) },
                ]
            },
            {
                title: 'รวมทั้งหมด',
                onHeaderCell: () => ({ className: `${headerYellow200} text-center font-bold` }),
                children: [
                    { title: 'กรอบอัตรากำลัง', dataIndex: 'total_frame', key: 'total_frame', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerYellow100} font-bold` }) },
                    { title: 'จำนวนพนักงาน', dataIndex: 'total_emp', key: 'total_emp', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerYellow100} font-bold` }) },
                    { title: 'ตำแหน่งว่าง', dataIndex: 'total_vac', key: 'total_vac', width: 100, align: 'center', className: 'bg-white', onHeaderCell: () => ({ className: `${headerYellow100} font-bold` }) },
                ]
            },
        ];
    }, []);

    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                {/* Header Title */}
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-2xl font-bold m-0 text-white">Report 10</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">รายงานกรอบอัตรากำลังและจำนวนผู้บริหาร</span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-10">
                    <Form layout="inline" className="flex items-center gap-2">
                        <Form.Item label="วันที่" className="m-0">
                            <DatePicker format="DD/MM/YYYY" className="w-36" />
                        </Form.Item>
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
                        <Button icon={<ExportOutlined />} onClick={handleExportDetailExcel} className="bg-orange-500! text-white! border-none! shadow-sm! hover:bg-orange-600!">Export Detail</Button>
                        <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!">Excel</Button>
                    </div>
                </div>

                {/* Table */}
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
                        />
                    </div>
                </div>
            </div>
        </Main>
    );
}
