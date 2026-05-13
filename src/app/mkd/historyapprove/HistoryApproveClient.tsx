'use client';

import { buildAuthHeaders, buildMkdFilePath, buildMkdPath, buildSafeRoutePathFromSearch, openSafeApiPath, setLocalText, toSafePathSegment } from '@/utils/security';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Search,
  User,
  BarChart3,
  Check,
  ChevronsUpDown,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CurrentUser {
  employeeID?: string;
  EmployeeID?: string;
  userGroupNo?: string;
  roleId?: string;
  userGroups?: { userGroupNo: string }[];
  [key: string]: unknown;
}

interface RawMKDRecord {
  ManDriverStatus?: number;
  ApproveHistStatus?: number | null;
  AppStatusName?: string;
  StatusName?: string;
  datebd?: string | number | Date;
  UnitAllName?: string;
  OrgUnitName?: string;
  fullRequestNo?: string;
  RequestNo?: string;
  ManDriverID: string | number;
  ApproveID?: string | number;
  BGName?: string;
  OrgUnitNo?: string;
  EmpName?: string;
  CreateBy?: string;
  CreateDateBD?: string;
  Fullname?: string;
  PrevAppDateBD?: string;
  ConclusionNo?: string;
  MKDApprove?: number;
  FileUpload?: string | null;
}

interface MKDRecord {
  no: number;
  reqNo: string;
  mkdID: string;
  approveID?: string;
  reqDate: string;
  bu: string;
  orgUnit?: string;
  orgUnitOnly: string;
  division: string;
  orgUnitCode: string;
  createBy: string;
  createDate: string;
  approveSteps?: {
    step: string;
    approver: string;
    date: string;
    status?: number | null;
  };
  noConclusion: string;
  mkdCount: number;
  hasEdit: boolean;
  hasFlow: boolean;
  status: string;
  statusColor: string;
  manDriverStatus: number;
  approveHistStatus: number | null;
  fileUpload: string | null;
}

const statusOptions = [
  { value: 'ทั้งหมด', label: 'ทั้งหมด' },
  { value: 'ยกเลิก', label: 'ยกเลิก' },
  { value: 'รอขออนุมัติ', label: 'รอขออนุมัติ' },
  { value: 'รอเห็นชอบ', label: 'รอเห็นชอบ' },
  { value: 'เห็นชอบ', label: 'เห็นชอบ' },
  { value: 'เห็นชอบแล้ว', label: 'เห็นชอบแล้ว' },
  { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
  { value: 'ไม่เห็นชอบ', label: 'ไม่เห็นชอบ' },
  { value: 'ไม่อนุมัติ', label: 'ไม่อนุมัติ' },
];

interface HistoryApproveClientProps {
    token: string;
    currentUser: CurrentUser | null;
    initialYears: string[];
    initialUnits: { id: string; unitText: string; name?: string }[];
}

export default function HistoryApproveClient({ token, currentUser, initialYears, initialUnits }: HistoryApproveClientProps) {
  const router = useRouter();
  const [year, setYear] = useState(() => {
     if (typeof window !== 'undefined') {
         return localStorage.getItem('mkd_historyapprove_year') || (dayjs().year() + 543).toString();
     }
     return (dayjs().year() + 543).toString();
  });
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');

  const [records, setRecords] = useState<MKDRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [isMainComboboxOpen, setIsMainComboboxOpen] = useState(false);
  const [selectedMainUnit, setSelectedMainUnit] = useState(() => {
     if (typeof window !== 'undefined') {
         return localStorage.getItem('mkd_historyapprove_unit') || '';
     }
     return '';
  });

  const [filterReqNo, setFilterReqNo] = useState('');
  const [filterReqDate, setFilterReqDate] = useState('');
  const [filterBU, setFilterBU] = useState('');
  const [filterOrgUnit, setFilterOrgUnit] = useState('');
  const [filterCreateBy, setFilterCreateBy] = useState('');
  const [filterConclusion, setFilterConclusion] = useState('');

  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [flowData, setFlowData] = useState<{ Seqno: number; Fullname: string; posname?: string; StatusName?: string; ApproveHistStatus?: number; ApproveHistDateBD?: string; Remark?: string; }[]>([]);
  const [flowLoading, setFlowLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedStatus = localStorage.getItem('mkd_historyapprove_status');
    if (storedStatus) setStatusFilter(storedStatus.trim());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setLocalText('mkd_historyapprove_year', year);
      setLocalText('mkd_historyapprove_unit', selectedMainUnit);
      setLocalText('mkd_historyapprove_status', statusFilter);
    }
  }, [year, selectedMainUnit, statusFilter, isLoaded]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let employeeId = '';
      let userGroupNo = '';

      if (currentUser) {
          employeeId = currentUser.employeeID || '';
          userGroupNo = localStorage.getItem('selected_usergroup') || currentUser.userGroupNo || currentUser.roleId || '';
          if (!userGroupNo && currentUser.userGroups && currentUser.userGroups.length > 0) {
            userGroupNo = currentUser.userGroups[0].userGroupNo;
          }
      }

      const numericYear = parseInt(year);
      const ceYear = numericYear > 2500 ? (numericYear - 543).toString() : year;

      const query = new URLSearchParams({
        EffectiveYear: ceYear,
        division: selectedMainUnit,
        EmployeeID: employeeId,
        UserGroupNo: userGroupNo
      });

      const res = await fetch(buildSafeRoutePathFromSearch('mkdHistoryApprove', query), {
          headers: buildAuthHeaders(token)
      });
      const result = await res.json();
      if (result.success) {
        const mapped = result.data.map((item: RawMKDRecord, index: number) => {
          const str = (v: unknown): string => (v === null || v === undefined) ? '' : String(v);
          const manStatus = Number(item.ManDriverStatus) || 0;
          const appHistStatus = item.ApproveHistStatus !== null && item.ApproveHistStatus !== undefined
            ? Number(item.ApproveHistStatus)
            : (str(item.AppStatusName).trim() === 'ไม่เห็นชอบ' ? -1 : (str(item.AppStatusName).trim() === 'เห็นชอบ' ? 1 : null));

          let statusLabel = str(item.AppStatusName) || str(item.StatusName) || 'รอขออนุมัติ';

          if (manStatus === 2) {
            statusLabel = 'เห็นชอบแล้ว';
          } else if (manStatus === 1) {
            if (appHistStatus === 1) statusLabel = 'เห็นชอบ';
            else if (appHistStatus === -1) statusLabel = 'ไม่เห็นชอบ';
          } else if (manStatus === 3) {
            statusLabel = 'อนุมัติแล้ว';
          } else if (manStatus === 0) {
            statusLabel = 'ยกเลิก';
          }

          let displayDate = '-';
          if (item.datebd) {
              const d = new Date(item.datebd as string | number | Date);
              if (!isNaN(d.getTime())) {
                  const dDay = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const yr = d.getFullYear();
                  displayDate = `${dDay}/${month}/${yr}`;
              } else if (typeof item.datebd === 'string') {
                  displayDate = item.datebd;
              }
          }

          const unitAllName = str(item.UnitAllName) || str(item.OrgUnitName);

          return {
            no: index + 1,
            reqNo: str(item.fullRequestNo) || str(item.RequestNo) || '-',
            mkdID: str(item.ManDriverID),
            approveID: str(item.ApproveID),
            reqDate: displayDate,
            bu: str(item.BGName) || '-',
            orgUnitCode: str(item.OrgUnitNo) || '-',
            orgUnitOnly: unitAllName.replace(/\s*\([^)]*\)\s*$/, '') || '-',
            division: unitAllName.match(/\(([^)]+)\)/)?.[1] || '',
            createBy: str(item.EmpName) || str(item.CreateBy) || '-',
            createDate: str(item.CreateDateBD) || '-',
            approveSteps: item.ApproveID && item.Fullname ? {
              step: str(item.Fullname),
              approver: '',
              date: str(item.PrevAppDateBD),
              status: appHistStatus,
            } : undefined,
            noConclusion: str(item.ConclusionNo),
            mkdCount: typeof item.MKDApprove === 'number' ? item.MKDApprove : 0,
            hasEdit: item.ManDriverStatus === 2,
            hasFlow: !!item.ApproveID,
            status: statusLabel,
            statusColor: manStatus === 3 ? 'text-green-700' : (manStatus === 1 ? 'text-purple-700' : 'text-blue-700'),
            manDriverStatus: manStatus,
            approveHistStatus: appHistStatus,
            fileUpload: typeof item.FileUpload === 'string' ? item.FileUpload : null,
          };
        });
        setRecords(mapped);
      }
    } catch (error) {
      console.error('Error fetching MKD history approve', error);
    } finally {
      setLoading(false);
    }
  }, [year, selectedMainUnit, currentUser, token]);

  useEffect(() => {
    if (isLoaded) {
      fetchHistory();
    }
  }, [isLoaded, fetchHistory]);

  const openFlowPopup = async (mkdID: string, approveID?: string) => {
    if (!approveID || approveID === '0') return;
    setFlowData([]);
    setFlowLoading(true);
    setIsFlowModalOpen(true);
    try {
      const res = await fetch(buildMkdPath(mkdID, 'flow-history', { approveId: approveID }), {
          headers: buildAuthHeaders(token)
      });
      const result = await res.json();
      if (result.success) setFlowData(result.data);
    } catch (e) {
      console.error('Error fetching flow history', e);
    } finally {
      setFlowLoading(false);
    }
  };

  const getFlowStatusColor = (status?: number) => {
    if (status === 1) return 'text-green-700';
    if (status === -1) return 'text-red-700';
    return 'text-gray-800 font-bold';
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterReqNo && !r.reqNo.toLowerCase().includes(filterReqNo.toLowerCase())) return false;
      if (filterReqDate && !r.reqDate.includes(filterReqDate)) return false;
      if (filterBU && !r.bu.toLowerCase().includes(filterBU.toLowerCase())) return false;
      if (filterOrgUnit && !(r.orgUnitCode + r.orgUnitOnly).toLowerCase().includes(filterOrgUnit.toLowerCase())) return false;
      if (filterCreateBy && !r.createBy.toLowerCase().includes(filterCreateBy.toLowerCase())) return false;
      if (filterConclusion && !r.noConclusion.toLowerCase().includes(filterConclusion.toLowerCase())) return false;
      if (statusFilter !== 'ทั้งหมด') {
         const option = statusOptions.find(o => o.value === statusFilter);
         if (option && r.status !== option.label) return false;
      }
      return true;
    });
  }, [records, filterReqNo, filterReqDate, filterBU, filterOrgUnit, filterCreateBy, filterConclusion, statusFilter]);

  const handleSearch = () => {
    fetchHistory();
  };

  const handleViewDetail = (mkdId: string) => {
    router.push(`/mkd/historyapprove/${toSafePathSegment(mkdId)}`);
  };

  const handleViewDashboard = (mkdId: string) => {
    router.push(`/mkd/dashboard/${toSafePathSegment(mkdId)}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 shadow-lg py-2">
        <CardContent>
          <h1 className="text-2xl font-bold text-white">
            History Manpower Key Driver (Approved)
          </h1>
        </CardContent>
      </Card>

      {/* Filter Section */}
      <Card className="bg-white border-0 shadow-sm py-2">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="w-full lg:w-auto">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Filter : สายงาน
              </Label>
              <div className="relative w-80">
                <Popover open={isMainComboboxOpen} onOpenChange={setIsMainComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isMainComboboxOpen}
                      className="w-full justify-between font-normal bg-white"
                    >
                      {selectedMainUnit
                        ? initialUnits.find((unit) => unit.id === selectedMainUnit)?.unitText || selectedMainUnit
                        : "เลือกสายงาน..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="พิมพ์รหัสหรือชื่อสายงาน..." />
                      <CommandList>
                        <CommandEmpty>ไม่พบสายงาน</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setSelectedMainUnit('');
                              setIsMainComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMainUnit === '' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            ทั้งหมด
                          </CommandItem>
                          {initialUnits.map((unit) => (
                            <CommandItem
                              key={unit.id}
                              value={`${unit.id} ${unit.unitText}`}
                              onSelect={() => {
                                setSelectedMainUnit(unit.id);
                                setIsMainComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedMainUnit === unit.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {unit.unitText}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="w-full lg:w-auto">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Year
              </Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {initialYears.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 cursor-pointer font-bold"
            >
              OK
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-blue-100 shadow-[0_2px_2px_-1px_rgba(0,0,0,0.1)]">
                <tr className="bg-blue-100 border-b-2 border-blue-200">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-16">
                    No
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                    Req.No
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                    Req.Date
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                    BU
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                    OrgUnit
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                    Create By
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                    Approve Steps
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                    Conclusion No.
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                    MKD
                    <br />
                    (อนุมัติ)
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                    Detail
                  </th>
                </tr>
                {/* Filter Row */}
                <tr className="bg-blue-50 border-b z-20 shadow-sm">
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3 w-40">
                    <Input
                      className="bg-white h-9 text-xs"
                      value={filterReqNo}
                      onChange={(e) => setFilterReqNo(e.target.value)}
                      placeholder=""
                    />
                  </th>
                  <th className="px-4 py-3 w-40">
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
                    <Input
                      className="bg-white h-9 text-xs w-20"
                      value={filterBU}
                      onChange={(e) => setFilterBU(e.target.value)}
                      placeholder=""
                    />
                  </th>
                  <th className="px-4 py-3">
                    <Input
                      className="bg-white h-9 text-xs"
                      value={filterOrgUnit}
                      onChange={(e) => setFilterOrgUnit(e.target.value)}
                      placeholder=""
                    />
                  </th>
                  <th className="px-4 py-3">
                    <Input
                      className="bg-white h-9 text-xs"
                      value={filterCreateBy}
                      onChange={(e) => setFilterCreateBy(e.target.value)}
                      placeholder=""
                    />
                  </th>
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3">
                    <Input
                      className="bg-white h-9 text-xs"
                      value={filterConclusion}
                      onChange={(e) => setFilterConclusion(e.target.value)}
                      placeholder=""
                    />
                  </th>
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-sm text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-sm text-gray-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                  <tr
                    key={record.no}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.reqNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.reqDate}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.bu}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {record.orgUnitCode} {record.division && `(${record.division})`}
                        </div>
                        <div className="text-xs">
                          {record.orgUnitOnly}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        <div className="text-gray-900 text-xs">{record.createBy}</div>
                        <div className="text-xs text-gray-500">
                          {record.createDate}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {record.approveSteps && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openFlowPopup(record.mkdID, record.approveID)}
                            className="p-1 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                            title="View Approval Flow"
                          >
                            <User className="h-4 w-4 text-blue-500" />
                          </button>
                          <div className="space-y-1">
                            <div className={`${record.approveSteps.status === -1 ? 'text-red-600' : 'text-green-600'} text-xs font-medium leading-tight`}>
                              {record.approveSteps.step}
                            </div>
                            <div className="text-[11px] text-gray-500 leading-tight">
                              {record.approveSteps.date}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.noConclusion}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-medium">{record.manDriverStatus === 3 ? record.mkdCount : ''}</span>
                        {record.fileUpload && (
                          <button
                            onClick={() => openSafeApiPath(buildMkdFilePath(record.mkdID, record.fileUpload))}
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                            title="View Document"
                          >
                            <FileText className="h-5 w-5 text-blue-500 cursor-pointer" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetail(record.mkdID)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="View Details"
                        >
                          <Search className="h-5 w-5 text-blue-600 cursor-pointer" />
                        </button>
                        {(record.manDriverStatus === 2 || record.manDriverStatus === 3) && (
                          <button
                            onClick={() => handleViewDashboard(record.mkdID)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="View Dashboard"
                          >
                            <BarChart3 className="h-5 w-5 text-gray-600 cursor-pointer" />
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

      {/* Flow History Modal */}
      <Dialog open={isFlowModalOpen} onOpenChange={setIsFlowModalOpen}>
        <DialogContent className="sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700">Approval Flow History</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 my-4">
            {flowLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr>
                    <th className="p-2 border text-center w-12 text-sm">Seq.</th>
                    <th className="p-2 border text-sm">Name</th>
                    <th className="p-2 border text-center text-sm">Position</th>
                    <th className="p-2 border text-center text-sm w-28">Status</th>
                    <th className="p-2 border text-center text-sm w-28">Date</th>
                    <th className="p-2 border text-sm">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {flowData.map((row, i) => (
                    <tr key={i} className="border-b text-xs hover:bg-gray-50">
                      <td className="p-2 border text-center">{row.Seqno}</td>
                      <td className="p-2 border">{row.Fullname}</td>
                      <td className="p-2 border text-center">{row.posname}</td>
                      <td className={`p-2 border text-center ${getFlowStatusColor(row.ApproveHistStatus)}`}>
                        {row.StatusName}
                      </td>
                      <td className="p-2 border text-center">{row.ApproveHistDateBD}</td>
                      <td className="p-2 border whitespace-pre-wrap">{row.Remark}</td>
                    </tr>
                  ))}
                  {flowData.length === 0 && !flowLoading && (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-8">No data found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFlowModalOpen(false)}>CLOSE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
