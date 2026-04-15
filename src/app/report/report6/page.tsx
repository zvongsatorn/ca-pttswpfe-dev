'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Popover, Checkbox } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, FileExcelOutlined, FullscreenOutlined, FullscreenExitOutlined, SettingOutlined } from '@ant-design/icons';
import { ChevronDown, Search, Check, FileText } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';

dayjs.locale('th');

interface Report6ApiRow {
    key?: string;
    org_unit_no?: string;
    parent_org_unit_no?: string;
    lvl?: number;
    bg_no?: string;
    unit_level_name?: string;
    unit_short?: string;
    unit_name?: string;
    q_1?: number; m_1?: number; f_1?: number; t_1?: number;
    q_2?: number; m_2?: number; f_2?: number; t_2?: number;
    q_3?: number; m_3?: number; f_3?: number; t_3?: number;
    q_4?: number; m_4?: number; f_4?: number; t_4?: number;
    q_5?: number; m_5?: number; f_5?: number; t_5?: number;
    q_6?: number; m_6?: number; f_6?: number; t_6?: number;
    q_7?: number; m_7?: number; f_7?: number; t_7?: number;
    q_total?: number; m_total?: number; f_total?: number; total?: number;
    remark?: string;
    [key: string]: unknown;
}

interface Report6ApiResponse {
    status: number;
    data?: Report6ApiRow[];
    message?: string;
}

interface Report6FilterItem {
    BGNo?: string;
    BGName?: string;
    OrgUnitNo?: string;
    UnitText?: string;
    UnitName?: string;
    UnitAbbr?: string;
}

interface Report6FilterResponse {
    status: number;
    data?: {
        businessUnits: Report6FilterItem[];
        lines: Report6FilterItem[];
        units: Report6FilterItem[];
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

interface Report6DataType {
    key: string;
    org_unit_no: string;
    parent_org_unit_no: string;
    lvl: number;
    bg_no: string;
    unit_level_name: string;
    unit_short: string;
    unit_name: string;
    q_1: number; m_1: number; f_1: number; t_1: number;
    q_2: number; m_2: number; f_2: number; t_2: number;
    q_3: number; m_3: number; f_3: number; t_3: number;
    q_4: number; m_4: number; f_4: number; t_4: number;
    q_5: number; m_5: number; f_5: number; t_5: number;
    q_6: number; m_6: number; f_6: number; t_6: number;
    q_7: number; m_7: number; f_7: number; t_7: number;
    q_total: number; m_total: number; f_total: number; total: number;
    remark: string;
    children?: Report6DataType[];
    [key: string]: string | number | Report6DataType[] | undefined;
}

const levelConfigs = [
    { label: '21', q: 'q_1', m: 'm_1', f: 'f_1', t: 't_1' },
    { label: '18-20', q: 'q_2', m: 'm_2', f: 'f_2', t: 't_2' },
    { label: '16-17', q: 'q_3', m: 'm_3', f: 'f_3', t: 't_3' },
    { label: '14-15', q: 'q_4', m: 'm_4', f: 'f_4', t: 't_4' },
    { label: '11-13', q: 'q_5', m: 'm_5', f: 'f_5', t: 't_5' },
    { label: '9-10', q: 'q_6', m: 'm_6', f: 'f_6', t: 't_6' },
    { label: '8 ลงมา', q: 'q_7', m: 'm_7', f: 'f_7', t: 't_7' },
    { label: 'รวม', q: 'q_total', m: 'm_total', f: 'f_total', t: 'total' }
] as const;

const displayGroupOptions = [
    { value: 'unit_short', label: 'ชื่อย่อ' },
    { value: 'unit_name', label: 'ชื่อเต็มหน่วยงาน' },
    { value: 'quota', label: 'กรอบ' },
    { value: 'people', label: 'คน' },
    { value: 'recruit', label: 'สรรหา' },
    { value: 'vacancy', label: 'ว่าง' },
    { value: 'remark', label: 'หมายเหตุ' }
] as const;

const defaultDisplayGroups = displayGroupOptions.map((item) => item.value);

const numericKeys = Array.from(new Set(levelConfigs.flatMap((cfg) => [cfg.q, cfg.m, cfg.f, cfg.t])));

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
    const next = prev.filter((item) => options.some((opt) => opt.value === item)).slice(0, 1);
    return isSameSelection(prev, next) ? prev : next;
};

const toBgOption = (row: Report6FilterItem): FilterOption | null => {
    const value = toText(row.BGNo);
    const label = toText(row.BGName);
    if (!value || !label) return null;
    return { value, label };
};

const toLineOption = (row: Report6FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label };
};

const transformRows = (rows: Report6ApiRow[]): Report6DataType[] => {
    return rows.map((raw, idx) => ({
        key: toText(raw.key) || `r6-${idx + 1}`,
        org_unit_no: toText(raw.org_unit_no),
        parent_org_unit_no: toText(raw.parent_org_unit_no),
        lvl: toNumber(raw.lvl),
        bg_no: toText(raw.bg_no),
        unit_level_name: toText(raw.unit_level_name),
        unit_short: toText(raw.unit_short),
        unit_name: toText(raw.unit_name),
        q_1: toNumber(raw.q_1), m_1: toNumber(raw.m_1), f_1: toNumber(raw.f_1), t_1: toNumber(raw.t_1),
        q_2: toNumber(raw.q_2), m_2: toNumber(raw.m_2), f_2: toNumber(raw.f_2), t_2: toNumber(raw.t_2),
        q_3: toNumber(raw.q_3), m_3: toNumber(raw.m_3), f_3: toNumber(raw.f_3), t_3: toNumber(raw.t_3),
        q_4: toNumber(raw.q_4), m_4: toNumber(raw.m_4), f_4: toNumber(raw.f_4), t_4: toNumber(raw.t_4),
        q_5: toNumber(raw.q_5), m_5: toNumber(raw.m_5), f_5: toNumber(raw.f_5), t_5: toNumber(raw.t_5),
        q_6: toNumber(raw.q_6), m_6: toNumber(raw.m_6), f_6: toNumber(raw.f_6), t_6: toNumber(raw.t_6),
        q_7: toNumber(raw.q_7), m_7: toNumber(raw.m_7), f_7: toNumber(raw.f_7), t_7: toNumber(raw.t_7),
        q_total: toNumber(raw.q_total), m_total: toNumber(raw.m_total), f_total: toNumber(raw.f_total), total: toNumber(raw.total),
        remark: toText(raw.remark)
    })).filter((row) => row.org_unit_no || row.unit_name || row.unit_short);
};

const buildTree = (rows: Report6DataType[]): Report6DataType[] => {
    if (!rows.length) return [];

    const byOrgUnit = new Map<string, Report6DataType>();
    rows.forEach((row) => {
        byOrgUnit.set(row.org_unit_no || row.key, { ...row, children: [] });
    });

    const roots: Report6DataType[] = [];

    rows.forEach((row) => {
        const key = row.org_unit_no || row.key;
        const node = byOrgUnit.get(key);
        if (!node) return;

        const parentKey = row.parent_org_unit_no;
        const parentNode = parentKey ? byOrgUnit.get(parentKey) : undefined;
        const isRoot = !parentKey || parentKey === '-1' || !parentNode || parentKey === key;

        if (isRoot) {
            roots.push(node);
            return;
        }

        parentNode.children = parentNode.children || [];
        parentNode.children.push(node);
    });

    const sortRecursively = (items: Report6DataType[]) => {
        items.sort((a, b) => {
            const lvlDiff = a.lvl - b.lvl;
            if (lvlDiff !== 0) return lvlDiff;
            const aNum = Number(a.org_unit_no);
            const bNum = Number(b.org_unit_no);
            if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
            return a.org_unit_no.localeCompare(b.org_unit_no);
        });

        items.forEach((item) => {
            if (!item.children || item.children.length === 0) {
                delete item.children;
                return;
            }
            sortRecursively(item.children);
        });
    };

    sortRecursively(roots);
    return roots;
};

const flattenRows = (rows: Report6DataType[], depth = 0): Array<Report6DataType & { _depth: number }> => {
    const output: Array<Report6DataType & { _depth: number }> = [];
    rows.forEach((row) => {
        output.push({ ...row, _depth: depth });
        if (row.children?.length) {
            output.push(...flattenRows(row.children, depth + 1));
        }
    });
    return output;
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

export default function Report6Page() {
    const [form] = Form.useForm<SearchFormValues>();
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] = useState(620);

    const [allData, setAllData] = useState<Report6DataType[]>([]);
    const [filterDate, setFilterDate] = useState<Dayjs>(dayjs());
    const [currentSearchDate, setCurrentSearchDate] = useState<Dayjs>(dayjs());

    const [businessUnitOptions, setBusinessUnitOptions] = useState<FilterOption[]>([]);
    const [lineOfWorkOptions, setLineOfWorkOptions] = useState<FilterOption[]>([]);

    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>([]);

    const [selectedDisplayGroups, setSelectedDisplayGroups] = useState<string[]>(defaultDisplayGroups);
    const [appliedDisplayGroups, setAppliedDisplayGroups] = useState<string[]>(defaultDisplayGroups);

    const fetchFilterOptions = useCallback(async (effectiveDate: Dayjs, bgNo = '', signal?: AbortSignal) => {
        const { employeeId, userGroupNo } = resolveUserContext();

        try {
            const query = new URLSearchParams({
                effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo
            });
            if (bgNo) query.set('bgNo', bgNo);

            const res = await fetch(`/api/report/report6/filters?${query.toString()}`, { signal });
            let payload: Report6FilterResponse | null = null;
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
            console.error('Failed to fetch report6 filters:', error);
            setBusinessUnitOptions([]);
            setLineOfWorkOptions([]);
            setSelectedBusinessUnits((prev) => (prev.length > 0 ? [] : prev));
            setSelectedLinesOfWork((prev) => (prev.length > 0 ? [] : prev));
        }
    }, []);

    const fetchReportData = useCallback(async (date: Dayjs, bgNo = '', division = '') => {
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

            const res = await fetch(`/api/report/report6?${query.toString()}`);
            const payload: Report6ApiResponse = await res.json();

            if (!res.ok || payload.status !== 200 || !Array.isArray(payload.data)) {
                throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            const normalized = transformRows(payload.data);
            const tree = buildTree(normalized);
            setAllData(tree);
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch report6 data:', error);
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
        setAppliedDisplayGroups([...selectedDisplayGroups]);

        const bgNo = selectedBusinessUnits[0] || '';
        const division = selectedLinesOfWork[0] || '';

        await fetchReportData(date, bgNo, division);
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
            const availableHeight = Math.floor(window.innerHeight - rect.top - 80);
            setTableScrollY(Math.max(260, availableHeight));
        };

        const raf = window.requestAnimationFrame(updateTableHeight);
        window.addEventListener('resize', updateTableHeight);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateTableHeight);
        };
    }, [hasSearched, isFullscreen, selectedDisplayGroups, allData.length]);

    const selectedBusinessUnit = selectedBusinessUnits[0] || '';

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
        const next = values.slice(-1);
        setSelectedBusinessUnits(next);
        setSelectedLinesOfWork([]);
    };

    const onLineChange = (values: string[]) => {
        setSelectedLinesOfWork(values.slice(-1));
    };

    const tableDataWithSummary = useMemo(() => {
        if (!allData.length) return [];

        const flat = flattenRows(allData);
        const summary: Report6DataType = {
            key: 'TOTAL_SUMMARY',
            org_unit_no: '',
            parent_org_unit_no: '',
            lvl: 0,
            bg_no: '',
            unit_level_name: '',
            unit_short: '',
            unit_name: 'รวมทั้งสิ้น (Grand Total)',
            q_1: 0, m_1: 0, f_1: 0, t_1: 0,
            q_2: 0, m_2: 0, f_2: 0, t_2: 0,
            q_3: 0, m_3: 0, f_3: 0, t_3: 0,
            q_4: 0, m_4: 0, f_4: 0, t_4: 0,
            q_5: 0, m_5: 0, f_5: 0, t_5: 0,
            q_6: 0, m_6: 0, f_6: 0, t_6: 0,
            q_7: 0, m_7: 0, f_7: 0, t_7: 0,
            q_total: 0, m_total: 0, f_total: 0, total: 0,
            remark: ''
        };

        flat.forEach((row) => {
            numericKeys.forEach((key) => {
                summary[key] = toNumber(summary[key]) + toNumber(row[key]);
            });
        });

        return [...allData, summary];
    }, [allData]);

    const metricVisibility = useMemo(() => {
        const selected = new Set(appliedDisplayGroups);
        return {
            unit_short: selected.has('unit_short'),
            unit_name: selected.has('unit_name'),
            quota: selected.has('quota'),
            people: selected.has('people'),
            recruit: selected.has('recruit'),
            vacancy: selected.has('vacancy'),
            remark: selected.has('remark')
        };
    }, [appliedDisplayGroups]);

    const columns: ColumnsType<Report6DataType> = useMemo(() => {
        const getBasicCell = (record: Report6DataType) => record.key === 'TOTAL_SUMMARY'
            ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
            : { className: 'bg-white' };

        const levelColumns = levelConfigs
            .map((level) => {
                const children: ColumnsType<Report6DataType> = [];

                if (metricVisibility.quota) {
                    children.push({
                        title: 'กรอบ',
                        dataIndex: level.q,
                        key: level.q,
                        width: 64,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-blue-100! text-blue-900! font-bold text-center' }),
                        render: renderNumber,
                        onCell: getBasicCell
                    });
                }
                if (metricVisibility.people) {
                    children.push({
                        title: 'คน',
                        dataIndex: level.m,
                        key: level.m,
                        width: 64,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-orange-100! text-orange-900! font-bold text-center' }),
                        render: renderNumber,
                        onCell: getBasicCell
                    });
                }
                if (metricVisibility.recruit) {
                    children.push({
                        title: 'สรรหา',
                        dataIndex: level.f,
                        key: level.f,
                        width: 64,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-green-100! text-green-900! font-bold text-center' }),
                        render: renderNumber,
                        onCell: (record) => record.key === 'TOTAL_SUMMARY'
                            ? { className: 'bg-green-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
                            : { className: 'bg-green-50!' }
                    });
                }
                if (metricVisibility.vacancy) {
                    children.push({
                        title: 'ว่าง',
                        dataIndex: level.t,
                        key: level.t,
                        width: 64,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-red-100! text-red-900! font-bold text-center' }),
                        render: renderNumber,
                        onCell: (record) => record.key === 'TOTAL_SUMMARY'
                            ? { className: 'bg-red-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
                            : { className: 'bg-red-50!' }
                    });
                }

                if (!children.length) return null;

                return {
                    title: level.label,
                    key: `group-${level.label}`,
                    className: level.label === 'รวม'
                        ? 'bg-yellow-200! text-yellow-900! font-bold text-center'
                        : 'bg-gray-100! text-gray-900! font-bold text-center',
                    children
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        const base: ColumnsType<Report6DataType> = [
            ...(metricVisibility.unit_short ? [{
                title: 'ชื่อย่อ',
                dataIndex: 'unit_short',
                key: 'unit_short',
                width: 160,
                fixed: 'left' as const,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }] : []),
            ...(metricVisibility.unit_name ? [{
                title: 'ชื่อเต็มหน่วย',
                dataIndex: 'unit_name',
                key: 'unit_name',
                width: 320,
                fixed: 'left' as const,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }] : [])
        ];

        const trailing: ColumnsType<Report6DataType> = metricVisibility.remark
            ? [{
                title: 'หมายเหตุ',
                dataIndex: 'remark',
                key: 'remark',
                width: 260,
                ellipsis: true,
                onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                onCell: getBasicCell
            }]
            : [];

        return [...base, ...levelColumns, ...trailing];
    }, [metricVisibility]);

    const handleExportExcel = async () => {
        if (!hasSearched || !allData.length) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 06');

        const showQuota = metricVisibility.quota;
        const showPeople = metricVisibility.people;
        const showRecruit = metricVisibility.recruit;
        const showVacancy = metricVisibility.vacancy;
        const showRemark = metricVisibility.remark;

        const headers: string[] = [];
        const dataKeys: string[] = [];

        if (metricVisibility.unit_short) {
            headers.push('ชื่อย่อ');
            dataKeys.push('unit_short');
        }
        if (metricVisibility.unit_name) {
            headers.push('ชื่อเต็มหน่วย');
            dataKeys.push('unit_name');
        }

        levelConfigs.forEach((level) => {
            if (showQuota) {
                headers.push(`${level.label} - กรอบ`);
                dataKeys.push(level.q);
            }
            if (showPeople) {
                headers.push(`${level.label} - คน`);
                dataKeys.push(level.m);
            }
            if (showRecruit) {
                headers.push(`${level.label} - สรรหา`);
                dataKeys.push(level.f);
            }
            if (showVacancy) {
                headers.push(`${level.label} - ว่าง`);
                dataKeys.push(level.t);
            }
        });

        if (showRemark) {
            headers.push('หมายเหตุ');
            dataKeys.push('remark');
        }

        worksheet.columns = headers.map((header, index) => ({
            header,
            key: dataKeys[index],
            width: index === 0 ? 28 : index === 1 ? 40 : 14
        }));

        worksheet.getRow(1).font = { bold: true, name: 'Sarabun', size: 10 };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        const flat = flattenRows(allData);
        flat.forEach((row) => {
            const rowData = dataKeys.map((key) => {
                if (key === 'unit_short') return `${'    '.repeat(row._depth)}${row.unit_short || ''}`;
                const value = row[key];
                if (typeof value === 'number') return value;
                return value || '';
            });
            worksheet.addRow(rowData);
        });

        const summaryRow: Record<string, string | number> = { unit_short: '', unit_name: 'รวมทั้งสิ้น (Grand Total)' };
        numericKeys.forEach((key) => {
            summaryRow[key] = flat.reduce((sum, row) => sum + toNumber(row[key]), 0);
        });
        if (showRemark) summaryRow.remark = '';

        const summaryValues = dataKeys.map((key) => summaryRow[key] ?? '');
        const summaryExcelRow = worksheet.addRow(summaryValues);
        summaryExcelRow.eachCell((cell) => {
            cell.font = { bold: true, name: 'Sarabun', size: 10 };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF3F4F6' }
            };
        });

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        await saveExcelFile(blob, `รายงานสรุปอัตราค้างสรรหาและอัตราว่าง_${currentSearchDate.format('YYYYMMDD')}.xlsx`);
    };

    return (
        <Main currentPath="/report">
            <div ref={fullscreenRef} className={`space-y-6 w-full min-w-0 ${isFullscreen ? 'bg-white p-4 overflow-auto' : ''}`}>
                {!isFullscreen && (
                    <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md border border-blue-500 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="text-2xl text-blue-100" />
                                <h1 className="text-2xl font-bold m-0 text-white">Report 06</h1>
                                <span className="hidden md:inline-block text-blue-100">|</span>
                                <span className="text-xl font-medium text-blue-50">รายงานสรุปอัตราค้างสรรหาและอัตราว่าง</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-[200]">
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

                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                            ค้นหา
                        </Button>
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
                                            className="flex flex-col gap-2"
                                            value={selectedDisplayGroups}
                                            onChange={(list) => setSelectedDisplayGroups(list.map((v) => String(v)))}
                                            options={displayGroupOptions.map((item) => ({ value: item.value, label: item.label }))}
                                        />
                                    </div>
                                }
                            >
                                <Button icon={<SettingOutlined />}>
                                    ({selectedDisplayGroups.length})
                                </Button>
                            </Popover>
                        </div>
                    )}
                </div>

                {hasSearched && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-4 z-0">
                        <div
                            ref={tableContainerRef}
                            className="w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-2rem)] overflow-hidden"
                        >
                            <Table
                                columns={columns}
                                dataSource={tableDataWithSummary}
                                loading={loading}
                                bordered
                                size="small"
                                scroll={{ x: 'max-content', y: tableScrollY }}
                                pagination={false}
                                sticky
                                className="report6-table [&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                                rowClassName={(record) => record.key === 'TOTAL_SUMMARY' ? 'font-bold' : 'bg-white'}
                                expandable={{
                                    defaultExpandAllRows: true,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                .report6-table .ant-table-header.ant-table-sticky-holder {
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
