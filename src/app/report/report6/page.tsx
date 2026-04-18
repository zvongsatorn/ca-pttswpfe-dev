'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Popover, Checkbox, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, FileExcelOutlined, FullscreenOutlined, FullscreenExitOutlined, SettingOutlined } from '@ant-design/icons';
import { ChevronDown, Search, Check, FileText } from 'lucide-react';
import MultiSelectFilter, { FilterOption } from '@/components/filters/MultiSelectFilter';
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
    // Breakdown fields
    qn_1?: number; qn_2?: number; qn_3?: number; qn_4?: number; qn_5?: number; qn_6?: number; qn_7?: number; qn_total?: number;
    qp_1?: number; qp_2?: number; qp_3?: number; qp_4?: number; qp_5?: number; qp_6?: number; qp_7?: number; qp_total?: number;
    qs_1?: number; qs_2?: number; qs_3?: number; qs_4?: number; qs_5?: number; qs_6?: number; qs_7?: number; qs_total?: number;
    mn_1?: number; mn_2?: number; mn_3?: number; mn_4?: number; mn_5?: number; mn_6?: number; mn_7?: number; mn_total?: number;
    mp_1?: number; mp_2?: number; mp_3?: number; mp_4?: number; mp_5?: number; mp_6?: number; mp_7?: number; mp_total?: number;
    ms_1?: number; ms_2?: number; ms_3?: number; ms_4?: number; ms_5?: number; ms_6?: number; ms_7?: number; ms_total?: number;
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
    // Breakdown
    qn_1: number; qn_2: number; qn_3: number; qn_4: number; qn_5: number; qn_6: number; qn_7: number; qn_total: number;
    qp_1: number; qp_2: number; qp_3: number; qp_4: number; qp_5: number; qp_6: number; qp_7: number; qp_total: number;
    qs_1: number; qs_2: number; qs_3: number; qs_4: number; qs_5: number; qs_6: number; qs_7: number; qs_total: number;
    mn_1: number; mn_2: number; mn_3: number; mn_4: number; mn_5: number; mn_6: number; mn_7: number; mn_total: number;
    mp_1: number; mp_2: number; mp_3: number; mp_4: number; mp_5: number; mp_6: number; mp_7: number; mp_total: number;
    ms_1: number; ms_2: number; ms_3: number; ms_4: number; ms_5: number; ms_6: number; ms_7: number; ms_total: number;
    remark: string;
    children?: Report6DataType[];
    [key: string]: string | number | Report6DataType[] | undefined;
}

const levelConfigs = [
    { label: '21',     qn: 'qn_1', qp: 'qp_1', qs: 'qs_1', mn: 'mn_1', mp: 'mp_1', ms: 'ms_1', f: 'f_1', t: 't_1' },
    { label: '18-20',  qn: 'qn_2', qp: 'qp_2', qs: 'qs_2', mn: 'mn_2', mp: 'mp_2', ms: 'ms_2', f: 'f_2', t: 't_2' },
    { label: '16-17',  qn: 'qn_3', qp: 'qp_3', qs: 'qs_3', mn: 'mn_3', mp: 'mp_3', ms: 'ms_3', f: 'f_3', t: 't_3' },
    { label: '14-15',  qn: 'qn_4', qp: 'qp_4', qs: 'qs_4', mn: 'mn_4', mp: 'mp_4', ms: 'ms_4', f: 'f_4', t: 't_4' },
    { label: '11-13',  qn: 'qn_5', qp: 'qp_5', qs: 'qs_5', mn: 'mn_5', mp: 'mp_5', ms: 'ms_5', f: 'f_5', t: 't_5' },
    { label: '9-10',   qn: 'qn_6', qp: 'qp_6', qs: 'qs_6', mn: 'mn_6', mp: 'mp_6', ms: 'ms_6', f: 'f_6', t: 't_6' },
    { label: '8 ลงมา', qn: 'qn_7', qp: 'qp_7', qs: 'qs_7', mn: 'mn_7', mp: 'mp_7', ms: 'ms_7', f: 'f_7', t: 't_7' },
    { label: 'รวม',    qn: 'qn_total', qp: 'qp_total', qs: 'qs_total', mn: 'mn_total', mp: 'mp_total', ms: 'ms_total', f: 'f_total', t: 'total' }
] as const;

const displayGroupOptions = [
    { value: 'unit_short', label: 'ชื่อย่อ' },
    { value: 'unit_name', label: 'ชื่อเต็มหน่วยงาน' },
    { value: 'quota_normal', label: 'กรอบ ปกติ' },
    { value: 'quota_pool', label: 'กรอบ Pool' },
    { value: 'quota_sec', label: 'กรอบ Sec' },
    { value: 'people_normal', label: 'คน ปกติ' },
    { value: 'people_pool', label: 'คน Pool' },
    { value: 'people_sec', label: 'คน Sec' },
    { value: 'recruit', label: 'สรรหา' },
    { value: 'vacancy', label: 'ว่าง' },
    { value: 'remark', label: 'หมายเหตุ' }
] as const;

const defaultDisplayGroups = displayGroupOptions.map((item) => item.value);

const numericKeys = Array.from(new Set(levelConfigs.flatMap((cfg) => [cfg.qn, cfg.qp, cfg.qs, cfg.mn, cfg.mp, cfg.ms, cfg.f, cfg.t])));

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
    return { value, label: `${value} - ${label}` };
};

const toUnitOption = (row: Report6FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label: `${value} - ${label}` };
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
        // Breakdown
        qn_1: toNumber(raw.qn_1), qn_2: toNumber(raw.qn_2), qn_3: toNumber(raw.qn_3), qn_4: toNumber(raw.qn_4),
        qn_5: toNumber(raw.qn_5), qn_6: toNumber(raw.qn_6), qn_7: toNumber(raw.qn_7), qn_total: toNumber(raw.qn_total),
        qp_1: toNumber(raw.qp_1), qp_2: toNumber(raw.qp_2), qp_3: toNumber(raw.qp_3), qp_4: toNumber(raw.qp_4),
        qp_5: toNumber(raw.qp_5), qp_6: toNumber(raw.qp_6), qp_7: toNumber(raw.qp_7), qp_total: toNumber(raw.qp_total),
        qs_1: toNumber(raw.qs_1), qs_2: toNumber(raw.qs_2), qs_3: toNumber(raw.qs_3), qs_4: toNumber(raw.qs_4),
        qs_5: toNumber(raw.qs_5), qs_6: toNumber(raw.qs_6), qs_7: toNumber(raw.qs_7), qs_total: toNumber(raw.qs_total),
        mn_1: toNumber(raw.mn_1), mn_2: toNumber(raw.mn_2), mn_3: toNumber(raw.mn_3), mn_4: toNumber(raw.mn_4),
        mn_5: toNumber(raw.mn_5), mn_6: toNumber(raw.mn_6), mn_7: toNumber(raw.mn_7), mn_total: toNumber(raw.mn_total),
        mp_1: toNumber(raw.mp_1), mp_2: toNumber(raw.mp_2), mp_3: toNumber(raw.mp_3), mp_4: toNumber(raw.mp_4),
        mp_5: toNumber(raw.mp_5), mp_6: toNumber(raw.mp_6), mp_7: toNumber(raw.mp_7), mp_total: toNumber(raw.mp_total),
        ms_1: toNumber(raw.ms_1), ms_2: toNumber(raw.ms_2), ms_3: toNumber(raw.ms_3), ms_4: toNumber(raw.ms_4),
        ms_5: toNumber(raw.ms_5), ms_6: toNumber(raw.ms_6), ms_7: toNumber(raw.ms_7), ms_total: toNumber(raw.ms_total),
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

const filterTree = (nodes: Report6DataType[], allowedUnits: string[]): Report6DataType[] => {
    const dfs = (node: Report6DataType, isParentMatched: boolean): Report6DataType | null => {
        const isMatched = allowedUnits.includes(String(node.bg_no || '')) || allowedUnits.includes(String(node.org_unit_no || ''));
        const effectiveMatched = isParentMatched || isMatched;
        
        const newChildren: Report6DataType[] = [];
        if (node.children) {
            for (const child of node.children) {
                const filteredChild = dfs(child, effectiveMatched);
                if (filteredChild) {
                    newChildren.push(filteredChild);
                }
            }
        }
        
        if (effectiveMatched || newChildren.length > 0) {
            return {
                ...node,
                children: newChildren.length > 0 ? newChildren : undefined
            };
        }
        return null;
    };

    const result: Report6DataType[] = [];
    for (const root of nodes) {
        const filteredRoot = dfs(root, false);
        if (filteredRoot) {
            result.push(filteredRoot);
        }
    }
    return result;
};


export default function Report6Page() {
    const [form] = Form.useForm<SearchFormValues>();
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] = useState(620);
    const [expandedRowKeys, setExpandedRowKeys] = useState<readonly React.Key[]>([]);

    const [allData, setAllData] = useState<Report6DataType[]>([]);
    const [filterDate, setFilterDate] = useState<Dayjs>(dayjs());
    const [currentSearchDate, setCurrentSearchDate] = useState<Dayjs>(dayjs());

    const [businessUnitOptions, setBusinessUnitOptions] = useState<FilterOption[]>([]);
    const [lineOfWorkOptions, setLineOfWorkOptions] = useState<FilterOption[]>([]);
    const [orgUnitOptions, setOrgUnitOptions] = useState<FilterOption[]>([]);

    const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'BU', 'LINE', 'UNIT'
    const [units, setUnits] = useState<string[]>([]);
    const [appliedUnits, setAppliedUnits] = useState<string[]>([]);

    const filteredUnitOptions = useMemo(() => {
        if (filterType === 'BU') return businessUnitOptions;
        if (filterType === 'LINE') return lineOfWorkOptions;
        if (filterType === 'UNIT') return orgUnitOptions;
        
        const all = [...businessUnitOptions, ...lineOfWorkOptions, ...orgUnitOptions];
        const unique = new Map(all.map(item => [item.value, item]));
        return Array.from(unique.values());
    }, [filterType, businessUnitOptions, lineOfWorkOptions, orgUnitOptions]);

    useEffect(() => {
        setUnits([]);
    }, [filterType]);

    const [selectedDisplayGroups, setSelectedDisplayGroups] = useState<string[]>(defaultDisplayGroups);
    const [appliedDisplayGroups, setAppliedDisplayGroups] = useState<string[]>(defaultDisplayGroups);

    const fetchFilterOptions = useCallback(async (effectiveDate: Dayjs, signal?: AbortSignal) => {
        const { employeeId, userGroupNo } = resolveUserContext();

        try {
            const query = new URLSearchParams({
                effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo
            });

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
                setOrgUnitOptions([]);
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
            const nextUnits = uniqueOptions(
                payload.data.units
                    .map(toUnitOption)
                    .filter((item): item is FilterOption => item !== null)
            );

            setBusinessUnitOptions(nextBusiness);
            setLineOfWorkOptions(nextLines);
            setOrgUnitOptions(nextUnits);
        } catch (error) {
            if (signal?.aborted) return;
            console.error('Failed to fetch report6 filters:', error);
            setBusinessUnitOptions([]);
            setLineOfWorkOptions([]);
            setOrgUnitOptions([]);
        }
    }, []);

    const fetchReportData = useCallback(async (date: Dayjs) => {
        const { employeeId, userGroupNo } = resolveUserContext();
        setLoading(true);

        try {
            const query = new URLSearchParams({
                effectiveDate: date.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo
            });

            const res = await fetch(`/api/report/report6?${query.toString()}`);
            const payload: Report6ApiResponse = await res.json();

            if (!res.ok || payload.status !== 200 || !Array.isArray(payload.data)) {
                throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            const normalized = transformRows(payload.data);
            setAllData(normalized); // Do not build tree yet
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
        setAppliedUnits([...units]);

        if (!hasSearched || date.format('YYYY-MM-DD') !== currentSearchDate.format('YYYY-MM-DD')) {
            await fetchReportData(date);
        }
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

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            void fetchFilterOptions(filterDate, controller.signal);
        }, 180);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [filterDate, fetchFilterOptions]);

    const displayData = useMemo(() => {
        const tree = buildTree(allData);
        if (!appliedUnits.length) return tree;
        return filterTree(tree, appliedUnits);
    }, [allData, appliedUnits]);

    const tableDataWithSummary = useMemo(() => {
        if (!displayData.length) return [];

        const flat = flattenRows(displayData);
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
            qn_1: 0, qn_2: 0, qn_3: 0, qn_4: 0, qn_5: 0, qn_6: 0, qn_7: 0, qn_total: 0,
            qp_1: 0, qp_2: 0, qp_3: 0, qp_4: 0, qp_5: 0, qp_6: 0, qp_7: 0, qp_total: 0,
            qs_1: 0, qs_2: 0, qs_3: 0, qs_4: 0, qs_5: 0, qs_6: 0, qs_7: 0, qs_total: 0,
            mn_1: 0, mn_2: 0, mn_3: 0, mn_4: 0, mn_5: 0, mn_6: 0, mn_7: 0, mn_total: 0,
            mp_1: 0, mp_2: 0, mp_3: 0, mp_4: 0, mp_5: 0, mp_6: 0, mp_7: 0, mp_total: 0,
            ms_1: 0, ms_2: 0, ms_3: 0, ms_4: 0, ms_5: 0, ms_6: 0, ms_7: 0, ms_total: 0,
            remark: ''
        };

        flat.forEach((row) => {
            numericKeys.forEach((key) => {
                summary[key] = toNumber(summary[key]) + toNumber(row[key]);
            });
        });

        return [...displayData, summary];
    }, [displayData]);

    useEffect(() => {
        if (tableDataWithSummary.length > 0) {
            const keys = flattenRows(tableDataWithSummary).map((row) => row.key);
            setExpandedRowKeys(keys);
        } else {
            setExpandedRowKeys([]);
        }
    }, [tableDataWithSummary]);

    const metricVisibility = useMemo(() => {
        const selected = new Set(appliedDisplayGroups);
        return {
            unit_short: selected.has('unit_short'),
            unit_name: selected.has('unit_name'),
            quota_normal: selected.has('quota_normal'),
            quota_pool: selected.has('quota_pool'),
            quota_sec: selected.has('quota_sec'),
            people_normal: selected.has('people_normal'),
            people_pool: selected.has('people_pool'),
            people_sec: selected.has('people_sec'),
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

                if (metricVisibility.quota_normal) {
                    children.push({
                        title: 'กรอบ ปกติ',
                        dataIndex: level.qn,
                        key: level.qn,
                        width: 72,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-blue-100! text-blue-900! font-bold text-center text-[10px]!' }),
                        render: renderNumber,
                        onCell: getBasicCell
                    });
                }
                if (metricVisibility.quota_pool) {
                    children.push({
                        title: 'กรอบ Pool',
                        dataIndex: level.qp,
                        key: level.qp,
                        width: 72,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-indigo-100! text-indigo-900! font-bold text-center text-[10px]!' }),
                        render: renderNumber,
                        onCell: getBasicCell
                    });
                }
                if (metricVisibility.quota_sec) {
                    children.push({
                        title: 'กรอบ Sec',
                        dataIndex: level.qs,
                        key: level.qs,
                        width: 72,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-purple-100! text-purple-900! font-bold text-center text-[10px]!' }),
                        render: renderNumber,
                        onCell: getBasicCell
                    });
                }
                if (metricVisibility.people_normal) {
                    children.push({
                        title: 'คน ปกติ',
                        dataIndex: level.mn,
                        key: level.mn,
                        width: 64,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-orange-100! text-orange-900! font-bold text-center text-[10px]!' }),
                        render: renderNumber,
                        onCell: getBasicCell
                    });
                }
                if (metricVisibility.people_pool) {
                    children.push({
                        title: 'คน Pool',
                        dataIndex: level.mp,
                        key: level.mp,
                        width: 64,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-amber-100! text-amber-900! font-bold text-center text-[10px]!' }),
                        render: renderNumber,
                        onCell: getBasicCell
                    });
                }
                if (metricVisibility.people_sec) {
                    children.push({
                        title: 'คน Sec',
                        dataIndex: level.ms,
                        key: level.ms,
                        width: 64,
                        align: 'center',
                        onHeaderCell: () => ({ className: 'bg-yellow-100! text-yellow-900! font-bold text-center text-[10px]!' }),
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
                        onHeaderCell: () => ({ className: 'bg-green-100! text-green-900! font-bold text-center text-[10px]!' }),
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
                        onHeaderCell: () => ({ className: 'bg-red-100! text-red-900! font-bold text-center text-[10px]!' }),
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

        const showQuotaNormal = metricVisibility.quota_normal;
        const showQuotaPool = metricVisibility.quota_pool;
        const showQuotaSec = metricVisibility.quota_sec;
        const showPeopleNormal = metricVisibility.people_normal;
        const showPeoplePool = metricVisibility.people_pool;
        const showPeopleSec = metricVisibility.people_sec;
        const showRecruit = metricVisibility.recruit;
        const showVacancy = metricVisibility.vacancy;
        const showRemark = metricVisibility.remark;

        type MetricKind =
            | 'quota_normal'
            | 'quota_pool'
            | 'quota_sec'
            | 'people_normal'
            | 'people_pool'
            | 'people_sec'
            | 'recruit'
            | 'vacancy';
        type ColMeta =
            | { kind: 'unit_short' | 'unit_name' | 'remark' }
            | { kind: 'metric'; metric: MetricKind; levelLabel: string };

        const topHeaders: string[] = [];
        const subHeaders: string[] = [];
        const dataKeys: string[] = [];
        const columnMeta: ColMeta[] = [];
        const levelRanges: Array<{ startCol: number; endCol: number; levelLabel: string }> = [];

        const palette = {
            gray100: 'FFF3F4F6',
            gray900: 'FF111827',
            gray300: 'FFD1D5DB',
            blue100: 'FFDBEAFE',
            blue900: 'FF1E3A8A',
            indigo100: 'FFE0E7FF',
            indigo900: 'FF312E81',
            purple100: 'FFF3E8FF',
            purple900: 'FF581C87',
            orange100: 'FFFFEDD5',
            orange900: 'FF9A3412',
            amber100: 'FFFEF3C7',
            amber900: 'FF78350F',
            yellow100: 'FFFEF9C3',
            yellow200: 'FFFDE68A',
            yellow900: 'FF713F12',
            green50: 'FFF0FDF4',
            green100: 'FFDCFCE7',
            green900: 'FF14532D',
            red50: 'FFFEF2F2',
            red100: 'FFFEE2E2',
            red900: 'FF7F1D1D',
        };

        const metricStyles: Record<MetricKind, { headerBg: string; headerFg: string; bodyBg?: string; summaryBg?: string }> = {
            quota_normal: { headerBg: palette.blue100, headerFg: palette.blue900 },
            quota_pool: { headerBg: palette.indigo100, headerFg: palette.indigo900 },
            quota_sec: { headerBg: palette.purple100, headerFg: palette.purple900 },
            people_normal: { headerBg: palette.orange100, headerFg: palette.orange900 },
            people_pool: { headerBg: palette.amber100, headerFg: palette.amber900 },
            people_sec: { headerBg: palette.yellow100, headerFg: palette.yellow900 },
            recruit: { headerBg: palette.green100, headerFg: palette.green900, bodyBg: palette.green50, summaryBg: palette.green100 },
            vacancy: { headerBg: palette.red100, headerFg: palette.red900, bodyBg: palette.red50, summaryBg: palette.red100 },
        };

        const metricDefinitions: Array<{ enabled: boolean; kind: MetricKind; title: string; key: 'qn' | 'qp' | 'qs' | 'mn' | 'mp' | 'ms' | 'f' | 't' }> = [
            { enabled: showQuotaNormal, kind: 'quota_normal', title: 'กรอบ ปกติ', key: 'qn' },
            { enabled: showQuotaPool, kind: 'quota_pool', title: 'กรอบ Pool', key: 'qp' },
            { enabled: showQuotaSec, kind: 'quota_sec', title: 'กรอบ Sec', key: 'qs' },
            { enabled: showPeopleNormal, kind: 'people_normal', title: 'คน ปกติ', key: 'mn' },
            { enabled: showPeoplePool, kind: 'people_pool', title: 'คน Pool', key: 'mp' },
            { enabled: showPeopleSec, kind: 'people_sec', title: 'คน Sec', key: 'ms' },
            { enabled: showRecruit, kind: 'recruit', title: 'สรรหา', key: 'f' },
            { enabled: showVacancy, kind: 'vacancy', title: 'ว่าง', key: 't' },
        ];

        const setBorder = (cell: ExcelJS.Cell, topStyle: 'thin' | 'medium' = 'thin') => {
            cell.border = {
                top: { style: topStyle, color: { argb: palette.gray300 } },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        };

        if (metricVisibility.unit_short) {
            topHeaders.push('ชื่อย่อ');
            subHeaders.push('');
            dataKeys.push('unit_short');
            columnMeta.push({ kind: 'unit_short' });
        }
        if (metricVisibility.unit_name) {
            topHeaders.push('ชื่อเต็มหน่วย');
            subHeaders.push('');
            dataKeys.push('unit_name');
            columnMeta.push({ kind: 'unit_name' });
        }

        levelConfigs.forEach((level) => {
            const startCol = dataKeys.length + 1;
            metricDefinitions.forEach((metric) => {
                if (!metric.enabled) return;
                topHeaders.push(level.label);
                subHeaders.push(metric.title);
                dataKeys.push(level[metric.key]);
                columnMeta.push({ kind: 'metric', metric: metric.kind, levelLabel: level.label });
            });
            const endCol = dataKeys.length;
            if (endCol >= startCol) {
                levelRanges.push({ startCol, endCol, levelLabel: level.label });
            }
        });

        if (showRemark) {
            topHeaders.push('หมายเหตุ');
            subHeaders.push('');
            dataKeys.push('remark');
            columnMeta.push({ kind: 'remark' });
        }

        worksheet.columns = dataKeys.map((key, index) => {
            const meta = columnMeta[index];
            if (meta?.kind === 'unit_short') return { key, width: 28 };
            if (meta?.kind === 'unit_name') return { key, width: 40 };
            if (meta?.kind === 'remark') return { key, width: 30 };
            return { key, width: 14 };
        });

        const row1 = worksheet.addRow(topHeaders);
        const row2 = worksheet.addRow(subHeaders);
        row1.height = 24;
        row2.height = 22;

        levelRanges.forEach(({ startCol, endCol }) => {
            if (endCol > startCol) {
                worksheet.mergeCells(1, startCol, 1, endCol);
            }
        });

        for (let col = 1; col <= dataKeys.length; col += 1) {
            const meta = columnMeta[col - 1];
            if (!meta) continue;
            const cell1 = worksheet.getCell(1, col);
            const cell2 = worksheet.getCell(2, col);

            if (meta.kind !== 'metric') {
                worksheet.mergeCells(1, col, 2, col);
                cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.gray100 } };
                cell1.font = { bold: true, name: 'Sarabun', size: 10, color: { argb: palette.gray900 } };
                cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                setBorder(cell1);
                continue;
            }

            const metricStyle = metricStyles[meta.metric];
            cell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: metricStyle.headerBg } };
            cell2.font = { bold: true, name: 'Sarabun', size: 10, color: { argb: metricStyle.headerFg } };
            cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            setBorder(cell2);
        }

        levelRanges.forEach(({ startCol, levelLabel }) => {
            const topCell = worksheet.getCell(1, startCol);
            const isTotalLevel = levelLabel === 'รวม';
            topCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isTotalLevel ? palette.yellow200 : palette.gray100 }
            };
            topCell.font = {
                bold: true,
                name: 'Sarabun',
                size: 10,
                color: { argb: isTotalLevel ? palette.yellow900 : palette.gray900 }
            };
            topCell.alignment = { horizontal: 'center', vertical: 'middle' };
            setBorder(topCell);
        });

        for (let rowNo = 1; rowNo <= 2; rowNo += 1) {
            for (let col = 1; col <= dataKeys.length; col += 1) {
                const cell = worksheet.getCell(rowNo, col);
                if (!cell.border) {
                    setBorder(cell);
                }
            }
        }

        const flat = flattenRows(allData);
        flat.forEach((row) => {
            const rowData = dataKeys.map((key) => {
                if (key === 'unit_short') return `${'    '.repeat(row._depth)}${row.unit_short || ''}`;
                const value = row[key];
                if (typeof value === 'number') return value;
                return value || '';
            });
            const excelRow = worksheet.addRow(rowData);
            excelRow.eachCell((cell, colNumber) => {
                const meta = columnMeta[colNumber - 1];
                const metricStyle = meta && meta.kind === 'metric' ? metricStyles[meta.metric] : undefined;
                if (metricStyle?.bodyBg) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: metricStyle.bodyBg } };
                }
                cell.font = { name: 'Sarabun', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: meta?.kind === 'metric' ? 'center' : 'left',
                    wrapText: meta?.kind !== 'metric'
                };
                setBorder(cell);
            });
        });

        const summaryRow: Record<string, string | number> = { unit_short: '', unit_name: 'รวมทั้งสิ้น (Grand Total)' };
        numericKeys.forEach((key) => {
            summaryRow[key] = flat.reduce((sum, row) => sum + toNumber(row[key]), 0);
        });
        if (showRemark) summaryRow.remark = '';

        const summaryValues = dataKeys.map((key) => summaryRow[key] ?? '');
        const summaryExcelRow = worksheet.addRow(summaryValues);
        summaryExcelRow.eachCell((cell, colNumber) => {
            const meta = columnMeta[colNumber - 1];
            const metricStyle = meta && meta.kind === 'metric' ? metricStyles[meta.metric] : undefined;
            const summaryBg = metricStyle?.summaryBg || palette.gray100;
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
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">ประเภท Filter</label>
                            <Select
                                value={filterType}
                                onChange={setFilterType}
                                className="w-32"
                                options={[
                                    { value: 'ALL', label: 'ทั้งหมด' },
                                    { value: 'BU', label: 'หน่วยธุรกิจ' },
                                    { value: 'LINE', label: 'สายงาน' },
                                    { value: 'UNIT', label: 'หน่วยงาน' },
                                ]}
                            />
                        </div>

                        {filterType !== 'ALL' && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                    {filterType === 'BU' ? 'หน่วยธุรกิจ' : filterType === 'LINE' ? 'สายงาน' : 'หน่วยงาน'}
                                </label>
                                <MultiSelectFilter
                                    label={`เลือก${filterType === 'BU' ? 'หน่วยธุรกิจ' : filterType === 'LINE' ? 'สายงาน' : 'หน่วยงาน'}`}
                                    options={filteredUnitOptions}
                                    selectedValues={units}
                                    onChange={setUnits}
                                    width="w-56"
                                />
                            </div>
                        )}

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
                                    expandedRowKeys,
                                    onExpandedRowsChange: setExpandedRowKeys,
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
