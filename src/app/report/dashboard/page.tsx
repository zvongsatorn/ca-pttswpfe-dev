'use client';

import { buildApiPath, buildApiPathFromSearch } from '@/utils/security';
import React, { useState, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Select, Button, Table } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList } from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import TH_Locale from 'antd/es/date-picker/locale/th_TH';

// Components UI standard (shadcn/custom)
import { Card, CardContent } from '@/components/ui/card';
import { Search, LayoutDashboard } from 'lucide-react';
import { saveExcelFile } from '@/utils/fileDownload';
import MultiSelectFilter from '@/components/filters/MultiSelectFilter';

// Setup dayjs
dayjs.extend(buddhistEra);
dayjs.locale('th');

// AntD Custom Locale setup
const customLocale = {
  ...TH_Locale,
  lang: {
    ...TH_Locale.lang,
    yearFormat: 'BBBB',
  },
};
import generatePicker from 'antd/es/date-picker/generatePicker';
import dayjsGenerateConfig from 'rc-picker/es/generate/dayjs';
const customGenerateConfig = {
  ...dayjsGenerateConfig,
  getYear: (date: dayjs.Dayjs) => date.year(),
  format: (locale: string, date: dayjs.Dayjs, format: string) => {
    if (format === 'YYYY') return date.format('BBBB');
    if (format === 'YYYY-MM') return date.format('BBBB-MM');
    return date.format(format);
  }
};
const BDatePicker = generatePicker<dayjs.Dayjs>(customGenerateConfig);

// --- Types ---
interface DashboardData {
    name: string;
    orgUnitNo: string;
    bgNo: string;
    contractOut: number;
    contractSub: number;
    frame: number;
    employee: number;
    recruit: number;
    vacancy: number;
}

interface UnitOption {
    value: string;
    label: string;
    isAssistant?: number;
    isUnder?: number;
}

interface RawUnitData {
    id: string;
    name?: string;
    unitText?: string;
    OrgUnitNo?: string;
    UnitName?: string;
    IsAssistant?: number;
    IsUnder?: number;
}

interface RawDashboardRow {
    OrgUnitNo?: string | number;
    BGNo?: string | number;
    UnitAbbr?: string;
    c?: string | number;
    csub?: string | number;
    q_1?: string | number;
    q_2?: string | number;
    q_3?: string | number;
    q_4?: string | number;
    q_5?: string | number;
    q_6?: string | number;
    q_7?: string | number;
    m_1?: string | number;
    m_2?: string | number;
    m_3?: string | number;
    m_4?: string | number;
    m_5?: string | number;
    m_6?: string | number;
    m_7?: string | number;
    f_1?: string | number;
    f_2?: string | number;
    f_3?: string | number;
    f_4?: string | number;
    f_5?: string | number;
    f_6?: string | number;
    f_7?: string | number;
    t_1?: string | number;
    t_2?: string | number;
    t_3?: string | number;
    t_4?: string | number;
    t_5?: string | number;
    t_6?: string | number;
    t_7?: string | number;
}

interface UserGroupOption {
    userGroupNo?: string;
}

interface UserContext {
    employeeID?: string;
    employeeId?: string;
    EmployeeID?: string;
    roleId?: string;
    role?: string;
    userGroupNo?: string;
    userGroups?: UserGroupOption[];
}

// --- Custom Tooltip ---
interface CustomTooltipProps {
    active?: boolean;
    payload?: {
        name: string;
        value: number;
        color: string;
        payload: DashboardData;
    }[];
    label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 border border-gray-200 shadow-md rounded text-sm font-sans">
                <p className="font-bold mb-1">{label}</p>
                {payload?.map((entry, index) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [filterDate, setFilterDate] = useState(dayjs());
    // Legacy mapping on backend subtracts 1 from this value:
    // 1 => all, 2 => พนง. ปตท., 3 => Secondment
    const [employeeType, setEmployeeType] = useState('1');
    const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'BU', 'LINE', 'UNIT'
    const [units, setUnits] = useState<string[]>([]);
    const [appliedUnits, setAppliedUnits] = useState<string[]>([]);

    const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
    const [businessUnitOptions, setBusinessUnitOptions] = useState<UnitOption[]>([]);
    const [lineOfWorkOptions, setLineOfWorkOptions] = useState<UnitOption[]>([]);
    const [orgUnitOptions, setOrgUnitOptions] = useState<UnitOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const resolveUserContext = () => {
        let employeeId = 'SYSTEM';
        let userGroupNo = '';

        if (typeof window !== 'undefined') {
            const selectedGroup = localStorage.getItem('selected_usergroup')?.trim() || '';
            const userDataStr = localStorage.getItem('user_data');

            if (userDataStr) {
                try {
                    const userData = JSON.parse(userDataStr) as UserContext;
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
                    // Ignore parsing errors and keep defaults.
                }
            }
        }

        return { employeeId, userGroupNo };
    };

    // Helper for safe numeric conversion to avoid TS errors
    const safeNum = (v: string | number | boolean | undefined | null): number => {
        if (v === undefined || v === null || typeof v === 'boolean') return 0;
        return typeof v === 'number' ? v : (parseInt(v) || 0);
    };

    const filteredUnitOptions = React.useMemo(() => {
        if (filterType === 'BU') return businessUnitOptions;
        if (filterType === 'LINE') return lineOfWorkOptions;
        if (filterType === 'UNIT') return orgUnitOptions;

        // ALL
        const all = [...businessUnitOptions, ...lineOfWorkOptions, ...orgUnitOptions];
        const unique = new Map(all.map(item => [item.value, item]));
        return Array.from(unique.values());
    }, [filterType, businessUnitOptions, lineOfWorkOptions, orgUnitOptions]);

    useEffect(() => {
        setUnits([]);
    }, [filterType]);

    // Initial Unit Load
    useEffect(() => {
        const fetchUnits = async () => {
            const { employeeId, userGroupNo } = resolveUserContext();
            const dateStr = filterDate.format('YYYY-MM-01');

            try {
                const res = await fetch(buildApiPath('/api/report/report3/filters', { effectiveDate: dateStr, employeeId, userGroupNo, division: '' }));
                if (res.ok) {
                    const result = await res.json();
                    if (result.status === 200 && result.data) {
                        const toText = (v: any) => String(v || '').trim();
                        const cleanUnitText = (str: string) => {
                            if (!str) return '';
                            let s = str.trim();
                            if (s.toLowerCase().startsWith('รหัสหน่วยงาน:')) s = s.substring('รหัสหน่วยงาน:'.length).trim();
                            if (s.toLowerCase().startsWith('รหัส:')) s = s.substring('รหัส:'.length).trim();
                            const dashMatch = s.match(/^[0-9]{5,10}\s*-\s*/);
                            if (dashMatch) s = s.substring(dashMatch[0].length).trim();
                            return s;
                        };

                        const toBgOption = (row: any): UnitOption | null => {
                            const value = toText(row.BGNo);
                            const label = toText(row.BGName);
                            if (!value || !label) return null;
                            return { value, label };
                        };

                        const toLineOption = (row: any): UnitOption | null => {
                            const value = toText(row.OrgUnitNo);
                            const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
                            if (!value || !label) return null;
                            return { value, label: `${value} - ${label}` };
                        };

                        const toUnitOption = (row: any): UnitOption | null => {
                            const value = toText(row.OrgUnitNo);
                            const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
                            if (!value || !label) return null;
                            return { value, label: `${value} - ${label}` };
                        };

                        // Helper for uniqueness
                        const uniqueOptions = (opts: UnitOption[]) => {
                            const seen = new Set<string>();
                            return opts.filter(o => {
                                if (seen.has(o.value)) return false;
                                seen.add(o.value);
                                return true;
                            });
                        };

                        setBusinessUnitOptions(uniqueOptions(result.data.businessUnits.map(toBgOption).filter((v: any) => v)));
                        setLineOfWorkOptions(uniqueOptions(result.data.lines.map(toLineOption).filter((v: any) => v)));
                        setOrgUnitOptions(uniqueOptions(result.data.units.map(toUnitOption).filter((v: any) => v)));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch report3/filters", err);
            }
        };
        fetchUnits();
    }, [filterDate]);

    // Data Load function
    const loadData = useCallback(async () => {
        setHasSearched(true);
        setLoading(true);
        setAppliedUnits([...units]);
        try {
            const { employeeId, userGroupNo } = resolveUserContext();

            // employeeType correlates to isSecondment setting
            const isSecondmentId = parseInt(employeeType);
            const monthStr = (filterDate.month() + 1).toString().padStart(2, '0');
            // Assuming the picker keeps Buddhist Era correctly
            const yearStr = (filterDate.year() > 2500 ? filterDate.year() - 543 : filterDate.year()).toString();

            const query = new URLSearchParams({
                effectiveMonth: monthStr,
                effectiveYear: yearStr,
                employeeId,
                userGroupNo,
                isSecondment: isSecondmentId.toString(),
                division: ''
            });

            const res = await fetch(buildApiPathFromSearch('/api/report/dashboard', query));
            if (res.ok) {
                const result = await res.json();
                if (result.status === 200 && result.data) {
                    // Map legacy data to new standard
                    const parsedData: DashboardData[] = result.data.map((row: RawDashboardRow) => {
                        const sumQ = safeNum(row.q_1) + safeNum(row.q_2) + safeNum(row.q_3) + safeNum(row.q_4) + safeNum(row.q_5) + safeNum(row.q_6) + safeNum(row.q_7);
                        const sumM = safeNum(row.m_1) + safeNum(row.m_2) + safeNum(row.m_3) + safeNum(row.m_4) + safeNum(row.m_5) + safeNum(row.m_6) + safeNum(row.m_7);
                        const sumF = safeNum(row.f_1) + safeNum(row.f_2) + safeNum(row.f_3) + safeNum(row.f_4) + safeNum(row.f_5) + safeNum(row.f_6) + safeNum(row.f_7);
                        const sumT = safeNum(row.t_1) + safeNum(row.t_2) + safeNum(row.t_3) + safeNum(row.t_4) + safeNum(row.t_5) + safeNum(row.t_6) + safeNum(row.t_7);

                        return {
                            name: row.UnitAbbr || 'N/A',
                            orgUnitNo: String(row.OrgUnitNo || ''),
                            bgNo: String(row.BGNo || ''),
                            contractOut: safeNum(row.c),
                            contractSub: safeNum(row.csub),
                            frame: sumQ,
                            employee: sumM,
                            recruit: sumF,
                            vacancy: sumT
                        };
                    });
                    setDashboardData(parsedData);
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, [filterDate, employeeType, units]);

    const displayData = React.useMemo(() => {
        if (!appliedUnits || appliedUnits.length === 0) return dashboardData;
        return dashboardData.filter(item => appliedUnits.includes(item.bgNo) || appliedUnits.includes(item.orgUnitNo));
    }, [dashboardData, appliedUnits]);


    // Determine which bars to show based on filters logic in applied (last searched) state
    const isShowingContractOut = true; // Always แสดง Contract out

    // --- Summary Calculation ---
    const summary = displayData.reduce(
        (acc, curr) => ({
            contractOut: acc.contractOut + curr.contractOut,
            contractSub: acc.contractSub + curr.contractSub,
            frame: acc.frame + curr.frame,
            employee: acc.employee + curr.employee,
            recruit: acc.recruit + curr.recruit,
            vacancy: acc.vacancy + curr.vacancy,
        }),
        { contractOut: 0, contractSub: 0, frame: 0, employee: 0, recruit: 0, vacancy: 0 }
    );

    const summaryTableData = [
        { key: '1', item: 'Contract out', amount: summary.contractOut },
        { key: '2', item: 'Contract สัญญาย่อย', amount: summary.contractSub },
        { key: '3', item: 'กรอบอัตรา', amount: summary.frame },
        { key: '4', item: 'จำนวนพนักงาน', amount: summary.employee },
        { key: '5', item: 'ค้างสรรหา', amount: summary.recruit },
        { key: '6', item: 'อัตราว่าง', amount: summary.vacancy },
    ];

    const summaryColumns = [
        { title: 'รายการ', dataIndex: 'item', key: 'item', onHeaderCell: () => ({ className: 'bg-orange-100! font-bold' }), className: 'bg-blue-100 font-bold', width: '200px' },
        { title: 'จำนวน', dataIndex: 'amount', key: 'amount', onHeaderCell: () => ({ className: 'bg-orange-100! font-bold' }), align: 'center' as const, render: (val: number) => val.toLocaleString(), width: '200px' },
    ];

    const handleExportExcel = async () => {
        setLoading(true);
        try {
            const { employeeId, userGroupNo } = resolveUserContext();

            const isSecondmentId = parseInt(employeeType);
            const monthStr = (filterDate.month() + 1).toString().padStart(2, '0');
            const yearStr = (filterDate.year() > 2500 ? filterDate.year() - 543 : filterDate.year()).toString();

            const selectedOrgUnits = (() => {
                if (units.length === 0 || filterType === 'ALL') return [] as string[];
                if (filterType === 'UNIT' || filterType === 'LINE') return Array.from(new Set(units));
                // BU: map selected BG to OrgUnitNo list from currently loaded dashboard rows.
                return Array.from(new Set(
                    dashboardData
                        .filter((item) => units.includes(item.bgNo))
                        .map((item) => item.orgUnitNo)
                        .filter((v) => Boolean(v))
                ));
            })();

            const divisionForQuery = selectedOrgUnits.length === 1 ? selectedOrgUnits[0] : '';

            const query = new URLSearchParams({
                effectiveMonth: monthStr,
                effectiveYear: yearStr,
                employeeId,
                userGroupNo,
                isSecondment: isSecondmentId.toString(),
                division: divisionForQuery
            });
            if (selectedOrgUnits.length > 0) {
                query.set('orgUnits', selectedOrgUnits.join(','));
            }

            const res = await fetch(buildApiPathFromSearch('/api/report/dashboard/excel', query));
            if (res.ok) {
                const blob = await res.blob();
                await saveExcelFile(blob, `Dashboard_${yearStr}${monthStr}.xlsx`);
            } else {
                console.error('Failed to export excel');
            }
        } catch (error) {
            console.error('Failed to export excel', error);
        } finally {
            setLoading(false);
        }
    };

    const memoizedChart = React.useMemo(() => {
        const legendItems = [
            ...(isShowingContractOut
                ? [
                    { key: 'contractOut', label: 'Contract out', color: '#80a29b' },
                    { key: 'contractSub', label: 'Contract สัญญาย่อย', color: '#5a727b' },
                ]
                : []),
            { key: 'frame', label: 'กรอบอัตรา', color: '#3e2d43' },
            { key: 'recruit', label: 'ค้างสรรหา', color: '#db6458' },
            { key: 'employee', label: 'จำนวนพนักงาน', color: '#0682bb' },
            { key: 'vacancy', label: 'อัตราว่าง', color: '#d3908e' },
        ];

        return (
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-2">
                    {legendItems.map((item) => (
                        <div key={item.key} className="inline-flex items-center gap-2 whitespace-nowrap text-gray-600">
                            <span className="inline-block w-3 h-3 rounded-[2px]" style={{ backgroundColor: item.color }} />
                            <span className="text-base">{item.label}</span>
                        </div>
                    ))}
                </div>
                <div className="overflow-x-auto overflow-y-hidden">
                    <div style={{ width: Math.max(800, displayData.length * 40) }}>
                        <ResponsiveContainer width="100%" height={500}>
                            <BarChart
                                data={displayData}
                                margin={{ top: 8, right: 30, left: 20, bottom: 80 }}
                                barGap={5}
                                barCategoryGap="30%"
                                style={{ fontFamily: 'var(--font-thai), var(--font-eng), sans-serif' }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    tick={{ fontSize: 12 }}
                                    height={80}
                                />
                                <YAxis />
                                <RechartsTooltip content={<CustomTooltip />} />

                                {isShowingContractOut && (
                                    <>
                                        <Bar barSize={10} dataKey="contractOut" name="Contract out" fill="#80a29b" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="contractOut" position="top" fontSize={10} formatter={(val: string | number | boolean | null | undefined) => (val && Number(val) > 0) ? (val as string | number) : ''} />
                                        </Bar>
                                        <Bar barSize={10} dataKey="contractSub" name="Contract สัญญาย่อย" fill="#5a727b" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="contractSub" position="top" fontSize={10} formatter={(val: string | number | boolean | null | undefined) => (val && Number(val) > 0) ? (val as string | number) : ''} />
                                        </Bar>
                                    </>
                                )}

                                <Bar barSize={10} dataKey="frame" name="กรอบอัตรา" fill="#3e2d43" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="frame" position="top" fontSize={10} formatter={(val: string | number | boolean | null | undefined) => (val && Number(val) > 0) ? (val as string | number) : ''} />
                                </Bar>
                                <Bar barSize={10} dataKey="employee" name="จำนวนพนักงาน" fill="#0682bb" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="employee" position="top" fontSize={10} formatter={(val: string | number | boolean | null | undefined) => (val && Number(val) > 0) ? (val as string | number) : ''} />
                                </Bar>
                                <Bar barSize={10} dataKey="recruit" name="ค้างสรรหา" fill="#db6458" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="recruit" position="top" fontSize={10} formatter={(val: string | number | boolean | null | undefined) => (val && Number(val) > 0) ? (val as string | number) : ''} />
                                </Bar>
                                <Bar barSize={10} dataKey="vacancy" name="อัตราว่าง" fill="#d3908e" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="vacancy" position="top" fontSize={10} formatter={(val: string | number | boolean | null | undefined) => (val && Number(val) > 0) ? (val as string | number) : ''} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    }, [displayData, isShowingContractOut]);

    return (
        <Main currentPath="/report">
            <div className="space-y-4">
                {/* Header Match Design */}
                <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 shadow-lg py-2">
                    <CardContent className="flex items-center gap-3">
                        <LayoutDashboard className="text-white w-6 h-6" />
                        <h1 className="text-2xl font-bold text-white mb-0">
                            Dashboard
                        </h1>
                    </CardContent>
                </Card>

                {/* Filters Section Match Design Pattern */}
                <Card className="bg-white border-0 shadow-sm py-2">
                    <CardContent className="p-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 font-medium whitespace-nowrap">วันที่</span>
                            <BDatePicker
                                locale={customLocale}
                                value={filterDate}
                                onChange={(date) => setFilterDate(date || dayjs())}
                                format="DD/MM/YYYY"
                                className="w-32"
                                allowClear={false}
                            />
                        </div>

                        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                             <Select
                                value={employeeType}
                                onChange={setEmployeeType}
                                options={[
                                    { value: '1', label: 'พนง. ทั้งหมด' },
                                    { value: '2', label: 'พนง. ปตท.' },
                                    { value: '3', label: 'Secondment' }
                                ]}
                                className="w-40"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                             <span className="text-gray-600 font-medium whitespace-nowrap hidden sm:inline">ประเภท Filter</span>
                             <Select
                                value={filterType}
                                onChange={(val) => { setFilterType(val); }}
                                options={[
                                    { value: 'ALL', label: 'ทั้งหมด' },
                                    { value: 'BU', label: 'หน่วยธุรกิจ' },
                                    { value: 'LINE', label: 'สายงาน' },
                                    { value: 'UNIT', label: 'หน่วยงาน' },
                                ]}
                                className="w-32"
                            />
                        </div>

                        {filterType !== 'ALL' && (
                            <div className="flex items-center gap-2 border-l border-gray-200 pl-4 flex-1">
                                 <MultiSelectFilter
                                    label={`เลือก${filterType === 'BU' ? 'หน่วยธุรกิจ' : filterType === 'LINE' ? 'สายงาน' : 'หน่วยงาน'}`}
                                    options={filteredUnitOptions}
                                    selectedValues={units}
                                    onChange={setUnits}
                                    width="w-full max-w-sm"
                                />
                            </div>
                        )}

                        <Button
                            type="primary"
                            icon={<Search size={16} />}
                            onClick={loadData}
                            className="bg-blue-600! hover:bg-blue-700! border-none! min-w-24 text-white! font-bold ml-auto"
                            loading={loading}
                        >
                            ค้นหา
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleExportExcel}
                                icon={<FileExcelOutlined />}
                                className="bg-green-600! text-white! border-none! shadow-sm hover:!bg-green-700"
                            >
                                Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Chart Section */}
                    <div className="lg:col-span-9 bg-white p-4 rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
                        {loading && dashboardData.length === 0 ? (
                            <div className="w-full h-full flex justify-center items-center h-[500px]">Loading...</div>
                        ) : !hasSearched ? (
                            <div className="w-full h-full flex justify-center items-center text-gray-500 h-[500px]">เลือกเงื่อนไขแล้วกดค้นหา</div>
                        ) : dashboardData.length === 0 ? (
                            <div className="w-full h-full flex justify-center items-center text-gray-500 h-[500px]">ไม่พบข้อมูล</div>
                        ) : (
                            memoizedChart
                        )}
                    </div>

                    {/* Summary Table Section */}
                    <div className="lg:col-span-3">
                        <Table
                            columns={summaryColumns}
                            dataSource={summaryTableData}
                            pagination={false}
                            bordered
                            size="middle"
                            className="shadow-sm border border-gray-200 rounded-lg overflow-hidden
                                [&_.ant-table-thead_td]:bg-blue-600!
                                [&_.ant-table-thead_th]:text-white
                                [&_.ant-table-thead_th]:font-bold"
                        />
                    </div>
                </div>
            </div>
        </Main>
    );
}
