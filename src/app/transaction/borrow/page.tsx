'use client';

import Main from '@/components/layout/main';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Trash2, X, Search, Save, User, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

// --- TYPE DEFINITIONS ---
type ManagementType = 'normal' | 'pool_resources' | 'secondment_pool';
type StrategyType = 'non_strategic' | 'strategic';
type BusinessType = 'business' | 'support';

interface BorrowReturnFormData {
  effectiveMonth: string;
  effectiveYear: string;
  managementType: ManagementType;
  strategyType: StrategyType | null;
  businessType: BusinessType | null;
  isActive: boolean;
  department: string; // หน่วยงานที่รับ (ยืม)
  remark: string;
}

interface BorrowReturnDetailData {
  levelDetail: string;
  transferCount: string;
  male: string;
  female: string;
  remark: string;
  file: File | null;
  fromDepartment: string; // หน่วยงานต้นทาง (ฝ่ายที่ให้ยืม)
}

interface SavedBorrowReturnTransaction {
  id: string;
  transactionData: BorrowReturnFormData;
  detailData: BorrowReturnDetailData;
  createdAt: Date;
}

// เพิ่ม Interface สำหรับ User
interface UserData {
  id: string;
  name: string;
  role: 'HRUSER' | 'HRVERIFY' | 'HRBP' | 'OTHER';
  departmentId: string;
}

export default function BorrowReturnPage() {
  // --- STATE ---
  const [savedTransactions, setSavedTransactions] = useState<SavedBorrowReturnTransaction[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Store selected approver IDs per request group
  const [selectedApprovers, setSelectedApprovers] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState<BorrowReturnFormData>({
    effectiveMonth: 'พฤศจิกายน',
    effectiveYear: '2568',
    managementType: 'normal',
    strategyType: null,
    businessType: null,
    isActive: false,
    department: '',
    remark: '',
  });

  const [detailFormData, setDetailFormData] = useState<BorrowReturnDetailData>({
    levelDetail: '',
    transferCount: '1',
    male: '',
    female: '',
    remark: '',
    file: null,
    fromDepartment: '',
  });

  // --- MOCK DATA ---
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const years = ['2567', '2568', '2569', '2570'];

  const departments = [
    { id: 'dep1', name: 'ฝ่ายทรัพยากรบุคคล (Dep 1)' },
    { id: 'dep2', name: 'ฝ่ายบัญชี (Dep 2)' },
    { id: 'dep3', name: 'ฝ่ายไอที (Dep 3)' },
    { id: 'dep4', name: 'ฝ่ายปฏิบัติการ (Dep 4)' },
  ];

  const levels = [
    { id: 'level1', name: 'ระดับ 9-10' },
    { id: 'level2', name: 'ระดับ 4-8' },
    { id: 'level3', name: 'ระดับ 11-13' },
    { id: 'level4', name: 'ระดับ 14-15' },
  ];

  // --- MOCK USERS ---
  const allUsers: UserData[] = [
    // Dep 1 Users
    { id: 'u1_d1', name: 'นาง A (Dep1)', role: 'HRVERIFY', departmentId: 'dep1' },
    { id: 'u2_d1', name: 'นาย B (Dep1)', role: 'HRVERIFY', departmentId: 'dep1' },
    { id: 'u3_d1', name: 'นาย C (Dep1)', role: 'HRUSER', departmentId: 'dep1' },
    
    // Dep 2 Users
    { id: 'u1_d2', name: 'นาง D (Dep2)', role: 'HRVERIFY', departmentId: 'dep2' },
    { id: 'u2_d2', name: 'นาย E (Dep2)', role: 'HRUSER', departmentId: 'dep2' },
    { id: 'u3_d2', name: 'นาง F (Dep2)', role: 'HRVERIFY', departmentId: 'dep2' },

    // Dep 3 Users
    { id: 'u1_d3', name: 'นาย G (Dep3)', role: 'HRVERIFY', departmentId: 'dep3' },
    { id: 'u2_d3', name: 'นาง H (Dep3)', role: 'HRUSER', departmentId: 'dep3' },

    // Dep 4 Users
    { id: 'u1_d4', name: 'นาย I (Dep4)', role: 'HRVERIFY', departmentId: 'dep4' },
    { id: 'u2_d4', name: 'นาง J (Dep4)', role: 'HRUSER', departmentId: 'dep4' },
  ];

  // --- HELPER FUNCTIONS ---
  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || id;
  const getLevelName = (id: string) => levels.find((l) => l.id === id)?.name || id;

  const getUsersByCondition = (deptId: string, role: string) => {
    return allUsers.filter(u => u.departmentId === deptId && u.role === role);
  };

  const getEligibleApproverGroups = (receiverDeptId: string, fromDeptId: string) => {
    const groups: { title: string; users: UserData[]; icon: LucideIcon; color: string }[] = [];

    // ตรวจสอบว่าเป็นหน่วยงานเดียวกันหรือไม่
    const isSameDepartment = receiverDeptId === fromDeptId;

    if (isSameDepartment) {
      // กรณีที่ 2: ยืมภายในหน่วยงานเดียวกัน - มีแค่ HRVERIFY ฝั่งให้
      const senderVerifiers = getUsersByCondition(fromDeptId, 'HRVERIFY');
      if (senderVerifiers.length > 0) {
        groups.push({
          title: `HR VERIFY (ฝั่งให้: ${getDepartmentName(fromDeptId)})`,
          users: senderVerifiers,
          icon: ShieldCheck,
          color: 'text-green-600 bg-green-50 border-green-200'
        });
      }
    } else {
      // กรณีที่ 1: ยืมข้ามหน่วยงาน (คล้ายโอนอื่นๆ)
      
      // 1. HRUSER ฝั่งให้ (Sender)
      const senderUsers = getUsersByCondition(fromDeptId, 'HRUSER');
      if (senderUsers.length > 0) {
        groups.push({
          title: `HR USER (ฝั่งให้: ${getDepartmentName(fromDeptId)})`,
          users: senderUsers,
          icon: User,
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        });
      }

      // 2. HRVERIFY ฝั่งรับ (Receiver)
      const receiverVerifiers = getUsersByCondition(receiverDeptId, 'HRVERIFY');
      if (receiverVerifiers.length > 0) {
        groups.push({
          title: `HR VERIFY (ฝั่งรับ: ${getDepartmentName(receiverDeptId)})`,
          users: receiverVerifiers,
          icon: ShieldCheck,
          color: 'text-green-600 bg-green-50 border-green-200'
        });
      }

      // 3. HRVERIFY ฝั่งให้ (Sender)
      const senderVerifiers = getUsersByCondition(fromDeptId, 'HRVERIFY');
      if (senderVerifiers.length > 0) {
        groups.push({
          title: `HR VERIFY (ฝ่ายให้: ${getDepartmentName(fromDeptId)})`,
          users: senderVerifiers,
          icon: ShieldCheck,
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
        });
      }
    }

    return groups;
  };

  // --- HANDLERS ---
  const resetDetailForm = () => {
    setDetailFormData({
      levelDetail: '',
      transferCount: '1',
      male: '',
      female: '',
      remark: '',
      file: null,
      fromDepartment: '',
    });
  };

  const shouldShowExtraFields = () => formData.managementType === 'secondment_pool';

  const isFormValid = () => {
    if (!formData.effectiveMonth || !formData.effectiveYear) return false;
    if (!formData.managementType) return false;
    if (formData.managementType === 'secondment_pool' && (!formData.strategyType || !formData.businessType)) return false;
    if (!formData.department) return false;
    if (!detailFormData.levelDetail) return false;
    if (!detailFormData.transferCount) return false;
    if (!detailFormData.fromDepartment) return false;
    
    return true;
  };

  const handleSave = () => {
    const newTransaction: SavedBorrowReturnTransaction = {
      id: Date.now().toString(),
      transactionData: { ...formData },
      detailData: { ...detailFormData },
      createdAt: new Date(),
    };
    setSavedTransactions([...savedTransactions, newTransaction]);
    alert('บันทึก Transaction สำเร็จ');
    resetDetailForm();
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('ต้องการลบรายการนี้หรือไม่?')) {
      setSavedTransactions(savedTransactions.filter((t) => t.id !== id));
    }
  };

  const handleRequest = () => {
    if (savedTransactions.length === 0) {
      alert('กรุณาเพิ่ม Transaction อย่างน้อย 1 รายการ');
      return;
    }
    setIsRequestModalOpen(true);
  };

  const confirmRequest = () => {
    console.log('Sending Request...');
    console.log('Transactions:', savedTransactions);
    console.log('Selected Approvers:', selectedApprovers);

    const activeDepts = Object.keys(getTransactionsByDept());
    const missingDepts = activeDepts.filter(dept => !selectedApprovers[dept] || selectedApprovers[dept].length === 0);

    if (missingDepts.length > 0) {
      alert(`กรุณาเลือกผู้ตรวจสอบสำหรับหน่วยงาน: ${missingDepts.map(d => getDepartmentName(d)).join(', ')}`);
      return;
    }

    alert('ส่งขอการอนุมัติเรียบร้อย!');
    setIsRequestModalOpen(false);
    setSavedTransactions([]);
    setSelectedApprovers({});
  };

  const getTransactionsByDept = () => {
    const grouped: Record<string, SavedBorrowReturnTransaction[]> = {};
    savedTransactions.forEach((t) => {
      const deptId = t.transactionData.department;
      if (!grouped[deptId]) grouped[deptId] = [];
      grouped[deptId].push(t);
    });
    return grouped;
  };

  const toggleApprover = (deptId: string, approverId: string) => {
    setSelectedApprovers((prev) => {
      const currentList = prev[deptId] || [];
      if (currentList.includes(approverId)) {
        return { ...prev, [deptId]: currentList.filter((id) => id !== approverId) };
      } else {
        return { ...prev, [deptId]: [...currentList, approverId] };
      }
    });
  };

  return (
    <Main currentPath="/transaction/borrowreturn/borrow">
      <div className="space-y-4">
        {/* Header */}
        <Card className="bg-linear-to-r from-blue-200 to-blue-700 border-0 shadow-lg py-0">
          <CardContent className="p-4">
            <h1 className="text-xl font-bold text-gray-700">การยืมกรอบอัตรากำลัง</h1>
          </CardContent>
        </Card>

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
                    <div className="flex gap-3 items-center">
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

                {/* Management Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">จัดการกรอบอัตรากำลัง <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-4">
                    {(['normal', 'pool_resources', 'secondment_pool'] as ManagementType[]).map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="managementType" value={type} checked={formData.managementType === type}
                          onChange={(e) => setFormData({...formData, managementType: e.target.value as ManagementType, strategyType: null, businessType: null})}
                          className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">
                          {type === 'normal' ? 'ปกติ' : type === 'pool_resources' ? 'Pool Resources' : 'Secondment Pool'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {shouldShowExtraFields() && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Non-Strategic/Strategic <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-4">
                        {(['non_strategic', 'strategic'] as StrategyType[]).map(type => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="strategyType" value={type} checked={formData.strategyType === type}
                              onChange={(e) => setFormData({...formData, strategyType: e.target.value as StrategyType})} className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-700">{type === 'non_strategic' ? 'Non-Strategic' : 'Strategic'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business/Support <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-4">
                        {(['business', 'support'] as BusinessType[]).map(type => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="businessType" value={type} checked={formData.businessType === type}
                              onChange={(e) => setFormData({...formData, businessType: e.target.value as BusinessType})} className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-700">{type === 'business' ? 'Business' : 'Support'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* อัตรากำลังเฉพาะตัว (Inactive Toggle) */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">อัตรากำลังเฉพาะตัว</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-700">Inactive</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">หน่วยงานที่ยืม (ฝั่งรับ) <span className="text-red-500">*</span></label>
                  <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">เลือกหน่วยงาน...</option>
                    {departments.map((dep) => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Detail Form */}
          <div className="lg:col-span-4">
            <Card className="bg-white border-0 shadow-sm h-full py-0">
              <CardContent className="p-6 space-y-4">
                {/* หน่วยงานต้นทาง (ฝ่ายที่ให้ยืม) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    หน่วยงานที่ให้ยืม (ฝั่งให้) <span className="text-red-500">*</span>
                  </label>
                  <select value={detailFormData.fromDepartment} onChange={(e) => setDetailFormData({ ...detailFormData, fromDepartment: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">เลือกหน่วยงาน...</option>
                    {departments.map((dep) => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
                  </select>
                </div>

                {/* ระดับตำแหน่ง */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ระดับตำแหน่ง <span className="text-red-500">*</span></label>
                  <select value={detailFormData.levelDetail} onChange={(e) => setDetailFormData({ ...detailFormData, levelDetail: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">เลือกระดับตำแหน่ง...</option>
                    {levels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                  </select>
                </div>

                {/* จำนวนกรอบ */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">จำนวนกรอบ <span className="text-red-500">*</span></label>
                  <input type="number" value={detailFormData.transferCount} onChange={(e) => setDetailFormData({ ...detailFormData, transferCount: e.target.value })}
                    className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" min="1" />
                </div>

                {/* เลขที่มติ & วันที่มติ */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">เลขที่มติ <span className="text-red-500">*</span></label>
                    <input type="text" value={detailFormData.male} onChange={(e) => setDetailFormData({ ...detailFormData, male: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">วันที่มติ <span className="text-red-500">*</span></label>
                    <input type="date" value={detailFormData.female} onChange={(e) => setDetailFormData({ ...detailFormData, female: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

  {/* หมายเหตุ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ</label>
                  <textarea value={detailFormData.remark} onChange={(e) => setDetailFormData({ ...detailFormData, remark: e.target.value })} rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none" placeholder="ระบุหมายเหตุ (ถ้ามี)" />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">File <span className="text-red-500">*</span></label>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <input type="file" accept=".pdf" onChange={(e) => setDetailFormData({ ...detailFormData, file: e.target.files?.[0] || null })}
                        className="w-full text-sm border border-gray-300 rounded-lg bg-gray-50 p-2 cursor-pointer focus:outline-none" />
                      <p className="text-xs text-gray-500 mt-1">Max 15MB, PDF only</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <button type="button" className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:shadow-md transition-all group">
                        <Search className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                      </button>
                      <span className="text-sm font-bold text-gray-700">0</span>
                    </div>
                  </div>
                </div>

              

                <div className="pt-4">
                  <Button onClick={handleSave} disabled={!isFormValid()} className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="h-5 w-5" /><span>SAVE</span>
                  </Button>
                </div>
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
                    <Button onClick={handleRequest} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold text-sm hover:from-blue-600 hover:to-blue-700">REQUEST</Button>
                  )}
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {savedTransactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400"><p>ยังไม่มีรายการ Transaction</p></div>
                  ) : (
                    savedTransactions.map((t, idx) => (
                      <div key={t.id} className="border-2 rounded-lg p-4 bg-blue-100 text-blue-700 border-blue-300">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">#{idx + 1}</span>
                              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-blue-200">
                                ยืม
                              </span>
                            </div>
                            <div className="text-xs mt-1">
                              <span className="font-semibold">{t.detailData.male} :</span>
                              <span>
                                ยืมกรอบอัตรากำลัง จำนวน {t.detailData.transferCount} อัตรา 
                                ของ {getLevelName(t.detailData.levelDetail)} 
                                จาก {getDepartmentName(t.detailData.fromDepartment)} มาที่ {getDepartmentName(t.transactionData.department)}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-2 border-b bg-gradient-to-r from-blue-200 to-blue-700 flex justify-between items-center bg-blue-50">
                <h2 className="text-lg font-bold text-blue-900">ยืนยันการส่งขออนุมัติ</h2>
                <button onClick={() => setIsRequestModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50">
                {Object.entries(getTransactionsByDept()).map(([deptId, transactions]) => {
                  const transactionCount = transactions.length;
                  const sampleTx = transactions[0];
                  const approverGroups = getEligibleApproverGroups(deptId, sampleTx.detailData.fromDepartment);

                  return (
                    <div key={deptId} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-semibold text-sm text-gray-700 flex items-center gap-2">🏢 {getDepartmentName(deptId)}</span>
                        <span className="text-xs bg-white px-2 py-1 rounded border text-gray-600">{transactionCount} รายการ</span>
                      </div>

                      <div className="p-3 grid grid-cols-1 md:grid-cols-[60%_40%] gap-4">
                        {/* LEFT: Transaction List */}
                        <div className="space-y-2 border-r border-gray-100 pr-3">
                          {transactions.map((t, idx) => (
                            <div key={t.id} className="rounded-md border-2 p-3 bg-blue-50 border-blue-200">
                              <div className="flex items-center gap-2 text-xs mb-1">
                                <span className="font-bold bg-white/80 px-1.5 rounded">#{idx + 1}</span>
                                <span className="font-bold uppercase text-blue-700">
                                  ยืม
                                </span>
                              </div>
                              <span className="text-xs leading-relaxed opacity-90">
                                ยืมกรอบอัตรากำลัง จำนวน <span className="font-bold">{t.detailData.transferCount}</span> อัตรา 
                                ของ {getLevelName(t.detailData.levelDetail)} 
                                จาก {getDepartmentName(t.detailData.fromDepartment)} มาที่ {getDepartmentName(t.transactionData.department)}
                              </span>
                            </div>
                          ))}
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
                                  {group.users.map((user) => {
                                    const isSelected = (selectedApprovers[deptId] || []).includes(user.id);
                                    return (
                                      <label key={user.id} className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all hover:shadow-sm
                                        ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                                          ${isSelected ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                          {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleApprover(deptId, user.id)} />
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
                  );
                })}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsRequestModalOpen(false)} className="px-6">CANCEL</Button>
                <Button onClick={confirmRequest} className="bg-green-600 hover:bg-green-700 text-white px-8 gap-2"><CheckCircle className="h-5 w-5" /> CONFIRM</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Main>
  );
}
