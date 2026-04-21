'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Checkbox, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined, FileExcelOutlined, FullscreenOutlined,
    FullscreenExitOutlined, SettingOutlined
} from '@ant-design/icons';
import { ChevronDown, Search, Check, FileText } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';

dayjs.locale('th');

interface Report8DataType {
    key: string;
    unit: string;
    children?: Report8DataType[];

    people_21?: number;
    people_18_20?: number;
    people_16_17?: number;
    people_14_15?: number;
    people_11_13?: number;
    people_9_10?: number;
    people_4_8?: number;
    people_total?: number;

    expense_21?: number;
    expense_18_20?: number;
    expense_16_17?: number;
    expense_14_15?: number;
    expense_11_13?: number;
    expense_9_10?: number;
    expense_4_8?: number;
    expense_total?: number;

    major_points?: number;
    major_budget?: number;
    minor_points?: number;
    minor_budget?: number;

    total_grand_expense?: number;

    [key: string]: unknown;
}

interface SearchFormValues {
    effectiveDate?: Dayjs;
}

interface Report8ApiResponse {
    status: number;
    data?: Report8DataType[];
    message?: string;
}

interface Report8FilterItem {
    BGNo?: string;
    BGName?: string;
    OrgUnitNo?: string;
    UnitText?: string;
    UnitName?: string;
    UnitAbbr?: string;
}

interface Report8FilterResponse {
    status: number;
    data?: {
        businessUnits: Report8FilterItem[];
        lines: Report8FilterItem[];
        units: Report8FilterItem[];
    };
    message?: string;
}

interface FilterOption {
    value: string;
    label: string;
}

interface MultiSelectFilterProps {
    label: string;
    options: FilterOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    width?: string;
}

const levels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '4-8', 'รวม'];
const levelKeys = ['21', '18_20', '16_17', '14_15', '11_13', '9_10', '4_8', 'total'];
const defaultEffectiveDate = dayjs();

const columnOptions = [
    { label: 'จำนวนพนักงานและผู้บริหาร', value: 'people' },
    { label: 'ค่าใช้จ่ายพนักงานและผู้บริหาร', value: 'expense' },
    { label: 'สัญญาใหญ่', value: 'major' },
    { label: 'สัญญาย่อย', value: 'minor' },
    { label: 'ค่าใช้จ่ายรวมทั้งหมด', value: 'grand_total' },
];

const defaultCheckedList = columnOptions.map((opt) => opt.value);

const toNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const formatNumber = (value: unknown): string => toNumber(value).toLocaleString();

const formatMoney = (value: unknown): string =>
    toNumber(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const resolveUserContext = () => {
    let employeeId = 'SYSTEM';
    let userGroupNo = '';

    if (typeof window !== 'undefined') {
        const selectedGroup = localStorage.getItem('selected_usergroup')?.trim() || '';
        const userDataStr = localStorage.getItem('user_data');

        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr) as {
                    employeeID?: string;
                    employeeId?: string;
                    EmployeeID?: string;
                    roleId?: string;
                    role?: string;
                    userGroupNo?: string;
                    userGroups?: Array<{ userGroupNo?: string }>;
                };
                const fallbackGroup = userData.userGroups?.[0]?.userGroupNo?.trim() || '';

                employeeId = (
                    userData.employeeID ||
                    userData.employeeId ||
                    userData.EmployeeID ||
                    employeeId
                ).trim();

                userGroupNo = (
                    selectedGroup ||
                    userData.userGroupNo ||
                    userData.roleId ||
                    userData.role ||
                    fallbackGroup ||
                    ''
                ).trim();
            } catch {
                userGroupNo = selectedGroup;
            }
        } else {
            userGroupNo = selectedGroup;
        }
    }

    return { employeeId, userGroupNo };
};

const getAllKeys = (data: Report8DataType[]): string[] => {
    let keys: string[] = [];
    data.forEach((item) => {
        if (item.children && item.children.length > 0) {
            keys.push(item.key);
            keys = keys.concat(getAllKeys(item.children));
        }
    });
    return keys;
};

const cleanUnitText = (text: string) => text.replace(/^[A-Za-z0-9_-]+\s+/, '').trim();

const uniqueOptions = (options: FilterOption[]) => {
    const map = new Map<string, FilterOption>();
    options.forEach((opt) => {
        if (!opt.value || !opt.label) return;
        map.set(opt.value, opt);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'th'));
};

const isSameSelection = (a: string[], b: string[]) =>
    a.length === b.length && a.every((item, index) => item === b[index]);

const syncSelected = (prev: string[], options: FilterOption[]) => {
    const next = prev.filter((item) => options.some((opt) => opt.value === item));
    return isSameSelection(prev, next) ? prev : next;
};

const toBgOption = (row: Report8FilterItem): FilterOption | null => {
    const value = toText(row.BGNo);
    const label = toText(row.BGName);
    if (!value || !label) return null;
    return { value, label };
};

const toLineOption = (row: Report8FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label: `${value} - ${label}` };
};

const generateLevelColumns = (
    parentKey: 'people' | 'expense',
    themeClass: string,
    totalRowColorClass: string,
    isMoney: boolean,
    totalHeaderClass: string,
    totalCellClass: string
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
                className: isTotalCol ? totalHeaderClass : `${themeClass} border-b border-gray-300`,
            }),
            render: (value: unknown) => (isMoney ? formatMoney(value) : formatNumber(value)),
            onCell: (record: Report8DataType) => {
                const totalColumnClass = isTotalCol ? totalCellClass : '';
                if (record.key === 'total') {
                    return { className: `${totalRowColorClass} ${totalColumnClass} font-bold border-t-2! border-t-gray-300` };
                }
                if (isTotalCol) {
                    return { className: totalCellClass };
                }
                return { className: 'bg-white' };
            },
        };
    });
};

function MultiSelectFilter({ label, options, selectedValues, onChange, width = 'w-64' }: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const fixedCheckboxStyle: React.CSSProperties = {
        width: 16,
        height: 16,
        minWidth: 16,
        minHeight: 16,
        maxWidth: 16,
        maxHeight: 16,
        boxSizing: 'border-box',
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleOption = (optionValue: string) => {
        if (selectedValues.includes(optionValue)) {
            onChange(selectedValues.filter((v) => v !== optionValue));
        } else {
            onChange([...selectedValues, optionValue]);
        }
    };

    const handleSelectAll = () => {
        if (selectedValues.length === options.length) onChange([]);
        else onChange(options.map((opt) => opt.value));
    };

    return (
        <div className="relative" ref={containerRef}>
            <div
                className={`${width} min-h-[32px] px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer flex items-center justify-between`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="truncate flex gap-1 flex-wrap">
                    {selectedValues.length === 0 ? (
                        <span className="text-gray-400">{label}...</span>
                    ) : selectedValues.length === options.length ? (
                        <span className="text-blue-600 font-medium">เลือกทั้งหมด ({options.length})</span>
                    ) : selectedValues.length === 1 ? (
                        <span className="text-gray-800">{options.find((opt) => opt.value === selectedValues[0])?.label || '-'}</span>
                    ) : (
                        <span className="text-gray-800">{selectedValues.length} รายการ</span>
                    )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            </div>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[400] overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="ค้นหา..."
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length > 0 && (
                            <div className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50" onClick={handleSelectAll}>
                                <div
                                    style={fixedCheckboxStyle}
                                    className={`shrink-0 rounded border mr-2 flex items-center justify-center ${selectedValues.length === options.length && options.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                                >
                                    {selectedValues.length === options.length && options.length > 0 && <Check className="h-3 w-3 shrink-0 text-white" />}
                                </div>
                                <span className="text-sm font-semibold text-blue-700">เลือกทั้งหมด</span>
                            </div>
                        )}
                        {filteredOptions.map((option) => (
                            <div key={option.value} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleOption(option.value)}>
                                <div
                                    style={fixedCheckboxStyle}
                                    className={`shrink-0 rounded border mr-2 flex items-center justify-center transition-colors ${selectedValues.includes(option.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                                >
                                    {selectedValues.includes(option.value) && <Check className="h-3 w-3 shrink-0 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700 truncate min-w-0 flex-1" title={option.label}>{option.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Report8Page() {
    const [form] = Form.useForm<SearchFormValues>();
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<string[]>(defaultCheckedList);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tableData, setTableData] = useState<Report8DataType[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [filterDate, setFilterDate] = useState<Dayjs>(defaultEffectiveDate);
    const [currentSearchDate, setCurrentSearchDate] = useState<Dayjs>(defaultEffectiveDate);

    const [businessUnitOptions, setBusinessUnitOptions] = useState<FilterOption[]>([]);
    const [lineOfWorkOptions, setLineOfWorkOptions] = useState<FilterOption[]>([]);
    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>([]);

    const fullscreenRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] = useState(600);

    const fetchFilterOptions = useCallback(async (effectiveDate: Dayjs, bgNo = '', signal?: AbortSignal) => {
        const { employeeId, userGroupNo } = resolveUserContext();

        try {
            const query = new URLSearchParams({
                effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo,
            });
            if (bgNo) query.set('bgNo', bgNo);

            const res = await fetch(`/api/report/report6/filters?${query.toString()}`, { signal });
            let payload: Report8FilterResponse | null = null;
            try {
                payload = await res.json();
            } catch {
                payload = null;
            }

            if (!res.ok || !payload || payload.status !== 200 || !payload.data) {
                setBusinessUnitOptions([]);
                setLineOfWorkOptions([]);
                setSelectedBusinessUnits((prev) => (prev.length > 0 ? [] : prev));
                setSelectedLinesOfWork((prev) => (prev.length > 0 ? [] : prev));
                return;
            }

            const nextBusiness = uniqueOptions(
                payload.data.businessUnits
                    .map(toBgOption)
                    .filter((item): item is FilterOption => item !== null)
            );

            const nextLines = uniqueOptions(
                payload.data.lines
                    .map(toLineOption)
                    .filter((item): item is FilterOption => item !== null)
            );

            setBusinessUnitOptions(nextBusiness);
            setLineOfWorkOptions(nextLines);

            setSelectedBusinessUnits((prev) => syncSelected(prev, nextBusiness));
            setSelectedLinesOfWork((prev) => syncSelected(prev, nextLines));
        } catch (error) {
            if (signal?.aborted) return;
            console.error('Failed to fetch report8 filters:', error);
            setBusinessUnitOptions([]);
            setLineOfWorkOptions([]);
            setSelectedBusinessUnits((prev) => (prev.length > 0 ? [] : prev));
            setSelectedLinesOfWork((prev) => (prev.length > 0 ? [] : prev));
        }
    }, []);

    const fetchData = useCallback(async (effectiveDate: Dayjs, bgNo = '', division = '') => {
        const { employeeId, userGroupNo } = resolveUserContext();

        setLoading(true);
        try {
            const params = new URLSearchParams({
                fromDate: effectiveDate.format('YYYY-MM-DD'),
                toDate: effectiveDate.format('YYYY-MM-DD'),
                effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo,
            });
            if (bgNo) params.set('bgNo', bgNo);
            if (division) params.set('division', division);

            const res = await fetch(`/api/report/report8?${params.toString()}`);
            const payload: Report8ApiResponse = await res.json();

            if (!res.ok || payload.status !== 200 || !payload.data) {
                throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            setTableData(payload.data);
            setExpandedKeys(getAllKeys(payload.data));
        } catch (error) {
            console.error('Failed to fetch report8 data:', error);
            setTableData([]);
            setExpandedKeys([]);
            alert('ไม่สามารถดึงข้อมูลรายงานได้');
        } finally {
            setLoading(false);
        }
    }, []);

    const onSearch = async (values: SearchFormValues) => {
        const nextDate = values.effectiveDate || filterDate;
        setFilterDate(nextDate);
        setCurrentSearchDate(nextDate);
        setHasSearched(true);

        const bgNo = selectedBusinessUnits.join(',');
        const division = selectedLinesOfWork.join(',');
        await fetchData(nextDate, bgNo, division);
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            try {
                await fullscreenRef.current?.requestFullscreen();
                setIsFullscreen(true);
            } catch (error) {
                console.error('Fullscreen failed:', error);
            }
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handler = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
            }
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    useEffect(() => {
        if (!hasSearched) return;

        const updateTableHeight = () => {
            if (!tableContainerRef.current) return;
            const rect = tableContainerRef.current.getBoundingClientRect();
            // Reserve space for app/menu header + search area + table chrome to avoid outer scrollbar.
            const availableHeight = Math.floor(window.innerHeight - rect.top - 120);
            setTableScrollY(Math.max(260, availableHeight));
        };

        const raf = window.requestAnimationFrame(updateTableHeight);
        window.addEventListener('resize', updateTableHeight);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateTableHeight);
        };
    }, [hasSearched, isFullscreen, checkedList, tableData.length]);

    const selectedBusinessUnit = selectedBusinessUnits.length === 1 ? selectedBusinessUnits[0] : '';

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            void fetchFilterOptions(filterDate, selectedBusinessUnit, controller.signal);
        }, 180);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [filterDate, selectedBusinessUnit, fetchFilterOptions]);

    const onBusinessChange = (values: string[]) => {
        setSelectedBusinessUnits(values);
    };

    const onLineChange = (values: string[]) => {
        setSelectedLinesOfWork(values);
    };

    const handleExportExcel = async () => {
        if (!tableData.length) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 08');

        const colors = {
            headerBlue: 'FFBFDBFE',
            headerBlueSub: 'FFF0F9FF',
            totalBlue: 'FFDBEAFE',
            headerOrange: 'FFFED7AA',
            headerOrangeSub: 'FFFFF7ED',
            totalOrange: 'FFFFEDD5',
            headerGreen: 'FFBBF7D0',
            headerGreenSub: 'FFF0FDF4',
            totalGreen: 'FFDCFCE7',
            headerPurple: 'FFD8B4FE',
            headerPurpleSub: 'FFFAF5FF',
            totalPurple: 'FFF3E8FF',
            totalYellow: 'FFFEF9C3',
            bgGray: 'FFE5E7EB',
        };

        const row1 = ['กลุ่ม/หน่วยธุรกิจ'];
        const row2 = [''];
        const dataKeys = ['unit'];
        const colWidths = [40];

        const addGroup = (title: string, keys: string[], subTitles: string[], width: number) => {
            row1.push(title);
            for (let i = 1; i < keys.length; i++) row1.push('');
            keys.forEach((key, idx) => {
                row2.push(subTitles[idx]);
                dataKeys.push(key);
                colWidths.push(width);
            });
        };

        if (checkedList.includes('people')) {
            const keys = levelKeys.map((key) => `people_${key}`);
            addGroup('จำนวนพนักงานและผู้บริหาร', keys, levels, 10);
        }

        if (checkedList.includes('expense')) {
            const keys = levelKeys.map((key) => `expense_${key}`);
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

        let colIdx = 2;
        const mergeAndStyle = (count: number, colorTop: string, colorSub: string) => {
            worksheet.mergeCells(1, colIdx, 1, colIdx + count - 1);
            worksheet.getCell(1, colIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorTop } };
            for (let i = 0; i < count; i++) {
                const cell = worksheet.getCell(2, colIdx + i);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorSub } };
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

        for (let rowNo = 1; rowNo <= 2; rowNo++) {
            worksheet.getRow(rowNo).eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.font = { bold: true, name: 'Sarabun' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        }

        const processData = (list: Report8DataType[], depth = 0) => {
            list.forEach((item) => {
                const rowData = dataKeys.map((key, idx) => {
                    if (idx === 0) return '    '.repeat(depth) + item.unit;
                    return toNumber((item as Record<string, unknown>)[key]);
                });

                const row = worksheet.addRow(rowData);

                row.eachCell((cell, cIdx) => {
                    cell.font = { name: 'Sarabun' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };

                    if (cIdx > 1) {
                        cell.alignment = { horizontal: 'right' };
                        const key = dataKeys[cIdx - 1];
                        if (key.includes('expense') || key.includes('budget') || key === 'total_grand_expense') {
                            cell.numFmt = '#,##0.00';
                        } else {
                            cell.numFmt = '#,##0';
                        }
                    }

                    if (item.key === 'total') {
                        cell.font = { bold: true, name: 'Sarabun' };
                        cell.border = {
                            top: { style: 'double' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' },
                        };

                        const key = dataKeys[cIdx - 1];
                        if (cIdx === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray } };
                        else if (key.startsWith('people_')) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalOrange } };
                        else if (key.startsWith('expense_')) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalBlue } };
                        else if (key.startsWith('major_')) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalGreen } };
                        else if (key.startsWith('minor_')) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalPurple } };
                        else if (key === 'total_grand_expense') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalYellow } };
                    } else {
                        if (depth === 0) {
                            cell.font = { bold: true, name: 'Sarabun' };
                        }
                        const key = dataKeys[cIdx - 1];
                        if (key === 'people_total') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
                        if (key === 'expense_total') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
                    }
                });

                if (item.children) processData(item.children, depth + 1);
            });
        };

        processData(tableData);

        worksheet.columns = colWidths.map((width) => ({ width }));
        const buffer = await workbook.xlsx.writeBuffer();
        await saveExcelFile(buffer, `รายงานสรุปค่าใช้จ่ายพนักงานและสัญญาจ้างเหมาบริการ_${currentSearchDate.format('YYYYMMDD')}.xlsx`);
    };

    const columns: ColumnsType<Report8DataType> = useMemo(() => {
        const isShow = (key: string) => checkedList.includes(key);
        const getUnitCellProps = (record: Report8DataType) => {
            if (record.key === 'total') {
                return { className: 'bg-blue-100! font-bold border-t-2! border-t-gray-300 text-blue-900' };
            }
            return { className: 'bg-white' };
        };

        return [
            {
                title: 'กลุ่ม/หน่วยธุรกิจ',
                dataIndex: 'unit',
                key: 'unit',
                fixed: 'left',
                width: 220,
                className: 'bg-white z-20',
                onHeaderCell: () => ({ className: 'bg-blue-100! text-blue-900! font-bold' }),
                onCell: getUnitCellProps,
                render: (text: unknown) => <span className="font-medium text-gray-700">{String(text ?? '')}</span>,
            },
            ...(isShow('people')
                ? [{
                    title: 'จำนวนพนักงานและผู้บริหาร',
                    className: 'bg-orange-50!',
                    onHeaderCell: () => ({ className: 'bg-orange-200! text-orange-900! font-bold text-center' }),
                    children: generateLevelColumns(
                        'people',
                        'bg-orange-50! text-orange-900!',
                        'bg-orange-100! text-orange-900!',
                        false,
                        'bg-orange-200! text-orange-900! font-bold border-b border-gray-300',
                        'report8-col-people-total bg-orange-50 font-bold'
                    ),
                }]
                : []),
            ...(isShow('expense')
                ? [{
                    title: 'ค่าใช้จ่ายพนักงานและผู้บริหาร',
                    className: 'bg-blue-50!',
                    onHeaderCell: () => ({ className: 'bg-blue-200! text-blue-900! font-bold text-center' }),
                    children: generateLevelColumns(
                        'expense',
                        'bg-blue-50! text-blue-900!',
                        'bg-blue-100! text-blue-900!',
                        true,
                        'bg-blue-200! text-blue-900! font-bold border-b border-gray-300',
                        'report8-col-expense-total bg-blue-50 font-bold'
                    ),
                }]
                : []),
            ...(isShow('major')
                ? [{
                    title: 'สัญญาใหญ่',
                    className: 'bg-green-50!',
                    onHeaderCell: () => ({ className: 'bg-green-200! text-green-900! font-bold text-center' }),
                    children: [
                        {
                            title: 'จำนวนจุดบริการ',
                            dataIndex: 'major_points',
                            key: 'major_points',
                            width: 110,
                            align: 'right' as const,
                            render: (value: unknown) => formatNumber(value),
                            onHeaderCell: () => ({ className: 'bg-green-50! text-green-900! font-bold border-b border-gray-300' }),
                            onCell: (record: Report8DataType) =>
                                record.key === 'total'
                                    ? { className: 'bg-green-100! text-green-900! font-bold border-t-2! border-t-gray-300' }
                                    : {},
                        },
                        {
                            title: 'งบจ้างเหมาบริการ',
                            dataIndex: 'major_budget',
                            key: 'major_budget',
                            width: 130,
                            align: 'right' as const,
                            render: (value: unknown) => formatMoney(value),
                            onHeaderCell: () => ({ className: 'bg-green-50! text-green-900! font-bold border-b border-gray-300' }),
                            onCell: (record: Report8DataType) =>
                                record.key === 'total'
                                    ? { className: 'bg-green-100! text-green-900! font-bold border-t-2! border-t-gray-300' }
                                    : {},
                        },
                    ],
                }]
                : []),
            ...(isShow('minor')
                ? [{
                    title: 'สัญญาย่อย',
                    className: 'bg-purple-50!',
                    onHeaderCell: () => ({ className: 'bg-purple-200! text-purple-900! font-bold text-center' }),
                    children: [
                        {
                            title: 'จำนวนจุดบริการ',
                            dataIndex: 'minor_points',
                            key: 'minor_points',
                            width: 110,
                            align: 'right' as const,
                            render: (value: unknown) => formatNumber(value),
                            onHeaderCell: () => ({ className: 'bg-purple-50! text-purple-900! font-bold border-b border-gray-300' }),
                            onCell: (record: Report8DataType) =>
                                record.key === 'total'
                                    ? { className: 'bg-purple-100! text-purple-900! font-bold border-t-2! border-t-gray-300' }
                                    : {},
                        },
                        {
                            title: 'งบจ้างเหมาบริการ',
                            dataIndex: 'minor_budget',
                            key: 'minor_budget',
                            width: 130,
                            align: 'right' as const,
                            render: (value: unknown) => formatMoney(value),
                            onHeaderCell: () => ({ className: 'bg-purple-50! text-purple-900! font-bold border-b border-gray-300' }),
                            onCell: (record: Report8DataType) =>
                                record.key === 'total'
                                    ? { className: 'bg-purple-100! text-purple-900! font-bold border-t-2! border-t-gray-300' }
                                    : {},
                        },
                    ],
                }]
                : []),
            ...(isShow('grand_total')
                ? [{
                    title: 'ค่าใช้จ่ายรวมทั้งหมด',
                    dataIndex: 'total_grand_expense',
                    key: 'total_grand_expense',
                    width: 170,
                    align: 'right' as const,
                    render: (value: unknown) => <span className="font-bold text-blue-800">{formatMoney(value)}</span>,
                    onHeaderCell: () => ({ className: 'bg-yellow-200! text-yellow-900! font-bold text-center' }),
                    className: 'report8-col-grand bg-yellow-50!',
                    onCell: (record: Report8DataType) =>
                        record.key === 'total'
                            ? { className: 'report8-col-grand bg-yellow-100! text-yellow-900! font-bold border-t-2! border-t-gray-300' }
                            : { className: 'report8-col-grand bg-yellow-50!' },
                }]
                : []),
        ];
    }, [checkedList]);

    return (
        <Main currentPath="/report" hideChrome={isFullscreen}>
            <div
                ref={fullscreenRef}
                className={`w-full min-w-0 ${isFullscreen ? 'h-screen overflow-hidden bg-white p-4 flex flex-col gap-4' : 'space-y-6'}`}
            >
                {!isFullscreen && (
                    <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="text-2xl text-blue-100" />
                                <h1 className="text-2xl font-bold m-0 text-white">Report 08</h1>
                                <span className="hidden md:inline-block text-blue-100">|</span>
                                <span className="text-xl font-medium text-blue-50">รายงานสรุปค่าใช้จ่ายพนักงานและสัญญาจ้างเหมาบริการ</span>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 ${
                        isFullscreen ? 'shrink-0' : 'sticky top-0 z-[300]'
                    }`}
                >
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={onSearch}
                        initialValues={{ effectiveDate: filterDate }}
                        className="flex items-center gap-2"
                    >
                        <Form.Item name="effectiveDate" label="Effective Date" className="m-0">
                            <DatePicker
                                format="DD/MM/YYYY"
                                className="w-36"
                                getPopupContainer={() => fullscreenRef.current || document.body}
                                onChange={(value) => setFilterDate(value || defaultEffectiveDate)}
                            />
                        </Form.Item>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยธุรกิจ</label>
                            <MultiSelectFilter
                                label="เลือกหน่วยธุรกิจ"
                                options={businessUnitOptions}
                                selectedValues={selectedBusinessUnits}
                                onChange={onBusinessChange}
                                width="w-44"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">สายงาน</label>
                            <MultiSelectFilter
                                label="เลือกสายงาน"
                                options={lineOfWorkOptions}
                                selectedValues={selectedLinesOfWork}
                                onChange={onLineChange}
                                width="w-44"
                            />
                        </div>

                        <Form.Item className="m-0">
                            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>ค้นหา</Button>
                        </Form.Item>
                    </Form>

                    {hasSearched && (
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
                            <Popover
                                placement="bottomLeft"
                                trigger="click"
                                getPopupContainer={() => fullscreenRef.current || document.body}
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
                    )}
                </div>

                {hasSearched && (
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 ${isFullscreen ? 'mt-0 flex-1 min-h-0' : 'mt-4'}`}>
                        <div
                            ref={tableContainerRef}
                            className={`${isFullscreen ? 'h-full min-h-0 overflow-hidden' : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-7.2rem)] overflow-hidden'}`}
                        >
                            <Table
                                columns={columns}
                                dataSource={tableData}
                                loading={loading}
                                bordered
                                size="small"
                                scroll={{ x: 'max-content', y: tableScrollY }}
                                pagination={false}
                                sticky
                                expandable={{
                                    expandedRowKeys: expandedKeys,
                                    onExpandedRowsChange: (keys) => setExpandedKeys(keys as string[]),
                                }}
                                className="report8-table [&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                                rowClassName={(record) => {
                                    const key = String(record.key || '');
                                    if (key === 'total') return 'report8-row-total';
                                    if (key.startsWith('bg-')) return 'report8-row-parent';
                                    return '';
                                }}
                            />
                        </div>
                    </div>
                )}
                <style jsx global>{`
                    .report8-table .ant-table-header.ant-table-sticky-holder,
                    .report8-table .ant-table-sticky-holder {
                        z-index: 20 !important;
                    }
                    .report8-table .ant-table-tbody > tr.report8-row-parent > td:not(.report8-col-people-total):not(.report8-col-expense-total):not(.report8-col-grand) {
                        background-color: #ffffff !important;
                        color: #1e3a8a !important;
                        font-weight: 700;
                        border-bottom: 2px solid #93c5fd !important;
                    }
                    .report8-table .ant-table-tbody > tr.report8-row-parent > td.report8-col-people-total,
                    .report8-table .ant-table-tbody > tr.report8-row-parent > td.report8-col-expense-total,
                    .report8-table .ant-table-tbody > tr.report8-row-parent > td.report8-col-grand {
                        color: #1e3a8a !important;
                        font-weight: 700;
                        border-bottom: 2px solid #93c5fd !important;
                    }
                    .report8-table .ant-table-tbody > tr.report8-row-total > td:not(.report8-col-people-total):not(.report8-col-expense-total):not(.report8-col-grand) {
                        background-color: #dbeafe !important;
                        color: #1e3a8a !important;
                        font-weight: 700;
                    }
                    .report8-table td.report8-col-grand {
                        background-color: #fef9c3 !important;
                    }
                    .report8-table td.report8-col-people-total {
                        background-color: #fff7ed !important;
                    }
                    .report8-table td.report8-col-expense-total {
                        background-color: #f0f9ff !important;
                    }
                `}</style>
            </div>
        </Main>
    );
}
