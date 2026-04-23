'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Table, Button, Form, DatePicker, Popover, Checkbox } from 'antd';
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

interface Report5RawRow {
    [key: string]: unknown;
}

interface Report5ApiResponse {
    status: number;
    data?: Report5RawRow[];
    message?: string;
}

interface Report5FilterItem {
    BGNo?: string;
    BGName?: string;
    OrgUnitNo?: string;
    UnitText?: string;
    UnitName?: string;
    UnitAbbr?: string;
}

interface Report5FilterResponse {
    status: number;
    data?: {
        businessUnits: Report5FilterItem[];
        lines: Report5FilterItem[];
        units: Report5FilterItem[];
    };
    message?: string;
}

interface FilterOption {
    value: string;
    label: string;
}

interface SearchFormValues {
    startMonth?: Dayjs;
    endMonth?: Dayjs;
}

interface Report5DataType {
    key: string;
    unit_short: string;
    unit_code: string;
    unit_name: string;
    line_of_work_code: string;
    business_unit_code: string;
    date: string;
    frame_21: number;
    frame_18_20: number;
    frame_16_17: number;
    frame_14_15: number;
    frame_11_13: number;
    frame_9_10: number;
    frame_under_8: number;
    frame_total: number;
    transaction_change: number;
    operator: string;
    remark: string;
    log: string;
    line_of_work: string;
    business_unit: string;
    dataset: string;
    [key: string]: string | number;
}

const levelKeys = ['21', '18_20', '16_17', '14_15', '11_13', '9_10', 'under_8', 'total'];
const levelLabels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '8 ลงมา', 'รวม'];
type FrameMetricKey =
    | 'frame_21'
    | 'frame_18_20'
    | 'frame_16_17'
    | 'frame_14_15'
    | 'frame_11_13'
    | 'frame_9_10'
    | 'frame_under_8'
    | 'frame_total';
const datasetValues = ['ปกติ', 'PoolRS', 'Sec Pool'];
const datasetOptions: FilterOption[] = datasetValues.map((item) => ({ value: item, label: item }));

const columnOptions = [
    { label: 'ชื่อย่อ', value: 'unit_short' },
    { label: 'รหัส', value: 'unit_code' },
    { label: 'ชื่อหน่วยงาน', value: 'unit_name' },
    { label: 'วันที่', value: 'date' },
    { label: 'ชุดข้อมูล', value: 'dataset' },
    { label: 'กรอบอัตรากำลัง', value: 'frame' },
    { label: 'ยอดเปลี่ยนแปลงรายการ', value: 'transaction_change' },
    { label: 'ผู้ดำเนินการ', value: 'operator' },
    { label: 'หมายเหตุ', value: 'remark' },
    { label: 'Log', value: 'log' },
];

const defaultCheckedList = columnOptions.map((item) => item.value);

const toNumber = (value: unknown): number => {
    if (value === undefined || value === null || value === '') return 0;
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const toText = (value: unknown): string => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const normalizeFilterKey = (value: unknown): string => toText(value).toLowerCase();

const buildSelectedMatchSet = (selectedValues: string[], options: FilterOption[]): Set<string> => {
    const optionByValue = new Map(options.map((opt) => [normalizeFilterKey(opt.value), opt]));
    const matchSet = new Set<string>();

    selectedValues.forEach((rawValue) => {
        const normalizedValue = normalizeFilterKey(rawValue);
        if (!normalizedValue) return;

        matchSet.add(normalizedValue);

        const option = optionByValue.get(normalizedValue);
        if (!option) return;

        const normalizedLabel = normalizeFilterKey(option.label);
        if (normalizedLabel) matchSet.add(normalizedLabel);

        const separatorIndex = option.label.indexOf(' - ');
        if (separatorIndex > -1) {
            const labelWithoutCode = option.label.slice(separatorIndex + 3);
            const normalizedWithoutCode = normalizeFilterKey(labelWithoutCode);
            if (normalizedWithoutCode) matchSet.add(normalizedWithoutCode);
        }
    });

    return matchSet;
};

const toDisplayDate = (value: unknown): string => {
    const text = toText(value);
    if (!text) return '';

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;

    const d = dayjs(text);
    if (!d.isValid()) return '';
    return d.format('DD/MM/YYYY');
};

const resolveDataset = (value: unknown): string => {
    const text = toText(value).toLowerCase();
    const num = Number(value);

    if (Number.isFinite(num)) {
        if (num === 2) return 'PoolRS';
        if (num === 3) return 'Sec Pool';
        return 'ปกติ';
    }

    if (text.includes('sec')) return 'Sec Pool';
    if (text.includes('pool')) return 'PoolRS';
    if (text.includes('normal') || text.includes('ปกติ')) return 'ปกติ';
    return 'ปกติ';
};

const renderNumber = (value: unknown) => {
    if (value === undefined || value === null || value === '') return 0;
    return value;
};

const renderSignedChange = (value: unknown) => {
    const num = toNumber(value);
    if (num === 0) return 0;
    if (num > 0) return <span className="text-blue-600 font-semibold">+{num}</span>;
    return <span className="text-red-600 font-semibold">{num}</span>;
};

const resolveUserContext = () => {
    let employeeId = 'SYSTEM';
    let userGroupNo = '';

    if (typeof window !== 'undefined') {
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr) as { employeeID?: string; roleId?: string };
                employeeId = userData.employeeID || employeeId;
                userGroupNo = localStorage.getItem('selected_usergroup') || userData.roleId || '';
            } catch {
                // ignore parse failure and use defaults
            }
        }
    }

    return { employeeId, userGroupNo };
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

const toBgOption = (row: Report5FilterItem): FilterOption | null => {
    const value = toText(row.BGNo);
    const label = toText(row.BGName);
    if (!value || !label) return null;
    return { value, label };
};

const toLineOption = (row: Report5FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label: `${value} - ${label}` };
};

const toUnitOption = (row: Report5FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label: `${value} - ${label}` };
};

const toDateSortKeyFromDisplayDate = (value: string): number => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return Number.MAX_SAFE_INTEGER;
    const month = Number(match[2]);
    const day = Number(match[1]);
    const year = Number(match[3]);
    if (
        !Number.isFinite(month) ||
        !Number.isFinite(day) ||
        !Number.isFinite(year) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
    ) {
        return Number.MAX_SAFE_INTEGER;
    }
    return (year * 10000) + (month * 100) + day;
};

const pickFirstFiniteNumber = (...values: unknown[]): number | null => {
    for (const value of values) {
        if (value === undefined || value === null || value === '') continue;
        const num = Number(value);
        if (Number.isFinite(num)) return num;
    }
    return null;
};

const toGroupKey = (row: Report5DataType): string => {
    const unitKey = row.unit_code || `${row.unit_short}|${row.unit_name}`;
    return `${unitKey}|${row.dataset}`;
};

const withTransactionChanges = (
    rows: Report5DataType[],
    explicitChanges: Array<number | null>
): Report5DataType[] => {
    const output = rows.map((row) => {
        const clone: Report5DataType = { ...row };
        clone.transaction_change = 0;
        return clone;
    });

    const grouped = new Map<string, number[]>();
    output.forEach((row, index) => {
        const key = toGroupKey(row);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(index);
    });

    grouped.forEach((indices) => {
        const sortedIndices = [...indices].sort((a, b) => {
            const aDateKey = toDateSortKeyFromDisplayDate(output[a].date);
            const bDateKey = toDateSortKeyFromDisplayDate(output[b].date);
            if (aDateKey !== bDateKey) return aDateKey - bDateKey;
            return a - b;
        });

        sortedIndices.forEach((currentIndex, sortedPos) => {
            const currentRow = output[currentIndex];
            const explicitChange = explicitChanges[currentIndex];
            if (explicitChange !== null) {
                currentRow.transaction_change = explicitChange;
                return;
            }

            const previousIndex = sortedPos > 0 ? sortedIndices[sortedPos - 1] : undefined;
            if (previousIndex === undefined) {
                currentRow.transaction_change = 0;
                return;
            }
            const previousRow = output[previousIndex];
            currentRow.transaction_change = toNumber(currentRow.frame_total) - toNumber(previousRow.frame_total);
        });
    });

    return output;
};

const transformRows = (rows: Report5RawRow[]): Report5DataType[] => {
    let lastUnitShort = '';
    let lastUnitCode = '';
    let lastUnitName = '';
    let lastLineCode = '';
    let lastLineOfWork = '';
    let lastBusinessCode = '';
    let lastBusinessUnit = '';
    let lastDataset = 'ปกติ';

    const mapped: Report5DataType[] = [];
    const explicitChanges: Array<number | null> = [];

    rows.forEach((row, index) => {
        const frame21 = toNumber(row.frame_21 ?? row.amount1 ?? row.Amount1);
        const frame1820 = toNumber(row.frame_18_20 ?? row.amount2 ?? row.Amount2);
        const frame1617 = toNumber(row.frame_16_17 ?? row.amount3 ?? row.Amount3);
        const frame1415 = toNumber(row.frame_14_15 ?? row.amount4 ?? row.Amount4);
        const frame1113 = toNumber(row.frame_11_13 ?? row.amount5 ?? row.Amount5);
        const frame910 = toNumber(row.frame_9_10 ?? row.amount6 ?? row.Amount6);
        const frameUnder8 = toNumber(row.frame_under_8 ?? row.amount7 ?? row.Amount7);

        const total = toNumber(row.frame_total ?? row.tamount ?? row.TAmount ?? row.amount) || (
            frame21 +
            frame1820 +
            frame1617 +
            frame1415 +
            frame1113 +
            frame910 +
            frameUnder8
        );

        const unitShortRaw = toText(row.unit_short ?? row.UnitAbbr ?? row.DisplayName);
        const unitCodeRaw = toText(row.unit_code ?? row.OrgUnitNo);
        const unitNameRaw = toText(row.unit_name ?? row.UnitName ?? row.UnitAbbr ?? row.DisplayName);
        const lineCodeRaw = toText(row.line_of_work_code ?? row.ParentOrgUnitNo ?? row.parent_org_unit_no);
        const lineRaw = toText(row.line_of_work ?? row.ParentOrgUnitNo ?? row.GrandName2 ?? row.GrandName ?? row.GrandParent ?? row.SecUnitDummy);
        const businessCodeRaw = toText(row.business_unit_code ?? row.BGNo ?? row.bg_no);
        const businessRaw = toText(row.business_unit ?? row.BGName ?? row.BGNo);
        const operatorRaw = toText(row.operator ?? row.CreateByName);
        const datasetSource = row.dataset ?? row.typecal ?? row.TypeCal;
        const hasDatasetSource = datasetSource !== undefined && datasetSource !== null && datasetSource !== '';

        const unit_short = unitShortRaw || lastUnitShort;
        const unit_code = unitCodeRaw || lastUnitCode;
        const unit_name = unitNameRaw || lastUnitName;
        const line_of_work_code = lineCodeRaw || lastLineCode;
        const line_of_work = lineRaw || lastLineOfWork;
        const business_unit_code = businessCodeRaw || lastBusinessCode;
        const business_unit = businessRaw || lastBusinessUnit;
        const operator = operatorRaw;
        const dataset = hasDatasetSource ? resolveDataset(datasetSource) : lastDataset;

        if (unitShortRaw) lastUnitShort = unitShortRaw;
        if (unitCodeRaw) lastUnitCode = unitCodeRaw;
        if (unitNameRaw) lastUnitName = unitNameRaw;
        if (lineCodeRaw) lastLineCode = lineCodeRaw;
        if (lineRaw) lastLineOfWork = lineRaw;
        if (businessCodeRaw) lastBusinessCode = businessCodeRaw;
        if (businessRaw) lastBusinessUnit = businessRaw;
        if (hasDatasetSource) lastDataset = dataset;

        const explicitTransactionChange = pickFirstFiniteNumber(
            row.transaction_change,
            row.TransactionChange,
            row.diff_amount,
            row.DiffAmount,
            row.change_amount,
            row.ChangeAmount,
            row.tamount_diff,
            row.TAmountDiff
        );
        explicitChanges.push(explicitTransactionChange);

        mapped.push({
            key: toText(row.key) || `r5-${index + 1}`,
            unit_short,
            unit_code,
            unit_name,
            line_of_work_code,
            business_unit_code,
            date: toDisplayDate(row.date ?? row.EffectiveDate ?? row.effectivedate),
            frame_21: frame21,
            frame_18_20: frame1820,
            frame_16_17: frame1617,
            frame_14_15: frame1415,
            frame_11_13: frame1113,
            frame_9_10: frame910,
            frame_under_8: frameUnder8,
            frame_total: total,
            transaction_change: explicitTransactionChange ?? 0,
            operator,
            remark: toText(row.remark ?? row.Remark),
            log: toText(row.log ?? row.new_note ?? row.TransactionDesc),
            line_of_work,
            business_unit,
            dataset
        });
    });

    return withTransactionChanges(mapped, explicitChanges);
};

interface MultiSelectFilterProps {
    label: string;
    options: FilterOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    width?: string;
    singleSelect?: boolean;
}

function MultiSelectFilter({
    label,
    options,
    selectedValues,
    onChange,
    width = 'w-64',
    singleSelect = false
}: MultiSelectFilterProps) {
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

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (option: string) => {
        if (singleSelect) {
            if (selectedValues.includes(option)) onChange([]);
            else onChange([option]);
            return;
        }

        if (selectedValues.includes(option)) onChange(selectedValues.filter((v) => v !== option));
        else onChange([...selectedValues, option]);
    };

    const handleSelectAll = () => {
        if (singleSelect) return;
        if (selectedValues.length === options.length) onChange([]);
        else onChange(options.map((item) => item.value));
    };

    return (
        <div className="relative" ref={containerRef}>
            <div
                className={`${width} min-h-[32px] px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="truncate flex gap-1 flex-wrap">
                    {selectedValues.length === 0 ? (
                        <span className="text-gray-400">{label}...</span>
                    ) : selectedValues.length === options.length && !singleSelect ? (
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
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[260] overflow-hidden">
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
                        {!singleSelect && filteredOptions.length > 0 && (
                            <div
                                className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50"
                                onClick={handleSelectAll}
                            >
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
                            <div
                                key={option.value}
                                className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => toggleOption(option.value)}
                            >
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

export default function Report5Page() {
    const [form] = Form.useForm<SearchFormValues>();
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const tableAreaRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] = useState(600);

    const [allData, setAllData] = useState<Report5DataType[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const [businessUnitOptions, setBusinessUnitOptions] = useState<FilterOption[]>([]);
    const [lineOfWorkOptions, setLineOfWorkOptions] = useState<FilterOption[]>([]);
    const [orgUnitOptions, setOrgUnitOptions] = useState<FilterOption[]>([]);

    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>([]);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetValues);

    const [appliedBusinessUnits, setAppliedBusinessUnits] = useState<string[]>([]);
    const [appliedOrgUnits, setAppliedOrgUnits] = useState<string[]>([]);
    const [appliedLinesOfWork, setAppliedLinesOfWork] = useState<string[]>([]);
    const [appliedDatasets, setAppliedDatasets] = useState<string[]>(datasetValues);

    const [checkedList, setCheckedList] = useState<string[]>(defaultCheckedList);
    const [appliedCheckedList, setAppliedCheckedList] = useState<string[]>(defaultCheckedList);

    const [startMonth, setStartMonth] = useState<Dayjs>(dayjs());
    const [endMonth, setEndMonth] = useState<Dayjs>(dayjs());

    const fetchFilterOptions = useCallback(
        async (effectiveDate: Dayjs, bgNo = '', division = '', signal?: AbortSignal) => {
            const { employeeId, userGroupNo } = resolveUserContext();

            try {
                const query = new URLSearchParams({
                    fromDate: effectiveDate.format('YYYY-MM-01'),
                    employeeId,
                    userGroupNo,
                });
                if (bgNo) query.set('bgNo', bgNo);
                if (division) query.set('division', division);

                const res = await fetch(`/api/report/report5/filters?${query.toString()}`, { signal });
                let payload: Report5FilterResponse | null = null;

                try {
                    payload = await res.json();
                } catch {
                    payload = null;
                }

                if (!res.ok || !payload || payload.status !== 200 || !payload.data) {
                    setBusinessUnitOptions([]);
                    setLineOfWorkOptions([]);
                    setOrgUnitOptions([]);
                    setSelectedBusinessUnits((prev) => (prev.length > 0 ? [] : prev));
                    setSelectedLinesOfWork((prev) => (prev.length > 0 ? [] : prev));
                    setSelectedOrgUnits((prev) => (prev.length > 0 ? [] : prev));
                    return;
                }

                const nextBusinessOptions = uniqueOptions(
                    payload.data.businessUnits
                        .map(toBgOption)
                        .filter((item): item is FilterOption => item !== null)
                );

                const nextLineOptions = uniqueOptions(
                    payload.data.lines
                        .map(toLineOption)
                        .filter((item): item is FilterOption => item !== null)
                );

                const nextOrgOptions = uniqueOptions(
                    payload.data.units
                        .map(toUnitOption)
                        .filter((item): item is FilterOption => item !== null)
                );

                setBusinessUnitOptions(nextBusinessOptions);
                setLineOfWorkOptions(nextLineOptions);
                setOrgUnitOptions(nextOrgOptions);

                setSelectedBusinessUnits((prev) => syncSelected(prev, nextBusinessOptions));
                setSelectedLinesOfWork((prev) => syncSelected(prev, nextLineOptions));
                setSelectedOrgUnits((prev) => syncSelected(prev, nextOrgOptions));
            } catch (error) {
                if (signal?.aborted) return;
                console.error('Failed to fetch report5 filters:', error);
            }
        },
        []
    );

    const fetchReportData = useCallback(async (
        from: Dayjs,
        to: Dayjs,
        division = '',
        orgUnitNo = ''
    ) => {
        const { employeeId, userGroupNo } = resolveUserContext();
        setLoading(true);

        try {
            const query = new URLSearchParams({
                fromDate: from.format('YYYY-MM-01'),
                // Include the full end month in the query range.
                toDate: to.endOf('month').format('YYYY-MM-DD'),
                employeeId,
                userGroupNo,
            });

            if (division) query.set('division', division);
            if (orgUnitNo) query.set('orgUnitNo', orgUnitNo);

            const res = await fetch(`/api/report/report5?${query.toString()}`);
            const payload: Report5ApiResponse = await res.json();

            if (!res.ok || payload.status !== 200 || !Array.isArray(payload.data)) {
                throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            setAllData(transformRows(payload.data));
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch report5 data:', error);
            setAllData([]);
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
        setAppliedCheckedList([...checkedList]);
        setAppliedDatasets([...selectedDatasets]);
        setAppliedBusinessUnits([...selectedBusinessUnits]);
        setAppliedLinesOfWork([...selectedLinesOfWork]);
        setAppliedOrgUnits([...selectedOrgUnits]);

        await fetchReportData(
            nextStart,
            nextEnd,
            '',
            selectedOrgUnits.join(',')
        );
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            try {
                await fullscreenRef.current?.requestFullscreen();
                setIsFullscreen(true);
            } catch (err) {
                console.error('Fullscreen failed:', err);
            }
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handler = () => {
            if (!document.fullscreenElement) setIsFullscreen(false);
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
            const availableHeight = Math.floor(window.innerHeight - rect.top - 100);
            setTableScrollY(Math.max(260, availableHeight));
        };

        const raf = window.requestAnimationFrame(updateTableHeight);
        window.addEventListener('resize', updateTableHeight);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateTableHeight);
        };
    }, [hasSearched, isFullscreen, checkedList.length, allData.length]);

    const selectedBusinessUnit = selectedBusinessUnits.length === 1 ? selectedBusinessUnits[0] : '';
    const selectedLineOfWork = selectedLinesOfWork.length === 1 ? selectedLinesOfWork[0] : '';

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            void fetchFilterOptions(startMonth, selectedBusinessUnit, selectedLineOfWork, controller.signal);
        }, 220);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [startMonth, selectedBusinessUnit, selectedLineOfWork, fetchFilterOptions]);

    const effectiveCheckedList = useMemo(() => {
        return appliedCheckedList;
    }, [appliedCheckedList]);

    const filteredData = useMemo(() => {
        const businessMatchSet = buildSelectedMatchSet(appliedBusinessUnits, businessUnitOptions);
        const lineMatchSet = buildSelectedMatchSet(appliedLinesOfWork, lineOfWorkOptions);
        const orgMatchSet = buildSelectedMatchSet(appliedOrgUnits, orgUnitOptions);

        const canFilterBusiness =
            businessMatchSet.size > 0 &&
            allData.some((item) => normalizeFilterKey(item.business_unit_code) || normalizeFilterKey(item.business_unit));
        const canFilterLine =
            lineMatchSet.size > 0 &&
            allData.some((item) => normalizeFilterKey(item.line_of_work_code) || normalizeFilterKey(item.line_of_work));
        const canFilterOrg = orgMatchSet.size > 0 && allData.some((item) => normalizeFilterKey(item.unit_code));

        return allData.filter((item) => {
            const businessOk =
                !canFilterBusiness ||
                businessMatchSet.has(normalizeFilterKey(item.business_unit_code)) ||
                businessMatchSet.has(normalizeFilterKey(item.business_unit));
            const lineOk =
                !canFilterLine ||
                lineMatchSet.has(normalizeFilterKey(item.line_of_work_code)) ||
                lineMatchSet.has(normalizeFilterKey(item.line_of_work));
            const orgOk = !canFilterOrg || orgMatchSet.has(normalizeFilterKey(item.unit_code));
            const datasetOk = appliedDatasets.includes(item.dataset);
            return businessOk && lineOk && orgOk && datasetOk;
        });
    }, [
        allData,
        appliedBusinessUnits,
        appliedLinesOfWork,
        appliedOrgUnits,
        appliedDatasets,
        businessUnitOptions,
        lineOfWorkOptions,
        orgUnitOptions
    ]);

    const tableDataWithSummary = useMemo(() => {
        if (!filteredData.length) return [];

        const totalRow: Report5DataType = {
            key: 'TOTAL_SUMMARY',
            unit_short: '',
            unit_code: '',
            unit_name: 'รวมทั้งสิ้น (Grand Total)',
            line_of_work_code: '',
            business_unit_code: '',
            date: '',
            frame_21: 0,
            frame_18_20: 0,
            frame_16_17: 0,
            frame_14_15: 0,
            frame_11_13: 0,
            frame_9_10: 0,
            frame_under_8: 0,
            frame_total: 0,
            transaction_change: 0,
            operator: '',
            remark: '',
            log: '',
            line_of_work: '',
            business_unit: '',
            dataset: ''
        };

        filteredData.forEach((item) => {
            Object.keys(item).forEach((key) => {
                const value = item[key];
                if (typeof value === 'number') {
                    totalRow[key] = toNumber(totalRow[key]) + value;
                }
            });
        });

        return [...filteredData, totalRow];
    }, [filteredData]);

    const tableDisplayData = useMemo(() => {
        if (!tableDataWithSummary.length) return [];

        let previousUnitKey = '';

        return tableDataWithSummary.map((item) => {
            if (item.key === 'TOTAL_SUMMARY') {
                previousUnitKey = '';
                return item;
            }

            const unitKey = item.unit_code || `${item.unit_short}|${item.unit_name}`;
            if (!unitKey) return item;

            if (unitKey === previousUnitKey) {
                return {
                    ...item,
                    unit_short: '',
                    unit_code: '',
                    unit_name: ''
                };
            }

            previousUnitKey = unitKey;
            return item;
        });
    }, [tableDataWithSummary]);

    const handleExportExcel = async () => {
        if (!tableDataWithSummary.length) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 05');

        const colors = {
            blue50: 'FFEFF6FF',
            blue100: 'FFDBEAFE',
            blue200: 'FFBFDBFE',
            green100: 'FFDCFCE7',
            gray100: 'FFF3F4F6',
            amber50: 'FFFFFBEB',
            amber100: 'FFFEF3C7',
        };

        const isShow = (k: string) => effectiveCheckedList.includes(k);

        const headersRow1: string[] = [];
        const headersRow2: string[] = [];
        const dataKeys: string[] = [];

        const addBasicHeader = (label: string, key: string) => {
            if (!isShow(key)) return;
            headersRow1.push(label);
            headersRow2.push('');
            dataKeys.push(key);
        };

        addBasicHeader('ชื่อย่อ', 'unit_short');
        addBasicHeader('รหัส', 'unit_code');
        addBasicHeader('ชื่อหน่วยงาน', 'unit_name');
        addBasicHeader('วันที่', 'date');
        addBasicHeader('ชุดข้อมูล', 'dataset');

        const frameStart = dataKeys.length + 1;
        const hasFrame = isShow('frame');
        const frameItems: Array<{ label: string; key: FrameMetricKey }> = [
            { label: '21', key: 'frame_21' },
            { label: '18-20', key: 'frame_18_20' },
            { label: '16-17', key: 'frame_16_17' },
            { label: '14-15', key: 'frame_14_15' },
            { label: '11-13', key: 'frame_11_13' },
            { label: '9-10', key: 'frame_9_10' },
            { label: '8 ลงมา', key: 'frame_under_8' },
            { label: 'รวม', key: 'frame_total' }
        ];

        if (hasFrame) {
            headersRow1.push('กรอบอัตรากำลังในระบบ SAP');
            headersRow2.push(frameItems[0].label);
            dataKeys.push(frameItems[0].key);

            frameItems.slice(1).forEach((item) => {
                headersRow1.push('');
                headersRow2.push(item.label);
                dataKeys.push(item.key);
            });
        }

        addBasicHeader('ยอดเปลี่ยนแปลงรายการ', 'transaction_change');

        addBasicHeader('ผู้ดำเนินการ', 'operator');
        addBasicHeader('หมายเหตุ', 'remark');
        addBasicHeader('Log', 'log');

        const r1 = worksheet.addRow(headersRow1);
        const r2 = worksheet.addRow(headersRow2);

        let col = 1;
        while (col <= dataKeys.length) {
            const key = dataKeys[col - 1];

            if (hasFrame && key === 'frame_21') {
                const frameEnd = frameStart + frameItems.length - 1;
                worksheet.mergeCells(1, frameStart, 1, frameEnd);
                worksheet.getCell(1, frameStart).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.blue200 } };
                worksheet.getCell(1, frameStart).alignment = { horizontal: 'center', vertical: 'middle' };

                for (let i = frameStart; i <= frameEnd; i++) {
                    const subCell = worksheet.getCell(2, i);
                    const isTotal = i === frameEnd;
                    subCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: isTotal ? colors.blue100 : colors.blue50 }
                    };
                    subCell.alignment = { horizontal: 'center' };
                }

                col = frameEnd + 1;
                continue;
            }

            worksheet.mergeCells(1, col, 2, col);
            const fill = key === 'transaction_change'
                ? colors.amber100
                : (key === 'operator' || key === 'remark' || key === 'log')
                    ? colors.green100
                    : colors.blue100;
            worksheet.getCell(1, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
            col += 1;
        }

        [r1, r2].forEach((row) => row.eachCell((cell) => {
            cell.font = { bold: true, name: 'Sarabun', size: 10 };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }));

        tableDataWithSummary.forEach((item) => {
            const rowValues = dataKeys.map((key) => {
                const val = item[key];
                if (key === 'transaction_change') {
                    const diff = toNumber(val);
                    if (diff > 0) return `+${diff}`;
                    return `${diff}`;
                }
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
                    let fillColor = colors.gray100;
                    if (key.startsWith('frame_')) fillColor = colors.blue200;
                    else if (key === 'transaction_change') fillColor = colors.amber100;

                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    cell.font = { bold: true, name: 'Sarabun', size: 10 };
                    cell.border = {
                        top: { style: 'double' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            } else {
                row.eachCell((cell, colNumber) => {
                    const key = dataKeys[colNumber - 1];
                    const cellText = String(cell.value ?? '');
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.font = { name: 'Sarabun', size: 10 };
                    if (key === 'transaction_change') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.amber50 } };
                        if (cellText.startsWith('+')) {
                            cell.font = { name: 'Sarabun', size: 10, color: { argb: 'FF2563EB' } };
                        } else if (cellText.startsWith('-')) {
                            cell.font = { name: 'Sarabun', size: 10, color: { argb: 'FFDC2626' } };
                        }
                    } else if (key === 'frame_total') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.blue50 } };
                        cell.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
                    }
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        await saveExcelFile(blob, `รายงานการเปลี่ยนแปลงกรอบของหน่วยงาน_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const columns: ColumnsType<Report5DataType> = useMemo(() => {
        const isShow = (k: string) => effectiveCheckedList.includes(k);

        const getBasicCellProps = (record: Report5DataType) => record.key === 'TOTAL_SUMMARY'
            ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
            : { className: 'bg-white' };

        const generateFrameColumns = () => {
            return levelKeys.map((key, index) => ({
                title: levelLabels[index],
                dataIndex: `frame_${key}`,
                key: `frame_${key}`,
                width: key === 'total' ? 70 : 60,
                align: 'center' as const,
                className: key === 'total' ? 'bg-blue-50! font-bold text-blue-900' : '',
                onHeaderCell: () => ({
                    className: key === 'total' ? 'bg-blue-100! text-blue-900! font-bold' : 'bg-blue-50! text-blue-700'
                }),
                render: renderNumber,
                onCell: (record: Report5DataType) => {
                    if (record.key === 'TOTAL_SUMMARY') {
                        return { className: 'bg-blue-200! font-bold text-gray-900 border-t-2! border-t-gray-300!' };
                    }
                    if (key === 'total') {
                        return { className: 'bg-blue-50! font-bold text-blue-900' };
                    }
                    return { className: 'bg-white' };
                }
            }));
        };

        return [
            ...(isShow('unit_short') ? [{ title: 'ชื่อย่อ', dataIndex: 'unit_short', key: 'unit_short', width: 100, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_code') ? [{ title: 'รหัส', dataIndex: 'unit_code', key: 'unit_code', width: 80, fixed: 'left' as const, onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('unit_name') ? [{
                title: 'ชื่อหน่วยงาน',
                dataIndex: 'unit_name',
                key: 'unit_name',
                width: 260,
                ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }),
                onCell: getBasicCellProps
            }] : []),
            ...(isShow('date') ? [{ title: 'วันที่', dataIndex: 'date', key: 'date', width: 110, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('dataset') ? [{ title: 'ชุดข้อมูล', dataIndex: 'dataset', key: 'dataset', width: 110, align: 'center' as const, onHeaderCell: () => ({ className: 'bg-blue-100! text-black! font-bold' }), onCell: getBasicCellProps }] : []),
            ...(isShow('frame') ? [{
                title: 'กรอบอัตรากำลังในระบบ SAP',
                className: 'bg-blue-200! text-black! font-bold text-center',
                children: generateFrameColumns()
            }] : []),
            ...(isShow('transaction_change') ? [{
                title: 'ยอดเปลี่ยนแปลงรายการ',
                dataIndex: 'transaction_change',
                key: 'transaction_change',
                width: 130,
                align: 'center' as const,
                render: renderSignedChange,
                onHeaderCell: () => ({ className: 'bg-amber-100! text-amber-900 font-bold' }),
                onCell: (record: Report5DataType) => record.key === 'TOTAL_SUMMARY'
                    ? { className: 'bg-amber-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
                    : { className: 'bg-amber-50!' }
            }] : []),
            ...(isShow('operator') ? [{
                title: <div className="w-full text-center">ผู้ดำเนินการ</div>,
                dataIndex: 'operator',
                key: 'operator',
                width: 150,
                onHeaderCell: () => ({ className: 'bg-green-100! text-green-900 font-bold !text-center' }),
                onCell: getBasicCellProps
            }] : []),
            ...(isShow('remark') ? [{
                title: <div className="w-full text-center">หมายเหตุ</div>,
                dataIndex: 'remark',
                key: 'remark',
                width: 200,
                ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-green-100! text-green-900 font-bold !text-center' }),
                onCell: getBasicCellProps
            }] : []),
            ...(isShow('log') ? [{
                title: <div className="w-full text-center">Log</div>,
                dataIndex: 'log',
                key: 'log',
                width: 140,
                ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-green-100! text-green-900 font-bold !text-center' }),
                onCell: getBasicCellProps
            }] : []),
        ];
    }, [effectiveCheckedList]);

    const handleVerticalScroll = (direction: 'top' | 'bottom') => {
        const root = tableAreaRef.current;
        if (!root) return;

        const candidates = Array.from(
            root.querySelectorAll<HTMLElement>('.ant-table-body, .ant-table-content')
        );
        const scrollables = candidates.filter(
            (element) => element.scrollHeight - element.clientHeight > 4
        );

        if (!scrollables.length) return;

        window.requestAnimationFrame(() => {
            scrollables.forEach((element) => {
                const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
                const next = direction === 'top' ? 0 : maxScrollTop;
                element.scrollTop = next;
                element.scrollTo({ top: next, behavior: 'auto' });
            });
        });
    };

    return (
        <Main currentPath="/report">
            <div ref={fullscreenRef} className={`space-y-6 w-full min-w-0 ${isFullscreen ? 'bg-white p-4 overflow-auto' : ''}`}>
                {!isFullscreen && (
                    <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md border border-blue-500 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="text-2xl text-blue-100" />
                                <h1 className="text-2xl font-bold m-0 text-white">Report 05</h1>
                                <span className="hidden md:inline-block text-blue-100">|</span>
                                <span className="text-xl font-medium text-blue-50">รายงานการเปลี่ยนแปลงกรอบของหน่วยงาน</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-[200]">
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={onSearch}
                        initialValues={{ startMonth, endMonth }}
                        className="flex items-center gap-2 flex-wrap"
                    >
                        <Form.Item label="ตั้งแต่" name="startMonth" className="m-0">
                            <DatePicker
                                picker="month"
                                format="MMMM YYYY"
                                allowClear={false}
                                className="w-40"
                                getPopupContainer={() => fullscreenRef.current || document.body}
                            />
                        </Form.Item>

                        <Form.Item label="ถึง" name="endMonth" className="m-0">
                            <DatePicker
                                picker="month"
                                format="MMMM YYYY"
                                allowClear={false}
                                className="w-40"
                                getPopupContainer={() => fullscreenRef.current || document.body}
                            />
                        </Form.Item>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยธุรกิจ</label>
                            <MultiSelectFilter
                                label="เลือกหน่วยธุรกิจ"
                                options={businessUnitOptions}
                                selectedValues={selectedBusinessUnits}
                                onChange={setSelectedBusinessUnits}
                                width="w-40"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">สายงาน</label>
                            <MultiSelectFilter
                                label="เลือกสายงาน"
                                options={lineOfWorkOptions}
                                selectedValues={selectedLinesOfWork}
                                onChange={setSelectedLinesOfWork}
                                width="w-40"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยงาน</label>
                            <MultiSelectFilter
                                label="เลือกหน่วยงาน"
                                options={orgUnitOptions}
                                selectedValues={selectedOrgUnits}
                                onChange={setSelectedOrgUnits}
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

                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>ค้นหา</Button>
                    </Form>

                    {hasSearched && (
                        <div className="flex items-center gap-2 relative z-[210]">
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
                                loading={loading || !hasSearched}
                                className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
                            >
                                Excel
                            </Button>

                            <Popover
                                placement="bottomLeft"
                                trigger="click"
                                zIndex={220}
                                getPopupContainer={() => fullscreenRef.current || document.body}
                                content={
                                    <div className="w-64 max-h-96 overflow-y-auto">
                                        <div className="mb-2 font-bold text-gray-700 border-b pb-1">เลือกแสดงกลุ่มข้อมูล</div>
                                        <Checkbox.Group
                                            options={columnOptions}
                                            value={checkedList}
                                            onChange={(list) => setCheckedList(list.map((v) => String(v)))}
                                            className="flex flex-col gap-2"
                                        />
                                    </div>
                                }
                            >
                                <Button icon={<SettingOutlined />}>({checkedList.length})</Button>
                            </Popover>
                        </div>
                    )}
                </div>

                {hasSearched && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-4 z-0">
                        <div ref={tableAreaRef} className="relative group/table">
                            <div className="pointer-events-none absolute bottom-6 right-6 flex flex-col gap-2 z-50 invisible opacity-0 transition-opacity duration-150 group-hover/table:visible group-hover/table:opacity-100">
                                <button
                                    onClick={() => handleVerticalScroll('top')}
                                    className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg border border-blue-500 rounded-full p-3 flex items-center justify-center cursor-pointer"
                                    aria-label="Scroll to Top"
                                    title="ขึ้นบนสุด"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => handleVerticalScroll('bottom')}
                                    className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg border border-blue-500 rounded-full p-3 flex items-center justify-center cursor-pointer"
                                    aria-label="Scroll to Bottom"
                                    title="ลงล่างสุด"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            <div
                                ref={tableContainerRef}
                                className="w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-2rem)] overflow-hidden"
                            >
                                <Table
                                    columns={columns}
                                    dataSource={tableDisplayData}
                                    loading={loading}
                                    bordered
                                    size="small"
                                    scroll={{ x: 'max-content', y: tableScrollY }}
                                    pagination={false}
                                    sticky
                                    className="report5-table [&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                                    rowClassName={(record) => record.key === 'TOTAL_SUMMARY' ? 'font-bold' : 'bg-white'}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .report5-table .ant-table-header.ant-table-sticky-holder {
                    z-index: 1 !important;
                }
            `}</style>
        </Main>
    );
}
