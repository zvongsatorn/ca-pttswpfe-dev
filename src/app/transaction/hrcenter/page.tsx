'use client';

import Main from '@/components/layout/main';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';
import {
  ChevronDown,
  ClockAlert,
  FileSpreadsheet,
  Search,
  Send,
  Settings,
  Check,
  Loader2,
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from 'react';

const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

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
const currentYearStr = (currentDate.getFullYear() + 543).toString();

// Types

interface HRCenterItem {
  OrgUnitNo: string;
  UnitName: string;
  UnitAbbr: string;
  UnitLevelName: string;
  BGName: string;
  StrgFlag?: number | string;
  BSType?: number | string;
  SpecFlag?: number | string;
  LineStaffFlag?: number | string;

  amount_1: number;
  amount_2: number;
  amount_3: number;
  amount_4: number;
  amount_5: number;
  amount_6: number;
  amount_7: number;
  amount_8: number;
  amount_subcontact: number;
  total_amount: number;

  c_amount_1: string;
  c_amount_2: string;
  c_amount_3: string;
  c_amount_4: string;
  c_amount_5: string;
  c_amount_6: string;
  c_amount_7: string;
  c_amount_8: string;
  c_amount_10: string;

  t_amount_1?: number;
  t_amount_2?: number;
  t_amount_3?: number;
  t_amount_4?: number;
  t_amount_5?: number;
  t_amount_6?: number;
  t_amount_7?: number;
  t_amount_8?: number;
  t_amount_subcontact?: number;
  t_total_amount?: number;

  c_amount_subcontact?: string;
  c_total_amount?: string;
  hc_grand_total?: number | string;
  man_amount?: number | string;
  f_amount?: number | string;
  FAmount?: number | string;
  people_total?: number;
  recruit_total?: number;

  chkamount: number;
  note: string;
  ConclusionNo: string;
  PoolRsFlag: number;
  SapStatus: string;
}

interface Report3MatchRow {
  OrgUnitNo?: string;
  PoolRsFlag?: number | string;
  StrgFlag?: number | string;
  BSType?: number | string;
  SpecFlag?: number | string;
  LineStaffFlag?: number | string;
  hc_grand_total?: number | string;
  f_amount?: number | string;
  FAmount?: number | string;
}


const sapTypes = [
  { title: "All", id: "" },
  { title: 'Update', id: 'Update' },
  { title: 'Sent', id: 'Sent' }
];

// --- Helper Component: MultiSelect Filter ---
interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  width?: string;
}

function MultiSelectFilter({ label, options, selectedValues, onChange, width = "w-64" }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
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
        className={`${width} min-h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer flex items-center justify-between`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="truncate flex gap-1 flex-wrap">
          {selectedValues.length === 0 ? (
            <span className="text-gray-400">{label}...</span>
          ) : selectedValues.length === options.length ? (
             <span className="text-blue-600 font-medium">เลือกทั้งหมด ({options.length})</span>
          ) : (
            <span className="text-gray-800">
              {selectedValues.length} รายการ
            </span>
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
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto p-1">
            {/* Select All Option */}
            {filteredOptions.length > 0 && (
               <div 
                className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50"
                onClick={handleSelectAll}
              >
                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedValues.length === options.length && options.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {selectedValues.length === options.length && options.length > 0 && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm font-semibold text-blue-700">เลือกทั้งหมด</span>
              </div>
            )}

            {filteredOptions.map(option => {
              const isSelected = selectedValues.includes(option);
              return (
                <div 
                  key={option} 
                  className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => toggleOption(option)}
                >
                  <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700 truncate" title={option}>{option}</span>
                </div>
              );
            })}
            
            {filteredOptions.length === 0 && (
              <div className="text-center py-4 text-xs text-gray-400">ไม่พบข้อมูล</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const renderAmount = (amount?: number, tAmount?: number | string, cAmount?: number | string) => {
  const diff = toNumber(tAmount);
  const hasTrans = Math.abs(toNumber(cAmount)) > 0 || diff !== 0;
  
  if (!hasTrans) {
    return <span className="text-gray-900">{amount || 0}</span>;
  }
  return (
    <div className="flex flex-col items-center justify-center leading-tight">
      <span className="text-gray-900">{amount || 0}</span>
      {diff !== 0 && (
        <span className={`text-[11px] font-semibold mt-0.5 ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
          ({diff > 0 ? '+' : ''}{diff})
        </span>
      )}
    </div>
  );
};

const renderTotalAmount = (amount?: number, tAmount?: number | string, cAmount?: number | string) => {
  const diff = toNumber(tAmount);
  const hasTrans = Math.abs(toNumber(cAmount)) > 0 || diff !== 0;
  
  if (!hasTrans) {
    return <span className="text-gray-900">{amount || 0}</span>;
  }
  return (
    <div className="flex flex-col items-center justify-center leading-tight">
      {diff !== 0 && (
        <span className={`text-[11px] font-semibold mb-0.5 ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
          ({diff > 0 ? '+' : ''}{diff})
        </span>
      )}
      <span className="text-gray-900">{amount || 0}</span>
    </div>
  );
};

const truncateText = (text: string | null | undefined, max: number) => {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.substring(0, max) + "...";
};

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return 0;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getAnyFieldValue = (obj: unknown, fieldNames: string[]): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  for (const fieldName of fieldNames) {
    if (record[fieldName] !== undefined) {
      return record[fieldName];
    }
  }
  return undefined;
};

const normalizeText = (value: unknown): string => String(value ?? '').trim();

const buildRowKey = (row: {
  OrgUnitNo?: string;
  PoolRsFlag?: number | string;
  StrgFlag?: number | string;
  BSType?: number | string;
  SpecFlag?: number | string;
  LineStaffFlag?: number | string;
}) => [
  normalizeText(row.OrgUnitNo),
  toNumber(row.PoolRsFlag),
  toNumber(row.StrgFlag),
  toNumber(row.BSType),
  toNumber(row.SpecFlag),
  toNumber(row.LineStaffFlag),
].join('|');

const getPeopleTotal = (item: HRCenterItem): number => {
  if (item.people_total !== undefined) return toNumber(item.people_total);
  const peopleByAlias = getAnyFieldValue(item, ['man_amount', 'Man_Amount', 'MAN_AMOUNT', 'manAmount', 'ManAmount']);
  if (peopleByAlias !== undefined) return toNumber(peopleByAlias);
  if (item.man_amount !== undefined) return toNumber(item.man_amount);
  const hcByAlias = getAnyFieldValue(item, ['hc_grand_total', 'HC_Grand_Total', 'HC_GRAND_TOTAL', 'hcGrandTotal']);
  return toNumber(hcByAlias);
};

const getRecruitTotal = (item: HRCenterItem): number => {
  if (item.recruit_total !== undefined) return toNumber(item.recruit_total);
  const recruitByAlias = getAnyFieldValue(item, ['f_amount', 'F_Amount', 'F_AMOUNT', 'FAmount', 'fAmount']);
  return toNumber(recruitByAlias);
};

const getBlankTotal = (item: HRCenterItem): number => toNumber(item.total_amount) - getPeopleTotal(item);
const isPoolNormal = (value: unknown): boolean => toNumber(value) === 0;

const containsText = (source: unknown, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return normalizeText(source).toLowerCase().includes(q);
};

export default function HRCenterPage() {
  const years = useSyncExternalStore(emptySubscribe, getClientYearsSnapshot, getServerYearsSnapshot);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [viewMode, setViewMode] = useState<
    'all' | 'department' | 'department-level'
  >('all');
  
  // -- Column Visibility State --
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [searchSapStatus, setSearchSapStatus] = useState('');
  const [headerFilters, setHeaderFilters] = useState({
    divisionCode: '',
    divisionName: '',
    divisionShortName: '',
    managementType: '',
    headcountType: '',
    resolutionNumber: '',
    notes: '',
  });

  // Define distinct keys for visibility toggling
  const [visibleColumns, setVisibleColumns] = useState({
    divisionCode: true,
    divisionName: true,
    divisionShortName: true,
    managementType: true,
    headcountType: true,
    level21: true,
    level18_20: true,
    level16_17: true,
    level14_15: true,
    level11_13: true,
    level9_10: true,
    level4_8: true,
    total: true,
    contract: true,
    contractSubcontract: true,
    people: true,
    find: true,
    blank: true,
    resolutionNumber: true, // เลขที่มติ (mapped from remark)
    notes: true,            // หมายเหตุ (mapped from lastUpdated)
    sapStatusColumn: true,  // SAP Status Icon column
  });

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Helper to calculate colspan for the "Level" group header
  const getLevelGroupColSpan = () => {
    const keys = [
      'level21', 'level18_20', 'level16_17', 'level14_15', 
      'level11_13', 'level9_10', 'level4_8', 
      'total', 'contract', 'contractSubcontract', 'people', 'find', 'blank'
    ] as const;
    // Check strictly against the keys in visibleColumns
    return keys.filter(k => visibleColumns[k]).length;
  };

  // Labels for the Menu
  const columnLabels: Record<string, string> = {
    divisionCode: 'รหัสหน่วยงาน',
    divisionName: 'ชื่อหน่วยงาน',
    divisionShortName: 'ชื่อย่อ',
    managementType: 'ระดับหน่วยงาน',
    headcountType: 'หน่วยธุรกิจ',
    level21: 'Level 21',
    level18_20: 'Level 18-20',
    level16_17: 'Level 16-17',
    level14_15: 'Level 14-15',
    level11_13: 'Level 11-13',
    level9_10: 'Level 9-10',
    level4_8: 'Level 4-8',
    total: 'รวม',
    contract: 'Contract',
    contractSubcontract: 'Contract สัญญาย่อย',
    people: 'คน',
    find: 'สรรหา',
    blank: 'ว่าง',
    resolutionNumber: 'เลขที่มติ',
    notes: 'หมายเหตุ',
    sapStatusColumn: 'SAP Status',
  };

  // Fetch dynamic data
  const [departmentData, setDepartmentData] = useState<HRCenterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const report3CacheRef = useRef<Map<string, Report3MatchRow[]>>(new Map());

  useEffect(() => {
    let isActive = true;
    const fetchData = async () => {
      setIsLoading(true);
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
        
        const userGroupNo = localStorage.getItem('selected_usergroup') || '05';

        const monthIndex = months.indexOf(selectedMonth) + 1;
        const yearAD = Number(selectedYear) - 543;
        const effectiveDate = `${yearAD}-${String(monthIndex).padStart(2, '0')}-01`;

        const hrcenterUrl = `/api/transactions/hrcenter?viewMode=${viewMode === 'all' ? 'all' : 'department'}&effectiveMonth=${encodeURIComponent(selectedMonth)}&effectiveYear=${encodeURIComponent(selectedYear)}&employeeId=${encodeURIComponent(employeeId)}&userGroupNo=${encodeURIComponent(userGroupNo)}`;
        const report3Url = `/api/report/report3?effectiveDate=${encodeURIComponent(effectiveDate)}&employeeId=${encodeURIComponent(employeeId)}&userGroupNo=${encodeURIComponent(userGroupNo)}&reportType=0`;
        const reportCacheKey = `${effectiveDate}|${employeeId}|${userGroupNo}`;
        const cachedReportRows = report3CacheRef.current.get(reportCacheKey);

        const hrcenterRes = await fetch(hrcenterUrl);

        if (!hrcenterRes.ok) {
          console.error("Failed to fetch hrcenter data");
          return;
        }

        const hrcenterJson = await hrcenterRes.json();
        const hrcenterRows: HRCenterItem[] = Array.isArray(hrcenterJson.data) ? hrcenterJson.data : [];

        // If backend already returns people/recruit fields from hrcenter SP, skip report3 merge entirely.
        const hasPeopleRecruitFromHRCenter = hrcenterRows.length > 0 && hrcenterRows.every((row) => {
          const hasPeople =
            getAnyFieldValue(row, ['people_total', 'People_Total', 'man_amount', 'Man_Amount', 'MAN_AMOUNT', 'hc_grand_total', 'HC_Grand_Total']) !== undefined;
          const hasRecruit =
            getAnyFieldValue(row, ['recruit_total', 'Recruit_Total', 'f_amount', 'F_Amount', 'F_AMOUNT', 'FAmount']) !== undefined;
          return hasPeople && hasRecruit;
        });
        if (hasPeopleRecruitFromHRCenter) {
          if (isActive) {
            setDepartmentData(hrcenterRows.map((row) => ({
              ...row,
              people_total: getPeopleTotal(row),
              recruit_total: getRecruitTotal(row),
            })));
          }
          return;
        }

        let report3Rows: Report3MatchRow[] | null = cachedReportRows ?? null;
        if (!report3Rows) {
          const reportRes = await fetch(report3Url);
          if (reportRes.ok) {
            const reportJson = await reportRes.json();
            const parsedRows: Report3MatchRow[] = Array.isArray(reportJson.data) ? reportJson.data : [];
            report3Rows = parsedRows;
            report3CacheRef.current.set(reportCacheKey, parsedRows);
          } else {
            report3Rows = null;
          }
        }

        if (!report3Rows) {
          console.warn("Failed to fetch report3 data, use hrcenter data only");
          if (isActive) {
            setDepartmentData(hrcenterRows);
          }
          return;
        }

        const reportByFullKey = new Map<string, { people_total: number; recruit_total: number }>();
        const reportByNormalOrg = new Map<string, { people_total: number; recruit_total: number }>();

        const addToMap = (
          map: Map<string, { people_total: number; recruit_total: number }>,
          key: string,
          people: number,
          recruit: number
        ) => {
          if (!key) return;
          const prev = map.get(key) || { people_total: 0, recruit_total: 0 };
          map.set(key, {
            people_total: prev.people_total + people,
            recruit_total: prev.recruit_total + recruit,
          });
        };

        report3Rows.forEach((row) => {
          if (!isPoolNormal(row.PoolRsFlag)) return;
          const people = toNumber(row.hc_grand_total);
          const recruit = toNumber(row.f_amount ?? row.FAmount);
          const fullKey = buildRowKey(row);
          const orgKey = normalizeText(row.OrgUnitNo);

          addToMap(reportByFullKey, fullKey, people, recruit);
          addToMap(reportByNormalOrg, orgKey, people, recruit);
        });

        const normalRowCountByOrg = new Map<string, number>();
        const normalRowCountByFullKey = new Map<string, number>();
        hrcenterRows.forEach((row) => {
          if (!isPoolNormal(row.PoolRsFlag)) return;
          const orgKey = normalizeText(row.OrgUnitNo);
          const fullKey = buildRowKey(row);
          normalRowCountByOrg.set(orgKey, (normalRowCountByOrg.get(orgKey) || 0) + 1);
          normalRowCountByFullKey.set(fullKey, (normalRowCountByFullKey.get(fullKey) || 0) + 1);
        });

        const mergedRows = hrcenterRows.map((row) => {
          if (!isPoolNormal(row.PoolRsFlag)) {
            return {
              ...row,
              people_total: toNumber(row.hc_grand_total),
              recruit_total: toNumber(row.f_amount ?? row.FAmount),
            };
          }

          const fullKey = buildRowKey(row);
          const orgKey = normalizeText(row.OrgUnitNo);
          const allowFullKeyMatch = (normalRowCountByFullKey.get(fullKey) || 0) === 1;
          const matchedByFull = allowFullKeyMatch ? reportByFullKey.get(fullKey) : undefined;
          const allowOrgFallback = (normalRowCountByOrg.get(orgKey) || 0) === 1;
          const matched = matchedByFull || (allowOrgFallback ? reportByNormalOrg.get(orgKey) : undefined);

          return {
            ...row,
            people_total: matched ? matched.people_total : toNumber(row.hc_grand_total),
            recruit_total: matched ? matched.recruit_total : toNumber(row.f_amount ?? row.FAmount),
          };
        });

        if (isActive) {
          setDepartmentData(mergedRows);
        }
      } catch (error) {
        console.error("Error fetching hrcenter data:", error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      isActive = false;
    };
  }, [viewMode, selectedMonth, selectedYear]);

  // 1. Get Unique Options
  const businessUnitOptions = useMemo(() => {
    const units = new Set(departmentData.map(d => d.BGName).filter(Boolean));
    return Array.from(units).sort();
  }, [departmentData]);

  const departmentOptions = useMemo(() => {
    const depts = new Set(departmentData.map(d => d.UnitName).filter(Boolean));
    return Array.from(depts).sort();
  }, [departmentData]);

  // 2. Filter Data
  const filteredData = useMemo(() => {
    return departmentData.filter(item => {
      // Filter by Business Unit
      if (selectedBusinessUnits.length > 0 && !selectedBusinessUnits.includes(item.BGName)) {
        return false;
      }
      // Filter by Department
      if (selectedDepartments.length > 0 && !selectedDepartments.includes(item.UnitName)) {
        return false;
      }
      // Filter by SAP Status
      if (searchSapStatus && item.SapStatus !== searchSapStatus) {
        return false;
      }
      // Header text filters
      if (!containsText(item.OrgUnitNo, headerFilters.divisionCode)) {
        return false;
      }
      if (!containsText(item.UnitName, headerFilters.divisionName)) {
        return false;
      }
      if (!containsText(item.UnitAbbr, headerFilters.divisionShortName)) {
        return false;
      }
      if (!containsText(item.UnitLevelName, headerFilters.managementType)) {
        return false;
      }
      if (!containsText(item.BGName, headerFilters.headcountType)) {
        return false;
      }
      if (!containsText(item.ConclusionNo, headerFilters.resolutionNumber)) {
        return false;
      }
      if (!containsText(item.note, headerFilters.notes)) {
        return false;
      }
      return true;
    });
  }, [departmentData, selectedBusinessUnits, selectedDepartments, searchSapStatus, headerFilters]);


  // Calculate totals
  const calculateTotals = () => {
    return filteredData.reduce(
      (acc, dept) => ({
        level21: acc.level21 + (dept.amount_1 || 0),
        level18_20: acc.level18_20 + (dept.amount_2 || 0),
        level16_17: acc.level16_17 + (dept.amount_3 || 0),
        level14_15: acc.level14_15 + (dept.amount_4 || 0),
        level11_13: acc.level11_13 + (dept.amount_5 || 0),
        level9_10: acc.level9_10 + (dept.amount_6 || 0),
        level4_8: acc.level4_8 + (dept.amount_7 || 0),
        total: acc.total + (dept.total_amount || 0),
        contract: acc.contract + (dept.amount_8 || 0),
        contractSubcontract: acc.contractSubcontract + (dept.amount_subcontact || 0),
        people: acc.people + getPeopleTotal(dept),
        t_level21: acc.t_level21 + toNumber(dept.t_amount_1),
        t_level18_20: acc.t_level18_20 + toNumber(dept.t_amount_2),
        t_level16_17: acc.t_level16_17 + toNumber(dept.t_amount_3),
        t_level14_15: acc.t_level14_15 + toNumber(dept.t_amount_4),
        t_level11_13: acc.t_level11_13 + toNumber(dept.t_amount_5),
        t_level9_10: acc.t_level9_10 + toNumber(dept.t_amount_6),
        t_level4_8: acc.t_level4_8 + toNumber(dept.t_amount_7),
        t_total: acc.t_total + toNumber(dept.t_total_amount),
        t_contract: acc.t_contract + toNumber(dept.t_amount_8),
        t_contractSubcontract: acc.t_contractSubcontract + toNumber(dept.t_amount_subcontact),
        c_level21: acc.c_level21 + toNumber(dept.c_amount_1),
        c_level18_20: acc.c_level18_20 + toNumber(dept.c_amount_2),
        c_level16_17: acc.c_level16_17 + toNumber(dept.c_amount_3),
        c_level14_15: acc.c_level14_15 + toNumber(dept.c_amount_4),
        c_level11_13: acc.c_level11_13 + toNumber(dept.c_amount_5),
        c_level9_10: acc.c_level9_10 + toNumber(dept.c_amount_6),
        c_level4_8: acc.c_level4_8 + toNumber(dept.c_amount_7),
        c_total: acc.c_total + toNumber(dept.chkamount ?? dept.c_total_amount),
        c_contract: acc.c_contract + toNumber(dept.c_amount_8),
        c_contractSubcontract: acc.c_contractSubcontract + toNumber(dept.c_amount_10),
        find: acc.find + getRecruitTotal(dept),
        blank: acc.blank + getBlankTotal(dept),
      }),
      {
        level21: 0,
        level18_20: 0,
        level16_17: 0,
        level14_15: 0,
        level11_13: 0,
        level9_10: 0,
        level4_8: 0,
        total: 0,
        contract: 0,
        contractSubcontract: 0,
        people: 0,
        t_level21: 0,
        t_level18_20: 0,
        t_level16_17: 0,
        t_level14_15: 0,
        t_level11_13: 0,
        t_level9_10: 0,
        t_level4_8: 0,
        t_total: 0,
        t_contract: 0,
        t_contractSubcontract: 0,
        c_level21: 0,
        c_level18_20: 0,
        c_level16_17: 0,
        c_level14_15: 0,
        c_level11_13: 0,
        c_level9_10: 0,
        c_level4_8: 0,
        c_total: 0,
        c_contract: 0,
        c_contractSubcontract: 0,
        find: 0,
        blank: 0,
      }
    );
  };

  const totals = calculateTotals();

  const levelColSpan = getLevelGroupColSpan();

  const handleExportExcel = async () => {
    try {
      if (filteredData.length === 0) return;

      const exportColumns: Array<{
        key: keyof typeof visibleColumns;
        label: string;
        value: (item: HRCenterItem) => string | number;
        summary?: () => string | number;
      }> = [
        { key: 'divisionCode', label: 'รหัสหน่วยงาน', value: (item) => item.OrgUnitNo, summary: () => 'รวม' },
        { key: 'divisionName', label: 'ชื่อหน่วยงาน', value: (item) => item.UnitName },
        { key: 'divisionShortName', label: 'ชื่อย่อ', value: (item) => item.UnitAbbr },
        { key: 'managementType', label: 'ระดับหน่วยงาน', value: (item) => item.UnitLevelName },
        { key: 'headcountType', label: 'หน่วยธุรกิจ', value: (item) => item.BGName },
        { key: 'level21', label: '21', value: (item) => toNumber(item.amount_1), summary: () => totals.level21 },
        { key: 'level18_20', label: '18-20', value: (item) => toNumber(item.amount_2), summary: () => totals.level18_20 },
        { key: 'level16_17', label: '16-17', value: (item) => toNumber(item.amount_3), summary: () => totals.level16_17 },
        { key: 'level14_15', label: '14-15', value: (item) => toNumber(item.amount_4), summary: () => totals.level14_15 },
        { key: 'level11_13', label: '11-13', value: (item) => toNumber(item.amount_5), summary: () => totals.level11_13 },
        { key: 'level9_10', label: '9-10', value: (item) => toNumber(item.amount_6), summary: () => totals.level9_10 },
        { key: 'level4_8', label: '4-8', value: (item) => toNumber(item.amount_7), summary: () => totals.level4_8 },
        { key: 'total', label: 'รวม', value: (item) => toNumber(item.total_amount), summary: () => totals.total },
        { key: 'contract', label: 'Contract', value: (item) => toNumber(item.amount_8), summary: () => totals.contract },
        { key: 'contractSubcontract', label: 'Contract สัญญาย่อย', value: (item) => toNumber(item.amount_subcontact), summary: () => totals.contractSubcontract },
        { key: 'people', label: 'คน', value: (item) => getPeopleTotal(item), summary: () => totals.people },
        { key: 'find', label: 'สรรหา', value: (item) => getRecruitTotal(item), summary: () => totals.find },
        { key: 'blank', label: 'ว่าง', value: (item) => getBlankTotal(item), summary: () => totals.blank },
        { key: 'resolutionNumber', label: 'เลขที่มติ', value: (item) => item.ConclusionNo || '' },
        { key: 'notes', label: 'หมายเหตุ', value: (item) => item.note || '' },
        { key: 'sapStatusColumn', label: 'SAP Status', value: (item) => item.SapStatus || '' },
      ];

      const activeColumns = exportColumns.filter((col) => visibleColumns[col.key]);
      if (activeColumns.length === 0) return;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('HRCenter');

      worksheet.addRow(activeColumns.map((col) => col.label));

      filteredData.forEach((item) => {
        worksheet.addRow(activeColumns.map((col) => col.value(item)));
      });

      worksheet.addRow(activeColumns.map((col) => (col.summary ? col.summary() : '')));

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' },
        };
      });

      const summaryRow = worksheet.getRow(worksheet.rowCount);
      summaryRow.font = { bold: true };

      worksheet.columns.forEach((column) => {
        let maxLength = 12;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const raw = cell.value;
          const text = typeof raw === 'object' ? JSON.stringify(raw) : String(raw ?? '');
          maxLength = Math.max(maxLength, Math.min(60, text.length + 2));
        });
        column.width = maxLength;
      });

      const monthIndex = months.indexOf(selectedMonth) + 1;
      const yearAD = Number(selectedYear) - 543;
      const filename = `transaction_hrcenter_${yearAD}${String(monthIndex).padStart(2, '0')}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      await saveExcelFile(buffer, filename);
    } catch (error) {
      console.error('Error exporting hrcenter excel:', error);
    }
  };

  return (
    <Main currentPath="/transaction/hrcenter">
      <div className="space-y-4">
        {/* Header Section */}
        <Card className="border-0 shadow-md rounded-lg overflow-hidden py-0"> 
  {/* ปรับ Gradient ให้นุ่มนวลขึ้น ไม่กระโดดจากอ่อนไปเข้มเกินไป */}
  <div className="bg-linear-to-r from-blue-200 to-blue-400 px-6 py-3 flex items-center justify-between shadow-lg rounded-t-lg border-b border-blue-200">
  
  {/* 1. Left Side: Title */}
  <h1 className="text-xl font-bold text-gray-800 tracking-wide">
    กรอบอัตรากำลัง
  </h1>

  {/* 2. Right Side: Controls Group */}
   <div className="flex items-center gap-4">
              {/* Date Selector Group */}
              <div className="flex items-center gap-6 bg-white/90 backdrop-blur-sm px-4 py-1 rounded-lg shadow-sm border border-white/50">
                <span className="text-gray-600 text-sm font-semibold uppercase tracking-wider mr-1">
                  Effective Date :
                </span>
                
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-8 bg-transparent text-gray-800 text-sm font-bold border-none focus:ring-0 cursor-pointer outline-none hover:text-blue-700"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  
                  <span className="text-gray-400">/</span>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="h-8 bg-transparent text-gray-800 text-sm font-bold border-none focus:ring-0 cursor-pointer outline-none hover:text-blue-700"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  
                </div>

                   {/* Search Button */}
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 text-md font-bold">
                <Search className="w-4 h-4 mr-2" />
                ค้นหา
            </Button>

             <Button className="bg-red-700 hover:bg-red-800 text-white px-6 text-md font-bold">
                <Send className="w-4 h-4 mr-2" />
                Send to SAP
            </Button>

              </div>
            </div>
            
</div>
</Card>

        {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white rounded-t-lg p-4">
  
  {/* ========================================= */}
  {/* 1. LEFT GROUP: Filters & Date             */}
  {/* ========================================= */}
  <div className="flex items-center gap-6"> {/* เพิ่ม gap รวมให้ห่างขึ้นนิดหน่อยเพื่อความสบายตา */}
    
     {/* Effective Date */}
    <div className="flex flex-col">
      <span className="text-[12px] font-semibold text-gray-500 leading-tight uppercase tracking-wide">
        Effective Date
      </span>
      <span className="text-lg font-bold text-blue-700 leading-tight">
        01/{(months.indexOf(selectedMonth) + 1).toString().padStart(2, '0')}/{selectedYear}
      </span>
    </div>

      {/* Separator */}
    <div className="h-8 w-px bg-gray-200 mx-2"></div>

    {/* Filter 1: หน่วยธุรกิจ */}
    <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                หน่วยธุรกิจ
              </label>
              <MultiSelectFilter 
                label="เลือกหน่วยธุรกิจ"
                options={businessUnitOptions}
                selectedValues={selectedBusinessUnits}
                onChange={setSelectedBusinessUnits}
                width="w-48"
              />
            </div>

    {/* Filter 2: หน่วยงาน (กว้างกว่า) */}
   <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                หน่วยงาน
              </label>
              <MultiSelectFilter 
                label="เลือกหน่วยงาน"
                options={departmentOptions}
                selectedValues={selectedDepartments}
                onChange={setSelectedDepartments}
                width="w-80"
              />
            </div>

  

   

  </div>


  {/* ========================================= */}
  {/* 2. RIGHT GROUP: View Mode & Actions       */}
  {/* ========================================= */}
  <div className="flex items-center gap-3">
    
    {/* View Mode Toggle */}
    <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2">
      <button
        onClick={() => setViewMode('all')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          viewMode === 'all'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        ทั้งหมด
      </button>
      <button
        onClick={() => setViewMode('department')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          viewMode === 'department'
            ? 'bg-blue-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        เฉพาะที่เปลี่ยนแปลง
      </button>
    </div>

    {/* Excel Button */}
    <Button
      variant="outline"
      size="icon"
      onClick={handleExportExcel}
      disabled={isLoading || filteredData.length === 0}
      className="h-9 w-9 rounded-full text-green-600 border-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
    >
      <FileSpreadsheet className="h-5! w-5!" />
    </Button>

    {/* Settings Button & Menu */}
    <div className="relative" ref={columnMenuRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowColumnMenu(!showColumnMenu)}
        className={`h-9 w-9 rounded-full hover:bg-blue-50 hover:text-blue-600 ${showColumnMenu ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
      >
        <Settings className="h-5! w-5!" />
      </Button>

      {showColumnMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-2 max-h-96 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">แสดง / ซ่อน</div>
          <div className="space-y-1">
            {Object.entries(visibleColumns).map(([key, isVisible]) => (
              <label key={key} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors ${isVisible ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {isVisible && <Check className="h-3 w-3 text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={isVisible}
                  onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                />
                <span className="text-sm text-gray-700">{columnLabels[key] || key}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>

  </div>
</div>

        {/* Overview Tab */}
        <Card className="bg-white border-0 shadow-sm py-0 overflow-visible">
            <CardContent className="p-0 relative">
             

              {/* Table */}
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
                <table className="w-full relative">
                  <thead className="sticky top-0 z-20 shadow-sm">
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-4 py-3 text-left">
                        <input type="checkbox" className="w-4 h-4" />
                      </th>
                      {visibleColumns.divisionCode && <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">รหัสหน่วยงาน</th>}
                      {visibleColumns.divisionName && <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">ชื่อหน่วยงาน</th>}
                      {visibleColumns.divisionShortName && <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">ชื่อย่อ</th>}
                      {visibleColumns.managementType && <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">ระดับหน่วยงาน</th>}
                      {visibleColumns.headcountType && <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700">หน่วยธุรกิจ</th>}
                      
                      {levelColSpan > 0 && (
                        <th
                          colSpan={levelColSpan}
                          className="px-4 py-3 text-center text-xs font-semibold text-gray-700 border-l border-gray-300"
                        >
                          ระดับ
                        </th>
                      )}

                      {/* Split Columns as Requested */}
                      {visibleColumns.resolutionNumber && (
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 border-l border-gray-300">
                          เลขที่มติ
                        </th>
                      )}
                      {visibleColumns.notes && (
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
                          หมายเหตุ
                        </th>
                      )}
                      {visibleColumns.sapStatusColumn && (
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
                          SAP Status
                        </th>
                      )}
                    </tr>
                    
                    {/* Search Row */}
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2"></th>
                      
                      {visibleColumns.divisionCode && (
                        <th className="px-2 py-2">
                          <input
                            type="text"
                            value={headerFilters.divisionCode}
                            onChange={(e) => setHeaderFilters(prev => ({ ...prev, divisionCode: e.target.value }))}
                            className="w-16 px-1 py-1 text-sm bg-white border border-gray-300 rounded shadow-sm"
                          />
                        </th>
                      )}
                      {visibleColumns.divisionName && (
                        <th className="px-1 py-2">
                          <input
                            type="text"
                            value={headerFilters.divisionName}
                            onChange={(e) => setHeaderFilters(prev => ({ ...prev, divisionName: e.target.value }))}
                            className="w-full min-w-[120px] px-1 py-1 text-sm bg-white border border-gray-300 rounded shadow-sm"
                          />
                        </th>
                      )}
                      {visibleColumns.divisionShortName && (
                        <th className="px-1 py-2">
                          <input
                            type="text"
                            value={headerFilters.divisionShortName}
                            onChange={(e) => setHeaderFilters(prev => ({ ...prev, divisionShortName: e.target.value }))}
                            className="w-16 px-1 py-1 text-sm bg-white border border-gray-300 rounded shadow-sm"
                          />
                        </th>
                      )}
                      {visibleColumns.managementType && (
                        <th className="px-1 py-2">
                          <input
                            type="text"
                            value={headerFilters.managementType}
                            onChange={(e) => setHeaderFilters(prev => ({ ...prev, managementType: e.target.value }))}
                            className="w-16 px-1 py-1 text-sm bg-white border border-gray-300 rounded shadow-sm"
                          />
                        </th>
                      )}
                      {visibleColumns.headcountType && (
                        <th className="px-1 py-2">
                          <input
                            type="text"
                            value={headerFilters.headcountType}
                            onChange={(e) => setHeaderFilters(prev => ({ ...prev, headcountType: e.target.value }))}
                            className="w-16 px-1 py-1 text-sm bg-white border border-gray-300 rounded shadow-sm"
                          />
                        </th>
                      )}

                      {/* Level Inputs */}
                      {visibleColumns.level21 && <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-600 border-l border-gray-300 min-w-[50px]">21</th>}
                      {visibleColumns.level18_20 && <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">18-20</th>}
                      {visibleColumns.level16_17 && <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">16-17</th>}
                      {visibleColumns.level14_15 && <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">14-15</th>}
                      {visibleColumns.level11_13 && <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">11-13</th>}
                      {visibleColumns.level9_10 && <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">9-10</th>}
                      {visibleColumns.level4_8 && <th className="px-1 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">4-8</th>}
                      {visibleColumns.total && <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">รวม</th>}
                      {visibleColumns.contract && <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[70px]">Contract</th>}
                      {visibleColumns.contractSubcontract && <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[80px]">Contract<br />สัญญาย่อย</th>}
                      {visibleColumns.people && <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">คน</th>}
                      {visibleColumns.find && <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">สรรหา</th>}
                      {visibleColumns.blank && <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-600 min-w-[50px]">ว่าง</th>}

                      {/* Split Columns Search Inputs */}
                      {visibleColumns.resolutionNumber && (
                        <th className="px-1 py-2 border-l border-gray-300 min-w-[120px]">
                          <input
                            type="text"
                            value={headerFilters.resolutionNumber}
                            onChange={(e) => setHeaderFilters(prev => ({ ...prev, resolutionNumber: e.target.value }))}
                            className="w-20 px-1 py-1 text-sm bg-white border border-gray-300 rounded shadow-sm"
                          />
                        </th>
                      )}
                      {visibleColumns.notes && (
                        <th className="px-0 py-2">
                          <input
                            type="text"
                            value={headerFilters.notes}
                            onChange={(e) => setHeaderFilters(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-20 px-1 py-1 text-sm bg-white border border-gray-300 rounded shadow-sm"
                          />
                        </th>
                      )}
                      {/* SAP Status Search Select */}
                      {visibleColumns.sapStatusColumn && (
                        <th className="px-0 py-2">
                          <div className="relative flex-1 max-w-md px-1">
                             <select 
                                value={searchSapStatus}
                                onChange={(e) => setSearchSapStatus(e.target.value)}
                                className="w-full px-1 py-1 text-xs bg-white border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-6 font-semibold"
                             >
                               {sapTypes.map(type => (
                                 <option key={type.id} value={type.id}>{type.title}</option>
                               ))}
                             </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((dept, index) => (
                      <tr
                        key={`${dept.OrgUnitNo}-${index}`}
                        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-3"><input type="checkbox" className="w-4 h-4" /></td>
                        
                        {visibleColumns.divisionCode && <td className="px-2 py-3 text-[11px] text-gray-900 whitespace-nowrap">{dept.OrgUnitNo}</td>}
                        {visibleColumns.divisionName && <td className="px-1 py-3 text-[10px] text-gray-700 min-w-[120px]">{dept.UnitName}</td>}
                        {visibleColumns.divisionShortName && <td className="px-1 py-3 text-[11px] text-gray-700 whitespace-nowrap">{dept.UnitAbbr}</td>}
                        {visibleColumns.managementType && <td className="px-1 py-3 text-[11px] text-gray-700 whitespace-nowrap">{dept.UnitLevelName}</td>}
                        {visibleColumns.headcountType && <td className="px-1 py-3 text-[11px] text-gray-700 whitespace-nowrap" title={dept.BGName}>{truncateText(dept.BGName, 8)}</td>}

                        {/* Level Data */}
                        {visibleColumns.level21 && <td className="px-1 py-3 text-xs text-center border-l border-gray-300">{renderAmount(dept.amount_1, dept.t_amount_1, dept.c_amount_1)}</td>}
                        {visibleColumns.level18_20 && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.amount_2, dept.t_amount_2, dept.c_amount_2)}</td>}
                        {visibleColumns.level16_17 && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.amount_3, dept.t_amount_3, dept.c_amount_3)}</td>}
                        {visibleColumns.level14_15 && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.amount_4, dept.t_amount_4, dept.c_amount_4)}</td>}
                        {visibleColumns.level11_13 && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.amount_5, dept.t_amount_5, dept.c_amount_5)}</td>}
                        {visibleColumns.level9_10 && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.amount_6, dept.t_amount_6, dept.c_amount_6)}</td>}
                        {visibleColumns.level4_8 && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.amount_7, dept.t_amount_7, dept.c_amount_7)}</td>}
                        {visibleColumns.total && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.total_amount, dept.t_total_amount, dept.chkamount ?? dept.c_total_amount)}</td>}
                        {visibleColumns.contract && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.amount_8, dept.t_amount_8, dept.c_amount_8)}</td>}
                        {visibleColumns.contractSubcontract && <td className="px-1 py-3 text-xs text-center">{renderAmount(dept.amount_subcontact, dept.t_amount_subcontact, dept.c_amount_10)}</td>}
                        {visibleColumns.people && <td className="px-2 py-3 text-xs text-center text-gray-900">{getPeopleTotal(dept)}</td>}
                        {visibleColumns.find && <td className="px-2 py-3 text-xs text-center text-gray-900">{getRecruitTotal(dept)}</td>}
                        {visibleColumns.blank && <td className="px-2 py-3 text-xs text-center text-gray-900">{getBlankTotal(dept)}</td>}

                        {/* Split Columns Data */}
                        {visibleColumns.resolutionNumber && (
                          <td className="px-2 py-3 text-[11px] text-gray-700 border-l border-gray-300" title={dept.ConclusionNo}>
                            {truncateText(dept.ConclusionNo, 40)}
                          </td>
                        )}
                        {visibleColumns.notes && (
                          <td className="px-2 py-3 text-[11px] text-blue-600">
                            {dept.note}
                          </td>
                        )}
                        {visibleColumns.sapStatusColumn && (
                          <td className="px-4 py-3 text-center justify-items-center">
                            {dept.SapStatus === 'Update' && (
                              <ClockAlert className="h-5 w-5 text-orange-500" />
                            )}
                            {dept.SapStatus === 'Sent' && (
                              <Check className="h-5 w-5 text-green-600 font-bold" />
                            )}
                            {!dept.SapStatus && (
                               <div className="h-5 w-5"></div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  
                  {/* Total Row - Sticky Footer */}
                  <tfoot className="sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <tr className="bg-gray-200 font-semibold border-t-2 border-gray-300">
                      <td className="px-4 py-3"></td>
                      
                      <td
                        colSpan={[
                          visibleColumns.divisionCode,
                          visibleColumns.divisionName,
                          visibleColumns.divisionShortName,
                          visibleColumns.managementType,
                          visibleColumns.headcountType
                        ].filter(Boolean).length}
                        className="px-4 py-3 text-sm text-gray-900"
                      >
                        รวม
                      </td>

                      {visibleColumns.level21 && <td className="px-0 py-3 text-xs text-center border-l border-gray-300">{renderTotalAmount(totals.level21, totals.t_level21, totals.c_level21)}</td>}
                      {visibleColumns.level18_20 && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.level18_20, totals.t_level18_20, totals.c_level18_20)}</td>}
                      {visibleColumns.level16_17 && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.level16_17, totals.t_level16_17, totals.c_level16_17)}</td>}
                      {visibleColumns.level14_15 && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.level14_15, totals.t_level14_15, totals.c_level14_15)}</td>}
                      {visibleColumns.level11_13 && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.level11_13, totals.t_level11_13, totals.c_level11_13)}</td>}
                      {visibleColumns.level9_10 && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.level9_10, totals.t_level9_10, totals.c_level9_10)}</td>}
                      {visibleColumns.level4_8 && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.level4_8, totals.t_level4_8, totals.c_level4_8)}</td>}
                      {visibleColumns.total && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.total, totals.t_total, totals.c_total)}</td>}
                      {visibleColumns.contract && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.contract, totals.t_contract, totals.c_contract)}</td>}
                      {visibleColumns.contractSubcontract && <td className="px-0 py-3 text-xs text-center">{renderTotalAmount(totals.contractSubcontract, totals.t_contractSubcontract, totals.c_contractSubcontract)}</td>}
                      {visibleColumns.people && <td className="px-0 py-3 text-xs text-center text-gray-900">{totals.people}</td>}
                      {visibleColumns.find && <td className="px-0 py-3 text-xs text-center text-gray-900">{totals.find}</td>}
                      {visibleColumns.blank && <td className="px-0 py-3 text-xs text-center text-gray-900">{totals.blank}</td>}
                      
                      {/* Spacer for remaining columns */}
                      <td
                        colSpan={[
                          visibleColumns.resolutionNumber,
                          visibleColumns.notes,
                          visibleColumns.sapStatusColumn
                        ].filter(Boolean).length}
                        className="px-4 py-3 border-l border-gray-300 bg-gray-200"
                      ></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {isLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-md border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูล...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

       
      </div>
    </Main>
  );
}
