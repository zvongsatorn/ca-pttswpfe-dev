'use client';

import { buildSafeRoutePathFromSearch } from '@/utils/security';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Checkbox, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    SearchOutlined,
    FileExcelOutlined,
    SettingOutlined,
    SwapOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
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
    children?: DataType[];
    [key: string]: CellValue | DataType[] | undefined;
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

    SpecFlag?: number | string;
    specflag?: number | string;
    spec_flag?: number | string;
    SpecFlagName?: string;
    specflagname?: string;

    remark?: string;
}

interface Report2ApiResponse {
    status: number;
    data?: Report2RawRow[];
    message?: string;
}

interface Report2FilterItem {
    BGNo?: string;
    BGName?: string;
}

interface Report2FilterResponse {
    status: number;
    data?: {
        businessUnits: Report2FilterItem[];
    };
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
    { label: 'Contact Out สัญญาใหญ่', value: 'contact_out' },
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
                                    style={fixedCheckboxStyle}
                                    className={`shrink-0 rounded border mr-2 flex items-center justify-center ${
                                        selectedValues.length === options.length && options.length > 0
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {selectedValues.length === options.length && options.length > 0 && (
                                        <Check className="h-3 w-3 shrink-0 text-white" />
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
                                    style={fixedCheckboxStyle}
                                    className={`shrink-0 rounded border mr-2 flex items-center justify-center transition-colors ${
                                        selectedValues.includes(option)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {selectedValues.includes(option) && <Check className="h-3 w-3 shrink-0 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700 truncate min-w-0 flex-1" title={option}>
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

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
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

const resolveSpecFlag = (row: Report2RawRow): 0 | 1 | null => {
    const raw = row as unknown as Record<string, unknown>;
    const candidates = [
        raw.SpecFlag,
        raw.specflag,
        raw.spec_flag,
    ];

    for (const candidate of candidates) {
        const num = Number(candidate);
        if (num === 0 || num === 1) return num as 0 | 1;
    }

    const specFlagName = String(raw.SpecFlagName ?? raw.specflagname ?? '').trim();
    if (specFlagName.includes('ไม่เป็น')) return 0;
    if (specFlagName.includes('เป็น')) return 1;

    return null;
};

const createEmptyMetricRow = (key: string, unit: string, unitGroup: string, rowKind: string): DataType => ({
    key,
    unit,
    unit_group: unitGroup,
    row_kind: rowKind,
});

const transformRows = (rawRows: Report2RawRow[], monthKeys: string[]) => {
    const monthKeySet = new Set(monthKeys);
    const byUnitAndSpec = new Map<string, DataType>();
    const orderedKeys: string[] = [];
    let hasSpecFlagDimension = false;

    rawRows.forEach((row) => {
        const monthKey = extractMonthKey(row);
        if (!monthKey || !monthKeySet.has(monthKey)) return;

        const unitGroup = String(row.BGName || row.BGNo || '').trim() || '-';
        const specFlag = resolveSpecFlag(row);
        if (specFlag !== null) hasSpecFlagDimension = true;
        const compositeKey = `${unitGroup}__spec_${specFlag === null ? 'none' : specFlag}`;

        if (!byUnitAndSpec.has(compositeKey)) {
            byUnitAndSpec.set(
                compositeKey,
                createEmptyMetricRow(
                    `unit-${orderedKeys.length + 1}`,
                    unitGroup,
                    unitGroup,
                    specFlag === null ? 'normal' : 'spec'
                )
            );
            byUnitAndSpec.get(compositeKey)!.spec_flag = specFlag === null ? '' : String(specFlag);
            orderedKeys.push(compositeKey);
        }

        const target = byUnitAndSpec.get(compositeKey)!;

        metricMaps.forEach((metric) => {
            const value = toNumber(row[metric.valueField]);
            const valueKey = `${metric.key}_${monthKey}`;
            target[valueKey] = toNumber(target[valueKey]) + value;

            if (metric.diffField) {
                const diffValue = toNumberOrNull(row[metric.diffField]);
                if (diffValue !== null) {
                    const diffKey = `${metric.key}_${monthKey}_diff`;
                    target[diffKey] = toNumber(target[diffKey]) + diffValue;
                }
            }
        });

        const remarkKey = `remark_${monthKey}`;
        const nextRemark = String(row.remark || '').trim();
        const currentRemark = String(target[remarkKey] ?? '').trim();
        if (nextRemark) {
            target[remarkKey] = currentRemark && currentRemark !== nextRemark
                ? `${currentRemark}\n${nextRemark}`
                : (currentRemark || nextRemark);
        }
    });

    const baseRows = orderedKeys.map((compositeKey) => {
        const row = byUnitAndSpec.get(compositeKey)!;

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

    const rows: DataType[] = [];

    if (hasSpecFlagDimension) {
        const grouped = new Map<string, DataType[]>();
        const orderedGroups: string[] = [];

        baseRows.forEach((row) => {
            const unitGroup = String(row.unit_group || row.unit || '-');
            if (!grouped.has(unitGroup)) {
                grouped.set(unitGroup, []);
                orderedGroups.push(unitGroup);
            }
            grouped.get(unitGroup)!.push(row);
        });

        orderedGroups.forEach((unitGroup, groupIndex) => {
            const groupRows = grouped.get(unitGroup) || [];
            const specRows = groupRows.filter((row) => String(row.row_kind) === 'spec');

            if (specRows.length === 0) {
                rows.push(...groupRows);
                return;
            }

            const parentRow = createEmptyMetricRow(
                `group-${groupIndex + 1}`,
                unitGroup,
                unitGroup,
                'group'
            );

            monthKeys.forEach((monthKey) => {
                metricMaps.forEach((metric) => {
                    const currentKey = `${metric.key}_${monthKey}`;
                    parentRow[currentKey] = specRows.reduce((sum, row) => sum + toNumber(row[currentKey]), 0);

                    if (metric.diffField) {
                        const diffKey = `${currentKey}_diff`;
                        parentRow[diffKey] = specRows.reduce((sum, row) => sum + toNumber(row[diffKey]), 0);
                    }
                });
                parentRow[`remark_${monthKey}`] = '';
            });

            rows.push(parentRow);

            const orderedSpecRows = [...specRows].sort((a, b) => {
                const aFlag = Number(a.spec_flag);
                const bFlag = Number(b.spec_flag);
                if (aFlag === bFlag) return 0;
                if (aFlag === 1) return -1;
                return 1;
            });

            orderedSpecRows.forEach((row) => {
                const specFlag = Number(row.spec_flag);
                row.unit = specFlag === 1 ? '  - อัตราเฉพาะตัว' : '  - ไม่เป็นอัตราเฉพาะตัว';
                rows.push(row);
            });
        });
    } else {
        rows.push(...baseRows);
    }

    const hasTotalRow = rows.some((row) => isTotalUnit(row.unit));
    if (!hasTotalRow && rows.length > 0) {
        const totalRow: DataType = {
            key: 'unit-total',
            unit: 'รวม',
            unit_group: 'รวม',
            row_kind: 'total',
        };

        const sourceRowsForTotal = rows.filter((row) => {
            if (String(row.row_kind) === 'group') return false;
            return !isTotalUnit(row.unit);
        });

        monthKeys.forEach((monthKey) => {
            const prevMonthKey = dayjs(monthKey, 'YYYYMM').subtract(1, 'month').format('YYYYMM');

            metricMaps.forEach((metric) => {
                const currentKey = `${metric.key}_${monthKey}`;
                totalRow[currentKey] = sourceRowsForTotal.reduce((sum, row) => sum + toNumber(row[currentKey]), 0);

                if (metric.diffField) {
                    const diffKey = `${currentKey}_diff`;
                    totalRow[diffKey] = sourceRowsForTotal.reduce((sum, row) => {
                        const explicitDiff = toNumberOrNull(row[diffKey]);
                        if (explicitDiff !== null) return sum + explicitDiff;

                        const current = toNumber(row[currentKey]);
                        const prev = toNumber(row[`${metric.key}_${prevMonthKey}`]);
                        return sum + (current - prev);
                    }, 0);
                }
            });

            totalRow[`remark_${monthKey}`] = '';
        });

        rows.push(totalRow);
    }

    rows.sort((a, b) => {
        if (isTotalUnit(a.unit) && !isTotalUnit(b.unit)) return 1;
        if (!isTotalUnit(a.unit) && isTotalUnit(b.unit)) return -1;
        return 0;
    });

    return {
        rows,
        unitOptions: Array.from(
            new Set(
                rows
                    .filter((row) => {
                        if (isTotalUnit(row.unit)) return false;
                        const kind = String(row.row_kind || 'normal');
                        return kind === 'group' || kind === 'normal';
                    })
                    .map((row) => String(row.unit_group || row.unit))
            )
        ),
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

const report2MetricRows = [
    { key: 'frame_staff', label: 'กรอบ พนง.', showDiff: true, textClass: 'text-blue-700' },
    { key: 'frame_normal', label: 'ปกติ', showDiff: true, textClass: 'text-blue-700' },
    { key: 'people_normal', label: 'คน ปกติ', showDiff: true, textClass: 'text-orange-700' },
    { key: 'pool_rs', label: 'Pool RS', showDiff: true, textClass: 'text-blue-700' },
    { key: 'people_pool_rs', label: 'คน Pool RS', showDiff: true, textClass: 'text-orange-700' },
    { key: 'frame_sec', label: 'กรอบ Sec', showDiff: true, textClass: 'text-blue-700' },
    { key: 'traditional', label: 'Traditional', showDiff: true, textClass: 'text-blue-700' },
    { key: 'new_biz', label: 'New Biz', showDiff: true, textClass: 'text-blue-700' },
    { key: 'people_new_biz', label: 'คน New Biz', showDiff: true, textClass: 'text-orange-700' },
    { key: 'total_actual', label: 'รวม Actual', showDiff: true, textClass: 'text-blue-700' },
    { key: 'total_people', label: 'รวม คน', showDiff: true, textClass: 'text-orange-700' },
    { key: 'contact_out', label: 'Contact Out สัญญาใหญ่', showDiff: false, textClass: 'text-purple-700' },
    { key: 'contact_out_sub', label: 'Contact Out สัญญาย่อย', showDiff: false, textClass: 'text-purple-700' },
    { key: 'remark', label: 'หมายเหตุ', showDiff: false, isRemark: true, textClass: 'text-gray-700' },
] as const;

export default function Report2Page() {
    const [loading, setLoading] = useState(false);
    const [checkedList, setCheckedList] = useState<CheckboxValueType[]>(defaultCheckedList);
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetOptions);
    const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
    const [appliedUnits, setAppliedUnits] = useState<string[]>([]);
    const [businessUnitOptions, setBusinessUnitOptions] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'normal' | 'transposed'>('normal');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [startMonth, setStartMonth] = useState<Dayjs>(dayjs());
    const [endMonth, setEndMonth] = useState<Dayjs>(dayjs());
    const [filterEffectiveMonth, setFilterEffectiveMonth] = useState<Dayjs>(dayjs());

    const [allData, setAllData] = useState<DataType[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const months = useMemo(() => getMonthRangeKeys(startMonth, endMonth), [startMonth, endMonth]);

    const data = useMemo(() => {
        if (appliedUnits.length === 0) return allData;
        return allData.filter((item) => {
            if (isTotalUnit(item.unit)) return true;
            const unitGroup = String(item.unit_group || item.unit);
            return appliedUnits.includes(unitGroup);
        });
    }, [allData, appliedUnits]);

    const businessTreeData = useMemo(() => {
        const treeRows: DataType[] = [];
        let idx = 0;

        while (idx < data.length) {
            const current = data[idx];
            const rowKind = String(current.row_kind || 'normal');

            if (rowKind === 'group') {
                const parent: DataType = { ...current, children: [] };
                idx += 1;

                while (idx < data.length) {
                    const next = data[idx];
                    const nextKind = String(next.row_kind || 'normal');
                    if (nextKind === 'spec' && String(next.unit_group || '') === String(current.unit_group || '')) {
                        (parent.children as DataType[]).push(next);
                        idx += 1;
                        continue;
                    }
                    break;
                }

                treeRows.push(parent);
                continue;
            }

            if (rowKind === 'spec') {
                idx += 1;
                continue;
            }

            treeRows.push(current);
            idx += 1;
        }

        return treeRows;
    }, [data]);

    const fetchFilterOptions = useCallback(async (effectiveDate: Dayjs) => {
        const { employeeId, userGroupNo } = resolveUserContext();
        if (!employeeId || employeeId === 'SYSTEM' || !userGroupNo) {
            setBusinessUnitOptions([]);
            setSelectedUnits((prev) => (prev.length > 0 ? [] : prev));
            return;
        }

        try {
            const query = new URLSearchParams({
                effectiveDate: effectiveDate.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo,
            });

            const res = await fetch(buildSafeRoutePathFromSearch('report3Filters', query));
            const payload = (await res.json()) as Report2FilterResponse;

            if (!res.ok || payload.status !== 200 || !payload.data) {
                throw new Error(payload.message || 'ไม่สามารถดึงตัวเลือกหน่วยธุรกิจได้');
            }

            const nextOptions = Array.from(
                new Set(
                    payload.data.businessUnits
                        .map((item) => toText(item.BGName))
                        .filter((name) => name.length > 0)
                )
            ).sort((a, b) => a.localeCompare(b, 'th'));

            setBusinessUnitOptions(nextOptions);
            setSelectedUnits((prev) => prev.filter((unit) => nextOptions.includes(unit)));
        } catch (error) {
            console.error('Failed to fetch report2 filter options:', error);
            setBusinessUnitOptions([]);
            setSelectedUnits((prev) => (prev.length > 0 ? [] : prev));
        }
    }, []);

    useEffect(() => {
        void fetchFilterOptions(filterEffectiveMonth.startOf('month'));
    }, [filterEffectiveMonth, fetchFilterOptions]);

    const fetchReportData = useCallback(async (start: Dayjs, end: Dayjs, requestedUnits: string[] = []) => {
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

            const res = await fetch(buildSafeRoutePathFromSearch('report2', query));
            const payload = (await res.json()) as Report2ApiResponse & { error?: string };

            if (!res.ok || payload.status !== 200 || !payload.data) {
                throw new Error(payload.error || payload.message || 'ไม่สามารถดึงข้อมูลรายงานได้');
            }

            const transformed = transformRows(payload.data, monthKeys);
            setAllData(transformed.rows);
            setAppliedUnits(requestedUnits);
            setHasSearched(true);
        } catch (error) {
            console.error('Failed to fetch report2 data:', error);
            setAllData([]);
            setAppliedUnits([]);
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
        setFilterEffectiveMonth(nextStart);
        await fetchReportData(nextStart, nextEnd, selectedUnits);
    };

    const onStartMonthChange = (date: Dayjs | null) => {
        if (date) setFilterEffectiveMonth(date);
    };

    const onCheckboxChange = (list: CheckboxValueType[]) => {
        setCheckedList(list);
    };

    const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

    const getDiffValue = (record: DataType, currentKey: string, prevKey: string): number => {
        const explicitDiff = toNumberOrNull(record[`${currentKey}_diff`]);
        if (explicitDiff !== null) return explicitDiff;

        const current = toNumber(record[currentKey]);
        const prev = toNumber(record[prevKey]);
        return current - prev;
    };

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const excelColors = {
            blue50: 'FFEFF6FF',
            blue100: 'FFDBEAFE',
            blue200: 'FFBFDBFE',
            blue300: 'FF93C5FD',
            blue500: 'FF3B82F6',
            blue700: 'FF1D4ED8',
            blue800: 'FF1E40AF',
            blue900: 'FF1E3A8A',
            orange50: 'FFFFF7ED',
            orange700: 'FFC2410C',
            orange800: 'FF9A3412',
            purple200: 'FFE9D5FF',
            purple700: 'FF6D28D9',
            purple900: 'FF581C87',
            gray50: 'FFF9FAFB',
            gray100: 'FFF3F4F6',
            gray700: 'FF374151',
            gray800: 'FF1F2937',
            gray900: 'FF111827',
            red500: 'FFEF4444',
            white: 'FFFFFFFF',
        };

        const labelColorMap: Record<string, string> = {
            'text-blue-700': excelColors.blue700,
            'text-orange-700': excelColors.orange700,
            'text-purple-700': excelColors.purple700,
            'text-gray-700': excelColors.gray700,
        };

        const setCellBorder = (
            cell: ExcelJS.Cell,
            topStyle: 'thin' | 'medium' = 'thin',
            topColor?: string
        ) => {
            const topBorder = topColor
                ? { style: topStyle, color: { argb: topColor } }
                : { style: topStyle };

            cell.border = {
                top: topBorder,
                left: { style: 'thin' },
                right: { style: 'thin' },
                bottom: { style: 'thin' },
            };
        };

        if (viewMode === 'transposed') {
            if (!transposedData.length) {
                alert('ไม่พบข้อมูลสำหรับ Export');
                return;
            }

            const worksheet = workbook.addWorksheet('Report 02');
            type LeafColumn = { parentTitle: string; title: string; dataIndex: string; isBizTotal: boolean };
            const leafColumns: LeafColumn[] = [];

            const collectLeafColumns = (cols: ColumnsType<DataType>, parentTitle = '') => {
                cols.forEach((col) => {
                    const children = (col as { children?: ColumnsType<DataType> }).children || [];
                    const title = String(col.title ?? '');

                    if (children.length > 0) {
                        collectLeafColumns(children, title);
                        return;
                    }

                    const dataIndex = String((col as { dataIndex?: string; key?: string }).dataIndex ?? '');
                    if (!dataIndex) return;

                    leafColumns.push({
                        parentTitle,
                        title,
                        dataIndex,
                        isBizTotal: dataIndex === 'biz_total',
                    });
                });
            };

            collectLeafColumns(transposedColumns);

            if (!leafColumns.length) {
                alert('ไม่พบคอลัมน์สำหรับ Export');
                return;
            }

            const header1: string[] = [];
            const header2: string[] = [];
            leafColumns.forEach((col, index) => {
                if (index === 0) {
                    header1.push(col.title || 'วันที่ / รายการ');
                    header2.push('');
                    return;
                }

                if (col.parentTitle) {
                    header1.push(col.parentTitle);
                    header2.push(col.title);
                } else {
                    header1.push(col.title);
                    header2.push('');
                }
            });

            worksheet.addRow(header1);
            worksheet.addRow(header2);

            for (let colNo = 1; colNo <= leafColumns.length; colNo++) {
                if (header2[colNo - 1] === '') {
                    worksheet.mergeCells(1, colNo, 2, colNo);
                }
            }

            let colNo = 1;
            while (colNo <= leafColumns.length) {
                const hasChildHeader = header2[colNo - 1] !== '';
                const parentTitle = header1[colNo - 1];

                if (!hasChildHeader || !parentTitle) {
                    colNo += 1;
                    continue;
                }

                let endCol = colNo;
                while (
                    endCol + 1 <= leafColumns.length &&
                    header1[endCol] === parentTitle &&
                    header2[endCol] !== ''
                ) {
                    endCol += 1;
                }

                if (endCol > colNo) {
                    worksheet.mergeCells(1, colNo, 1, endCol);
                }
                colNo = endCol + 1;
            }

            worksheet.getRow(1).height = 24;
            worksheet.getRow(2).height = 22;

            for (let currentCol = 1; currentCol <= leafColumns.length; currentCol += 1) {
                const leaf = leafColumns[currentCol - 1];
                const row1Cell = worksheet.getCell(1, currentCol);
                const row2Cell = worksheet.getCell(2, currentCol);
                const hasSubHeader = header2[currentCol - 1] !== '';

                if (currentCol === 1) {
                    row1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColors.blue100 } };
                    row1Cell.font = { bold: true, name: 'Sarabun', color: { argb: excelColors.blue900 } };
                    row1Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    setCellBorder(row1Cell);
                    continue;
                }

                if (!hasSubHeader) {
                    const headerBg = leaf.isBizTotal ? excelColors.blue200 : excelColors.blue50;
                    const headerFg = leaf.isBizTotal ? excelColors.blue900 : excelColors.blue800;
                    row1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
                    row1Cell.font = { bold: true, name: 'Sarabun', color: { argb: headerFg } };
                    row1Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    setCellBorder(row1Cell);
                    continue;
                }

                row1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColors.blue200 } };
                row1Cell.font = { bold: true, name: 'Sarabun', color: { argb: excelColors.blue900 } };
                row1Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                setCellBorder(row1Cell);

                row2Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColors.blue50 } };
                row2Cell.font = { bold: true, name: 'Sarabun', color: { argb: excelColors.blue800 } };
                row2Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                setCellBorder(row2Cell);
            }

            const exportMeta = new Map<number, { rowType: string; labelClass: string }>();
            transposedData.forEach((item) => {
                const rowType = String(item.transpose_row_type || 'value');
                const labelClass = String(item.transpose_label_class || 'text-gray-700');
                const rowValues: (string | number)[] = [];

                leafColumns.forEach((col, index) => {
                    if (index === 0) {
                        rowValues.push(String(item[col.dataIndex] ?? ''));
                        return;
                    }

                    const raw = item[col.dataIndex];
                    if (rowType === 'remark') {
                        rowValues.push(String(raw ?? ''));
                        return;
                    }

                    if (rowType === 'diff') {
                        const diff = toNumber(raw);
                        rowValues.push(diff > 0 ? `+${diff}` : `${diff}`);
                        return;
                    }

                    rowValues.push(toNumber(raw));
                });

                const row = worksheet.addRow(rowValues);
                exportMeta.set(row.number, { rowType, labelClass });
            });

            worksheet.columns = leafColumns.map((col, idx) => ({
                width: idx === 0 ? 34 : col.title.includes('หมายเหตุ') ? 30 : 14,
            }));

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber <= 2) return;
                const meta = exportMeta.get(rowNumber);
                const rowType = meta?.rowType || 'value';
                const labelClass = meta?.labelClass || 'text-gray-700';

                row.eachCell((cell, currentColNo) => {
                    const isFirstCol = currentColNo === 1;
                    const rawValue = String(cell.value ?? '');

                    cell.font = {
                        ...cell.font,
                        name: 'Sarabun',
                        bold: rowType === 'month',
                    };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: isFirstCol || rowType === 'remark' ? 'left' : 'center',
                        wrapText: rowType === 'remark' || isFirstCol,
                    };
                    setCellBorder(
                        cell,
                        rowType === 'month' ? 'medium' : 'thin',
                        rowType === 'month' ? excelColors.blue300 : undefined
                    );

                    if (rowType === 'month') {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: excelColors.blue100 },
                        };
                        cell.font = { ...cell.font, color: { argb: excelColors.blue900 } };
                    }

                    if (isFirstCol && rowType !== 'month') {
                        const labelColor = labelColorMap[labelClass];
                        if (labelColor) {
                            cell.font = { ...cell.font, color: { argb: labelColor } };
                        }
                    }

                    if (!isFirstCol && rowType === 'diff') {
                        if (rawValue.startsWith('+')) {
                            cell.font = { ...cell.font, color: { argb: excelColors.blue500 } };
                        } else if (rawValue.startsWith('-')) {
                            cell.font = { ...cell.font, color: { argb: excelColors.red500 } };
                        }
                    }

                    if (rowType === 'value' && leafColumns[currentColNo - 1]?.isBizTotal) {
                        cell.font = { ...cell.font, bold: true };
                    }

                    if (rowType === 'remark' && !isFirstCol) {
                        cell.font = { ...cell.font, color: { argb: excelColors.gray700 } };
                    }
                });
            });

            for (let headerRow = 1; headerRow <= 2; headerRow += 1) {
                for (let currentCol = 1; currentCol <= leafColumns.length; currentCol += 1) {
                    const cell = worksheet.getCell(headerRow, currentCol);
                    if (!cell.border) {
                        setCellBorder(cell);
                    }
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            await saveExcelFile(
                blob,
                `รายงานสรุปภาพรวมการเปลี่ยนแปลงกรอบอัตราเปรียบเทียบรายเดือน_${dayjs().format('YYYYMMDD')}.xlsx`
            );
            return;
        }

        if (!data.length || !months.length) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        const worksheet = workbook.addWorksheet('Report 02');

        const visible = (key: string) => isColumnVisible(key, checkedList, selectedDatasets);

        type HeaderTone = 'blue' | 'orange' | 'purple' | 'gray';
        type ExportColMeta = {
            key: string;
            kind: 'unit' | 'value' | 'diff' | 'remark';
            tone: HeaderTone;
            metricKey?: string;
        };

        const metricToneMap: Record<string, HeaderTone> = {
            frame_staff: 'blue',
            frame_normal: 'blue',
            people_normal: 'orange',
            pool_rs: 'blue',
            people_pool_rs: 'orange',
            frame_sec: 'blue',
            traditional: 'blue',
            new_biz: 'blue',
            people_new_biz: 'orange',
            total_actual: 'blue',
            total_people: 'orange',
            contact_out: 'purple',
            contact_out_sub: 'purple',
            remark: 'gray',
        };

        const tonePalette: Record<HeaderTone, { headerBg: string; headerFg: string; bodyBg: string }> = {
            blue: { headerBg: excelColors.blue50, headerFg: excelColors.blue800, bodyBg: excelColors.blue50 },
            orange: { headerBg: excelColors.orange50, headerFg: excelColors.orange800, bodyBg: excelColors.orange50 },
            purple: { headerBg: excelColors.purple200, headerFg: excelColors.purple900, bodyBg: excelColors.purple200 },
            gray: { headerBg: excelColors.gray100, headerFg: excelColors.gray800, bodyBg: excelColors.white },
        };

        const header1: string[] = ['Business'];
        const header2: string[] = [''];
        const header3: string[] = [''];
        const dataKeys: string[] = ['unit'];
        const columnMeta: ExportColMeta[] = [{ key: 'unit', kind: 'unit', tone: 'blue' }];
        const monthRanges: Array<{ startCol: number; endCol: number }> = [];
        const metricRanges: Array<{ startCol: number; endCol: number; kind: 'horizontal' | 'vertical' }> = [];

        months.forEach((monthKey) => {
            const monthLabel = dayjs(monthKey, 'YYYYMM').format('MMMM YYYY');
            const monthStartCol = dataKeys.length + 1;

            const addNumeric = (key: string, title: string, withDiff: boolean) => {
                if (!visible(key)) return;
                const tone = metricToneMap[key] || 'blue';
                const metricStartCol = dataKeys.length + 1;

                header2.push(title);
                header3.push('จำนวน');
                dataKeys.push(`${key}_${monthKey}`);
                columnMeta.push({ key: `${key}_${monthKey}`, kind: 'value', tone, metricKey: key });

                if (withDiff) {
                    header2.push('');
                    header3.push('+/-');
                    dataKeys.push(`${key}_${monthKey}_diff_export`);
                    columnMeta.push({ key: `${key}_${monthKey}_diff_export`, kind: 'diff', tone, metricKey: key });
                }

                metricRanges.push({
                    startCol: metricStartCol,
                    endCol: dataKeys.length,
                    kind: withDiff ? 'horizontal' : 'horizontal',
                });
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
            addNumeric('contact_out', 'Contact Out สัญญาใหญ่', false);
            addNumeric('contact_out_sub', 'Contact Out สัญญาย่อย', false);

            if (visible('remark')) {
                const remarkCol = dataKeys.length + 1;
                header2.push('หมายเหตุ');
                header3.push('');
                dataKeys.push(`remark_${monthKey}`);
                columnMeta.push({ key: `remark_${monthKey}`, kind: 'remark', tone: 'gray', metricKey: 'remark' });
                metricRanges.push({ startCol: remarkCol, endCol: remarkCol, kind: 'vertical' });
            }

            const monthSpan = dataKeys.length - monthStartCol + 1;
            if (monthSpan > 0) {
                header1.push(`Actual ${monthLabel}`);
                for (let i = 1; i < monthSpan; i += 1) header1.push('');
                monthRanges.push({ startCol: monthStartCol, endCol: dataKeys.length });
            }
        });

        worksheet.addRow(header1);
        worksheet.addRow(header2);
        worksheet.addRow(header3);
        worksheet.getRow(1).height = 24;
        worksheet.getRow(2).height = 22;
        worksheet.getRow(3).height = 22;

        worksheet.mergeCells(1, 1, 3, 1);

        monthRanges.forEach(({ startCol, endCol }) => {
            if (endCol > startCol) {
                worksheet.mergeCells(1, startCol, 1, endCol);
            }
            const monthCell = worksheet.getCell(1, startCol);
            monthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColors.blue200 } };
            monthCell.font = { bold: true, name: 'Sarabun', color: { argb: excelColors.blue900 } };
            monthCell.alignment = { vertical: 'middle', horizontal: 'center' };
            setCellBorder(monthCell);
        });

        metricRanges.forEach(({ startCol, endCol, kind }) => {
            if (kind === 'vertical') {
                worksheet.mergeCells(2, startCol, 3, startCol);
                return;
            }
            if (endCol > startCol) {
                worksheet.mergeCells(2, startCol, 2, endCol);
            }
        });

        const unitHeaderCell = worksheet.getCell(1, 1);
        unitHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColors.blue100 } };
        unitHeaderCell.font = { bold: true, name: 'Sarabun', color: { argb: excelColors.blue900 } };
        unitHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
        setCellBorder(unitHeaderCell);

        for (let colNo = 2; colNo <= dataKeys.length; colNo += 1) {
            const meta = columnMeta[colNo - 1];
            if (!meta) continue;
            const tone = tonePalette[meta.tone];

            const header2Cell = worksheet.getCell(2, colNo);
            header2Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tone.headerBg } };
            header2Cell.font = { bold: true, name: 'Sarabun', color: { argb: tone.headerFg } };
            header2Cell.alignment = { vertical: 'middle', horizontal: 'center' };
            setCellBorder(header2Cell);

            if (meta.kind !== 'remark') {
                const header3Cell = worksheet.getCell(3, colNo);
                header3Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tone.headerBg } };
                header3Cell.font = { bold: true, name: 'Sarabun', color: { argb: tone.headerFg } };
                header3Cell.alignment = { vertical: 'middle', horizontal: 'center' };
                setCellBorder(header3Cell);
            }
        }

        for (let rowNo = 1; rowNo <= 3; rowNo += 1) {
            for (let colNo = 1; colNo <= dataKeys.length; colNo += 1) {
                const cell = worksheet.getCell(rowNo, colNo);
                if (!cell.border) {
                    setCellBorder(cell);
                }
            }
        }

        const exportRowMeta = new Map<number, { rowKind: string; isTotal: boolean }>();
        data.forEach((item) => {
            const rowValues: (string | number)[] = [item.unit];

            months.forEach((monthKey) => {
                const prevMonthKey = dayjs(monthKey, 'YYYYMM').subtract(1, 'month').format('YYYYMM');

                const addValue = (key: string, withDiff: boolean) => {
                    if (!visible(key)) return;

                    const currentKey = `${key}_${monthKey}`;
                    rowValues.push(toNumber(item[currentKey]));

                    if (withDiff) {
                        const diff = getDiffValue(item, currentKey, `${key}_${prevMonthKey}`);
                        rowValues.push(diff !== 0 ? (diff > 0 ? `+${diff}` : `${diff}`) : '0');
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
                    rowValues.push(String(item[`remark_${monthKey}`] ?? ''));
                }
            });

            const row = worksheet.addRow(rowValues);
            exportRowMeta.set(row.number, {
                rowKind: String(item.row_kind || 'normal'),
                isTotal: isTotalUnit(String(item.unit)),
            });
        });

        worksheet.columns = dataKeys.map((key, idx) => {
            if (idx === 0) return { width: 25 };
            if (key.includes('remark_')) return { width: 30 };
            if (key.includes('contact_out_sub')) return { width: 18 };
            return { width: 12 };
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 3) return;
            const rowMeta = exportRowMeta.get(rowNumber);
            const rowKind = rowMeta?.rowKind || 'normal';
            const isTotal = Boolean(rowMeta?.isTotal);

            row.eachCell((cell, colNo) => {
                const colMeta = columnMeta[colNo - 1];
                const isFirstCol = colNo === 1;
                const isRemarkCol = colMeta?.kind === 'remark';

                cell.font = {
                    ...cell.font,
                    name: 'Sarabun',
                    bold: false,
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: isFirstCol || isRemarkCol ? 'left' : 'center',
                    wrapText: isFirstCol || isRemarkCol,
                };
                setCellBorder(cell);

                if (!isFirstCol && colMeta?.kind === 'value') {
                    cell.numFmt = '#,##0';
                }

                if (isTotal) {
                    if (isFirstCol) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColors.blue100 } };
                        cell.font = { ...cell.font, bold: true, color: { argb: excelColors.blue900 } };
                    } else if (colMeta && colMeta.kind !== 'remark') {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: tonePalette[colMeta.tone].bodyBg },
                        };
                        cell.font = { ...cell.font, bold: true };
                    }
                } else if (rowKind === 'group' && isFirstCol) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColors.gray50 } };
                    cell.font = { ...cell.font, bold: true, color: { argb: excelColors.gray900 } };
                }

                if (colMeta?.kind === 'diff' && !isFirstCol) {
                    const text = String(cell.value ?? '');
                    if (text.startsWith('+')) {
                        cell.font = { ...cell.font, color: { argb: excelColors.blue500 } };
                    } else if (text.startsWith('-')) {
                        cell.font = { ...cell.font, color: { argb: excelColors.red500 } };
                    }
                }

                if (isRemarkCol && !isTotal) {
                    cell.font = { ...cell.font, color: { argb: excelColors.gray700 } };
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        await saveExcelFile(blob, `รายงานสรุปภาพรวมการเปลี่ยนแปลงกรอบอัตราเปรียบเทียบรายเดือน_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const normalColumns: ColumnsType<DataType> = useMemo(() => {
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
                onCell: (record) => {
                    if (isTotalUnit(record.unit)) {
                        return { className: 'bg-blue-100! font-semibold text-blue-900!' };
                    }

                    const rowKind = String(record.row_kind || 'normal');
                    if (rowKind === 'group') {
                        return { className: 'bg-gray-50! font-semibold text-gray-900!' };
                    }

                    return { className: 'bg-white' };
                },
                render: (text: unknown, record) => {
                    const label = String(text ?? '');
                    const rowKind = String(record.row_kind || 'normal');

                    if (rowKind === 'group') {
                        return <span className="font-semibold text-gray-900">{label}</span>;
                    }

                    if (rowKind === 'spec') {
                        return <span className="font-medium text-gray-700">{label}</span>;
                    }

                    return <span className="font-medium text-gray-700">{label}</span>;
                },
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
                title: React.ReactNode,
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
                    title: <div className="w-full text-center">{title}</div>,
                    className: 'bg-white',
                    onHeaderCell: () => ({ className: `${bgHeader} ${textHeader} !text-center` }),
                    children,
                };
            };

            const cols = [
                createCol('frame_staff', 'กรอบ พนง.', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('frame_normal', 'ปกติ', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('people_normal', 'คน ปกติ', 80, 'bg-orange-50!', 'text-orange-800!'),
                createCol('pool_rs', 'Pool RS', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('people_pool_rs', 'คน Pool RS', 90, 'bg-orange-50!', 'text-orange-800!'),
                createCol('frame_sec', 'กรอบ Sec', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('traditional', 'Traditional', 85, 'bg-blue-50!', 'text-blue-800!'),
                createCol('new_biz', 'New Biz', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('people_new_biz', 'คน New Biz', 90, 'bg-orange-50!', 'text-orange-800!'),
                createCol('total_actual', 'รวม Actual', 80, 'bg-blue-50!', 'text-blue-800!'),
                createCol('total_people', 'รวม คน', 80, 'bg-orange-50!', 'text-orange-800!'),
                createCol(
                    'contact_out',
                    (
                        <span className="inline-block leading-tight text-center">
                            Contact Out
                            <br />
                            สัญญาใหญ่
                        </span>
                    ),
                    110,
                    'bg-purple-200!',
                    'text-purple-900!',
                    false
                ),
                createCol(
                    'contact_out_sub',
                    (
                        <span className="inline-block leading-tight text-center">
                            Contact Out
                            <br />
                            สัญญาย่อย
                        </span>
                    ),
                    130,
                    'bg-purple-200!',
                    'text-purple-900!',
                    false
                ),
            ];

            cols.forEach((col) => {
                if (col && monthGroup.children) {
                    monthGroup.children.push(col);
                }
            });

            if (visible('remark') && monthGroup.children) {
                monthGroup.children.push({
                    title: <div className="w-full text-center">หมายเหตุ</div>,
                    dataIndex: `remark_${monthKey}`,
                    key: `remark_${monthKey}`,
                    width: 220,
                    align: 'left',
                    className: 'bg-white',
                    onHeaderCell: () => ({ className: 'bg-gray-100! text-gray-800! !text-center' }),
                    render: (text: unknown, record: DataType) => {
                        if (isTotalUnit(record.unit)) return null;
                        return <span className="text-[11px] leading-5 text-gray-500">{String(text ?? '')}</span>;
                    },
                });
            }

            if (monthGroup.children && monthGroup.children.length > 0) {
                baseColumns.push(monthGroup);
            }
        });

        return baseColumns;
    }, [months, checkedList, selectedDatasets]);

    const { transposedColumns, transposedData } = useMemo(() => {
        const visible = (key: string) => isColumnVisible(key, checkedList, selectedDatasets);
        const metricDefs = report2MetricRows.filter((item) => visible(item.key));
        const normalizeTransposeColumnTitle = (rawTitle: string): string => {
            const text = String(rawTitle || '').trim();
            if (
                text.includes('อัตราเฉพาะตัว') ||
                text.includes('ไม่เป็นอัตราเฉพาะตัว')
            ) {
                return text.replace(/^\s*-\s*/, '').trim();
            }
            return text;
        };
        const getTransposeMonthCellClass = (record: DataType): string => {
            const rowType = String(record.transpose_row_type || '');
            if (rowType === 'month') {
                return '!bg-blue-100 font-semibold border-t-2 border-t-blue-300';
            }
            return '';
        };

        const totalRow = data.find((row) => isTotalUnit(String(row.unit)));
        const businessGroups = businessTreeData
            .filter((row) => !isTotalUnit(String(row.unit)))
            .map((row) => ({
                title: String(row.unit_group || row.unit),
                leaves: row.children && row.children.length > 0 ? row.children : [row],
            }));

        const columns: ColumnsType<DataType> = [
            {
                title: 'วันที่ / รายการ',
                dataIndex: 'unit',
                key: 'unit',
                fixed: 'left',
                width: 240,
                className: 'bg-white z-20',
                onHeaderCell: () => ({ className: 'bg-blue-100! text-blue-900! font-bold' }),
                render: (text: unknown, record) => {
                    const rowType = String(record.transpose_row_type || 'value');
                    const label = String(text ?? '');
                    const labelClass = String(record.transpose_label_class || 'text-gray-700');

                    if (rowType === 'month') {
                        return <span className="font-semibold text-gray-700">{label}</span>;
                    }
                    if (rowType === 'diff') {
                        return <span className={labelClass}>{label}</span>;
                    }
                    if (rowType === 'remark') {
                        return <span className={labelClass}>{label}</span>;
                    }
                    return <span className={`font-medium ${labelClass}`}>{label}</span>;
                },
                onCell: (record) => ({
                    className: getTransposeMonthCellClass(record),
                }),
            },
        ];

        const makeLeafColumn = (title: string, dataIndex: string): ColumnsType<DataType>[number] => ({
            title,
            dataIndex,
            key: dataIndex,
            width: 130,
            align: 'center',
            className: 'bg-white',
            onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-800! font-semibold text-center' }),
            onCell: (record: DataType) => ({
                className: getTransposeMonthCellClass(record),
            }),
            render: (value: unknown, record: DataType) => {
                const rowType = String(record.transpose_row_type || 'value');
                if (rowType === 'month') {
                    return <span className="font-semibold">{toNumber(value)}</span>;
                }
                if (rowType === 'remark') {
                    return <span className="text-[11px] leading-5 text-gray-500">{String(value ?? '')}</span>;
                }
                if (rowType === 'diff') {
                    const diff = toNumber(value);
                    const colorClass = diff > 0 ? 'text-blue-500' : diff < 0 ? 'text-red-500' : 'text-gray-900';
                    const text = diff > 0 ? `+${diff}` : `${diff}`;
                    return <span className={colorClass}>{text}</span>;
                }
                return <span>{toNumber(value)}</span>;
            },
        });

        businessGroups.forEach((group, groupIndex) => {
            if (group.leaves.length > 1) {
                columns.push({
                    title: group.title,
                    key: `transpose-group-${groupIndex}`,
                    onHeaderCell: () => ({ className: 'bg-blue-200! text-blue-900! font-bold text-center' }),
                    children: group.leaves.map((leaf) =>
                        makeLeafColumn(normalizeTransposeColumnTitle(String(leaf.unit)), `biz_${leaf.key}`)
                    ),
                });
                return;
            }

            const leaf = group.leaves[0];
            columns.push(
                makeLeafColumn(normalizeTransposeColumnTitle(group.title), `biz_${leaf.key}`)
            );
        });

        if (totalRow) {
            columns.push({
                title: 'รวม',
                dataIndex: 'biz_total',
                key: 'biz_total',
                width: 120,
                align: 'center',
                className: 'bg-blue-50!',
                onHeaderCell: () => ({ className: 'bg-blue-200! text-blue-900! font-bold text-center' }),
                render: (value: unknown, record: DataType) => {
                    const rowType = String(record.transpose_row_type || 'value');
                    if (rowType === 'month') return <span className="font-semibold">{toNumber(value)}</span>;
                    if (rowType === 'remark') return null;
                    if (rowType === 'diff') {
                        const diff = toNumber(value);
                        const colorClass = diff > 0 ? 'text-blue-500' : diff < 0 ? 'text-red-500' : 'text-gray-900';
                        const text = diff > 0 ? `+${diff}` : `${diff}`;
                        return <span className={colorClass}>{text}</span>;
                    }
                    return <span className="font-semibold">{toNumber(value)}</span>;
                },
            });
        }

        const rows: DataType[] = [];
        let rowCounter = 1;

        months.forEach((monthKey, monthIndex) => {
            const monthLabel = dayjs(monthKey, 'YYYYMM').format('MMMM YYYY');
            const prevMonthKey = dayjs(monthKey, 'YYYYMM').subtract(1, 'month').format('YYYYMM');

            const monthSummaryRow: DataType = {
                key: `transpose-month-${monthKey}`,
                unit: `Actual ${monthLabel} | ยอดรวม`,
                transpose_row_type: 'month',
                transpose_month_index: monthIndex,
            };

            businessGroups.forEach((group) => {
                group.leaves.forEach((leaf) => {
                    monthSummaryRow[`biz_${leaf.key}`] = toNumber(leaf[`total_actual_${monthKey}`]);
                });
            });

            if (totalRow) {
                monthSummaryRow.biz_total = toNumber(totalRow[`total_actual_${monthKey}`]);
            }

            rows.push(monthSummaryRow);

            metricDefs.forEach((metric) => {
                if ('isRemark' in metric && metric.isRemark) {
                    const remarkRow: DataType = {
                        key: `transpose-${rowCounter++}`,
                        unit: `- ${metric.label}`,
                        transpose_row_type: 'remark',
                        transpose_month_index: monthIndex,
                        transpose_label_class: metric.textClass,
                    };

                    businessGroups.forEach((group) => {
                        group.leaves.forEach((leaf) => {
                            remarkRow[`biz_${leaf.key}`] = String(leaf[`remark_${monthKey}`] ?? '');
                        });
                    });

                    if (totalRow) remarkRow.biz_total = '';
                    rows.push(remarkRow);
                    return;
                }

                const valueRow: DataType = {
                    key: `transpose-${rowCounter++}`,
                    unit: `- ${metric.label} | จำนวน`,
                    transpose_row_type: 'value',
                    transpose_month_index: monthIndex,
                    transpose_label_class: metric.textClass,
                };

                businessGroups.forEach((group) => {
                    group.leaves.forEach((leaf) => {
                        valueRow[`biz_${leaf.key}`] = toNumber(leaf[`${metric.key}_${monthKey}`]);
                    });
                });

                if (totalRow) {
                    valueRow.biz_total = toNumber(totalRow[`${metric.key}_${monthKey}`]);
                }
                rows.push(valueRow);

                if (metric.showDiff) {
                    const diffRow: DataType = {
                        key: `transpose-${rowCounter++}`,
                        unit: `- ${metric.label} | +/-`,
                        transpose_row_type: 'diff',
                        transpose_month_index: monthIndex,
                        transpose_label_class: metric.textClass,
                    };

                    businessGroups.forEach((group) => {
                        group.leaves.forEach((leaf) => {
                            const currentKey = `${metric.key}_${monthKey}`;
                            const prevKey = `${metric.key}_${prevMonthKey}`;
                            diffRow[`biz_${leaf.key}`] = getDiffValue(leaf, currentKey, prevKey);
                        });
                    });

                    if (totalRow) {
                        const currentKey = `${metric.key}_${monthKey}`;
                        const prevKey = `${metric.key}_${prevMonthKey}`;
                        diffRow.biz_total = getDiffValue(totalRow, currentKey, prevKey);
                    }
                    rows.push(diffRow);
                }
            });
        });

        return {
            transposedColumns: columns,
            transposedData: rows,
        };
    }, [businessTreeData, data, months, checkedList, selectedDatasets]);

    const tableColumns = viewMode === 'transposed' ? transposedColumns : normalColumns;
    const tableData = viewMode === 'transposed' ? transposedData : businessTreeData;

    return (
        <Main currentPath="/report" hideChrome={isFullscreen}>
            <div className={`w-full min-w-0 ${isFullscreen ? 'h-screen overflow-hidden bg-white p-4 flex flex-col gap-4' : 'space-y-6'}`}>
                {!isFullscreen && (
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
                )}

                <div
                    className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 relative z-50 ${
                        isFullscreen ? 'shrink-0' : ''
                    }`}
                >
                    <Form
                        layout="inline"
                        onFinish={onSearch}
                        initialValues={{ startMonth, endMonth }}
                        className="flex items-center gap-2"
                    >
                        <Form.Item label="ตั้งแต่" name="startMonth" className="m-0">
                            <DatePicker picker="month" format="MMMM YYYY" allowClear={false} onChange={onStartMonthChange} />
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
                                icon={<SwapOutlined />}
                                onClick={() => setViewMode((prev) => (prev === 'normal' ? 'transposed' : 'normal'))}
                                className="text-gray-700 border-gray-300 hover:text-blue-600 hover:border-blue-500"
                            >
                                {viewMode === 'normal' ? 'สลับมุมมอง' : 'มุมมองปกติ'}
                            </Button>

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
                    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 relative z-0 ${isFullscreen ? 'mt-0 flex-1 min-h-0' : 'mt-4'}`}>
                        <div
                            className={`${
                                isFullscreen
                                    ? 'h-[calc(100vh-210px)] min-h-0 overflow-hidden'
                                    : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-2rem)] overflow-hidden'
                            }`}
                        >
                            <Table
                                columns={tableColumns}
                                dataSource={tableData}
                                loading={loading}
                                bordered
                                size="small"
                                scroll={{
                                    x: 'max-content',
                                    y: isFullscreen ? 'calc(100vh - 270px)' : 600,
                                }}
                                pagination={false}
                                expandable={viewMode === 'normal' ? { defaultExpandAllRows: true } : undefined}
                                rowClassName={(record) => {
                                    const rowType = String(record.transpose_row_type || '');
                                    if (rowType === 'month') return 'bg-gray-100 font-semibold';
                                    return '';
                                }}
                                className="[&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                            />
                        </div>
                    </div>
                )}
            </div>
        </Main>
    );
}
