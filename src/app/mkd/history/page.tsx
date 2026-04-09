'use client';

import Main from '@/components/layout/main';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Search,
  User,
  Edit,
  BarChart3,
  Check,
  ChevronsUpDown,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as mkdService from '@/services/mkdService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';

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

export default function MKDHistoryPage() {
  const router = useRouter();
  const [year, setYear] = useState((new Date().getFullYear() + 543).toString());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedOrgUnit, setSelectedOrgUnit] = useState('');
  const [records, setRecords] = useState<MKDRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<{id: string; unitText: string; name?: string}[]>([]);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [isMainComboboxOpen, setIsMainComboboxOpen] = useState(false);
  const [selectedMainUnit, setSelectedMainUnit] = useState('');

  // Approval Modal State
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedApproveId, setSelectedApproveId] = useState<string | null>(null);
  const [conclusionNo, setConclusionNo] = useState('');
  const [mkdApproveCount, setMkdApproveCount] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [user, setUser] = useState<string>('SYSTEM');
  const [existingFile, setExistingFile] = useState<string | null>(null);
  
  // Column Filters
  const [filterReqNo, setFilterReqNo] = useState('');
  const [filterReqDate, setFilterReqDate] = useState('');
  const [filterBU, setFilterBU] = useState('');
  const [filterOrgUnit, setFilterOrgUnit] = useState('');
  const [filterCreateBy, setFilterCreateBy] = useState('');
  const [filterConclusion, setFilterConclusion] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultTitle, setResultTitle] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [flowData, setFlowData] = useState<{ Seqno: number; Fullname: string; posname?: string; StatusName?: string; ApproveHistStatus?: number; ApproveHistDateBD?: string; Remark?: string; }[]>([]);
  const [flowLoading, setFlowLoading] = useState(false);

  useEffect(() => {
    fetchUnits();
  }, []);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedYear = localStorage.getItem('mkd_history_year');
    const storedStatus = localStorage.getItem('mkd_history_status');
    if (storedYear) setYear(storedYear.trim());
    if (storedStatus) setStatusFilter(storedStatus.trim());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('mkd_history_year', year);
    }
  }, [year, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('mkd_history_status', statusFilter);
    }
  }, [statusFilter, isLoaded]);


  useEffect(() => {
    if (isNewModalOpen) {
      fetchUnits();
    }
  }, [isNewModalOpen]);

  useEffect(() => {
    const fetchStartYear = async () => {
      try {
        const res = await mkdService.getStartYear();
        if (res && res.success && res.data) {
          const start = parseInt(res.data);
          const currentYear = new Date().getFullYear() + 543;
          const end = currentYear + 1;
          const years = [];
          for (let y = end; y >= start; y--) {
            years.push(y.toString());
          }
          setAvailableYears(years);
          if (!years.includes(year)) {
             setYear(currentYear.toString());
          }
        }
      } catch (e) {
        console.error('Error fetching start year', e);
      }
    };
    fetchStartYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log('Available Units changed:', availableUnits);
  }, [availableUnits]);

  // Listen for user group changes from Header
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let employeeId = '';
      let userGroupNo = '';
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          employeeId = userData.employeeID || '';
          userGroupNo = localStorage.getItem('selected_usergroup') || '';
          if (!userGroupNo) {
            userGroupNo = userData.userGroupNo || userData.roleId || '';
          }
          if (!userGroupNo && userData.userGroups && userData.userGroups.length > 0) {
            userGroupNo = userData.userGroups[0].userGroupNo;
          }
        } catch (e) {
          console.error("Failed to parse user_data", e);
        }
      }

      const numericYear = parseInt(year);
      const ceYear = numericYear > 2500 ? (numericYear - 543).toString() : year;

      const query = new URLSearchParams({
        EffectiveYear: ceYear,
        OrgUnitNo: selectedMainUnit, 
        EmployeeID: employeeId,
        UserGroupNo: userGroupNo,
        RequestType: '1'
      });

      const res = await fetch(`/api/mkd/history?${query}`);
      const result = await res.json();
      if (result.success) {
        const mapped = result.data.map((item: Record<string, unknown>, index: number) => {
          const str = (v: unknown): string => (v === null || v === undefined) ? '' : String(v);
          const manStatus = Number(item.ManDriverStatus) || 0;
          const appHistStatus = item.ApproveHistStatus !== null && item.ApproveHistStatus !== undefined 
            ? Number(item.ApproveHistStatus) 
            : (str(item.AppStatusName).trim() === 'ไม่เห็นชอบ' ? -1 : (str(item.AppStatusName).trim() === 'เห็นชอบ' ? 1 : null));
          
          let statusLabel = str(item.StatusName) || 'รอขออนุมัติ';

          if (manStatus === 2) {
            statusLabel = 'เห็นชอบแล้ว';
          } else if (manStatus === 3) {
            statusLabel = 'อนุมัติแล้ว';
          } else if (manStatus === 0) {
            statusLabel = 'ยกเลิก';
          } else if (manStatus === 1) {
            if (item.ApproveID) {
              statusLabel = 'รอเห็นชอบ';
            } else {
              statusLabel = 'รอขออนุมัติ';
            }
          }
          
          let displayDate = '-';
          if (item.datebd) {
              const d = new Date(item.datebd as string | number | Date);
              if (!isNaN(d.getTime())) {
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const yr = d.getFullYear();
                  displayDate = `${day}/${month}/${yr}`;
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
            approveSteps: item.ApproveID ? {
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
            statusColor: manStatus === 3 ? 'text-green-700' : (manStatus === 1 ? 'text-blue-700' : 'text-purple-700'),
            manDriverStatus: manStatus,
            approveHistStatus: appHistStatus,
            fileUpload: typeof item.FileUpload === 'string' ? item.FileUpload : null,
          };
        });
        setRecords(mapped);
      }
    } catch (error) {
      console.error('Error fetching MKD history', error);
    } finally {
      setLoading(false);
    }
  }, [year, selectedMainUnit]);

  useEffect(() => {
    if (isLoaded) {
      fetchHistory();
      const storedUser = localStorage.getItem('empNo');
      if (storedUser) {
        setUser(storedUser);
      } else {
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            if (userData.employeeID) setUser(userData.employeeID);
          } catch {}
        }
      }
    }
  }, [isLoaded, fetchHistory]);

  const openFlowPopup = async (mkdID: string, approveID?: string) => {
    if (!approveID || approveID === '0') return;
    setFlowData([]);
    setFlowLoading(true);
    setIsFlowModalOpen(true);
    try {
      const res = await fetch(`/api/mkd/${mkdID}/flow-history?approveId=${approveID}`);
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

  // Column Filtering Logic
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterReqNo && !r.reqNo.toLowerCase().includes(filterReqNo.toLowerCase())) return false;
      if (filterReqDate && !r.reqDate.includes(filterReqDate)) return false; // Simple string match for DD/MM/YYYY
      if (filterBU && !r.bu.toLowerCase().includes(filterBU.toLowerCase())) return false;
      if (filterOrgUnit && !(r.orgUnitCode + r.orgUnitOnly).toLowerCase().includes(filterOrgUnit.toLowerCase())) return false;
      if (filterCreateBy && !r.createBy.toLowerCase().includes(filterCreateBy.toLowerCase())) return false;
      if (filterConclusion && !r.noConclusion.toLowerCase().includes(filterConclusion.toLowerCase())) return false;
      if (statusFilter !== 'ทั้งหมด') {
         const option = statusOptions.find((o: { value: string; label: string }) => o.value === statusFilter);
         if (option && r.status !== option.label) return false;
      }
      return true;
    });
  }, [records, filterReqNo, filterReqDate, filterBU, filterOrgUnit, filterCreateBy, filterConclusion, statusFilter]);

  const handleApprove = async () => {
    console.log('handleApprove called', { selectedRecordId, conclusionNo, mkdApproveCount });
    if (!selectedRecordId) {
      console.warn('No record selected for approval');
      return;
    }
    if (!conclusionNo) {
      toast.error('กรุณาระบุเลขมติ');
      return;
    }
    if (!mkdApproveCount || parseInt(mkdApproveCount) <= 0) {
      toast.error('กรุณาระบุจำนวน MKD ที่อนุมัติ');
      return;
    }
    if (!uploadFile && !existingFile) {
      toast.error('กรุณาแนบไฟล์');
      return;
    }
    if (uploadFile) {
      const ext = uploadFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf') {
        toast.error('นามสกุลไฟล์ไม่ถูกต้อง ต้องเป็น pdf เท่านั้น');
        return;
      }
      if (uploadFile.size > 15 * 1024 * 1024) {
        toast.error('ขนาดไฟล์ไม่ควรเกิน 15 MB');
        return;
      }
    }
    try {
      setIsApproving(true);
      const res = await mkdService.approveManDriver(selectedRecordId, {
        approveId: selectedApproveId || '',
        conclusionNo,
        mkdApproveCount: parseInt(mkdApproveCount) || 0,
        file: uploadFile || undefined,
        status: 3, // Final Approve
        remark: 'Approved from History Page',
        updateBy: user
      });

      if (res && res.success) {
        setIsAppModalOpen(false);
        fetchHistory();
        setResultTitle('สำเร็จ');
        setResultMessage('ดำเนินการอนุมัติเรียบร้อยแล้ว');
        setIsResultModalOpen(true);
        // Reset state
        setConclusionNo('');
        setMkdApproveCount('');
        setUploadFile(null);
      } else {
        setResultTitle('เกิดข้อผิดพลาด');
        setResultMessage(res?.message || 'Failed to approve');
        setIsResultModalOpen(true);
      }
    } catch (error) {
      console.error('Approve failed', error);
      setResultTitle('เกิดข้อผิดพลาด');
      setResultMessage('Internal error during approval');
      setIsResultModalOpen(true);
    } finally {
      setIsApproving(false);
    }
  };

  const handleNotApprove = async () => {
    console.log('handleNotApprove called', { selectedRecordId });
    if (!selectedRecordId) return;
    if (!conclusionNo) {
      toast.error('กรุณาระบุเลขมติ');
      return;
    }
    if (!uploadFile && !existingFile) {
      toast.error('กรุณาแนบไฟล์');
      return;
    }
    
    // Close confirmation dialog if we got here from it
    setIsConfirmOpen(false);

    try {
      setIsApproving(true);
      const res = await mkdService.approveManDriver(selectedRecordId, {
        approveId: selectedApproveId || '',
        status: -1, // Not Approve
        remark: 'Not Approved from History Page',
        updateBy: user,
        mkdApproveCount: parseInt(mkdApproveCount) || 0,
      });
      if (res && res.success) {
        setIsAppModalOpen(false);
        fetchHistory();
        setResultTitle('สำเร็จ');
        setResultMessage('ดำเนินการไม่อนุมัติเรียบร้อยแล้ว');
        setIsResultModalOpen(true);
      } else {
        setResultTitle('เกิดข้อผิดพลาด');
        setResultMessage(res?.message || 'Failed to reject');
        setIsResultModalOpen(true);
      }
    } catch (error) {
      console.error('Not Approve failed', error);
      setResultTitle('เกิดข้อผิดพลาด');
      setResultMessage('Internal error during rejection');
      setIsResultModalOpen(true);
    } finally {
      setIsApproving(false);
    }
  };

  const openApproveModal = (record: MKDRecord) => {
    setSelectedRecordId(record.mkdID);
    setSelectedApproveId(record.approveID || '');
    setConclusionNo(record.noConclusion || '');
    setMkdApproveCount(record.mkdCount ? record.mkdCount.toString() : '0');
    setExistingFile(record.fileUpload || null);
    setIsAppModalOpen(true);
  };

  // Listen for user group changes from Header
  useEffect(() => {
    const handleGroupChange = () => {
        fetchHistory();
    };
    window.addEventListener('user-group-changed', handleGroupChange);
    return () => window.removeEventListener('user-group-changed', handleGroupChange);
  }, [fetchHistory]);

  const fetchUnits = async () => {
    try {
        const res = await fetch(`/api/units/all?effectiveDate=${new Date().toISOString().split('T')[0]}`);
        const result = await res.json();
        console.log('MKD Fetch Units Result:', result); // DEBUG LOG
        if (result.success) {
            setAvailableUnits(result.data);
        }
    } catch(err) {
        console.error('Error fetching units', err);
    }
  };

  const handleSearch = () => {
    fetchHistory();
  };

  const handleCreateNew = async () => {
    if (selectedOrgUnit) {
      try {
        const selectedUnitDetail = availableUnits.find(u => u.id === selectedOrgUnit);

        // Map BE year to CE if needed
        const numericYear = parseInt(year);
        const ceYear = numericYear > 2500 ? (numericYear - 543).toString() : year;

        // 1. Check duplicate
        const checkRes = await fetch('/api/mkd/check-dup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                EffectiveYear: ceYear,
                RequestType: 1,
                OrgUnitNo: selectedOrgUnit,
                OrgUnitName: selectedUnitDetail?.name || ''
            })
        });
        const checkResult = await checkRes.json();
        
        if (checkResult.success && checkResult.isDuplicate) {
            alert('มีการสร้างรายการสำหรับหน่วยงานและปีนี้ไปแล้ว');
            return;
        }

        // Get User ID and User Group
        let employeeId = 'SYSTEM';
        let userGroupNo = '';
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                employeeId = userData.employeeID || 'SYSTEM';
                
                // Use same robust logic for userGroup
                userGroupNo = localStorage.getItem('selected_usergroup') || '';
                if (!userGroupNo) {
                  userGroupNo = userData.userGroupNo || userData.roleId || '';
                }
                if (!userGroupNo && userData.userGroups && userData.userGroups.length > 0) {
                  userGroupNo = userData.userGroups[0].userGroupNo;
                }
            } catch {}
        }

        // 2. Create New
        const createRes = await fetch('/api/mkd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                EffectiveYear: ceYear,
                RequestType: 1,
                OrgUnitNo: selectedOrgUnit,
                OrgUnitName: selectedUnitDetail?.name || '',
                CreateBy: employeeId
            })
        });
        const createResult = await createRes.json();
        if (createResult.success) {
            const newId = createResult.data.ManDriverID;
            setIsNewModalOpen(false);
            router.push(`/mkd/history/${newId}`);
        } else {
            alert('เกิดข้อผิดพลาดในการสร้างรายการ');
        }

      } catch (error) {
         console.error('Error creating MKD', error);
         alert('เกิดข้อผิดพลาดในการสร้างรายการ');
      }
    }
  };

  const handleViewDetail = (mkdId: string) => {
    router.push(`/mkd/history/${mkdId}`);
  };
const handleViewDashboard = (mkdId: string) => {
    router.push(`/mkd/dashboard/${mkdId}`);
  };

  const currentYearBE = new Date().getFullYear() + 543;
  const isCurrentYearOrFuture = parseInt(year) >= currentYearBE;

  return (
    <Main currentPath="/mkd/transaction">
      <div className="space-y-4">
        {/* Header */}
        <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 shadow-lg py-2">
          <CardContent >
            <h1 className="text-2xl font-bold text-white">
              History Manpower Key Driver
            </h1>
          </CardContent>
        </Card>

        {/* Filter Section */}
        <Card className="bg-white border-0 shadow-sm py-2">
          <CardContent className="p-4">
          {/* Main Container : ใช้ items-end เพื่อให้ Input และ Button วางแนวล่างตรงกัน */}
<div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
  
  {/* 1. ส่วน Filter : ลบ flex-1 ออก */}
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
              ? availableUnits.find((unit) => unit.id === selectedMainUnit)?.unitText || selectedMainUnit
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
                {availableUnits.map((unit) => (
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

  {/* 2. ส่วน Year : แยกออกมาทำโครงสร้างเหมือน Filter (Label อยู่บน Select) */}
  <div className="w-full lg:w-auto">
    <Label className="text-sm font-medium text-gray-700 mb-2 block">
      Year
    </Label>
    <Select value={year} onValueChange={setYear}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableYears.map(y => (
          <SelectItem key={y} value={y}>{y}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* 3. ปุ่ม OK : วางต่อจาก Year โดยตรง */}
  <Button
    onClick={handleSearch}
    className="bg-blue-600 hover:bg-blue-700 text-white px-8 cursor-pointer font-bold"
  >
    OK
  </Button>

  {/* 4. ปุ่ม NEW : ใช้ ml-auto เพื่อดันตัวเองไปชิดขวาสุด */}
  {!isCurrentYearOrFuture ? (
    <Button
       onClick={() => toast.error('ไม่สามารถสร้างรายการย้อนหลังได้')}
       className="bg-gray-300 text-gray-500 px-8 ml-auto cursor-not-allowed font-bold"
    >
      NEW
    </Button>
  ) : (
    <Button
      onClick={() => setIsNewModalOpen(true)}
      className="bg-green-600 hover:bg-green-700 text-white px-8 ml-auto cursor-pointer font-bold"
    >
      NEW
    </Button>
  )}
</div>
          </CardContent>
        </Card>

        {loading && <div className="text-center text-sm text-gray-500 py-4">Loading...</div>}

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
                      No. Conclusion
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                      MKD
                      <br />
                      (อนุมัติ)
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                      Detail
                    </th>
                  </tr>
                  {/* Filter Row */}
                  <tr className="bg-blue-50 border-b z-20 shadow-sm">
                    <th className="px-4 py-3">
                    
                    </th>
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
                    <th className="px-4 py-3">
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="bg-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white">

                  {/* Data Rows */}
                  {filteredRecords.map((record) => (
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
                      <td className="px-4 py-3 text-sm">
                        {record.approveSteps && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openFlowPopup(record.mkdID, record.approveID)}
                              className="p-1 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                              title="View Approval Flow"
                            >
                              <User className="h-5 w-5 text-blue-500" />
                            </button>
                            <div className="space-y-1">
                              <div className={`${record.approveSteps.status === -1 ? 'text-red-600' : 'text-green-600'} font-medium text-[11px]`}>
                                {record.approveSteps.step}
                              </div>
                              <div className="text-[10px] text-gray-500">
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
                          {record.hasEdit && (
                            <button
                              onClick={() => openApproveModal(record)}
                              className="p-1 hover:bg-orange-100 rounded transition-colors"
                              title="Approve MKD"
                            >
                              <Edit className="h-5 w-5 text-orange-500 cursor-pointer" />
                            </button>
                          )}
                          {record.fileUpload && (
                            <button
                              onClick={() => window.open(`/api/mkd/${record.mkdID}/files/${record.fileUpload}`, '_blank')}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title="View Document"
                            >
                              <FileText className="h-5 w-5 text-blue-500 cursor-pointer" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${record.statusColor}`}>
                          {record.status}
                        </span>
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
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New MKD Modal */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700">
              สร้าง Manpower Key Driver
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="orgUnit" className="text-sm font-medium mb-2 block">
              เลือกหน่วยงาน
            </Label>
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isComboboxOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedOrgUnit
                    ? availableUnits.find((unit) => unit.id === selectedOrgUnit)?.unitText
                    : "ค้นหาหน่วยงาน..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                <Command>
                  <CommandInput placeholder="พิมพ์รหัสหรือชื่อหน่วยงาน..." />
                  <CommandList>
                    <CommandEmpty>ไม่พบหน่วยงาน</CommandEmpty>
                    <CommandGroup>
                      {availableUnits.map((unit) => (
                        <CommandItem
                          key={unit.id}
                          value={`${unit.id} ${unit.unitText}`}
                          onSelect={() => {
                            setSelectedOrgUnit(unit.id);
                            setIsComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedOrgUnit === unit.id ? "opacity-100" : "opacity-0"
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewModalOpen(false);
                setSelectedOrgUnit('');
              }}
            >
              ยกเลิก
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleCreateNew}
              disabled={!selectedOrgUnit}
            >
              CREATE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Approval Modal */}
      <Dialog open={isAppModalOpen} onOpenChange={setIsAppModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700">Approve Manpower Key Driver</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="conclusionNo" className="text-right">เลขที่มติ <span className="text-red-500">*</span></Label>
              <Input
                id="conclusionNo"
                value={conclusionNo}
                onChange={(e) => setConclusionNo(e.target.value)}
                className="col-span-3"
                placeholder="ระบุเลขที่มติ"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mkdCount" className="text-right">จำนวนที่อนุมัติ <span className="text-red-500">*</span></Label>
              <Input
                id="mkdCount"
                type="number"
                value={mkdApproveCount}
                onChange={(e) => setMkdApproveCount(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right">แนบไฟล์ (PDF) <span className="text-red-500">*</span></Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {existingFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => window.open(`/api/mkd/${selectedRecordId}/files/${existingFile}`, '_blank')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    ดูไฟล์เดิม
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-end items-center gap-3 mt-6 pt-4 border-t px-6 pb-6">
            <button
               type="button"
               className="px-4 py-2 border rounded hover:bg-gray-100 cursor-pointer font-bold disabled:opacity-50"
               onClick={() => {
                 console.log('Cancel clicked');
                 setIsAppModalOpen(false);
               }} 
               disabled={isApproving}
            >
              CANCEL
            </button>
            <button
               type="button"
               className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer font-bold disabled:opacity-50"
               onClick={() => {
                 console.log('Not Approve button clicked');
                 setIsConfirmOpen(true);
               }} 
               disabled={isApproving}
            >
              NOT APPROVE
            </button>
            <button
               type="button"
               className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer font-bold disabled:opacity-50"
               onClick={handleApprove} 
               disabled={isApproving}
            >
              {isApproving ? 'PROCESSING...' : 'APPROVE'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>ยืนยันการทำรายการ</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            ต้องการไม่เห็นชอบ/ไม่อนุมัติ ใช่หรือไม่?
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleNotApprove}>ยืนยัน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Flow History Modal */}
      <Dialog open={isFlowModalOpen} onOpenChange={setIsFlowModalOpen}>
        <DialogContent className="sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700">Approval Flow History</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1">
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
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsFlowModalOpen(false)}>CLOSE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors />

      {/* Result Modal */}
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className={resultTitle === 'สำเร็จ' ? 'text-green-600' : 'text-red-600'}>
              {resultTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-lg">
            {resultMessage}
          </div>
          <DialogFooter className="flex justify-center">
            <Button className="min-w-[100px]" onClick={() => setIsResultModalOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Main>
  );
}