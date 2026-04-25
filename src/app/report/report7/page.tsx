'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Popover, Checkbox } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined,
    FileExcelOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { ChevronDown, Search, Check, FileText } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';

dayjs.locale('th');

interface Report7ApiRow {
    key?: string;
    org_unit_no?: string;
    OrgUnitNo?: string;
    parent_org_unit_no?: string;
    ParentOrgUnitNo?: string;
    lvl?: number;
    Lvl?: number;
    bg_no?: string;
    BGNo?: string;
    BGName?: string;
    business_unit?: string;
    unit_level_name?: string;
    UnitLevelName?: string;
    unit_short?: string;
    UnitShort?: string;
    UnitAbbr?: string;
    unit_name?: string;
    UnitName?: string;
    UnitText?: string;

    q_1?: number; q_2?: number; q_3?: number; q_4?: number; q_5?: number; q_6?: number; q_7?: number; q_total?: number;
    q_8?: number; q_10?: number;
    m_1?: number; m_2?: number; m_3?: number; m_4?: number; m_5?: number; m_6?: number; m_7?: number; m_total?: number;
    f_1?: number; f_2?: number; f_3?: number; f_4?: number; f_5?: number; f_6?: number; f_7?: number; f_total?: number;
    t_1?: number; t_2?: number; t_3?: number; t_4?: number; t_5?: number; t_6?: number; t_7?: number; total?: number;

    frame_contract_out?: number;
    frame_sub_contract?: number;
    recruit_total?: number;
    vacancy_total?: number;

    mp_vp?: number; mp_dm?: number; mp_sr?: number; mp_jr?: number; mp_total?: number;
    shape_vp?: number; shape_dm?: number; shape_sr?: number; shape_jr?: number; shape_total?: number;
    gap_vp?: number; gap_dm?: number; gap_sr?: number; gap_jr?: number; gap_total?: number;

    remark?: string;
    [key: string]: unknown;
}

interface Report7ApiResponse {
    status: number;
    data?: Report7ApiRow[];
    message?: string;
}

interface Report7FilterItem {
    BGNo?: string;
    BGName?: string;
    OrgUnitNo?: string;
    UnitText?: string;
    UnitName?: string;
    UnitAbbr?: string;
}

interface Report7FilterResponse {
    status: number;
    data?: {
        businessUnits: Report7FilterItem[];
        lines: Report7FilterItem[];
        units: Report7FilterItem[];
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

interface Report7DataType {
    key: string;
    org_unit_no: string;
    parent_org_unit_no: string;
    lvl: number;
    bg_no: string;
    business_unit: string;
    unit_level_name: string;
    unit_short: string;
    unit_name: string;

    q_1: number; q_2: number; q_3: number; q_4: number; q_5: number; q_6: number; q_7: number; q_total: number;
    q_8: number; q_10: number;
    m_1: number; m_2: number; m_3: number; m_4: number; m_5: number; m_6: number; m_7: number; m_total: number;
    f_1: number; f_2: number; f_3: number; f_4: number; f_5: number; f_6: number; f_7: number; f_total: number;
    t_1: number; t_2: number; t_3: number; t_4: number; t_5: number; t_6: number; t_7: number; total: number;

    frame_contract_out: number;
    frame_sub_contract: number;
    recruit_total: number;
    vacancy_total: number;

    mp_vp: number; mp_dm: number; mp_sr: number; mp_jr: number; mp_total: number;
    shape_vp: number; shape_dm: number; shape_sr: number; shape_jr: number; shape_total: number;
    gap_vp: number; gap_dm: number; gap_sr: number; gap_jr: number; gap_total: number;

    remark: string;
    [key: string]: string | number | undefined;
}

const levelConfigs = [
    { label: '21', q: 'q_1', m: 'm_1', t: 't_1' },
    { label: '18-20', q: 'q_2', m: 'm_2', t: 't_2' },
    { label: '16-17', q: 'q_3', m: 'm_3', t: 't_3' },
    { label: '14-15', q: 'q_4', m: 'm_4', t: 't_4' },
    { label: '11-13', q: 'q_5', m: 'm_5', t: 't_5' },
    { label: '9-10', q: 'q_6', m: 'm_6', t: 't_6' },
    { label: '8 ลงมา', q: 'q_7', m: 'm_7', t: 't_7' },
    { label: 'รวม', q: 'q_total', m: 'm_total', t: 'total' }
] as const;

const metricConfigs = [
    { label: 'VP', key: 'vp' },
    { label: 'DM', key: 'dm' },
    { label: 'SR', key: 'sr' },
    { label: 'JR', key: 'jr' },
    { label: 'Total', key: 'total' }
] as const;
const mpShapeMetricConfigs = metricConfigs;
const gapMetricConfigs = metricConfigs;

const baseColumnWidths = {
    unitShort: 112,
    unitCode: 112,
    unitName: 360,
    unitLevel: 108,
    businessUnit: 92,
    remark: 220
} as const;

const displayGroupOptions = [
    { value: 'unit_short', label: 'ชื่อย่อ' },
    { value: 'unit_code', label: 'รหัสหน่วยงาน' },
    { value: 'unit_name', label: 'ชื่อหน่วยงาน' },
    { value: 'unit_level_name', label: 'ระดับ' },
    { value: 'business_unit', label: 'หน่วยธุรกิจ' },
    { value: 'frame', label: 'กรอบอัตรากำลัง' },
    { value: 'people', label: 'จำนวนคน' },
    { value: 'recruit', label: 'สรรหา' },
    { value: 'vacancy', label: 'ว่าง' },
    { value: 'mp', label: 'Manpower Landscape' },
    { value: 'shape', label: 'Shape Ratio' },
    { value: 'gap', label: '% Gap' },
    { value: 'remark', label: 'หมายเหตุ' }
] as const;

const defaultDisplayGroups = displayGroupOptions.map((item) => item.value);

const numericKeys = [
    ...levelConfigs.flatMap((cfg) => [cfg.q, cfg.m, cfg.t]),
    'q_8', 'q_10',
    ...['f_1', 'f_2', 'f_3', 'f_4', 'f_5', 'f_6', 'f_7', 'f_total'],
    'frame_contract_out', 'frame_sub_contract', 'recruit_total', 'vacancy_total',
    ...metricConfigs.flatMap((metric) => [`mp_${metric.key}`, `shape_${metric.key}`, `gap_${metric.key}`])
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

const cleanUnitShort = (value: unknown): string => toText(value).replace(/\s*ขึ้นตรง\s*$/, '').trim();

const normalizeFieldKey = (key: string): string => key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const pickFieldValue = (row: Report7ApiRow, aliases: string[]): unknown => {
    const normalized = new Map<string, unknown>();
    Object.entries(row).forEach(([key, value]) => {
        normalized.set(normalizeFieldKey(key), value);
    });

    for (const alias of aliases) {
        const value = normalized.get(normalizeFieldKey(alias));
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
};

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const renderNumber = (value: unknown): React.ReactNode => {
    if (value === undefined || value === null || value === '') return 0;
    const num = Number(value);
    if (!Number.isFinite(num)) return typeof value === 'string' ? value : String(value);
    return Number.isInteger(num) ? num : round2(num);
};

const renderPercent = (value: unknown): React.ReactNode => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return `${round2(num * 100)}%`;
};

const readJsonSafely = async <T,>(res: Response): Promise<T | null> => {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    try {
        return await res.json() as T;
    } catch {
        return null;
    }
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
                // ignore parse error
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

const toBgOption = (row: Report7FilterItem): FilterOption | null => {
    const value = toText(row.BGNo);
    const label = toText(row.BGName);
    if (!value || !label) return null;
    return { value, label };
};

const toLineOption = (row: Report7FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label: `${value} - ${label}` };
};

const toUnitOption = (row: Report7FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label: `${value} - ${label}` };
};

const transformRows = (rows: Report7ApiRow[]): Report7DataType[] => {
    const normalized = rows.map((raw, idx) => ({
        key: toText(raw.key) || `r7-${idx + 1}`,
        org_unit_no: toText(
            pickFieldValue(raw, ['org_unit_no', 'OrgUnitNo', 'orgunitno', 'OrgUnitID', 'org_unit_id'])
        ),
        parent_org_unit_no: toText(
            pickFieldValue(raw, ['parent_org_unit_no', 'ParentOrgUnitNo', 'parentorgunitno'])
        ),
        lvl: toNumber(
            pickFieldValue(raw, ['lvl', 'Lvl', 'level', 'Level', 'unit_level', 'UnitLevel'])
        ),
        bg_no: toText(
            pickFieldValue(raw, ['bg_no', 'BGNo', 'bgno', 'BU', 'business_unit_no'])
        ),
        business_unit: toText(
            pickFieldValue(raw, [
                'business_unit',
                'BusinessUnit',
                'BusinessUnitName',
                'BGName',
                'GroupBGName',
                'group_bg_name',
                'bg_no',
                'BGNo',
                'BU'
            ])
        ),
        unit_level_name: toText(
            pickFieldValue(raw, [
                'unit_level_name',
                'UnitLevelName',
                'level_name',
                'LevelName',
                'UnitLevel',
                'unit_level',
                'level'
            ])
        ),
        unit_short: cleanUnitShort(
            pickFieldValue(raw, ['unit_short', 'UnitShort', 'UnitAbbr', 'unit_abbr', 'OrgUnitAbbr'])
        ),
        unit_name: toText(
            pickFieldValue(raw, ['unit_name', 'UnitName', 'UnitText', 'OrgUnitName', 'unit_text'])
        ),

        q_1: toNumber(raw.q_1), q_2: toNumber(raw.q_2), q_3: toNumber(raw.q_3), q_4: toNumber(raw.q_4),
        q_5: toNumber(raw.q_5), q_6: toNumber(raw.q_6), q_7: toNumber(raw.q_7), q_total: toNumber(raw.q_total),
        q_8: toNumber(raw.q_8), q_10: toNumber(raw.q_10),

        m_1: toNumber(raw.m_1), m_2: toNumber(raw.m_2), m_3: toNumber(raw.m_3), m_4: toNumber(raw.m_4),
        m_5: toNumber(raw.m_5), m_6: toNumber(raw.m_6), m_7: toNumber(raw.m_7), m_total: toNumber(raw.m_total),

        f_1: toNumber(raw.f_1), f_2: toNumber(raw.f_2), f_3: toNumber(raw.f_3), f_4: toNumber(raw.f_4),
        f_5: toNumber(raw.f_5), f_6: toNumber(raw.f_6), f_7: toNumber(raw.f_7), f_total: toNumber(raw.f_total),

        t_1: toNumber(raw.t_1), t_2: toNumber(raw.t_2), t_3: toNumber(raw.t_3), t_4: toNumber(raw.t_4),
        t_5: toNumber(raw.t_5), t_6: toNumber(raw.t_6), t_7: toNumber(raw.t_7), total: toNumber(raw.total),

        frame_contract_out: toNumber(raw.frame_contract_out ?? raw.q_8),
        frame_sub_contract: toNumber(raw.frame_sub_contract ?? raw.q_10),
        recruit_total: toNumber(raw.recruit_total ?? raw.f_total),
        vacancy_total: toNumber(raw.vacancy_total ?? raw.total),

        mp_vp: toNumber(raw.mp_vp), mp_dm: toNumber(raw.mp_dm), mp_sr: toNumber(raw.mp_sr), mp_jr: toNumber(raw.mp_jr), mp_total: toNumber(raw.mp_total),
        shape_vp: toNumber(raw.shape_vp), shape_dm: toNumber(raw.shape_dm), shape_sr: toNumber(raw.shape_sr), shape_jr: toNumber(raw.shape_jr), shape_total: toNumber(raw.shape_total),
        gap_vp: toNumber(raw.gap_vp), gap_dm: toNumber(raw.gap_dm), gap_sr: toNumber(raw.gap_sr), gap_jr: toNumber(raw.gap_jr), gap_total: toNumber(raw.gap_total),

        remark: toText(pickFieldValue(raw, ['remark', 'Remark', 'note', 'Note']))
    })).filter((row) => row.org_unit_no || row.unit_name || row.unit_short);

    const firstDataRow = normalized.find((row) => row.org_unit_no || row.unit_name || row.unit_short);
    if (firstDataRow && !firstDataRow.unit_level_name && !firstDataRow.business_unit) {
        console.warn(
            '[report7] API payload is missing level/business fields. Expected aliases include UnitLevelName/BGName/unit_level_name/business_unit.'
        );
    }

    return normalized;
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
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-60 overflow-hidden">
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

export default function Report7Page() {
    const [form] = Form.useForm<SearchFormValues>();
    const [loading, setLoading] = useState(false);
    const [columnToggleLoading, setColumnToggleLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] = useState(620);
    const columnToggleTimerRef = useRef<number | null>(null);

    const [allData, setAllData] = useState<Report7DataType[]>([]);
    const [filterDate, setFilterDate] = useState<Dayjs>(dayjs());
    const [currentSearchDate, setCurrentSearchDate] = useState<Dayjs>(dayjs());

    const [businessUnitOptions, setBusinessUnitOptions] = useState<FilterOption[]>([]);
    const [lineOfWorkOptions, setLineOfWorkOptions] = useState<FilterOption[]>([]);
    const [orgUnitOptions, setOrgUnitOptions] = useState<FilterOption[]>([]);

    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>([]);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);

    const [selectedDisplayGroups, setSelectedDisplayGroups] = useState<string[]>(defaultDisplayGroups);

    useEffect(() => {
        return () => {
            if (columnToggleTimerRef.current !== null) {
                window.clearTimeout(columnToggleTimerRef.current);
            }
        };
    }, []);

    const fetchFilterOptions = useCallback(async (effectiveDate: Dayjs, bgNo = '', division = '', signal?: AbortSignal) => {
        const { employeeId, userGroupNo } = resolveUserContext();

        try {
            const query = new URLSearchParams({
                effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo
            });
            if (bgNo) query.set('bgNo', bgNo);
            if (division) query.set('division', division);

            const res = await fetch(`/api/report/report7/filters?${query.toString()}`, { signal });
            const payload = await readJsonSafely<Report7FilterResponse>(res);

            if (!res.ok || !payload || payload.status !== 200 || !payload.data) {
                setBusinessUnitOptions([]);
                setLineOfWorkOptions([]);
                setOrgUnitOptions([]);
                setSelectedBusinessUnits((prev) => (prev.length > 0 ? [] : prev));
                setSelectedLinesOfWork((prev) => (prev.length > 0 ? [] : prev));
                setSelectedOrgUnits((prev) => (prev.length > 0 ? [] : prev));
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
            const nextOrgUnits = uniqueOptions(
                payload.data.units
                    .map(toUnitOption)
                    .filter((item): item is FilterOption => item !== null)
            );

            setBusinessUnitOptions(nextBusiness);
            setLineOfWorkOptions(nextLines);
            setOrgUnitOptions(nextOrgUnits);

            setSelectedBusinessUnits((prev) => syncSelected(prev, nextBusiness));
            setSelectedLinesOfWork((prev) => syncSelected(prev, nextLines));
            setSelectedOrgUnits((prev) => syncSelected(prev, nextOrgUnits));
        } catch (error) {
            if (signal?.aborted) return;
            console.error('Failed to fetch report7 filters:', error);
            setBusinessUnitOptions([]);
            setLineOfWorkOptions([]);
            setOrgUnitOptions([]);
            setSelectedBusinessUnits((prev) => (prev.length > 0 ? [] : prev));
            setSelectedLinesOfWork((prev) => (prev.length > 0 ? [] : prev));
            setSelectedOrgUnits((prev) => (prev.length > 0 ? [] : prev));
        }
    }, []);

    const fetchReportData = useCallback(async (date: Dayjs, bgNo = '', division = '', orgUnitNo = '') => {
        const { employeeId, userGroupNo } = resolveUserContext();
        setLoading(true);

        try {
            const query = new URLSearchParams({
                effectiveDate: date.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo
            });
            if (bgNo) query.set('bgNo', bgNo);
            if (division) query.set('division', division);
            if (orgUnitNo) query.set('orgUnitNo', orgUnitNo);

            const res = await fetch(`/api/report/report7?${query.toString()}`);
            const payload = await readJsonSafely<Report7ApiResponse>(res);

            if (!res.ok || !payload || payload.status !== 200 || !Array.isArray(payload.data)) {
                const fallbackText = await res.text().catch(() => '');
                throw new Error(payload?.message || fallbackText || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            const normalized = transformRows(payload.data);
            setAllData(normalized);
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch report7 data:', error);
            setAllData([]);
            setHasSearched(true);
            alert('ไม่สามารถดึงข้อมูลรายงานได้');
        } finally {
            setLoading(false);
        }
    }, []);

    const onSearch = async (values: SearchFormValues) => {
        const date = values.date || filterDate;
        setCurrentSearchDate(date);

        const bgNo = selectedBusinessUnits.join(',');
        const division = selectedLinesOfWork.join(',');
        const orgUnitNo = selectedOrgUnits.join(',');

        await fetchReportData(date, bgNo, division, orgUnitNo);
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
            const availableHeight = Math.floor(window.innerHeight - rect.top - 120);
            setTableScrollY(Math.max(260, availableHeight));
        };

        const raf = window.requestAnimationFrame(updateTableHeight);
        window.addEventListener('resize', updateTableHeight);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateTableHeight);
        };
    }, [hasSearched, isFullscreen, selectedDisplayGroups, allData.length]);

    const selectedBusinessUnit = selectedBusinessUnits.length === 1 ? selectedBusinessUnits[0] : '';
    const selectedLineOfWork = selectedLinesOfWork.length === 1 ? selectedLinesOfWork[0] : '';

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            void fetchFilterOptions(filterDate, selectedBusinessUnit, selectedLineOfWork, controller.signal);
        }, 180);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [filterDate, selectedBusinessUnit, selectedLineOfWork, fetchFilterOptions]);

    const onBusinessChange = (values: string[]) => {
        setSelectedBusinessUnits(values);
    };

    const onLineChange = (values: string[]) => {
        setSelectedLinesOfWork(values);
    };

    const onUnitChange = (values: string[]) => {
        setSelectedOrgUnits(values);
    };

    const onDisplayGroupsChange = (list: Array<string | number>) => {
        if (columnToggleTimerRef.current !== null) {
            window.clearTimeout(columnToggleTimerRef.current);
        }
        setColumnToggleLoading(true);
        setSelectedDisplayGroups(list.map((v) => String(v)));
        columnToggleTimerRef.current = window.setTimeout(() => {
            setColumnToggleLoading(false);
            columnToggleTimerRef.current = null;
        }, 800);
    };

    const tableDataWithSummary = useMemo(() => {
        if (!allData.length) return [];

        const summary: Report7DataType = {
            key: 'TOTAL_SUMMARY',
            org_unit_no: '',
            parent_org_unit_no: '',
            lvl: 0,
            bg_no: '',
            business_unit: '',
            unit_level_name: '',
            unit_short: '',
            unit_name: 'รวมทั้งสิ้น (Grand Total)',

            q_1: 0, q_2: 0, q_3: 0, q_4: 0, q_5: 0, q_6: 0, q_7: 0, q_total: 0,
            q_8: 0, q_10: 0,
            m_1: 0, m_2: 0, m_3: 0, m_4: 0, m_5: 0, m_6: 0, m_7: 0, m_total: 0,
            f_1: 0, f_2: 0, f_3: 0, f_4: 0, f_5: 0, f_6: 0, f_7: 0, f_total: 0,
            t_1: 0, t_2: 0, t_3: 0, t_4: 0, t_5: 0, t_6: 0, t_7: 0, total: 0,

            frame_contract_out: 0,
            frame_sub_contract: 0,
            recruit_total: 0,
            vacancy_total: 0,

            mp_vp: 0, mp_dm: 0, mp_sr: 0, mp_jr: 0, mp_total: 0,
            shape_vp: 0, shape_dm: 0, shape_sr: 0, shape_jr: 0, shape_total: 0,
            gap_vp: 0, gap_dm: 0, gap_sr: 0, gap_jr: 0, gap_total: 0,

            remark: ''
        };

        allData.forEach((row) => {
            numericKeys.forEach((key) => {
                summary[key] = toNumber(summary[key]) + toNumber(row[key]);
            });
        });
        return [...allData, summary];
    }, [allData]);

    const metricVisibility = useMemo(() => {
        const selected = new Set(selectedDisplayGroups);
        return {
            unit_short: selected.has('unit_short'),
            unit_code: selected.has('unit_code'),
            unit_name: selected.has('unit_name'),
            unit_level_name: selected.has('unit_level_name'),
            business_unit: selected.has('business_unit'),
            frame: selected.has('frame'),
            people: selected.has('people'),
            recruit: selected.has('recruit'),
            vacancy: selected.has('vacancy'),
            mp: selected.has('mp'),
            shape: selected.has('shape'),
            gap: selected.has('gap'),
            remark: selected.has('remark')
        };
    }, [selectedDisplayGroups]);

    const columns: ColumnsType<Report7DataType> = useMemo(() => {
        const getBasicCell = (record: Report7DataType) => record.key === 'TOTAL_SUMMARY'
            ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
            : { className: 'bg-white' };

        const makeLevelColumns = (
            metric: 'q' | 'm' | 't',
            headerClass: string,
            summaryClass: string,
            render: (value: unknown) => React.ReactNode = renderNumber
        ) => {
            return levelConfigs.map((cfg) => {
                const key = metric === 'q' ? cfg.q : metric === 'm' ? cfg.m : cfg.t;
                return {
                    title: cfg.label,
                    dataIndex: key,
                    key,
                    width: cfg.label === 'รวม' ? 68 : 62,
                    align: 'center' as const,
                    onHeaderCell: () => ({ className: `${headerClass} text-gray-700 font-bold` }),
                    render,
                    onCell: (record: Report7DataType) => record.key === 'TOTAL_SUMMARY'
                        ? { className: `${summaryClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` }
                        : { className: 'bg-white' }
                };
            });
        };

        const makeMetricColumns = (
            prefix: 'mp' | 'shape' | 'gap',
            configs: ReadonlyArray<{ label: string; key: string }>,
            headerClass: string,
            summaryClass: string,
            render: (value: unknown) => React.ReactNode = renderNumber
        ) => {
            return configs.map((cfg) => ({
                title: cfg.label,
                dataIndex: `${prefix}_${cfg.key}`,
                key: `${prefix}_${cfg.key}`,
                width: 72,
                align: 'center' as const,
                onHeaderCell: () => ({ className: `${headerClass} text-gray-700 font-bold` }),
                render: (value: unknown, record: Report7DataType) => {
                    if (record.key === 'TOTAL_SUMMARY') return '';
                    return render(value);
                },
                onCell: (record: Report7DataType) => record.key === 'TOTAL_SUMMARY'
                    ? { className: `${summaryClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` }
                    : { className: 'bg-white' }
            }));
        };

        const base: ColumnsType<Report7DataType> = [
            ...(metricVisibility.unit_short ? [{
                title: 'ชื่อย่อ',
                dataIndex: 'unit_short',
                key: 'unit_short',
                width: baseColumnWidths.unitShort,
                ellipsis: true,
                fixed: 'left' as const,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }] : []),
            ...(metricVisibility.unit_code ? [{
                title: 'รหัสหน่วยงาน',
                dataIndex: 'org_unit_no',
                key: 'org_unit_no',
                width: baseColumnWidths.unitCode,
                ellipsis: true,
                fixed: 'left' as const,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }] : []),
            ...(metricVisibility.unit_name ? [{
                title: 'ชื่อหน่วยงาน',
                dataIndex: 'unit_name',
                key: 'unit_name',
                width: baseColumnWidths.unitName,
                ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }] : []),
            ...(metricVisibility.unit_level_name ? [{
                title: 'ระดับ',
                dataIndex: 'unit_level_name',
                key: 'unit_level_name',
                width: baseColumnWidths.unitLevel,
                ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }] : []),
            ...(metricVisibility.business_unit ? [{
                title: 'หน่วยธุรกิจ',
                dataIndex: 'business_unit',
                key: 'business_unit',
                width: baseColumnWidths.businessUnit,
                ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }] : [])
        ];

        const groups: ColumnsType<Report7DataType> = [
            ...(metricVisibility.frame ? [{
                title: 'กรอบอัตรากำลัง ในระบบ SAP',
                key: 'frame_group',
                className: 'bg-blue-200! text-blue-900 font-bold text-center',
                children: [
                    ...makeLevelColumns('q', 'bg-blue-50!', 'bg-blue-100!'),
                    {
                        title: 'Contract Out',
                        dataIndex: 'frame_contract_out',
                        key: 'frame_contract_out',
                        width: 90,
                        align: 'center' as const,
                        onHeaderCell: () => ({ className: 'bg-blue-50! text-gray-700 font-bold' }),
                        render: renderNumber,
                        onCell: (record: Report7DataType) => record.key === 'TOTAL_SUMMARY'
                            ? { className: 'bg-blue-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
                            : { className: 'bg-white' }
                    },
                    {
                        title: 'Contract สัญญาย่อย',
                        dataIndex: 'frame_sub_contract',
                        key: 'frame_sub_contract',
                        width: 108,
                        align: 'center' as const,
                        onHeaderCell: () => ({ className: 'bg-blue-50! text-gray-700 font-bold' }),
                        render: renderNumber,
                        onCell: (record: Report7DataType) => record.key === 'TOTAL_SUMMARY'
                            ? { className: 'bg-blue-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
                            : { className: 'bg-white' }
                    }
                ]
            }] : []),

            ...(metricVisibility.people ? [{
                title: 'จำนวนคน',
                key: 'people_group',
                className: 'bg-orange-200! text-orange-900 font-bold text-center',
                children: makeLevelColumns('m', 'bg-orange-50!', 'bg-orange-100!')
            }] : []),

            ...(metricVisibility.recruit ? [{
                title: 'สรรหา',
                dataIndex: 'recruit_total',
                key: 'recruit_total',
                width: 80,
                align: 'center' as const,
                onHeaderCell: () => ({ className: 'bg-green-200! text-green-900 font-bold text-center' }),
                render: renderNumber,
                onCell: (record: Report7DataType) => record.key === 'TOTAL_SUMMARY'
                    ? { className: 'bg-green-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
                    : { className: 'bg-white' }
            }] : []),

            ...(metricVisibility.vacancy ? [{
                title: 'ว่าง',
                key: 'vacancy_group',
                className: 'bg-red-200! text-red-900 font-bold text-center',
                children: makeLevelColumns('t', 'bg-red-50!', 'bg-red-100!')
            }] : []),

            ...(metricVisibility.mp ? [{
                title: 'Manpower Landscape',
                key: 'mp_group',
                className: 'bg-purple-200! text-purple-900 font-bold text-center',
                children: makeMetricColumns('mp', mpShapeMetricConfigs, 'bg-purple-50!', 'bg-purple-100!')
            }] : []),

            ...(metricVisibility.shape ? [{
                title: 'Shape Ratio',
                key: 'shape_group',
                className: 'bg-teal-200! text-teal-900 font-bold text-center',
                children: makeMetricColumns('shape', mpShapeMetricConfigs, 'bg-teal-50!', 'bg-teal-100!')
            }] : []),

            ...(metricVisibility.gap ? [{
                title: '% Gap',
                key: 'gap_group',
                className: 'bg-indigo-200! text-indigo-900 font-bold text-center',
                children: makeMetricColumns('gap', gapMetricConfigs, 'bg-indigo-50!', 'bg-indigo-100!', renderPercent)
            }] : []),

            ...(metricVisibility.remark ? [{
                title: 'หมายเหตุ',
                dataIndex: 'remark',
                key: 'remark',
                width: baseColumnWidths.remark,
                ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }] : [])
        ];

        return [...base, ...groups];
    }, [metricVisibility]);

    const handleExportExcel = async () => {
        if (!hasSearched || !allData.length) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 07');

        type GroupKind = 'frame' | 'people' | 'recruit' | 'vacancy' | 'mp' | 'shape' | 'gap';
        type ColMeta =
            | { kind: 'base' | 'remark' }
            | { kind: 'metric'; group: GroupKind; isPercent?: boolean };

        const colors = {
            gray100: 'FFF3F4F6',
            gray300: 'FFD1D5DB',
            gray900: 'FF111827',
            blue50: 'FFEFF6FF',
            blue100: 'FFDBEAFE',
            blue200: 'FFBFDBFE',
            blue900: 'FF1E3A8A',
            orange50: 'FFFFF7ED',
            orange100: 'FFFFEDD5',
            orange200: 'FFFED7AA',
            orange900: 'FF9A3412',
            red50: 'FFFEF2F2',
            red100: 'FFFEE2E2',
            red200: 'FFFECACA',
            red900: 'FF7F1D1D',
            green100: 'FFDCFCE7',
            green200: 'FFBBF7D0',
            green900: 'FF14532D',
            purple50: 'FFFAF5FF',
            purple100: 'FFF3E8FF',
            purple200: 'FFE9D5FF',
            purple900: 'FF581C87',
            teal50: 'FFF0FDFA',
            teal100: 'FFCCFBF1',
            teal200: 'FF99F6E4',
            teal900: 'FF134E4A',
            indigo50: 'FFEEF2FF',
            indigo100: 'FFE0E7FF',
            indigo200: 'FFC7D2FE',
            indigo900: 'FF312E81',
        };

        const groupStyles: Record<GroupKind, { topBg: string; topFg: string; subBg: string; subFg: string; summaryBg: string }> = {
            frame: {
                topBg: colors.blue200,
                topFg: colors.blue900,
                subBg: colors.blue50,
                subFg: colors.gray900,
                summaryBg: colors.blue100,
            },
            people: {
                topBg: colors.orange200,
                topFg: colors.orange900,
                subBg: colors.orange50,
                subFg: colors.gray900,
                summaryBg: colors.orange100,
            },
            recruit: {
                topBg: colors.green200,
                topFg: colors.green900,
                subBg: colors.green100,
                subFg: colors.green900,
                summaryBg: colors.green100,
            },
            vacancy: {
                topBg: colors.red200,
                topFg: colors.red900,
                subBg: colors.red50,
                subFg: colors.gray900,
                summaryBg: colors.red100,
            },
            mp: {
                topBg: colors.purple200,
                topFg: colors.purple900,
                subBg: colors.purple50,
                subFg: colors.gray900,
                summaryBg: colors.purple100,
            },
            shape: {
                topBg: colors.teal200,
                topFg: colors.teal900,
                subBg: colors.teal50,
                subFg: colors.gray900,
                summaryBg: colors.teal100,
            },
            gap: {
                topBg: colors.indigo200,
                topFg: colors.indigo900,
                subBg: colors.indigo50,
                subFg: colors.gray900,
                summaryBg: colors.indigo100,
            },
        };

        const topHeaders: string[] = [];
        const subHeaders: string[] = [];
        const dataKeys: string[] = [];
        const columnMeta: ColMeta[] = [];
        const groupRanges: Array<{ startCol: number; endCol: number; group: GroupKind }> = [];

        const setBorder = (cell: ExcelJS.Cell, topStyle: 'thin' | 'medium' = 'thin') => {
            cell.border = {
                top: { style: topStyle, color: { argb: colors.gray300 } },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        };

        const addBaseColumn = (label: string, key: string, kind: 'base' | 'remark' = 'base') => {
            topHeaders.push(label);
            subHeaders.push('');
            dataKeys.push(key);
            columnMeta.push({ kind });
        };

        const addGroupColumns = (
            title: string,
            group: GroupKind,
            columns: Array<{ label: string; key: string; isPercent?: boolean }>
        ) => {
            if (!columns.length) return;
            const startCol = dataKeys.length + 1;
            columns.forEach((col, index) => {
                topHeaders.push(index === 0 ? title : '');
                subHeaders.push(col.label);
                dataKeys.push(col.key);
                columnMeta.push({ kind: 'metric', group, isPercent: col.isPercent });
            });
            groupRanges.push({ startCol, endCol: dataKeys.length, group });
        };

        if (metricVisibility.unit_short) {
            addBaseColumn('ชื่อย่อ', 'unit_short');
        }
        if (metricVisibility.unit_code) {
            addBaseColumn('รหัสหน่วยงาน', 'org_unit_no');
        }
        if (metricVisibility.unit_name) {
            addBaseColumn('ชื่อหน่วยงาน', 'unit_name');
        }
        if (metricVisibility.unit_level_name) {
            addBaseColumn('ระดับ', 'unit_level_name');
        }
        if (metricVisibility.business_unit) {
            addBaseColumn('หน่วยธุรกิจ', 'business_unit');
        }

        if (metricVisibility.frame) {
            addGroupColumns(
                'กรอบอัตรากำลัง ในระบบ SAP',
                'frame',
                [
                    ...levelConfigs.map((cfg) => ({ label: cfg.label, key: cfg.q })),
                    { label: 'Contract Out', key: 'frame_contract_out' },
                    { label: 'Contract สัญญาย่อย', key: 'frame_sub_contract' },
                ]
            );
        }

        if (metricVisibility.people) {
            addGroupColumns(
                'จำนวนคน',
                'people',
                levelConfigs.map((cfg) => ({ label: cfg.label, key: cfg.m }))
            );
        }

        if (metricVisibility.recruit) {
            addGroupColumns('สรรหา', 'recruit', [{ label: '', key: 'recruit_total' }]);
        }

        if (metricVisibility.vacancy) {
            addGroupColumns(
                'ว่าง',
                'vacancy',
                levelConfigs.map((cfg) => ({ label: cfg.label, key: cfg.t }))
            );
        }

        if (metricVisibility.mp) {
            addGroupColumns(
                'Manpower Landscape',
                'mp',
                mpShapeMetricConfigs.map((cfg) => ({ label: cfg.label, key: `mp_${cfg.key}` }))
            );
        }

        if (metricVisibility.shape) {
            addGroupColumns(
                'Shape Ratio',
                'shape',
                mpShapeMetricConfigs.map((cfg) => ({ label: cfg.label, key: `shape_${cfg.key}` }))
            );
        }

        if (metricVisibility.gap) {
            addGroupColumns(
                '% Gap',
                'gap',
                gapMetricConfigs.map((cfg) => ({ label: cfg.label, key: `gap_${cfg.key}`, isPercent: true }))
            );
        }

        if (metricVisibility.remark) {
            addBaseColumn('หมายเหตุ', 'remark', 'remark');
        }

        worksheet.columns = dataKeys.map((key, index) => {
            const meta = columnMeta[index];
            if (meta?.kind === 'remark') return { key, width: 24 };
            if (key === 'unit_short') return { key, width: 16 };
            if (key === 'org_unit_no') return { key, width: 14 };
            if (key === 'unit_name') return { key, width: 42 };
            if (key === 'unit_level_name') return { key, width: 16 };
            if (key === 'business_unit') return { key, width: 12 };
            return { key, width: 14 };
        });

        const headerRow1 = worksheet.addRow(topHeaders);
        const headerRow2 = worksheet.addRow(subHeaders);
        headerRow1.height = 24;
        headerRow2.height = 22;

        groupRanges.forEach(({ startCol, endCol }) => {
            if (endCol > startCol) {
                worksheet.mergeCells(1, startCol, 1, endCol);
            }
        });

        for (let col = 1; col <= dataKeys.length; col += 1) {
            const meta = columnMeta[col - 1];
            if (!meta) continue;
            const cell1 = worksheet.getCell(1, col);
            const cell2 = worksheet.getCell(2, col);
            const subHeader = subHeaders[col - 1];

            if (meta.kind !== 'metric' || subHeader === '') {
                worksheet.mergeCells(1, col, 2, col);
                const groupStyle = meta.kind === 'metric' ? groupStyles[meta.group] : null;
                const fillBg = groupStyle ? groupStyle.topBg : colors.gray100;
                const fillFg = groupStyle ? groupStyle.topFg : colors.gray900;

                cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillBg } };
                cell1.font = { bold: true, name: 'Sarabun', size: 10, color: { argb: fillFg } };
                cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                setBorder(cell1);
                continue;
            }

            const groupStyle = groupStyles[meta.group];
            cell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: groupStyle.subBg } };
            cell2.font = { bold: true, name: 'Sarabun', size: 10, color: { argb: groupStyle.subFg } };
            cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            setBorder(cell2);
        }

        groupRanges.forEach(({ startCol, group }) => {
            const cell = worksheet.getCell(1, startCol);
            const groupStyle = groupStyles[group];
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: groupStyle.topBg } };
            cell.font = { bold: true, name: 'Sarabun', size: 10, color: { argb: groupStyle.topFg } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            setBorder(cell);
        });

        for (let rowNo = 1; rowNo <= 2; rowNo += 1) {
            for (let col = 1; col <= dataKeys.length; col += 1) {
                const cell = worksheet.getCell(rowNo, col);
                if (!cell.border) setBorder(cell);
            }
        }

        allData.forEach((row) => {
            const rowData = dataKeys.map((key) => {
                const value = row[key];
                if (typeof value === 'number') {
                    if (key.startsWith('gap_') && !Number.isFinite(value)) return '';
                    return value;
                }
                return value || '';
            });
            const excelRow = worksheet.addRow(rowData);
            excelRow.eachCell((cell, colNumber) => {
                const meta = columnMeta[colNumber - 1];
                cell.font = { name: 'Sarabun', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: meta?.kind === 'metric' ? 'center' : 'left',
                    wrapText: meta?.kind !== 'metric'
                };
                if (meta?.kind === 'metric' && meta.isPercent) {
                    const num = Number(cell.value);
                    if (Number.isFinite(num)) {
                        cell.numFmt = '0.00%';
                    }
                }
                setBorder(cell);
            });
        });

        const summary = tableDataWithSummary.find((row) => row.key === 'TOTAL_SUMMARY');
        if (summary) {
            const summaryValues = dataKeys.map((key) => {
                const value = summary[key];
                if (
                    typeof key === 'string' &&
                    (key.startsWith('mp_') || key.startsWith('shape_') || key.startsWith('gap_'))
                ) {
                    return '';
                }
                if (typeof value === 'number' && key.startsWith('gap_') && !Number.isFinite(value)) return '';
                return value ?? '';
            });
            const summaryRow = worksheet.addRow(summaryValues);
            summaryRow.eachCell((cell, colNumber) => {
                const meta = columnMeta[colNumber - 1];
                const summaryBg = meta?.kind === 'metric'
                    ? groupStyles[meta.group].summaryBg
                    : colors.gray100;
                cell.font = { bold: true, name: 'Sarabun', size: 10 };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: summaryBg }
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: meta?.kind === 'metric' ? 'center' : 'left',
                    wrapText: meta?.kind !== 'metric'
                };
                setBorder(cell, 'medium');
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        await saveExcelFile(blob, `รายงาน Manpower Landscape_${currentSearchDate.format('YYYYMMDD')}.xlsx`);
    };

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
                                <h1 className="text-2xl font-bold m-0 text-white">Report 07</h1>
                                <span className="hidden md:inline-block text-blue-100">|</span>
                                <span className="text-xl font-medium text-blue-50">รายงาน Manpower Landscape</span>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 ${
                        isFullscreen ? 'shrink-0' : 'sticky top-0 z-200'
                    }`}
                >
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={onSearch}
                        initialValues={{ date: filterDate }}
                        className="flex items-center gap-2"
                    >
                        <Form.Item name="date" label="วันที่" className="m-0">
                            <DatePicker
                                format="DD/MM/YYYY"
                                className="w-34"
                                getPopupContainer={() => fullscreenRef.current || document.body}
                                onChange={(value) => {
                                    const nextDate = value || dayjs();
                                    setFilterDate(nextDate);
                                }}
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

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยงาน</label>
                            <MultiSelectFilter
                                label="เลือกหน่วยงาน"
                                options={orgUnitOptions}
                                selectedValues={selectedOrgUnits}
                                onChange={onUnitChange}
                                width="w-48"
                            />
                        </div>

                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                            ค้นหา
                        </Button>
                    </Form>

                    {hasSearched && (
                        <div className="flex items-center gap-2 relative z-210">
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
                                            className="flex flex-col gap-2"
                                            value={selectedDisplayGroups}
                                            onChange={(list) => onDisplayGroupsChange(list as Array<string | number>)}
                                            options={displayGroupOptions.map((item) => ({ value: item.value, label: item.label }))}
                                        />
                                    </div>
                                }
                            >
                                <Button icon={<SettingOutlined />} loading={columnToggleLoading}>
                                    ({selectedDisplayGroups.length})
                                </Button>
                            </Popover>
                        </div>
                    )}
                </div>

                {hasSearched && (
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 z-0 ${isFullscreen ? 'mt-0 flex-1 min-h-0' : 'mt-4'}`}>
                        <div
                            ref={tableContainerRef}
                            className={`${isFullscreen ? 'h-full min-h-0 overflow-hidden' : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-2rem)] overflow-hidden'}`}
                        >
                            <Table
                                columns={columns}
                                dataSource={tableDataWithSummary}
                                loading={{
                                    spinning: loading || columnToggleLoading,
                                    tip: columnToggleLoading ? 'กำลังปรับคอลัมน์...' : undefined,
                                    delay: 0
                                }}
                                bordered
                                size="small"
                                scroll={{ x: 'max-content', y: tableScrollY }}
                                pagination={false}
                                sticky
                                className="report7-table [&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                                rowClassName={(record) => record.key === 'TOTAL_SUMMARY' ? 'font-bold' : 'bg-white'}
                            />
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                .report7-table .ant-table-header.ant-table-sticky-holder {
                    z-index: 1 !important;
                }
                .ant-picker-dropdown,
                .ant-select-dropdown {
                    z-index: 2200 !important;
                }
            `}</style>
        </Main>
    );
}
