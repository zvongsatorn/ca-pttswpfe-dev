'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

import { 
    ArrowLeft, Send, Ban, FileSpreadsheet, FileText, Container, 
    Info, Upload, Trash2, Plus, Edit, Check, X, Save
} from 'lucide-react';
import { 
    updateMKDNote, requestApproveMKD, updateManDriverStatus, 
    getMKDDetails, saveMainKey, saveDetailKey, uploadMKDFile, 
    deleteMainKey, deleteMKDFile
} from '@/services/mkdService';

interface CurrentUser {
    employeeID?: string;
    [key: string]: unknown;
}

interface MasterKey {
    MasterId: number | string;
    KeyManID?: number | string;
    KeyManName: string;
}

interface MKDHeader {
    RequestNo?: string;
    RequestDate?: string;
    OrgUnitNo?: string;
    OrgUnitName?: string;
    UnitName?: string;
    EffectiveYear?: number;
    ManDriverStatus?: number;
    StatusName?: string;
    Remark?: string;
    Note?: string;
    [key: string]: unknown;
}

interface MKDKey {
    ManDriverKeyID: number | string;
    ParentID?: number | string;
    KeyManID?: number | string;
    KeyManName?: string;
    Name?: string;
    Unit?: string;
    KeyType?: number;
    Weight?: number;
    Definition?: string;
    Coefficient?: number;
    Remark?: string;
    [key: string]: unknown;
}

interface MKDYear {
    ManDriverKeyYearID?: number | string;
    ManDriverKeyID: number | string;
    KeyYear: number | string;
    KeyAmount: number;
    [key: string]: unknown;
}

interface MKDFile {
    FileName?: string;
    fileName?: string;
    FileUpload: string;
    [key: string]: unknown;
}

interface MKDDetailClientProps {
    mkdId: string;
    token: string;
    currentUser: CurrentUser;
    initialData: {
        header: MKDHeader;
        keys: MKDKey[];
        years: MKDYear[];
        files: MKDFile[];
    };
    masterKeys: MasterKey[];
}

interface MappedSubItem {
    id: string;
    definition: string;
    coefficient: number;
    remark: string;
    years: Record<number, number>;
    yearIds: Record<number, string>;
}

interface MappedMKDDriver {
    id: string;
    keyManId: string;
    name: string;
    unit: string;
    type: 'Index' | 'Uniform';
    typeValue: string;
    weight: number;
    definition: string;
    coefficient: number;
    remark: string;
    mainYears: Record<number, number>;
    mainYearIds: Record<number, string>;
    subItems: MappedSubItem[];
}

export default function MKDDetailClient({ mkdId, token, currentUser, initialData, masterKeys }: MKDDetailClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'MANPOWER' | 'SUMMARY' | 'FILES' | 'NOTE'>('MANPOWER');
    const [note, setNote] = useState<string>((initialData.header?.Remark as string) || (initialData.header?.Note as string) || '');

    // Reactive Data State
    const [header, setHeader] = useState<MKDHeader>(initialData.header || {});
    const [localKeys, setLocalKeys] = useState<MKDKey[]>(initialData.keys || []);
    const [localYears, setLocalYears] = useState<MKDYear[]>(initialData.years || []);
    const [localFiles, setLocalFiles] = useState<MKDFile[]>(initialData.files || []);

    const effectiveYear = header.EffectiveYear || 0;
    const isReadOnly = header.ManDriverStatus !== 1;

    const allYears = useMemo(() => {
        const years = Array.from(new Set(localYears.map((y: MKDYear) => Number(y.KeyYear))));
        return years.sort((a, b) => a - b);
    }, [localYears]);

    // Modal States
    const [isMainModalOpen, setIsMainModalOpen] = useState(false);
    const [isAddingMainRow, setIsAddingMainRow] = useState(false);
    const [editingMainRowId, setEditingMainRowId] = useState<string | null>(null);
    const [mainKeyForm, setMainKeyForm] = useState({
        manDriverKeyId: '',
        keyManId: '',
        unit: '',
        keyType: '1',
        weight: '0'
    });

    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [subKeyForm, setSubKeyForm] = useState({
        manDriverKeyId: '',
        parentId: '',
        definition: '',
        coefficient: '1',
        remark: '',
        yearlyData: {} as Record<number, string | number>,
        yearlyIds: {} as Record<number, string>
    });

    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [fileForm, setFileForm] = useState<{file: File | null, customName: string}>({ file: null, customName: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshData = async () => {
        try {
            const res = await getMKDDetails(mkdId, token);
            if (res?.data) {
                setHeader((res.data.header as MKDHeader) || {});
                setLocalKeys((res.data.keys as MKDKey[]) || []);
                setLocalYears((res.data.years as MKDYear[]) || []);
                setLocalFiles((res.data.files as MKDFile[]) || []);
            }
        } catch (error) {
            console.error("Failed to refresh data", error);
        }
    };

    const mkdData: MappedMKDDriver[] = useMemo(() => {
        const keys = localKeys;
        const years = localYears;
        const mainKeys = keys.filter((k: MKDKey) => !k.ParentID || Number(k.ParentID) === 0);
        
        return mainKeys.map((mk: MKDKey) => {
            const isUniform = mk.KeyType === 2;
            const currentIdStr = mk.ManDriverKeyID?.toString();
            
            const subKeys = keys.filter((sk: MKDKey) => 
                sk.ParentID?.toString() === currentIdStr && currentIdStr !== undefined
            );
            
            const subItems: MappedSubItem[] = subKeys.map((sk: MKDKey) => {
                const skIdStr = sk.ManDriverKeyID?.toString();
                const itemYears: Record<number, number> = {};
                const itemYearIds: Record<number, string> = {};
                years.filter((y: MKDYear) => y.ManDriverKeyID?.toString() === skIdStr).forEach((y: MKDYear) => {
                    itemYears[Number(y.KeyYear)] = Number(y.KeyAmount);
                    itemYearIds[Number(y.KeyYear)] = (y.ManDriverKeyYearID || 0).toString();
                });
                return {
                    id: sk.ManDriverKeyID.toString(),
                    definition: sk.Definition || '',
                    coefficient: sk.Coefficient || 1,
                    remark: sk.Remark || '',
                    years: itemYears,
                    yearIds: itemYearIds
                };
            });

            const mainYears: Record<number, number> = {};
            const mainYearIds: Record<number, string> = {};
            years.filter((y: MKDYear) => y.ManDriverKeyID?.toString() === currentIdStr).forEach((y: MKDYear) => {
                mainYears[Number(y.KeyYear)] = Number(y.KeyAmount);
                mainYearIds[Number(y.KeyYear)] = (y.ManDriverKeyYearID || 0).toString();
            });

            return {
                id: mk.ManDriverKeyID.toString(),
                keyManId: mk.KeyManID?.toString() || '',
                name: mk.KeyManName || mk.Name || mk.Unit || '',
                unit: mk.Unit || '',
                type: isUniform ? 'Uniform' : 'Index',
                typeValue: mk.KeyType?.toString() || '1',
                weight: Number(mk.Weight) || 0,
                definition: mk.Definition || '',
                coefficient: mk.Coefficient || 1,
                remark: mk.Remark || '',
                mainYears,
                mainYearIds,
                subItems
            };
        });
    }, [localKeys, localYears]);

    const formatYearBE = (year: number) => {
        return year < 2400 ? (year + 543).toString() : year.toString();
    };

    const getYearColor = (year: number) => {
        if (year > effectiveYear) return "text-purple-700";
        if (year === effectiveYear) return "text-blue-600";
        return "text-black";
    };
    
    const getYearLabel = (year: number) => {
        let label = formatYearBE(year);
        if (year > effectiveYear) label += " F";
        if (year === effectiveYear) label += " E";
        return label;
    };

    const getStatusColor = (statusName?: string) => {
        if (!statusName) return "text-blue-800";
        const lower = statusName.toLowerCase();
        if (lower.includes("อนุมัติแล้ว") || lower.includes("approved")) return "text-green-600";
        if (lower.includes("รออนุมัติ") || lower.includes("pending")) return "text-orange-500";
        if (lower.includes("ยกเลิก") || lower.includes("reject") || lower.includes("ไม่อนุมัติ") || lower.includes("cancel")) return "text-red-600";
        if (lower.includes("ร่าง") || lower.includes("draft")) return "text-slate-500";
        return "text-blue-800"; // Default
    };

    // Main Key Actions
    const openAddMainKey = () => {
        setIsAddingMainRow(false);
        setEditingMainRowId(null);
        setIsMainModalOpen(true);
    };

    const handleSaveMainKey = async () => {
        if (!mainKeyForm.keyManId || !mainKeyForm.unit || !mainKeyForm.weight) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }
        try {
            setLoading(true);
            const newWeight = Number(mainKeyForm.weight) || 0;
            const otherWeightsSum = mkdData
                .filter(d => d.id !== mainKeyForm.manDriverKeyId)
                .reduce((sum, d) => sum + (Number(d.weight) || 0), 0);
            
            if (otherWeightsSum + newWeight > 100) {
                toast.error(`ไม่สามารถบันทึกได้: ยอดรวม Weight เกิน 100% (ปัจจุบันรวมใหม่จะเป็น: ${otherWeightsSum + newWeight}%)`);
                setLoading(false);
                return;
            }

            const payload = {
                manDriverKeyId: mainKeyForm.manDriverKeyId,
                keyManId: mainKeyForm.keyManId,
                unit: mainKeyForm.unit,
                keyType: Number(mainKeyForm.keyType),
                weight: newWeight,
                user: currentUser?.employeeID || 'SYSTEM',
                effectiveYear: effectiveYear
            };
            await saveMainKey(mkdId, payload, token);
            toast.success("บันทึกข้อมูลเรียบร้อย");
            setIsAddingMainRow(false);
            setEditingMainRowId(null);
            refreshData();
        } catch {
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setLoading(false);
        }
    };

    // Sub Key Actions
    const openAddSubKey = async (parentId: string) => {
        if (!confirm('ต้องการเพิ่มรายการย่อยใช่หรือไม่?')) return;
        try {
            setLoading(true);
            const payload = {
                manDriverKeyId: parentId,
                insertType: 2,
                definition: '',
                coefficient: 1,
                remark: '',
                user: currentUser?.employeeID || 'SYSTEM',
                yearlyData: allYears.map(y => ({ id: 0, year: y.toString(), amount: 0 }))
            };
            await saveDetailKey(mkdId, payload, token);
            toast.success('เพิ่มรายการย่อยเรียบร้อย');
            refreshData();
        } catch {
            toast.error('เกิดข้อผิดพลาดในการเพิ่มรายการย่อย');
        } finally {
            setLoading(false);
        }
    };

    const openEditSubKey = (subItem: MappedSubItem, parentId: string) => {
        setSubKeyForm({
            manDriverKeyId: subItem.id,
            parentId: parentId,
            definition: subItem.definition,
            coefficient: subItem.coefficient?.toString() || '1',
            remark: subItem.remark,
            yearlyData: { ...subItem.years },
            yearlyIds: { ...subItem.yearIds }
        });
        setIsSubModalOpen(true);
    };

    const handleSaveSubKey = async () => {
        try {
            setLoading(true);
            const yearlyDataArray = Object.keys(subKeyForm.yearlyData).map(y => ({
                id: Number(subKeyForm.yearlyIds?.[Number(y)]) || 0,
                year: y,
                amount: Number(subKeyForm.yearlyData[Number(y)]) || 0
            }));
            const payload = {
                manDriverKeyId: subKeyForm.manDriverKeyId || subKeyForm.parentId,
                insertType: subKeyForm.manDriverKeyId ? undefined : 2,
                definition: subKeyForm.definition,
                coefficient: parseFloat(subKeyForm.coefficient as string) || 1,
                remark: subKeyForm.remark,
                user: currentUser?.employeeID || 'SYSTEM',
                yearlyData: yearlyDataArray
            };
            await saveDetailKey(mkdId, payload, token);
            toast.success("บันทึกข้อมูลย่อยเรียบร้อย");
            setIsSubModalOpen(false);
            refreshData();
        } catch {
            toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูลย่อย");
        } finally {
            setLoading(false);
        }
    };

    // Delete Key Action
    const handleDeleteKey = async (keyId: string) => {
        if (!confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;
        try {
            setLoading(true);
            await deleteMainKey(mkdId, keyId, token);
            toast.success("ลบข้อมูลสำเร็จ");
            refreshData();
        } catch {
            toast.error("ลบข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    // File Actions
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                toast.error("ต้องเป็นไฟล์นามสกุล PDF เท่านั้น");
                e.target.value = '';
                return;
            }
            if (file.size > 15 * 1024 * 1024) {
                toast.error("ขนาดไฟล์เกิน 15MB");
                e.target.value = '';
                return;
            }
            setFileForm({ file: file, customName: file.name });
        }
    };

    const handleUploadFile = async () => {
        if (!fileForm.file) {
            toast.error("กรุณาเลือกไฟล์");
            return;
        }
        try {
            setLoading(true);
            await uploadMKDFile(mkdId, fileForm.file, currentUser?.employeeID || 'SYSTEM', token, fileForm.customName);
            toast.success("อัปโหลดไฟล์สำเร็จ");
            setFileForm({ file: null, customName: '' });
            setIsFileModalOpen(false);
            refreshData();
        } catch {
            toast.error("อัปโหลดไฟล์ไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!confirm("คุณต้องการลบไฟล์นี้ใช่หรือไม่?")) return;
        try {
            setLoading(true);
            await deleteMKDFile(mkdId, fileId, token);
            toast.success("ลบไฟล์สำเร็จ");
            refreshData();
        } catch {
            toast.error("ลบไฟล์ไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    // Actions
    const handleSaveNote = async () => {
        try { 
            setLoading(true); 
            await updateMKDNote(mkdId, note, token); 
            toast.success('บันทึกหมายเหตุสำเร็จ'); 
        } catch { 
            toast.error('เกิดข้อผิดพลาดในการบันทึกหมายเหตุ'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleRequestApprove = () => {
        const totalWeight = mkdData.reduce((sum: number, d: MappedMKDDriver) => sum + (Number(d.weight) || 0), 0);
        if (totalWeight > 100) { 
            toast.error(`Weight รวมเกิน 100% (ปัจจุบัน: ${totalWeight}%) กรุณาแก้ไขก่อนส่งอนุมัติ`);
            return; 
        }
        if (confirm('คุณต้องการส่งเอกสารนี้เพื่อขออนุมัติใช่หรือไม่?')) {
            requestApproveAction();
        }
    };

    const requestApproveAction = async () => {
        try { 
            setLoading(true); 
            const res = await requestApproveMKD(mkdId, currentUser?.employeeID || 'SYSTEM', token);
            if (res?.success) { 
                toast.success('ส่งคำขออนุมัติเรียบร้อยแล้ว'); 
                router.push('/mkd/history'); 
            } else { 
                toast.error(res?.message || 'เกิดข้อผิดพลาดในการส่งคำขออนุมัติ'); 
            }
        } catch { 
            toast.error('เกิดข้อผิดพลาด'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleCancel = () => {
         if (confirm('คุณต้องการยกเลิกเอกสารนี้ใช่หรือไม่? หลังจากยกเลิกแล้วจะไม่สามารถแก้ไขได้อีก')) {
             cancelAction();
         }
    };

    const cancelAction = async () => {
        try { 
            setLoading(true); 
            await updateManDriverStatus(mkdId, 0, currentUser?.employeeID || 'SYSTEM', token); 
            toast.success('ยกเลิกเอกสารเรียบร้อยแล้ว'); 
            router.push('/mkd/history'); 
        } catch { 
            toast.error('เกิดข้อผิดพลาด'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleExportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Manpower Key Driver Summary');
            const headers = ["Manpower Key Driver", "Unit", "Weight(%)", ...allYears.map(y => getYearLabel(y).replace('\n ', ''))];
            const headerRow = worksheet.addRow(headers);
            
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFDBFE' } };
                cell.font = { bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            mkdData.forEach((driver: MappedMKDDriver) => {
                let sumMap: Record<number, number> = {};
                if (driver.type === 'Uniform') {
                    sumMap = driver.mainYears;
                } else {
                    allYears.forEach(y => {
                        sumMap[y] = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                    });
                }
                const rowData = [driver.name, driver.unit, driver.weight, ...allYears.map(y => sumMap[y] || 0)];
                worksheet.addRow(rowData);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `MKD_${header.RequestNo}_${dayjs().format('YYYYMMDD')}.xlsx`);
        } catch {
            toast.error("Export failed");
        }
    };

    const TabIconMap = {
        'MANPOWER': Container,
        'SUMMARY': FileSpreadsheet,
        'FILES': FileText,
        'NOTE': Info
    };

    return (
        <div className="space-y-4 relative">
            <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 shadow-lg py-2">
                <CardContent>
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-white mb-0">Manpower Key Driver</h1>
                        <span className="bg-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md inline-flex items-center gap-2 border-2 border-white/50">
                            <span className="text-slate-500 font-bold tracking-wide text-xs">STATUS : </span> 
                            <span className={`font-black tracking-wide ${getStatusColor(header.StatusName)}`}>
                                {header.StatusName || '-'}
                            </span>
                        </span>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-x-6 gap-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 flex-1 w-full">
                    <div className="md:col-span-2">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">Request No.</Label>
                        <Input value={header.RequestNo || '-'} readOnly className="bg-gray-50 border-gray-200 font-medium text-blue-900 shadow-inner" />
                    </div>
                    <div className="md:col-span-2">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">Date</Label>
                        <Input value={dayjs(header.RequestDate).format('DD/MM/YYYY')} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                    </div>
                    <div className="md:col-span-2">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">รหัสหน่วยงาน</Label>
                        <Input value={header.OrgUnitNo || '-'} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                    </div>
                    <div className="md:col-span-6">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">ชื่อหน่วยงาน (OrgUnit)</Label>
                        <Input value={header.OrgUnitName || header.UnitName || '-'} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0 justify-end h-[40px]">
                    <Button variant="outline" className="text-slate-600 bg-white hover:bg-slate-50 border-slate-300 font-medium min-w-[100px] shadow-sm transition-all h-full" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
                    </Button>
                    {!isReadOnly && (
                        <>
                            <Button variant="destructive" className="font-medium bg-red-500 hover:bg-red-600 shadow-sm transition-all text-white h-full" disabled={loading} onClick={handleCancel}>
                                <Ban className="w-4 h-4 mr-2" /> ยกเลิก
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-all h-full" disabled={loading} onClick={handleRequestApprove}>
                                <Send className="w-4 h-4 mr-2 text-green-100" /> ขออนุมัติ
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="border-b border-blue-200 mb-6 bg-white/50 backdrop-blur-sm sticky top-0 z-10 px-2 pt-2">
                <div className="flex gap-1 md:gap-4 overflow-x-auto">
                    {(Object.keys(TabIconMap) as Array<keyof typeof TabIconMap>).map((tabId) => {
                        const Icon = TabIconMap[tabId];
                        const isActive = activeTab === tabId;
                        const label = tabId === 'MANPOWER' ? 'Manpower Key Driver' : tabId === 'SUMMARY' ? 'Summary' : tabId === 'FILES' ? 'File Attach' : 'Note';
                        
                        return (
                            <button
                                key={tabId}
                                onClick={() => setActiveTab(tabId)}
                                className={`pb-3 px-4 font-semibold text-sm transition-all relative whitespace-nowrap flex items-center gap-2
                                    ${isActive ? "text-blue-700" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-t-lg"}`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                                {label}
                                {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-blue-600 rounded-t-md shadow-sm"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-[400px] overflow-hidden">
                {activeTab === 'MANPOWER' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            {!isReadOnly ? (
                                <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAddMainKey}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Manpower Key Driver
                                </Button>
                            ) : <div></div>}
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden relative">
                                <Table className="w-full text-[10.5px] table-fixed border-collapse">
                                    <TableHeader className="bg-slate-200 border-b border-slate-400 sticky top-0 z-30 shadow-sm">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[40px]"></TableHead>
                                            <TableHead className="font-bold text-slate-800 min-w-[150px]">Manpower Key Driver</TableHead>
                                            <TableHead className="font-bold text-slate-800 text-center border-l w-[80px]">Unit</TableHead>
                                            <TableHead className="font-bold text-slate-800 text-center border-l w-[80px]">Type</TableHead>
                                            <TableHead className="font-bold text-slate-800 border-l min-w-[120px] px-2">Definition</TableHead>
                                            <TableHead className="font-bold text-slate-800 text-center border-l w-[70px] px-1">Coeff.</TableHead>
                                            <TableHead className="font-bold text-slate-800 text-center border-l w-[60px] px-1">Weight</TableHead>
                                            {allYears.map(y => (
                                                <TableHead key={y} className={`font-bold text-right border-l w-[65px] px-1 whitespace-nowrap leading-tight ${getYearColor(y)}`}>
                                                    {getYearLabel(y)}
                                                </TableHead>
                                            ))}
                                            <TableHead className="font-bold text-slate-800 border-l min-w-[100px] px-2 truncate">Remark</TableHead>
                                            <TableHead className="w-[60px] border-l text-center">Edit</TableHead>
                                            <TableHead className="w-[60px] text-center">Delete</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mkdData.map((driver: MappedMKDDriver) => {
                                            const isIndex = driver.type === 'Index';
                                            const allSubs = driver.subItems;

                                            return (
                                                <React.Fragment key={driver.id}>
                                                    {/* Main Row */}
                                                    <TableRow className="bg-blue-50/20 hover:bg-blue-50/40 border-t-2 border-t-slate-100">
                                                        <TableCell className="p-2 text-center">
                                                            {isIndex && !isReadOnly && (
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 rounded-full hover:bg-green-100" title="เพิ่มรายการย่อย" onClick={() => openAddSubKey(driver.id)}>
                                                                    <Plus className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-blue-800 line-clamp-2">{driver.name}</TableCell>
                                                        <TableCell className="text-center font-medium border-l border-slate-100">{driver.unit}</TableCell>
                                                        <TableCell className="text-center border-l border-slate-100">
                                                            <Badge variant={isIndex ? 'default' : 'secondary'} className="bg-slate-200 text-slate-700 hover:bg-slate-300 rounded font-medium text-[10px] px-1.5 uppercase tracking-wide">
                                                                {driver.type}
                                                            </Badge>
                                                        </TableCell>
                                                        
                                                        <TableCell className="border-l border-slate-100 px-2"></TableCell>
                                                        <TableCell className="text-right border-l border-slate-100 font-medium text-purple-700 px-1">{isIndex ? '1' : ''}</TableCell>
                                                        
                                                        <TableCell className="text-center font-bold border-l border-slate-100 px-1">{driver.weight}</TableCell>
                                                        
                                                        {allYears.map(y => (
                                                            <TableCell key={y} className={`text-right font-semibold border-l border-slate-100 px-1 ${getYearColor(y)}`}>
                                                                {(!isIndex ? (driver.mainYears[y] || 0) : 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                            </TableCell>
                                                        ))}
                                                        
                                                        <TableCell className="border-l border-slate-100 truncate max-w-[100px] px-2" title={driver.remark}>
                                                            {driver.remark}
                                                        </TableCell>

                                                        <TableCell className="p-2 text-center border-l border-slate-100">
                                                            {!isReadOnly && (
                                                                <Button size="icon" variant="ghost" onClick={() => {
                                                                    openEditSubKey({
                                                                        id: driver.id,
                                                                        definition: driver.definition,
                                                                        coefficient: driver.coefficient,
                                                                        remark: driver.remark,
                                                                        years: driver.mainYears,
                                                                        yearIds: driver.mainYearIds
                                                                    }, '0');
                                                                }} className="h-6 w-6 text-blue-500">
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="p-2 text-center">
                                                            {!isReadOnly && (!isIndex || driver.subItems.length === 0) && (
                                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteKey(driver.id)} className="h-6 w-6 text-red-500">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Sub Rows */}
                                                    {isIndex && allSubs.map((sk: MappedSubItem) => (
                                                        <TableRow key={sk.id} className="bg-white hover:bg-slate-50 transition-colors">
                                                            <TableCell></TableCell>
                                                            <TableCell></TableCell>
                                                            <TableCell className="border-l border-slate-100"></TableCell>
                                                            <TableCell className="border-l border-slate-100"></TableCell>
                                                            <TableCell className="border-l border-slate-100 px-2">{sk.definition}</TableCell>
                                                            <TableCell className="text-right border-l border-slate-100 font-medium text-purple-700 px-1">{sk.coefficient}</TableCell>
                                                            <TableCell className="border-l border-slate-100"></TableCell>
                                                            {allYears.map(y => (
                                                                <TableCell key={y} className={`text-right border-l border-slate-100 font-medium px-1 ${getYearColor(y)}`}>
                                                                    {(sk.years[y] || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="border-l border-slate-100 truncate max-w-[100px] px-2" title={sk.remark}>{sk.remark}</TableCell>
                                                            <TableCell className="p-2 text-center border-l border-slate-100">
                                                                {!isReadOnly && <Button size="icon" variant="ghost" onClick={() => openEditSubKey(sk, driver.id)} className="h-6 w-6 text-blue-500"><Edit className="w-3.5 h-3.5" /></Button>}
                                                            </TableCell>
                                                            <TableCell className="p-2 text-center">
                                                                {!isReadOnly && <Button size="icon" variant="ghost" onClick={() => handleDeleteKey(sk.id)} className="h-6 w-6 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}

                                                    {isIndex && driver.subItems.length > 0 && (
                                                        <TableRow className="bg-[#f1e8e1]">
                                                            <TableCell colSpan={7}></TableCell>
                                                            {allYears.map(y => {
                                                                const sum = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                                                return (
                                                                    <TableCell key={y} className={`text-right font-bold border-l border-white/50 px-1 ${getYearColor(y)}`}>
                                                                        {sum.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                            <TableCell colSpan={3} className="border-l border-white/50"></TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {mkdData.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={11 + allYears.length} className="text-center py-12 text-slate-500">
                                                    ไม่มีข้อมูล
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'SUMMARY' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Summary</h3>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleExportExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export to Excel
                            </Button>
                        </div>
                        <div className="overflow-x-auto border border-slate-200 rounded-md">
                            <Table className="text-[13px] min-w-max">
                                <TableHeader className="bg-slate-200 border-b border-slate-400">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-800 min-w-[200px]">Manpower Key Driver</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l">Unit</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[100px]">Weight(%)</TableHead>
                                        {allYears.map(y => (
                                            <TableHead key={y} className={`font-bold text-right border-l w-[100px] whitespace-pre-wrap leading-tight ${getYearColor(y)}`}>
                                                {getYearLabel(y)}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mkdData.map((driver: MappedMKDDriver) => {
                                        let sumMap: Record<number, number> = {};
                                        if (driver.type === 'Uniform') {
                                            sumMap = driver.mainYears;
                                        } else {
                                            allYears.forEach(y => {
                                                sumMap[y] = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                            });
                                        }
                                        return (
                                            <TableRow key={driver.id} className="hover:bg-blue-50/30">
                                                <TableCell className="font-bold text-blue-800">{driver.name}</TableCell>
                                                <TableCell className="text-center border-l font-medium border-slate-100">{driver.unit}</TableCell>
                                                <TableCell className="text-center border-l font-medium border-slate-100">{driver.weight}</TableCell>
                                                {allYears.map(y => (
                                                    <TableCell key={y} className={`text-right border-l font-semibold border-slate-100 ${getYearColor(y)}`}>
                                                        {(sumMap[y] || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        );
                                    })}
                                    {mkdData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3 + allYears.length} className="text-center py-8 text-slate-500">ไม่มีข้อมูล</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {activeTab === 'FILES' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-slate-600 text-sm">
                                <p className="font-bold text-slate-700">*Remark:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Maximum File Size: 15MB</li>
                                    <li>Extension: PDF</li>
                                    <li>เอกสารเพื่อประกอบการกรอกข้อมูล MKD ที่ได้รับอนุมัติหรือเป็นไปตามแผนงานของสายงาน</li>
                                </ul>
                            </div>
                            {!isReadOnly && (
                                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={() => setIsFileModalOpen(true)}>
                                    <Upload className="w-4 h-4 mr-2" /> Add File
                                </Button>
                            )}
                        </div>
                        
                        <div className="overflow-x-auto border border-slate-200 rounded-md w-[800px]">
                            <Table className="text-[13px] ">
                                <TableHeader className="bg-slate-200 border-b border-slate-400">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center font-bold text-slate-800">NO</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l min-w-[300px]">Name</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l text-center w-[120px]">File</TableHead>
                                        {!isReadOnly && <TableHead className="w-[80px] border-l"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {localFiles.map((file: MKDFile, idx: number) => {
                                        const ext = file.FileName?.split('.').pop()?.toUpperCase() || file.fileName?.split('.').pop()?.toUpperCase() || 'PDF';
                                        return (
                                            <TableRow key={idx} className="hover:bg-slate-50/50">
                                                <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                                <TableCell className="border-l font-medium">{file.FileName || file.fileName}</TableCell>
                                                <TableCell className="border-l text-center">
                                                    <Button variant="ghost" className="h-auto p-2 hover:bg-blue-50 flex flex-col items-center justify-center space-y-1 mx-auto" onClick={() => window.open(`/api/files-proxy?path=${header.RequestNo}/${file.FileUpload}`, '_blank')}>
                                                        <FileText className="w-6 h-6 text-blue-500" />
                                                        <span className="text-[10px] text-slate-500 font-semibold">{ext}</span>
                                                    </Button>
                                                </TableCell>
                                                {!isReadOnly && (
                                                    <TableCell className="border-l text-center">
                                                        <Button size="icon" variant="ghost" onClick={() => handleDeleteFile(file.FileUpload)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                    {localFiles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={!isReadOnly ? 4 : 3} className="text-center py-8 text-slate-500">
                                                ไม่มีข้อมูลเอกสาร
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {activeTab === 'NOTE' && (
                    <div className="animate-in fade-in duration-300 max-w-3xl">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 shadow-inner">
                            <Textarea
                                className="w-full bg-transparent border-0 focus-visible:ring-0 resize-y min-h-[200px] p-4 text-slate-700 text-[14px]"
                                placeholder="ไม่มีหมายเหตุอธิบาย MKD"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={isReadOnly}
                                maxLength={500}
                            />
                        </div>
                        <div className="text-xs text-slate-500 mb-4 pl-2 font-medium">
                            *Max Length 500 Letters : {500 - (note?.length || 0)} remaining
                        </div>
                        {!isReadOnly && (
                            <Button className="bg-blue-600 hover:bg-blue-700 font-semibold w-[150px]" onClick={handleSaveNote} disabled={loading}>
                                SAVE NOTE
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Main Key Modal */}
            <Dialog open={isMainModalOpen} onOpenChange={(open) => {
                setIsMainModalOpen(open);
                if (!open) { setIsAddingMainRow(false); setEditingMainRowId(null); }
            }}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                    {(() => {
                        if (!isAddingMainRow && editingMainRowId === null) return null;
                        
                        const currentWeight = Number(mainKeyForm.weight) || 0;
                        const otherWeightsSum = mkdData
                            .filter(d => d.id !== editingMainRowId)
                            .reduce((sum, d) => sum + (Number(d.weight) || 0), 0);
                        const potentialTotal = otherWeightsSum + currentWeight;
                        
                        return potentialTotal > 100 ? (
                            <div className="bg-red-50 border-b border-red-200 p-2 text-center text-red-600 font-bold text-sm animate-pulse">
                                ⚠️ คำเตือน: ยอดรวม Weight ขณะนี้คือ {potentialTotal}% (เกิน 100%) ไม่สามารถบันทึกได้
                            </div>
                        ) : null;
                    })()}
                    <div className="p-6 pb-2">
                        <DialogHeader className="flex flex-row items-center justify-between">
                            <DialogTitle>Manpower Key Driver (Main)</DialogTitle>
                            {!isReadOnly && !isAddingMainRow && (
                                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm mr-10" size="sm" onClick={() => {
                                    setIsAddingMainRow(true);
                                    setEditingMainRowId(null);
                                    setMainKeyForm({ manDriverKeyId: '', keyManId: '', unit: '', keyType: '1', weight: '0' });
                                }}>
                                    <Plus className="w-4 h-4 mr-1" /> ADD
                                </Button>
                            )}
                        </DialogHeader>
                    </div>
                    <div className="overflow-y-auto px-6 pb-6">
                        <div className="border border-slate-200 rounded-md overflow-hidden">
                            <Table className="text-[13px]">
                                <TableHeader className="bg-slate-200 border-b border-slate-400">
                                    <TableRow>
                                        <TableHead className="w-[50px] text-center font-bold text-slate-800">No</TableHead>
                                        <TableHead className="font-bold text-slate-800 min-w-[180px]">Manpower Key Driver</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center w-[150px]">Unit</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center w-[120px]">Type</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center w-[80px]">Weight(%)</TableHead>
                                        <TableHead className="w-[100px] text-center font-bold text-slate-800"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mkdData.map((driver, idx) => {
                                        const isEditing = editingMainRowId === driver.id;
                                        return (
                                            <TableRow key={driver.id} className="hover:bg-slate-50">
                                                <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                                <TableCell className="font-medium text-slate-700">{driver.name}</TableCell>
                                                <TableCell className="text-center">
                                                    {isEditing ? (
                                                        <Input className="h-8 shadow-inner" value={mainKeyForm.unit} onChange={e => setMainKeyForm(prev => ({...prev, unit: e.target.value}))} />
                                                    ) : (
                                                        driver.unit
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {isEditing ? (
                                                        <Select value={mainKeyForm.keyType} onValueChange={v => setMainKeyForm(prev => ({...prev, keyType: v}))}>
                                                            <SelectTrigger className="h-8 shadow-inner"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1">Index</SelectItem>
                                                                <SelectItem value="2">Uniform</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Badge variant={driver.type === 'Index' ? 'default' : 'secondary'} className="bg-slate-200 text-slate-700 font-medium text-[11px] px-1.5 uppercase tracking-wide">
                                                            {driver.type}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {isEditing ? (
                                                        <Input 
                                                            type="number" 
                                                            className="h-8 text-center shadow-inner" 
                                                            value={mainKeyForm.weight} 
                                                            onChange={e => setMainKeyForm(prev => ({...prev, weight: e.target.value}))} 
                                                            onFocus={(e) => e.target.select()}
                                                        />
                                                    ) : (
                                                        <span className="font-semibold text-slate-800">{driver.weight}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {!isReadOnly && (
                                                        isEditing ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button size="icon" variant="ghost" onClick={handleSaveMainKey} disabled={loading} className="h-7 w-7 text-green-600 hover:bg-green-100 rounded-full"><Check className="w-4 h-4" /></Button>
                                                                <Button size="icon" variant="ghost" onClick={() => setEditingMainRowId(null)} disabled={loading} className="h-7 w-7 text-red-500 hover:bg-red-100 rounded-full"><X className="w-4 h-4" /></Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button size="icon" variant="ghost" onClick={() => {
                                                                    setIsAddingMainRow(false);
                                                                    setEditingMainRowId(driver.id);
                                                                    setMainKeyForm({
                                                                        manDriverKeyId: driver.id,
                                                                        keyManId: driver.keyManId,
                                                                        unit: driver.unit,
                                                                        keyType: driver.typeValue,
                                                                        weight: driver.weight.toString()
                                                                    });
                                                                }} className="h-7 w-7 text-blue-500 hover:bg-blue-100"><Edit className="w-3.5 h-3.5" /></Button>
                                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteKey(driver.id)} className="h-7 w-7 text-red-500 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                            </div>
                                                        )
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {isAddingMainRow && (
                                        <TableRow className="bg-blue-50/40">
                                            <TableCell className="text-center font-bold text-slate-400">+</TableCell>
                                            <TableCell>
                                                <Select value={mainKeyForm.keyManId} onValueChange={v => setMainKeyForm(prev => ({...prev, keyManId: v}))}>
                                                    <SelectTrigger className="h-8 shadow-inner w-full"><SelectValue placeholder="เลือก..." /></SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        {masterKeys.map((m: MasterKey) => (
                                                            <SelectItem key={m.KeyManID || m.MasterId} value={(m.KeyManID || m.MasterId)?.toString() || ''}>
                                                                {m.KeyManName}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input className="h-8 shadow-inner text-center" value={mainKeyForm.unit} onChange={e => setMainKeyForm(prev => ({...prev, unit: e.target.value}))} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Select value={mainKeyForm.keyType} onValueChange={v => setMainKeyForm(prev => ({...prev, keyType: v}))}>
                                                    <SelectTrigger className="h-8 shadow-inner"><SelectValue placeholder="Type" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">Index</SelectItem>
                                                        <SelectItem value="2">Uniform</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input 
                                                    type="number" 
                                                    className="h-8 text-center shadow-inner" 
                                                    value={mainKeyForm.weight} 
                                                    onChange={e => setMainKeyForm(prev => ({...prev, weight: e.target.value}))} 
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button size="icon" variant="ghost" onClick={handleSaveMainKey} disabled={loading} className="h-7 w-7 text-green-600 hover:bg-green-100 rounded-full"><Check className="w-4 h-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => setIsAddingMainRow(false)} disabled={loading} className="h-7 w-7 text-red-500 hover:bg-red-100 rounded-full"><X className="w-4 h-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {mkdData.length === 0 && !isAddingMainRow && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-6 text-slate-500">ไม่มีข้อมูล Main Driver</TableCell>
                                        </TableRow>
                                    )}
                                    {mkdData.length > 0 && (
                                        <TableRow className="bg-slate-100 font-bold">
                                            <TableCell colSpan={4} className="text-right pr-4">Total Weight (%)</TableCell>
                                            <TableCell className={`text-center ${mkdData.reduce((s,d) => s + (Number(d.weight) || 0), 0) > 100 ? 'text-red-600' : 'text-blue-700'}`}>
                                                {mkdData.reduce((s,d) => s + (Number(d.weight) || 0), 0)}%
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col gap-1">
                            <div className="text-xs text-slate-500">
                                <span className="font-bold text-slate-600 mr-2">Uniform:</span>
                                - Manpower Key Driver ที่มีหน่วยวัดชัดเจน เช่น บาท, ลิตร
                            </div>
                            <div className="text-xs text-slate-500">
                                <span className="font-bold text-slate-600 mr-2">Index:</span>
                                - Manpower Key Driver ที่หน่วยวัดมีความแตกต่างของเวลาที่ใช้ เพื่อให้ได้ผลลัพธ์อย่างชัดเจน เช่น Project (เล็ก, กลาง, ใหญ่) งานที่เป็นมาตรฐานจะกำหนด Coefficient ที่ 1.0
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sub Key Modal */}
            <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <div className="p-6 pb-2">
                        <DialogHeader className="flex flex-row items-center justify-between">
                            <DialogTitle>
                                {subKeyForm.parentId === '0' ? 'Edit Yearly Data' : (subKeyForm.manDriverKeyId ? 'Edit Detail' : 'Add Detail')}
                            </DialogTitle>
                        </DialogHeader>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {(() => {
                            const parentDriver = mkdData.find(d => 
                                subKeyForm.parentId !== '0' ? d.id === subKeyForm.parentId : d.id === subKeyForm.manDriverKeyId
                            );
                            
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column: Properties */}
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wide">Manpower Key Driver</Label>
                                            <Input disabled className="bg-slate-200/80 mt-1 h-8 text-blue-800 font-semibold border-slate-300 cursor-not-allowed opacity-80" value={parentDriver?.name || ''} />
                                        </div>
                                        <div>
                                            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wide">Unit</Label>
                                            <Input disabled className="bg-slate-200/80 mt-1 h-8 text-slate-600 border-slate-300 cursor-not-allowed opacity-80" value={parentDriver?.unit || ''} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-slate-600 text-xs font-bold uppercase tracking-wide">Type</Label>
                                                <Input disabled className="bg-slate-200/80 mt-1 h-8 text-center text-slate-600 border-slate-300 cursor-not-allowed opacity-80" value={parentDriver?.type || ''} />
                                            </div>
                                            <div>
                                                <Label className="text-slate-600 text-xs font-bold uppercase tracking-wide">Weight(%)</Label>
                                                <Input disabled className="bg-slate-200/80 mt-1 h-8 text-center font-bold text-slate-600 border-slate-300 cursor-not-allowed opacity-80" value={parentDriver?.weight || ''} />
                                            </div>
                                        </div>

                                        <div className="mt-2 space-y-3 pt-3 border-t border-slate-200">
                                            <div>
                                                <Label htmlFor="definition" className="text-blue-700 text-xs font-bold uppercase tracking-wide">Definition</Label>
                                                <Textarea 
                                                    id="definition" 
                                                    className="mt-1 shadow-inner max-h-[80px]"
                                                    value={subKeyForm.definition} 
                                                    onChange={(e) => setSubKeyForm(prev => ({...prev, definition: e.target.value}))} 
                                                    placeholder="ระบุรายละเอียด..."
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="coefficient" className="text-blue-700 text-xs font-bold uppercase tracking-wide">Coefficient</Label>
                                                <select 
                                                    id="coefficient" 
                                                    className="mt-1 h-8 w-1/3 shadow-inner rounded-md border border-input bg-background px-3 text-sm"
                                                    value={subKeyForm.coefficient} 
                                                    onChange={(e) => setSubKeyForm(prev => ({...prev, coefficient: e.target.value}))} 
                                                >
                                                    <option value="0.5">0.5</option>
                                                    <option value="1">1</option>
                                                    <option value="1.5">1.5</option>
                                                    <option value="2">2</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className={subKeyForm.parentId !== '0' ? "" : "mt-2 space-y-3 pt-3 border-t border-slate-200"}>
                                            <div>
                                                <Label htmlFor="remark" className="text-blue-700 text-xs font-bold uppercase tracking-wide">Remark</Label>
                                                <Textarea 
                                                    id="remark" 
                                                    className="mt-1 shadow-inner max-h-[80px]"
                                                    value={subKeyForm.remark} 
                                                    maxLength={200}
                                                    onChange={(e) => setSubKeyForm(prev => ({...prev, remark: e.target.value}))} 
                                                />
                                                <div className="text-[11px] text-slate-500 mt-1 pl-1">
                                                    *Max Length 200 Letters : {200 - (subKeyForm.remark?.length || 0)} remaining
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Yearly Values */}
                                    <div className="flex flex-col">
                                        <div className="border border-slate-300 rounded-md overflow-hidden bg-white max-h-[450px] flex flex-col">
                                            <Table className="text-sm table-fixed w-full">
                                                <TableHeader className="bg-slate-200 border-b border-slate-400 sticky top-0 z-10">
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="text-center font-bold text-slate-800 w-1/2">Year</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-800 w-1/2 border-l">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {allYears.map((y, index) => (
                                                        <TableRow key={y} className="hover:bg-slate-50 [&:not(:last-child)]:border-b border-slate-100">
                                                            <TableCell className="text-center font-semibold w-1/2 bg-slate-50/50">
                                                                <span className={getYearColor(y)}>{getYearLabel(y)}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center w-1/2 border-l">
                                                                <Input
                                                                    id={`yearly-input-${index}`}
                                                                    type="number"
                                                                    className="h-8 text-right shadow-inner tabular-nums font-semibold"
                                                                    value={subKeyForm.yearlyData[y] === 0 ? '0' : (subKeyForm.yearlyData[y] || '')}
                                                                    onFocus={e => e.target.select()}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                                            e.preventDefault();
                                                                            const next = document.getElementById(`yearly-input-${index + 1}`);
                                                                            if (next) next.focus();
                                                                        } else if (e.key === 'ArrowUp') {
                                                                            e.preventDefault();
                                                                            const prev = document.getElementById(`yearly-input-${index - 1}`);
                                                                            if (prev) prev.focus();
                                                                        }
                                                                    }}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setSubKeyForm(prev => ({
                                                                            ...prev,
                                                                            yearlyData: {
                                                                                ...prev.yearlyData,
                                                                                [y]: val === '' ? 0 : Number(val)
                                                                            }
                                                                        }));
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-end gap-2">
                        <Button variant="outline" className="h-9 px-6 bg-white" onClick={() => setIsSubModalOpen(false)}>Cancel</Button>
                        <Button className="h-9 px-6 bg-blue-600 hover:bg-blue-700" onClick={handleSaveSubKey} disabled={loading}>
                            <Save className="w-4 h-4 mr-2" /> Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* File Upload Modal */}
            <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Upload File Attachment</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="customName" className="font-semibold text-slate-700">File Name (Optional Label)</Label>
                            <Input 
                                id="customName" 
                                value={fileForm.customName} 
                                onChange={(e) => setFileForm(prev => ({...prev, customName: e.target.value}))} 
                                placeholder="ชื่อเอกสาร..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fileInput" className="font-semibold text-slate-700">Select PDF File</Label>
                            <Input 
                                id="fileInput" 
                                type="file" 
                                accept=".pdf,application/pdf"
                                ref={fileInputRef}
                                onChange={handleFileChange} 
                                className="cursor-pointer file:text-blue-600 file:bg-blue-50 file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-full file:font-semibold"
                            />
                            {fileForm.file && (
                                <span className="text-xs text-green-600 font-medium">Selected: {fileForm.file.name} ({(fileForm.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsFileModalOpen(false); setFileForm({file: null, customName: ''}); }}>Cancel</Button>
                        <Button onClick={handleUploadFile} disabled={loading || !fileForm.file} className="bg-blue-600 hover:bg-blue-700">Upload</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
