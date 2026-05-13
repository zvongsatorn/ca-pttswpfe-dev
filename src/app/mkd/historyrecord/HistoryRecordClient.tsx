'use client';

import { buildAuthHeaders, buildSafeRoutePathFromSearch, postSafeRouteJson, setLocalText, toSafePathSegment } from '@/utils/security';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import TH_Locale from 'antd/es/date-picker/locale/th_TH';
import generatePicker from 'antd/es/date-picker/generatePicker';
import dayjsGenerateConfig from 'rc-picker/es/generate/dayjs';

dayjs.extend(buddhistEra);

// Override the date picker locale to support Buddhist Era year
const customLocale = {
  ...TH_Locale,
  lang: {
    ...TH_Locale.lang,
    yearFormat: 'BBBB',
  },
};

// Extend dayjs config to use BBBB for year rendering
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
import {
    Search,
    BarChart3
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface HistoryRecordClientProps {
    token: string;
    currentUser: {
        employeeID?: string;
        EmployeeID?: string;
        userGroupNo?: string;
        roleId?: string;
        role?: string;
        userGroups?: { userGroupNo: string }[];
    } | null;
    initialYears: string[];
}

interface HistoryRecord {
    no: number;
    ManDriverID: string | number;
    RequestNo?: string;
    fullRequestNo?: string;
    datebd?: string;
    OrgUnitName?: string;
    EmpName?: string;
    CreateBy?: string;
    CreateDateBD?: string;
    StatusName?: string;
    AppStatusName?: string;
    ManDriverStatus?: string | number;
    status: string;
    manStatus: number;
}

export default function HistoryRecordClient({ token, currentUser, initialYears }: HistoryRecordClientProps) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mkd_historyrecord_year') || (dayjs().year() + 543).toString();
        }
        return (dayjs().year() + 543).toString();
    });
    const [statusFilter, setStatusFilter] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mkd_historyrecord_status') || 'ทั้งหมด';
        }
        return 'ทั้งหมด';
    });

    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');

    // Column Filters
    const [filterReqNo, setFilterReqNo] = useState('');
    const [filterReqDate, setFilterReqDate] = useState('');
    const [filterOrgUnit, setFilterOrgUnit] = useState('');
    const [filterCreateBy, setFilterCreateBy] = useState('');

    const normalizeUserGroupNo = (value: string): string => {
        const trimmed = value.trim();
        if (!trimmed) return '';
        return /^\d+$/.test(trimmed) ? trimmed.padStart(2, '0') : trimmed;
    };

    // --- Data Fetching ---
    const fetchHistory = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const numericYear = parseInt(selectedYear);
            const ceYear = numericYear > 2500 ? (numericYear - 543).toString() : selectedYear;

            let userGroupNo = '';
            if (typeof window !== 'undefined') {
                userGroupNo = localStorage.getItem('selected_usergroup') || '';
            }
            if (!userGroupNo) {
                userGroupNo = currentUser.userGroupNo || currentUser.roleId || currentUser.role || '';
            }
            if (!userGroupNo && currentUser.userGroups && currentUser.userGroups.length > 0) {
                userGroupNo = currentUser.userGroups[0].userGroupNo || '';
            }

            const resolvedUserGroupNo = normalizeUserGroupNo(userGroupNo);
            const employeeId = currentUser.employeeID || currentUser.EmployeeID || 'SYSTEM';
            const canViewAllRecords = resolvedUserGroupNo === '04';

            const query = new URLSearchParams({
                EffectiveYear: ceYear,
                EmployeeID: canViewAllRecords ? '' : employeeId,
                UserGroupNo: resolvedUserGroupNo,
                OrgUnitNo: '',
                RequestType: '2'
            });

            const res = await fetch(buildSafeRoutePathFromSearch('mkdHistory', query), {
                headers: buildAuthHeaders(token)
            });
            const result = (await res.json()) as { success: boolean; data: Omit<HistoryRecord, 'no' | 'status' | 'manStatus'>[] };
            if (result.success) {
                setRecords(result.data.map((item: Omit<HistoryRecord, 'no' | 'status' | 'manStatus'>, idx: number): HistoryRecord => ({
                    ...item,
                    no: idx + 1,
                    status: item.StatusName || item.AppStatusName || '-',
                    manStatus: Number(item.ManDriverStatus) || 0
                })));
            }
        } catch (error: unknown) {
            console.error('Error fetching history:', error);
            toast.error('ไม่สามารถดึงข้อมูลประวัติได้');
        } finally {
            setLoading(false);
        }
    }, [selectedYear, currentUser, token]);

    useEffect(() => {
        fetchHistory();
        setLocalText('mkd_historyrecord_year', selectedYear);
    }, [selectedYear, fetchHistory]);

    useEffect(() => {
        setLocalText('mkd_historyrecord_status', statusFilter);
    }, [statusFilter]);

    // --- Actions ---
    const handleCreateRecord = async () => {
        if (!currentUser) {
            toast.error('ไม่พบข้อมูลผู้ใช้งาน');
            return;
        }
        if (!newUnitName.trim()) {
            toast.warning('กรุณาระบุชื่อหน่วยงาน');
            return;
        }

        try {
            setLoading(true);
            const numericYear = parseInt(selectedYear);
            const ceYear = numericYear > 2500 ? (numericYear - 543).toString() : selectedYear;

            // 1. Create New
            const res = await postSafeRouteJson('mkd', {
                EffectiveYear: ceYear,
                RequestType: 2,
                OrgUnitNo: '',
                OrgUnitName: newUnitName,
                CreateBy: currentUser.employeeID || currentUser.EmployeeID
            }, {
                headers: buildAuthHeaders(token)
            });
            const result = (await res.json()) as { success: boolean; message?: string; data?: { ManDriverID: string | number } | { ManDriverID: string | number }[] };
            if (result.success) {
                toast.success('สร้างรายการสำเร็จ');
                setIsNewModalOpen(false);
                setNewUnitName('');
                const newId = (result.data as { ManDriverID: string | number })?.ManDriverID || (Array.isArray(result.data) && result.data[0]?.ManDriverID);
                if (newId) router.push(`/mkd/historyrecord/${toSafePathSegment(newId)}`);
            } else {
                toast.error(result.message || 'สร้างรายการไม่สำเร็จ');
            }
        } catch (error: unknown) {
            console.error('Error creating record:', error);
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: number) => {
        if (status === 2 || status === 3) return 'text-green-700';
        if (status === 1) return 'text-blue-700';
        if (status <= 0) return 'text-red-700';
        return 'text-slate-600';
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const reqNo = (r.fullRequestNo || r.RequestNo || '').toLowerCase();
            const reqDate = r.datebd ? dayjs(r.datebd).format('DD/MM/YYYY') : '';
            const orgUnit = (r.OrgUnitName || '').toLowerCase();
            const createBy = (r.EmpName || r.CreateBy || '').toLowerCase();
            const status = (r.status || '').trim();

            if (filterReqNo && !reqNo.includes(filterReqNo.toLowerCase())) return false;
            if (filterReqDate && !reqDate.includes(filterReqDate)) return false;
            if (filterOrgUnit && !orgUnit.includes(filterOrgUnit.toLowerCase())) return false;
            if (filterCreateBy && !createBy.includes(filterCreateBy.toLowerCase())) return false;
            if (statusFilter !== 'ทั้งหมด' && status !== statusFilter) return false;
            return true;
        });
    }, [records, filterReqNo, filterReqDate, filterOrgUnit, filterCreateBy, statusFilter]);

    const statusFilterOptions = useMemo(() => {
        const statuses = Array.from(
            new Set(
                records
                    .map((r) => (r.status || '').trim())
                    .filter((s) => s.length > 0 && s !== '-')
            )
        );
        return ['ทั้งหมด', ...statuses];
    }, [records]);

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="max-w-[1400px] mx-auto space-y-4">
                {/* Header Card */}
                <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 shadow-lg py-2 text-white">
                    <CardContent>
                        <h1 className="text-2xl font-bold">History Manpower Key Driver (Record)</h1>
                    </CardContent>
                </Card>

                {/* Filter Section */}
                <Card className="bg-white border-0 shadow-sm py-2">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                            <div className="w-full lg:w-auto">
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">Year</Label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialYears.map((y: string) => (
                                            <SelectItem key={y} value={y}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={fetchHistory} className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-bold" disabled={loading}>
                                {loading ? '...' : 'OK'}
                            </Button>

                            <Button onClick={() => setIsNewModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-8 ml-auto font-bold">
                                NEW RECORD
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table Section */}
                <Card className="bg-white border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-20 bg-blue-100 shadow-[0_2px_2px_-1px_rgba(0,0,0,0.1)]">
                                    <tr className="bg-blue-100 border-b-2 border-blue-200">
                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-16">No</th>
                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Req.No</th>
                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Req.Date</th>
                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">OrgUnit</th>
                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Create By</th>
                                        <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-32">Detail</th>
                                    </tr>
                                    <tr className="bg-blue-50 border-b z-20 shadow-sm">
                                        <th className="px-4 py-3"></th>
                                        <th className="px-4 py-3">
                                            <Input className="bg-white h-9 text-xs" value={filterReqNo} onChange={e => setFilterReqNo(e.target.value)} placeholder="" />
                                        </th>
                                        <th className="px-4 py-3">
                                            <BDatePicker
                                                locale={customLocale}
                                                className="w-full h-9 text-xs"
                                                format="DD/MM/BBBB"
                                                placeholder=""
                                                value={filterReqDate ? dayjs(filterReqDate, 'DD/MM/BBBB') : null}
                                                onChange={(date, dateString) => {
                                                    setFilterReqDate(Array.isArray(dateString) ? dateString[0] : (dateString || ''));
                                                }}
                                                allowClear
                                            />
                                        </th>
                                        <th className="px-4 py-3">
                                            <Input className="bg-white h-9 text-xs" value={filterOrgUnit} onChange={e => setFilterOrgUnit(e.target.value)} placeholder="" />
                                        </th>
                                        <th className="px-4 py-3">
                                            <Input className="bg-white h-9 text-xs" value={filterCreateBy} onChange={e => setFilterCreateBy(e.target.value)} placeholder="" />
                                        </th>
                                        <th className="px-4 py-3">
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="bg-white h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statusFilterOptions.map((status) => (
                                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-500">Loading...</td>
                                        </tr>
                                    ) : filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">ไม่พบข้อมูล</td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((r, idx) => (
                                        <tr key={r.ManDriverID || idx} className="border-b hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-center font-medium text-gray-500">{r.no}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-blue-700">{r.fullRequestNo || r.RequestNo || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{r.datebd ? dayjs(r.datebd).format('DD/MM/YYYY') : '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700 font-medium">{r.OrgUnitName || '-'}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 text-xs">{r.EmpName || r.CreateBy}</span>
                                                    <span className="text-[10px] text-gray-400">{r.CreateDateBD}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`font-bold text-sm ${getStatusColor(r.manStatus)}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => router.push(`/mkd/historyrecord/${toSafePathSegment(r.ManDriverID)}`)} className="p-1.5 hover:bg-blue-50 rounded-full transition-colors group">
                                                        <Search className="h-5 w-5 text-blue-500 group-hover:text-blue-700 cursor-pointer" />
                                                    </button>
                                                    {(r.manStatus === 2 || r.manStatus === 3) && (
                                                        <button onClick={() => router.push(`/mkd/dashboard/${toSafePathSegment(r.ManDriverID)}`)} className="p-1.5 hover:bg-emerald-50 rounded-full transition-colors group">
                                                            <BarChart3 className="h-5 w-5 text-emerald-500 group-hover:text-emerald-700 cursor-pointer" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* New Record Modal */}
            <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-blue-700">สร้าง Manpower Key Driver (Record)</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                        <div>
                            <Label htmlFor="unitName" className="text-sm font-semibold text-gray-600 mb-2 block">หน่วยงาน (Unit Name)</Label>
                            <Input
                                id="unitName"
                                placeholder="ระบุชื่อหน่วยงาน..."
                                value={newUnitName}
                                onChange={e => setNewUnitName(e.target.value)}
                                className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>CANCEL</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateRecord} disabled={loading}>
                            {loading ? 'กำลังสร้าง...' : 'CREATE'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
