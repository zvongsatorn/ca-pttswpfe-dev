'use client';

import Main from '@/components/layout/main';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  FileText,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Hash,
  Check,
  X,
  ArrowRight,
  File as FileIcon,
} from 'lucide-react';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
dayjs.extend(buddhistEra);
dayjs.locale('th');

const getYears = () => {
  const currentYear = new Date().getFullYear() + 543;
  const endYear = currentYear + 1;
  if (typeof window === 'undefined') {
    return [endYear.toString(), currentYear.toString()];
  }

  const startYearStr = localStorage.getItem('StartYear') || '';
  const parsedStartYear = Number.parseInt(startYearStr, 10);
  const startYear = Number.isInteger(parsedStartYear) ? parsedStartYear : currentYear - 5;
  const years: string[] = [];
  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year.toString());
  }
  return years.length > 0 ? years : [endYear.toString(), currentYear.toString()];
};

const emptySubscribe = () => () => {};
let cachedClientYears: string[] | null = null;
const getClientYearsSnapshot = () => {
  if (!cachedClientYears) {
    cachedClientYears = getYears();
  }
  return cachedClientYears;
};
const getServerYearsSnapshot = () => {
  const currentYear = new Date().getFullYear() + 543;
  return [(currentYear + 1).toString(), currentYear.toString()];
};

// ============================================================================
// 1. TYPES DEFINITION
// ============================================================================

interface TransactionDetail {
  id: string;
  typeLabel: string;
  typeCategory: 'transfer' | 'other' | 'add' | 'adjust';
  description: string;
  remark: string;
  hasFile: boolean;
  fileUrl?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedRole?: string;
  rejectedAt?: string;
}

interface ApprovalLogItem {
  action: string;
  timestamp?: string;
  user: string;
  role: string;
  status: 'completed' | 'current' | 'pending' | 'success';
}

interface TransactionProgressItem {
  id: string;            // DocumentNo
  inboxNumber: string;   
  hasRejectedItem: boolean;
  allRejected?: boolean;
  effectiveDate: string;
  category: string;      
  resolution: string;    
  statusLabel: string;   
  processStage: 1 | 2 | 3;
  createdDate: string;
  typeCategory: string; 
  businessUnitId: string;
  businessUnitName: string;
  divisionId: string;
  divisionName: string;
  agencyId: string;
  agencyName: string;
  items: TransactionDetail[];
  logs: ApprovalLogItem[];
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

interface FilterOption {
  value: string;
  label: string;
}

interface APIDocAuditLogDetail {
  ItemID?: string;
  Seqno: number;
  AuditStatus: number;
  AuditDate?: string;
  EmployeeID: string;
  Fullname: string;
  UserGroupName?: string;
  UserGroupNo?: string;
  UnitSide?: string;
}

interface RejectableItemOption {
  itemId: string;
  seqno: number;
  typeLabel: string;
  description: string;
}

interface APIDocumentItem {
  ItemID: string;
  Seqno?: number;
  AuditStatus?: number;
  TransactionType: number;
  TransactionDesc: string;
  ReqRemark: string;
  RejectionReason: string;
  FileCount: number;
  FileUrl: string;
}

interface APIDocumentLog {
  Seqno: number;
  AuditStatus: number;
  AuditDate?: string;
  EmployeeID: string;
  Fullname: string;
  UserGroupName?: string;
  UserGroupNo?: string;
  UnitSide?: string;
}

interface APIDocumentSummary {
  documentNo: string;
  effectiveDate?: string;
  createDate: string;
  statusLabel: string;
  processStage: number;
  category: string;
  typeCategory: string;
  resolution: string;
  businessUnitId?: string;
  businessUnitName?: string;
  divisionId?: string;
  divisionName?: string;
  agencyId?: string;
  agencyName?: string;
  items: APIDocumentItem[];
  logs: APIDocumentLog[];
}

function MultiSelectFilter({
  values,
  options,
  placeholder,
  allLabel = 'ทั้งหมด',
  widthClass = 'w-56',
  onChange,
}: {
  values: string[];
  options: FilterOption[];
  placeholder: string;
  allLabel?: string;
  widthClass?: string;
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectedLabel = (() => {
    if (values.length === 0) return allLabel;
    if (values.length === 1) {
      const selectedValue = values[0];
      return options.find((item) => item.value === selectedValue)?.label || selectedValue;
    }
    return `เลือกแล้ว ${values.length} รายการ`;
  })();

  const filteredOptions = options.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleValue = (nextValue: string) => {
    if (values.includes(nextValue)) {
      onChange(values.filter((value) => value !== nextValue));
      return;
    }
    onChange([...values, nextValue]);
  };

  return (
    <div ref={wrapperRef} className={`relative ${widthClass}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-shadow bg-white text-left truncate"
      >
        {selectedLabel || placeholder}
      </button>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-md border border-gray-200 shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา..."
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-blue-50 ${
                values.length === 0 ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              {allLabel}
            </button>

            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleValue(option.value)}
                className={`w-full px-2 py-1.5 rounded text-sm hover:bg-gray-50 flex items-start justify-start gap-2 text-left ${
                  values.includes(option.value) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
                title={option.label}
              >
                <input
                  type="checkbox"
                  checked={values.includes(option.value)}
                  readOnly
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 pointer-events-none"
                />
                <span className="text-left leading-snug">{option.label}</span>
              </button>
            ))}

            {filteredOptions.length === 0 && (
              <div className="px-2 py-3 text-xs text-gray-400 text-center">ไม่พบข้อมูล</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionProgressPage() {
  const years = useSyncExternalStore(emptySubscribe, getClientYearsSnapshot, getServerYearsSnapshot);

  // -- State for Header & Filter --
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = (new Date().getFullYear() + 543).toString();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [appliedMonth, setAppliedMonth] = useState(currentMonth);
  const [appliedYear, setAppliedYear] = useState(currentYear);
  
  // Filter States
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [businessUnitOptions, setBusinessUnitOptions] = useState<FilterOption[]>([]);
  const [lineOfWorkOptions, setLineOfWorkOptions] = useState<FilterOption[]>([]);
  const [orgUnitOptions, setOrgUnitOptions] = useState<FilterOption[]>([]);

  // Column Filter States
  const [filterInbox, setFilterInbox] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterRes, setFilterRes] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // -- Pagination States --
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // -- Data State --
  const [transactions, setTransactions] = useState<TransactionProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHeaderGroupNo, setSelectedHeaderGroupNo] = useState('');
  const [selectedHeaderGroupRole, setSelectedHeaderGroupRole] = useState('');

  // -- State for View Modal (read-only) --
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionProgressItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // -- State for Reject Modal --
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<TransactionProgressItem | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [isItemRejectModalOpen, setIsItemRejectModalOpen] = useState(false);
  const [itemRejectTarget, setItemRejectTarget] = useState<{ documentNo: string; inboxNumber: string } | null>(null);
  const [itemRejectOptions, setItemRejectOptions] = useState<RejectableItemOption[]>([]);
  const [itemRejectSelection, setItemRejectSelection] = useState('');
  const [itemRejectOptionsLoading, setItemRejectOptionsLoading] = useState(false);
  const [itemRejectRemark, setItemRejectRemark] = useState('');
  const [itemRejectLoading, setItemRejectLoading] = useState(false);

  const normalizeOptionValue = (...values: unknown[]) => {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return '';
  };

  const toText = (value: unknown) => String(value ?? '').trim();
  const normalizeGroupRole = (value: unknown) => String(value ?? '').trim().toUpperCase();
  const normalizeItemId = (value?: string) => String(value || '').trim().toUpperCase();
  const toDateTimeMs = (value?: string) => {
    const ms = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(ms) ? ms : 0;
  };
  const toRoleLabel = (log: Pick<APIDocAuditLogDetail, 'Seqno' | 'UserGroupName' | 'UserGroupNo' | 'UnitSide'>) => {
    if (log.Seqno === 0) return log.UserGroupName || 'ผู้สร้างรายการ';
    const baseName = log.UserGroupName || log.UserGroupNo || '';
    const suffix = log.UnitSide === 'UnitReceive' ? ' (ฝั่งรับ)' : log.UnitSide === 'UnitTransfer' ? ' (ฝั่งให้)' : '';
    return baseName + suffix;
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
  const isSameStringArray = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);
  const syncSelectedMany = (selected: string[], options: FilterOption[]) => {
    const optionValues = new Set(options.map((opt) => opt.value));
    return selected.filter((value) => optionValues.has(value));
  };
  const matchesSelected = (selectedValues: string[], ...candidateValues: unknown[]) => {
    if (selectedValues.length === 0) return true;
    const selected = new Set(selectedValues.map((value) => String(value || '').trim()).filter(Boolean));
    return candidateValues.some((candidate) => {
      const normalized = String(candidate || '').trim();
      return normalized ? selected.has(normalized) : false;
    });
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
    return { value, label };
  };
  const toUnitOption = (row: Report3FilterItem): FilterOption | null => {
    const value = toText(row.OrgUnitNo);
    const label = cleanUnitText(toText(row.UnitName || row.UnitText || row.UnitAbbr));
    if (!value || !label) return null;
    return { value, label };
  };
  const isRejectedStatus = (statusLabel: unknown) => /reject|ไม่อนุมัติ/i.test(String(statusLabel || ''));
  const getTypeLabelByTransactionType = (transactionType: number) => (
    transactionType === 1
      ? 'ภายใต้ผู้ช่วย'
      : transactionType === 2
        ? 'โอนกรอบอื่นๆ'
        : transactionType === 3
          ? 'ปรับระดับ'
          : transactionType === 4
            ? 'เพิ่ม/ลด'
            : transactionType === 6
              ? 'ยืม'
              : transactionType === 7
                ? 'คืนยืม'
                : ''
  );
  const dedupeDocumentItems = (items: APIDocumentItem[]) => {
    const map = new Map<string, APIDocumentItem>();

    items.forEach((rawItem, index) => {
      const item: APIDocumentItem = {
        ...rawItem,
        ItemID: toText(rawItem.ItemID),
        TransactionDesc: toText(rawItem.TransactionDesc),
        ReqRemark: toText(rawItem.ReqRemark),
        RejectionReason: toText(rawItem.RejectionReason),
        FileCount: Number(rawItem.FileCount || 0),
        FileUrl: toText(rawItem.FileUrl),
      };

      const key = normalizeItemId(item.ItemID) || `ITEM-${index}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, item);
        return;
      }

      map.set(key, {
        ...prev,
        TransactionType: prev.TransactionType || item.TransactionType,
        TransactionDesc: prev.TransactionDesc || item.TransactionDesc,
        ReqRemark: prev.ReqRemark || item.ReqRemark,
        RejectionReason: item.RejectionReason || prev.RejectionReason,
        FileCount: Math.max(Number(prev.FileCount || 0), Number(item.FileCount || 0)),
        FileUrl: prev.FileUrl || item.FileUrl,
      });
    });

    return Array.from(map.values());
  };

  // ============================================================================
  // 2. DATA FETCHING
  // ============================================================================

  const getUserContext = () => {
    let employeeId = 'SYSTEM';
    let userGroupNo = '';
    let employeeName = '';
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        employeeId = userData.employeeID || 'SYSTEM';
        userGroupNo = localStorage.getItem('selected_usergroup') || userData.roleId || '';
        employeeName = String(userData.name || userData.fullName || userData.Fullname || '').trim();
      } catch { /* ignore */ }
    }
    return { employeeId, userGroupNo, employeeName };
  };
  const getEmployeeId = () => getUserContext().employeeId;
  const canRejectBySelectedGroup = selectedHeaderGroupNo === '04' || selectedHeaderGroupRole.includes('HRPOLICY');

  const toEffectiveDateParam = () => {
    const monthIndex = months.indexOf(appliedMonth);
    const month = monthIndex >= 0 ? monthIndex + 1 : new Date().getMonth() + 1;
    const yearRaw = Number.parseInt(String(appliedYear || '').trim(), 10);
    const currentAdYear = new Date().getFullYear();
    const adYear = Number.isInteger(yearRaw) ? (yearRaw > 2400 ? yearRaw - 543 : yearRaw) : currentAdYear;
    return `${adYear}-${String(month).padStart(2, '0')}-01`;
  };

  const fetchProgress = async () => {
    setIsLoading(true);
    try {
      const { employeeId } = getUserContext();
      const mapDocuments = (docs: APIDocumentSummary[]) => {
        return docs.map((doc) => ({
          ...(() => {
            const dedupedItems = dedupeDocumentItems(Array.isArray(doc.items) ? doc.items : []);
            
            const rejectedItemsCount = dedupedItems.filter((i) => String(i.RejectionReason || '').trim().length > 0).length;
            const allRejected = isRejectedStatus(doc.statusLabel) || (dedupedItems.length > 0 && rejectedItemsCount === dedupedItems.length);
            const hasRejected = rejectedItemsCount > 0 || (Array.isArray(doc.logs) ? doc.logs.some((l) => Number(l.AuditStatus) === -1) : false) || allRejected;

            return {
              hasRejectedItem: hasRejected,
              allRejected: allRejected,
              items: dedupedItems.map((i) => ({
                id: i.ItemID,
                typeLabel: getTypeLabelByTransactionType(i.TransactionType),
                typeCategory: (i.TransactionType === 4 ? 'add' : i.TransactionType === 3 ? 'adjust' : 'transfer') as 'transfer' | 'other' | 'add' | 'adjust',
                description: i.TransactionDesc || '',
                remark: i.ReqRemark || '-',
                hasFile: Number(i.FileCount || 0) > 0,
                fileUrl: i.FileUrl,
                rejectionReason: i.RejectionReason,
              })),
            };
          })(),
          id: doc.documentNo,
          inboxNumber: `[${doc.documentNo}]`,
          effectiveDate: String(doc.effectiveDate || doc.createDate || ''),
          category: doc.category,
          resolution: doc.resolution,
          statusLabel: doc.statusLabel,
          processStage: doc.processStage as 1 | 2 | 3,
          createdDate: dayjs(doc.createDate).format('DD/MM/BBBB'),
          typeCategory: doc.typeCategory,
          businessUnitId: normalizeOptionValue(doc.businessUnitId, doc.businessUnitName),
          businessUnitName: normalizeOptionValue(doc.businessUnitName, doc.businessUnitId),
          divisionId: normalizeOptionValue(doc.divisionId, doc.divisionName),
          divisionName: normalizeOptionValue(doc.divisionName, doc.divisionId),
          agencyId: normalizeOptionValue(doc.agencyId, doc.agencyName),
          agencyName: normalizeOptionValue(doc.agencyName, doc.agencyId),
          logs: [
            ...doc.logs.map((l) => ({
              action: l.Seqno === 0 ? 'สร้าง' : l.AuditStatus === 2 ? 'อนุมัติ' : l.AuditStatus === 1 ? 'รออนุมัติ' : l.AuditStatus === -1 ? 'ไม่อนุมัติ' : 'รอดำเนินการ',
              timestamp: l.AuditDate ? dayjs(l.AuditDate).format('DD/MM/BBBB HH:mm') : '',
              user: `${l.EmployeeID} ${l.Fullname}`,
              role: (() => {
                if (l.Seqno === 0) return l.UserGroupName || 'ผู้สร้างรายการ';
                const baseName = l.UserGroupName || l.UserGroupNo || '';
                const suffix = l.UnitSide === 'UnitReceive' ? ' (ฝั่งรับ)' : l.UnitSide === 'UnitTransfer' ? ' (ฝั่งให้)' : '';
                return baseName + suffix;
              })(),
              status: (l.AuditStatus === 2 ? 'completed' : l.AuditStatus === 1 ? 'current' : 'pending') as 'completed' | 'current' | 'pending',
            })),
            {
              action: 'เอกสารสมบูรณ์',
              timestamp: '',
              user: '-',
              role: 'System',
              status: (doc.processStage === 3 ? 'success' : 'pending') as 'success' | 'pending',
            }
          ],
        }));
      };

      const fetchDocs = async (path: string): Promise<APIDocumentSummary[] | null> => {
        const res = await fetch(`${path}?employeeId=${employeeId}`);
        if (!res.ok) return null;
        const json = await res.json();
        return Array.isArray(json?.data) ? (json.data as APIDocumentSummary[]) : [];
      };

      const [progressDocs, allDocs] = await Promise.all([
        fetchDocs('/api/documents/progress'),
        fetchDocs('/api/documents/all')
      ]);

      const merged = new Map<string, APIDocumentSummary>();

      // Base: all documents (includes fully accepted/completed rows)
      if (allDocs) {
        allDocs.forEach((doc) => {
          const key = normalizeOptionValue(doc?.documentNo);
          if (!key) return;
          merged.set(key, { ...doc, documentNo: key });
        });
      }

      // Overlay: progress rows (if same document exists, keep latest from progress source)
      if (progressDocs) {
        progressDocs.forEach((doc) => {
          const key = normalizeOptionValue(doc?.documentNo);
          if (!key) return;
          merged.set(key, { ...doc, documentNo: key });
        });
      }

      const mergedDocs = Array.from(merged.values()).sort((a, b) => {
        const aTime = new Date(a.createDate).getTime();
        const bTime = new Date(b.createDate).getTime();
        return bTime - aTime;
      });

      setTransactions(mapDocuments(mergedDocs));
    } catch (err) {
      console.error('Error fetching progress:', err);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    const fallbackBusiness = uniqueOptions(
      transactions
        .map((row) => {
          const value = normalizeOptionValue(row.businessUnitId, row.businessUnitName);
          const label = normalizeOptionValue(row.businessUnitName, row.businessUnitId);
          return value && label ? { value, label } : null;
        })
        .filter((item): item is FilterOption => item !== null)
    );
    const fallbackLines = uniqueOptions(
      transactions
        .filter((row) => matchesSelected(selectedBusinessUnits, row.businessUnitId, row.businessUnitName))
        .map((row) => {
          const value = normalizeOptionValue(row.divisionId, row.divisionName);
          const label = normalizeOptionValue(row.divisionName, row.divisionId);
          return value && label ? { value, label } : null;
        })
        .filter((item): item is FilterOption => item !== null)
    );
    const fallbackUnits = uniqueOptions(
      transactions
        .filter((row) => matchesSelected(selectedBusinessUnits, row.businessUnitId, row.businessUnitName))
        .filter((row) => matchesSelected(selectedDivisions, row.divisionId, row.divisionName))
        .map((row) => {
          const value = normalizeOptionValue(row.agencyId, row.agencyName);
          const label = normalizeOptionValue(row.agencyName, row.agencyId);
          return value && label ? { value, label } : null;
        })
        .filter((item): item is FilterOption => item !== null)
    );
    const applyOptions = (nextBusiness: FilterOption[], nextLines: FilterOption[], nextUnits: FilterOption[]) => {
      setBusinessUnitOptions(nextBusiness);
      setLineOfWorkOptions(nextLines);
      setOrgUnitOptions(nextUnits);

      const nextBu = syncSelectedMany(selectedBusinessUnits, nextBusiness);
      const nextLine = syncSelectedMany(selectedDivisions, nextLines);
      const nextUnit = syncSelectedMany(selectedAgencies, nextUnits);

      if (!isSameStringArray(nextBu, selectedBusinessUnits)) setSelectedBusinessUnits(nextBu);
      if (!isSameStringArray(nextLine, selectedDivisions)) setSelectedDivisions(nextLine);
      if (!isSameStringArray(nextUnit, selectedAgencies)) setSelectedAgencies(nextUnit);
    };

    try {
      const { employeeId, userGroupNo } = getUserContext();
      if (!employeeId || !userGroupNo) {
        applyOptions(fallbackBusiness, fallbackLines, fallbackUnits);
        return;
      }

      const query = new URLSearchParams({
        effectiveDate: toEffectiveDateParam(),
        employeeId,
        userGroupNo,
      });
      if (selectedBusinessUnits.length === 1) query.set('bgNo', selectedBusinessUnits[0]);
      if (selectedDivisions.length === 1) query.set('division', selectedDivisions[0]);

      const res = await fetch(`/api/report/report3/filters?${query.toString()}`);
      const payload: Report3FilterResponse | null = await res.json().catch(() => null);
      if (!res.ok || !payload || payload.status !== 200 || !payload.data) {
        applyOptions(fallbackBusiness, fallbackLines, fallbackUnits);
        return;
      }

      const apiBusiness = payload.data.businessUnits.map(toBgOption).filter((item): item is FilterOption => item !== null);
      const apiLines = payload.data.lines.map(toLineOption).filter((item): item is FilterOption => item !== null);
      const apiUnits = payload.data.units.map(toUnitOption).filter((item): item is FilterOption => item !== null);

      const nextBusiness = uniqueOptions(
        [...apiBusiness, ...fallbackBusiness]
      );
      const nextLines = uniqueOptions(
        [...apiLines, ...fallbackLines]
      );
      const nextUnits = uniqueOptions(
        [...apiUnits, ...fallbackUnits]
      );

      applyOptions(nextBusiness, nextLines, nextUnits);
    } catch (error) {
      console.error('Error fetching progress filter options:', error);
      applyOptions(fallbackBusiness, fallbackLines, fallbackUnits);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  useEffect(() => {
    const readSelectedHeaderGroup = () => {
      setSelectedHeaderGroupNo((localStorage.getItem('selected_usergroup') || '').trim());
      setSelectedHeaderGroupRole(normalizeGroupRole(localStorage.getItem('selected_usergroup_role')));
    };

    readSelectedHeaderGroup();

    const onGroupChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string; role?: string }>;
      const nextGroupNo = String(customEvent.detail?.id || '').trim();
      const nextGroupRole = normalizeGroupRole(customEvent.detail?.role);

      if (nextGroupNo || nextGroupRole) {
        setSelectedHeaderGroupNo(nextGroupNo);
        setSelectedHeaderGroupRole(nextGroupRole);
        return;
      }

      readSelectedHeaderGroup();
    };

    const onFocus = () => {
      readSelectedHeaderGroup();
    };

    window.addEventListener('user-group-changed', onGroupChanged as EventListener);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('user-group-changed', onGroupChanged as EventListener);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (!canRejectBySelectedGroup && isRejectModalOpen) {
      setIsRejectModalOpen(false);
      setRejectTarget(null);
      setRejectRemark('');
    }
    if (!canRejectBySelectedGroup && isItemRejectModalOpen) {
      setIsItemRejectModalOpen(false);
      setItemRejectTarget(null);
      setItemRejectOptions([]);
      setItemRejectSelection('');
      setItemRejectOptionsLoading(false);
      setItemRejectRemark('');
    }
  }, [canRejectBySelectedGroup, isRejectModalOpen, isItemRejectModalOpen]);

  useEffect(() => {
    void fetchFilterOptions();
  }, [appliedMonth, appliedYear, selectedBusinessUnits, selectedDivisions, transactions]);

  // ============================================================================
  // 3. HELPERS & HANDLERS
  // ============================================================================

  const getTypeBadgeColor = (category: string) => {
    switch (category) {
      case 'transfer': return 'bg-purple-100 text-purple-700 border-purple-200'; 
      case 'add': return 'bg-cyan-100 text-cyan-700 border-cyan-200';       
      case 'adjust': return 'bg-pink-100 text-pink-700 border-pink-200';     
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  const getStatusBadgeColor = (item: Pick<TransactionProgressItem, 'statusLabel' | 'processStage' | 'hasRejectedItem'>) => {
    if (item.hasRejectedItem || isRejectedStatus(item.statusLabel)) {
      return 'bg-red-100 text-red-700 border border-red-200';
    }
    if (item.processStage === 3 || /complete|สมบูรณ์/i.test(String(item.statusLabel || ''))) {
      return 'bg-green-100 text-green-800 border border-green-200';
    }
    return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  };
  const canRejectItem = (item: Pick<TransactionProgressItem, 'statusLabel' | 'allRejected'>) =>
    canRejectBySelectedGroup && !item.allRejected && !isRejectedStatus(item.statusLabel);
  const getTypeSummary = (row: TransactionProgressItem) => {
    const byLabel = new Map<string, string>();
    row.items.forEach((item) => {
      const label = String(item.typeLabel || '').trim();
      if (!label || byLabel.has(label)) return;
      byLabel.set(label, item.typeCategory || 'other');
    });
    if (byLabel.size === 0 && row.category) {
      byLabel.set(row.category, row.typeCategory || 'other');
    }
    return Array.from(byLabel.entries()).map(([label, category]) => ({ label, category }));
  };
  const getResolutionSummary = (row: TransactionProgressItem) => {
    const lines = row.items
      .map((item) => `[${item.id}] ${String(item.description || '').trim()}`)
      .filter((line) => line !== '[]');
    if (lines.length === 0 && row.resolution) return [row.resolution];
    return lines;
  };
  const fetchRejectableItemOptions = async (documentNo: string): Promise<RejectableItemOption[]> => {
    const employeeId = getEmployeeId();
    const res = await fetch(`/api/documents/${documentNo}?employeeId=${employeeId}`);
    if (!res.ok) return [];
    const detailJson = await res.json().catch(() => null);
    if (!detailJson?.data) return [];

    const rawItems: APIDocumentItem[] = Array.isArray(detailJson.data.items) ? detailJson.data.items : [];
    const dedupedItems = dedupeDocumentItems(rawItems);
    const rawLogs: APIDocAuditLogDetail[] = Array.isArray(detailJson.data.logs) ? detailJson.data.logs : [];
    const seqByItem = new Map<string, number>();

    // Preferred source: active approval seq of each item (AuditStatus=1)
    rawLogs.forEach((log) => {
      if (Number(log.AuditStatus) !== 1) return;
      const itemKey = normalizeItemId(log.ItemID);
      const seqno = Number(log.Seqno || 0);
      if (!itemKey || seqno < 0 || seqByItem.has(itemKey)) return;
      seqByItem.set(itemKey, seqno);
    });

    rawItems.forEach((row) => {
      const itemKey = normalizeItemId(row.ItemID);
      if (!itemKey || seqByItem.has(itemKey)) return;
      const seqno = Number(row.Seqno || 0);
      if (Number(row.AuditStatus) === 1 && seqno >= 0) {
        seqByItem.set(itemKey, seqno);
      }
    });

    // Fallback for documents that are no longer active: use highest seq from rawItems
    rawItems.forEach((row) => {
      const itemKey = normalizeItemId(row.ItemID);
      const seqno = Number(row.Seqno || 0);
      if (!itemKey || seqno < 0) return;
      const prev = seqByItem.get(itemKey) || 0;
      if (seqno > prev) seqByItem.set(itemKey, seqno);
    });

    // Fallback: use highest seq from rawLogs (since rawItems might be filtered by EmployeeID for HRPolicy)
    rawLogs.forEach((log) => {
      const itemKey = normalizeItemId(log.ItemID);
      const seqno = Number(log.Seqno || 0);
      if (!itemKey || seqno < 0) return;
      const prev = seqByItem.get(itemKey) || 0;
      if (seqno > prev) seqByItem.set(itemKey, seqno);
    });

    return dedupedItems
      .map((item) => {
        const normalizedItemId = normalizeItemId(item.ItemID);
        const seqno = seqByItem.get(normalizedItemId) || 0;
        return {
          itemId: item.ItemID,
          seqno,
          typeLabel: getTypeLabelByTransactionType(item.TransactionType),
          description: item.TransactionDesc || '',
          rejectionReason: String(item.RejectionReason || '').trim(),
        };
      })
      .filter((item) => item.seqno >= 0 && !item.rejectionReason)
      .map((item) => ({
        itemId: item.itemId,
        seqno: item.seqno,
        typeLabel: item.typeLabel,
        description: item.description,
      }));
  };

  // View modal: fetch detail from API
  const handleOpenView = async (item: TransactionProgressItem) => {
    setSelectedTransaction(item);
    setIsViewModalOpen(true);
    setViewLoading(true);

    try {
      const employeeId = getEmployeeId();
      const res = await fetch(`/api/documents/${item.id}?employeeId=${employeeId}`);
      if (res.ok) {
        const detailJson = await res.json();
        if (detailJson.data) {
          const rawLogs: APIDocAuditLogDetail[] = Array.isArray(detailJson.data.logs) ? detailJson.data.logs : [];
          const latestRejectByItem = new Map<string, APIDocAuditLogDetail>();
          let latestRejectGlobal: APIDocAuditLogDetail | undefined;
          rawLogs.forEach((log) => {
            if (Number(log.AuditStatus) !== -1) return;

            if (!latestRejectGlobal || toDateTimeMs(log.AuditDate) >= toDateTimeMs(latestRejectGlobal.AuditDate)) {
              latestRejectGlobal = log;
            }

            const itemKey = normalizeItemId(log.ItemID);
            if (!itemKey) return;
            const prev = latestRejectByItem.get(itemKey);
            if (!prev || toDateTimeMs(log.AuditDate) >= toDateTimeMs(prev.AuditDate)) {
              latestRejectByItem.set(itemKey, log);
            }
          });

          const rawItems: APIDocumentItem[] = Array.isArray(detailJson.data.items) ? detailJson.data.items : [];
          const dedupedItems = dedupeDocumentItems(rawItems);

          const items: TransactionDetail[] = dedupedItems.map((i) => ({
            ...((): { rejectedBy?: string; rejectedRole?: string; rejectedAt?: string; rejectionReason?: string } => {
              const rejectLog = latestRejectByItem.get(normalizeItemId(i.ItemID)) || latestRejectGlobal;
              
              const rawReason = String(i.RejectionReason || '').trim();
              const actorMatch = rawReason.match(/\(Rejected by ([^)]+)(?: at ([^)]+))?\)\s*$/i);
              
              let extractedActor: string | undefined;
              let extractedDate: string | undefined;
              if (actorMatch) {
                extractedActor = actorMatch[1].trim();
                extractedDate = actorMatch[2] ? actorMatch[2].trim() : undefined;
                if (!extractedDate && extractedActor.includes(' at ')) {
                   const parts = extractedActor.split(' at ');
                   extractedActor = parts[0].trim();
                   extractedDate = parts.slice(1).join(' at ').trim();
                }
              }

              const cleanReason = actorMatch ? rawReason.replace(/\s*\(Rejected by [^)]+\)\s*$/i, '').trim() : rawReason;

              return {
                rejectedBy: extractedActor || (rejectLog ? `${rejectLog.EmployeeID} ${rejectLog.Fullname}`.trim() : undefined),
                rejectedRole: extractedActor ? 'ผู้ดูแลระบบ (HR Policy)' : (rejectLog ? toRoleLabel(rejectLog) : undefined),
                rejectedAt: (extractedDate ? dayjs(extractedDate).format('DD/MM/BBBB HH:mm') : undefined) || (rejectLog?.AuditDate ? dayjs(rejectLog.AuditDate).format('DD/MM/BBBB HH:mm') : undefined),
                rejectionReason: cleanReason
              };
            })(),
            id: i.ItemID,
            typeLabel: getTypeLabelByTransactionType(i.TransactionType),
            typeCategory: i.TransactionType === 4 ? 'add' : i.TransactionType === 3 ? 'adjust' : 'transfer',
            description: i.TransactionDesc || '',
            remark: i.ReqRemark || '-',
            hasFile: Number(i.FileCount || 0) > 0,
            fileUrl: i.FileUrl,
          }));

          const logs: ApprovalLogItem[] = rawLogs.map((l: APIDocAuditLogDetail) => ({
            action: l.Seqno === 0 ? 'สร้าง' : l.AuditStatus === 2 ? 'อนุมัติ' : l.AuditStatus === 1 ? 'รออนุมัติ' : l.AuditStatus === -1 ? 'ไม่อนุมัติ' : 'รอดำเนินการ',
            timestamp: l.AuditDate ? dayjs(l.AuditDate).format('DD/MM/BBBB HH:mm') : '',
            user: `${l.EmployeeID} ${l.Fullname}`,
            role: toRoleLabel(l),
            status: (l.AuditStatus === 2 ? 'completed' : l.AuditStatus === 1 ? 'current' : 'pending') as 'completed' | 'current' | 'pending',
          }));

          logs.push({
            action: 'เอกสารสมบูรณ์',
            timestamp: '',
            user: '-',
            role: 'System',
            status: item.processStage === 3 ? 'success' : 'pending',
          });

          setSelectedTransaction({
            ...item,
            items,
            logs
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setViewLoading(false);
    }
  };

  // Reject handler
  const handleOpenReject = (item: TransactionProgressItem) => {
    if (!canRejectItem(item)) return;
    setRejectTarget(item);
    setRejectRemark('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!canRejectBySelectedGroup) return;
    if (!rejectTarget || !rejectRemark.trim()) return;
    if (rejectTarget.hasRejectedItem || isRejectedStatus(rejectTarget.statusLabel)) return;
    setRejectLoading(true);

    try {
      const { employeeId, employeeName } = getUserContext();
      const actorText = `Rejected by ${employeeId}${employeeName ? ` ${employeeName}` : ''} at ${dayjs().toISOString()}`;
      const finalRemark = /Rejected by/i.test(rejectRemark)
        ? rejectRemark
        : `${rejectRemark} (${actorText})`;
      const resp = await fetch('/api/documents/reject-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentNo: rejectTarget.id,
          remark: finalRemark,
          updateBy: employeeId
        })
      });

      if (resp.ok) {
        setIsRejectModalOpen(false);
        setRejectRemark('');
        setRejectTarget(null);
        // Refresh data
        fetchProgress();
      } else {
        console.error('Failed to reject');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleOpenItemReject = async (row: TransactionProgressItem) => {
    if (!canRejectItem(row)) return;
    setItemRejectTarget({ documentNo: row.id, inboxNumber: row.inboxNumber });
    setItemRejectOptions([]);
    setItemRejectSelection('');
    setItemRejectRemark('');
    setIsItemRejectModalOpen(true);
    setItemRejectOptionsLoading(true);

    try {
      const options = await fetchRejectableItemOptions(row.id);
      setItemRejectOptions(options);
      if (options.length > 0) {
        setItemRejectSelection(`${options[0].itemId}::${options[0].seqno}`);
      }
    } catch (err) {
      console.error(err);
      setItemRejectOptions([]);
      setItemRejectSelection('');
    } finally {
      setItemRejectOptionsLoading(false);
    }
  };

  const handleConfirmItemReject = async () => {
    if (!canRejectBySelectedGroup) return;
    if (!itemRejectTarget || !itemRejectRemark.trim() || !itemRejectSelection) return;

    const selected = itemRejectOptions.find((option) => `${option.itemId}::${option.seqno}` === itemRejectSelection);
    if (!selected) return;

    setItemRejectLoading(true);

    try {
      const { employeeId, employeeName } = getUserContext();
      const actorText = `Rejected by ${employeeId}${employeeName ? ` ${employeeName}` : ''} at ${dayjs().toISOString()}`;
      const finalRemark = /Rejected by/i.test(itemRejectRemark)
        ? itemRejectRemark
        : `${itemRejectRemark} (${actorText})`;

      const resp = await fetch('/api/documents/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentNo: itemRejectTarget.documentNo,
          itemId: selected.itemId,
          seqno: selected.seqno,
          remark: finalRemark,
          updateBy: employeeId
        })
      });

      if (!resp.ok) {
        console.error('Failed to reject item');
        return;
      }

      setIsItemRejectModalOpen(false);
      setItemRejectTarget(null);
      setItemRejectOptions([]);
      setItemRejectSelection('');
      setItemRejectRemark('');
      await fetchProgress();
    } catch (err) {
      console.error(err);
    } finally {
      setItemRejectLoading(false);
    }
  };

  const handleSearchClick = async () => {
    setAppliedMonth(selectedMonth);
    setAppliedYear(selectedYear);
    await fetchProgress();
  };

  // Client-side filtering
  const filteredTransactions = transactions.filter(item => {
    if (appliedMonth || appliedYear) {
      const parsed = dayjs(item.effectiveDate);
      if (!parsed.isValid()) return false;

      if (appliedMonth) {
        const targetMonth = months.indexOf(appliedMonth) + 1;
        if (targetMonth > 0 && parsed.month() + 1 !== targetMonth) return false;
      }

      if (appliedYear) {
        const selectedYearNum = Number.parseInt(String(appliedYear).trim(), 10);
        if (Number.isFinite(selectedYearNum)) {
          const targetAdYear = selectedYearNum > 2400 ? selectedYearNum - 543 : selectedYearNum;
          if (parsed.year() !== targetAdYear) return false;
        }
      }
    }

    if (filterInbox && !item.inboxNumber.toLowerCase().includes(filterInbox.toLowerCase())) return false;
    if (filterCat) {
      const hasMatchedCategory =
        item.items.some((detail) => String(detail.typeLabel || '').trim() === filterCat) ||
        String(item.category || '').trim() === filterCat;
      if (!hasMatchedCategory) return false;
    }
    if (filterRes) {
      const normalizedFilterRes = filterRes.toLowerCase();
      const searchableText = [
        item.resolution,
        ...item.items.map((detail) => `${detail.id} ${detail.description} ${detail.remark}`)
      ].join(' ').toLowerCase();
      if (!searchableText.includes(normalizedFilterRes)) return false;
    }
    if (filterStatus) {
      if (filterStatus === 'Rejected') {
        const isRejected = isRejectedStatus(item.statusLabel) || item.hasRejectedItem;
        if (!isRejected) return false;
      } else if (item.statusLabel !== filterStatus) {
        return false;
      }
    }
    if (!matchesSelected(selectedBusinessUnits, item.businessUnitId, item.businessUnitName)) return false;
    if (!matchesSelected(selectedDivisions, item.divisionId, item.divisionName)) return false;
    if (!matchesSelected(selectedAgencies, item.agencyId, item.agencyName)) return false;
    return true;
  });

  // Calculate Paginated Data
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterInbox, filterCat, filterRes, filterStatus, selectedBusinessUnits, selectedDivisions, selectedAgencies, appliedMonth, appliedYear, transactions]);

  return (
    <Main currentPath="/transaction/progress">
      <div className="space-y-4">
        
        {/* 1. HEADER GRADIENT */}
        <Card className="border-0 shadow-md rounded-lg overflow-hidden py-0">
          <div className="bg-linear-to-r from-blue-200 to-blue-500 px-6 py-3 flex items-center justify-between shadow-lg rounded-t-lg border-b border-blue-500/30">
            <h1 className="text-xl font-bold text-gray-800 tracking-wide flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-900" />
              Transaction Progress
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm px-4 py-1 rounded-lg shadow-sm border border-white/50">
                <span className="text-gray-600 text-sm font-semibold uppercase tracking-wider mr-1">
                  Effective Date :
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-8 bg-transparent text-gray-800 text-sm font-bold border-none focus:ring-0 cursor-pointer outline-none hover:text-blue-700"
                  >
                    <option value="">ทั้งหมด</option>
                    {['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <span className="text-gray-400">/</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="h-8 bg-transparent text-gray-800 text-sm font-bold border-none focus:ring-0 cursor-pointer outline-none hover:text-blue-700"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleSearchClick} className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-8 text-sm">
                    <Search className="w-3 h-3 mr-2" /> ค้นหา
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 2. FILTER BAR */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-wrap items-center gap-6">
            {/* หน่วยธุรกิจ */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยธุรกิจ :</label>
                <MultiSelectFilter
                  values={selectedBusinessUnits}
                  options={businessUnitOptions}
                  placeholder="เลือกหน่วยธุรกิจ..."
                  onChange={(nextValues) => {
                    setSelectedBusinessUnits(nextValues);
                    setSelectedDivisions([]);
                    setSelectedAgencies([]);
                  }}
                />
            </div>

            {/* สายงาน */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">สายงาน :</label>
                <MultiSelectFilter
                  values={selectedDivisions}
                  options={lineOfWorkOptions}
                  placeholder="เลือกสายงาน..."
                  onChange={(nextValues) => {
                    setSelectedDivisions(nextValues);
                    setSelectedAgencies([]);
                  }}
                />
            </div>

            {/* หน่วยงาน */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยงาน :</label>
                <MultiSelectFilter
                  values={selectedAgencies}
                  options={orgUnitOptions}
                  placeholder="เลือกหน่วยงาน..."
                  onChange={(nextValues) => setSelectedAgencies(nextValues)}
                />
            </div>

            <div className="flex-1"></div>
        </div>

        {/* 3. TABLE CARD */}
        <Card className="bg-white border-0 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-270px)]">
          <CardContent className="p-0 flex-1 overflow-y-auto relative">
            <div className="min-w-full inline-block align-middle">
              <table className="w-full relative">
                <thead className="sticky top-0 z-20">
                  {/* 3.1 Main Headers */}
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-[200px] border-b border-gray-200">
                        <div className="flex items-center gap-1"><Hash className="w-3 h-3 text-gray-400" />Inbox No.</div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-[200px] border-b border-gray-200">ประเภท</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold w-[50%] border-b border-gray-200">มติ / เรื่อง</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-[200px] border-b border-gray-200">สถานะ</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap border-b border-gray-200">Action</th>
                  </tr>
                  
                  {/* 3.2 Column Filters */}
                  <tr className="bg-gray-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border-b border-gray-200 relative z-10">
                    <th className="px-4 py-2 border-b border-gray-200 font-normal">
                        <input type="text" value={filterInbox} onChange={(e) => setFilterInbox(e.target.value)} placeholder="ค้นหา..." className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 focus:outline-none" />
                    </th>
                    <th className="px-4 py-2 border-b border-gray-200 font-normal">
                        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white">
                          <option value="">ทั้งหมด</option>
                          <option value="ภายใต้ ผช.">ภายใต้ ผช.</option>
                          <option value="โอนกรอบอื่นๆ">โอนกรอบอื่นๆ</option>
                          <option value="ปรับสัดส่วน">ปรับสัดส่วน</option>
                          <option value="เพิ่ม/ลด">เพิ่ม/ลด</option>
                          <option value="ยืม">ยืม</option>
                        </select>
                    </th>
                    <th className="px-4 py-2 border-b border-gray-200 font-normal">
                        <input type="text" value={filterRes} onChange={(e) => setFilterRes(e.target.value)} placeholder="ค้นหา..." className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 focus:outline-none" />
                    </th>
                    <th className="px-4 py-2 border-b border-gray-200 font-normal">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white">
                          <option value="">ทั้งหมด</option>
                          <option value="Waiting HRVerify">Waiting HRVerify</option>
                          <option value="Waiting HRUser">Waiting HRUser</option>
                          <option value="Complete">Complete</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                    </th>
                    <th className="px-4 py-2 border-b border-gray-200"></th>
                  </tr>
                </thead>
                
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">กำลังโหลดข้อมูล...</td></tr>
                  ) : paginatedTransactions.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">ไม่มีรายการ</td></tr>
                  ) : paginatedTransactions.map((item, index) => (
                    <tr key={item.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      {/* Inbox No. (Clickable) */}
                      <td className="px-4 py-4 text-sm font-medium align-top">
                         <button
                           onClick={() => handleOpenView(item)}
                           className={`hover:underline font-mono whitespace-nowrap flex items-center gap-1 ${
                             item.hasRejectedItem
                               ? 'text-red-600 hover:text-red-800'
                               : 'text-blue-600 hover:text-blue-800'
                           }`}
                         >
                            <Hash className="w-3 h-3" />{item.inboxNumber}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-medium align-top">
                        {(() => {
                          const typeSummary = getTypeSummary(item);
                          return (
                            <div className="flex flex-wrap gap-1.5">
                              {typeSummary.slice(0, 2).map((type) => (
                                <span
                                  key={`${item.id}-${type.label}`}
                                  className={`inline-block px-2 py-1 rounded text-xs font-bold border ${getTypeBadgeColor(type.category)}`}
                                  title={type.label}
                                >
                                  {type.label}
                                </span>
                              ))}
                              {typeSummary.length > 2 && (
                                <span className="inline-block px-2 py-1 rounded text-xs font-bold border bg-gray-100 text-gray-700 border-gray-200">
                                  +{typeSummary.length - 2}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 align-top leading-relaxed">
                        {(() => {
                          const resolutionSummary = getResolutionSummary(item);
                          return (
                            <div className="space-y-1">
                              {resolutionSummary.slice(0, 2).map((line, lineIndex) => (
                                <div key={`${item.id}-res-${lineIndex}`} className="leading-relaxed">{line}</div>
                              ))}
                              {resolutionSummary.length > 2 && (
                                <div className="text-xs text-gray-400">+ อีก {resolutionSummary.length - 2} รายการ</div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="text-[10px] text-gray-400 mt-1">Created: {item.createdDate}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-center">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${getStatusBadgeColor(item)}`}>
                            {item.statusLabel}
                          </span>
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        {canRejectItem(item) ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all shadow-sm"
                              onClick={() => handleOpenItemReject(item)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject Item
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all shadow-sm"
                              onClick={() => handleOpenReject(item)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject All
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>

          {/* Pagination Controls */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                className="relative inline-flex items-center text-sm font-medium"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                variant="outline"
                className="ml-3 relative inline-flex items-center text-sm font-medium"
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredTransactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="font-medium">{filteredTransactions.length}</span> results
                </p>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 max-w-[100px] border border-gray-300 rounded text-sm px-2 text-gray-700 bg-white"
                >
                  <option value={10}>10 รายการ</option>
                  <option value={20}>20 รายการ</option>
                  <option value={50}>50 รายการ</option>
                  <option value={100}>100 รายการ</option>
                </select>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ================================================================================= */}
      {/* VIEW MODAL (POPUP) - Read-Only — styled like Home page modal */}
      {/* ================================================================================= */}
      {isViewModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-10 pl-20 animate-in fade-in">
          <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border-t-8 border-blue-600">
            
            {/* HEADER with Stepper */}
            <div className="bg-blue-50 shadow-sm shrink-0 relative z-20 border-b px-6 py-2 flex items-center justify-between gap-8 h-[80px]">
                {/* Title */}
                <div className="shrink-0 min-w-[200px]">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <FileText className="w-5 h-5 text-blue-600" />
                        ตรวจสอบการเปลี่ยนแปลงกรอบอัตรากำลัง
                    </h2>
                    <p className="text-sm text-gray-700 mt-1 ml-7">
                        Ref: {selectedTransaction.inboxNumber}
                    </p>
                </div>

                {/* Stepper */}
                <div className="flex-1 flex justify-center max-w-lg">
                    <div className="flex items-center w-full relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded"></div>
                        <div className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 transition-all duration-500 -translate-y-1/2 rounded" 
                                style={{ width: selectedTransaction.processStage === 1 ? '0%' : selectedTransaction.processStage === 2 ? '50%' : '100%' }}></div>
                        
                        {['สร้าง', 'รออนุมัติ', 'สมบูรณ์'].map((label, idx) => {
                             const stepNum = idx + 1;
                             const isCompleted = selectedTransaction.processStage > stepNum;
                             const isCurrent = selectedTransaction.processStage === stepNum;
                             return (
                                <div key={stepNum} className="flex-1 flex flex-col items-center z-10 cursor-default">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all
                                        ${isCompleted ? 'bg-white border-green-500 text-green-600' : 
                                        isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-110' : 
                                        'bg-white border-gray-300 text-gray-400'}`}>
                                        {isCompleted ? <Check size={12}/> : stepNum}
                                    </div>
                                    <span className={`mt-1 text-[10px] font-medium ${isCompleted || isCurrent ? 'text-blue-900' : 'text-gray-400'}`}>{label}</span>
                                </div>
                             )
                        })}
                    </div>
                </div>

                {/* Close */}
                <div className="shrink-0 min-w-[40px] text-right">
                    <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {viewLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400">กำลังโหลดข้อมูล...</div>
                ) : (
                  <>
                    {/* Items Table */}
                    <Card className="border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-blue-500 text-white border-b">
                                    <tr>
                                        <th className="p-3 w-[150px]">ประเภท</th>
                                        <th className="p-3">มติ / หมายเหตุ</th>
                                        <th className="p-3 text-center w-[60px]">File</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {selectedTransaction.items.map((item, itemIndex) => {
                                        const rejectReasonDisplay = String(item.rejectionReason || '').trim();
                                        const showRejectReasonText = !!rejectReasonDisplay && !/^Rejected by\b/i.test(rejectReasonDisplay);
                                        return (
                                        <tr key={`${item.id}-${itemIndex}`} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 align-top">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${getTypeBadgeColor(item.typeCategory)}`}>
                                                {item.typeLabel}
                                                </span>
                                            </td>
                                            <td className="p-4 align-top space-y-2">
                                                <div className="font-semibold text-gray-900 text-sm leading-relaxed">
                                                    <div className="text-xs text-blue-600 font-bold mb-0.5">[{item.id}]</div>
                                                    {item.description}
                                                </div>
                                                {item.remark && item.remark !== '-' && (
                                                    <div className="text-xs text-gray-500 p-0 rounded inline-block">
                                                        <span className="font-bold mr-1 text-gray-500">หมายเหตุ:</span> {item.remark}
                                                    </div>
                                                )}
                                                {item.rejectionReason && (
                                                    <div className="mt-2 text-xs text-red-700 bg-white border border-red-200 p-2 rounded shadow-sm flex items-start gap-2">
                                                        <XCircle size={14} className="mt-0.5 shrink-0"/> 
                                                        <span>
                                                          {showRejectReasonText && (
                                                            <span><b>Reject Reason:</b> {rejectReasonDisplay}</span>
                                                          )}
                                                          {(item.rejectedBy || item.rejectedRole || item.rejectedAt) && (
                                                            <span className={`${showRejectReasonText ? 'mt-1' : ''} block space-y-1 text-[11px] text-red-800`}>
                                                              {item.rejectedBy && <span className="block"><b>Rejected By:</b> {item.rejectedBy}</span>}
                                                              {item.rejectedRole && <span className="block"><b>Role:</b> {item.rejectedRole}</span>}
                                                              {item.rejectedAt && <span className="block"><b>Rejected At:</b> {item.rejectedAt}</span>}
                                                            </span>
                                                          )}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center align-top">
                                                {item.hasFile && item.fileUrl ? (
                                                    <a href={`/api/${item.fileUrl}`} target="_blank" rel="noopener noreferrer" className="inline-block p-2 hover:bg-blue-100 rounded-full text-blue-600 transition-colors">
                                                        <FileIcon size={18} />
                                                    </a>
                                                ) : item.hasFile ? (
                                                    <button className="p-2 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"><FileIcon size={18} /></button>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {selectedTransaction.items.length === 0 && (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">ไม่มีรายการย่อย</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Approval Log */}
                    {selectedTransaction.logs.length > 0 && (
                        <Card className="border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-blue-500 px-4 py-3 flex items-center gap-2">
                                <Clock className="text-white w-4 h-4" />
                                <h3 className="text-white text-sm font-bold">ประวัติการดำเนินการ (Approval Log)</h3>
                            </div>
                            <div className="p-0">
                                <div className="divide-y divide-gray-100">
                                {selectedTransaction.logs.map((log, index) => (
                                    <div key={index} className={`flex items-center px-6 py-4 text-sm transition-colors 
                                        ${log.status === 'current' ? 'bg-blue-50/60' : 'bg-white'}`}>
                                        <div className="w-32 shrink-0">
                                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium border w-28
                                                ${log.status === 'success' ? 'bg-green-100 text-green-700 border-green-200 shadow-sm' :
                                                  log.status === 'completed' ? 'bg-white text-green-600 border-green-600' : 
                                                  log.status === 'current' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 
                                                  'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                                {log.status === 'current' && <ArrowRight size={10} className="mr-1 animate-pulse"/>}
                                                {log.action}
                                            </span>
                                        </div>
                                        <div className="w-40 px-4 flex items-center gap-2 text-xs">
                                            {log.timestamp ? (
                                                <span className="text-gray-600 font-medium flex gap-1"><Clock size={14} className="text-gray-400"/> {log.timestamp}</span>
                                            ) : (<span className="text-gray-300">-</span>)}
                                        </div>
                                        <div className={`flex-1 px-4 font-medium ${log.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>{log.user}</div>
                                        <div className={`w-56 text-right text-xs ${log.status === 'pending' ? 'text-gray-400' : 'text-gray-500'}`}>{log.role}</div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </Card>
                    )}
                  </>
                )}
            </div>

            <div className="bg-white border-t p-4 flex justify-end items-center shrink-0">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================================= */}
      {/* ITEM REJECT MODAL */}
      {/* ================================================================================= */}
      {isItemRejectModalOpen && itemRejectTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border-t-4 border-red-600">
            <div className="px-6 py-4 flex justify-between items-center border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2"><XCircle size={20} /> ยืนยันยกเลิกบางรายการ (Reject Item)</h3>
              <button
                onClick={() => {
                  setIsItemRejectModalOpen(false);
                  setItemRejectTarget(null);
                  setItemRejectOptions([]);
                  setItemRejectSelection('');
                  setItemRejectOptionsLoading(false);
                  setItemRejectRemark('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20}/>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-2 text-sm text-gray-600">
                Ref: <span className="font-bold text-gray-800">{itemRejectTarget.inboxNumber}</span>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกรายการที่ต้องการ Reject <span className="text-red-500">*</span>
              </label>
              <select
                value={itemRejectSelection}
                onChange={(e) => setItemRejectSelection(e.target.value)}
                disabled={itemRejectOptionsLoading || itemRejectOptions.length === 0}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white text-sm mb-3 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {itemRejectOptionsLoading ? (
                  <option value="">กำลังโหลดรายการ...</option>
                ) : itemRejectOptions.length === 0 ? (
                  <option value="">ไม่พบรายการที่ Reject ได้</option>
                ) : (
                  itemRejectOptions.map((option) => (
                    <option key={`${option.itemId}-${option.seqno}`} value={`${option.itemId}::${option.seqno}`}>
                      [{option.itemId}] {option.typeLabel} : {option.description}
                    </option>
                  ))
                )}
              </select>
              <label className="block text-sm font-medium text-gray-700 mb-2">ระบุเหตุผลในการยกเลิกรายการ <span className="text-red-500">*</span></label>
              <textarea
                value={itemRejectRemark}
                onChange={(e) => setItemRejectRemark(e.target.value)}
                rows={4}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="โปรดระบุเหตุผล"
              />
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsItemRejectModalOpen(false);
                  setItemRejectTarget(null);
                  setItemRejectOptions([]);
                  setItemRejectSelection('');
                  setItemRejectOptionsLoading(false);
                  setItemRejectRemark('');
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleConfirmItemReject}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={itemRejectLoading || !itemRejectRemark.trim() || !itemRejectSelection || itemRejectOptionsLoading}
              >
                {itemRejectLoading ? 'Processing...' : 'ยืนยัน Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================================= */}
      {/* REJECT ALL MODAL — styled like Home page Reject All modal */}
      {/* ================================================================================= */}
      {isRejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border-t-4 border-red-600">
            <div className="px-6 py-4 flex justify-between items-center border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2"><XCircle size={20} /> ยืนยันการยกเลิกทั้งหมด (Reject All)</h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6">
              <div className="mb-3 text-sm text-gray-600">
                Ref: <span className="font-bold text-gray-800">{rejectTarget.inboxNumber}</span>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ระบุเหตุผลในการยกเลิกรายการ <span className="text-red-500">*</span></label>
              <textarea 
                value={rejectRemark}
                onChange={(e) => setRejectRemark(e.target.value)}
                rows={4}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" 
                placeholder=""
              />
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>ยกเลิก</Button>
              <Button 
                onClick={handleConfirmReject} 
                className="bg-red-600 hover:bg-red-700 text-white" 
                disabled={rejectLoading || !rejectRemark.trim()}
              >
                {rejectLoading ? 'Processing...' : 'ยืนยัน Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Main>
  );
}
