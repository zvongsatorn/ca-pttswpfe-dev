'use client';

import Main from '@/components/layout/main';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  FileText,
  Clock,
  ChevronDown,
  XCircle,
  Hash,
  Check,
  X,
  ArrowRight,
  File as FileIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
dayjs.extend(buddhistEra);
dayjs.locale('th');

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
  category: string;      
  resolution: string;    
  statusLabel: string;   
  processStage: 1 | 2 | 3;
  createdDate: string;
  typeCategory: string; 
  items: TransactionDetail[];
  logs: ApprovalLogItem[];
}

export default function TransactionProgressPage() {
  // -- State for Header & Filter --
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = (new Date().getFullYear() + 543).toString();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Filter States
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');

  // Column Filter States
  const [filterInbox, setFilterInbox] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterRes, setFilterRes] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // -- Data State --
  const [transactions, setTransactions] = useState<TransactionProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // -- State for View Modal (read-only) --
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionProgressItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // -- State for Reject Modal --
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<TransactionProgressItem | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // ============================================================================
  // 2. DATA FETCHING
  // ============================================================================

  const getEmployeeId = () => {
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        return userData.employeeID || 'SYSTEM';
      } catch { /* ignore */ }
    }
    return 'SYSTEM';
  };

  const fetchProgress = async () => {
    setIsLoading(true);
    try {
      const employeeId = getEmployeeId();
      const res = await fetch(`/api/documents/progress?employeeId=${employeeId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const mapped: TransactionProgressItem[] = json.data.map((doc: {
            documentNo: string;
            createDate: string;
            statusLabel: string;
            processStage: number;
            category: string;
            typeCategory: string;
            resolution: string;
            items: { ItemID: string; TransactionType: number; TransactionDesc: string; ReqRemark: string; RejectionReason: string; FileCount: number; FileUrl: string }[];
            logs: { Seqno: number; AuditStatus: number; AuditDate?: string; EmployeeID: string; Fullname: string; UserGroupName?: string; UserGroupNo?: string; UnitSide?: string }[];
          }) => ({
            id: doc.documentNo,
            inboxNumber: `[${doc.documentNo}]`,
            category: doc.category,
            resolution: doc.resolution,
            statusLabel: doc.statusLabel,
            processStage: doc.processStage as 1 | 2 | 3,
            createdDate: dayjs(doc.createDate).format('DD/MM/BBBB'),
            typeCategory: doc.typeCategory,
            items: doc.items.map((i) => ({
              id: i.ItemID,
              typeLabel: i.TransactionType === 1 ? 'โอนกรอบอัตรากำลัง' : i.TransactionType === 3 ? 'ปรับระดับ' : i.TransactionType === 4 ? 'เพิ่ม/ลดกรอบ' : i.TransactionType === 6 ? 'ยืม' : 'อื่นๆ',
              typeCategory: (i.TransactionType === 4 ? 'add' : i.TransactionType === 3 ? 'adjust' : 'transfer') as 'transfer' | 'other' | 'add' | 'adjust',
              description: i.TransactionDesc || '',
              remark: i.ReqRemark || '-',
              hasFile: i.FileCount > 0,
              fileUrl: i.FileUrl,
              rejectionReason: i.RejectionReason,
            })),
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
          setTransactions(mapped);
        }
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

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
          const items: TransactionDetail[] = detailJson.data.items.map((i: { ItemID: string; TransactionType: number; TransactionDesc: string; ReqRemark: string; FileCount: number; FileUrl: string; RejectionReason: string }) => ({
            id: i.ItemID,
            typeLabel: i.TransactionType === 1 ? 'โอนกรอบอัตรากำลัง' : i.TransactionType === 3 ? 'ปรับระดับ' : i.TransactionType === 4 ? 'เพิ่ม/ลดกรอบ' : 'อื่นๆ',
            typeCategory: i.TransactionType === 4 ? 'add' : i.TransactionType === 3 ? 'adjust' : 'transfer',
            description: i.TransactionDesc || '',
            remark: i.ReqRemark || '-',
            hasFile: i.FileCount > 0,
            fileUrl: i.FileUrl,
            rejectionReason: i.RejectionReason,
          }));

          const logs: ApprovalLogItem[] = detailJson.data.logs.map((l: { Seqno: number; AuditStatus: number; AuditDate?: string; EmployeeID: string; Fullname: string; UserGroupName?: string; UserGroupNo?: string; UnitSide?: string }) => ({
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
    setRejectTarget(item);
    setRejectRemark('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget || !rejectRemark.trim()) return;
    setRejectLoading(true);

    try {
      const employeeId = getEmployeeId();
      const resp = await fetch('/api/documents/reject-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentNo: rejectTarget.id,
          remark: rejectRemark,
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

  // Client-side filtering
  const filteredTransactions = transactions.filter(item => {
    if (filterInbox && !item.inboxNumber.toLowerCase().includes(filterInbox.toLowerCase())) return false;
    if (filterCat && item.category !== filterCat) return false;
    if (filterRes && !item.resolution.toLowerCase().includes(filterRes.toLowerCase())) return false;
    if (filterStatus && item.statusLabel !== filterStatus) return false;
    if (selectedBusinessUnit && !item.resolution.toLowerCase().includes(selectedBusinessUnit.toLowerCase())) return false;
    if (selectedDivision && !item.resolution.toLowerCase().includes(selectedDivision.toLowerCase())) return false;
    if (selectedAgency && !item.resolution.toLowerCase().includes(selectedAgency.toLowerCase())) return false;
    return true;
  });

  return (
    <Main currentPath="/transaction/progress">
      <div className="space-y-4">
        
        {/* 1. HEADER GRADIENT */}
        <Card className="border-0 shadow-md rounded-lg overflow-hidden py-0">
          <div className="bg-gradient-to-r from-blue-200 to-blue-500 px-6 py-3 flex items-center justify-between shadow-lg rounded-t-lg border-b border-blue-500/30">
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
                    <option value="">ทั้งหมด</option>
                    <option value="2568">2568</option>
                    <option value="2569">2569</option>
                  </select>
                </div>
                <Button onClick={fetchProgress} className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-8 text-sm">
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
                <div className="relative">
                    <input type="text" value={selectedBusinessUnit} onChange={(e) => setSelectedBusinessUnit(e.target.value)} placeholder="เลือกหน่วยธุรกิจ..." className="w-48 pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-shadow" />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* สายงาน */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">สายงาน :</label>
                <div className="relative">
                    <input type="text" value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)} placeholder="เลือกสายงาน..." className="w-56 pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-shadow" />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* หน่วยงาน */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">หน่วยงาน :</label>
                <div className="relative">
                    <input type="text" value={selectedAgency} onChange={(e) => setSelectedAgency(e.target.value)} placeholder="เลือกหน่วยงาน..." className="w-56 pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition-shadow" />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            <div className="flex-1"></div>
        </div>

        {/* 3. TABLE CARD */}
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {/* 3.1 Main Headers */}
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-[200px]">
                        <div className="flex items-center gap-1"><Hash className="w-3 h-3 text-gray-400" />Inbox No.</div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-[200px]">ประเภท</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold w-[50%]">มติ / เรื่อง</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-[200px]">สถานะ</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Action</th>
                  </tr>
                  
                  {/* 3.2 Column Filters */}
                  <tr className="bg-white border-b border-gray-100">
                    <th className="px-4 py-2">
                        <input type="text" value={filterInbox} onChange={(e) => setFilterInbox(e.target.value)} placeholder="ค้นหา..." className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-400 focus:outline-none" />
                    </th>
                    <th className="px-4 py-2">
                        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-400 focus:outline-none bg-white">
                          <option value="">ทั้งหมด</option>
                          <option value="ภายใต้ ผช.">ภายใต้ ผช.</option>
                          <option value="โอนกรอบอื่นๆ">โอนกรอบอื่นๆ</option>
                          <option value="ปรับสัดส่วน">ปรับสัดส่วน</option>
                          <option value="เพิ่ม/ลด">เพิ่ม/ลด</option>
                          <option value="ยืม">ยืม</option>
                        </select>
                    </th>
                    <th className="px-4 py-2">
                        <input type="text" value={filterRes} onChange={(e) => setFilterRes(e.target.value)} placeholder="ค้นหา..." className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-400 focus:outline-none" />
                    </th>
                    <th className="px-4 py-2">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-400 focus:outline-none bg-white">
                          <option value="">ทั้งหมด</option>
                          <option value="Waiting HRVerify">Waiting HRVerify</option>
                          <option value="Waiting HRUser">Waiting HRUser</option>
                          <option value="Complete">Complete</option>
                        </select>
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">กำลังโหลดข้อมูล...</td></tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">ไม่มีรายการ</td></tr>
                  ) : filteredTransactions.map((item, index) => (
                    <tr key={item.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      {/* Inbox No. (Clickable) */}
                      <td className="px-4 py-4 text-sm font-medium align-top">
                         <button onClick={() => handleOpenView(item)} className="text-blue-600 hover:text-blue-800 hover:underline font-mono whitespace-nowrap flex items-center gap-1">
                            <Hash className="w-3 h-3" />{item.inboxNumber}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-medium align-top">
                           <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${getTypeBadgeColor(item.typeCategory)}`}>{item.category}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 align-top leading-relaxed">
                        {item.resolution}
                        <div className="text-[10px] text-gray-400 mt-1">Created: {item.createdDate}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-center">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${item.processStage === 3 ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                            {item.statusLabel}
                          </span>
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all shadow-sm"
                          onClick={() => handleOpenReject(item)}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================================= */}
      {/* VIEW MODAL (POPUP) - Read-Only — styled like Home page modal */}
      {/* ================================================================================= */}
      {isViewModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
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
                    {/* Items Table — View Only (no Accept/Reject buttons) */}
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
                                    {selectedTransaction.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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
                                                        <span><b>Reject Reason:</b> {item.rejectionReason}</span>
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
                                    ))}
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
      {/* REJECT MODAL — styled like Home page Reject All modal */}
      {/* ================================================================================= */}
      {isRejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border-t-4 border-red-600">
            <div className="px-6 py-4 flex justify-between items-center border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2"><XCircle size={20} /> ยืนยันไม่อนุมัติ (Reject)</h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6">
              <div className="mb-3 text-sm text-gray-600">
                Ref: <span className="font-bold text-gray-800">{rejectTarget.inboxNumber}</span>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ระบุเหตุผลในการไม่อนุมัติ <span className="text-red-500">*</span></label>
              <textarea 
                value={rejectRemark}
                onChange={(e) => setRejectRemark(e.target.value)}
                rows={4}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" 
                placeholder="กรุณาระบุเหตุผลในการตีกลับรายการนี้..."
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