'use client';

import Main from '@/components/layout/main';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
dayjs.extend(buddhistEra);
dayjs.locale('th');
import { 
  X, CheckCircle, FileText, Clock, XCircle, UserCheck, ShieldAlert, 
  CornerDownLeft, ArrowRight, Search, User, Eye, RotateCcw, AlertOctagon, 
  Link as LinkIcon, Briefcase, File as FileIcon, Calendar, ChevronUp,
  Check
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================================================
// 1. TYPES DEFINITION
// ============================================================================

interface TransactionDetail {
  id: string;
  actionKey: string;
  typeLabel: string; // e.g. โอนภายใต้ผู้ช่วย, เพิ่ม/ลด, ปรับสัดส่วน
  typeCategory: 'transfer' |'other' | 'add' | 'adjust'; // For styling
  description: string;
  remark: string;
  hasFile: boolean;
  fileUrl?: string;
  rejectionReason?: string;
  transactionType: number;
  flowStatus: 'current' | 'pending' | 'completed' | 'rejected' | 'unknown';
  flowLabel: string;
  canTakeAction: boolean;
  flowSideLabel: string;
  totalSteps: number;
  _seqno?: number;
}

// New Interface for Approval Log
interface ApprovalLogItem {
  action: string; // e.g. สร้าง, ส่ง, อนุมัติ, รออนุมัติ
  timestamp?: string; // e.g. 12/11/2025 00:34
  user: string; // e.g. 14600429 นายวงศธร
  role: string; // e.g. Outsource, Manager
  status: 'completed' | 'current' | 'pending' | 'success';
  seqno?: number;
  auditStatus?: number;
  unitSide?: string;
}

interface InboxItem {
  id: string;
  displayId: string;
  title: string;
  date: string;
  type: 'transaction' | 'mkd';
  
  statusLabel: string;
  
  // Overall Process Status for Stepper (1=Create, 2=Waiting, 3=Approved)
  processStage: 1 | 2 | 3; 
  subtitle?: string;
  items?: TransactionDetail[];
  logs?: ApprovalLogItem[];
}

interface MyRequestItem {
  id: string;
  displayId: string;
  title: string;
  createDate: string;
  type: 'transaction' | 'mkd'; 
  statusCategory?: 'verify' | 'approve';
  currentStepLabel: string;
  currentHandler: string;
  pendingDays: number;
}

// API Response Interfaces
interface APIMKDInboxItem {
  ManDriverID?: number | string;
  RefID?: number | string;
  CreateDateBD?: string;
  CreateDate: string;
  RefNo?: string;
  ApproveID?: string | number;
  Detail1?: string;
  Detail2?: string;
  FullDetail?: string;
}

interface APIDocRequestItem {
  CreateDate: string;
  LastActionDate?: string;
  TransactionNo: string;
  TransactionDesc?: string;
  UserGroupNo?: string;
  CurrentHandler?: string;
}

interface APIMKDRequestItem {
  CreateDate: string;
  LastActionDate?: string;
  TransactionNo: string;
  TransactionDesc?: string;
  RequestType?: number;
  ManDriverStatus?: number;
  CurrentHandler?: string;
}

interface APIDocDetailItem {
  ItemID: string;
  TransactionType: number;
  TransactionDesc: string;
  ReqRemark: string;
  FileCount: number;
  FileUrl: string;
  RejectionReason: string;
  Seqno: number;
}

interface APIDocAuditLog {
  Seqno: number;
  AuditStatus: number;
  AuditDate?: string;
  EmployeeID: string;
  Fullname: string;
  UserGroupName?: string;
  UserGroupNo?: string;
  UnitSide?: string;
}

const getUnitSideLabel = (unitSide?: string) => {
  if (unitSide === 'UnitReceive') return 'ฝั่งรับ';
  if (unitSide === 'UnitTransfer') return 'ฝั่งให้';
  return '';
};

const getFlowMeta = (auditStatus?: number, unitSide?: string, isMyTurn = false) => {
  if (auditStatus === 1 && isMyTurn) {
    return { flowStatus: 'current' as const, flowLabel: 'ถึงคิวอนุมัติ', canTakeAction: true };
  }
  if (auditStatus === 2) {
    return { flowStatus: 'completed' as const, flowLabel: 'อนุมัติแล้ว', canTakeAction: false };
  }
  if (auditStatus === -1) {
    return { flowStatus: 'rejected' as const, flowLabel: 'ไม่อนุมัติ', canTakeAction: false };
  }

  const sideLabel = getUnitSideLabel(unitSide);
  return {
    flowStatus: 'pending' as const,
    flowLabel: sideLabel ? `รอดำเนินการ (${sideLabel})` : 'รอดำเนินการ',
    canTakeAction: false
  };
};

const getFlowBadgeClass = (flowStatus: TransactionDetail['flowStatus']) => {
  if (flowStatus === 'current') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (flowStatus === 'pending') return 'bg-gray-100 text-gray-600 border-gray-200';
  if (flowStatus === 'completed') return 'bg-green-100 text-green-700 border-green-200';
  if (flowStatus === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

export default function Home() {
  const router = useRouter();
  
  // ============================================================================
  // 2. STATE MANAGEMENT
  // ============================================================================
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedInboxItem, setSelectedInboxItem] = useState<InboxItem | null>(null);
  const [itemActions, setItemActions] = useState<Record<string, 'approved' | 'rejected' | 'idle'>>({}); 

  const [isRejectAllModalOpen, setIsRejectAllModalOpen] = useState(false);
  const [rejectAllRemark, setRejectAllRemark] = useState('');

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingFilter, setTrackingFilter] = useState<'transaction_pending' | 'mkd_pending' | null>(null);

  // ============================================================================
  // 3. MOCK DATA
  // ============================================================================

  const [inboxData, setInboxData] = useState<InboxItem[]>([]);
  const [myRequestsData, setMyRequestsData] = useState<MyRequestItem[]>([]);
  const [statsData, setStatsData] = useState<{ id: string; filterKey: 'transaction_pending' | 'mkd_pending'; title: string; value: number; subtitle: string; bgColor: string; icon: string; textColor: string; borderColor: string }[]>([
    { id: 'stat_approve', filterKey: 'transaction_pending' as const, title: 'Transaction: Pending Approve', value: 0, subtitle: 'Transaction: รออนุมัติ', bgColor: 'bg-blue-50', icon: '⏳', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
    { id: 'stat_mkd', filterKey: 'mkd_pending' as const, title: 'MKD: Pending Approve', value: 0, subtitle: 'MKD: รออนุมัติตามสายงาน', bgColor: 'bg-purple-50', icon: '📝', textColor: 'text-purple-700', borderColor: 'border-purple-200' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      let employeeId = 'SYSTEM';
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          employeeId = userData.employeeID || 'SYSTEM';
        } catch (e) {}
      }

      // --- Fetch Inbox ---
      const [docInboxRes, mkdInboxRes] = await Promise.all([
        fetch(`/api/documents/inbox?employeeId=${employeeId}`),
        fetch(`/api/mkd/inbox?employeeId=${employeeId}`)
      ]);
      
      const map = new Map<string, InboxItem>();
      
      if (docInboxRes.ok) {
        const docInboxJson = await docInboxRes.json();
        docInboxJson.data.forEach((item: { DocumentNo: string; DocumentType: number; CreateDate: string }) => {
          if (!map.has(item.DocumentNo)) {
            let title = 'ไม่ทราบประเภทเอกสาร';
            if (item.DocumentType === 1) title = 'ตรวจสอบการเปลี่ยนแปลงกรอบอัตรากำลัง';
            else if (item.DocumentType === 2) title = 'ขออนุมัติ Manpower Key Driver';
            
            map.set(item.DocumentNo, {
              id: item.DocumentNo,
              displayId: `[${item.DocumentNo}]`,
              title,
              date: dayjs(item.CreateDate).format('DD/MM/BBBB'),
              type: item.DocumentType === 2 ? 'mkd' : 'transaction',
              statusLabel: 'Waiting Verify', 
              processStage: 2, 
              items: [],
              logs: []
            });
          }
        });
      }

      if (mkdInboxRes.ok) {
        const mkdInboxJson = await mkdInboxRes.json();
        mkdInboxJson.data.forEach((item: APIMKDInboxItem) => {
          const mkdId = item.ManDriverID ? item.ManDriverID.toString() : item.RefID?.toString();
          if (mkdId && !map.has('MKD_' + mkdId)) {
            // Fix Date: item.CreateDateBD is already DD/MM/YYYY (Buddhist)
            // If we use dayjs().format('BBBB'), it adds 543 again.
            let displayDate = '';
            if (item.CreateDateBD && item.CreateDateBD.includes('/')) {
              displayDate = item.CreateDateBD;
            } else {
              displayDate = dayjs(item.CreateDate).format('DD/MM/BBBB');
            }

            map.set('MKD_' + mkdId, {
              id: mkdId,
              displayId: item.RefNo ? `[${item.RefNo}]` : `[${item.ApproveID || mkdId}]`,
              title: item.Detail1 || 'ขออนุมัติ Manpower Key Driver',
              subtitle: item.Detail2,
              date: displayDate,
              type: 'mkd',
              statusLabel: 'Waiting Approve', 
              processStage: 2,
              items: [],
              logs: []
            });
          }
        });
      }
      setInboxData(Array.from(map.values()));

      // --- Fetch My Requests ---
      const [docReqRes, mkdReqRes] = await Promise.all([
        fetch(`/api/documents/my-requests?employeeId=${employeeId}`),
        fetch(`/api/mkd/my-requests?employeeId=${employeeId}`)
      ]);
      
      let allReqs: MyRequestItem[] = [];

      if (docReqRes.ok) {
        const reqJson = await docReqRes.json();
        const mappedReqs = reqJson.data.map((item: APIDocRequestItem) => {
          const createDate = dayjs(item.CreateDate).format('DD/MM/BBBB HH:mm');
          let pendingDays = 0;
          if (item.LastActionDate) {
              const diffMs = Date.now() - new Date(item.LastActionDate).getTime();
              pendingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          }
          return {
              id: item.TransactionNo,
              displayId: `[${item.TransactionNo}]`,
              title: item.TransactionDesc || 'ไม่มีคำอธิบาย',
              createDate,
              type: 'transaction' as const,
              currentStepLabel: item.UserGroupNo || 'รอตรวจสอบ',
              currentHandler: item.CurrentHandler || '-',
              pendingDays
          };
        });
        allReqs = [...allReqs, ...mappedReqs];
      }

      if (mkdReqRes.ok) {
        const reqJson = await mkdReqRes.json();
        const mappedReqs = reqJson.data.map((item: APIMKDRequestItem) => {
          const createDate = dayjs(item.CreateDate).format('DD/MM/BBBB HH:mm');
          let pendingDays = 0;
          if (item.LastActionDate) {
              const diffMs = Date.now() - new Date(item.LastActionDate).getTime();
              pendingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          }

          // Stage Logic: 
          // requesttype = 1 and mandriverstatus = 1 -> "รอเห็นชอบ"
          // requesttype = 1 and mandriverstatus = 2 -> "รออนุมัติ"
          let stage = '-';
          if (item.RequestType === 1) {
              if (item.ManDriverStatus === 1) stage = 'รอเห็นชอบ';
              else if (item.ManDriverStatus === 2) stage = 'รออนุมัติ';
          } else {
              // Fallback for other types
              stage = item.ManDriverStatus === 1 ? 'รอเห็นชอบ' : 'รออนุมัติ';
          }

          return {
              id: item.TransactionNo,
              displayId: `[${item.TransactionNo}]`,
              title: item.TransactionDesc || 'ขออนุมัติ MKD',
              createDate,
              type: 'mkd' as const,
              currentStepLabel: stage,
              currentHandler: item.CurrentHandler || '-',
              pendingDays
          };
        });
        allReqs = [...allReqs, ...mappedReqs];
      }
      
      // Sort by descending CreateDate
      allReqs.sort((a, b) => {
          const dateA = dayjs(a.createDate, 'DD/MM/BBBB HH:mm').toDate().getTime();
          const dateB = dayjs(b.createDate, 'DD/MM/BBBB HH:mm').toDate().getTime();
          return dateB - dateA;
      });

      setMyRequestsData(allReqs);
      
      // Update Stats
      setStatsData([
        { id: 'stat_approve', filterKey: 'transaction_pending' as const, title: 'Transaction: Pending Approve', value: allReqs.filter(i => i.type === 'transaction').length, subtitle: 'Transaction: รออนุมัติ', bgColor: 'bg-blue-50', icon: '⏳', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
        { id: 'stat_mkd', filterKey: 'mkd_pending' as const, title: 'MKD: Pending Approve', value: allReqs.filter(i => i.type === 'mkd').length, subtitle: 'MKD: รออนุมัติตามสายงาน', bgColor: 'bg-purple-50', icon: '📝', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
      ]);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // 4. HELPERS & HANDLERS
  // ============================================================================

  
  const handleInboxClick = async (item: InboxItem) => {
    if (item.type === 'mkd') {
      router.push(`/mkd/history/${item.id}?from=inbox`); 
    } else {
      setSelectedInboxItem(item);
      setIsActionModalOpen(true);
      
      try {
        let employeeId = 'SYSTEM';
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            employeeId = userData.employeeID || 'SYSTEM';
          } catch (e) {}
        }
  
        const res = await fetch(`/api/documents/${item.id}?employeeId=${employeeId}`);
        if (res.ok) {
          const detailJson = await res.json();
          
          if (detailJson.data) {
              const rawLogs: APIDocAuditLog[] = Array.isArray(detailJson.data.logs) ? detailJson.data.logs : [];
              const sortedLogs = [...rawLogs].sort((a, b) => a.Seqno - b.Seqno);
              const totalSteps = sortedLogs.reduce((max, curr) => (curr.Seqno > max ? curr.Seqno : max), 0);
              const stageBySeq = new Map<number, APIDocAuditLog>();
              sortedLogs.forEach((log) => {
                if (!stageBySeq.has(log.Seqno)) {
                  stageBySeq.set(log.Seqno, log);
                }
              });

              const items: TransactionDetail[] = detailJson.data.items.map((i: APIDocDetailItem) => {
                const stageLog = stageBySeq.get(i.Seqno);
                const isMyTurn = (stageLog?.EmployeeID || '').trim() === (employeeId || '').trim();
                const flowMeta = getFlowMeta(stageLog?.AuditStatus, stageLog?.UnitSide, isMyTurn);
                const flowSideLabel = getUnitSideLabel(stageLog?.UnitSide);

                return {
                  id: i.ItemID,
                  actionKey: `${i.ItemID}::${i.Seqno ?? 0}`,
                  typeLabel: i.TransactionType === 1 ? 'โอนกรอบอัตรากำลัง' : i.TransactionType === 3 ? 'ปรับระดับ' : i.TransactionType === 4 ? 'เพิ่ม/ลดกรอบ' : 'อื่นๆ',
                  typeCategory: i.TransactionType === 4 ? 'add' : i.TransactionType === 3 ? 'adjust' : 'transfer',
                  description: i.TransactionDesc || '',
                  remark: i.ReqRemark || '-',
                  hasFile: i.FileCount > 0,
                  fileUrl: i.FileUrl,
                  rejectionReason: i.RejectionReason,
                  transactionType: i.TransactionType,
                  flowStatus: flowMeta.flowStatus,
                  flowLabel: flowMeta.flowLabel,
                  canTakeAction: flowMeta.canTakeAction,
                  flowSideLabel,
                  totalSteps,
                  _seqno: i.Seqno
                };
              });

              const logs: ApprovalLogItem[] = sortedLogs.map((l: APIDocAuditLog) => ({
                seqno: l.Seqno,
                auditStatus: l.AuditStatus,
                unitSide: l.UnitSide,
                action: l.Seqno === 0 ? 'สร้าง' : l.AuditStatus === 2 ? 'อนุมัติ' : l.AuditStatus === 1 ? 'รออนุมัติ' : l.AuditStatus === -1 ? 'ไม่อนุมัติ' : 'รอดำเนินการ',
                timestamp: l.AuditDate ? dayjs(l.AuditDate).format('DD/MM/BBBB HH:mm') : '',
                user: `${l.EmployeeID} ${l.Fullname}`,
                role: (() => {
                  if (l.Seqno === 0) return l.UserGroupName || 'ผู้สร้างรายการ';
                  const baseName = l.UserGroupName || l.UserGroupNo || '';
                  const suffix = l.UnitSide === 'UnitReceive' ? ' (ฝั่งรับ)' : l.UnitSide === 'UnitTransfer' ? ' (ฝั่งให้)' : '';
                  return baseName + suffix;
                })(),
                status: l.AuditStatus === 2 ? 'completed' : l.AuditStatus === 1 ? 'current' : 'pending'
              }));

              logs.push({
                  action: 'เอกสารสมบูรณ์',
                  timestamp: '',
                  user: '-',
                  role: 'System',
                  status: item.processStage === 3 ? 'success' : 'pending'
              });
              
              const initialActions: Record<string, 'approved' | 'rejected' | 'idle'> = {};
              items.forEach(i => {
                if (i.rejectionReason) {
                  initialActions[i.actionKey] = 'rejected';
                } else if (i.canTakeAction) {
                  initialActions[i.actionKey] = 'approved';
                } else {
                  initialActions[i.actionKey] = 'idle';
                }
              });
              
              setItemActions(initialActions);
              setSelectedInboxItem({
                 ...item,
                 items,
                 logs
              });
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };



  const handleOutstandingClick = (filter: 'transaction_pending' | 'mkd_pending') => {
    setTrackingFilter(filter);
    setIsTrackingModalOpen(true);
  };

  const getFilteredRequests = () => {
    if (trackingFilter === 'mkd_pending') return myRequestsData.filter(i => i.type === 'mkd');
    return myRequestsData.filter(i => i.type === 'transaction');
  };

  // Helper for background color of transaction items (image_3c8a08)
  const getItemBackgroundColor = (category: string) => {
    switch (category) {
      case 'transfer': return 'bg-blue-50 border-blue-100';
      case 'other': return 'bg-purple-50 border-purple-100'; // สีม่วงอ่อน
      case 'add': return 'bg-cyan-50 border-cyan-100';       // สีฟ้าอ่อน
      case 'adjust': return 'bg-pink-50 border-pink-100';     // สีชมพูอ่อน
      default: return 'bg-white';
    }
  };

  // Helper for Type Label Badge
  const getTypeBadgeColor = (category: string) => {
    switch (category) {
      case 'transfer': return 'bg-purple-100 text-purple-700 border-purple-200'; 
      case 'add': return 'bg-cyan-100 text-cyan-700 border-cyan-200';       
      case 'adjust': return 'bg-pink-100 text-pink-700 border-pink-200';     
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper for Stage Badge Coloring
  const getStageBadgeColor = (stageName: string) => {
    const upperStage = (stageName || '').toUpperCase();
    if (upperStage.includes('HRUSER')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (upperStage.includes('HRVERIFY')) return 'bg-green-100 text-green-700 border-green-200';
    if (upperStage.includes('HRPOLICY')) return 'bg-purple-100 text-purple-700 border-purple-200';
    
    // MKD Stages
    if (stageName === 'รอเห็นชอบ') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (stageName === 'รออนุมัติ') return 'bg-blue-100 text-blue-700 border-blue-200';
    
    return 'bg-gray-100 text-gray-800 border-gray-200'; // Default
  };


  const handleProcessActions = async () => {
    if (!selectedInboxItem || !selectedInboxItem.items) return;
    setIsLoading(true);
    
    let employeeId = 'SYSTEM';
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        employeeId = userData.employeeID || 'SYSTEM';
      } catch (e) {}
    }
    
    try {
        for (const item of selectedInboxItem.items) {
            if (!item.canTakeAction) {
              continue;
            }

            const action = itemActions[item.actionKey];
            if (!action || action === 'idle') {
              continue;
            }

            const body = {
                documentNo: selectedInboxItem.id,
                itemId: item.id,
                seqno: item._seqno || 1, // Fallback
                updateBy: employeeId,
                remark: action === 'rejected' ? 'Rejected by Reviewer' : undefined
            };
            
            if (action === 'approved') {
                await fetch('/api/documents/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } else if (action === 'rejected') {
                await fetch('/api/documents/reject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            }
        }
        
        // Close modal and refresh inbox
        setIsActionModalOpen(false);
        fetchDashboardData();
    } catch (err) {
        console.error('Submit API Error', err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleConfirmRejectAll = async () => {
    if (!selectedInboxItem || !rejectAllRemark.trim()) return;
    setIsLoading(true);

    let employeeId = 'SYSTEM';
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        employeeId = JSON.parse(userDataStr).employeeID || 'SYSTEM';
      } catch (e) {}
    }

    try {
      const resp = await fetch('/api/documents/reject-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentNo: selectedInboxItem.id,
          remark: rejectAllRemark,
          updateBy: employeeId
        })
      });

      if (resp.ok) {
        setIsRejectAllModalOpen(false);
        setIsActionModalOpen(false);
        setRejectAllRemark('');
        fetchDashboardData();
      } else {
        console.error('Failed to reject all');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Main currentPath="/home">
      <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] gap-6">
        
        {/* LEFT COLUMN: INBOX */}
        <Card className="bg-white border-0 shadow-sm h-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
              📥 Inbox 
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-center w-24 rounded-tl-lg">ID</th>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-center w-32 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {inboxData.map((item) => (
                    <tr key={item.id} onClick={() => handleInboxClick(item)}
                      className="cursor-pointer group transition-all hover:bg-blue-50 border-l-4 border-transparent hover:border-l-blue-500"
                    >
                      <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                         {item.displayId}
                      </td>
                      <td className="px-4 py-4 text-sm text-left">
                        <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-xs text-gray-500 mt-0.5 italic">
                            {item.subtitle}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">{item.date}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                         <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full border ${
                           item.type === 'mkd' 
                             ? 'bg-purple-50 text-purple-600 border-purple-100' 
                             : 'bg-blue-50 text-blue-600 border-blue-100'
                         }`}>
                          {item.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: OUTSTANDING */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h3 className="text-lg font-semibold text-gray-900">My Requests</h3>
             <span className="text-sm text-gray-500">Monitor Tasks</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {statsData.map((stat) => (
              <Card key={stat.id} onClick={() => handleOutstandingClick(stat.filterKey)}
                className={`border cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200 ${stat.bgColor} ${stat.borderColor}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl`}>
                      {stat.icon === 'briefcase' ? <Briefcase size={20} className="text-purple-600"/> : stat.icon}
                    </div>
                    <span className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</span>
                  </div>
                  <div>
                    <p className={`font-bold ${stat.textColor}`}>{stat.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{stat.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================================= */}
      {/* MODAL 1: ACTION MODAL */}
      {/* ================================================================================= */}
      {isActionModalOpen && selectedInboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border-t-8 border-blue-600">
            
            {/* HEADER with Integrated Stepper */}
           <div className="bg-blue-50 shadow-sm shrink-0 relative z-20 border-b px-6 py-2 flex items-center justify-between gap-8 h-[80px]">
    
    {/* 1. LEFT: Title & Ref ID */}
    <div className="shrink-0 min-w-[200px]">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
            <FileText className="w-5 h-5 text-blue-600" />
            {selectedInboxItem.title}
        </h2>
        <p className="text-sm text-gray-700 mt-1 ml-7">
            Ref ID: {selectedInboxItem.displayId}
        </p>
    </div>

    {/* 2. CENTER: Stepper (ย้ายมาตรงกลาง) */}
    <div className="flex-1 flex justify-center max-w-lg">
        <div className="flex items-center w-full relative">
            {/* Line Background */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded"></div>
            {/* Active Line */}
            <div className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 transition-all duration-500 -translate-y-1/2 rounded" 
                    style={{ width: selectedInboxItem.processStage === 1 ? '0%' : selectedInboxItem.processStage === 2 ? '50%' : '100%' }}></div>
            
            {/* Step 1: สร้าง */}
            <div className="flex-1 flex flex-col items-center z-10 cursor-default">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-xs font-bold bg-white transition-colors
                    ${selectedInboxItem.processStage >= 1 ? 'border-green-500 text-green-600' : 'border-gray-300 text-gray-400'}`}>
                    {selectedInboxItem.processStage > 1 ? <Check size={12}/> : '1'}
                </div>
                <span className={`mt-1 text-[10px] font-medium ${selectedInboxItem.processStage >= 1 ? 'text-green-700' : 'text-gray-400'}`}>สร้าง</span>
            </div>

            {/* Step 2: รออนุมัติ */}
            <div className="flex-1 flex flex-col items-center z-10 cursor-default">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all
                    ${selectedInboxItem.processStage > 2 ? 'bg-white border-green-500 text-green-600' : 
                        selectedInboxItem.processStage === 2 ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-110' : 
                        'bg-white border-gray-300 text-gray-400'}`}>
                    {selectedInboxItem.processStage > 2 ? <Check size={12}/> : '2'}
                </div>
                    <span className={`mt-1 text-[10px] font-medium ${selectedInboxItem.processStage >= 2 ? 'text-blue-700' : 'text-gray-400'}`}>รออนุมัติ</span>
            </div>

            {/* Step 3: อนุมัติแล้ว */}
            <div className="flex-1 flex flex-col items-center z-10 cursor-default">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-xs font-bold bg-white transition-colors
                    ${selectedInboxItem.processStage === 3 ? 'border-green-500 text-green-600' : 'border-gray-300 text-gray-400'}`}>
                    3
                </div>
                    <span className={`mt-1 text-[10px] font-medium ${selectedInboxItem.processStage === 3 ? 'text-green-700' : 'text-gray-400'}`}>เอกสารสมบูรณ์</span>
            </div>
        </div>
    </div>

    {/* 3. RIGHT: Close Button */}
    <div className="shrink-0 min-w-[40px] text-right">
        <button onClick={() => setIsActionModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
        </button>
    </div>
</div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-blue-500 text-white border-b">
                        <tr>
                            <th className="p-3 w-[150px]">ประเภท</th>
                            <th className="p-3">มติ / หมายเหตุ</th>
                            <th className="p-3 text-center w-[60px]">File</th>
                            <th className="p-3 text-center w-[200px]">ผลการตรวจสอบ</th>
                        </tr>
                        </thead>
                       <tbody className="divide-y divide-gray-100">
{selectedInboxItem.items?.map((item) => {
    const actionState = itemActions[item.actionKey] || 'idle';
    const isDisabledByFlow = !item.canTakeAction || !!item.rejectionReason;
    return (
    <tr 
    key={item.actionKey} 
    className={`transition-colors ${
        // Check State ของปุ่ม: ถ้าเป็น Rejected ให้พื้นแดง
        actionState === 'rejected' 
        ? 'bg-red-50' 
        : 'hover:bg-gray-50' 
    }`}
    >
        {/* Type */}
        <td className="p-4 align-top">
            <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${getTypeBadgeColor(item.typeCategory)}`}>
            {item.typeLabel}
            </span>
        </td>
        
        {/* Details Area */}
        <td className="p-4 align-top space-y-2">
            <div className="font-semibold text-gray-900 text-sm leading-relaxed mb-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${getFlowBadgeClass(item.flowStatus)}`}>
                      {item.flowLabel}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                      ขั้น {item._seqno ?? '-'}{item.totalSteps > 0 ? `/${item.totalSteps}` : ''}
                    </span>
                </div>
                <div className="text-[11px] text-gray-500">
                    DocumentNo: {selectedInboxItem.id} | TransactionNo: {item.id}
                </div>
                <div>{item.description}</div>
            </div>
            {item.remark && item.remark !== '-' && (
                <div className="text-xs text-gray-500 p-0 rounded inline-block">
                    <span className="font-bold mr-1 text-gray-500">หมายเหตุ:</span> {item.remark}
                </div>
            )}

            {/* CASE A: ถูก Reject มาก่อนแล้ว (Show Read-Only Note) */}
            {item.rejectionReason && (
                <div className="mt-2 text-xs text-red-700 bg-white border border-red-200 p-2 rounded shadow-sm">
                    <div className="font-bold mb-1 flex items-center gap-1">
                        <XCircle size={12}/> Rejected Reason:
                    </div> 
                    {item.rejectionReason}
                </div>
            )}

            {/* CASE B: เพิ่งกด Reject หน้างาน (Show Textarea) */}
            {actionState === 'rejected' && !item.rejectionReason && item.canTakeAction && (
                <textarea placeholder="ระบุเหตุผล..." rows={2} className="w-full mt-2 px-2 py-1 text-xs bg-white border border-red-300 rounded focus:ring-1 focus:ring-red-500" />
            )}
        </td>

        {/* File */}
        <td className="p-4 text-center align-top">
            {item.hasFile && item.fileUrl ? (
                <a href={`/api/${item.fileUrl}`} target="_blank" rel="noopener noreferrer" className="inline-block p-2 hover:bg-blue-100 rounded-full text-blue-600 transition-colors">
                    <FileIcon size={18} />
                </a>
            ) : item.hasFile ? (
                <button className="p-2 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"><FileIcon size={18} /></button>
            ) : <span className="text-gray-300">-</span>}
        </td>

        {/* Action Buttons */}
        <td className="p-4 text-center align-top">
            <div className={`flex bg-white border rounded-lg overflow-hidden p-1 gap-1 shadow-sm 
                ${isDisabledByFlow ? 'opacity-70' : ''} /* ลดความชัดลงถ้าแก้ไขไม่ได้ */
            `}>
                
                {/* Accept Button */}
                <button 
                    onClick={() => !isDisabledByFlow && setItemActions(prev => ({...prev, [item.actionKey]: 'approved'}))} 
                    disabled={isDisabledByFlow}
                    className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all 
                        ${actionState === 'approved' 
                            ? 'bg-green-100 text-green-700 shadow-inner' 
                            : 'text-gray-400 hover:bg-gray-50'
                        }
                        ${isDisabledByFlow ? 'cursor-not-allowed' : ''}
                    `}
                >
                    <CheckCircle size={14}/> Accept
                </button>

                {/* Reject Button */}
                <button 
                    onClick={() => !isDisabledByFlow && setItemActions(prev => ({...prev, [item.actionKey]: 'rejected'}))} 
                    disabled={isDisabledByFlow}
                    className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all 
                        ${actionState === 'rejected' 
                            ? 'bg-red-100 text-red-700 shadow-inner' 
                            : 'text-gray-400 hover:bg-gray-50'
                        }
                        ${isDisabledByFlow ? 'cursor-not-allowed' : ''}
                    `}
                >
                    <XCircle size={14}/> Reject
                </button>
            </div>
        </td>
    </tr>
    );
})}
</tbody>
                    </table>
                    </div>
                </Card>

                {/* NEW: Approval Log Card (Similar to image_3ce097.png) */}
                {selectedInboxItem.logs && (
                    <Card className="border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-blue-500 px-4 py-3">
                        <h3 className="text-white text-sm font-bold">ลำดับการตรวจสอบ (Approval Log)</h3>
                    </div>
                    <div className="p-0">
                        <div className="divide-y divide-gray-100">
                        {selectedInboxItem.logs.map((log, index) => (
                            <div key={index} className={`flex items-center px-6 py-4 text-sm transition-colors 
                                ${log.status === 'current' ? 'bg-blue-50/60' : 'bg-white'}`}>
                                
                                {/* Action Pill */}
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

                                {/* Time */}
                                <div className="w-40 px-4 flex items-center gap-2 text-xs">
                                    {log.timestamp ? (
                                        <span className="text-gray-600 font-medium flex gap-1"><Clock size={14} className="text-gray-400"/> {log.timestamp}</span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </div>

                                {/* User */}
                                <div className={`flex-1 px-4 font-medium ${log.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>
                                    {log.user}
                                </div>

                                {/* Role */}
                                <div className={`w-56 text-right text-xs ${log.status === 'pending' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {log.role}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    </Card>
                )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t p-4 flex justify-end items-center gap-9 shrink-0 mr-10">
               
                
  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-500" onClick={() => {
     setIsRejectAllModalOpen(true);
  }}><XCircle className="mr-2 h-4 w-4"/> Reject All</Button>

                
  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleProcessActions} disabled={isLoading}><CheckCircle className="mr-2 h-4 w-4"/> {isLoading ? 'Processing...' : 'Submit'}</Button>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1.5: REJECT ALL REMARK MODAL */}
      {isRejectAllModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border-t-4 border-red-600">
            <div className="px-6 py-4 flex justify-between items-center border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2"><XCircle size={20} /> ยืนยันไม่อนุมัติทั้งหมด</h3>
              <button onClick={() => setIsRejectAllModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">ระบุเหตุผลในการไม่อนุมัติ (บังคับ) <span className="text-red-500">*</span></label>
              <textarea 
                value={rejectAllRemark}
                onChange={(e) => setRejectAllRemark(e.target.value)}
                rows={4}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" 
                placeholder="กรุณาระบุเหตุผลในการตีกลับรายการทั้งหมดนี้..."
              />
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRejectAllModalOpen(false)}>ยกเลิก</Button>
              <Button 
                onClick={handleConfirmRejectAll} 
                className="bg-red-600 hover:bg-red-700 text-white" 
                disabled={isLoading || !rejectAllRemark.trim()}
              >
                {isLoading ? 'Processing...' : 'ยืนยัน Reject All'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TRACKING (Keep as is) */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Search className="w-5 h-5 text-gray-500"/> ติดตามสถานะงาน</h3>
                <p className="text-sm text-gray-500"><span className="font-semibold text-blue-600 capitalize">{trackingFilter === 'mkd_pending' ? 'MKD Pending' : 'Transaction Pending'}</span></p>
              </div>
              <button onClick={() => setIsTrackingModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 border-b text-gray-600 sticky top-0 z-10">
                  <tr>
                    <th colSpan={3} className="px-6 py-3">Ref ID / Subject</th>
                    <th className="px-6 py-3 text-center">Stage</th>
                    <th className="px-6 py-3">Current Handler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getFilteredRequests().map((req) => (
                    <tr key={req.id} className="hover:bg-blue-50 transition-colors">
                      <td colSpan={3} className="px-6 py-4 w-1/2">
                        <div className="text-[12px] font-bold text-gray-800">{req.displayId}</div>
                        <div className="text-[13px] text-gray-600  mt-1 pr-3">{req.title}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{req.createDate}</div>
                      </td>
                      <td className="px-6 py-4 text-center w-1/4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border text-center max-w-full truncate ${getStageBadgeColor(req.currentStepLabel)}`}>{req.currentStepLabel}</span>
                      </td>
                      <td className="px-6 py-4 w-1/4">
                        <div className="flex items-center gap-3">
                           
                            <div>
                                <p className="text-[13px] font-bold text-gray-700">{req.currentHandler}</p>
                                {req.pendingDays > 0 ? (
                                    <p className="text-[10px] text-red-500 flex items-center gap-1"><Clock size={10}/> Pending {req.pendingDays} days</p>
                                ) : (
                                    <p className="text-[10px] text-green-600 flex items-center gap-1"><Clock size={10}/> Pending today</p>
                                )}
                            </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
             <div className="px-6 py-3 border-t bg-gray-50 rounded-b-xl text-right"><Button variant="outline" onClick={() => setIsTrackingModalOpen(false)}>Close</Button></div>
          </div>
        </div>
      )}
      </TooltipProvider>
    </Main>
  );
}
