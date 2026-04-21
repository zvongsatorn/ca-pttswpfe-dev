'use client';

import Main from '@/components/layout/main';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Trash2, X, Save, Menu, LogOut, ChevronDown, ChevronUp, Check, ChevronsUpDown, AlertCircle, ArrowRight, UserCircle, FileText, User, ShieldCheck, Users, LucideIcon, Info
} from 'lucide-react';
import { useState, useEffect, useRef, useSyncExternalStore, useMemo } from 'react'; // Added useSyncExternalStore
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import TH_Locale from 'antd/es/date-picker/locale/th_TH';
import { UserSwitchOutlined } from '@ant-design/icons';

dayjs.extend(buddhistEra);
dayjs.locale('th');

// Override the date picker locale to support Buddhist Era year
const customLocale = {
  ...TH_Locale,
  lang: {
    ...TH_Locale.lang,
    yearFormat: 'BBBB',
  },
};

// Create a custom Thai DatePicker using Antd's DatePicker
import generatePicker from 'antd/es/date-picker/generatePicker';
import dayjsGenerateConfig from 'rc-picker/es/generate/dayjs';

// Extend dayjs config to use BBBB for year rendering
const customGenerateConfig = {
  ...dayjsGenerateConfig,
  getYear: (date: dayjs.Dayjs) => date.year(),
  format: (locale: string, date: dayjs.Dayjs, format: string) => {
    if (format === 'YYYY') return date.format('BBBB');
    if (format === 'YYYY-MM') return date.format('BBBB-MM');
    // Ensure all internal formats are processed normally
    return date.format(format);
  }
};

const BDatePicker = generatePicker<dayjs.Dayjs>(customGenerateConfig);


// --- TYPE DEFINITIONS ---
type TransactionTypeEnum = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface FilteredFile {
  id: string;
  name: string;
  fileObj: File | null;
}


interface TransactionFormData {
  transactionType: TransactionTypeEnum | null;
  effectiveMonth: string;
  effectiveYear: string;
  poolRsFlag: number;
  strgFlag: number;
  bsType: number;
  specFlag: number;
  unitReceive: string;
  remark: string;
  lineStaffFlag: number;
  policyFlag: number;
  pastFlag: number;
}

export interface DetailFormData {
  levelGroupTo: string;
  levelGroupFrom: string;
  levelGroupToName?: string;
  levelGroupFromName?: string;
  unitTransferName?: string;
  unitReceiveName?: string;
  amount: number;
  conclusionNo: string;
  conclusionDate: string | null;
  unitTransfer: string;
  transferInd: number; // 0 = default, 1 = เพิ่ม, 2 = ลด (Used for activeTab === 4)
  file: File | null;
  fileOption: 'new' | 'existing';
  selectedFileId: string;
  fileUrl?: string; // Add fileUrl to interface
}

export interface ApproverUser {
  UserGroupNo: string;
  UserGroupName?: string;
  EmployeeID: string;
  OrgUnitNo: string;
  FullName: string;
  LevelGroupNo: string;
  Email: string;
  PermissionOrder: number;
  UnitSide: string;
  UserGroupRole?: string; // from backend mp_CheckFlow
}

interface SavedTransaction {
  id: string;
  transactionData: TransactionFormData;
  detailData: DetailFormData;
  createdAt: Date;
}

interface UnitOption {
  id: string;
  name: string;
  unitText?: string;
  IsAssistant?: number;
  IsUnder?: number;
  IsSecondment?: number;
  parentOrgUnitNo?: string | null;
  ParentOrgUnitNo?: string | null;
  OrgUnitNo?: string;
  UnitName?: string;
  UnitAbbr?: string;
}

type ApproverFlowKey = 'TYPE2' | 'OTHERS';

const isTransactionTypeEnum = (value: number): value is TransactionTypeEnum => {
  return value >= 1 && value <= 7;
};

const uniqueSavedTransactions = (transactions: SavedTransaction[]): SavedTransaction[] => {
  const deduped = new Map<string, SavedTransaction>();
  transactions.forEach((tx) => {
    // Keep latest payload for the same TransactionNo to avoid duplicate React keys.
    deduped.set(tx.id, tx);
  });
  return Array.from(deduped.values());
};

interface CalendarWindowState {
  isChecking: boolean;
  isAllowed: boolean;
  message: string;
  startDate: Date | null;
  endDate: Date | null;
}


const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const CALENDAR_TYPE_END = 1;
const CALENDAR_TYPE_START = 3;

const toAdYear = (yearRaw: string): number | null => {
  const parsed = Number.parseInt(String(yearRaw || '').trim(), 10);
  if (!Number.isInteger(parsed)) return null;
  return parsed > 2400 ? parsed - 543 : parsed;
};

const formatThaiDateTime = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const yearBE = date.getFullYear() + 543;
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${yearBE} ${hour}:${minute}`;
};

// SQL DateTime can be serialized as UTC; normalize to local wall-clock value.
const normalizeUtcDateToLocalClock = (date: Date): Date => {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
};

const parseCalendarDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return normalizeUtcDateToLocalClock(value);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    if (typeof value === 'string') {
      const hasTimezoneHint = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value.trim());
      if (hasTimezoneHint) {
        return normalizeUtcDateToLocalClock(parsed);
      }
    }
    return parsed;
  }

  return null;
};

const normalizeUnitOption = (u: Record<string, unknown>): UnitOption => ({
  id: String(u.id || u.OrgUnitNo || '').trim(),
  name: String(u.name || u.unitText || u.UnitText || u.UnitName || u.OrgUnitNo || '').trim(),
  unitText: String(u.unitText || u.UnitText || '').trim() || undefined,
  IsAssistant: Number(u.IsAssistant ?? 0) || 0,
  IsUnder: Number(u.IsUnder ?? 0) || 0,
  IsSecondment: Number(u.IsSecondment ?? 0) || 0,
  parentOrgUnitNo: u.parentOrgUnitNo ? String(u.parentOrgUnitNo).trim() : (u.ParentOrgUnitNo ? String(u.ParentOrgUnitNo).trim() : null),
  ParentOrgUnitNo: u.ParentOrgUnitNo ? String(u.ParentOrgUnitNo).trim() : (u.parentOrgUnitNo ? String(u.parentOrgUnitNo).trim() : null),
  OrgUnitNo: u.OrgUnitNo ? String(u.OrgUnitNo).trim() : undefined,
  UnitName: u.UnitName ? String(u.UnitName).trim() : undefined,
  UnitAbbr: u.UnitAbbr ? String(u.UnitAbbr).trim() : undefined
});

const normalizeUserGroupNo = (value: string): string => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return /^\d+$/.test(trimmed) ? trimmed.padStart(2, '0') : '';
};

const UNITS_CACHE_PREFIX = 'user_units_cache:';
const LEGACY_UNITS_CACHE_KEY = 'user_units_cache';

const buildUnitsCacheKey = (employeeId: string, userGroupNo: string): string => {
  return `${UNITS_CACHE_PREFIX}${String(employeeId || '').trim()}:${normalizeUserGroupNo(userGroupNo)}`;
};

const clearUnitsCacheKeys = () => {
  if (typeof window === 'undefined') return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      if (key === LEGACY_UNITS_CACHE_KEY || key.startsWith(UNITS_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // no-op
  }
};

const resolveUserContext = (): { employeeId: string; userGroupNo: string } => {
  if (typeof window === 'undefined') {
    return { employeeId: '', userGroupNo: '' };
  }

  const userDataStr = localStorage.getItem('user_data');
  const selectedGroup = normalizeUserGroupNo(String(localStorage.getItem('selected_usergroup') || '').trim());
  let employeeId = '';
  let userGroupNo = '';

  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr) as {
        employeeID?: string;
        EmployeeID?: string;
        userGroupNo?: string;
        roleId?: string;
        role?: string;
        userGroups?: Array<{ userGroupNo?: string; userGroupRole?: string }>;
      };

      employeeId = String(userData.employeeID || userData.EmployeeID || '').trim();
      const userGroups = Array.isArray(userData.userGroups) ? userData.userGroups : [];
      const normalizedUserGroups = userGroups
        .map((group) => normalizeUserGroupNo(String(group?.userGroupNo || '').trim()))
        .filter(Boolean);

      // Respect selected group only when it belongs to current user's group list.
      if (selectedGroup && (normalizedUserGroups.length === 0 || normalizedUserGroups.includes(selectedGroup))) {
        userGroupNo = selectedGroup;
      }

      if (!userGroupNo) {
        const groupFromUser = String(
          userData.userGroupNo ||
          userData.roleId ||
          userData.userGroups?.[0]?.userGroupNo ||
          ''
        ).trim();
        userGroupNo = normalizeUserGroupNo(groupFromUser);
      }
    } catch {
      // ignore parse failure and use fallback values
    }
  }

  return { employeeId, userGroupNo };
};

const extractCalendarType = (row: Record<string, unknown>): number | null => {
  const raw = row.resourceId ?? row.ResourceId ?? row.ConfigType ?? row.configType;
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const extractCalendarDate = (row: Record<string, unknown>): Date | null => {
  const raw =
    row.start ??
    row.Start ??
    row.ConfigDate ??
    row.configDate ??
    row.ConfigDateLimit ??
    row.configDateLimit;

  return parseCalendarDate(raw);
};

type ApiBodyResult<T> = {
  json: T | null;
  text: string;
};

const readApiBody = async <T = Record<string, unknown>>(response: Response): Promise<ApiBodyResult<T>> => {
  const raw = await response.text();
  const text = raw.trim();
  if (!text) {
    return { json: null, text: '' };
  }

  try {
    return { json: JSON.parse(text) as T, text };
  } catch {
    return { json: null, text };
  }
};

const resolveApiErrorMessage = (
  body: { message?: unknown; error?: unknown } | null,
  fallback: string,
  text = ''
): string => {
  const error = typeof body?.error === 'string' ? body.error.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  return error || message || text || fallback;
};

const normalizeBaseUrl = (value: string): string => {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed;
};

const resolveFileUrl = (fileUpload: string): string => {
  const normalized = String(fileUpload || '').trim();
  if (!normalized) return '';
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('/api/')) return normalized.replace(/^\/api\//, '/');
  if (normalized.startsWith('/uploads/')) return normalized;
  if (normalized.startsWith('uploads/')) return `/${normalized}`;
  if (normalized.includes('/')) return `/${normalized.replace(/^\/+/, '')}`;
  return `/uploads/transactions/${normalized}`;
};

// Helper to generate years
const getYears = () => {
  if (typeof window === 'undefined') return ['2568', '2569'];
  const startYearStr = localStorage.getItem('StartYear') || '2568';
  const startYear = parseInt(startYearStr, 10);
  const currentYear = new Date().getFullYear() + 543;
  const endYear = currentYear + 1;
  const years = [];
  for (let i = endYear; i >= startYear; i--) {
    years.push(i.toString());
  }
  return years;
};

const emptySubscribe = () => () => {};
let cachedClientYears: string[] | null = null;
const getClientYearsSnapshot = () => {
  if (!cachedClientYears) {
    cachedClientYears = getYears();
  }
  return cachedClientYears;
};
const serverYears = ['2568', '2569'];
const getServerYearsSnapshot = () => serverYears;

const currentDate = new Date();
const currentMonth = months[currentDate.getMonth()];
const currentYear = (currentDate.getFullYear() + 543).toString();

export default function TransactionPage() {
  // --- STATE ---
  const years = useSyncExternalStore(emptySubscribe, getClientYearsSnapshot, getServerYearsSnapshot);

  const [activeTab, setActiveTab] = useState<TransactionTypeEnum | null>(null);
  const [savedTransactions, setSavedTransactions] = useState<SavedTransaction[]>([]);
  const [existingFiles, setExistingFiles] = useState<{id: string, name: string, conclusionNo: string, fileUrl: string}[]>([]);
  const [calendarWindowState, setCalendarWindowState] = useState<CalendarWindowState>({
    isChecking: true,
    isAllowed: false,
    message: 'กำลังตรวจสอบช่วงเวลาปฏิทิน...',
    startDate: null,
    endDate: null
  });
  // Track whether the initial calendar check has completed to avoid flashing the "checking" indicator
  const calendarCheckedOnce = useRef(false);

  // State for Request Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Store selected approver IDs per request group (Department + Flow)
  const [selectedApprovers, setSelectedApprovers] = useState<Record<string, string[]>>({});
  // Dynamic approvers from CheckFlow API (Record keyed by Department + Flow)
  const [dynamicApprovers, setDynamicApprovers] = useState<Record<string, ApproverUser[]>>({});
  // Track collapsed state for department cards
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  const getFlowKeyByType = (transactionType: TransactionTypeEnum | null): ApproverFlowKey =>
    transactionType === 2 ? 'TYPE2' : 'OTHERS';
  const getDeptFlowKey = (deptId: string, flowKey: ApproverFlowKey) => `${deptId}::${flowKey}`;
  const getFlowDisplayName = (flowKey: ApproverFlowKey) =>
    flowKey === 'TYPE2' ? 'Flow#2' : 'Flow#1';

  const toggleDeptCollapse = (deptId: string) => {
    setCollapsedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  // Auto-collapse when all flow groups are selected for a department
  useEffect(() => {
    if (!isRequestModalOpen) return;
    const groupedDepts = savedTransactions.reduce((acc, tx) => {
      const deptId = tx.transactionData.unitReceive;
      if (!acc[deptId]) acc[deptId] = [];
      acc[deptId].push(tx);
      return acc;
    }, {} as Record<string, SavedTransaction[]>);

    setCollapsedDepts(prevCollapsed => {
      const newCollapsedDepts = { ...prevCollapsed };
      let hasChanges = false;

      Object.entries(groupedDepts).forEach(([deptId, txList]) => {
        const flowKeys = Array.from(new Set(
          txList
            .filter((tx) => tx.transactionData.transactionType !== 5)
            .map((tx) => getFlowKeyByType(tx.transactionData.transactionType))
        ));
        // If this department has no approval flow items (e.g. only Remark type 5),
        // collapse it by default to reduce visual noise.
        if (flowKeys.length === 0) {
          if (prevCollapsed[deptId] !== true) {
            newCollapsedDepts[deptId] = true;
            hasChanges = true;
          }
          return;
        }

        const isComplete = flowKeys.every((flowKey) => {
          const scopeKey = getDeptFlowKey(deptId, flowKey);
          const flowApprovers = (dynamicApprovers[scopeKey] || [])
            .filter((u) => u.UserGroupNo !== '04' && !(u.UserGroupRole || '').toUpperCase().includes('HRPOLICY'));
          const groups = Array.from(new Set(flowApprovers.map((u) => `${u.UnitSide}-${u.PermissionOrder}`)));
          if (groups.length === 0) return false;

          return groups.every((groupKey) => {
            const groupUsers = flowApprovers.filter((u) => `${u.UnitSide}-${u.PermissionOrder}` === groupKey);
            return groupUsers.some((u) => selectedApprovers[scopeKey]?.includes(u.EmployeeID));
          });
        });

        // If it's freshly completed and not already collapsed, collapse it
        if (isComplete && prevCollapsed[deptId] !== true) {
          newCollapsedDepts[deptId] = true;
          hasChanges = true;
        }
      });

      return hasChanges ? newCollapsedDepts : prevCollapsed;
    });
  }, [selectedApprovers, dynamicApprovers, isRequestModalOpen, savedTransactions]);

  // Alert Modal State
  const [alertInfo, setAlertInfo] = useState<{ show: boolean, title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' }>({ show: false, title: '', message: '', type: 'info' });
  const closeAlert = () => setAlertInfo({ ...alertInfo, show: false });

  // State for Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // State for Submit Confirm Modal
  const [isSubmitConfirmModalOpen, setIsSubmitConfirmModalOpen] = useState(false);

  // Popover open/close state for each unit selector
  const [openUnitReceive, setOpenUnitReceive] = useState(false);
  const [openUnitTransfer, setOpenUnitTransfer] = useState(false);


  const [formData, setFormData] = useState<TransactionFormData>(() => {
    // Check if user is HRPolicy
    let isPolicy = 0;
    if (typeof window !== 'undefined') {
      const selectedGroup = localStorage.getItem('selected_usergroup');
      if (selectedGroup === '04') { // 04 is HRPolicy
        isPolicy = 1;
      }
    }

    return {
      transactionType: 1,
      effectiveMonth: currentMonth,
      effectiveYear: currentYear,
      poolRsFlag: 0,
      strgFlag: 0,
      bsType: 0,
      specFlag: 0,
      unitReceive: '',
      remark: '',
      lineStaffFlag: 0,
      policyFlag: isPolicy,
      pastFlag: 0,
    };
  });

  const [detailFormData, setDetailFormData] = useState<DetailFormData>({
    levelGroupTo: '',
    levelGroupFrom: '',
    amount: 1,
    conclusionNo: '',
    conclusionDate: '',
    unitTransfer: '',
    transferInd: 0,
    fileOption: 'new',
    selectedFileId: '',
    file: null,
  });
  const [uploadedFiles, setUploadedFiles] = useState<FilteredFile[]>([]);

  const transactionTypes = [
    { id: 1 as TransactionTypeEnum, label: 'โอนกรอบอัตรากำลังภายใต้สายผู้ช่วย', color: 'purple' },
    { id: 2 as TransactionTypeEnum, label: 'โอนกรอบอัตรากำลังอื่นๆ', color: 'indigo' },
    { id: 3 as TransactionTypeEnum, label: 'ปรับสัดส่วนกรอบอัตรากำลังภายในหน่วยงาน', color: 'pink' },
    { id: 4 as TransactionTypeEnum, label: 'เพิ่มลดกรอบอัตรากำลังในหน่วยงาน', color: 'cyan' },
    { id: 6 as TransactionTypeEnum, label: 'ยืมกรอบอัตรากำลัง', color: 'orange' },
    { id: 5 as TransactionTypeEnum, label: 'บันทึก Remark หน่วยงาน', color: 'gray' },
  ];

  const [units, setUnits] = useState<UnitOption[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    const userContext = resolveUserContext();
    if (!userContext.employeeId || !userContext.userGroupNo) return [];

    const scopedCacheKey = buildUnitsCacheKey(userContext.employeeId, userContext.userGroupNo);
    const cachedUnits = sessionStorage.getItem(scopedCacheKey);
    if (cachedUnits && cachedUnits !== 'undefined' && cachedUnits.trim() !== '') {
      try {
        return JSON.parse(cachedUnits);
      } catch (err) {
        console.error("Failed to parse cached units:", err);
      }
    }
    return [];
  });

  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const [allUnits, setAllUnits] = useState<UnitOption[]>([]);
  const [transferUnitsByReceive, setTransferUnitsByReceive] = useState<UnitOption[]>([]);


  useEffect(() => {
    // Listen for custom event from Header when user switches group
    const handleUnitsChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        const normalizedUnits = customEvent.detail.map((u: Record<string, unknown>) => normalizeUnitOption(u));
        setUnits(normalizedUnits);
        const { employeeId, userGroupNo } = resolveUserContext();
        if (employeeId && userGroupNo) {
          sessionStorage.setItem(buildUnitsCacheKey(employeeId, userGroupNo), JSON.stringify(normalizedUnits));
        }
        // Clear active selection if the previous selection is no longer valid
        setDetailFormData(prev => ({
          ...prev,
          unitTransfer: '' // reset transferred unit selection
        }));
      }
    };

    window.addEventListener('user-units-changed', handleUnitsChanged);
    
    // Always fetch fresh units on mount to ensure IsAssistant/IsUnder fields are present
    const userContext = resolveUserContext();
    const employeeId = userContext.employeeId;
    const defaultGroup = userContext.userGroupNo || normalizeUserGroupNo(String(localStorage.getItem('selected_usergroup') || '').trim()) || '02';
    if (employeeId) {
      const token = localStorage.getItem('auth_token');
      const query = `roleId=${encodeURIComponent(defaultGroup)}&empId=${encodeURIComponent(employeeId)}`;
      const proxyUrl = `/api/units/by-role?${query}`;
      const publicApiBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
      const directUrl = publicApiBase ? `${publicApiBase}/api/units/by-role?${query}` : '';
      const fetchTargets = Array.from(new Set([proxyUrl, directUrl].filter(Boolean)));

      const fetchInitialUnits = async () => {
        const errors: string[] = [];
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        for (const url of fetchTargets) {
          try {
            const res = await fetch(url, { headers });
            const { json: data, text } = await readApiBody<{
              status?: number;
              success?: boolean;
              data?: Record<string, unknown>[];
              message?: string;
              error?: string;
            }>(res);

            if (!res.ok) {
              errors.push(`${url} -> ${resolveApiErrorMessage(data, `HTTP ${res.status}`, text)}`);
              continue;
            }

            if (!data) {
              errors.push(`${url} -> non-JSON response (${text || `HTTP ${res.status}`})`);
              continue;
            }

            if ((data.status === 200 || data.success) && Array.isArray(data.data)) {
              const fetchedUnits = data.data.map((u: Record<string, unknown>) => normalizeUnitOption(u));
              setUnits(fetchedUnits);
              clearUnitsCacheKeys();
              sessionStorage.setItem(buildUnitsCacheKey(employeeId, defaultGroup), JSON.stringify(fetchedUnits));
              return;
            }

            errors.push(`${url} -> unexpected payload shape`);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${url} -> ${message}`);
          }
        }

        console.error('Error fetching initial units:', errors.join(' | '));
      };

      void fetchInitialUnits();
    }

    return () => {
      window.removeEventListener('user-units-changed', handleUnitsChanged);
    };
  }, [units.length]);

  useEffect(() => {
    let isMounted = true;

    const validateCalendarWindow = async () => {
      const selectedMonthIndex = months.indexOf(formData.effectiveMonth);
      const selectedYearAd = toAdYear(formData.effectiveYear);

      if (selectedMonthIndex < 0 || !selectedYearAd) {
        if (!isMounted) return;
        calendarCheckedOnce.current = true;
        setCalendarWindowState({
          isChecking: false,
          isAllowed: false,
          message: 'เดือนหรือปีที่เลือกไม่ถูกต้อง',
          startDate: null,
          endDate: null
        });
        return;
      }

      if (isMounted) {
        setCalendarWindowState((prev) => ({
          ...prev,
          isChecking: true
        }));
      }

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/calendar', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          throw new Error(`Calendar API returned ${response.status}`);
        }

        const { json: body, text } = await readApiBody<{ data?: Record<string, unknown>[] }>(response);
        if (!body) {
          throw new Error(text || 'Calendar API returned invalid response');
        }
        const rows = Array.isArray(body?.data) ? (body.data as Record<string, unknown>[]) : [];
        const monthlyEvents = rows
          .map((row) => ({
            type: extractCalendarType(row),
            date: extractCalendarDate(row)
          }))
          .filter((event): event is { type: number; date: Date } => {
            if (!event.type || !event.date) return false;
            return (
              event.date.getFullYear() === selectedYearAd &&
              event.date.getMonth() === selectedMonthIndex
            );
          });

        const startDates = monthlyEvents
          .filter((event) => event.type === CALENDAR_TYPE_START)
          .map((event) => event.date);
        const endDates = monthlyEvents
          .filter((event) => event.type === CALENDAR_TYPE_END)
          .map((event) => event.date);

        if (!startDates.length || !endDates.length) {
          if (!isMounted) return;
          calendarCheckedOnce.current = true;
          setCalendarWindowState({
            isChecking: false,
            isAllowed: false,
            message: 'ยังไม่กำหนดช่วงเวลา START/END ในปฏิทินของเดือนที่เลือก',
            startDate: null,
            endDate: null
          });
          return;
        }

        const startDate = new Date(Math.min(...startDates.map((date) => date.getTime())));
        const endDate = new Date(Math.max(...endDates.map((date) => date.getTime())));

        if (startDate.getTime() > endDate.getTime()) {
          if (!isMounted) return;
          calendarCheckedOnce.current = true;
          setCalendarWindowState({
            isChecking: false,
            isAllowed: false,
            message: 'ช่วงเวลาในปฏิทินไม่ถูกต้อง (START มากกว่า END)',
            startDate,
            endDate
          });
          return;
        }

        const now = new Date();
        const isAllowed = now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();

        if (!isMounted) return;
        calendarCheckedOnce.current = true;
        setCalendarWindowState({
          isChecking: false,
          isAllowed,
          message: isAllowed
            ? 'อยู่ในช่วงเวลาที่อนุญาตให้ทำรายการ'
            : 'นอกช่วงเวลาที่อนุญาตให้ทำรายการตามปฏิทิน',
          startDate,
          endDate
        });
      } catch (error) {
        console.error('Error validating calendar window:', error);
        if (!isMounted) return;
        calendarCheckedOnce.current = true;
        setCalendarWindowState({
          isChecking: false,
          isAllowed: false,
          message: 'ไม่สามารถตรวจสอบช่วงเวลาปฏิทินได้ กรุณาลองใหม่อีกครั้ง',
          startDate: null,
          endDate: null
        });
      }
    };

    validateCalendarWindow();

    return () => {
      isMounted = false;
    };
  }, [formData.effectiveMonth, formData.effectiveYear]);

  // Fetch Draft Transactions when effective month/year changes
  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        let employeeId = 'SYSTEM';
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            employeeId = userData.employeeID || 'SYSTEM';
          } catch (e) {
            console.error("Failed to parse user_data", e);
          }
        }

        if (employeeId === 'SYSTEM') return; // Don't fetch if not logged in properly

        const url = `/api/transactions/drafts?employeeId=${employeeId}&effectiveMonth=${encodeURIComponent(formData.effectiveMonth)}&effectiveYear=${formData.effectiveYear}`;
        const res = await fetch(url);
        if (res.ok) {
          const { json: data, text } = await readApiBody<{ status?: number; data?: Array<{
            TransactionNo: string;
            TransactionType: number;
            EffectiveDate?: string | null;
            PoolRsFlag: number;
            StrgFlag: number;
            BSType: number;
            SpecFlag: number;
            UnitReceive: string;
            Remark: string;
            LineStaffFlag: number;
            Policyflag: number;
            PastFlag: number;
            LevelGroupTo: string;
            LevelGroupFrom: string;
            LevelGroupToName?: string;
            LevelGroupFromName?: string;
            UnitTransferName?: string;
            UnitReceiveName?: string;
            Amount: number;
            ConclusionNo: string;
            ConclusionDate: string | null;
            UnitTransfer: string;
            TransferInd: number;
            CreateDate: string | null;
          }> }>(res);
          if (!data) {
            throw new Error(text || 'Draft API returned invalid response');
          }
          if (data.status === 200 && data.data && data.data.length > 0) {
            // Map the backend records to the frontend state shape
            const loadedDrafts: SavedTransaction[] = data.data.map((item) => ({
              id: item.TransactionNo,
              transactionData: {
                transactionType: isTransactionTypeEnum(item.TransactionType) ? item.TransactionType : null,
                effectiveMonth: item.EffectiveDate ? months[new Date(item.EffectiveDate).getMonth()] : currentMonth,
                effectiveYear: item.EffectiveDate ? (new Date(item.EffectiveDate).getFullYear() + 543).toString() : currentYear,
                poolRsFlag: item.PoolRsFlag || 0,
                strgFlag: item.StrgFlag || 0,
                bsType: item.BSType || 0,
                specFlag: item.SpecFlag || 0,
                unitReceive: item.UnitReceive || '',
                remark: item.Remark || '',
                lineStaffFlag: item.LineStaffFlag || 0,
                policyFlag: item.Policyflag || 0,
                pastFlag: item.PastFlag || 0,
              },
              detailData: {
                levelGroupTo: item.LevelGroupTo || '',
                levelGroupFrom: item.LevelGroupFrom || '',
                levelGroupToName: item.LevelGroupToName || '',
                levelGroupFromName: item.LevelGroupFromName || '',
                unitTransferName: item.UnitTransferName || '',
                unitReceiveName: item.UnitReceiveName || '',
                amount: item.Amount || 1,
                conclusionNo: item.ConclusionNo || '',
                conclusionDate: item.ConclusionDate ? dayjs(item.ConclusionDate).format('YYYY-MM-DD') : '',
                unitTransfer: item.UnitTransfer || '',
                transferInd: item.TransferInd || 0,
                fileOption: 'new',
                selectedFileId: '',
                file: null,
              },
              createdAt: new Date(item.CreateDate || Date.now()),
            }));
            
            setSavedTransactions(uniqueSavedTransactions(loadedDrafts));
          } else {
            // No drafts for this month, clear list
            setSavedTransactions([]);
          }
        }
      } catch (err) {
        console.error('Error fetching draft transactions:', err);
      }
    };

    fetchDrafts();
  }, [formData.effectiveMonth, formData.effectiveYear]);

  // Fetch all units by effective date for 'หน่วยงานที่โอน' dropdowns
  useEffect(() => {
    if (formData.effectiveMonth && formData.effectiveYear) {
      const yearNum = parseInt(formData.effectiveYear) - 543;
      const monthIndex = months.indexOf(formData.effectiveMonth) + 1;
      const monthStr = monthIndex.toString().padStart(2, '0');
      const effectiveDate = `${yearNum}-${monthStr}-01`;

      const fetchAllUnits = async () => {
        try {
          const res = await fetch(`/api/units/all?effectiveDate=${effectiveDate}`);
          const { json: data, text } = await readApiBody<{ success?: boolean; data?: Record<string, unknown>[] }>(res);
          if (!data) {
            console.error('Error fetching all units: non-JSON response', text || `HTTP ${res.status}`);
            return;
          }
          if (data.success && data.data) {
            setAllUnits(data.data.map((u: Record<string, unknown>) => normalizeUnitOption(u)));
          }
        } catch (err) {
          console.error('Error fetching all units:', err);
        }
      };

      void fetchAllUnits();
    }
  }, [formData.effectiveMonth, formData.effectiveYear]);

  const selectedReceiveUnit = useMemo(() => {
    if (!formData.unitReceive) return null;
    return units.find((u) => u.id === formData.unitReceive)
      || allUnits.find((u) => u.id === formData.unitReceive)
      || null;
  }, [formData.unitReceive, units, allUnits]);

  const selectedReceiveUnitFromAll = useMemo(() => {
    if (!formData.unitReceive) return null;
    return allUnits.find((u) => u.id === formData.unitReceive) || null;
  }, [formData.unitReceive, allUnits]);

  const selectedLineOrgUnitNo = useMemo(() => {
    if (!selectedReceiveUnit && !selectedReceiveUnitFromAll) return '';
    const parentFromSelected = String(
      selectedReceiveUnit?.parentOrgUnitNo || selectedReceiveUnit?.ParentOrgUnitNo || ''
    ).trim();
    const parentFromAll = String(
      selectedReceiveUnitFromAll?.parentOrgUnitNo || selectedReceiveUnitFromAll?.ParentOrgUnitNo || ''
    ).trim();
    const selectedUnitId = String(selectedReceiveUnit?.id || '').trim();
    const selectedUnitIdFromAll = String(selectedReceiveUnitFromAll?.id || '').trim();
    return String(
      selectedUnitId
      || selectedUnitIdFromAll
      || parentFromSelected
      || parentFromAll
      || ''
    ).trim();
  }, [selectedReceiveUnit, selectedReceiveUnitFromAll]);

  const transferDivisionCandidates = useMemo(() => {
    const selectedUnitId = String(selectedReceiveUnit?.id || selectedReceiveUnitFromAll?.id || '').trim();
    const parentFromSelected = String(selectedReceiveUnit?.parentOrgUnitNo || selectedReceiveUnit?.ParentOrgUnitNo || '').trim();
    const parentFromAll = String(selectedReceiveUnitFromAll?.parentOrgUnitNo || selectedReceiveUnitFromAll?.ParentOrgUnitNo || '').trim();

    return Array.from(new Set([selectedUnitId, parentFromSelected, parentFromAll].filter(Boolean)));
  }, [selectedReceiveUnit, selectedReceiveUnitFromAll]);

  useEffect(() => {
    if (activeTab !== 1) {
      setTransferUnitsByReceive([]);
      return;
    }

    if (!formData.unitReceive || !selectedLineOrgUnitNo || !formData.effectiveMonth || !formData.effectiveYear) {
      setTransferUnitsByReceive([]);
      return;
    }

    const userDataStr = localStorage.getItem('user_data');
    let employeeId = '';
    let userGroupNo = '';

    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr) as { employeeID?: string; userGroupNo?: string; roleId?: string; userGroups?: { userGroupNo: string }[] };
        employeeId = String(userData.employeeID || '').trim();
        userGroupNo = normalizeUserGroupNo(String(localStorage.getItem('selected_usergroup') || '').trim());
        if (!userGroupNo) userGroupNo = normalizeUserGroupNo(String(userData.userGroupNo || userData.roleId || '').trim());
        if (!userGroupNo && Array.isArray(userData.userGroups) && userData.userGroups.length > 0) {
          userGroupNo = normalizeUserGroupNo(String(userData.userGroups[0].userGroupNo || '').trim());
        }
      } catch {
        // no-op
      }
    }

    if (!employeeId || !userGroupNo) {
      setTransferUnitsByReceive([]);
      return;
    }

    const yearNum = parseInt(formData.effectiveYear, 10) - 543;
    const monthIndex = months.indexOf(formData.effectiveMonth) + 1;
    if (!Number.isInteger(yearNum) || monthIndex < 1) {
      setTransferUnitsByReceive([]);
      return;
    }

    const effectiveDate = `${yearNum}-${String(monthIndex).padStart(2, '0')}-01`;
    const fetchTransferUnits = async () => {
      try {
        for (const divisionCandidate of transferDivisionCandidates) {
          const query = new URLSearchParams({
            effectiveDate,
            division: divisionCandidate,
            orgUnitReceive: formData.unitReceive,
            userGroupNo,
            employeeId,
            selectType: '0'
          });

          const res = await fetch(`/api/units/transfer-by-receive?${query.toString()}`);
          const { json: data, text } = await readApiBody<{ success?: boolean; data?: Record<string, unknown>[] }>(res);
          if (!data) {
            console.error('Error fetching transfer units by receive: non-JSON response', text || `HTTP ${res.status}`);
            continue;
          }
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setTransferUnitsByReceive(data.data.map((u: Record<string, unknown>) => normalizeUnitOption(u)));
            return;
          }
        }
        setTransferUnitsByReceive([]);
      } catch (err) {
        console.error('Error fetching transfer units by receive:', err);
        setTransferUnitsByReceive([]);
      }
    };

    fetchTransferUnits();
  }, [activeTab, formData.unitReceive, formData.effectiveMonth, formData.effectiveYear, selectedLineOrgUnitNo, transferDivisionCandidates]);

  useEffect(() => {
    if (activeTab !== 1) return;
    setDetailFormData((prev) => {
      if (!prev.unitTransfer) return prev;
      if (transferUnitsByReceive.some((unit) => unit.id === prev.unitTransfer)) return prev;
      return { ...prev, unitTransfer: '' };
    });
  }, [activeTab, transferUnitsByReceive]);


  useEffect(() => {
    if (detailFormData.fileOption === 'existing' && formData.effectiveMonth && formData.effectiveYear) {
      const fetchFiles = async () => {
        try {
          let empId = 'SYSTEM';
          const userDataStr = localStorage.getItem('user_data');
          if (userDataStr) {
            try {
              const userData = JSON.parse(userDataStr);
              empId = userData.employeeID || 'SYSTEM';
            } catch (e) {
              console.error("Failed to parse user_data", e);
            }
          }

          if (empId === 'SYSTEM') return; // Don't fetch if not logged in properly

          const url = `/api/transactions/files?effectiveMonth=${encodeURIComponent(formData.effectiveMonth)}&effectiveYear=${formData.effectiveYear}&employeeId=${empId}`;
          const res = await fetch(url);
          if (res.ok) {
            const { json: data, text } = await readApiBody<{ status?: number; data?: Array<{ id: string; name: string; conclusionNo: string; fileUrl: string }> }>(res);
            if (!data) {
              throw new Error(text || 'Existing files API returned invalid response');
            }
            if (data.status === 200) {
              setExistingFiles(data.data || []);
            }
          }
        } catch (err) {
          console.error('Error fetching existing files:', err);
        }
      };
      fetchFiles();
    }
  }, [detailFormData.fileOption, formData.effectiveMonth, formData.effectiveYear]);

  // Fetch Level Groups when selected transfer unit changes.
  // For type 3/4, transfer unit is implicitly the same as unitReceive.
  useEffect(() => {
    const selectedTransferUnit = (activeTab === 3 || activeTab === 4)
      ? formData.unitReceive
      : detailFormData.unitTransfer;

    if (selectedTransferUnit) {
      const fetchLevels = async () => {
        try {
          // Construct check date (e.g. format YYYYMMDD)
          const yearNum = parseInt(formData.effectiveYear) - 543;
          const monthIndex = months.indexOf(formData.effectiveMonth) + 1;
          const monthStr = monthIndex.toString().padStart(2, '0');
          const checkDate = `${yearNum}${monthStr}01`; 
          
          const unit = selectedTransferUnit;
          const { userGroupNo } = resolveUserContext();
          const effectiveUserGroupNo = userGroupNo || '04';

          const url = `/api/units/levels?checkDate=${checkDate}&unit=${unit}&userGroupNo=${effectiveUserGroupNo}`;
          const res = await fetch(url);
          if (res.ok) {
            const { json: data, text } = await readApiBody<{ success?: boolean; data?: { id: string; name: string; nameEN: string; order: number; top: number }[] }>(res);
            if (!data) {
              throw new Error(text || 'Levels API returned invalid response');
            }
            if (data.success && Array.isArray(data.data)) {
              setLevels(data.data.map((l: { id: string; name: string; nameEN: string; order: number; top: number }) => ({
                id: l.id,
                name: l.name
              })));
            }
          }
        } catch (err) {
          console.error('Error fetching levels:', err);
        }
      };
      fetchLevels();
    } else {
      setLevels([]);
    }
  }, [activeTab, formData.unitReceive, detailFormData.unitTransfer, formData.effectiveMonth, formData.effectiveYear]);


  const getDepartmentName = (id: string, resolvedName?: string) =>
    resolvedName ||
    units.find((u) => u.id === id)?.unitText ||
    units.find((u) => u.id === id)?.name ||
    allUnits.find((u) => u.id === id)?.unitText ||
    allUnits.find((u) => u.id === id)?.name ||
    id;
  const getLevelName = (id: string, resolvedName?: string) => resolvedName || levels.find((l) => l.id === id)?.name || id;
  const getUnitName = (id: string, resolvedName?: string) =>
    resolvedName ||
    units.find((l) => l.id === id)?.unitText ||
    units.find((l) => l.id === id)?.name ||
    transferUnitsByReceive.find((u) => u.id === id)?.unitText ||
    transferUnitsByReceive.find((u) => u.id === id)?.name ||
    allUnits.find((u) => u.id === id)?.unitText ||
    allUnits.find((u) => u.id === id)?.name ||
    id;
  const getTransactionTypeName = (type: TransactionTypeEnum) => transactionTypes.find((t) => t.id === type)?.label || '';
  const getUnitReceiveOptionList = () => {
    const filtered = units.filter((unit) => {
      // Keep secondment constraint for Secondment pool, but do not
      // trim type-1 receive units by IsAssistant/IsUnder (show all by rights).
      if (formData.poolRsFlag === 2) {
        return unit.IsSecondment === 1;
      }
      return true;
    });

    // Defensive dedupe by OrgUnit id to avoid duplicate display rows.
    const seen = new Set<string>();
    return filtered.filter((unit) => {
      const key = String(unit.id || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getTitleColorClass = (type: TransactionTypeEnum) => {
    const item = transactionTypes.find((t) => t.id === type);
    switch (item?.color) {
      case 'pink': return 'bg-pink-100 text-pink-700 border-pink-300';
      case 'indigo': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'cyan': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      case 'blue': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'purple': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'gray': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'orange': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };
  const generateTransactionDesc = (tx: TransactionFormData, dt: DetailFormData) => {
    let desc = '';
    const type = tx.transactionType;
    const unitTrans = getUnitName(dt.unitTransfer, dt.unitTransferName);
    const unitRecv = getDepartmentName(tx.unitReceive, dt.unitReceiveName);
    const levelTo = getLevelName(dt.levelGroupTo, dt.levelGroupToName);
    const levelFrom = getLevelName(dt.levelGroupFrom, dt.levelGroupFromName);

    if (type === 1 || type === 2) {
      desc = `${dt.conclusionNo} : หน่วยงาน${unitTrans}โอนย้ายอัตรากำลังให้หน่วยงาน ${unitRecv} ที่${levelTo} จำนวน ${dt.amount} อัตรา`;
    } else if (type === 3) {
      desc = `${dt.conclusionNo} : ปรับเปลี่ยนอัตรากำลัง จำนวน ${dt.amount} อัตรา จาก ${levelFrom} ไปที่ ${levelTo} ของหน่วยงาน ${unitTrans}`;
    } else if (type === 4) {
      if (dt.transferInd > 0) {
        desc = `${dt.conclusionNo} : เพิ่มกรอบอัตรากำลัง จำนวน ${dt.amount} อัตรา ${levelTo} ของหน่วยงาน ${unitTrans}`;
      } else if (dt.transferInd < 0) {
        desc = `${dt.conclusionNo} : ลดกรอบอัตรากำลัง จำนวน ${dt.amount} อัตรา ${levelTo} ของหน่วยงาน ${unitTrans}`;
      }
    } else if (type === 5) {
      desc = `Remark ของหน่วยงาน ${unitRecv}`;
    } else if (type === 6) {
      desc = `${dt.conclusionNo} : หน่วยงาน${unitTrans} ให้หน่วยงาน ${unitRecv} ยืมอัตรากำลังที่${levelTo} จำนวน ${dt.amount} อัตรา`;
    }

    if (tx.poolRsFlag === 1) desc += ' (Pool Resources)';
    else if (tx.poolRsFlag === 2) desc += ' (Secondment Pool)';

    return desc;
  };

  const calendarWindowRangeText =
    calendarWindowState.startDate && calendarWindowState.endDate
      ? `${formatThaiDateTime(calendarWindowState.startDate)} - ${formatThaiDateTime(calendarWindowState.endDate)}`
      : '';

  const showCalendarWindowBlockedAlert = () => {
    const message = calendarWindowRangeText
      ? `${calendarWindowState.message}\nช่วงเวลาที่อนุญาต: ${calendarWindowRangeText}`
      : calendarWindowState.message;

    setAlertInfo({
      show: true,
      title: 'ไม่สามารถดำเนินการได้',
      message,
      type: 'warning'
    });
  };

  const canProceedByCalendar = !calendarWindowState.isChecking && calendarWindowState.isAllowed;
  const canSubmitPendingTransactions = canProceedByCalendar;

  const ensureCalendarReadyForAction = (): boolean => {
    if (calendarWindowState.isChecking) {
      setAlertInfo({
        show: true,
        title: 'กรุณารอสักครู่',
        message: 'ระบบกำลังตรวจสอบช่วงเวลาปฏิทิน',
        type: 'info'
      });
      return false;
    }

    if (!calendarWindowState.isAllowed) {
      showCalendarWindowBlockedAlert();
      return false;
    }

    return true;
  };

  // --- HANDLERS ---
  const handleTabChange = (type: TransactionTypeEnum | null) => {
    if (!ensureCalendarReadyForAction()) {
      return;
    }

    setActiveTab(type);
    if (type) {
      setFormData({
        transactionType: type,
        effectiveMonth: formData.effectiveMonth,
        effectiveYear: formData.effectiveYear,
        poolRsFlag: 0,
        strgFlag: 0,
        bsType: 0,
        specFlag: 0,
        unitReceive: '',
        remark: '',
        lineStaffFlag: 0,
        policyFlag: (typeof window !== 'undefined' && localStorage.getItem('selected_usergroup') === '04') ? 1 : 0,
        pastFlag: 0,
      });
    } else {
      setFormData({
        transactionType: null,
        effectiveMonth: formData.effectiveMonth,
        effectiveYear: formData.effectiveYear,
        poolRsFlag: 0,
        strgFlag: 0,
        bsType: 0,
        specFlag: 0,
        unitReceive: '',
        remark: '',
        lineStaffFlag: 0,
        policyFlag: (typeof window !== 'undefined' && localStorage.getItem('selected_usergroup') === '04') ? 1 : 0,
        pastFlag: 0,
      });
    }
    resetDetailForm();
  };

  const handleFileUploadChange = (file: File | null) => {
    if (file) {
      const fileId = Date.now().toString() + '_' + file.name;
      setUploadedFiles([...uploadedFiles, { id: fileId, name: file.name, fileObj: file }]);
      setDetailFormData({ ...detailFormData, file: file, selectedFileId: fileId, fileOption: 'new' });
    } else {
      setDetailFormData({ ...detailFormData, file: null, selectedFileId: ''});
    }
  };

  const resetDetailForm = () => {
    setDetailFormData({
      levelGroupTo: '',
      levelGroupFrom: '',
      amount: 1,
      conclusionNo: '',
      conclusionDate: '',
      unitTransfer: '',
      transferInd: 1,
      fileOption: 'new',
      selectedFileId: '',
      file: null,
    });
  };

  const shouldShowExtraFields = () => formData.poolRsFlag === 2;

  const isFormValid = () => {
    if (!canProceedByCalendar) return false;
    if (!activeTab) return false;
    if (!formData.effectiveMonth || !formData.effectiveYear) return false;

    if (activeTab !== 5) {
      if (!formData.unitReceive) return false;
      if (!detailFormData.amount || detailFormData.amount <= 0) return false;
      if (!detailFormData.conclusionNo || !detailFormData.conclusionDate) return false;
      if (formData.poolRsFlag === 2 && (formData.strgFlag == null || formData.bsType == null || formData.bsType === 0)) return false;

      if (activeTab === 1 || activeTab === 2 || activeTab === 6) {
        if (!detailFormData.unitTransfer || !detailFormData.levelGroupTo) return false;
      }
      if (activeTab === 3) {
        if (!formData.unitReceive || !detailFormData.levelGroupFrom || !detailFormData.levelGroupTo) return false;
      }
      if (activeTab === 4) {
        if (!formData.unitReceive || !detailFormData.levelGroupTo) return false;
      }
      if (detailFormData.fileOption === 'new' && !detailFormData.file) return false;
      if (detailFormData.fileOption === 'existing' && !detailFormData.selectedFileId) return false;
    } else {
      if (!formData.unitReceive) return false;
      if (!formData.remark.trim()) return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!ensureCalendarReadyForAction()) {
      return;
    }

    try {
      // Get employeeId (username) from localStorage user_data
      let employeeId = 'SYSTEM';
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          employeeId = userData.employeeID || 'SYSTEM';
        } catch (e) {
          console.error("Failed to parse user_data", e);
        }
      }

      // Find names for payload — unitTransfer comes from allUnits, so search both
      const unitReceiveName =
        units.find(u => u.id === formData.unitReceive)?.unitText ||
        units.find(u => u.id === formData.unitReceive)?.name ||
        allUnits.find(u => u.id === formData.unitReceive)?.unitText ||
        allUnits.find(u => u.id === formData.unitReceive)?.name || '';
      const resolvedUnitTransfer =
        activeTab === 3 || activeTab === 4
          ? formData.unitReceive
          : detailFormData.unitTransfer;
      const finalUnitTransferName =
        allUnits.find(u => u.id === resolvedUnitTransfer)?.unitText ||
        allUnits.find(u => u.id === resolvedUnitTransfer)?.name ||
        units.find(u => u.id === resolvedUnitTransfer)?.unitText ||
        units.find(u => u.id === resolvedUnitTransfer)?.name || '';
      
      let levelGroupFromName = levels.find(l => l.id === detailFormData.levelGroupFrom)?.name || '';
      const levelGroupToName = levels.find(l => l.id === detailFormData.levelGroupTo)?.name || '';
      let submitLevelGroupFrom = detailFormData.levelGroupFrom;

      if (formData.transactionType !== 2) {
        submitLevelGroupFrom = detailFormData.levelGroupTo;
        levelGroupFromName = levelGroupToName;
      }

      // Find matching existing file details if selected
      let existingFileName = '';
      let existingFileUrl = '';
      let existingFileId: string | null = null;
      if (detailFormData.fileOption === 'existing' && detailFormData.selectedFileId) {
        const foundFile = existingFiles.find(f => f.id.toString() === detailFormData.selectedFileId);
        if (foundFile) {
          existingFileName = foundFile.name;
          existingFileUrl = foundFile.fileUrl;
          existingFileId = foundFile.id.toString();
        }
      }

      // Construct JSON payload (without the file object)
      const payload = {
        ...formData,
        employeeId,
        unitReceiveName,
        detailData: {
          ...detailFormData,
          unitTransfer: resolvedUnitTransfer,
          unitTransferName: finalUnitTransferName,
          levelGroupFrom: submitLevelGroupFrom,
          levelGroupFromName,
          levelGroupToName,
          existingFileName, // Add to payload for backend
          existingFileUrl,  // Add to payload for backend
          existingFileId,   // Use this as RefID in DB
          file: null,  // exclude file from JSON - sent separately
        }
      };

      // Build FormData so we can send actual file bytes alongside JSON payload
      const formDataPayload = new FormData();
      formDataPayload.append('payload', JSON.stringify(payload));
      if (detailFormData.file) {
        formDataPayload.append('file', detailFormData.file);
      }

      const response = await fetch('/api/transactions/draft', {
        method: 'POST',
        // Let browser set Content-Type with boundary automatically for FormData
        body: formDataPayload
      });

      const { json: responseData, text: responseText } = await readApiBody<{
        message?: string;
        error?: string;
        data?: { transactionNo?: string };
      }>(response);

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(responseData, 'Failed to save draft', responseText));
      }
      if (!responseData) {
        throw new Error(responseText || 'Failed to save draft: invalid response');
      }

      const newTransaction: SavedTransaction = {
        id: responseData.data?.transactionNo || Date.now().toString(),
        transactionData: { ...formData },
        detailData: { 
          ...detailFormData,
          unitTransfer: resolvedUnitTransfer,
          unitTransferName: finalUnitTransferName,
          unitReceiveName,
          levelGroupToName,
          levelGroupFrom: submitLevelGroupFrom,
          levelGroupFromName
        },
        createdAt: new Date(),
      };
      setSavedTransactions((prev) => uniqueSavedTransactions([...prev, newTransaction]));
      
      setAlertInfo({ show: true, title: 'สำเร็จ', message: 'บันทึก Transaction สำเร็จ (Draft)', type: 'success' });
      // Optional: reset form fields here if needed
      
    } catch (error) {
      console.error('Error saving transaction:', error);
      const errorMessage = error instanceof Error && error.message
        ? `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message}`
        : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setAlertInfo({ show: true, title: 'เกิดข้อผิดพลาด', message: errorMessage, type: 'error' });
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    
    try {
      let employeeId = 'SYSTEM';
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          employeeId = userData.employeeID || 'SYSTEM';
        } catch (e) {
          console.error("Failed to parse user_data", e);
        }
      }

      const response = await fetch(`/api/transactions/draft/${transactionToDelete}?employeeId=${employeeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const { json: errData, text } = await readApiBody<{ message?: string; error?: string }>(response);
        throw new Error(resolveApiErrorMessage(errData, 'Failed to delete transaction', text));
      }

      setSavedTransactions(savedTransactions.filter((t) => t.id !== transactionToDelete));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setAlertInfo({ show: true, title: 'เกิดข้อผิดพลาด', message: 'เกิดข้อผิดพลาดในการลบรายการ', type: 'error' });
    } finally {
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleRequest = async () => {
    if (!ensureCalendarReadyForAction()) {
      return;
    }

    if (savedTransactions.length === 0) {
      setAlertInfo({ show: true, title: 'แจ้งเตือน', message: 'กรุณาเพิ่ม Transaction อย่างน้อย 1 รายการ', type: 'warning' });
      return;
    }

    try {
      // Read user context from local storage / selected header group
      const { employeeId: currentEmployeeId, userGroupNo: resolvedUserGroup } = resolveUserContext();
      const defaultUserGroup = resolvedUserGroup || '02';

      // --- USER GROUP 04 AUTO-APPROVE BYPASS ---
      if (defaultUserGroup === '04') {
        const transactionNos = savedTransactions.map(t => t.id);
        const updateBy = currentEmployeeId || 'SYSTEM';

        const resp = await fetch('/api/transactions/direct-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionNos, updateBy })
        });

        if (resp.ok) {
          setAlertInfo({ show: true, title: 'สำเร็จ', message: 'ทำรายการและอนุมัติสำเร็จ', type: 'success' });
          setSavedTransactions([]); // Clear drafted items
          // Optionally re-fetch draft count
          const countEvent = new Event('draftCountUpdated');
          window.dispatchEvent(countEvent);
        } else {
          setAlertInfo({ show: true, title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถทำรายการได้', type: 'error' });
        }
        return;
      }
      // --- END USER GROUP 04 BYPASS ---

      const groupedDepts = getTransactionsByDept();
      const approversData: Record<string, ApproverUser[]> = {};

      for (const [deptId, txList] of Object.entries(groupedDepts)) {
        const touchedScopeKeys = new Set<string>();

        // We fetch by flow in each dept (Type 2 flow vs other flow)
        for (const tx of txList) {
          if (tx.transactionData.transactionType === 5) continue; // skip remarks

          const flowKey = getFlowKeyByType(tx.transactionData.transactionType);
          const scopeKey = getDeptFlowKey(deptId, flowKey);
          touchedScopeKeys.add(scopeKey);
          if (!approversData[scopeKey]) approversData[scopeKey] = [];

          const jobType = tx.transactionData.transactionType === 2 ? 2 : 1;
          const userGroupReceive = defaultUserGroup;
          const orgUnitNoReceive = deptId;
          const orgUnitNoTransfer = tx.detailData.unitTransfer || null;
          const effectiveDate = `${tx.transactionData.effectiveYear}-${months.indexOf(tx.transactionData.effectiveMonth) + 1}-01`;
          const isRequirePolicy = tx.transactionData.policyFlag;

          // Type 3 has distinct levelGroupFrom and levelGroupTo (ปรับสัดส่วน)
          // All other types share the same level for both From and To
          const levelGroupNoFrom = tx.transactionData.transactionType === 3
            ? (tx.detailData.levelGroupFrom || '')
            : (tx.detailData.levelGroupTo || '');
          const levelGroupNoTo = tx.detailData.levelGroupTo || '';

          const queryParams = new URLSearchParams({
            jobType: jobType.toString(),
            userGroupReceive,
            orgUnitNoReceive,
            levelGroupNoFrom,
            ...(orgUnitNoTransfer ? { orgUnitNoTransfer } : {}),
            levelGroupNoTo,
            effectiveDate,
            isRequirePolicy: isRequirePolicy.toString()
          });

          const resp = await fetch(`/api/transactions/approvers?${queryParams}&_t=${Date.now()}`);
          if (resp.ok) {
            const { json: data, text } = await readApiBody<{ data?: ApproverUser[] }>(resp);
            if (!data) {
              console.error('Approvers API returned non-JSON response', text || `HTTP ${resp.status}`);
              continue;
            }
            if (Array.isArray(data.data) && data.data.length > 0) {
              approversData[scopeKey] = [...approversData[scopeKey], ...data.data];
            }
          }
        }

        // Remove duplicates by EmployeeID within each Department+Flow
        for (const scopeKey of touchedScopeKeys) {
          const uniqueSet = new Set();
          approversData[scopeKey] = (approversData[scopeKey] || []).filter((item) => {
            const isDuplicate = uniqueSet.has(item.EmployeeID);
            uniqueSet.add(item.EmployeeID);
            return !isDuplicate;
          });
        }
      }

      setSelectedApprovers((prev) => {
        const keep: Record<string, string[]> = {};
        Object.keys(approversData).forEach((key) => {
          const currentSelections = prev[key] || [];
          const validSelections = currentSelections.filter((id) =>
            (approversData[key] || []).some((approver) => approver.EmployeeID === id)
          );
          if (validSelections.length > 0) keep[key] = validSelections;
        });
        return keep;
      });
      setDynamicApprovers(approversData);
      setIsRequestModalOpen(true);
    } catch (e) {
      console.error("Failed to load approvers", e);
      setAlertInfo({ show: true, title: 'เกิดข้อผิดพลาด', message: 'เกิดข้อผิดพลาดในการโหลดรายชื่อผู้อนุมัติ', type: 'error' });
    }
  };

  const confirmRequest = () => {
    if (!ensureCalendarReadyForAction()) {
      return;
    }

    const groupedDepts = getTransactionsByDept();
    const missingScopes: string[] = [];

    for (const [deptId, txList] of Object.entries(groupedDepts)) {
      const flowKeys = Array.from(new Set(
        txList
          .filter((tx) => tx.transactionData.transactionType !== 5)
          .map((tx) => getFlowKeyByType(tx.transactionData.transactionType))
      ));

      for (const flowKey of flowKeys) {
        const scopeKey = getDeptFlowKey(deptId, flowKey);
        const dynamicList = dynamicApprovers[scopeKey] || [];
        const filteredDynamicList = dynamicList.filter((u) => u.UserGroupNo !== '04' && !(u.UserGroupRole || '').toUpperCase().includes('HRPOLICY'));
        const approverGroupKeys = Array.from(new Set(filteredDynamicList.map((u) => `${u.UnitSide}-${u.PermissionOrder}`)));

        if (approverGroupKeys.length === 0) {
          missingScopes.push(`- ${getDepartmentName(deptId)} (${getFlowDisplayName(flowKey)})`);
          continue;
        }

        let isAllGroupsSelected = true;
        for (const groupKey of approverGroupKeys) {
          const groupUsers = filteredDynamicList.filter((u) => `${u.UnitSide}-${u.PermissionOrder}` === groupKey);
          const hasSelectionInGroup = groupUsers.some((u) => selectedApprovers[scopeKey]?.includes(u.EmployeeID));
          if (!hasSelectionInGroup) {
            isAllGroupsSelected = false;
            break;
          }
        }

        if (!isAllGroupsSelected) {
          missingScopes.push(`- ${getDepartmentName(deptId)} (${getFlowDisplayName(flowKey)})`);
        }
      }
    }

    if (missingScopes.length > 0) {
      setAlertInfo({ 
        show: true, 
        title: 'แจ้งเตือน', 
        message: `กรุณาเลือกผู้อนุมัติ/ผู้รับ ให้ครบทุกกลุ่ม สำหรับ:\n${missingScopes.join('\n')}`, 
        type: 'warning' 
      });
      return;
    }

    setIsSubmitConfirmModalOpen(true);
  };

  const processSubmitDocument = async () => {
    if (!ensureCalendarReadyForAction()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const userContext = resolveUserContext();
      const employeeId = userContext.employeeId || 'SYSTEM';
      const userGroupNo = userContext.userGroupNo;

      const approvalTransactions = savedTransactions.filter((tx) => tx.transactionData.transactionType !== 5);
      const remarkTransactions = savedTransactions.filter((tx) => tx.transactionData.transactionType === 5);

      const itemsPayload = approvalTransactions.map(tx => {
        const deptId = tx.transactionData.unitReceive;
        const flowKey = getFlowKeyByType(tx.transactionData.transactionType);
        const scopeKey = getDeptFlowKey(deptId, flowKey);
        const selectedEmpIds = selectedApprovers[scopeKey] || [];
        const deptApprovers = dynamicApprovers[scopeKey] || [];

        const itemApproversList = selectedEmpIds.map(empId => deptApprovers.find(a => a.EmployeeID === empId))
          .filter(a => !!a);
          
        // We must sort deterministically: first by PermissionOrder, then by UnitSide (UnitReceive comes before UnitTransfer)
        itemApproversList.sort((a, b) => {
             if (a!.PermissionOrder !== b!.PermissionOrder) {
                 return a!.PermissionOrder - b!.PermissionOrder;
             }
             if (a!.UnitSide === 'UnitReceive' && b!.UnitSide !== 'UnitReceive') return -1;
             if (a!.UnitSide !== 'UnitReceive' && b!.UnitSide === 'UnitReceive') return 1;
             return 0;
        });
        
        const itemApprovers = itemApproversList.map((a, index) => ({
            seqno: index + 1,
            employeeId: a!.EmployeeID,
            fullname: a!.FullName,
            email: a!.Email || '',
            userGroupNo: a!.UserGroupNo,
            unitSide: a!.UnitSide || ''
        }));

        return {
          itemId: tx.id,
          approvers: itemApprovers,
          flowKey
        };
      });

      const groupedByFlow = new Map<ApproverFlowKey, { itemId: string; approvers: typeof itemsPayload[number]['approvers'] }[]>();
      for (const item of itemsPayload) {
        const key = item.flowKey;
        const current = groupedByFlow.get(key) || [];
        current.push({ itemId: item.itemId, approvers: item.approvers });
        groupedByFlow.set(key, current);
      }

      const submittedDocumentNos: string[] = [];
      for (const [flowKey, flowItems] of groupedByFlow.entries()) {
        if (flowItems.length === 0) continue;

        const payload = {
          documentType: 1, // งาน Transaction
          userGroupNo: userGroupNo || undefined,
          items: flowItems,
          createBy: employeeId
        };

        const resp = await fetch('/api/documents/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const { json: submitBody, text: submitText } = await readApiBody<{ message?: string; error?: string; documentNo?: string }>(resp);

        if (!resp.ok) {
          const errStr = resolveApiErrorMessage(
            submitBody,
            `Failed to submit document (${getFlowDisplayName(flowKey)})`,
            submitText
          );
          throw new Error(errStr);
        }

        const documentNo = String(submitBody?.documentNo || '').trim();
        if (documentNo) submittedDocumentNos.push(documentNo);
      }

      if (remarkTransactions.length > 0) {
        const remarkTransactionNos = remarkTransactions.map((tx) => tx.id);
        const directApproveResp = await fetch('/api/transactions/direct-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionNos: remarkTransactionNos,
            updateBy: employeeId
          })
        });

        const { json: directApproveBody, text: directApproveText } = await readApiBody<{ message?: string; error?: string }>(directApproveResp);

        if (!directApproveResp.ok) {
          const errStr = resolveApiErrorMessage(
            directApproveBody,
            'Failed to auto-approve remark transactions',
            directApproveText
          );
          throw new Error(errStr);
        }
      }

      const successMessage = submittedDocumentNos.length > 1
        ? `ส่งขออนุมัติเรียบร้อย! (แยก ${submittedDocumentNos.length} เอกสาร: ${submittedDocumentNos.join(', ')})`
        : submittedDocumentNos.length === 1
          ? 'ส่งขออนุมัติเรียบร้อย!'
          : '';
      const remarkSuccessMessage = remarkTransactions.length > 0
        ? `รายการบันทึก Remark ${remarkTransactions.length} รายการ ถูกอัปเดตเป็น Completed อัตโนมัติแล้ว`
        : '';

      const finalSuccessMessage = [successMessage, remarkSuccessMessage]
        .filter((message) => message.trim().length > 0)
        .join('\n') || 'ดำเนินการเรียบร้อย!';
      setAlertInfo({ show: true, title: 'สำเร็จ', message: finalSuccessMessage, type: 'success' });
      setIsSubmitConfirmModalOpen(false);
      setIsRequestModalOpen(false);
      setDynamicApprovers({});
      setSelectedApprovers({});
      setCollapsedDepts({});
      
      // Clear drafts and reload to simulate them moving to Next Step (or just refresh page)
      setSavedTransactions([]);
      const countEvent = new Event('draftCountUpdated');
      window.dispatchEvent(countEvent);
      
    } catch (err: unknown) {
      console.error('Submit Doc Error:', err);
      const errMsg = err instanceof Error ? err.message : 'ไม่สามารถส่งขออนุมัติได้';
      setAlertInfo({ show: true, title: 'เกิดข้อผิดพลาด', message: errMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionsByDept = () => {
    const grouped: Record<string, SavedTransaction[]> = {};
    savedTransactions.forEach((t) => {
      const deptId = t.transactionData.unitReceive;
      if (!grouped[deptId]) grouped[deptId] = [];
      grouped[deptId].push(t);
    });
    return grouped;
  };

  const toggleApprover = (selectionKey: string, approverId: string, groupUserIds: string[]) => {
    setSelectedApprovers((prev) => {
      const currentList = prev[selectionKey] || [];
      if (currentList.includes(approverId)) {
        return { ...prev, [selectionKey]: currentList.filter((id) => id !== approverId) };
      } else {
        // Keep previous selections from other groups, but enforce single selection within this group.
        const filteredCurrent = currentList.filter((id) => !groupUserIds.includes(id));
        return { ...prev, [selectionKey]: [...filteredCurrent, approverId] };
      }
    });
  };

  return (
    <Main currentPath="/transaction/transaction">
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md text-white flex items-center gap-3">
              <UserSwitchOutlined className="text-2xl" />
            <h1 className="text-xl font-bold m-0 text-white">การเปลี่ยนแปลงกรอบอัตรากำลัง</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Column 1: Form */}
          <div className="lg:col-span-4">
            <Card className="bg-white border-0 shadow-sm h-full py-0">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">EFFECTIVE DATE</h4>
                  <div className="grid grid-cols-[60%_40%] gap-3">
                    <div className="flex gap-3 items-center">
                      <label className="block text-sm font-medium text-gray-600 mb-1">เดือน</label>
                      <select
                        value={formData.effectiveMonth}
                        onChange={(e) => setFormData({ ...formData, effectiveMonth: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {months.map((month) => <option key={month} value={month}>{month}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3 items-center w-45">
                      <label className="block text-sm font-medium text-gray-600 mb-1">ปี</label>
                      <select
                        value={formData.effectiveYear}
                        onChange={(e) => setFormData({ ...formData, effectiveYear: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {years.map((year) => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-md font-medium text-blue-700 mb-2">
                    การเปลี่ยนแปลงกรอบอัตรากำลัง <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={activeTab || ''}
                    onChange={(e) => handleTabChange(e.target.value ? (parseInt(e.target.value) as TransactionTypeEnum) : null)}
                    className={cn(
                      "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors",
                      calendarWindowState.isChecking
                        ? "border-blue-200 bg-blue-50"
                        : !calendarWindowState.isAllowed
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                    )}
                  >
                    <option value="">เลือกประเภทการเปลี่ยนแปลง...</option>
                    {transactionTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                  {calendarCheckedOnce.current && calendarWindowState.isChecking && (
                    <p className="text-xs text-blue-600 mt-2">กำลังตรวจสอบช่วงเวลาตามปฏิทิน...</p>
                  )}
                  {!calendarWindowState.isChecking && !calendarWindowState.isAllowed && (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <p>{calendarWindowState.message}</p>
                      {calendarWindowRangeText && <p className="mt-1">ช่วงเวลาที่อนุญาต: {calendarWindowRangeText}</p>}
                    </div>
                  )}
                </div>

                {/* Management Type - Show only when activeTab is selected */}
                {activeTab && (
                  <>

                  {/* Additional Flags */}
                                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">จัดการกรอบอัตรากำลัง <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="poolRsFlag" value={0} checked={formData.poolRsFlag === 0}
                            onChange={() => setFormData({ ...formData, poolRsFlag: 0, strgFlag: 0, bsType: 0 })}
                            className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">ปกติ</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="poolRsFlag" value={1} checked={formData.poolRsFlag === 1}
                            onChange={() => setFormData({ ...formData, poolRsFlag: 1, strgFlag: 0, bsType: 0 })}
                            className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Pool Resources</span>
                      </label>
                      {activeTab !== 1 && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="poolRsFlag" value={2} checked={formData.poolRsFlag === 2}
                            onChange={() => setFormData({ ...formData, poolRsFlag: 2 })} className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Secondment Pool</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {shouldShowExtraFields() && (
                    <>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Strategic <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="strgFlag" value={0} checked={formData.strgFlag === 0}
                                onChange={() => setFormData({ ...formData, strgFlag: 0 })} className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">Non-Strategic</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="strgFlag" value={1} checked={formData.strgFlag === 1}
                                onChange={() => setFormData({ ...formData, strgFlag: 1 })} className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">Strategic</span>
                          </label>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Type <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="bsType" value={1} checked={formData.bsType === 1}
                                onChange={() => setFormData({ ...formData, bsType: 1 })} className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">Business</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="bsType" value={2} checked={formData.bsType === 2}
                                onChange={() => setFormData({ ...formData, bsType: 2 })} className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">Support</span>
                            </label>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">อัตรากำลังเฉพาะตัว</label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.specFlag === 1}
                        onChange={(e) => setFormData({ ...formData, specFlag: e.target.checked ? 1 : 0 })}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-700">{formData.specFlag === 1 ? 'เป็นอัตรากำลังเฉพาะตัว' : 'ไม่เป็น'}</span>
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Line / Staff</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="lineStaffType" value={0} checked={formData.lineStaffFlag === 0}
                          onChange={() => setFormData({ ...formData, lineStaffFlag: 0 })} className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">None</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="lineStaffType" value={1} checked={formData.lineStaffFlag === 1}
                          onChange={() => setFormData({ ...formData, lineStaffFlag: 1 })} className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">Line</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="lineStaffType" value={2} checked={formData.lineStaffFlag === 2}
                          onChange={() => setFormData({ ...formData, lineStaffFlag: 2 })} className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">Staff</span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {activeTab === 6 ? 'หน่วยงานรับยืม' : (activeTab === 5 ? 'หน่วยงาน' : 'หน่วยงานที่รับโอน')} <span className="text-red-500">*</span>
                    </label>
                    <Popover open={openUnitReceive} onOpenChange={setOpenUnitReceive}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-9 px-3 py-2 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-normal",
                            !formData.unitReceive && "text-muted-foreground"
                          )}
                        >
                          {formData.unitReceive
                            ? units.find(
                                (unit) => unit.id === formData.unitReceive
                              )?.unitText || units.find((unit) => unit.id === formData.unitReceive)?.name
                            : "เลือกหน่วยงาน..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="ค้นหาหน่วยงาน..." />
                          <CommandList>
                            <CommandEmpty>ไม่พบหน่วยงาน</CommandEmpty>
                            <CommandGroup>
                              {getUnitReceiveOptionList().map((unit) => (
                                <CommandItem
                                  key={unit.id}
                                  value={unit.unitText || unit.name}
                                  onSelect={() => {
                                    setFormData({ ...formData, unitReceive: unit.id });
                                    setOpenUnitReceive(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.unitReceive === unit.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {unit.unitText || unit.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Detail Form */}
          <div className="lg:col-span-4">
            <Card className="bg-white border-0 shadow-sm h-full py-0">
              <CardContent className="p-6 space-y-4">
                {!activeTab ? (
                  <div className="flex items-center justify-center h-64 text-center text-gray-400">
                    <p>กรุณาเลือกประเภทการเปลี่ยนแปลง<br /><span className="text-sm">เพื่อแสดงฟอร์มรายละเอียด</span></p>
                  </div>
                ) : (
                  <>
                    {/* --- DYNAMIC FORM FIELDS BASED ON TAB --- */}
                    {/* (Transfer Deceased & Transfer Other Share Similar Fields) */}
                    {(activeTab === 1 || activeTab === 2) && (
                      <>
                        {(() => {
                          const transferUnitOptions = activeTab === 1 ? transferUnitsByReceive : allUnits;
                          return (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">หน่วยงานที่โอน <span className="text-red-500">*</span></label>
                          <Popover open={openUnitTransfer} onOpenChange={setOpenUnitTransfer}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between h-9 px-3 py-2 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-normal",
                                  !detailFormData.unitTransfer && "text-muted-foreground"
                                )}
                              >
                                {detailFormData.unitTransfer
                                  ? transferUnitOptions.find(
                                      (unit) => unit.id === detailFormData.unitTransfer
                                    )?.unitText || transferUnitOptions.find((unit) => unit.id === detailFormData.unitTransfer)?.name
                                  : "เลือกหน่วยงาน..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="ค้นหาหน่วยงาน..." />
                                <CommandList>
                                  <CommandEmpty>ไม่พบหน่วยงาน</CommandEmpty>
                                  <CommandGroup>
                                    {transferUnitOptions
                                      .filter((unit) => unit.id !== formData.unitReceive)
                                      .map((unit) => (
                                      <CommandItem
                                        key={unit.id}
                                        value={unit.unitText || unit.name}
                                        onSelect={() => {
                                          setDetailFormData({ ...detailFormData, unitTransfer: unit.id });
                                          setOpenUnitTransfer(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            detailFormData.unitTransfer === unit.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {unit.unitText || unit.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                          );
                        })()}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ระดับตำแหน่ง <span className="text-red-500">*</span></label>
                          <select value={detailFormData.levelGroupTo} onChange={(e) => setDetailFormData({ ...detailFormData, levelGroupTo: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">เลือกระดับตำแหน่ง...</option>
                            {levels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    {activeTab === 4 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">เลือกประเภท <span className="text-red-500">*</span></label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="transferInd" value={1} checked={detailFormData.transferInd === 1}
                                onChange={() => setDetailFormData({ ...detailFormData, transferInd: 1 })} className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">เพิ่ม</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="transferInd" value={-1} checked={detailFormData.transferInd === -1}
                                onChange={() => setDetailFormData({ ...detailFormData, transferInd: -1 })} className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">ลด</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ระดับตำแหน่ง <span className="text-red-500">*</span></label>
                          <select value={detailFormData.levelGroupTo} onChange={(e) => setDetailFormData({ ...detailFormData, levelGroupTo: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">เลือกระดับตำแหน่ง...</option>
                            {levels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    {activeTab === 3 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">จากระดับตำแหน่ง <span className="text-red-500">*</span></label>
                          <select value={detailFormData.levelGroupFrom} onChange={(e) => setDetailFormData({ ...detailFormData, levelGroupFrom: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">เลือกระดับตำแหน่ง...</option>
                            {levels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ไปที่ระดับตำแหน่ง <span className="text-red-500">*</span></label>
                          <select value={detailFormData.levelGroupTo} onChange={(e) => setDetailFormData({ ...detailFormData, levelGroupTo: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">เลือกระดับตำแหน่ง...</option>
                            {levels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    {/* ✅ ยืมอัตรากำลัง */}
                    {activeTab === 6 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">หน่วยงานที่ให้ยืม <span className="text-red-500">*</span></label>
                          <Popover open={openUnitTransfer} onOpenChange={setOpenUnitTransfer}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between h-9 px-3 py-2 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-normal",
                                  !detailFormData.unitTransfer && "text-muted-foreground"
                                )}
                              >
                                {detailFormData.unitTransfer
                                  ? allUnits.find(
                                      (unit) => unit.id === detailFormData.unitTransfer
                                    )?.unitText || allUnits.find((unit) => unit.id === detailFormData.unitTransfer)?.name
                                  : "เลือกหน่วยงาน..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="ค้นหาหน่วยงาน..." />
                                <CommandList>
                                  <CommandEmpty>ไม่พบหน่วยงาน</CommandEmpty>
                                  <CommandGroup>
                                    {allUnits
                                      .filter((unit) => unit.id !== formData.unitReceive)
                                      .map((unit) => (
                                      <CommandItem
                                        key={unit.id}
                                        value={unit.unitText || unit.name}
                                        onSelect={() => {
                                          setDetailFormData({ ...detailFormData, unitTransfer: unit.id });
                                          setOpenUnitTransfer(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            detailFormData.unitTransfer === unit.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {unit.unitText || unit.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ระดับตำแหน่ง <span className="text-red-500">*</span></label>
                          <select value={detailFormData.levelGroupTo} onChange={(e) => setDetailFormData({ ...detailFormData, levelGroupTo: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">เลือกระดับตำแหน่ง...</option>
                            {levels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Common Fields (Count, Date, File, etc.) */}
                    {activeTab !== 5 && (
                      <>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">จำนวนกรอบ <span className="text-red-500">*</span></label>
                          <input type="number" value={detailFormData.amount} onChange={(e) => setDetailFormData({ ...detailFormData, amount: Number(e.target.value) })}
                            className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" min="1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">เลขที่มติ <span className="text-red-500">*</span></label>
                            <input type="text" value={detailFormData.conclusionNo} onChange={(e) => setDetailFormData({ ...detailFormData, conclusionNo: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">วันที่มติ <span className="text-red-500">*</span></label>
                            <BDatePicker
                              locale={customLocale}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              format="DD/MM/BBBB"
                              value={detailFormData.conclusionDate ? dayjs(detailFormData.conclusionDate) : null}
                              onChange={(date) => {
                                setDetailFormData({
                                  ...detailFormData,
                                  conclusionDate: date ? date.format('YYYY-MM-DD') : ''
                                });
                              }}
                              placeholder="เลือกวันที่"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ <span className="text-red-500"></span></label>
                          <textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">File <span className="text-red-500">*</span></label>
                          <div className="flex gap-4 mb-2">
                             <label className="flex items-center gap-2 cursor-pointer">
                               <input type="radio" name="fileOption" value="new" checked={detailFormData.fileOption === 'new'}
                                 onChange={() => setDetailFormData({ ...detailFormData, fileOption: 'new' })} className="w-4 h-4 text-blue-600" />
                               <span className="text-sm text-gray-700">อัปโหลดไฟล์ใหม่</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                               <input type="radio" name="fileOption" value="existing" checked={detailFormData.fileOption === 'existing'}
                                 onChange={() => setDetailFormData({ ...detailFormData, fileOption: 'existing' })} className="w-4 h-4 text-blue-600" />
                               <span className="text-sm text-gray-700">เลือกไฟล์ที่มีอยู่แล้ว</span>
                             </label>
                          </div>

                          {detailFormData.fileOption === 'new' ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <input type="file" accept=".pdf" onChange={(e) => handleFileUploadChange(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg bg-gray-50 p-2 cursor-pointer focus:outline-none" />
                                  <p className="text-xs text-gray-500 mt-1">Max 15MB, PDF only</p>
                                </div>
                              </div>
                              {detailFormData.fileUrl && (() => {
                                const fileHref = resolveFileUrl(detailFormData.fileUrl);
                                if (!fileHref) return null;

                                return (
                                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100 w-fit">
                                    <a href={fileHref} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                      <FileText className="w-4 h-4" /> ดูไฟล์ที่แนบไว้แล้ว ({detailFormData.fileUrl})
                                    </a>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <select value={detailFormData.selectedFileId} onChange={(e) => {
                                  // For existing files we just store the selected string ID and leave file as null
                                  setDetailFormData({ ...detailFormData, selectedFileId: e.target.value, file: null })
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">เลือกไฟล์...</option>
                                {existingFiles.map((file) => <option key={file.id} value={file.id.toString()}>{file.conclusionNo ? `${file.conclusionNo} - ` : ''}{file.name}</option>)}
                              </select>
                              {detailFormData.selectedFileId && (() => {
                                const selectedFile = existingFiles.find(f => f.id.toString() === detailFormData.selectedFileId);
                                const fileHref = selectedFile?.fileUrl ? resolveFileUrl(selectedFile.fileUrl) : '';
                                return fileHref ? (
                                  <a
                                    href={fileHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="ดูไฟล์"
                                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </a>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {activeTab === 5 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ <span className="text-red-500">*</span></label>
                        <textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={4}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none" />
                      </div>
                    )}

                    <div className="pt-4">
                      <Button onClick={handleSave} disabled={!isFormValid()} className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        <Save className="h-5 w-5" /><span>SAVE</span>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 3: List */}
          <div className="lg:col-span-4">
            <Card className="bg-white border-0 shadow-sm h-full py-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">รายการ Transaction ({savedTransactions.length})</h3>
                  {savedTransactions.length > 0 && (
                    <Button 
                      onClick={handleRequest}
                      disabled={!canSubmitPendingTransactions}
                      className={`px-4 py-2 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${typeof window !== 'undefined' && localStorage.getItem('selected_usergroup') === '04' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                      {typeof window !== 'undefined' && localStorage.getItem('selected_usergroup') === '04' ? 'อนุมัติรายการ' : 'REQUEST'}
                    </Button>
                  )}
                </div>
                {!canSubmitPendingTransactions && savedTransactions.length > 0 && (
                  <p className="text-xs text-red-600 mb-3">
                    รายการที่ค้างอยู่ยังไม่สามารถส่งได้ เนื่องจากนอกช่วงเวลาปฏิทิน
                  </p>
                )}
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {savedTransactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400"><p>ยังไม่มีรายการ Transaction</p></div>
                  ) : (
                    savedTransactions.map((t, idx) => (
                      <div key={`${t.id}-${idx}`} className={`border-2 rounded-lg p-4 ${t.transactionData.transactionType ? getTitleColorClass(t.transactionData.transactionType) : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">#{idx + 1}</span>
                              <span className="text-xs font-medium">{t.transactionData.transactionType ? getTransactionTypeName(t.transactionData.transactionType) : ''}</span>
                            </div>
                            <div className="text-xs mt-1">
                              <span>
                                {generateTransactionDesc(t.transactionData, t.detailData)}
                              </span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteTransaction(t.id)} className="text-red-500 hover:bg-red-50 rounded p-1"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* --- REQUEST MODAL --- */}
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm px-4 pt-16 pb-5">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-2 border-b bg-linear-gradient-to-r from-blue-200 to-blue-700 flex justify-between items-center bg-blue-50">
                <h2 className="text-lg font-bold text-blue-900">ยืนยันการส่งขออนุมัติ</h2>
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  aria-label="ปิดหน้าต่าง"
                  className="rounded-full p-1.5 bg-white/95 text-blue-800 border border-blue-200 shadow-sm hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50">
                {Object.entries(getTransactionsByDept()).map(([deptId, transactions]) => {
                  const remarkTransactions = transactions.filter((tx) => tx.transactionData.transactionType === 5);
                  const approvalTransactions = transactions.filter((tx) => tx.transactionData.transactionType !== 5);
                  const flowKeysInDept = Array.from(new Set(
                    approvalTransactions
                      .map((tx) => getFlowKeyByType(tx.transactionData.transactionType))
                  ));

                  const flowBlocks = flowKeysInDept.map((flowKey) => {
                    const selectionKey = getDeptFlowKey(deptId, flowKey);
                    const flowTransactions = approvalTransactions.filter((tx) => getFlowKeyByType(tx.transactionData.transactionType) === flowKey);
                    const groupedByType = flowTransactions.reduce((acc, curr) => {
                      const type = curr.transactionData.transactionType as TransactionTypeEnum;
                      if (!acc[type]) acc[type] = [];
                      acc[type].push(curr);
                      return acc;
                    }, {} as Record<TransactionTypeEnum, SavedTransaction[]>);

                    const dynamicList = dynamicApprovers[selectionKey] || [];
                    const filteredDynamicList = dynamicList.filter((u) => u.UserGroupNo !== '04' && !(u.UserGroupRole || '').toUpperCase().includes('HRPOLICY'));
                    const approverGroups = Array.from(new Set(filteredDynamicList.map((u) => `${u.UnitSide}-${u.PermissionOrder}`))).map((groupKey) => {
                      const groupUsers = filteredDynamicList.filter((u) => `${u.UnitSide}-${u.PermissionOrder}` === groupKey);
                      const sample = groupUsers[0];
                      let title = '';
                      let icon = User;
                      let color = 'text-gray-600 bg-gray-50 border-gray-200';

                      // Parse role string from backend, usually "HRUSER" or "HRVERIFY"
                      const rawRole = sample.UserGroupRole || '';
                      const roleLabel = rawRole.toUpperCase().includes('HRUSER') ? 'HR USER' : rawRole.toUpperCase().includes('HRVERIFY') ? 'HR VERIFY' : rawRole;

                      const sideLabel = sample.UnitSide === 'UnitReceive' || sample.UnitSide === 'UnitFrom' ? 'ฝั่งรับ' : 'ฝั่งให้';
                      const unitName = sample.UnitSide === 'UnitReceive' || sample.UnitSide === 'UnitFrom' ? getDepartmentName(sample.OrgUnitNo) : getUnitName(sample.OrgUnitNo);

                      title = `${roleLabel} (${sideLabel}: ${unitName})`;

                      if (sample.UnitSide === 'UnitReceive' || sample.UnitSide === 'UnitFrom') {
                        icon = ShieldCheck;
                        color = 'text-green-600 bg-green-50 border-green-200';
                      } else if ((sample.UnitSide === 'UnitTransfer' || sample.UnitSide === 'UnitTo') && roleLabel === 'HR USER') {
                        icon = User;
                        color = 'text-blue-600 bg-blue-50 border-blue-200';
                      } else if ((sample.UnitSide === 'UnitTransfer' || sample.UnitSide === 'UnitTo') && roleLabel === 'HR VERIFY') {
                        icon = ShieldCheck;
                        color = 'text-indigo-600 bg-indigo-50 border-indigo-200';
                      }

                      return {
                        title,
                        icon,
                        color,
                        users: groupUsers.map((u) => {
                          const rec = u as unknown as Record<string, string | undefined>;
                          const gName = rec.UserGroupName || rec.userGroupName || rec.UsergroupName || rec.GroupName || rec.usergroupname || rec.Groupname || rec.groupName;
                          const finalRole = gName && String(gName).trim() !== '' ? String(gName).trim() : `Group: ${u.UserGroupNo}`;

                          return {
                            id: u.EmployeeID,
                            name: u.FullName,
                            role: finalRole
                          };
                        })
                      };
                    });

                    const isFlowComplete = approverGroups.length > 0 && approverGroups.every((group) =>
                      group.users.some((user) => selectedApprovers[selectionKey]?.includes(user.id))
                    );

                    const flowTransactionCount = flowTransactions.length;

                    return {
                      flowKey,
                      flowName: getFlowDisplayName(flowKey),
                      selectionKey,
                      groupedByType,
                      approverGroups,
                      isFlowComplete,
                      flowTransactionCount
                    };
                  });

                  // Check if at least one person is selected for each approver group in each flow
                  const isAllGroupsSelected = flowBlocks.length > 0 && flowBlocks.every((section) => section.isFlowComplete);
                  const isNoApprovalRequired = approvalTransactions.length === 0 && remarkTransactions.length > 0;

                  const transactionCount = transactions.length;
                  const isCollapsed = collapsedDepts[deptId] === true;
                  return (
                    <div key={deptId} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-all duration-300">
                      <div 
                        className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors select-none"
                        onClick={() => toggleDeptCollapse(deptId)}
                      >
                        <span className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                          {isCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                          🏢 {getDepartmentName(deptId)}
                          {isAllGroupsSelected && (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold border border-green-300 ml-2 animate-in fade-in zoom-in duration-300">
                              <CheckCircle className="h-4 w-4" /> เลือกครบถ้วน
                            </span>
                          )}
                          {isNoApprovalRequired && (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold border border-sky-300 ml-2 animate-in fade-in zoom-in duration-300">
                              <Info className="h-4 w-4" /> ไม่ต้องเลือกผู้อนุมัติ
                            </span>
                          )}
                        </span>
                        <span className="text-xs bg-white px-2 py-1 rounded border text-gray-600 font-bold">{transactionCount} รายการ</span>
                      </div>

                      {!isCollapsed && (
                        <div className="p-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {flowBlocks.length === 0 ? (
                            remarkTransactions.length === 0 ? (
                              <div className="text-red-500 text-sm p-4 bg-red-50 rounded text-center">ไม่พบ Flow ที่ต้องขออนุมัติ</div>
                            ) : null
                          ) : (
                            flowBlocks.map((section) => (
                              <div key={section.flowKey} className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                  <span className="text-sm font-bold text-blue-900">
                                    {section.flowName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-white border border-gray-300 px-2 py-0.5 rounded-full text-gray-600 font-semibold">
                                      {section.flowTransactionCount} รายการ
                                    </span>
                                    {section.isFlowComplete && (
                                      <span className="text-[10px] bg-green-100 border border-green-300 px-2 py-0.5 rounded-full text-green-700 font-semibold">
                                        เลือกครบ
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-3 grid grid-cols-1 md:grid-cols-[60%_40%] gap-4">
                                  {/* LEFT: Transaction List (per flow) */}
                                  <div className="space-y-4 border-r border-gray-100 pr-3">
                                    {Object.entries(section.groupedByType).map(([type, typeList]) => (
                                      <div key={type} className="mb-4">
                                        <div className="flex items-center gap-2 mb-2 pl-1">
                                          <span className="text-lg">📁</span>
                                          <h4 className="text-sm font-bold text-gray-700">{getTransactionTypeName(parseInt(type) as TransactionTypeEnum)}</h4>
                                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                            {typeList.length}
                                          </span>
                                        </div>
                                        <div className={`rounded-md border-2 overflow-hidden ${getTitleColorClass(parseInt(type) as TransactionTypeEnum)}`}>
                                          <div className="divide-y divide-black/10">
                                            {typeList.map((t, idx) => (
                                              <div key={`${t.id}-${idx}`} className="p-2 hover:bg-white/20">
                                                <div className="flex items-center gap-2 text-xs">
                                                  <span className="font-bold bg-white/80 px-1.5 rounded">#{idx + 1}</span>
                                                  <span className="text-xs leading-relaxed opacity-90">{generateTransactionDesc(t.transactionData, t.detailData)}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* RIGHT: Approver Selection (per flow) */}
                                  <div className="pl-2 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                      <Users className="w-4 h-4" /> เลือกผู้อนุมัติ (กลุ่มละ 1 คน)
                                    </h3>

                                    {section.approverGroups.length === 0 ? (
                                      <div className="text-red-500 text-sm p-4 bg-red-50 rounded text-center">ไม่พบรายชื่อผู้อนุมัติสำหรับ {section.flowName}</div>
                                    ) : (
                                      section.approverGroups.map((group, groupIdx) => (
                                        <div key={groupIdx} className={`rounded-lg border overflow-hidden ${group.color}`}>
                                          <div className="px-3 py-2 bg-white/50 border-b border-inherit flex items-center gap-2">
                                            <group.icon className="w-4 h-4 opacity-70" />
                                            <span className="text-xs font-bold uppercase tracking-wider">{group.title}</span>
                                          </div>
                                          <div className="p-2 space-y-2 bg-white">
                                            {group.users.map((user) => {
                                              const isSelected = (selectedApprovers[section.selectionKey] || []).includes(user.id);
                                              return (
                                                <label key={user.id} className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all hover:shadow-sm
                                                                                  ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                                                                                      ${isSelected ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                                    {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                  </div>
                                                  <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={isSelected}
                                                    onChange={() => toggleApprover(section.selectionKey, user.id, group.users.map((u) => u.id))}
                                                  />
                                                  <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-700 truncate">{user.name}</p>
                                                    <p className="text-[10px] text-gray-400">{user.role}</p>
                                                  </div>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}

                          {remarkTransactions.length > 0 && (
                            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-700">รายการบันทึก Remark (ไม่ต้องขออนุมัติ)</span>
                                <span className="text-[10px] bg-white border border-gray-300 px-2 py-0.5 rounded-full text-gray-600 font-semibold">
                                  {remarkTransactions.length} รายการ
                                </span>
                              </div>
                              <div className="p-3 space-y-3">
                                <div className={`rounded-md border-2 overflow-hidden ${getTitleColorClass(5)}`}>
                                  <div className="divide-y divide-black/10">
                                    {remarkTransactions.map((tx, idx) => (
                                      <div key={`${tx.id}-${idx}-remark`} className="p-2 hover:bg-white/20">
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="font-bold bg-white/80 px-1.5 rounded">#{idx + 1}</span>
                                          <span className="text-xs leading-relaxed opacity-90">{generateTransactionDesc(tx.transactionData, tx.detailData)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                                  รายการประเภทนี้ไม่ต้องเลือกผู้อนุมัติ และเมื่อกด CONFIRM ระบบจะอัปเดตเป็น Completed อัตโนมัติ
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsRequestModalOpen(false)} className="px-6 font-bold">CANCEL</Button>
                <Button onClick={confirmRequest} className="bg-green-600 hover:bg-green-700 font-bold text-white px-8 gap-2"><CheckCircle className="h-5 w-5" /> CONFIRM</Button>
              </div>
            </div>
          </div>
        )}

        {/* --- SUBMIT CONFIRM MODAL --- */}
        {isSubmitConfirmModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📤</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการส่งขออนุมัติ</h3>
                <p className="text-gray-500 text-sm">
                  คุณแน่ใจหรือไม่ที่จะยืนยันรายการ Transaction ทั้งหมด?
                  {savedTransactions.some((tx) => tx.transactionData.transactionType === 5) && (
                    <>
                      <br />
                      รายการบันทึก Remark จะถูกอัปเดตเป็น Completed อัตโนมัติ
                    </>
                  )}
                </p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <Button variant="outline" onClick={() => setIsSubmitConfirmModalOpen(false)} disabled={isSubmitting} className="px-4 font-semibold text-gray-600 hover:bg-gray-100">ยกเลิก</Button>
                <Button onClick={processSubmitDocument} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-semibold shadow-sm">
                  {isSubmitting ? (
                      <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                          กำลังส่ง...
                      </div>
                  ) : 'ยืนยันส่ง'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* --- DELETE CONFIRM MODAL --- */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบรายการ</h3>
                <p className="text-gray-500 text-sm">คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?</p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="px-4 font-semibold">ยกเลิก</Button>
                <Button onClick={confirmDeleteTransaction} className="bg-red-600 hover:bg-red-700 text-white px-4 font-semibold">ลบรายการ</Button>
              </div>
            </div>
          </div>
        )}
        {/* --- CUSTOM ALERT MODAL --- */}
        {alertInfo.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
              <div className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  alertInfo.type === 'success' ? 'bg-green-100' :
                  alertInfo.type === 'error' ? 'bg-red-100' :
                  alertInfo.type === 'warning' ? 'bg-orange-100' : 'bg-blue-100'
                }`}>
                  {alertInfo.type === 'success' && <CheckCircle className="h-8 w-8 text-green-500" />}
                  {alertInfo.type === 'error' && <X className="h-8 w-8 text-red-500" />}
                  {alertInfo.type === 'warning' && <AlertCircle className="h-8 w-8 text-orange-500" />}
                  {alertInfo.type === 'info' && <Info className="h-8 w-8 text-blue-500" />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{alertInfo.title}</h3>
                <p className="text-gray-500 text-sm whitespace-pre-wrap text-left">{alertInfo.message}</p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-center rounded-b-xl">
                <Button onClick={closeAlert} className="px-8 font-semibold w-full bg-blue-600 hover:bg-blue-700 text-white">ตกลง</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Main>
  );
}
