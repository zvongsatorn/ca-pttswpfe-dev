'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Checkbox, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined,
    FileExcelOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { ChevronDown, Search, Check, FileText } from 'lucide-react';
import MultiSelectFilter, { FilterOption } from '@/components/filters/MultiSelectFilter';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';

dayjs.locale('th');

interface Report3RawRow {
    OrgUnitNo?: string;
    ParentOrgUnitNo?: string;
    UnitName?: string;
    UnitAbbr?: string;
    UnitLevelName?: string;
    BGName?: string;
    BGNo?: string;
    OrgTypeName?: string;
    StrgflagName?: string;
    StrgFlagName?: string;
    BSTypeName?: string;
    BsTypeName?: string;
    SpecFlagName?: string;
    PoolRsFlag?: number | string;
    StrgFlag?: number | string;
    BSType?: number | string;

    amount_1?: number | string;
    amount_2?: number | string;
    amount_3?: number | string;
    amount_4?: number | string;
    amount_5?: number | string;
    amount_6?: number | string;
    amount_7?: number | string;
    amount_8?: number | string;
    amount_subcontract?: number | string;
    total_amount?: number | string;

    hc_line_1?: number | string;
    hc_line_2?: number | string;
    hc_line_3?: number | string;
    hc_line_4?: number | string;
    hc_line_5?: number | string;
    hc_line_6?: number | string;
    hc_line_7?: number | string;
    hc_line_total?: number | string;

    hc_staff_1?: number | string;
    hc_staff_2?: number | string;
    hc_staff_3?: number | string;
    hc_staff_4?: number | string;
    hc_staff_5?: number | string;
    hc_staff_6?: number | string;
    hc_staff_7?: number | string;
    hc_staff_total?: number | string;
    hc_total_1?: number | string;
    hc_total_2?: number | string;
    hc_total_3?: number | string;
    hc_total_4?: number | string;
    hc_total_5?: number | string;
    hc_total_6?: number | string;
    hc_total_7?: number | string;
    hc_grand_total?: number | string;

    vacant_1?: number | string;
    vacant_2?: number | string;
    vacant_3?: number | string;
    vacant_4?: number | string;
    vacant_5?: number | string;
    vacant_6?: number | string;
    vacant_7?: number | string;
    vacant_total?: number | string;
    f_amount?: number | string;
    FAmount?: number | string;

    note?: string;
    TransactionDesc?: string;
    SecUnitDummy?: string;
}

interface Report3ApiResponse {
    status: number;
    data?: Report3RawRow[];
    message?: string;
}

interface Report3FilterItem {
    BGNo?: string;
    BGName?: string;
    OrgUnitNo?: string;
    UnitText?: string;
    UnitName?: string;
    UnitAbbr?: string;
}

interface Report3FilterResponse {
    status: number;
    data?: {
        businessUnits: Report3FilterItem[];
        lines: Report3FilterItem[];
        units: Report3FilterItem[];
    };
    message?: string;
}


interface SearchFormValues {
    date?: Dayjs;
}

interface Report3DataType {
    key: string;
    unit_short: string;
    unit_code: string;
    unit_name: string;
    line_of_work: string;
    level: string;
    business_unit: string;
    type: string;
    stg_non: string;
    sup_bus: string;
    specific: string;

    frame_contract?: number;
    frame_sub_contract?: number;
    frame_21?: number;
    frame_18_20?: number;
    frame_16_17?: number;
    frame_14_15?: number;
    frame_11_13?: number;
    frame_9_10?: number;
    frame_under_8?: number;
    frame_total?: number;

    people_contract?: number;
    people_sub_contract?: number;
    people_21?: number;
    people_18_20?: number;
    people_16_17?: number;
    people_14_15?: number;
    people_11_13?: number;
    people_9_10?: number;
    people_under_8?: number;
    people_total?: number;

    line_21?: number;
    line_18_20?: number;
    line_16_17?: number;
    line_14_15?: number;
    line_11_13?: number;
    line_9_10?: number;
    line_under_8?: number;
    line_total?: number;

    staff_21?: number;
    staff_18_20?: number;
    staff_16_17?: number;
    staff_14_15?: number;
    staff_11_13?: number;
    staff_9_10?: number;
    staff_under_8?: number;
    staff_total?: number;

    recruit_21?: number;
    recruit_18_20?: number;
    recruit_16_17?: number;
    recruit_14_15?: number;
    recruit_11_13?: number;
    recruit_9_10?: number;
    recruit_under_8?: number;
    recruit_total?: number;

    vacancy_21?: number;
    vacancy_18_20?: number;
    vacancy_16_17?: number;
    vacancy_14_15?: number;
    vacancy_11_13?: number;
    vacancy_9_10?: number;
    vacancy_under_8?: number;
    vacancy_total?: number;

    remark?: string;
    log?: string;
    _poolRsFlag?: number;
    _bgNo?: string;
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
    { label: 'ประเภท', value: 'type' },
    { label: 'Stg./Non', value: 'stg_non' },
    { label: 'Sup./Bus.', value: 'sup_bus' },
    { label: 'อัตราเฉพาะตัว', value: 'specific' },
    { label: 'กรอบอัตรากำลัง', value: 'frame' },
    { label: 'จำนวนคน', value: 'people' },
    { label: 'Line', value: 'line' },
    { label: 'Staff', value: 'staff' },
    { label: 'สรรหา', value: 'recruit' },
    { label: 'ว่าง', value: 'vacancy' },
    { label: 'หมายเหตุ', value: 'remark' },
    { label: 'Log', value: 'log' },
];

const defaultCheckedList = columnOptions.map((option) => option.value);

const toNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const mapStrgText = (raw: Report3RawRow): string => {
    const direct = toText(raw.StrgflagName || raw.StrgFlagName);
    if (direct) return direct;

    const strgFlag = toNumber(raw.StrgFlag);
    const poolFlag = toNumber(raw.PoolRsFlag);
    if (poolFlag === 2) {
        if (strgFlag === 1) return 'Strategic';
        if (strgFlag === 0) return 'Non-Strategic';
    }
    return '';
};

const mapBsTypeText = (raw: Report3RawRow): string => {
    const direct = toText(raw.BSTypeName || raw.BsTypeName);
    if (direct) return direct;

    const bsType = toNumber(raw.BSType);
    if (bsType === 1) return 'Business';
    if (bsType === 2) return 'Support';
    return '';
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

const toBgOption = (row: Report3FilterItem): FilterOption | null => {
    const value = toText(row.BGNo);
    const label = toText(row.BGName);
    if (!value || !label) return null;
    return { value, label };
};

const toLineOption = (row: Report3FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label: `${value} - ${label}` };
};

const toUnitOption = (row: Report3FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label: `${value} - ${label}` };
};

const transformRows = (rawRows: Report3RawRow[]): Report3DataType[] => {
    return rawRows.map((row, index) => {
        const line1 = toNumber(row.hc_line_1);
        const line2 = toNumber(row.hc_line_2);
        const line3 = toNumber(row.hc_line_3);
        const line4 = toNumber(row.hc_line_4);
        const line5 = toNumber(row.hc_line_5);
        const line6 = toNumber(row.hc_line_6);
        const line7 = toNumber(row.hc_line_7);

        const staff1 = toNumber(row.hc_staff_1);
        const staff2 = toNumber(row.hc_staff_2);
        const staff3 = toNumber(row.hc_staff_3);
        const staff4 = toNumber(row.hc_staff_4);
        const staff5 = toNumber(row.hc_staff_5);
        const staff6 = toNumber(row.hc_staff_6);
        const staff7 = toNumber(row.hc_staff_7);

        return {
            key: `row-${index + 1}`,
            unit_short: toText(row.UnitAbbr),
            unit_code: toText(row.OrgUnitNo),
            unit_name: toText(row.UnitName),
            line_of_work: toText(row.ParentOrgUnitNo || ''),
            level: toText(row.UnitLevelName),
            business_unit: toText(row.BGName),
            type: toText(row.OrgTypeName),
            stg_non: mapStrgText(row),
            sup_bus: mapBsTypeText(row),
            specific: toText(row.SpecFlagName),

            frame_contract: toNumber(row.amount_8),
            frame_sub_contract: toNumber(row.amount_subcontract),
            frame_21: toNumber(row.amount_1),
            frame_18_20: toNumber(row.amount_2),
            frame_16_17: toNumber(row.amount_3),
            frame_14_15: toNumber(row.amount_4),
            frame_11_13: toNumber(row.amount_5),
            frame_9_10: toNumber(row.amount_6),
            frame_under_8: toNumber(row.amount_7),
            frame_total: toNumber(row.total_amount),

            people_contract: 0,
            people_sub_contract: 0,
            people_21: toNumber(row.hc_total_1),
            people_18_20: toNumber(row.hc_total_2),
            people_16_17: toNumber(row.hc_total_3),
            people_14_15: toNumber(row.hc_total_4),
            people_11_13: toNumber(row.hc_total_5),
            people_9_10: toNumber(row.hc_total_6),
            people_under_8: toNumber(row.hc_total_7),
            people_total: toNumber(row.hc_grand_total),

            line_21: line1,
            line_18_20: line2,
            line_16_17: line3,
            line_14_15: line4,
            line_11_13: line5,
            line_9_10: line6,
            line_under_8: line7,
            line_total: toNumber(row.hc_line_total),

            staff_21: staff1,
            staff_18_20: staff2,
            staff_16_17: staff3,
            staff_14_15: staff4,
            staff_11_13: staff5,
            staff_9_10: staff6,
            staff_under_8: staff7,
            staff_total: toNumber(row.hc_staff_total),

            recruit_21: 0,
            recruit_18_20: 0,
            recruit_16_17: 0,
            recruit_14_15: 0,
            recruit_11_13: 0,
            recruit_9_10: 0,
            recruit_under_8: 0,
            recruit_total: toNumber(row.f_amount ?? row.FAmount),

            vacancy_21: toNumber(row.vacant_1),
            vacancy_18_20: toNumber(row.vacant_2),
            vacancy_16_17: toNumber(row.vacant_3),
            vacancy_14_15: toNumber(row.vacant_4),
            vacancy_11_13: toNumber(row.vacant_5),
            vacancy_9_10: toNumber(row.vacant_6),
            vacancy_under_8: toNumber(row.vacant_7),
            vacancy_total: toNumber(row.vacant_total),

            remark: toText(row.note),
            log: toText(row.TransactionDesc),
            _poolRsFlag: toNumber(row.PoolRsFlag),
            _bgNo: toText(row.BGNo),
        };
    });
};

const generateColumns = (
    prefix: string,
    themeColor: string,
    summaryColorClass: string,
    includeContract = false,
    includeSubContract = false,
    totalHeaderClass = 'bg-yellow-200! text-yellow-900! font-bold',
    totalCellClass = 'bg-yellow-50! font-bold text-gray-900'
) => {
    const cols: ColumnsType<Report3DataType> = [];
    const getCellProps = (record: Report3DataType, isTotalCol: boolean) => {
        if (record.key === 'TOTAL_SUMMARY') {
            return { className: `${summaryColorClass} font-bold text-gray-900 border-t-2! border-t-gray-300!` };
        }
        if (isTotalCol) {
            return { className: `${totalCellClass} font-semibold` };
        }
        return { className: 'bg-white' };
    };

    levelKeys.forEach((key, index) => {
        const isTotalCol = key === 'total';

        cols.push({
            title: levelLabels[index],
            dataIndex: `${prefix}_${key}`,
            key: `${prefix}_${key}`,
            width: isTotalCol ? 70 : 60,
            align: 'center',
            className: isTotalCol ? `${totalCellClass} font-semibold` : '',
            onHeaderCell: () => ({
                className: isTotalCol ? totalHeaderClass : `${themeColor} text-gray-700`,
            }),
            render: renderNumber,
            onCell: (record: Report3DataType) => getCellProps(record, isTotalCol),
        });
    });

    if (includeContract) {
        cols.push({
            title: 'Contract',
            dataIndex: `${prefix}_contract`,
            key: `${prefix}_contract`,
            width: 70,
            align: 'center',
            onHeaderCell: () => ({ className: `${themeColor} font-bold` }),
            render: renderNumber,
            onCell: (record: Report3DataType) => getCellProps(record, false),
        });
    }

    if (includeSubContract) {
        cols.push({
            title: 'Contract สัญญาย่อย',
            dataIndex: `${prefix}_sub_contract`,
            key: `${prefix}_sub_contract`,
            width: 80,
            align: 'center',
            onHeaderCell: () => ({ className: `${themeColor} font-bold` }),
            render: renderNumber,
            onCell: (record: Report3DataType) => getCellProps(record, false),
        });
    }

    return cols;
};


export default function Report3Page() {
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<string[]>(defaultCheckedList);
    const [form] = Form.useForm<SearchFormValues>();

    const [allData, setAllData] = useState<Report3DataType[]>([]);
    const [dateValue, setDateValue] = useState<Dayjs>(dayjs());
    const [hasSearched, setHasSearched] = useState(false);

    const [businessUnitOptions, setBusinessUnitOptions] = useState<FilterOption[]>([]);
    const [lineOfWorkOptions, setLineOfWorkOptions] = useState<FilterOption[]>([]);
    const [orgUnitOptions, setOrgUnitOptions] = useState<FilterOption[]>([]);

    const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);
    const [selectedLinesOfWork, setSelectedLinesOfWork] = useState<string[]>([]);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetValues);

    const [appliedFilters, setAppliedFilters] = useState({
        businessUnits: [] as string[],
        orgUnits: [] as string[],
        linesOfWork: [] as string[],
        datasets: datasetValues,
    });

    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [fullscreenTableHeight, setFullscreenTableHeight] = useState(600);
    const [horizontalScrollState, setHorizontalScrollState] = useState({
        hasOverflow: false,
        canScrollLeft: false,
        canScrollRight: false,
    });

    const updateFullscreenTableHeight = useCallback(() => {
        if (!tableContainerRef.current) return;
        const rect = tableContainerRef.current.getBoundingClientRect();
        // Reserve space for app/menu header + search area + table chrome to avoid outer scrollbar.
        const availableHeight = Math.floor(window.innerHeight - rect.top - 120);
        setFullscreenTableHeight(Math.max(260, availableHeight));
    }, []);

    const collectScrollCandidates = useCallback((axis: 'x' | 'y') => {
        const root = tableContainerRef.current;
        if (!root) return [] as HTMLElement[];

        const selectors = [
            '.ant-table-body',
            '.ant-table-content',
            '.ant-table-header',
            '.ant-table-container',
            '.ant-table-sticky-scroll',
            '.ant-table-sticky-scroll-bar',
            '.rc-virtual-list-holder',
            '.rc-virtual-list-holder-inner',
            '.ant-table-tbody-virtual-holder',
            '.ant-table-tbody',
        ];

        const candidates: HTMLElement[] = [root];
        const descendants = Array.from(root.querySelectorAll<HTMLElement>('*'));

        selectors.forEach((selector) => {
            const found = root.querySelectorAll<HTMLElement>(selector);
            found.forEach((element) => {
                if (!candidates.includes(element)) candidates.push(element);
            });
        });

        descendants.forEach((element) => {
            const scrollSize = axis === 'x'
                ? element.scrollWidth - element.clientWidth
                : element.scrollHeight - element.clientHeight;

            if (scrollSize > 4 && !candidates.includes(element)) {
                candidates.push(element);
            }
        });

        return candidates;
    }, []);

    const getHorizontalScrollTargets = useCallback(() => {
        const candidates = collectScrollCandidates('x');
        const scrollables = candidates.filter((element) => element.scrollWidth - element.clientWidth > 4);
        return scrollables.length ? scrollables : candidates;
    }, [collectScrollCandidates]);

    const getHorizontalTargetPriority = useCallback((element: HTMLElement) => {
        const className = element.className || '';
        if (className.includes('ant-table-body')) return 0;
        if (className.includes('rc-virtual-list-holder')) return 1;
        if (className.includes('ant-table-content')) return 2;
        if (className.includes('ant-table-header')) return 3;
        if (className.includes('ant-table-sticky-scroll')) return 4;
        return 5;
    }, []);

    const updateHorizontalScrollState = useCallback(
        () => {
            const targets = getHorizontalScrollTargets().filter(
                (element) => element.scrollWidth - element.clientWidth > 4
            );

            if (!targets.length) {
                setHorizontalScrollState((prev) => {
                    if (!prev.hasOverflow && !prev.canScrollLeft && !prev.canScrollRight) return prev;
                    return { hasOverflow: false, canScrollLeft: false, canScrollRight: false };
                });
                return;
            }

            const source = [...targets].sort((a, b) => getHorizontalTargetPriority(a) - getHorizontalTargetPriority(b))[0];
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
        [getHorizontalScrollTargets, getHorizontalTargetPriority]
    );

    const getVerticalScrollCandidates = useCallback(() => {
        const candidates = collectScrollCandidates('y');
        const scrollables = candidates.filter((element) => element.scrollHeight - element.clientHeight > 4);
        return scrollables.length ? scrollables : candidates;
    }, [collectScrollCandidates]);

    const syncHorizontalScroll = useCallback(
        () => {
            const targets = getHorizontalScrollTargets().filter(
                (element) => element.scrollWidth - element.clientWidth > 4
            );

            if (!targets.length) {
                return;
            }

            const source = [...targets].sort((a, b) => getHorizontalTargetPriority(a) - getHorizontalTargetPriority(b))[0];
            const desired = source?.scrollLeft ?? 0;

            targets.forEach((target) => {
                const maxScrollLeft = Math.max(0, target.scrollWidth - target.clientWidth);
                const next = Math.min(maxScrollLeft, Math.max(0, desired));

                if (Math.abs(target.scrollLeft - next) > 1) {
                    target.scrollLeft = next;
                    target.scrollTo({ left: next, behavior: 'auto' });
                }
            });

            updateHorizontalScrollState();
        },
        [getHorizontalScrollTargets, getHorizontalTargetPriority, updateHorizontalScrollState]
    );

    const handleHorizontalScroll = useCallback(
        (direction: 'left' | 'right') => {
            const targets = getHorizontalScrollTargets();
            const distance = direction === 'left' ? -600 : 600;

            const scrollables = targets.filter((target) => target.scrollWidth - target.clientWidth > 4);
            if (!scrollables.length) {
                return;
            }

            const source = [...scrollables].sort(
                (a, b) => getHorizontalTargetPriority(a) - getHorizontalTargetPriority(b)
            )[0];
            const sourceMax = source ? Math.max(0, source.scrollWidth - source.clientWidth) : 0;
            const sourceCurrent = source?.scrollLeft ?? 0;
            const desired = Math.min(sourceMax, Math.max(0, sourceCurrent + distance));

            scrollables.forEach((target) => {
                const maxScrollLeft = Math.max(0, target.scrollWidth - target.clientWidth);
                const next = Math.min(maxScrollLeft, desired);

                target.scrollLeft = next;
                target.scrollTo({ left: next, behavior: 'auto' });
            });

            window.requestAnimationFrame(() => {
                syncHorizontalScroll();
            });
        },
        [getHorizontalScrollTargets, getHorizontalTargetPriority, syncHorizontalScroll]
    );

    const handleVerticalScroll = useCallback(
        (direction: 'top' | 'bottom') => {
            const candidates = getVerticalScrollCandidates();

            const scrollables = candidates.filter(
                (element) => element.scrollHeight - element.clientHeight > 4
            );

            if (!scrollables.length) {
                return;
            }

            const applyEdgeScroll = () => {
                scrollables.forEach((element) => {
                    const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
                    const next = direction === 'top' ? 0 : maxScrollTop;

                    element.scrollTop = next;
                    element.scrollTo({ top: next, behavior: 'auto' });
                });

                // Keep sticky/fixed header and body aligned on x-axis after y-axis jumps.
                syncHorizontalScroll();
            };

            applyEdgeScroll();
            window.requestAnimationFrame(() => {
                applyEdgeScroll();
                window.requestAnimationFrame(() => {
                    applyEdgeScroll();
                });
            });
        },
        [getVerticalScrollCandidates, syncHorizontalScroll]
    );

    const fetchFilterOptions = useCallback(
        async (effectiveDate: Dayjs, bgNo = '', division = '') => {
            const { employeeId, userGroupNo } = resolveUserContext();

            try {
                const query = new URLSearchParams({
                    effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                    employeeId,
                    userGroupNo,
                });

                if (bgNo) query.set('bgNo', bgNo);
                if (division) query.set('division', division);

                const res = await fetch(`/api/report/report3/filters?${query.toString()}`);
                let payload: Report3FilterResponse | null = null;
                try {
                    payload = await res.json();
                } catch {
                    payload = null;
                }

                if (!res.ok || !payload || payload.status !== 200 || !payload.data) {
                    console.error('Invalid report3 filters response:', {
                        status: res.status,
                        payload
                    });
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
                console.error('Failed to fetch report3 filters:', error);
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

    const fetchReportData = useCallback(async (effectiveDate: Dayjs, bgNo = '', division = '', orgUnitNo = '') => {
        const { employeeId, userGroupNo } = resolveUserContext();

        setLoading(true);
        try {
            const query = new URLSearchParams({
                effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo,
                reportType: '0',
            });
            if (bgNo) query.set('bgNo', bgNo);
            if (division) query.set('division', division);
            if (orgUnitNo) query.set('orgUnitNo', orgUnitNo);

            const res = await fetch(`/api/report/report3?${query.toString()}`);
            const payload: Report3ApiResponse = await res.json();

            if (!res.ok || payload.status !== 200 || !payload.data) {
                throw new Error(payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            const rows = transformRows(payload.data);
            setAllData(rows);
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch report3 data:', error);
            setAllData([]);
            setHasSearched(true);
            alert('ไม่สามารถดึงข้อมูลรายงานได้');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchFilterOptions(dateValue, '', '');
    }, [dateValue, fetchFilterOptions]);

    const onSearch = async (values: SearchFormValues) => {
        const nextDate = values.date || dateValue;
        setDateValue(nextDate);

        setAppliedFilters({
            businessUnits: [...selectedBusinessUnits],
            orgUnits: [...selectedOrgUnits],
            linesOfWork: [...selectedLinesOfWork],
            datasets: [...selectedDatasets],
        });

        await fetchReportData(nextDate, '', '', '');
    };

    const onDateChange = (date: Dayjs | null) => {
        const nextDate = date || dayjs();
        setDateValue(nextDate);
        form.setFieldValue('date', nextDate);
    };

    const onBusinessChange = (values: string[]) => {
        setSelectedBusinessUnits(values);
    };

    const onLineChange = (values: string[]) => {
        setSelectedLinesOfWork(values);
    };

    const onUnitChange = (values: string[]) => {
        setSelectedOrgUnits(values);
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await fullscreenRef.current?.requestFullscreen();
            setIsFullscreen(true);
            requestAnimationFrame(updateFullscreenTableHeight);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handler = () => {
            const active = Boolean(document.fullscreenElement);
            setIsFullscreen(active);
            if (active) requestAnimationFrame(updateFullscreenTableHeight);
        };

        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, [updateFullscreenTableHeight]);

    useEffect(() => {
        if (!hasSearched) return;
        updateFullscreenTableHeight();

        const onResize = () => updateFullscreenTableHeight();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [hasSearched, isFullscreen, checkedList, allData.length, updateFullscreenTableHeight]);

    const filteredData = useMemo(() => {
        const { businessUnits, orgUnits, linesOfWork, datasets } = appliedFilters;


        const activePoolFlags = new Set<number>();
        if (datasets.includes('ปกติ')) activePoolFlags.add(0);
        if (datasets.includes('PoolRS')) activePoolFlags.add(1);
        if (datasets.includes('Sec Pool')) activePoolFlags.add(2);

        return allData.filter((item) => {
            const poolFlag = item._poolRsFlag ?? -1;
            const isBgMatch = businessUnits.length === 0 || businessUnits.includes(String(item._bgNo || ''));
            const isLineMatch = linesOfWork.length === 0 || linesOfWork.includes(String(item.line_of_work || ''));
            const isUnitMatch = orgUnits.length === 0 || orgUnits.includes(String(item.unit_code || ''));
            return (
                activePoolFlags.has(poolFlag) &&
                isBgMatch &&
                isLineMatch &&
                isUnitMatch
            );
        });
    }, [allData, appliedFilters]);

    const tableDataWithSummary = useMemo(() => {
        if (filteredData.length === 0) return [];

        const totalRow: Report3DataType = {
            key: 'TOTAL_SUMMARY',
            unit_short: '',
            unit_code: '',
            unit_name: 'รวมทั้งสิ้น (Grand Total)',
            line_of_work: '',
            level: '',
            business_unit: '',
            type: '',
            stg_non: '',
            sup_bus: '',
            specific: '',
            remark: '',
            log: '',
        };

        filteredData.forEach((item) => {
            Object.keys(item).forEach((key) => {
                if (key.startsWith('_')) return;
                const value = (item as Record<string, unknown>)[key];
                if (typeof value === 'number') {
                    const current = (totalRow as Record<string, unknown>)[key];
                    (totalRow as Record<string, unknown>)[key] = toNumber(current) + value;
                }
            });
        });

        return [...filteredData, totalRow];
    }, [filteredData]);

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
        checkedList,
        tableDataWithSummary.length,
        updateHorizontalScrollState,
    ]);

    useEffect(() => {
        if (!hasSearched) return;

        const targets = getHorizontalScrollTargets().filter(
            (element) => element.scrollWidth - element.clientWidth > 4
        );

        const handleNativeScroll = () => {
            updateHorizontalScrollState();
        };

        targets.forEach((target) => {
            target.addEventListener('scroll', handleNativeScroll, { passive: true });
        });
        window.addEventListener('resize', handleNativeScroll);
        handleNativeScroll();

        return () => {
            targets.forEach((target) => target.removeEventListener('scroll', handleNativeScroll));
            window.removeEventListener('resize', handleNativeScroll);
        };
    }, [
        checkedList,
        getHorizontalScrollTargets,
        hasSearched,
        isFullscreen,
        tableDataWithSummary.length,
        updateHorizontalScrollState,
    ]);

    const handleExportExcel = async () => {
        if (tableDataWithSummary.length === 0) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report 03');
        const colors = {
            blueHeader: 'FFBFDBFE',
            blueSub: 'FFF0F9FF',
            blueTotal: 'FFEFF6FF',
            orangeHeader: 'FFFED7AA',
            orangeSub: 'FFFFF7ED',
            orangeTotal: 'FFFFF7ED',
            purpleHeader: 'FFE9D5FF',
            purpleSub: 'FFFAF5FF',
            purpleTotal: 'FFFAF5FF',
            indigoHeader: 'FFC7D2FE',
            indigoSub: 'FFEEF2FF',
            indigoTotal: 'FFEEF2FF',
            greenHeader: 'FFBBF7D0',
            greenSub: 'FFF0FDF4',
            redHeader: 'FFFECACA',
            redSub: 'FFFEF2F2',
            redTotal: 'FFFEF2F2',
            grayHeader: 'FFE5E7EB',
            graySummary: 'FFF3F4F6',
            grayBorder: 'FFD1D5DB',
            blueSummary: 'FFDBEAFE',
            orangeSummary: 'FFFFEDD5',
            purpleSummary: 'FFF3E8FF',
            indigoSummary: 'FFE0E7FF',
            greenSummary: 'FFDCFCE7',
            redSummary: 'FFFEE2E2',
        };

        const headersRow1: string[] = [];
        const headersRow2: string[] = [];
        const dataKeys: string[] = [];

        const addGroup = (title: string, prefix: string, includeContract = false, includeSubContract = false) => {
            const subCols: { title: string; key: string }[] = [];
            levelKeys.forEach((k, i) => subCols.push({ title: levelLabels[i], key: `${prefix}_${k}` }));
            if (includeContract) subCols.push({ title: 'Contract', key: `${prefix}_contract` });
            if (includeSubContract) subCols.push({ title: 'Sub-contract', key: `${prefix}_sub_contract` });

            headersRow1.push(title);
            for (let i = 1; i < subCols.length; i++) headersRow1.push('');
            subCols.forEach((col) => {
                headersRow2.push(col.title);
                dataKeys.push(col.key);
            });
        };

        const basicCols = [
            { title: 'ชื่อย่อ', key: 'unit_short' },
            { title: 'รหัส', key: 'unit_code' },
            { title: 'ชื่อเต็ม', key: 'unit_name' },
            { title: 'สายงาน', key: 'line_of_work' },
            { title: 'ระดับ', key: 'level' },
            { title: 'หน่วยธุรกิจ', key: 'business_unit' },
            { title: 'ประเภท', key: 'type' },
            { title: 'Stg./Non', key: 'stg_non' },
            { title: 'Sup./Bus.', key: 'sup_bus' },
            { title: 'อัตราเฉพาะตัว', key: 'specific' },
        ];

        let basicInfoCount = 0;
        basicCols.forEach((col) => {
            if (checkedList.includes(col.key)) {
                headersRow1.push(col.title);
                headersRow2.push('');
                dataKeys.push(col.key);
                basicInfoCount += 1;
            }
        });

        if (checkedList.includes('frame')) addGroup('กรอบอัตรากำลัง ในระบบ SAP', 'frame', true, true);
        if (checkedList.includes('people')) addGroup('จำนวนคน', 'people');
        if (checkedList.includes('line')) addGroup('Line', 'line');
        if (checkedList.includes('staff')) addGroup('Staff', 'staff');

        if (checkedList.includes('recruit')) {
            headersRow1.push('สรรหา');
            headersRow2.push('');
            dataKeys.push('recruit_total');
        }

        if (checkedList.includes('vacancy')) addGroup('ว่าง', 'vacancy');

        if (checkedList.includes('remark')) {
            headersRow1.push('หมายเหตุ');
            headersRow2.push('');
            dataKeys.push('remark');
        }

        if (checkedList.includes('log')) {
            headersRow1.push('Log');
            headersRow2.push('');
            dataKeys.push('log');
        }

        const row1 = worksheet.addRow(headersRow1);
        const row2 = worksheet.addRow(headersRow2);

        let colIndex = 1;
        for (let i = 0; i < basicInfoCount; i++) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colors.grayHeader },
            };
            colIndex += 1;
        }

        const styleGroup = (
            count: number,
            headerColor: string,
            subColor: string,
            totalColor: string
        ) => {
            worksheet.mergeCells(1, colIndex, 1, colIndex + count - 1);
            const headerCell = worksheet.getCell(1, colIndex);
            headerCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerColor },
            };
            headerCell.alignment = { horizontal: 'center', vertical: 'middle' };

            for (let i = 0; i < count; i++) {
                const subCell = worksheet.getCell(2, colIndex + i);
                subCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: headersRow2[colIndex + i - 1] === 'รวม' ? totalColor : subColor },
                };
                subCell.alignment = { horizontal: 'center' };
            }

            colIndex += count;
        };

        if (checkedList.includes('frame')) styleGroup(10, colors.blueHeader, colors.blueSub, colors.blueHeader);
        if (checkedList.includes('people')) styleGroup(8, colors.orangeHeader, colors.orangeSub, colors.orangeHeader);
        if (checkedList.includes('line')) styleGroup(8, colors.purpleHeader, colors.purpleSub, colors.purpleHeader);
        if (checkedList.includes('staff')) styleGroup(8, colors.indigoHeader, colors.indigoSub, colors.indigoHeader);

        if (checkedList.includes('recruit')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colors.greenHeader },
            };
            colIndex += 1;
        }

        if (checkedList.includes('vacancy')) styleGroup(8, colors.redHeader, colors.redSub, colors.redHeader);

        if (checkedList.includes('remark')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colors.grayHeader },
            };
            colIndex += 1;
        }

        if (checkedList.includes('log')) {
            worksheet.mergeCells(1, colIndex, 2, colIndex);
            worksheet.getCell(1, colIndex).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colors.grayHeader },
            };
            colIndex += 1;
        }

        [row1, row2].forEach((row) => {
            row.eachCell((cell) => {
                cell.font = { bold: true, name: 'Sarabun', size: 10 };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' },
                    bottom: { style: 'thin' },
                };
            });
        });

        tableDataWithSummary.forEach((item) => {
            const rowValues = dataKeys.map((key) => {
                const value = (item as Record<string, unknown>)[key];
                if (typeof value === 'number') return value;
                if (value === undefined || value === null || value === '') {
                    if (
                        key.startsWith('frame_') ||
                        key.startsWith('people_') ||
                        key.startsWith('line_') ||
                        key.startsWith('staff_') ||
                        key.startsWith('recruit_') ||
                        key.startsWith('vacancy_')
                    ) {
                        return 0;
                    }
                    return '';
                }
                return value;
            });

            const row = worksheet.addRow(rowValues);

            if (item.key === 'TOTAL_SUMMARY') {
                row.eachCell((cell, colNumber) => {
                    const key = dataKeys[colNumber - 1] || '';
                    let fillColor = colors.graySummary;

                    if (key.startsWith('frame_')) fillColor = colors.blueSummary;
                    else if (key.startsWith('people_')) fillColor = colors.orangeSummary;
                    else if (key.startsWith('line_')) fillColor = colors.purpleSummary;
                    else if (key.startsWith('staff_')) fillColor = colors.indigoSummary;
                    else if (key.startsWith('recruit_')) fillColor = colors.greenSummary;
                    else if (key.startsWith('vacancy_')) fillColor = colors.redSummary;

                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    cell.font = { bold: true, name: 'Sarabun', size: 10 };
                    cell.border = {
                        top: { style: 'medium', color: { argb: colors.grayBorder } },
                        left: { style: 'thin' },
                        right: { style: 'thin' },
                        bottom: { style: 'thin' },
                    };
                });
            } else {
                row.eachCell((cell, colNumber) => {
                    const key = dataKeys[colNumber - 1] || '';
                    let fillColor: string | null = null;

                    if (key === 'frame_total') fillColor = colors.blueTotal;
                    else if (key === 'people_total') fillColor = colors.orangeTotal;
                    else if (key === 'line_total') fillColor = colors.purpleTotal;
                    else if (key === 'staff_total') fillColor = colors.indigoTotal;
                    else if (key === 'recruit_total') fillColor = colors.greenSub;
                    else if (key === 'vacancy_total') fillColor = colors.redTotal;

                    if (fillColor) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    }

                    cell.font = { name: 'Sarabun', size: 10 };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' },
                        bottom: { style: 'thin' },
                    };
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        await saveExcelFile(blob, `รายงานสรุปกรอบอัตรากำลังประจำเดือนของหน่วยงาน (ตามกลุ่มระดับ)_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const columns: ColumnsType<Report3DataType> = useMemo(() => {
        const isShow = (key: string) => checkedList.includes(key);
        const getBasicCellProps = (record: Report3DataType) =>
            record.key === 'TOTAL_SUMMARY'
                ? { className: 'bg-gray-100! font-bold text-gray-900 border-t-2! border-t-gray-300!' }
                : { className: 'bg-white' };

        return [
            ...(isShow('unit_short')
                ? [
                      {
                          title: 'ชื่อย่อ',
                          dataIndex: 'unit_short',
                          key: 'unit_short',
                          width: 100,
                          fixed: 'left' as const,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('unit_code')
                ? [
                      {
                          title: 'รหัส',
                          dataIndex: 'unit_code',
                          key: 'unit_code',
                          width: 90,
                          fixed: 'left' as const,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('unit_name')
                ? [
                      {
                          title: 'ชื่อเต็มหน่วยงาน',
                          dataIndex: 'unit_name',
                          key: 'unit_name',
                          width: 280,
                          ellipsis: true,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('line_of_work')
                ? [
                      {
                          title: 'สายงาน',
                          dataIndex: 'line_of_work',
                          key: 'line_of_work',
                          width: 140,
                          align: 'center' as const,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('level')
                ? [
                      {
                          title: 'ระดับ',
                          dataIndex: 'level',
                          key: 'level',
                          width: 90,
                          align: 'center' as const,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('business_unit')
                ? [
                      {
                          title: 'หน่วยธุรกิจ',
                          dataIndex: 'business_unit',
                          key: 'business_unit',
                          width: 120,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('type')
                ? [
                      {
                          title: 'ประเภท',
                          dataIndex: 'type',
                          key: 'type',
                          width: 100,
                          align: 'center' as const,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('stg_non')
                ? [
                      {
                          title: 'Stg./Non',
                          dataIndex: 'stg_non',
                          key: 'stg_non',
                          width: 110,
                          align: 'center' as const,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('sup_bus')
                ? [
                      {
                          title: 'Sup./Bus.',
                          dataIndex: 'sup_bus',
                          key: 'sup_bus',
                          width: 100,
                          align: 'center' as const,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('specific')
                ? [
                      {
                          title: 'อัตราเฉพาะตัว',
                          dataIndex: 'specific',
                          key: 'specific',
                          width: 100,
                          align: 'center' as const,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),

            ...(isShow('frame')
                ? [
                      {
                          title: 'กรอบอัตรากำลัง ในระบบ SAP',
                          className: 'bg-blue-200! text-blue-900 font-bold text-center',
                          children: generateColumns(
                              'frame',
                              'bg-blue-50!',
                              'bg-blue-100!',
                              true,
                              true,
                              'bg-blue-200! text-blue-900! font-bold',
                              'bg-blue-50! text-blue-900!'
                          ),
                      },
                  ]
                : []),

            ...(isShow('people')
                ? [
                      {
                          title: 'จำนวนคน',
                          className: 'bg-orange-200! text-orange-900 font-bold text-center',
                          children: generateColumns(
                              'people',
                              'bg-orange-50!',
                              'bg-orange-100!',
                              false,
                              false,
                              'bg-orange-200! text-orange-900! font-bold',
                              'bg-orange-50! text-orange-900!'
                          ),
                      },
                  ]
                : []),

            ...(isShow('line')
                ? [
                      {
                          title: 'Line',
                          className: 'bg-purple-200! text-purple-900 font-bold text-center',
                          children: generateColumns(
                              'line',
                              'bg-purple-50!',
                              'bg-purple-100!',
                              false,
                              false,
                              'bg-purple-200! text-purple-900! font-bold',
                              'bg-purple-50! text-purple-900!'
                          ),
                      },
                  ]
                : []),

            ...(isShow('staff')
                ? [
                      {
                          title: 'Staff',
                          className: 'bg-indigo-200! text-indigo-900 font-bold text-center',
                          children: generateColumns(
                              'staff',
                              'bg-indigo-50!',
                              'bg-indigo-100!',
                              false,
                              false,
                              'bg-indigo-200! text-indigo-900! font-bold',
                              'bg-indigo-50! text-indigo-900!'
                          ),
                      },
                  ]
                : []),

            ...(isShow('recruit')
                ? [
                      {
                          title: 'สรรหา',
                          dataIndex: 'recruit_total',
                          key: 'recruit_total',
                          width: 100,
                          align: 'center' as const,
                          onHeaderCell: () => ({ className: 'bg-green-200! text-green-900 font-bold text-center' }),
                          render: renderNumber,
                          onCell: (record: Report3DataType) =>
                              record.key === 'TOTAL_SUMMARY'
                                  ? {
                                        className:
                                            'bg-green-100! font-bold text-gray-900 border-t-2! border-t-gray-300!',
                                    }
                                  : { className: 'bg-green-50!' },
                      },
                  ]
                : []),

            ...(isShow('vacancy')
                ? [
                      {
                          title: 'ว่าง',
                          className: 'bg-red-200! text-red-900 font-bold text-center',
                          children: generateColumns(
                              'vacancy',
                              'bg-red-50!',
                              'bg-red-100!',
                              false,
                              false,
                              'bg-red-200! text-red-900! font-bold',
                              'bg-red-50! text-red-900!'
                          ),
                      },
                  ]
                : []),

            ...(isShow('remark')
                ? [
                      {
                          title: 'หมายเหตุ',
                          dataIndex: 'remark',
                          key: 'remark',
                          width: 240,
                          ellipsis: true,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          render: (text: string) => <span className="text-xs whitespace-pre-wrap">{text}</span>,
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
            ...(isShow('log')
                ? [
                      {
                          title: 'Log',
                          dataIndex: 'log',
                          key: 'log',
                          width: 240,
                          ellipsis: true,
                          onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-900! font-bold' }),
                          render: (text: string) => <span className="text-xs whitespace-pre-wrap">{text}</span>,
                          onCell: getBasicCellProps,
                      },
                  ]
                : []),
        ];
    }, [checkedList]);

    return (
        <Main currentPath="/report">
            <div
                ref={fullscreenRef}
                className={`w-full min-w-0 ${
                    isFullscreen
                        ? 'h-screen overflow-hidden bg-gray-50 p-4 flex flex-col gap-4'
                        : 'space-y-6'
                }`}
            >
                {!isFullscreen && (
                    <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md border border-blue-500 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="text-2xl text-blue-100" />
                                <h1 className="text-2xl font-bold m-0 text-white">Report 03</h1>
                                <span className="hidden md:inline-block text-blue-100">|</span>
                                <span className="text-xl font-medium text-blue-50">
                                    รายงานสรุปกรอบอัตรากำลังประจำเดือนของหน่วยงาน (ตามกลุ่มระดับ)
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 ${
                        isFullscreen ? 'shrink-0' : 'sticky top-0 z-[100]'
                    }`}
                >
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={onSearch}
                        initialValues={{ date: dateValue }}
                        className="flex items-center gap-2"
                    >
                        <Form.Item name="date" label="วันที่" className="m-0">
                            <DatePicker format="DD/MM/YYYY" className="w-36" onChange={onDateChange} />
                        </Form.Item>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยธุรกิจ</label>
                            <MultiSelectFilter
                                label="เลือกหน่วยธุรกิจ"
                                options={businessUnitOptions}
                                selectedValues={selectedBusinessUnits}
                                onChange={onBusinessChange}
                                width="w-52"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">สายงาน</label>
                            <MultiSelectFilter
                                label="เลือกสายงาน"
                                options={lineOfWorkOptions}
                                selectedValues={selectedLinesOfWork}
                                onChange={onLineChange}
                                width="w-52"
                            />
                        </div>

                        <div className="flex items-center gap-2 z-9999">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยงาน</label>
                            <MultiSelectFilter
                                label="เลือกหน่วยงาน"
                                options={orgUnitOptions}
                                selectedValues={selectedOrgUnits}
                                onChange={onUnitChange}
                                width="w-60"
                                className="z-9999"
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

                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                            ค้นหา
                        </Button>
                    </Form>

                    {hasSearched && (
                        <div className="flex items-center gap-2">
                            <Button
                                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                                onClick={toggleFullscreen}
                                className={`border-none! shadow-sm! text-white! ${
                                    isFullscreen ? 'bg-red-500! hover:bg-red-600!' : 'bg-blue-500! hover:bg-blue-600!'
                                }`}
                            >
                                {isFullscreen ? 'ปิดเต็มจอ' : 'เต็มจอ'}
                            </Button>

                            <Button
                                icon={<FileExcelOutlined />}
                                onClick={handleExportExcel}
                                className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
                                disabled={tableDataWithSummary.length === 0}
                            >
                                Excel
                            </Button>

                            <Popover
                                placement="bottomLeft"
                                trigger="click"
                                content={
                                    <div className="w-64 max-h-96 overflow-y-auto">
                                        <div className="mb-2 font-bold text-gray-700 border-b pb-1">เลือกแสดงกลุ่มข้อมูล</div>
                                        <Checkbox.Group
                                            options={columnOptions}
                                            value={checkedList}
                                            onChange={(values) => setCheckedList(values as string[])}
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
                    <div
                        className={`bg-white rounded-lg shadow-sm border border-gray-100 relative z-10 ${
                            isFullscreen ? 'mt-0 flex-1 min-h-0' : 'mt-4'
                        }`}
                    >
                        <div className={`relative group/table ${isFullscreen ? 'h-full' : ''}`}>
                            {horizontalScrollState.hasOverflow && (
                                <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-40 invisible opacity-0 transition-opacity duration-150 group-hover/table:visible group-hover/table:opacity-100">
                                    {horizontalScrollState.canScrollLeft && (
                                        <button
                                            onClick={() => handleHorizontalScroll('left')}
                                            className="pointer-events-auto absolute -left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white text-gray-700 shadow-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center cursor-pointer"
                                            aria-label="Scroll Left"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                    )}
                                    {horizontalScrollState.canScrollRight && (
                                        <button
                                            onClick={() => handleHorizontalScroll('right')}
                                            className="pointer-events-auto absolute -right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white text-gray-700 shadow-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center cursor-pointer"
                                            aria-label="Scroll Right"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Vertical Scroll Buttons (Bottom Right) */}
                            <div className="pointer-events-none absolute bottom-6 right-6 flex flex-col gap-2 z-50 invisible opacity-0 transition-opacity duration-150 group-hover/table:visible group-hover/table:opacity-100">
                                {/* Scroll to Top */}
                                <button
                                    onClick={() => handleVerticalScroll('top')}
                                    className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg border border-blue-500 rounded-full p-3 flex items-center justify-center cursor-pointer"
                                    aria-label="Scroll to Top"
                                    title="ขึ้นบนสุด"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
                                </button>

                                {/* Scroll to Bottom */}
                                <button
                                    onClick={() => handleVerticalScroll('bottom')}
                                    className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg border border-blue-500 rounded-full p-3 flex items-center justify-center cursor-pointer"
                                    aria-label="Scroll to Bottom"
                                    title="ลงล่างสุด (เพื่อดูยอดรวม)"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                                </button>
                            </div>

                            <div
                                ref={tableContainerRef}
                                className={`${
                                    isFullscreen
                                        ? 'h-full min-h-0 overflow-hidden'
                                        : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-7.2rem)] overflow-x-auto overflow-y-hidden'
                                } scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100`}
                            >
                                <Table
                                    columns={columns}
                                    dataSource={tableDataWithSummary}
                                    loading={loading}
                                    bordered
                                    size="small"
                                    scroll={{ x: 3200, y: fullscreenTableHeight }}
                                    pagination={false}
                                    sticky={{ offsetHeader: isFullscreen ? 0 : 0 }}
                                    virtual
                                    rowKey="key"
                                    className="[&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!
                                           /* Custom Scrollbar Styling for Table Body */
                                           [&_.ant-table-body]:scrollbar-auto
                                           [&_.ant-table-body::-webkit-scrollbar]:w-3
                                           [&_.ant-table-body::-webkit-scrollbar]:h-3
                                           [&_.ant-table-body::-webkit-scrollbar-thumb]:bg-gray-500
                                           [&_.ant-table-body::-webkit-scrollbar-thumb]:rounded-full
                                           [&_.ant-table-body::-webkit-scrollbar-thumb:hover]:bg-gray-700
                                           [&_.ant-table-body::-webkit-scrollbar-track]:bg-gray-200
                                           /* Horizontal Scrollbar specifically */
                                           [&_.ant-table-content]:scrollbar-auto
                                           [&_.ant-table-content::-webkit-scrollbar]:h-3
                                           [&_.ant-table-content::-webkit-scrollbar-thumb]:bg-gray-500
                                           [&_.ant-table-content::-webkit-scrollbar-track]:bg-gray-200"
                                    rowClassName={(record) =>
                                        record.key === 'TOTAL_SUMMARY' ? 'font-bold' : 'bg-white'
                                    }
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Main>
    );
}
