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

interface Report4RawRow {
    [key: string]: unknown;
}

interface Report4ApiResponse {
    status: number;
    data?: Report4RawRow[];
    message?: string;
}

interface Report4FilterItem {
    BGNo?: string;
    BGName?: string;
    OrgUnitNo?: string;
    UnitText?: string;
    UnitName?: string;
    UnitAbbr?: string;
}

interface Report4FilterResponse {
    status: number;
    data?: {
        businessUnits: Report4FilterItem[];
        lines: Report4FilterItem[];
        units: Report4FilterItem[];
    };
    message?: string;
}

interface FilterOption {
    value: string;
    label: string;
}

interface SearchFormValues {
    date?: Dayjs;
}

interface Report4DataType {
    key: string;
    unit_short: string;
    unit_code: string;
    unit_name: string;
    line_of_work: string;
    level: string;
    business_unit: string;

    frame_staff_21?: number; frame_staff_21_change?: number;
    frame_staff_18_20?: number; frame_staff_18_20_change?: number;
    frame_staff_16_17?: number; frame_staff_16_17_change?: number;
    frame_staff_14_15?: number; frame_staff_14_15_change?: number;
    frame_staff_11_13?: number; frame_staff_11_13_change?: number;
    frame_staff_9_10?: number; frame_staff_9_10_change?: number;
    frame_staff_under_8?: number; frame_staff_under_8_change?: number;
    frame_staff_total?: number; frame_staff_total_change?: number;

    people_normal_21?: number; people_normal_21_change?: number;
    people_normal_18_20?: number; people_normal_18_20_change?: number;
    people_normal_16_17?: number; people_normal_16_17_change?: number;
    people_normal_14_15?: number; people_normal_14_15_change?: number;
    people_normal_11_13?: number; people_normal_11_13_change?: number;
    people_normal_9_10?: number; people_normal_9_10_change?: number;
    people_normal_under_8?: number; people_normal_under_8_change?: number;
    people_normal_total?: number; people_normal_total_change?: number;

    frame_sec_21?: number; frame_sec_21_change?: number;
    frame_sec_18_20?: number; frame_sec_18_20_change?: number;
    frame_sec_16_17?: number; frame_sec_16_17_change?: number;
    frame_sec_14_15?: number; frame_sec_14_15_change?: number;
    frame_sec_11_13?: number; frame_sec_11_13_change?: number;
    frame_sec_9_10?: number; frame_sec_9_10_change?: number;
    frame_sec_under_8?: number; frame_sec_under_8_change?: number;
    frame_sec_total?: number; frame_sec_total_change?: number;

    people_sec_21?: number; people_sec_21_change?: number;
    people_sec_18_20?: number; people_sec_18_20_change?: number;
    people_sec_16_17?: number; people_sec_16_17_change?: number;
    people_sec_14_15?: number; people_sec_14_15_change?: number;
    people_sec_11_13?: number; people_sec_11_13_change?: number;
    people_sec_9_10?: number; people_sec_9_10_change?: number;
    people_sec_under_8?: number; people_sec_under_8_change?: number;
    people_sec_total?: number; people_sec_total_change?: number;

    total_frame_normal?: number; total_frame_normal_change?: number;
    total_frame_pool?: number; total_frame_pool_change?: number;
    total_frame_trad?: number; total_frame_trad_change?: number;
    total_frame_newbiz?: number; total_frame_newbiz_change?: number;
    total_frame_total?: number; total_frame_total_change?: number;

    total_people_normal?: number; total_people_normal_change?: number;
    total_people_pool?: number; total_people_pool_change?: number;
    total_people_trad?: number; total_people_trad_change?: number;
    total_people_newbiz?: number; total_people_newbiz_change?: number;
    total_people_total?: number; total_people_total_change?: number;

    recruit_total?: number; recruit_total_change?: number;

    vacancy_21?: number; vacancy_21_change?: number;
    vacancy_18_20?: number; vacancy_18_20_change?: number;
    vacancy_16_17?: number; vacancy_16_17_change?: number;
    vacancy_14_15?: number; vacancy_14_15_change?: number;
    vacancy_11_13?: number; vacancy_11_13_change?: number;
    vacancy_9_10?: number; vacancy_9_10_change?: number;
    vacancy_under_8?: number; vacancy_under_8_change?: number;
    vacancy_total?: number; vacancy_total_change?: number;

    contact_out?: number; contact_out_change?: number;
    contact_out_sub?: number; contact_out_sub_change?: number;

    remark?: string;
    log?: string;
    [key: string]: string | number | undefined;
}

const datasetValues = ['ปกติ', 'PoolRS', 'Sec Pool'];
const datasetOptions: FilterOption[] = datasetValues.map((item) => ({ value: item, label: item }));
const levelKeys = ['21', '18_20', '16_17', '14_15', '11_13', '9_10', 'under_8', 'total'];
const levelLabels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '8 ลงมา', 'รวม'];

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

const defaultCheckedList = columnOptions.map((item) => item.value);

const numericKeys = [
    ...levelKeys.flatMap((k) => [`frame_staff_${k}`, `frame_staff_${k}_change`]),
    ...levelKeys.flatMap((k) => [`people_normal_${k}`, `people_normal_${k}_change`]),
    ...levelKeys.flatMap((k) => [`frame_sec_${k}`, `frame_sec_${k}_change`]),
    ...levelKeys.flatMap((k) => [`people_sec_${k}`, `people_sec_${k}_change`]),
    ...levelKeys.flatMap((k) => [`vacancy_${k}`, `vacancy_${k}_change`]),
    'total_frame_normal', 'total_frame_normal_change',
    'total_frame_pool', 'total_frame_pool_change',
    'total_frame_trad', 'total_frame_trad_change',
    'total_frame_newbiz', 'total_frame_newbiz_change',
    'total_frame_total', 'total_frame_total_change',
    'total_people_normal', 'total_people_normal_change',
    'total_people_pool', 'total_people_pool_change',
    'total_people_trad', 'total_people_trad_change',
    'total_people_newbiz', 'total_people_newbiz_change',
    'total_people_total', 'total_people_total_change',
    'recruit_total', 'recruit_total_change',
    'contact_out', 'contact_out_change',
    'contact_out_sub', 'contact_out_sub_change',
];

const toNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const renderNumber = (value: unknown) => {
    if (value === undefined || value === null || value === '') return 0;
    return value;
};

const renderChange = (value: unknown) => {
    if (value === undefined || value === null || value === '') return 0;
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return 0;
    if (num > 0) return <span className="text-blue-600 font-bold">+{num}</span>;
    return <span className="text-red-600 font-bold">{num}</span>;
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
    const next = prev.filter((item) => options.some((opt) => opt.value === item)).slice(0, 1);
    return isSameSelection(prev, next) ? prev : next;
};

const toBgOption = (row: Report4FilterItem): FilterOption | null => {
    const value = toText(row.BGNo);
    const label = toText(row.BGName);
    if (!value || !label) return null;
    return { value, label };
};

const toLineOption = (row: Report4FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label };
};

const toUnitOption = (row: Report4FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label };
};

const transformRows = (rows: Report4RawRow[]): Report4DataType[] => {
    return rows.map((raw, idx) => {
        const mapped: Report4DataType = {
            key: toText(raw.key) || `row-${idx + 1}`,
            unit_short: toText(raw.unit_short),
            unit_code: toText(raw.unit_code),
            unit_name: toText(raw.unit_name),
            line_of_work: toText(raw.line_of_work),
            level: toText(raw.level),
            business_unit: toText(raw.business_unit),
            remark: toText(raw.remark),
            log: toText(raw.log),
        };

        numericKeys.forEach((fieldName) => {
            mapped[fieldName] = toNumber(raw[fieldName]);
        });

        return mapped;
    }).filter((row) => row.unit_code || row.unit_name || row.unit_short);
};

const generateColumns = (
    prefix: string,
    themeColor: string,
    summaryColorClass: string,
    isTotalGroup = false,
    showChange = true
) => {
    const cols: ColumnsType<Report4DataType> = [];

    const getCellProps = (record: Report4DataType) => {
        if (record.key === 'TOTAL_SUMMARY') {
            return { className: `${summaryColorClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` };
        }
        return { className: 'bg-white' };
    };

    if (isTotalGroup) {
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

interface MultiSelectFilterProps {
    label: string;
    options: FilterOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    width?: string;
}

function MultiSelectFilter({ label, options, selectedValues, onChange, width = 'w-64' }: MultiSelectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

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
        if (selectedValues.includes(optionValue)) onChange(selectedValues.filter((v) => v !== optionValue));
        else onChange([...selectedValues, optionValue]);
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
                    {selectedValues.length === 0 ? <span className="text-gray-400">{label}...</span> :
                        selectedValues.length === options.length ? <span className="text-blue-600 font-medium">เลือกทั้งหมด ({options.length})</span> :
                            selectedValues.length === 1 ? <span className="text-gray-800">{options.find((opt) => opt.value === selectedValues[0])?.label || '-'}</span> :
                                <span className="text-gray-800">{selectedValues.length} รายการ</span>}
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
                        {filteredOptions.length > 0 && (
                            <div className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50" onClick={handleSelectAll}>
                                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedValues.length === options.length && options.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                    {selectedValues.length === options.length && options.length > 0 && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm font-semibold text-blue-700">เลือกทั้งหมด</span>
                            </div>
                        )}
                        {filteredOptions.map((option) => (
                            <div key={option.value} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleOption(option.value)}>
                                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors ${selectedValues.includes(option.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                    {selectedValues.includes(option.value) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700 truncate" title={option.label}>{option.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Report4Page() {
    const [form] = Form.useForm<SearchFormValues>();
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<string[]>(defaultCheckedList);
    const [appliedCheckedList, setAppliedCheckedList] = useState<string[]>(defaultCheckedList);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] = useState(600);
    const scrollRafRef = useRef<number | null>(null);
    const [horizontalScrollState, setHorizontalScrollState] = useState({
        hasOverflow: false,
        canScrollLeft: false,
        canScrollRight: false,
    });

    const [allData, setAllData] = useState<Report4DataType[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentSearchDate, setCurrentSearchDate] = useState<Dayjs>(dayjs());
    const [pageCurrent, setPageCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const [businessUnitOptions, setBusinessUnitOptions] = useState<FilterOption[]>([]);
    const [lineOfWorkOptions, setLineOfWorkOptions] = useState<FilterOption[]>([]);
    const [orgUnitOptions, setOrgUnitOptions] = useState<FilterOption[]>([]);

    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>([]);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetValues);
    const [appliedDatasets, setAppliedDatasets] = useState<string[]>(datasetValues);

    const fetchFilterOptions = useCallback(
        async (effectiveDate: Dayjs, bgNo = '', division = '', signal?: AbortSignal) => {
            const { employeeId, userGroupNo } = resolveUserContext();

            try {
                const query = new URLSearchParams({
                    effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                    employeeId,
                    userGroupNo,
                });
                if (bgNo) query.set('bgNo', bgNo);
                if (division) query.set('division', division);

                const res = await fetch(`/api/report/report4/filters?${query.toString()}`, { signal });
                let payload: Report4FilterResponse | null = null;
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
                console.error('Failed to fetch report4 filters:', error);
                setBusinessUnitOptions([]);
                setLineOfWorkOptions([]);
                setOrgUnitOptions([]);
                setSelectedBusinessUnits((prev) => (prev.length > 0 ? [] : prev));
                setSelectedLinesOfWork((prev) => (prev.length > 0 ? [] : prev));
                setSelectedOrgUnits((prev) => (prev.length > 0 ? [] : prev));
            }
        },
        []
    );

    const fetchReportData = useCallback(async (date: Dayjs, bgNo = '', division = '', orgUnitNo = '') => {
        const { employeeId, userGroupNo } = resolveUserContext();
        setLoading(true);

        try {
            const query = new URLSearchParams({
                effectiveDate: date.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo,
            });
            if (bgNo) query.set('bgNo', bgNo);
            if (division) query.set('division', division);
            if (orgUnitNo) query.set('orgUnitNo', orgUnitNo);

            const res = await fetch(`/api/report/report4?${query.toString()}`);
            const payload: Report4ApiResponse = await res.json();

            if (!res.ok || payload.status !== 200 || !Array.isArray(payload.data)) {
                throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            const rows = transformRows(payload.data);
            setAllData(rows);
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch report4 data:', error);
            setAllData([]);
            setHasSearched(true);
            alert('ไม่สามารถดึงข้อมูลรายงานได้');
        } finally {
            setLoading(false);
        }
    }, []);

    const onSearch = async (values: SearchFormValues) => {
        const searchDate = values.date || currentSearchDate;
        setCurrentSearchDate(searchDate);
        setAppliedDatasets([...selectedDatasets]);
        setAppliedCheckedList([...checkedList]);
        setPageCurrent(1);
        const bgNo = selectedBusinessUnits[0] || '';
        const division = selectedLinesOfWork[0] || '';
        const orgUnitNo = selectedOrgUnits[0] || '';
        await fetchReportData(searchDate, bgNo, division, orgUnitNo);
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

    const getHorizontalScrollElement = useCallback(() => {
        const root = tableContainerRef.current;
        if (!root) return null;

        const preferred = root.querySelector<HTMLElement>('.ant-table-body');
        if (preferred) return preferred;

        return root.querySelector<HTMLElement>('.ant-table-content');
    }, []);

    const updateHorizontalScrollState = useCallback(
        () => {
            const source = getHorizontalScrollElement();
            if (!source) {
                setHorizontalScrollState((prev) => {
                    if (!prev.hasOverflow && !prev.canScrollLeft && !prev.canScrollRight) return prev;
                    return { hasOverflow: false, canScrollLeft: false, canScrollRight: false };
                });
                return;
            }

            const left = source?.scrollLeft ?? 0;
            const max = source ? Math.max(0, source.scrollWidth - source.clientWidth) : 0;
            const nextState = {
                hasOverflow: max > 4,
                canScrollLeft: left > 2,
                canScrollRight: left < max - 2,
            };

            setHorizontalScrollState((prev) => {
                if (
                    prev.hasOverflow === nextState.hasOverflow &&
                    prev.canScrollLeft === nextState.canScrollLeft &&
                    prev.canScrollRight === nextState.canScrollRight
                ) {
                    return prev;
                }
                return nextState;
            });
        },
        [getHorizontalScrollElement]
    );

    const scheduleHorizontalStateUpdate = useCallback(() => {
        if (scrollRafRef.current !== null) return;
        scrollRafRef.current = window.requestAnimationFrame(() => {
            scrollRafRef.current = null;
            updateHorizontalScrollState();
        });
    }, [updateHorizontalScrollState]);

    const handleHorizontalScroll = useCallback(
        (direction: 'left' | 'right') => {
            const source = getHorizontalScrollElement();
            if (!source) return;

            const baseDistance = Math.max(360, Math.floor(source.clientWidth * 0.8));
            const distance = direction === 'left' ? -baseDistance : baseDistance;
            const sourceMax = Math.max(0, source.scrollWidth - source.clientWidth);
            const sourceCurrent = source?.scrollLeft ?? 0;
            const desired = Math.min(sourceMax, Math.max(0, sourceCurrent + distance));

            source.scrollLeft = desired;
            source.scrollTo({ left: desired, behavior: 'auto' });
            scheduleHorizontalStateUpdate();
        },
        [getHorizontalScrollElement, scheduleHorizontalStateUpdate]
    );

    const selectedBusinessUnit = selectedBusinessUnits[0] || '';
    const selectedLineOfWork = selectedLinesOfWork[0] || '';

    useEffect(() => {
        // Use only searched date; changing date input alone must not refresh options/data.
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            void fetchFilterOptions(currentSearchDate, selectedBusinessUnit, selectedLineOfWork, controller.signal);
        }, 220);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [currentSearchDate, selectedBusinessUnit, selectedLineOfWork, fetchFilterOptions]);

    const onBusinessChange = (values: string[]) => {
        setSelectedBusinessUnits(values.slice(-1));
    };

    const onLineChange = (values: string[]) => {
        setSelectedLinesOfWork(values.slice(-1));
    };

    const onUnitChange = (values: string[]) => {
        setSelectedOrgUnits(values.slice(-1));
    };

    const effectiveCheckedList = useMemo(() => {
        const showNormal = appliedDatasets.includes('ปกติ');
        const showSec = appliedDatasets.includes('Sec Pool');

        return appliedCheckedList.filter((column) => {
            if (column === 'frame_staff' || column === 'people_normal') return showNormal;
            if (column === 'frame_sec' || column === 'people_sec') return showSec;
            return true;
        });
    }, [appliedCheckedList, appliedDatasets]);

    const filteredData = useMemo(() => allData, [allData]);

    const tableDataWithSummary = useMemo(() => {
        if (!filteredData.length) return [];

        const totalRow: Report4DataType = {
            key: 'TOTAL_SUMMARY',
            unit_short: '',
            unit_code: '',
            unit_name: 'รวมทั้งสิ้น (Grand Total)',
            line_of_work: '',
            level: '',
            business_unit: '',
            remark: '',
            log: ''
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

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(tableDataWithSummary.length / pageSize));
        if (pageCurrent > totalPages) {
            setPageCurrent(1);
        }
    }, [tableDataWithSummary.length, pageCurrent, pageSize]);

    useEffect(() => {
        if (!hasSearched) {
            setHorizontalScrollState({ hasOverflow: false, canScrollLeft: false, canScrollRight: false });
            return;
        }

        const raf = window.requestAnimationFrame(() => {
            updateHorizontalScrollState();
        });

        return () => window.cancelAnimationFrame(raf);
    }, [
        hasSearched,
        isFullscreen,
        effectiveCheckedList,
        tableDataWithSummary.length,
        updateHorizontalScrollState,
    ]);

    useEffect(() => {
        if (!hasSearched) return;

        const updateTableHeight = () => {
            if (!tableContainerRef.current) return;
            const rect = tableContainerRef.current.getBoundingClientRect();
            // Reserve space for app/menu header + search area + table header/pagination.
            const availableHeight = Math.floor(window.innerHeight - rect.top - 160);
            setTableScrollY(Math.max(260, availableHeight));
        };

        const raf = window.requestAnimationFrame(updateTableHeight);
        window.addEventListener('resize', updateTableHeight);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateTableHeight);
        };
    }, [hasSearched, isFullscreen, effectiveCheckedList, tableDataWithSummary.length]);

    useEffect(() => {
        if (!hasSearched) return;

        const target = getHorizontalScrollElement();
        if (!target) return;

        const handleNativeScroll = () => {
            scheduleHorizontalStateUpdate();
        };

        target.addEventListener('scroll', handleNativeScroll, { passive: true });
        window.addEventListener('resize', handleNativeScroll);
        handleNativeScroll();

        return () => {
            target.removeEventListener('scroll', handleNativeScroll);
            window.removeEventListener('resize', handleNativeScroll);
        };
    }, [
        effectiveCheckedList,
        getHorizontalScrollElement,
        hasSearched,
        isFullscreen,
        scheduleHorizontalStateUpdate,
        tableDataWithSummary.length,
    ]);

    useEffect(() => {
        return () => {
            if (scrollRafRef.current !== null) {
                window.cancelAnimationFrame(scrollRafRef.current);
            }
        };
    }, []);

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
            graySummary: 'FFF3F4F6',
            blueSummary: 'FFDBEAFE',
            orangeSummary: 'FFFFEDD5',
            greenSummary: 'FFDCFCE7',
            redSummary: 'FFFEE2E2',
            purpleSummary: 'FFEDE9FE',
        };

        const isShow = (k: string) => effectiveCheckedList.includes(k);

        const headersRow1: string[] = [];
        const headersRow2: string[] = [];
        const dataKeys: string[] = [];

        const addGroup = (title: string, prefix: string, isTotalGroup = false, showChange = true) => {
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
            subCols.forEach((c) => {
                headersRow2.push(c.title);
                dataKeys.push(c.key);
            });
        };

        const basicCols = [
            { t: 'ชื่อย่อ', k: 'unit_short' }, { t: 'รหัส', k: 'unit_code' }, { t: 'ชื่อเต็ม', k: 'unit_name' },
            { t: 'สายงาน', k: 'line_of_work' }, { t: 'ระดับ', k: 'level' }, { t: 'หน่วยธุรกิจ', k: 'business_unit' }
        ];

        let basicInfoCount = 0;
        basicCols.forEach((c) => {
            if (isShow(c.k)) {
                headersRow1.push(c.t);
                headersRow2.push('');
                dataKeys.push(c.k);
                basicInfoCount++;
            }
        });

        if (isShow('frame_staff')) addGroup('กรอบพนักงาน', 'frame_staff');
        if (isShow('people_normal')) addGroup('คนปกติ & Pool RS', 'people_normal');
        if (isShow('frame_sec')) addGroup('กรอบ Secondment', 'frame_sec');
        if (isShow('people_sec')) addGroup('คน Secondment', 'people_sec');
        if (isShow('total_frame')) addGroup('รวมกรอบ', 'total_frame', true);
        if (isShow('total_people')) addGroup('รวมคน', 'total_people', true);

        if (isShow('recruit')) {
            headersRow1.push('สรรหา');
            headersRow2.push('');
            dataKeys.push('recruit_total');
        }

        if (isShow('vacancy')) addGroup('ว่าง', 'vacancy', false, false);

        if (isShow('contact_out')) {
            headersRow1.push('Contact Out');
            headersRow2.push('');
            dataKeys.push('contact_out');
        }

        if (isShow('contact_out_sub')) {
            headersRow1.push('Contact Out สัญญาย่อย');
            headersRow2.push('');
            dataKeys.push('contact_out_sub');
        }

        if (isShow('remark')) {
            headersRow1.push('หมายเหตุ');
            headersRow2.push('');
            dataKeys.push('remark');
        }

        if (isShow('log')) {
            headersRow1.push('Log');
            headersRow2.push('');
            dataKeys.push('log');
        }

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
                const title = headersRow2[colIndex + i - 1];
                const cellColor = title === 'รวม' ? colors.yellowTotal : subColor;
                subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellColor } };
                subCell.alignment = { horizontal: 'center' };
            }

            colIndex += count;
        };

        if (isShow('frame_staff')) styleGroup(16, colors.blueHeader, colors.blueSub);
        if (isShow('people_normal')) styleGroup(16, colors.orangeHeader, colors.orangeSub);
        if (isShow('frame_sec')) styleGroup(16, colors.blueHeader, colors.blueSub);
        if (isShow('people_sec')) styleGroup(16, colors.orangeHeader, colors.orangeSub);
        if (isShow('total_frame')) styleGroup(10, colors.blueHeader, colors.blueSub);
        if (isShow('total_people')) styleGroup(10, colors.orangeHeader, colors.orangeSub);

        if (isShow('recruit')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.greenHeader } };
            worksheet.getCell(1, colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
            colIndex += 1;
        }

        if (isShow('vacancy')) styleGroup(8, colors.redHeader, colors.redSub);

        if (isShow('contact_out')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.purpleHeader } };
            worksheet.getCell(1, colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
            colIndex += 1;
        }

        if (isShow('contact_out_sub')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.purpleHeader } };
            worksheet.getCell(1, colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
            colIndex += 1;
        }

        if (isShow('remark')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            colIndex++;
        }

        if (isShow('log')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            colIndex++;
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
                    cell.border = {
                        top: { style: 'double' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    if (key && key.includes('change')) {
                        const val = item[key];
                        if (typeof val === 'number') {
                            if (val > 0) cell.font = { color: { argb: 'FF2563EB' }, bold: true, name: 'Sarabun', size: 10 };
                            else if (val < 0) cell.font = { color: { argb: 'FFDC2626' }, bold: true, name: 'Sarabun', size: 10 };
                        }
                    }
                });
            } else {
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.font = { name: 'Sarabun', size: 10 };

                    const key = dataKeys[colNumber - 1];
                    if (key && key.includes('recruit')) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.greenSub } };
                    }
                    if (key && key.includes('change')) {
                        const val = item[key];
                        if (typeof val === 'number') {
                            if (val > 0) cell.font = { color: { argb: 'FF2563EB' }, name: 'Sarabun', size: 10, bold: true };
                            else if (val < 0) cell.font = { color: { argb: 'FFDC2626' }, name: 'Sarabun', size: 10, bold: true };
                        }
                    }
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        await saveExcelFile(blob, `รายงานสรุปกรอบอัตรากำลังประจำเดือนของหน่วยงาน (ตามประเภทกรอบอัตรา)_${currentSearchDate.format('YYYYMMDD')}.xlsx`);
    };

    const columns: ColumnsType<Report4DataType> = useMemo(() => {
        const isShow = (k: string) => effectiveCheckedList.includes(k);
        const getBasicCellProps = (record: Report4DataType) => record.key === 'TOTAL_SUMMARY'
            ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
            : { className: 'bg-white' };
        const getRecruitCellProps = (record: Report4DataType) => record.key === 'TOTAL_SUMMARY'
            ? { className: 'bg-green-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
            : { className: 'bg-green-50!' };

        const getColoredCellProps = (record: Report4DataType, colorClass: string) => record.key === 'TOTAL_SUMMARY'
            ? { className: `${colorClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` }
            : { className: 'bg-white' };

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
                onCell: getRecruitCellProps
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
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                render: (t: string) => <span className="text-xs">{t}</span>,
                onCell: getBasicCellProps
            }] : []),

            ...(isShow('log') ? [{
                title: 'Log', dataIndex: 'log', key: 'log', width: 100, ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCellProps
            }] : []),
        ];
    }, [effectiveCheckedList]);

    return (
        <Main currentPath="/report">
            <div
                ref={fullscreenRef}
                className={`w-full min-w-0 ${isFullscreen ? 'h-screen overflow-hidden bg-white p-4 flex flex-col gap-4' : 'space-y-6'}`}
            >
                {!isFullscreen && (
                    <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md border border-blue-500 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="text-2xl text-blue-100" />
                                <h1 className="text-2xl font-bold m-0 text-white">Report 04</h1>
                                <span className="hidden md:inline-block text-blue-100">|</span>
                                <span className="text-xl font-medium text-blue-50">รายงานสรุปกรอบอัตรากำลังประจำเดือนของหน่วยงาน (ตามประเภทกรอบอัตรา)</span>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 ${
                        isFullscreen ? 'shrink-0' : 'sticky top-0 z-[200]'
                    }`}
                >
                    <Form form={form} layout="inline" onFinish={onSearch} initialValues={{ date: currentSearchDate }} className="flex items-center gap-2">
                        <Form.Item name="date" label="วันที่" className="m-0">
                            <DatePicker
                                format="DD/MM/YYYY"
                                className="w-34"
                                getPopupContainer={() => fullscreenRef.current || document.body}
                            />
                        </Form.Item>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยธุรกิจ</label>
                            <MultiSelectFilter label="เลือกหน่วยธุรกิจ" options={businessUnitOptions} selectedValues={selectedBusinessUnits} onChange={onBusinessChange} width="w-40" />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">สายงาน</label>
                            <MultiSelectFilter label="เลือกสายงาน" options={lineOfWorkOptions} selectedValues={selectedLinesOfWork} onChange={onLineChange} width="w-40" />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยงาน</label>
                            <MultiSelectFilter label="เลือกหน่วยงาน" options={orgUnitOptions} selectedValues={selectedOrgUnits} onChange={onUnitChange} width="w-48" />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">แสดงข้อมูล</label>
                            <MultiSelectFilter label="เลือกแสดงข้อมูล" options={datasetOptions} selectedValues={selectedDatasets} onChange={setSelectedDatasets} width="w-40" />
                        </div>

                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>ค้นหา</Button>
                    </Form>

                    {hasSearched && <div className="flex items-center gap-2 relative z-[210]">
                        <Button
                            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={toggleFullscreen}
                            className={`border-none! shadow-sm! text-white! ${isFullscreen ? 'bg-red-500! hover:bg-red-600!' : 'bg-blue-500! hover:bg-blue-600!'}`}
                        >
                            {isFullscreen ? 'ปิดเต็มจอ' : 'เต็มจอ'}
                        </Button>

                        <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} loading={loading || !hasSearched} className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!">Excel</Button>

                        <Popover
                            placement="bottomLeft"
                            trigger="click"
                            zIndex={220}
                            getPopupContainer={() => fullscreenRef.current || document.body}
                            content={
                                <div className="w-64 max-h-96 overflow-y-auto">
                                    <div className="mb-2 font-bold text-gray-700 border-b pb-1">เลือกแสดงกลุ่มข้อมูล</div>
                                    <Checkbox.Group options={columnOptions} value={checkedList} onChange={(list) => setCheckedList(list.map((v) => String(v)))} className="flex flex-col gap-2" />
                                </div>
                            }
                        >
                            <Button icon={<SettingOutlined />}>({checkedList.length})</Button>
                        </Popover>
                    </div>}
                </div>

                {hasSearched && (
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 z-0 ${isFullscreen ? 'mt-0 flex-1 min-h-0' : 'mt-4'}`}>
                        <div className={`relative group/table ${isFullscreen ? 'h-full' : ''}`}>
                            {horizontalScrollState.hasOverflow && (
                                <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-[220] invisible opacity-0 transition-opacity duration-150 group-hover/table:visible group-hover/table:opacity-100">
                                    <button
                                        onClick={() => {
                                            if (!horizontalScrollState.canScrollLeft) return;
                                            handleHorizontalScroll('left');
                                        }}
                                        disabled={!horizontalScrollState.canScrollLeft}
                                        className={`pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-xl border transition-colors flex items-center justify-center ${
                                            horizontalScrollState.canScrollLeft
                                                ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-80'
                                        }`}
                                        aria-label="Scroll Left"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!horizontalScrollState.canScrollRight) return;
                                            handleHorizontalScroll('right');
                                        }}
                                        disabled={!horizontalScrollState.canScrollRight}
                                        className={`pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-xl border transition-colors flex items-center justify-center ${
                                            horizontalScrollState.canScrollRight
                                                ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-80'
                                        }`}
                                        aria-label="Scroll Right"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            <div
                                ref={tableContainerRef}
                                className={`${isFullscreen ? 'h-full min-h-0 overflow-hidden' : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-2rem)] overflow-hidden'}`}
                            >
                                <Table
                                    columns={columns}
                                    dataSource={tableDataWithSummary}
                                loading={loading}
                                bordered
                                size="small"
                                scroll={{ x: 'max-content', y: tableScrollY }}
                                pagination={{
                                    current: pageCurrent,
                                    pageSize,
                                    total: tableDataWithSummary.length,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['20', '50', '100', '200'],
                                    showTotal: (total, range) => `${range[0]}-${range[1]} จาก ${total} รายการ`,
                                    onChange: (nextPage, nextSize) => {
                                        setPageCurrent(nextPage);
                                        if (nextSize && nextSize !== pageSize) {
                                            setPageSize(nextSize);
                                        }
                                    },
                                    onShowSizeChange: (_current, size) => {
                                        setPageSize(size);
                                        setPageCurrent(1);
                                    },
                                }}
                                sticky
                                className="report4-table [&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                                rowClassName={(record) => record.key === 'TOTAL_SUMMARY' ? 'font-bold' : 'bg-white'}
                            />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                .report4-table .ant-table-header.ant-table-sticky-holder {
                    z-index: 1 !important;
                }
            `}</style>
        </Main>
    );
}
