'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Main from '@/components/layout/main';
import { Select, Button, Table } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import TH_Locale from 'antd/es/date-picker/locale/th_TH';

// Components UI standard (shadcn/custom)
import { Card, CardContent } from '@/components/ui/card';
import { Search, LayoutDashboard } from 'lucide-react';
import { saveExcelFile } from '@/utils/fileDownload';

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
}

interface RawUnitData {
    id: string;
    name?: string;
    unitText?: string;
    OrgUnitNo?: string;
    UnitName?: string;
}

interface RawDashboardRow {
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
    const [employeeType, setEmployeeType] = useState('0'); // 0: พนง. ทั้งหมด, 1: พนง.ปตท., 2: Secondment
    const [showContractOut, setShowContractOut] = useState('1'); // 1: ไม่แสดง Contract out, 2: แสดง Contract out
    const [unit, setUnit] = useState<string | undefined>(undefined);
    
    const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
    const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState({
        showContractOut: '1'
    });

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

    // Initial Unit Load
    useEffect(() => {
        const fetchUnits = async () => {
            const { employeeId, userGroupNo } = resolveUserContext();
            const dateStr = filterDate.format('YYYY-MM-01');

            let units: RawUnitData[] = [];
            if (employeeId && employeeId !== 'SYSTEM' && userGroupNo) {
                const scopedRes = await fetch(`/api/units/by-role?empId=${employeeId}&roleId=${userGroupNo}`);
                if (scopedRes.ok) {
                    const scopedData = await scopedRes.json();
                    if (scopedData.success && scopedData.data) {
                        units = scopedData.data;
                    }
                }
            }

            if (units.length === 0) {
                const fallbackRes = await fetch(`/api/units/all?effectiveDate=${dateStr}`);
                if (fallbackRes.ok) {
                    const fallbackData = await fallbackRes.json();
                    if (fallbackData.success && fallbackData.data) {
                        units = fallbackData.data;
                    }
                }
            }

            const mappedOptions = units.map((u: RawUnitData) => {
                const id = String(u.id || u.OrgUnitNo || '').trim();
                const name = (u.name || u.UnitName || u.unitText || id).trim();
                return {
                    value: id,
                    label: `${id} - ${name}`
                };
            }).filter((u: UnitOption) => u.value);

            setUnitOptions(mappedOptions);
            if (mappedOptions.length > 0) {
                setUnit((prev) => prev || mappedOptions[0].value);
            }
        };
        fetchUnits();
        // resolveUserContext is stable enough for client-side localStorage reads
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDate]);

    // Data Load function
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { employeeId, userGroupNo } = resolveUserContext();

            // employeeType correlates to isSecondment setting 
            const isSecondmentId = parseInt(employeeType); 
            // Leveltype handling
            const levelType = parseInt(showContractOut);
            const monthStr = (filterDate.month() + 1).toString().padStart(2, '0');
            // Assuming the picker keeps Buddhist Era correctly
            const yearStr = (filterDate.year() > 2500 ? filterDate.year() - 543 : filterDate.year()).toString();

            const divisionForQuery = unit || unitOptions[0]?.value || '';

            const query = new URLSearchParams({
                effectiveMonth: monthStr,
                effectiveYear: yearStr,
                employeeId,
                userGroupNo,
                isSecondment: isSecondmentId.toString(),
                levelType: levelType.toString(),
                division: divisionForQuery
            });

            const res = await fetch(`/api/report/dashboard?${query}`);
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
                            contractOut: safeNum(row.c),
                            contractSub: safeNum(row.csub),
                            frame: sumQ,
                            employee: sumM,
                            recruit: sumF,
                            vacancy: sumT
                        };
                    });
                    setDashboardData(parsedData);
                    setAppliedFilters({
                        showContractOut: showContractOut
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, [filterDate, employeeType, showContractOut, unit, unitOptions]);

    useEffect(() => {
        if (unitOptions.length > 0) {
            loadData();
        }
    }, [loadData, unitOptions]);


    // Determine which bars to show based on filters logic in applied (last searched) state
    const isShowingContractOut = appliedFilters.showContractOut === '2'; // '2' = แสดง Contract out

    // --- Summary Calculation ---
    const summary = dashboardData.reduce(
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
            const levelType = parseInt(showContractOut);
            const monthStr = (filterDate.month() + 1).toString().padStart(2, '0');
            const yearStr = (filterDate.year() > 2500 ? filterDate.year() - 543 : filterDate.year()).toString();

            const divisionForQuery = unit || unitOptions[0]?.value || '';

            const query = new URLSearchParams({
                effectiveMonth: monthStr,
                effectiveYear: yearStr,
                employeeId,
                userGroupNo,
                isSecondment: isSecondmentId.toString(),
                levelType: levelType.toString(),
                division: divisionForQuery
            });

            const res = await fetch(`/api/report/dashboard/excel?${query}`);
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
        return (
            <div className="overflow-x-auto overflow-y-hidden">
                <div style={{ width: Math.max(800, dashboardData.length * 40) }}>
                    <ResponsiveContainer width="100%" height={500}>
                        <BarChart
                            data={dashboardData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                            <Legend verticalAlign="top" height={36} />

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
        );
    }, [dashboardData, isShowingContractOut]);

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
                                    { value: '0', label: 'พนง. ทั้งหมด' },
                                    { value: '1', label: 'พนง. ปตท.' },
                                    { value: '2', label: 'Secondment' }
                                ]}
                                className="w-40"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                             <Select
                                value={showContractOut}
                                onChange={setShowContractOut}
                                options={[
                                    { value: '1', label: 'ไม่แสดง Contract out' },
                                    { value: '2', label: 'แสดง Contract out' },
                                ]}
                                className="w-48"
                            />
                        </div>

                        <div className="flex items-center gap-2 border-l border-gray-200 pl-4 flex-1">
                             <Select
                                placeholder="เลือกสายงาน..."
                                value={unit}
                                onChange={setUnit}
                                allowClear
                                className="w-full max-w-sm"
                                options={unitOptions}
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </div>

                        <Button 
                            type="primary" 
                            danger 
                            icon={<Search size={16} />} 
                            onClick={loadData}
                            className="bg-red-600 hover:bg-red-700 min-w-24 text-white font-bold ml-auto"
                            loading={loading}
                        >
                            Search
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
