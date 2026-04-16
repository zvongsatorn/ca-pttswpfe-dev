'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Checkbox, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined,
    FileExcelOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { ChevronDown, Search, Check, FileText } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';

dayjs.locale('th');

type CheckboxValueType = string | number | boolean;
type CellValue = string | number | undefined;

interface DataType {
    key: string;
    unit: string;
    [key: string]: CellValue;
}

interface Report2RawRow {
    BGNo?: string;
    BGName?: string;
    month?: number | string;
    year?: number | string;
    EffectiveDate?: string;

    QuotaAmount?: number | string;
    TQAmount?: number | string;

    n_amount?: number | string;
    Tn_amount?: number | string;

    mn_amount?: number | string;
    Tmn_amount?: number | string;

    p_amount?: number | string;
    Tp_amount?: number | string;

    mp_amount?: number | string;
    Tmp_amount?: number | string;

    s_amount?: number | string;
    TSAmount?: number | string;

    tr_amount?: number | string;
    Ttr_amount?: number | string;

    nb_amount?: number | string;
    Tnb_amount?: number | string;

    mnb_amount?: number | string;
    Tmnb_amount?: number | string;

    t_amount?: number | string;
    TTAmount?: number | string;

    m_amount?: number | string;
    Tm_amount?: number | string;

    q_contact?: number | string;
    q_subcontact?: number | string;

    remark?: string;
}

interface Report2ApiResponse {
    status: number;
    data?: Report2RawRow[];
    message?: string;
}

interface SearchFormValues {
    startMonth?: Dayjs;
    endMonth?: Dayjs;
}

interface MultiSelectFilterProps {
    label: string;
    options: string[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    width?: string;
}

interface MetricMap {
    key: string;
    valueField: keyof Report2RawRow;
    diffField?: keyof Report2RawRow;
}

const metricMaps: MetricMap[] = [
    { key: 'frame_staff', valueField: 'QuotaAmount', diffField: 'TQAmount' },
    { key: 'frame_normal', valueField: 'n_amount', diffField: 'Tn_amount' },
    { key: 'people_normal', valueField: 'mn_amount', diffField: 'Tmn_amount' },
    { key: 'pool_rs', valueField: 'p_amount', diffField: 'Tp_amount' },
    { key: 'people_pool_rs', valueField: 'mp_amount', diffField: 'Tmp_amount' },
    { key: 'frame_sec', valueField: 's_amount', diffField: 'TSAmount' },
    { key: 'traditional', valueField: 'tr_amount', diffField: 'Ttr_amount' },
    { key: 'new_biz', valueField: 'nb_amount', diffField: 'Tnb_amount' },
    { key: 'people_new_biz', valueField: 'mnb_amount', diffField: 'Tmnb_amount' },
    { key: 'total_actual', valueField: 't_amount', diffField: 'TTAmount' },
    { key: 'total_people', valueField: 'm_amount', diffField: 'Tm_amount' },
    { key: 'contact_out', valueField: 'q_contact' },
    { key: 'contact_out_sub', valueField: 'q_subcontact' },
];

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

const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];
const defaultCheckedList = columnOptions.map((opt) => opt.value);

const normalDatasetColumns = new Set([
    'frame_staff',
    'frame_normal',
    'people_normal',
    'traditional',
    'new_biz',
    'people_new_biz',
    'total_actual',
    'total_people',
]);
const poolDatasetColumns = new Set(['pool_rs', 'people_pool_rs']);
const secDatasetColumns = new Set(['frame_sec']);

function MultiSelectFilter({
    label,
    options,
    selectedValues,
    onChange,
    width = 'w-64',
}: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleOption = (option: string) => {
        if (selectedValues.includes(option)) {
            onChange(selectedValues.filter((v) => v !== option));
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
                className={`${width} min-h-[32px] px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer flex items-center justify-between`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="truncate flex gap-1 flex-wrap">
                    {selectedValues.length === 0 ? (
                        <span className="text-gray-400">{label}...</span>
                    ) : selectedValues.length === options.length ? (
                        <span className="text-blue-600 font-medium">เลือกทั้งหมด ({options.length})</span>
                    ) : (
                        <span className="text-gray-800">{selectedValues.length} รายการ</span>
                    )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[60] overflow-hidden">
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
                            <div
                                className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50"
                                onClick={handleSelectAll}
                            >
                                <div
                                    className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                                        selectedValues.length === options.length && options.length > 0
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {selectedValues.length === options.length && options.length > 0 && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-blue-700">เลือกทั้งหมด</span>
                            </div>
                        )}

                        {filteredOptions.map((option) => (
                            <div
                                key={option}
                                className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => toggleOption(option)}
                            >
                                <div
                                    className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors ${
                                        selectedValues.includes(option)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {selectedValues.includes(option) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700 truncate" title={option}>
                                    {option}
                                </span>
                            </div>
                        ))}

                        {filteredOptions.length === 0 && (
                            <div className="text-center py-4 text-xs text-gray-400">ไม่พบข้อมูล</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const toNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const toNumberOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const normalizeYearToAD = (yearRaw: number): number => (yearRaw > 2400 ? yearRaw - 543 : yearRaw);

const getMonthRangeKeys = (start: Dayjs, end: Dayjs): string[] => {
    const list: string[] = [];
    let current = start.clone().startOf('month');
    const last = end.clone().startOf('month');

    while (current.isBefore(last) || current.isSame(last, 'month')) {
        list.push(current.format('YYYYMM'));
        current = current.add(1, 'month');
    }

    return list;
};

const extractMonthKey = (row: Report2RawRow): string | null => {
    const monthVal = String(row.month ?? '').padStart(2, '0');
    const monthNum = Number(monthVal);
    const yearNum = Number(row.year ?? 0);

    if (Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12 && Number.isFinite(yearNum) && yearNum > 0) {
        return `${normalizeYearToAD(yearNum)}${monthVal}`;
    }

    if (row.EffectiveDate) {
        const d = dayjs(row.EffectiveDate);
        if (d.isValid()) return d.format('YYYYMM');
    }

    return null;
};

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
                    roleId?: string;
                    userGroupNo?: string;
                    userGroups?: Array<{ userGroupNo?: string }>;
                };
                const fallbackGroup = userData.userGroups?.[0]?.userGroupNo?.trim() || '';

                employeeId = (userData.employeeID || userData.employeeId || employeeId).trim();
                userGroupNo = selectedGroup
                    || userData.userGroupNo?.trim()
                    || userData.roleId?.trim()
                    || fallbackGroup
                    || '';
            } catch {
                // ignore parse failure and use default values
            }
        }
    }

    return { employeeId, userGroupNo };
};

const isTotalUnit = (unit: string): boolean => unit.trim() === 'รวม';

const transformRows = (rawRows: Report2RawRow[], monthKeys: string[]) => {
    const monthKeySet = new Set(monthKeys);
    const byUnit = new Map<string, DataType>();
    const orderedUnits: string[] = [];

    rawRows.forEach((row) => {
        const monthKey = extractMonthKey(row);
        if (!monthKey || !monthKeySet.has(monthKey)) return;

        const unit = String(row.BGName || row.BGNo || '').trim() || '-';

        if (!byUnit.has(unit)) {
            byUnit.set(unit, {
                key: `unit-${orderedUnits.length + 1}`,
                unit,
            });
            orderedUnits.push(unit);
        }

        const target = byUnit.get(unit)!;

        metricMaps.forEach((metric) => {
            const value = toNumber(row[metric.valueField]);
            target[`${metric.key}_${monthKey}`] = value;

            if (metric.diffField) {
                const diffValue = toNumberOrNull(row[metric.diffField]);
                if (diffValue !== null) {
                    target[`${metric.key}_${monthKey}_diff`] = diffValue;
                }
            }
        });

        target[`remark_${monthKey}`] = row.remark || '';
    });

    const rows = orderedUnits.map((unit) => {
        const row = byUnit.get(unit)!;

        monthKeys.forEach((monthKey) => {
            metricMaps.forEach((metric) => {
                const valueKey = `${metric.key}_${monthKey}`;
                if (row[valueKey] === undefined) row[valueKey] = 0;
            });

            const remarkKey = `remark_${monthKey}`;
            if (row[remarkKey] === undefined) row[remarkKey] = '';
        });

        return row;
    });

    rows.sort((a, b) => {
        if (isTotalUnit(a.unit) && !isTotalUnit(b.unit)) return 1;
        if (!isTotalUnit(a.unit) && isTotalUnit(b.unit)) return -1;
        return 0;
    });

    return {
        rows,
        unitOptions: rows.map((r) => r.unit),
    };
};

const isColumnVisible = (
    key: string,
    checkedList: CheckboxValueType[],
    selectedDatasets: string[]
): boolean => {
    if (!checkedList.includes(key)) return false;

    if (normalDatasetColumns.has(key)) {
        return selectedDatasets.includes('ปกติ');
    }

    if (poolDatasetColumns.has(key)) {
        return selectedDatasets.includes('PoolRS');
    }

    if (secDatasetColumns.has(key)) {
        return selectedDatasets.includes('Sec Pool');
    }

    return true;
};

export default function Report2Page() {
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<CheckboxValueType[]>(defaultCheckedList);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetOptions);
    const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
    const [businessUnitOptions, setBusinessUnitOptions] = useState<string[]>([]);

    const [startMonth, setStartMonth] = useState<Dayjs>(dayjs());
    const [endMonth, setEndMonth] = useState<Dayjs>(dayjs());

    const [allData, setAllData] = useState<DataType[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const months = useMemo(() => getMonthRangeKeys(startMonth, endMonth), [startMonth, endMonth]);

    const data = useMemo(() => {
        if (selectedUnits.length === 0) return allData;
        return allData.filter((item) => selectedUnits.includes(item.unit));
    }, [allData, selectedUnits]);

    const fetchReportData = useCallback(async (start: Dayjs, end: Dayjs) => {
        const { employeeId, userGroupNo } = resolveUserContext();
        if (!employeeId || employeeId === 'SYSTEM' || !userGroupNo) {
            alert('ไม่พบสิทธิ์ผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
            return;
        }

        const monthKeys = getMonthRangeKeys(start, end);

        setLoading(true);
        try {
            const query = new URLSearchParams({
                fromDate: start.format('YYYY-MM-01'),
                toDate: end.format('YYYY-MM-01'),
                employeeId,
                userGroupNo,
            });

            const res = await fetch(`/api/report/report2?${query.toString()}`);
            const payload = (await res.json()) as Report2ApiResponse & { error?: string };

            if (!res.ok || payload.status !== 200 || !payload.data) {
                throw new Error(payload.error || payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            const transformed = transformRows(payload.data, monthKeys);
            setAllData(transformed.rows);
            setBusinessUnitOptions(transformed.unitOptions);
            setSelectedUnits((prev) => {
                const existing = prev.filter((unit) => transformed.unitOptions.includes(unit));
                return existing.length > 0 ? existing : transformed.unitOptions;
            });
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch report2 data:', error);
            setAllData([]);
            setBusinessUnitOptions([]);
            setSelectedUnits([]);
            setHasSearched(true);
            alert('ไม่สามารถดึงข้อมูลรายงานได้');
        } finally {
            setLoading(false);
        }
    }, []);

    const onSearch = async (values: SearchFormValues) => {
        const nextStart = values.startMonth || startMonth;
        const nextEnd = values.endMonth || endMonth;

        if (nextStart.isAfter(nextEnd, 'month')) {
            alert('เดือนเริ่มต้นต้องไม่มากกว่าเดือนสิ้นสุด');
            return;
        }

        setStartMonth(nextStart);
        setEndMonth(nextEnd);
        await fetchReportData(nextStart, nextEnd);
    };

    const onCheckboxChange = (list: CheckboxValueType[]) => {
        setCheckedList(list);
    };

    const getDiffValue = (record: DataType, currentKey: string, prevKey: string): number => {
        const explicitDiff = toNumberOrNull(record[`${currentKey}_diff`]);
        if (explicitDiff !== null) return explicitDiff;

        const current = toNumber(record[currentKey]);
        const prev = toNumber(record[prevKey]);
        return current - prev;
    };

    const handleExportExcel = async () => {
        if (!data.length || !months.length) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 02');

        const visible = (key: string) => isColumnVisible(key, checkedList, selectedDatasets);

        const header1: string[] = ['Business'];
        const header2: string[] = [''];
        const header3: string[] = [''];

        const dataKeys: string[] = ['unit'];

        months.forEach((monthKey) => {
            const monthLabel = dayjs(monthKey, 'YYYYMM').format('MMMM YYYY');
            const startCol = dataKeys.length;

            const addNumeric = (key: string, title: string, withDiff: boolean) => {
                if (!visible(key)) return;

                header2.push(title);
                header3.push('จำนวน');
                dataKeys.push(`${key}_${monthKey}`);

                if (withDiff) {
                    header2.push('');
                    header3.push('+/-');
                    dataKeys.push(`${key}_${monthKey}_diff_export`);
                }
            };

            addNumeric('frame_staff', 'กรอบ พนง.', true);
            addNumeric('frame_normal', 'ปกติ', true);
            addNumeric('people_normal', 'คน ปกติ', true);
            addNumeric('pool_rs', 'Pool RS', true);
            addNumeric('people_pool_rs', 'คน Pool RS', true);
            addNumeric('frame_sec', 'กรอบ Sec', true);
            addNumeric('traditional', 'Traditional', true);
            addNumeric('new_biz', 'New Biz', true);
            addNumeric('people_new_biz', 'คน New Biz', true);
            addNumeric('total_actual', 'รวม Actual', true);
            addNumeric('total_people', 'รวม คน', true);
            addNumeric('contact_out', 'Contact Out', false);
            addNumeric('contact_out_sub', 'Contact Out สัญญาย่อย', false);

            if (visible('remark')) {
                header2.push('หมายเหตุ');
                header3.push('ข้อความ');
                dataKeys.push(`remark_${monthKey}`);
            }

            const monthSpan = dataKeys.length - startCol;
            if (monthSpan > 0) {
                header1.push(`Actual ${monthLabel}`);
                for (let i = 1; i < monthSpan; i++) header1.push('');
            }
        });

        worksheet.addRow(header1);
        worksheet.addRow(header2);
        worksheet.addRow(header3);

        worksheet.mergeCells(1, 1, 3, 1);

        let colPtr = 2;
        months.forEach((monthKey) => {
            const monthLabel = dayjs(monthKey, 'YYYYMM').format('MMMM YYYY');
            const monthStartCol = colPtr;

            const countCols = () => {
                let count = 0;
                const add = (key: string, withDiff: boolean) => {
                    if (!visible(key)) return;
                    count += withDiff ? 2 : 1;
                };

                add('frame_staff', true);
                add('frame_normal', true);
                add('people_normal', true);
                add('pool_rs', true);
                add('people_pool_rs', true);
                add('frame_sec', true);
                add('traditional', true);
                add('new_biz', true);
                add('people_new_biz', true);
                add('total_actual', true);
                add('total_people', true);
                add('contact_out', false);
                add('contact_out_sub', false);
                if (visible('remark')) count += 1;
                return count;
            };

            const span = countCols();
            if (span <= 0) return;

            if (span > 1) worksheet.mergeCells(1, monthStartCol, 1, monthStartCol + span - 1);
            worksheet.getCell(1, monthStartCol).value = `Actual ${monthLabel}`;

            colPtr += span;
        });

        [1, 2, 3].forEach((rowNo) => {
            const row = worksheet.getRow(rowNo);
            row.eachCell((cell) => {
                cell.font = { bold: true, name: 'Sarabun' };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: rowNo === 1 ? 'FFBFDBFE' : rowNo === 2 ? 'FFE8F1FE' : 'FFF3F7FF' },
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' },
                    bottom: { style: 'thin' },
                };
            });
        });

        data.forEach((item) => {
            const row: (string | number)[] = [item.unit];

            months.forEach((monthKey) => {
                const prevMonthKey = dayjs(monthKey, 'YYYYMM').subtract(1, 'month').format('YYYYMM');

                const addValue = (key: string, withDiff: boolean) => {
                    if (!visible(key)) return;

                    const currentKey = `${key}_${monthKey}`;
                    row.push(toNumber(item[currentKey]));

                    if (withDiff) {
                        const diff = getDiffValue(item, currentKey, `${key}_${prevMonthKey}`);
                        row.push(diff !== 0 ? (diff > 0 ? `+${diff}` : `${diff}`) : '0');
                    }
                };

                addValue('frame_staff', true);
                addValue('frame_normal', true);
                addValue('people_normal', true);
                addValue('pool_rs', true);
                addValue('people_pool_rs', true);
                addValue('frame_sec', true);
                addValue('traditional', true);
                addValue('new_biz', true);
                addValue('people_new_biz', true);
                addValue('total_actual', true);
                addValue('total_people', true);
                addValue('contact_out', false);
                addValue('contact_out_sub', false);

                if (visible('remark')) {
                    row.push(String(item[`remark_${monthKey}`] ?? ''));
                }
            });

            worksheet.addRow(row);
        });

        worksheet.columns = dataKeys.map((key, idx) => ({
            width: idx === 0 ? 25 : key.includes('remark_') ? 30 : 12,
        }));

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 3) return;
            const unitCell = row.getCell(1);
            const isTotal = String(unitCell.value ?? '').trim() === 'รวม';

            row.eachCell((cell, colNo) => {
                cell.font = { ...cell.font, name: 'Sarabun', bold: isTotal };
                cell.alignment = { vertical: 'middle', horizontal: colNo === 1 ? 'left' : 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' },
                    bottom: { style: 'thin' },
                };

                if (isTotal) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFEFF6FF' },
                    };
                }

                const v = String(cell.value ?? '');
                if (v.startsWith('+')) {
                    cell.font = { ...cell.font, color: { argb: 'FF2563EB' } };
                } else if (v.startsWith('-')) {
                    cell.font = { ...cell.font, color: { argb: 'FFDC2626' } };
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        await saveExcelFile(blob, `รายงานสรุปภาพรวมการเปลี่ยนแปลงกรอบอัตราเปรียบเทียบรายเดือน_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const columns: ColumnsType<DataType> = useMemo(() => {
        const visible = (key: string) => isColumnVisible(key, checkedList, selectedDatasets);

        const baseColumns: ColumnsType<DataType> = [
            {
                title: 'Business',
                dataIndex: 'unit',
                key: 'unit',
                fixed: 'left',
                width: 180,
                className: 'bg-white z-20',
                onHeaderCell: () => ({ className: 'bg-blue-100! text-blue-900! font-bold' }),
                onCell: (record) => ({
                    className: isTotalUnit(record.unit) ? 'bg-blue-100! font-semibold text-blue-900!' : 'bg-white',
                }),
                render: (text: unknown) => <span className="font-medium text-gray-700">{String(text ?? '')}</span>,
            },
        ];

        months.forEach((monthKey) => {
            const monthLabel = dayjs(monthKey, 'YYYYMM').format('MMMM YYYY');
            const prevMonthKey = dayjs(monthKey, 'YYYYMM').subtract(1, 'month').format('YYYYMM');

            const monthGroup: ColumnsType<DataType>[number] = {
                title: `Actual ${monthLabel}`,
                onHeaderCell: () => ({ className: 'bg-blue-200! text-blue-900! font-bold! text-[14px]!' }),
                children: [],
            };

            const createCol = (
                key: string,
                title: string,
                width: number,
                bgHeader: string,
                textHeader: string,
                showDiff: boolean = true
            ): ColumnsType<DataType>[number] | null => {
                if (!visible(key)) return null;

                const currentKey = `${key}_${monthKey}`;
                const prevKey = `${key}_${prevMonthKey}`;

                const children: ColumnsType<DataType> = [
                    {
                        title: 'จำนวน',
                        dataIndex: currentKey,
                        key: currentKey,
                        width,
                        align: 'center',
                        className: 'bg-white',
                        onHeaderCell: () => ({ className: `${bgHeader} ${textHeader}` }),
                        onCell: (record) => ({
                            className: isTotalUnit(record.unit) ? `${bgHeader} font-semibold` : 'bg-white',
                        }),
                    },
                ];

                if (showDiff) {
                    children.push({
                        title: '+/-',
                        key: `${currentKey}_diff`,
                        width: 70,
                        align: 'center',
                        className: 'bg-white',
                        onHeaderCell: () => ({ className: `${bgHeader} ${textHeader}` }),
                        onCell: (record) => ({
                            className: isTotalUnit(record.unit) ? `${bgHeader} font-semibold` : 'bg-white',
                        }),
                        render: (_value: unknown, record: DataType) => {
                            const diff = getDiffValue(record, currentKey, prevKey);
                            const colorClass = diff > 0 ? 'text-blue-500' : diff < 0 ? 'text-red-500' : 'text-gray-900';
                            const text = diff > 0 ? `+${diff}` : `${diff}`;
                            return <span className={colorClass}>{text}</span>;
                        },
                    });
                }

                return {
                    title,
                    className: 'bg-white',
                    onHeaderCell: () => ({ className: `${bgHeader} ${textHeader}` }),
                    children,
                };
            };

            const cols = [
                createCol('frame_staff', 'กรอบ พนง.', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('frame_normal', 'ปกติ', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('people_normal', 'คน ปกติ', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('pool_rs', 'Pool RS', 80, 'bg-orange-200!', 'text-orange-900!'),
                createCol('people_pool_rs', 'คน Pool RS', 90, 'bg-blue-50!', 'text-blue-800!'),
                createCol('frame_sec', 'กรอบ Sec', 80, 'bg-orange-200!', 'text-orange-900!'),
                createCol('traditional', 'Traditional', 85, 'bg-blue-50!', 'text-blue-800!'),
                createCol('new_biz', 'New Biz', 80, 'bg-orange-200!', 'text-orange-900!'),
                createCol('people_new_biz', 'คน New Biz', 90, 'bg-blue-50!', 'text-blue-800!'),
                createCol('total_actual', 'รวม Actual', 80, 'bg-orange-200!', 'text-orange-900!'),
                createCol('total_people', 'รวม คน', 80, 'bg-red-50!', 'text-red-800!'),
                createCol('contact_out', 'Contact Out', 110, 'bg-purple-200!', 'text-purple-900!', false),
                createCol('contact_out_sub', 'Contact Out สัญญาย่อย', 130, 'bg-purple-200!', 'text-purple-900!', false),
            ];

            cols.forEach((col) => {
                if (col && monthGroup.children) {
                    monthGroup.children.push(col);
                }
            });

            if (visible('remark') && monthGroup.children) {
                monthGroup.children.push({
                    title: 'หมายเหตุ',
                    dataIndex: `remark_${monthKey}`,
                    key: `remark_${monthKey}`,
                    width: 220,
                    align: 'left',
                    className: 'bg-white',
                    onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-800!' }),
                    render: (text: unknown, record: DataType) => {
                        if (isTotalUnit(record.unit)) return null;
                        return <span className="text-xs text-gray-500">{String(text ?? '')}</span>;
                    },
                });
            }

            if (monthGroup.children && monthGroup.children.length > 0) {
                baseColumns.push(monthGroup);
            }
        });

        return baseColumns;
    }, [months, checkedList, selectedDatasets]);

    return (
        <Main currentPath="/report">
            <div className="space-y-6 w-full min-w-0">
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <FileText className="text-2xl text-blue-100" />
                            <h1 className="text-2xl font-bold m-0 text-white">Report 02</h1>
                            <span className="hidden md:inline-block text-blue-100">|</span>
                            <span className="text-xl font-medium text-blue-50">
                                รายงานสรุปภาพรวมการเปลี่ยนแปลงกรอบอัตราเปรียบเทียบรายเดือน
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 relative z-50">
                    <Form
                        layout="inline"
                        onFinish={onSearch}
                        initialValues={{ startMonth, endMonth }}
                        className="flex items-center gap-2"
                    >
                        <Form.Item label="ตั้งแต่" name="startMonth" className="m-0">
                            <DatePicker picker="month" format="MMMM YYYY" allowClear={false} />
                        </Form.Item>
                        <Form.Item label="ถึง" name="endMonth" className="m-0">
                            <DatePicker picker="month" format="MMMM YYYY" allowClear={false} />
                        </Form.Item>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยธุรกิจ</label>
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
                            <MultiSelectFilter
                                label="เลือกแสดงข้อมูล"
                                options={datasetOptions}
                                selectedValues={selectedDatasets}
                                onChange={setSelectedDatasets}
                                width="w-40"
                            />
                        </div>

                        <Form.Item className="m-0">
                            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                                ค้นหา
                            </Button>
                        </Form.Item>
                    </Form>

                    {hasSearched && (
                        <div className="flex items-center gap-2">
                            <Button
                                icon={<FileExcelOutlined />}
                                onClick={handleExportExcel}
                                className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
                                disabled={data.length === 0}
                            >
                                Excel
                            </Button>

                            <Popover
                                placement="bottomLeft"
                                trigger="click"
                                getPopupContainer={() => document.body}
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
                                <Button
                                    icon={<SettingOutlined />}
                                    className="text-gray-600 border-gray-300 border-dashed hover:text-blue-600 hover:border-blue-500"
                                >
                                    ({checkedList.length})
                                </Button>
                            </Popover>
                        </div>
                    )}
                </div>

                {hasSearched && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-4 relative z-0">
                        <div className="w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-2rem)] overflow-hidden">
                            <Table
                                columns={columns}
                                dataSource={data}
                                loading={loading}
                                bordered
                                size="small"
                                scroll={{
                                    x: 'max-content',
                                }}
                                pagination={false}
                                sticky
                                className="[&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                            />
                        </div>
                    </div>
                )}
            </div>
        </Main>
    );
}
