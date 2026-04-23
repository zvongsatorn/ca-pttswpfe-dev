'use client';

import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import Main from '@/components/layout/main';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MultiSelectFilter from '@/components/filters/MultiSelectFilter';
import { saveExcelFile } from '@/utils/fileDownload';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  X,
  Users,
  Calendar,
  Check,
  AlertCircle,
  Info,
  Download,
} from 'lucide-react';
import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';

dayjs.extend(buddhistEra);
const THAI_MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// ============================================================================
// 1. TYPES DEFINITION
// ============================================================================


interface ReturnRecord {
  TransactionNo: string;
  TransactionDesc: string;
  ReturnCount: number;
  Status: number;
  CreateBy: string;
  CreateDate: string;
  DocumentNo: string;
  DocumentStatus: number;
  DocumentCreateDate: string;
  EffectiveDate?: string;
  UnitReceive?: string;
  UnitTransfer?: string;
  PoolRsFlag?: number;
  PoolRSFlag?: number;
  StrgFlag?: number;
  BSType?: number;
  SpecFlag?: number;
  LineStaffFlag?: number;
}

interface BorrowRecord {
  TransactionNo: string;
  EffectiveDate: string;
  ConclusionNo: string;
  ConclusionDate: string;
  TransactionDesc: string;
  TransactionType: number;
  Amount: number;
  UnitReceive: string;
  UnitReceiveName: string;
  UnitTransfer: string;
  UnitTransferName: string;
  LevelGroupFrom: string;
  LevelGroupFromName: string;
  LevelGroupTo: string;
  LevelGroupToName: string;
  TransferInd: number;
  Status: number;
  PoolRsFlag: number;
  StrgFlag: number;
  BSType: number;
  SpecFlag: number;
  LineStaffFlag: number;
  Policyflag: number;
  CreateBy: string;
  CreateDate: string;
  DocumentNo: string;
  DocumentCreateDate: string;
  TotalReturned: number;
  RemainingCount: number;
  BusinessUnitNo?: string;
  BusinessUnitName?: string;
  BusinessUnit?: string;
  BGNo?: string;
  BGName?: string;
  UnitTransferBGNo?: string;
  UnitTransferBGName?: string;
  UnitReceiveBGNo?: string;
  UnitReceiveBGName?: string;
  returns?: ReturnRecord[]; // Fetched dynamically
  isFetchingReturns?: boolean;
}

interface SelectedReturn {
  borrowId: string;
  returnCount: number | '';
  maxCount: number; // Maximum available to return
  UnitTransfer: string;
  UnitReceive: string;
  LevelGroupTo: string;
  UnitTransferName: string;
  UnitReceiveName: string;
  LevelGroupToName: string;
  ParentDocumentNo: string;
  RefTransactionNo: string;
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
  UserGroupRole?: string;
}

export default function ReturnPage() {
  // --- STATE ---
  const [selectedStatus, setSelectedStatus] = useState<string>('borrowed');
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
  const [selectedFromDepts, setSelectedFromDepts] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Table column filters
  const [filterInbox, setFilterInbox] = useState('');
  const [filterEffectiveDate, setFilterEffectiveDate] = useState('');
  const [filterResolution, setFilterResolution] = useState('');
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedReturns, setSelectedReturns] = useState<Map<string, SelectedReturn>>(new Map());
  const [returnCounts, setReturnCounts] = useState<Record<string, number | ''>>({});
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmitConfirmModalOpen, setIsSubmitConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);

  const normalizeOptionValue = (...values: unknown[]) => {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return '';
  };
  const toCodeNameLabel = (id: string, name: string) => {
    const normalizedId = String(id || '').trim();
    const normalizedName = String(name || '').trim();
    if (!normalizedId) return normalizedName;
    if (!normalizedName) return normalizedId;
    if (normalizedName.startsWith(normalizedId)) return normalizedName;
    return `${normalizedId} ${normalizedName}`;
  };

  const resolveUserContext = () => {
    const selectedGroup = String(localStorage.getItem('selected_usergroup') || '').trim();
    let employeeId = 'SYSTEM';
    let userGroupNo = selectedGroup;

    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr) as {
          employeeID?: string;
          EmployeeID?: string;
          userGroupNo?: string;
          roleId?: string;
          userGroups?: Array<{ userGroupNo?: string }>;
        };
        employeeId = String(userData.employeeID || userData.EmployeeID || employeeId).trim();
        if (!userGroupNo) {
          userGroupNo = String(
            userData.userGroupNo ||
            userData.roleId ||
            userData.userGroups?.[0]?.userGroupNo ||
            ''
          ).trim();
        }
      } catch {
        // ignore parse failure and keep fallback values
      }
    }

    return { employeeId, userGroupNo };
  };

  const resolveEmployeeId = () => {
    const { employeeId } = resolveUserContext();
    if (employeeId && employeeId !== 'SYSTEM') return employeeId;
    return String(localStorage.getItem('employeeId') || '').trim();
  };

  const isHrPolicyUserGroup = (userGroupNo?: string | null) => String(userGroupNo || '').trim() === '04';

  const getBusinessUnitOptionsFromRecord = (record: BorrowRecord) => {
    const options: { id: string; name: string }[] = [];
    const pushOption = (idRaw: unknown, nameRaw?: unknown) => {
      const id = normalizeOptionValue(idRaw);
      if (!id) return;
      const name = normalizeOptionValue(nameRaw, id);
      options.push({ id, name });
    };

    pushOption(
      record.BusinessUnitNo || record.BusinessUnit || record.BGNo,
      record.BusinessUnitName || record.BGName
    );
    pushOption(record.UnitTransferBGNo, record.UnitTransferBGName);
    pushOption(record.UnitReceiveBGNo, record.UnitReceiveBGName);

    return options;
  };

  // Departments list extracted from records
  const [businessUnits, setBusinessUnits] = useState<{id: string, name: string}[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  // State for Request Modal & Approvers
  const [selectedApprovers, setSelectedApprovers] = useState<Record<string, string[]>>({});
  const [dynamicApprovers, setDynamicApprovers] = useState<Record<string, ApproverUser[]>>({});
  const [alertInfo, setAlertInfo] = useState<{ show: boolean, title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false,
    title: '',
    message: '',
    type: 'info'
  });
  const closeAlert = () => setAlertInfo((prev) => ({ ...prev, show: false }));
  const getDepartmentName = (id: string, resolvedName?: string) =>
    resolvedName || departments.find(d => d.id === id)?.name || id;


  useEffect(() => {
    fetchBorrowRecords();
  }, []);

  const fetchBorrowRecords = async () => {
    try {
      const employeeId = resolveEmployeeId();
      if (!employeeId) {
        setBorrowRecords([]);
        setBusinessUnits([]);
        setDepartments([]);
        return;
      }
      const res = await fetch(`/api/transactions/borrow-records?employeeId=${employeeId}`);
      if (res.ok) {
        const result = await res.json();
        setBorrowRecords(result.data || []);

        // Extract unique business units and departments for dropdowns
        const bus = new Map<string, string>();
        const depts = new Map<string, string>();
        (result.data || []).forEach((r: BorrowRecord) => {
          getBusinessUnitOptionsFromRecord(r).forEach((option) => {
            if (option.id) bus.set(option.id, option.name || option.id);
          });
          if (r.UnitTransfer) depts.set(r.UnitTransfer, r.UnitTransferName || r.UnitTransfer);
          if (r.UnitReceive) depts.set(r.UnitReceive, r.UnitReceiveName || r.UnitReceive);
        });
        const sortedBusinessUnits = Array.from(bus.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'th'));
        const sortedDepartments = Array.from(depts.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'th'));

        setBusinessUnits(sortedBusinessUnits);
        setDepartments(sortedDepartments);
      }
    } catch (error) {
      console.error('Failed to fetch borrow records:', error);
    }
  };

  const fetchReturnHistory = async (borrowId: string, documentNo: string) => {
    try {
      setBorrowRecords(prev => prev.map(r => r.TransactionNo === borrowId ? { ...r, isFetchingReturns: true } : r));
      const res = await fetch(`/api/transactions/return-history/${documentNo}?_t=${Date.now()}`);
      if (res.ok) {
        const result = await res.json();
        setBorrowRecords(prev => prev.map(r => r.TransactionNo === borrowId ? { ...r, returns: result.data || [], isFetchingReturns: false } : r));
      }
    } catch (error) {
      console.error('Failed to fetch return history:', error);
      setBorrowRecords(prev => prev.map(r => r.TransactionNo === borrowId ? { ...r, isFetchingReturns: false } : r));
    }
  };

  const toggleRow = (id: string, documentNo: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Always refresh history on expand so new pending/approved returns appear immediately.
        const record = borrowRecords.find(r => r.TransactionNo === id);
        if (record && !record.isFetchingReturns) {
          fetchReturnHistory(id, documentNo);
        }
      }
      return next;
    });
  };

  const toggleSelection = (borrowId: string, record: BorrowRecord) => {
    setSelectedReturns(prev => {
      const next = new Map(prev);
      if (next.has(borrowId)) {
        next.delete(borrowId);
      } else {
        const currentDraft = returnCounts[borrowId];
        let finalCount = (currentDraft !== undefined && currentDraft !== '') ? currentDraft : record.RemainingCount;
        if (finalCount === 0) finalCount = 1; // Fallback so it doesn't request 0

        next.set(borrowId, {
          borrowId,
          returnCount: finalCount,
          maxCount: record.RemainingCount,
          UnitTransfer: record.UnitTransfer,
          UnitReceive: record.UnitReceive,
          LevelGroupTo: record.LevelGroupTo,
          UnitTransferName: record.UnitTransferName,
          UnitReceiveName: record.UnitReceiveName,
          LevelGroupToName: record.LevelGroupToName,
          ParentDocumentNo: record.DocumentNo,
          RefTransactionNo: record.TransactionNo
        });
      }
      return next;
    });
  };

  const updateReturnCount = (record: BorrowRecord, value: string) => {
    const borrowId = record.TransactionNo;
    let newCount: number | '' = '';
    if (value !== '') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        if (parsed < 0) {
          newCount = 0; // Prevent negative
        } else if (parsed > record.RemainingCount) {
          newCount = record.RemainingCount; // Prevent more than max
        } else {
          newCount = parsed;
        }
      }
    }
    setReturnCounts(prev => ({ ...prev, [borrowId]: newCount }));
  };

  const handleRequest = async () => {
    if (selectedReturns.size === 0) {
      setAlertInfo({ show: true, title: 'แจ้งเตือน', message: 'กรุณาเลือกรายการคืนอย่างน้อย 1 รายการ', type: 'warning' });
      return;
    }

    // Validate return counts
    const invalidReturns = Array.from(selectedReturns.values()).filter(
      r => r.returnCount === '' || Number(r.returnCount) <= 0
    );
    if (invalidReturns.length > 0) {
      setAlertInfo({ show: true, title: 'แจ้งเตือน', message: 'กรุณาระบุจำนวนคืนให้ถูกต้อง (มากกว่า 0)', type: 'warning' });
      return;
    }

    try {
      const { userGroupNo: defaultUserGroup } = resolveUserContext();
      if (!defaultUserGroup) {
        setAlertInfo({ show: true, title: 'แจ้งเตือน', message: 'ไม่พบกลุ่มผู้ใช้ กรุณาเลือกสิทธิ์ก่อนทำรายการ', type: 'warning' });
        return;
      }
      const groupedReturns = getReturnsByDepartmentPair();
      const approversData: Record<string, ApproverUser[]> = {};

      for (const [key, returnsList] of Object.entries(groupedReturns)) {
        approversData[key] = [];
        
        for (const ret of returnsList) {
          // TransactionType 6 equivalent for approvers? Usually standard approval for return. JobType = 7
          const jobType = 7;
          const userGroupReceive = defaultUserGroup;
          const orgUnitNoReceive = ret.UnitReceive;
          const orgUnitNoTransfer = ret.UnitTransfer;
          const levelGroupNoFrom = ret.LevelGroupTo;
          const levelGroupNoTo = ret.LevelGroupTo;
          const effectiveDate = dayjs().format('YYYY-MM-DD');

          const queryParams = new URLSearchParams({
            jobType: jobType.toString(),
            userGroupReceive,
            orgUnitNoReceive,
            levelGroupNoFrom,
            ...(orgUnitNoTransfer ? { orgUnitNoTransfer } : {}),
            levelGroupNoTo,
            effectiveDate,
            isRequirePolicy: '0'
          });

          const resp = await fetch(`/api/transactions/approvers?${queryParams}&_t=${Date.now()}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.data?.length > 0) {
              approversData[key] = [...approversData[key], ...data.data];
            }
          }
        }
        
        // Remove duplicates by EmployeeID
        const uniqueSet = new Set();
        approversData[key] = approversData[key].filter((item) => {
          const isDuplicate = uniqueSet.has(item.EmployeeID);
          uniqueSet.add(item.EmployeeID);
          return !isDuplicate;
        });
      }

      setDynamicApprovers(approversData);
      setIsRequestModalOpen(true);
    } catch (e) {
      console.error("Failed to load approvers", e);
      setAlertInfo({ show: true, title: 'เกิดข้อผิดพลาด', message: 'เกิดข้อผิดพลาดในการโหลดรายชื่อผู้อนุมัติ', type: 'error' });
    }
  };

  const confirmRequest = async () => {
    const { userGroupNo: currentUserGroupNo } = resolveUserContext();
    const isHrPolicy = isHrPolicyUserGroup(currentUserGroupNo);
    const groups = getReturnsByDepartmentPair();
    const missingGroups = isHrPolicy
      ? []
      : Object.keys(groups).filter(key => !selectedApprovers[key] || selectedApprovers[key].length === 0);

    if (missingGroups.length > 0) {
      setAlertInfo({ show: true, title: 'แจ้งเตือน', message: 'กรุณาเลือกผู้ตรวจสอบสำหรับทุกกลุ่ม', type: 'warning' });
      return;
    }

    try {
      setIsSubmitting(true);
      const { employeeId, userGroupNo } = resolveUserContext();

      const selectedReturnsSnapshot = Array.from(selectedReturns.values());
      const itemsPayload = selectedReturnsSnapshot.map(ret => {
        const key = `${ret.UnitReceive}-${ret.UnitTransfer}`;
        const selectedEmpIds = selectedApprovers[key] || [];
        const groupApprovers = dynamicApprovers[key] || [];

          const itemApproversList = selectedEmpIds.map(empId => groupApprovers.find((a: ApproverUser) => a.EmployeeID === empId))
          .filter((a): a is ApproverUser => !!a);
          
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
          itemId: `TEMP_${ret.borrowId}_${Date.now()}`, // Temporary ID for DocumentItem
          borrowId: ret.borrowId,
          parentDocumentNo: ret.ParentDocumentNo,
          approvers: itemApprovers,
          draftData: {
            transactionType: 7, // Return transaction
            effectiveMonth: THAI_MONTH_NAMES[dayjs().month()],
            effectiveYear: String(dayjs().year() + 543),
            unitReceive: ret.UnitReceive,
            unitTransfer: ret.UnitTransfer,
            levelGroupTo: ret.LevelGroupTo,
            levelGroupFrom: ret.LevelGroupTo,
            amount: Number(ret.returnCount),
            parentDocumentNo: ret.ParentDocumentNo, // Linking to original borrow
            refTransactionNo: ret.RefTransactionNo,
            remark: 'รายการคืน',
            employeeId
          }
        };
      });

      // 1. Save drafts
      const savedDocs = await Promise.all(itemsPayload.map(async (item) => {
        const payload = {
          ...item.draftData,
          detailData: {
             levelGroupFrom: item.draftData.levelGroupFrom,
             levelGroupTo: item.draftData.levelGroupTo,
             unitTransfer: item.draftData.unitTransfer,
             amount: item.draftData.amount,
             refTransactionNo: item.draftData.refTransactionNo,
             conclusionNo: '',
             conclusionDate: ''
          }
        };

        const formDataPayload = new FormData();
        formDataPayload.append('payload', JSON.stringify(payload));

        const response = await fetch('/api/transactions/draft', {
          method: 'POST',
          body: formDataPayload
        });

        if (!response.ok) {
          let errData: { message?: string; error?: string } | null = null;
          try {
            errData = await response.json();
          } catch {
            throw new Error('Failed to save draft for return');
          }
          throw new Error(errData?.error?.trim() || errData?.message?.trim() || 'Failed to save draft for return');
        }
        const data = await response.json();
        const transactionNo = String(data?.data?.transactionNo || '').trim();
        if (!transactionNo) {
          throw new Error('Draft saved but transaction number is missing');
        }
        return {
           itemId: transactionNo,
           borrowId: item.borrowId,
           parentDocumentNo: item.parentDocumentNo,
           approvers: item.approvers
        };
      }));

      if (isHrPolicy) {
        const transactionNos = savedDocs.map((doc) => String(doc.itemId || '').trim()).filter(Boolean);
        const directApproveRes = await fetch('/api/transactions/direct-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionNos,
            updateBy: employeeId || 'SYSTEM'
          })
        });

        if (!directApproveRes.ok) {
          let errData: { message?: string; error?: string } | null = null;
          try {
            errData = await directApproveRes.json();
          } catch {
            throw new Error('Failed to auto-approve return transactions');
          }
          const reason = errData?.error?.trim() || errData?.message?.trim() || 'Failed to auto-approve return transactions';
          throw new Error(reason);
        }
      } else {
        // 2. Submit document(s) grouped by parent borrow document
        const groupedByParent = new Map<string, typeof savedDocs>();
        savedDocs.forEach((doc) => {
          const parentKey = String(doc.parentDocumentNo || '').trim();
          const current = groupedByParent.get(parentKey) || [];
          current.push(doc);
          groupedByParent.set(parentKey, current);
        });

        for (const [parentDocumentNo, docs] of groupedByParent.entries()) {
          const payload = {
            documentType: 1, // Transaction Document
            userGroupNo: userGroupNo || undefined,
            items: docs.map((d) => ({ itemId: d.itemId, approvers: d.approvers })),
            parentDocumentNo: parentDocumentNo || undefined,
            createBy: employeeId
          };

          const submitRes = await fetch('/api/documents/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!submitRes.ok) {
            let errData: { message?: string; error?: string } | null = null;
            try {
              errData = await submitRes.json();
            } catch {
              throw new Error('Failed to submit documents');
            }
            const reason = errData?.error?.trim() || errData?.message?.trim() || 'Failed to submit documents';
            throw new Error(parentDocumentNo ? `Parent ${parentDocumentNo}: ${reason}` : reason);
          }
        }
      }

      await fetchBorrowRecords();
      setExpandedRows(new Set(selectedReturnsSnapshot.map((ret) => ret.borrowId)));
      selectedReturnsSnapshot.forEach((ret) => {
        fetchReturnHistory(ret.borrowId, ret.ParentDocumentNo);
      });
      setAlertInfo({
        show: true,
        title: 'สำเร็จ',
        message: isHrPolicy ? 'อนุมัติรายการคืนเรียบร้อย!' : 'ส่งขอการอนุมัติคืนเรียบร้อย!',
        type: 'success'
      });
      setIsSubmitConfirmModalOpen(false);
      setIsRequestModalOpen(false);
      setSelectedReturns(new Map());
      setSelectedApprovers({});
    } catch (error) {
      console.error('Error submitting request:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดำเนินการ';
      const messagePrefix = isHrPolicy ? 'เกิดข้อผิดพลาดในการอนุมัติรายการคืน' : 'เกิดข้อผิดพลาดในการส่งคำขออนุมัติ';
      setAlertInfo({ show: true, title: 'เกิดข้อผิดพลาด', message: `${messagePrefix}: ${errorMessage}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSubmitConfirm = () => {
    const { userGroupNo } = resolveUserContext();
    const isHrPolicy = isHrPolicyUserGroup(userGroupNo);
    const groups = getReturnsByDepartmentPair();
    const missingGroups = isHrPolicy
      ? []
      : Object.keys(groups).filter(key => !selectedApprovers[key] || selectedApprovers[key].length === 0);
    if (missingGroups.length > 0) {
      setAlertInfo({ show: true, title: 'แจ้งเตือน', message: 'กรุณาเลือกผู้ตรวจสอบสำหรับทุกกลุ่ม', type: 'warning' });
      return;
    }
    setIsSubmitConfirmModalOpen(true);
  };

  const toggleApprover = (groupKey: string, approverId: string) => {
    setSelectedApprovers((prev) => {
      const currentList = prev[groupKey] || [];
      if (currentList.includes(approverId)) {
        return { ...prev, [groupKey]: currentList.filter((id) => id !== approverId) };
      } else {
        return { ...prev, [groupKey]: [...currentList, approverId] };
      }
    });
  };

  const getReturnsByDepartmentPair = () => {
    const grouped: Record<string, SelectedReturn[]> = {};
    
    Array.from(selectedReturns.values()).forEach((ret) => {
      const key = `${ret.UnitReceive}-${ret.UnitTransfer}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ret);
    });
    
    return grouped;
  };

  const formatDateCell = (value: string | null | undefined): string => {
    if (!value) return '';
    const parsed = dayjs(value);
    if (!parsed.isValid()) return String(value);
    return parsed.format('DD/MM/YYYY');
  };

  const formatDateTimeCell = (value: string | null | undefined): string => {
    if (!value) return '';
    const parsed = dayjs(value);
    if (!parsed.isValid()) return String(value);
    return parsed.format('DD/MM/YYYY HH:mm');
  };

  const getReturnStatusLabel = (status: number): string => {
    if (status === 3) return 'คืนแล้ว';
    if (status === 1 || status === 2) return 'รออนุมัติ';
    if (status === 0) return 'ยกเลิก';
    return String(status ?? '');
  };

  const toNumberOrDefault = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const mapPoolRsFlagLabel = (value: unknown): string => {
    const flag = toNumberOrDefault(value, 0);
    if (flag === 0) return 'ปกติ';
    if (flag === 1) return 'Pool Resource';
    if (flag === 2) return 'Secondment';
    return 'ปกติ';
  };

  const mapStrategicPositionLabel = (value: unknown): string => {
    return toNumberOrDefault(value, 0) === 1 ? 'ระบุ' : 'ไม่ระบุ';
  };

  const mapBusinessTypeLabel = (value: unknown): string => {
    const type = toNumberOrDefault(value, 0);
    if (type === 1) return 'Business';
    if (type === 2) return 'Support';
    return 'ไม่ระบุ';
  };

  const mapSpecificallyLabel = (value: unknown): string => {
    return toNumberOrDefault(value, 0) === 1 ? 'อัตราเฉพาะตัว' : 'ไม่ระบุ';
  };

  const mapLineStaffFlagLabel = (value: unknown): string => {
    const flag = toNumberOrDefault(value, 0);
    if (flag === 1) return 'Line';
    if (flag === 2) return 'Staff';
    return 'None';
  };

  const fetchReturnHistoryForExport = async (documentNo: string): Promise<ReturnRecord[]> => {
    const normalizedDocumentNo = String(documentNo || '').trim();
    if (!normalizedDocumentNo) return [];

    try {
      const res = await fetch(`/api/transactions/return-history/${encodeURIComponent(normalizedDocumentNo)}?_t=${Date.now()}`);
      if (!res.ok) return [];
      const result = await res.json();
      return Array.isArray(result?.data) ? (result.data as ReturnRecord[]) : [];
    } catch {
      return [];
    }
  };

  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      setAlertInfo({ show: true, title: 'แจ้งเตือน', message: 'ไม่พบข้อมูลสำหรับ Export', type: 'warning' });
      return;
    }

    setIsExporting(true);
    try {
      const recordsWithReturns = await Promise.all(
        filteredRecords.map(async (record) => ({
          record,
          returns: await fetchReturnHistoryForExport(record.DocumentNo),
        }))
      );

      const rows: Array<{
        no: number;
        transactionNo: string;
        documentNo: string;
        recordType: string;
        transactionDesc: string;
        unitReceive: string;
        unitTransfer: string;
        parentDocumentNo: string;
        refTransactionNo: string;
        amount: number | string;
        status: string;
        effectiveDate: string;
        poolRsFlag: string;
        strategicPosition: string;
        businessType: string;
        specifically: string;
        lineStaffFlag: string;
        createDate: string;
      }> = [];
      let rowNo = 1;

      recordsWithReturns.forEach(({ record, returns }) => {
        rows.push({
          no: rowNo++,
          transactionNo: String(record.TransactionNo || ''),
          documentNo: String(record.DocumentNo || ''),
          recordType: 'ยืม',
          transactionDesc: String(record.TransactionDesc || ''),
          unitReceive: String(record.UnitReceive || ''),
          unitTransfer: String(record.UnitTransfer || ''),
          parentDocumentNo: '',
          refTransactionNo: '',
          amount: Number(record.Amount || 0),
          status: record.RemainingCount <= 0 ? 'คืนหมดแล้ว' : 'ยืมอยู่',
          effectiveDate: formatDateCell(record.EffectiveDate),
          poolRsFlag: mapPoolRsFlagLabel(record.PoolRsFlag),
          strategicPosition: mapStrategicPositionLabel(record.StrgFlag),
          businessType: mapBusinessTypeLabel(record.BSType),
          specifically: mapSpecificallyLabel(record.SpecFlag),
          lineStaffFlag: mapLineStaffFlagLabel(record.LineStaffFlag),
          createDate: formatDateTimeCell(record.CreateDate),
        });

        returns.forEach((ret) => {
          const returnPoolRsFlag = ret.PoolRsFlag ?? ret.PoolRSFlag;
          rows.push({
            no: rowNo++,
            transactionNo: String(ret.TransactionNo || ''),
            documentNo: String(ret.DocumentNo || record.DocumentNo || ''),
            recordType: 'คืน',
            transactionDesc: String(ret.TransactionDesc || ''),
            unitReceive: String(ret.UnitReceive || record.UnitReceive || ''),
            unitTransfer: String(ret.UnitTransfer || record.UnitTransfer || ''),
            parentDocumentNo: String(record.DocumentNo || ''),
            refTransactionNo: String(record.TransactionNo || ''),
            amount: Number(ret.ReturnCount || 0),
            status: getReturnStatusLabel(Number(ret.Status || 0)),
            effectiveDate: formatDateCell(ret.EffectiveDate),
            poolRsFlag: mapPoolRsFlagLabel(returnPoolRsFlag),
            strategicPosition: mapStrategicPositionLabel(ret.StrgFlag),
            businessType: mapBusinessTypeLabel(ret.BSType),
            specifically: mapSpecificallyLabel(ret.SpecFlag),
            lineStaffFlag: mapLineStaffFlagLabel(ret.LineStaffFlag),
            createDate: formatDateTimeCell(ret.CreateDate),
          });
        });
      });

      if (rows.length === 0) {
        setAlertInfo({ show: true, title: 'แจ้งเตือน', message: 'ไม่พบข้อมูลสำหรับ Export', type: 'warning' });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Document Transaction');

      worksheet.columns = [
        { header: 'ลำดับ', key: 'no', width: 10 },
        { header: 'ประเภท', key: 'recordType', width: 12 },
        { header: 'TransactionNo', key: 'transactionNo', width: 20 },
        { header: 'DocumentNo', key: 'documentNo', width: 20 },
        { header: 'มติ / เรื่อง', key: 'transactionDesc', width: 50 },
        { header: 'หน่วยงานรับยืม (UnitReceive)', key: 'unitReceive', width: 24 },
        { header: 'หน่วยงานที่ให้ยืม (UnitTransfer)', key: 'unitTransfer', width: 24 },
        { header: 'ParentDocumentNo', key: 'parentDocumentNo', width: 22 },
        { header: 'RefTransactionNo', key: 'refTransactionNo', width: 20 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'EffectiveDate', key: 'effectiveDate', width: 14 },
        { header: 'PoolRSFlag', key: 'poolRsFlag', width: 18 },
        { header: 'Strategic Position', key: 'strategicPosition', width: 18 },
        { header: 'Business Type', key: 'businessType', width: 16 },
        { header: 'Specifically', key: 'specifically', width: 18 },
        { header: 'LineStaffFlag', key: 'lineStaffFlag', width: 14 },
        { header: 'CreateDate', key: 'createDate', width: 20 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFB7D7C1' } },
          left: { style: 'thin', color: { argb: 'FFB7D7C1' } },
          bottom: { style: 'thin', color: { argb: 'FFB7D7C1' } },
          right: { style: 'thin', color: { argb: 'FFB7D7C1' } },
        };
      });

      rows.forEach((row) => worksheet.addRow(row));
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columnCount },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Borrow_Return_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      await saveExcelFile(buffer, fileName);
    } catch (error) {
      console.error('Failed to export return excel:', error);
      setAlertInfo({ show: true, title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถ Export Excel ได้', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Filter records
  const filteredRecords = borrowRecords.filter(record => {
    // Status filter
    const isFullyReturned = record.RemainingCount <= 0;
    if (selectedStatus === 'borrowed' && isFullyReturned) return false;
    if (selectedStatus === 'fully_returned' && !isFullyReturned) return false;
    
    // Dropdown filters
    if (selectedBusinessUnits.length > 0) {
      const recordBuIds = getBusinessUnitOptionsFromRecord(record).map((item) => item.id);
      const hasSelectedBusinessUnit = recordBuIds.some((buId) => selectedBusinessUnits.includes(buId));
      if (!hasSelectedBusinessUnit) return false;
    }
    if (selectedFromDepts.length > 0) {
      const hasSelectedDept = selectedFromDepts.includes(record.UnitTransfer) || selectedFromDepts.includes(record.UnitReceive);
      if (!hasSelectedDept) return false;
    }
    
    // Table column filters
    if (filterInbox && !record.DocumentNo.toLowerCase().includes(filterInbox.toLowerCase())) return false;
    // EffectiveDate is a Datetime string from DB, we can format it if needed, or search as-is
    if (filterEffectiveDate && !record.EffectiveDate.toLowerCase().includes(filterEffectiveDate.toLowerCase())) return false;
    // if (filterDepartment) {
    //   const fromDept = (record.UnitTransferName || record.UnitTransfer).toLowerCase();
    //   const toDept = (record.UnitReceiveName || record.UnitReceive).toLowerCase();
    //   const searchTerm = filterDepartment.toLowerCase();
    //   if (!fromDept.includes(searchTerm) && !toDept.includes(searchTerm)) return false;
    // }
    if (filterResolution && !record.TransactionDesc.toLowerCase().includes(filterResolution.toLowerCase())) return false;
    
    return true;
  });

  return (
    <Main currentPath="/transaction/borrowreturn/return">
      <div className="space-y-4">
        
        {/* 1. HEADER */}
        <Card className="border-0 shadow-md rounded-lg overflow-hidden py-0">
          <div className="bg-linear-to-r from-blue-200 to-blue-500 px-6 py-3 flex items-center justify-between shadow-lg rounded-t-lg border-b border-blue-500/30">
            <h1 className="text-xl font-bold text-gray-800 tracking-wide flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-900" />
              การคืนกรอบอัตรากำลัง
            </h1>
          </div>
        </Card>

        {/* 2. FILTER BAR */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-wrap items-center gap-6">
          {/* สถานะ */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">สถานะ :</label>
            <div className="relative">
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-40 pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-shadow appearance-none bg-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="borrowed">ยืมอยู่</option>
                <option value="fully_returned">คืนหมดแล้ว</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* หน่วยธุรกิจ */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยธุรกิจ :</label>
            <MultiSelectFilter
              label="เลือกหน่วยธุรกิจ"
              options={businessUnits.map((bu) => ({ value: bu.id, label: toCodeNameLabel(bu.id, bu.name) }))}
              selectedValues={selectedBusinessUnits}
              onChange={setSelectedBusinessUnits}
              width="w-56"
            />
          </div>

          {/* หน่วยงานให้ยืม */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยงาน :</label>
            <MultiSelectFilter
              label="เลือกหน่วยงาน"
              options={departments.map((dep) => ({ value: dep.id, label: toCodeNameLabel(dep.id, dep.name) }))}
              selectedValues={selectedFromDepts}
              onChange={setSelectedFromDepts}
              width="w-56"
            />
          </div>

          

          <div className="flex-1"></div>

          <Button
            onClick={handleExportExcel}
            disabled={isExporting || filteredRecords.length === 0}
            className="bg-linear-to-r from-green-600 to-emerald-600 text-white px-6 h-9 text-sm font-semibold hover:from-green-700 hover:to-emerald-700 shadow-md"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'กำลัง Export...' : 'EXPORT EXCEL'}
          </Button>

          {/* Request Button */}
          {selectedReturns.size > 0 && (
            <Button onClick={handleRequest} className="bg-linear-to-r from-purple-500 to-purple-600 text-white px-6 h-9 text-sm font-semibold hover:from-purple-600 hover:to-purple-700 shadow-md">
              REQUEST ({selectedReturns.size})
            </Button>
          )}
        </div>

        {/* 3. TABLE CARD */}
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold w-[50px]"></th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-[150px]">Document No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-[120px]">Effective Date</th>
                    {/* <th className="px-4 py-3 text-left text-sm font-semibold">หน่วยงาน</th> */}
                    <th className="px-4 py-3 text-left text-sm font-semibold">มติ / เรื่อง</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-[100px]">ระดับ</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-[80px]">ยืม/คืน</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-[80px]">คงเหลือ</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-[100px]">จำนวนคืน</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-[120px]">สถานะ</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-[100px]">Action</th>
                  </tr>
                  
                  {/* Filter Row */}
                  <tr className="bg-white border-b border-gray-100">
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        value={filterInbox}
                        onChange={(e) => setFilterInbox(e.target.value)}
                        placeholder=""
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-400 focus:outline-none"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        value={filterEffectiveDate}
                        onChange={(e) => setFilterEffectiveDate(e.target.value)}
                        placeholder=""
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-400 focus:outline-none"
                      />
                    </th>
                    {/* <th className="px-4 py-2">
                      <input 
                        type="text" 
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        placeholder=""
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-400 focus:outline-none"
                      />
                    </th> */}
                    <th className="px-4 py-2">
                      <input 
                        type="text" 
                        value={filterResolution}
                        onChange={(e) => setFilterResolution(e.target.value)}
                        placeholder=""
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-400 focus:outline-none"
                      />
                    </th>
                    <th className="px-4 py-2" colSpan={6}></th>
                  </tr>
                </thead>
                
                <tbody>
                  {filteredRecords.map((record, index) => {
                    const isExpanded = expandedRows.has(record.TransactionNo);
                    const isSelected = selectedReturns.has(record.TransactionNo);
                    const canReturn = record.RemainingCount > 0;

                    return (
                      <React.Fragment key={record.TransactionNo}>
                        {/* Main Borrow Row */}
                        <tr className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} ${isSelected ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-4 text-center">
                            {record.isFetchingReturns && (
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            )}
                            {!record.isFetchingReturns && (
                              <button onClick={() => toggleRow(record.TransactionNo, record.DocumentNo)} className="text-gray-500 hover:text-blue-600 transition-colors">
                                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">
                            <span className="text-blue-600 hover:text-blue-800 font-mono whitespace-nowrap">{record.DocumentNo}</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">{dayjs(record.EffectiveDate).format('DD/MM/YYYY')}</td>
                          {/* <td className="px-4 py-4 text-sm text-gray-700">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">จาก:</span>
                                <span className="font-medium">{getDepartmentName(record.fromDepartment)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">ถึง:</span>
                                <span className="font-medium">{getDepartmentName(record.toDepartment)}</span>
                              </div>
                            </div>
                          </td> */}
                          <td className="px-4 py-4 text-sm text-gray-600 leading-relaxed">
                            {record.TransactionDesc}
                            <div className="text-[10px] text-gray-400 mt-1">Created: {dayjs(record.CreateDate).format('DD/MM/YYYY HH:mm')}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">{record.LevelGroupToName || record.LevelGroupTo}</td>
                          <td className="px-4 py-4 text-sm text-center font-semibold text-gray-900">{record.Amount}</td>
                          <td className="px-4 py-4 text-sm text-center">
                            <span className={`font-bold ${record.RemainingCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {record.RemainingCount}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {canReturn ? (
                              <div className="flex items-center justify-center">
                                <input
                                  type="number"
                                  min="1"
                                  max={record.RemainingCount}
                                  value={selectedReturns.has(record.TransactionNo) ? selectedReturns.get(record.TransactionNo)!.returnCount : (returnCounts[record.TransactionNo] !== undefined ? returnCounts[record.TransactionNo] : record.RemainingCount)}
                                  onChange={(e) => updateReturnCount(record, e.target.value)}
                                  disabled={isSelected}
                                  className={`w-16 px-2 py-1 text-sm text-center border rounded transition-all ${
                                    isSelected 
                                      ? 'border-purple-300 bg-gray-50 text-gray-700 cursor-not-allowed font-semibold' 
                                      : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 hover:border-gray-400'
                                  }`}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.RemainingCount <= 0 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-orange-100 text-orange-800 border border-orange-200'
                            }`}>
                              {record.RemainingCount <= 0 ? 'คืนหมดแล้ว' : 'ยืมอยู่'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {canReturn ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => toggleSelection(record.TransactionNo, record)}
                                className={`h-8 text-xs font-semibold transition-all shadow-sm ${
                                  isSelected 
                                    ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700' 
                                    : 'text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
                                }`}
                              >
                                {isSelected ? <Check className="w-3.5 h-3.5 mr-1.5" /> : null}
                                คืน
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>

                        {/* Return Records (Child Rows) */}
                        {isExpanded && !record.isFetchingReturns && (!record.returns || record.returns.length === 0) && (
                          <tr className="bg-purple-50/50 border-b border-purple-100">
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-sm text-purple-700" colSpan={9}>
                              ยังไม่มีประวัติการคืนของเอกสารนี้
                            </td>
                          </tr>
                        )}
                        {isExpanded && record.returns && record.returns.map((ret) => (
                          <tr key={ret.TransactionNo} className="bg-purple-50/50 border-b border-purple-100">
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-sm font-medium pl-8">
                              <div className="flex items-center gap-2">
                                <span className="text-purple-600 text-lg">↳</span>
                                <span className="text-purple-600 hover:text-purple-800 font-mono whitespace-nowrap">
                                  {ret.DocumentNo || ret.TransactionNo}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {dayjs(ret.CreateDate).format('DD/MM/YYYY')}
                            </td>
                            {/* <td className="px-4 py-3"></td> */}
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <span className="text-xs">{ret.TransactionDesc}</span>
                               <div className="text-[10px] text-gray-400 mt-1">Created: {dayjs(ret.CreateDate).format('DD/MM/YYYY HH:mm')}</div>
                            </td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-purple-700">
                              {ret.ReturnCount}
                            </td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-center">
                              {ret.Status === 3 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                  คืนแล้ว
                                </span>
                              )}
                              {(ret.Status === 1 || ret.Status === 2) && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                  รออนุมัติ
                                </span>
                              )}
                              {ret.Status === 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                  ยกเลิก
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================================= */}
      {/* REQUEST MODAL */}
      {/* ================================================================================= */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-2 border-b bg-linear-to-r from-purple-200 to-purple-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-purple-900">ยืนยันการส่งขออนุมัติคืน</h2>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50">
              {Object.entries(getReturnsByDepartmentPair()).map(([key, returns]) => {
                const dynamicList = dynamicApprovers[key] || [];
                const approverGroups = Array.from(new Set(dynamicList.map((u: ApproverUser) => `${u.UnitSide}-${u.PermissionOrder}`))).map(groupKey => {
                    const groupUsers = dynamicList.filter((u: ApproverUser) => `${u.UnitSide}-${u.PermissionOrder}` === groupKey);
                    const sample = groupUsers[0];
                    let title = '';
                    const icon = Users;
                    let color = 'text-gray-600 bg-gray-50 border-gray-200';

                    const rawRole = sample.UserGroupRole || '';
                    const roleLabel = rawRole.toUpperCase().includes('HRUSER') ? 'HR USER' : rawRole.toUpperCase().includes('HRVERIFY') ? 'HR VERIFY' : rawRole;
                    const sideLabel = sample.UnitSide === 'UnitReceive' || sample.UnitSide === 'UnitFrom' ? 'ฝั่งรับ' : 'ฝั่งให้';
                    const unitName = sample.UnitSide === 'UnitReceive' || sample.UnitSide === 'UnitFrom' ? getDepartmentName(sample.OrgUnitNo) : getDepartmentName(sample.OrgUnitNo);

                    title = `${roleLabel} (${sideLabel}: ${unitName})`;

                    if (sample.UnitSide === 'UnitReceive' || sample.UnitSide === 'UnitFrom') {
                      color = 'text-green-600 bg-green-50 border-green-200';
                    } else if ((sample.UnitSide === 'UnitTransfer' || sample.UnitSide === 'UnitTo') && roleLabel === 'HR USER') {
                      color = 'text-blue-600 bg-blue-50 border-blue-200';
                    } else if ((sample.UnitSide === 'UnitTransfer' || sample.UnitSide === 'UnitTo') && roleLabel === 'HR VERIFY') {
                      color = 'text-indigo-600 bg-indigo-50 border-indigo-200';
                    }

                    return {
                      title,
                      icon,
                      color,
                      users: groupUsers
                    };
                });

                return (
                  <div key={key} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-purple-100 px-4 py-2 border-b border-purple-200 flex justify-between items-center">
                      <span className="font-semibold text-sm text-purple-900 flex items-center gap-2">
                        🔄 คืน : {returns[0]?.UnitReceiveName} → {returns[0]?.UnitTransferName}
                      </span>
                      <span className="text-xs bg-white px-2 py-1 rounded border text-purple-700">{returns.length} รายการ</span>
                    </div>

                    <div className="p-3 grid grid-cols-1 md:grid-cols-[60%_40%] gap-4">
                      {/* LEFT: Return List */}
                      <div className="space-y-2 border-r border-gray-100 pr-3">
                        {returns.map((ret, idx) => {
                          const borrowRecord = borrowRecords.find(b => b.TransactionNo === ret.borrowId);
                          return (
                            <div key={ret.borrowId} className="rounded-md border-2 p-3 bg-purple-50 border-purple-200">
                              <div className="flex items-center gap-2 text-xs mb-1">
                                <span className="font-bold bg-white/80 px-1.5 rounded">#{idx + 1}</span>
                                <span className="font-bold uppercase text-purple-700">คืนกรอบอัตรากำลัง</span>
                              </div>
                              <span className="text-xs leading-relaxed opacity-90">
                                คืนกรอบอัตรากำลัง จำนวน <span className="font-bold">{ret.returnCount}</span> อัตรา 
                                ของ {ret.LevelGroupToName || ret.LevelGroupTo} 
                                จาก {ret.UnitReceiveName} คืนให้ {ret.UnitTransferName}
                              </span>
                              {borrowRecord && (
                                <div className="text-[10px] text-gray-500 mt-1">
                                  Ref: {borrowRecord.DocumentNo}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* RIGHT: Approver Selection */}
                      <div className="pl-2 space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" /> เลือกผู้อนุมัติ
                        </h3>
                        
                        {approverGroups.length === 0 ? (
                          <div className="text-red-500 text-sm p-4 bg-red-50 rounded text-center">ไม่พบรายชื่อผู้อนุมัติที่เกี่ยวข้อง</div>
                        ) : (
                          approverGroups.map((group, groupIdx) => (
                            <div key={groupIdx} className={`rounded-lg border overflow-hidden ${group.color}`}>
                              <div className="px-3 py-2 bg-white/50 border-b border-inherit flex items-center gap-2">
                                <group.icon className="w-4 h-4 opacity-70" />
                                <span className="text-xs font-bold uppercase tracking-wider">{group.title}</span>
                              </div>
                              <div className="p-2 space-y-2 bg-white">
                                {group.users.map((user: ApproverUser) => {
                                  const isSelected = (selectedApprovers[key] || []).includes(user.EmployeeID);
                                  return (
                                    <label key={user.EmployeeID} className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all hover:shadow-sm
                                      ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                                        ${isSelected ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                      </div>
                                      <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleApprover(key, user.EmployeeID)} />
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-700 truncate">{user.FullName}</p>
                                        <p className="text-[10px] text-gray-400">{user.UserGroupName || user.UserGroupRole}</p>
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
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRequestModalOpen(false)} className="px-6">CANCEL</Button>
              <Button onClick={handleOpenSubmitConfirm} className="bg-purple-600 hover:bg-purple-700 text-white px-8 gap-2"><CheckCircle className="h-5 w-5" /> CONFIRM</Button>
            </div>
          </div>
        </div>
      )}
      {isSubmitConfirmModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {isHrPolicyUserGroup(resolveUserContext().userGroupNo) ? 'ยืนยันการอนุมัติทันที' : 'ยืนยันการส่งขออนุมัติ'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {isHrPolicyUserGroup(resolveUserContext().userGroupNo)
                  ? 'ต้องการอนุมัติรายการคืนที่เลือกไว้ทันทีใช่หรือไม่'
                  : 'ต้องการส่งคำขออนุมัติรายการคืนที่เลือกไว้ใช่หรือไม่'}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsSubmitConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 font-semibold"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={confirmRequest}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 font-semibold"
              >
                {isSubmitting
                  ? (isHrPolicyUserGroup(resolveUserContext().userGroupNo) ? 'กำลังอนุมัติ...' : 'กำลังส่ง...')
                  : 'ยืนยัน'}
              </Button>
            </div>
          </div>
        </div>
      )}
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
    </Main>
  );
}
