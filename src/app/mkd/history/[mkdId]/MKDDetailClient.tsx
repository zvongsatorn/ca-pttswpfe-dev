'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { saveExcelFile } from '@/utils/fileDownload';
import { buildFilesProxyPath, openSafeApiPath } from '@/utils/security';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
    deleteMainKey, deleteMKDFile, submitMKDApproveAction,
    copyMKD, getMKDHistory, getFlowHistory
} from '@/services/mkdService';

interface CurrentUser {
    employeeID?: string;
    email?: string;
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
    ApproveID?: number | string | null;
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

interface MKDSummary {
    ManDriverKeyID: number | string;
    KeyYear: number | string;
    KeySumAmount: number;
    ImpRate?: number;
    [key: string]: unknown;
}

interface MKDFile {
    FileName?: string;
    fileName?: string;
    FileUpload: string;
    [key: string]: unknown;
}

interface HistoryRecord {
    ManDriverID: number;
    RequestNo?: string;
    CreateDate?: string | Date;
    Description?: string;
}

interface FlowHistoryStep {
    Seqno: number;
    ApproveHistStatus: number;
    Fullname?: string;
    posname?: string;
    StatusName?: string;
    ApproveHistDateBD?: string;
    Remark?: string;
    [key: string]: unknown;
}

interface MKDDetailClientProps {
    mkdId: string;
    token: string;
    currentUser: CurrentUser | null;

    initialData: {
        header: MKDHeader;
        keys: MKDKey[];
        years: MKDYear[];
        files: MKDFile[];
        summary: MKDSummary[];
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
    const searchParams = useSearchParams();
    const fromInbox = searchParams.get('from') === 'inbox';

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'MANPOWER' | 'SUMMARY' | 'FILES' | 'NOTE'>('MANPOWER');
    const [note, setNote] = useState<string>((initialData.header?.Remark as string) || (initialData.header?.Note as string) || '');

    // Reactive Data State
    const [header, setHeader] = useState<MKDHeader>(initialData.header || {});
    const [localKeys, setLocalKeys] = useState<MKDKey[]>(initialData.keys || []);
    const [localYears, setLocalYears] = useState<MKDYear[]>(initialData.years || []);
    const [localFiles, setLocalFiles] = useState<MKDFile[]>(initialData.files || []);
    const [localSummary, setLocalSummary] = useState<MKDSummary[]>(initialData.summary || []);
    const [flowHistory, setFlowHistory] = useState<FlowHistoryStep[]>([]);

    const effectiveYear = header.EffectiveYear || 0;

    // Check if there is any rejection in the history
    const isRejected = useMemo(() => {
        return flowHistory?.some(h => h.ApproveHistStatus === -1) || false;
    }, [flowHistory]);

    const rejectRemarkItems = useMemo(() => {
        const rejectedSteps = [...(flowHistory || [])]
            .filter((step) => Number(step.ApproveHistStatus) === -1)
            .sort((a, b) => (Number(b.Seqno) || 0) - (Number(a.Seqno) || 0));

        if (rejectedSteps.length === 0) return [] as Array<{ rejectBy: string; remark: string }>;

        const splitRemarkEntries = (rawRemark: string) => {
            return rawRemark
                .replace(/\r\n/g, '\n')
                .split('\n')
                .flatMap((line) => line.split(/,(?=\s*\d{1,2}\/\d{1,2}\/\d{4})/))
                .map((part) => part.trim())
                .filter(Boolean);
        };

        const cleanRemarkText = (rawText: string) => {
            return rawText
                .replace(/^\s*,+/, '')
                .replace(/\s*:\s*;/g, ' : ')
                .replace(/\s*;\s*$/g, '')
                .replace(/\s*,\s*$/g, '')
                .trim();
        };

        const items: Array<{ rejectBy: string; remark: string }> = [];

        rejectedSteps.forEach((step) => {
            const stepRemarkRaw = step.Remark ?? (step as { remark?: string }).remark ?? '';
            const stepRemarkText = String(stepRemarkRaw).trim();
            if (!stepRemarkText) return;

            const rejectBy = String(step.Fullname || '').trim() || 'ไม่ระบุผู้ส่งกลับ';
            const entryParts = splitRemarkEntries(stepRemarkText);
            const parsedParts = entryParts.length > 0 ? entryParts : [stepRemarkText];

            parsedParts.forEach((entry) => {
                const cleaned = cleanRemarkText(entry);
                if (cleaned) {
                    items.push({ rejectBy, remark: cleaned });
                }
            });
        });

        const seen = new Set<string>();
        return items.filter((item) => {
            const key = `${item.rejectBy}::${item.remark}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [flowHistory]);

    // For Resend: The user is the creator AND it was rejected (and still pending)
    const isCreatorBack = header.ManDriverStatus === 1 && 
                          currentUser?.employeeID === header.CreateBy && 
                          isRejected;

    const isReadOnly = (header.ManDriverStatus !== 1 || (header.ApproveID !== null && header.ApproveID !== undefined && header.ApproveID !== 0)) && !isCreatorBack;

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
    
    // Approval & Copy Modal States
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    // Confirm Dialog State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        cancelText: string;
        confirmText: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        cancelText: 'ยกเลิก',
        confirmText: 'ยืนยัน',
        onConfirm: () => {}
    });

    const openConfirm = (
        title: string,
        message: string,
        onConfirm: () => void,
        labels?: { cancelText?: string; confirmText?: string }
    ) => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            onConfirm,
            cancelText: labels?.cancelText || 'ยกเลิก',
            confirmText: labels?.confirmText || 'ยืนยัน'
        });
    };

    const refreshData = async () => {
        try {
            const res = await getMKDDetails(mkdId, token);
            if (res?.data) {
                const newHeader = (res.data.header as MKDHeader) || {};
                setHeader(newHeader);
                setLocalKeys((res.data.keys as MKDKey[]) || []);
                setLocalYears((res.data.years as MKDYear[]) || []);
                setLocalFiles((res.data.files as MKDFile[]) || []);
                setLocalSummary((res.data.summary as MKDSummary[]) || []);

                if (newHeader.ApproveID) {
                    const flowRes = await getFlowHistory(mkdId, newHeader.ApproveID.toString(), token);
                    if (flowRes?.success) setFlowHistory(flowRes.data);
                }
            }
        } catch (error) {
            console.error("Failed to refresh data", error);
        }
    };

    React.useEffect(() => {
        if (header.ApproveID) {
            getFlowHistory(mkdId, header.ApproveID.toString(), token).then(res => {
                if (res?.success) setFlowHistory(res.data);
            });
        }
    }, [mkdId, header.ApproveID, token]);

    const summaryMap = useMemo(() => {
        const map: Record<string, Record<number, number>> = {};
        localSummary.forEach(s => {
            const keyId = s.ManDriverKeyID.toString();
            const year = Number(s.KeyYear);
            if (!map[keyId]) map[keyId] = {};
            map[keyId][year] = Number(s.KeySumAmount);
        });
        return map;
    }, [localSummary]);

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

            // [REMOVED] INDEX automatic sum calculation here to keep Parent row independent as per user request
            // if (!isUniform) {
            //     allYears.forEach(y => {
            //         mainYears[y] = subItems.reduce((acc, curr) => acc + ((curr.years[y] || 0) * (Number(curr.coefficient) || 1)), 0);
            //     });
            // }

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
            // Stop add/edit row after save; user can click ADD again when needed.
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
        openConfirm('ยืนยันบันทึกข้อมูล', 'ต้องการเพิ่มรายการย่อยใช่หรือไม่?', async () => {
            try {
                setLoading(true);
                const payload = {
                    manDriverKeyId: parentId,
                    insertType: 2,
                    definition: '',
                    coefficient: 1,
                    remark: '',
                    user: currentUser?.employeeID || 'SYSTEM',
                    effectiveYear: header?.EffectiveYear,
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
        });
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
            const yearlyDataArray = allYears.map(y => ({
                id: Number(subKeyForm.yearlyIds?.[y]) || 0,
                year: y.toString(),
                amount: Number(subKeyForm.yearlyData[y]) || 0
            }));
            const payload = {
                manDriverKeyId: subKeyForm.manDriverKeyId || subKeyForm.parentId,
                insertType: subKeyForm.manDriverKeyId ? undefined : 2,
                definition: subKeyForm.definition,
                coefficient: parseFloat(subKeyForm.coefficient as string) || 1,
                remark: subKeyForm.remark,
                user: currentUser?.employeeID || 'SYSTEM',
                effectiveYear: header?.EffectiveYear,
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
        openConfirm('ยืนยันการลบ', 'คุณต้องการลบรายการนี้ใช่หรือไม่?', async () => {
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
        });
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
        openConfirm('ยืนยันการลบ', 'คุณต้องการลบไฟล์นี้ใช่หรือไม่?', async () => {
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
        });
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
        console.log('Total Weight Check:', totalWeight);
        if (Math.abs(totalWeight - 100) > 0.001) { 
            toast.error(`Weight รวมต้องเท่ากับ 100% (ปัจจุบัน: ${totalWeight}%) กรุณาแก้ไขก่อนส่งอนุมัติ`);
            return; 
        }
        const confirmMessage = isCreatorBack
            ? 'คุณต้องการส่งกลับเอกสารนี้เพื่ออนุมัติใหม่ใช่หรือไม่?'
            : 'คุณต้องการส่งเอกสารนี้เพื่อขออนุมัติใช่หรือไม่?';
        openConfirm(
            'ยืนยันส่งอนุมัติ',
            confirmMessage,
            () => {
                requestApproveAction();
            },
            isCreatorBack ? { cancelText: 'Cancel', confirmText: 'Resend' } : undefined
        );
    };

    const requestApproveAction = async () => {
        try { 
            setLoading(true); 
            const approveIdToPass = isCreatorBack ? (header.ApproveID || undefined) : undefined;
            console.log('[requestApproveAction] id:', mkdId, 'user:', currentUser?.employeeID, 'approveIdToPass:', approveIdToPass, 'isCreatorBack:', isCreatorBack);
            const res = await requestApproveMKD(mkdId, currentUser?.employeeID || 'SYSTEM', approveIdToPass, token);
            if (res?.success) { 
                toast.success('ส่งคำขออนุมัติเรียบร้อยแล้ว'); 
                router.push('/home'); 
            } else { 
                toast.error(res?.message || 'เกิดข้อผิดพลาดในการส่งคำขออนุมัติ'); 
            }
        } catch (error) { 
            console.error('requestApproveAction Error:', error);
            toast.error('เกิดข้อผิดพลาด'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleCancel = () => {
         openConfirm('ยืนยันการยกเลิก', 'คุณต้องการยกเลิกเอกสารนี้ใช่หรือไม่? หลังจากยกเลิกแล้วจะไม่สามารถแก้ไขได้อีก', () => {
             cancelAction();
         });
    };

    const cancelAction = async () => {
        try { 
            setLoading(true); 
            await updateManDriverStatus(mkdId, 0, currentUser?.employeeID || 'SYSTEM', token); 
            toast.success('ยกเลิกเอกสารเรียบร้อยแล้ว'); 
            router.push('/home'); 
        } catch { 
            toast.error('เกิดข้อผิดพลาด'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleApproveAction = async () => {
        try {
            setLoading(true);
            const res = await submitMKDApproveAction(mkdId, {
                approveId: Number(header.ApproveID),
                employeeId: currentUser?.employeeID || '',
                action: 'APPROVE',
                remark: ''
            }, token);
            if (res?.success) {
                toast.success('ดำเนินการเห็นชอบเรียบร้อยแล้ว');
                setIsApproveModalOpen(false);
                router.push('/home');
            } else {
                toast.error(res?.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectAction = async () => {
        if (!rejectReason.trim()) {
            toast.error('กรุณาระบุเหตุผลที่ไม่เห็นชอบ');
            return;
        }
        try {
            setLoading(true);
            const res = await submitMKDApproveAction(mkdId, {
                approveId: Number(header.ApproveID),
                employeeId: currentUser?.employeeID || '',
                action: 'REJECT',
                remark: rejectReason
            }, token);
            if (res?.success) {
                toast.success('ดำเนินการไม่เห็นชอบเรียบร้อยแล้ว');
                setIsRejectModalOpen(false);
                router.push('/home');
            } else {
                toast.error(res?.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const openCopyModal = async () => {
        try {
            setIsFetchingHistory(true);
            setIsCopyModalOpen(true);
            const res = await getMKDHistory(currentUser?.employeeID || '', token);
            if (res?.success) {
                setHistoryData(res.data);
            }
        } catch {
            toast.error('ไม่สามารถดึงข้อมูลประวัติได้');
        } finally {
            setIsFetchingHistory(false);
        }
    };

    const handleCopyFrom = async (copyFromId: number) => {
        openConfirm('ยืนยันการคัดลอก', 'ข้อมูล Key Driver เดิมในฉบับนี้จะถูกเขียนทับด้วยข้อมูลจากรายการที่เลือก ต้องการดำเนินการใช่หรือไม่?', async () => {
            try {
                setLoading(true);
                const res = await copyMKD(mkdId, {
                    copyFromId,
                    employeeId: currentUser?.employeeID || '',
                    effectiveYear: effectiveYear.toString()
                }, token);
                if (res?.success) {
                    toast.success('คัดลอกข้อมูลเรียบร้อยแล้ว');
                    setIsCopyModalOpen(false);
                    refreshData();
                } else {
                    toast.error(res?.message || 'คัดลอกข้อมูลไม่สำเร็จ');
                }
            } catch {
                toast.error('เกิดข้อผิดพลาดในการคัดลอก');
            } finally {
                setLoading(false);
            }
        });
    };

    const handleExportExcel = async () => {
        try {
            // Force safe import for browser context
            const exceljsLib = await import('exceljs');
            const ExcelJSClient = exceljsLib.default || exceljsLib;

            const workbook = new ExcelJSClient.Workbook();
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
                        const summaryValue = summaryMap[driver.id]?.[y];
                        sumMap[y] = summaryValue !== undefined 
                            ? summaryValue 
                            : driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                    });
                }
                const rowData = [driver.name, driver.unit, driver.weight, ...allYears.map(y => sumMap[y] || 0)];
                worksheet.addRow(rowData);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            await saveExcelFile(blob, `MKD_${header.RequestNo}_${dayjs().format('YYYYMMDD')}.xlsx`);
            
        } catch (error: unknown) {
            console.error("[MKD Export Error]:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            toast.error("Export failed: " + message);
            alert("Export failed: " + message);
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

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-start gap-x-6 gap-y-4">
                <div className="flex-1 w-full space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
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
                    {rejectRemarkItems.length > 0 && (
                        <div className="md:max-w-[420px] rounded-md border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-[11px] font-semibold text-red-700">หมายเหตุการส่งกลับ</p>
                            <div className="mt-1 space-y-1">
                                {rejectRemarkItems.map((item, idx) => (
                                    <p key={`${item.rejectBy}-${idx}`} className="text-xs text-red-800 whitespace-pre-wrap break-words">
                                        {item.rejectBy} : {item.remark}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-7 md:self-start justify-end h-[40px]">
                    <Button variant="outline" className="text-white bg-slate-500 hover:bg-slate-600 hover:text-white border-slate-300 font-bold min-w-[100px] shadow-sm transition-all h-full" onClick={() => router.push(fromInbox ? '/home' : '/mkd/history')}>
                        <ArrowLeft className="w-4 h-4 mr-2 font-bold" /> BACK
                    </Button>
                    
                    {/* Approver Actions */}
                    {header.ManDriverStatus === 1 && header.ApproveID && !isCreatorBack && fromInbox && (
                        <>
                            <Button variant="destructive" className="font-bold bg-red-600 hover:bg-red-700 shadow-md transition-all text-white h-full px-6" disabled={loading} onClick={() => setIsRejectModalOpen(true)}>
                                <X className="w-4 h-4 mr-2 font-bold" /> REJECT
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md transition-all h-full px-6 border-b-4 border-green-800 active:border-b-0" disabled={loading} onClick={() => setIsApproveModalOpen(true)}>
                                <Check className="w-4 h-4 mr-2 font-bold" /> CONFIRM
                            </Button>
                        </>
                    )}

                    {(!isReadOnly || isCreatorBack) && (!header.ApproveID || fromInbox) && (
                        <>
                            <Button variant="destructive" className="font-bold bg-red-500 hover:bg-red-600 shadow-sm transition-all text-white h-full" disabled={loading} onClick={handleCancel}>
                                <Ban className="w-4 h-4 mr-2 font-bold" /> CANCEL
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm transition-all h-full" disabled={loading} onClick={handleRequestApprove}>
                                <Send className="w-4 h-4 mr-2 text-green-100 font-bold" /> {isCreatorBack ? 'Resend' : 'Request Approve'}
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
                                <div className="flex gap-2">
                                    <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm transition-all" onClick={openAddMainKey}>
                                        <Plus className="w-4 h-4 mr-2" /> Add/Edit Manpower Key Driver
                                    </Button>
                                    <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 font-bold shadow-sm transition-all" onClick={openCopyModal}>
                                        <FileText className="w-4 h-4 mr-2" /> COPY
                                    </Button>
                                </div>
                            ) : <div></div>}
                        </div>
                        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-md bg-white">
                            <div className="relative">
                                 <Table className="w-full text-[12px] table-fixed border-collapse">
                                    <TableHeader className="bg-slate-100 border-b border-slate-200 sticky top-0 z-30 shadow-xs">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[40px]"></TableHead>
                                            <TableHead className="font-bold text-slate-800 min-w-[150px]">Manpower Key Driver</TableHead>
                                            <TableHead className="font-bold text-slate-800 text-center border-l border-slate-200 w-[80px]">Unit</TableHead>
                                            <TableHead className="font-bold text-slate-800 text-center border-l border-slate-200 w-[80px]">Type</TableHead>
                                            <TableHead className="font-bold text-slate-800 border-l border-slate-200 min-w-[120px] px-2">Definition</TableHead>
                                            <TableHead className="font-bold text-slate-800 text-center border-l border-slate-200 w-[70px] px-1">Coeff.</TableHead>
                                            <TableHead className="font-bold text-slate-800 text-center border-l border-slate-200 w-[60px] px-1">Weight(%)</TableHead>
                                            {allYears.map(y => (
                                                <TableHead key={y} className={`font-bold text-right border-l border-slate-200 w-[65px] px-1 whitespace-nowrap leading-tight ${getYearColor(y)}`}>
                                                    {getYearLabel(y)}
                                                </TableHead>
                                            ))}
                                            <TableHead className="font-bold text-slate-800 border-l border-slate-200 min-w-[100px] px-2 truncate">Remark</TableHead>
                                            {!isReadOnly && <TableHead className="w-[60px] border-l border-slate-200 text-center">Edit</TableHead>}
                                            {!isReadOnly && <TableHead className="w-[60px] text-center">Delete</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mkdData.map((driver: MappedMKDDriver) => {
                                            const isIndex = driver.type === 'Index';
                                            const allSubs = driver.subItems;

                                            return (
                                                <React.Fragment key={driver.id}>
                                                    {/* Main Row */}
                                                    <TableRow className="bg-blue-50/20 hover:bg-blue-50/20 border-t-2 border-t-slate-100">
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
                                                            <Badge 
                                                                variant="outline" 
                                                                className={`rounded-sm font-bold text-[10px] px-1.5 uppercase tracking-wide border ${
                                                                    isIndex 
                                                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                }`}
                                                            >
                                                                {driver.type}
                                                            </Badge>
                                                        </TableCell>
                                                        
                                                        <TableCell className="border-l border-slate-100 px-2" title={driver.definition}>
                                                            <div className="truncate max-w-[120px]">{driver.definition}</div>
                                                        </TableCell>
                                                        <TableCell className="text-center border-l border-slate-100 font-medium text-purple-700 px-1">
                                                            {(Number(driver.coefficient) || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}
                                                        </TableCell>
                                                        
                                                        <TableCell className="text-center font-bold border-l border-slate-100 px-1">{driver.weight}</TableCell>
                                                        
                                                        {allYears.map(y => {
                                                            const displayValue = driver.mainYears[y] || 0;
                                                            return (
                                                                <TableCell key={y} className={`text-right border-l border-slate-100 px-1 ${getYearColor(y)}`}>
                                                                    {displayValue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                                </TableCell>
                                                            );
                                                        })}
                                                        
                                                        <TableCell className="border-l border-slate-100 truncate max-w-[100px] px-2" title={driver.remark}>
                                                            {driver.remark}
                                                        </TableCell>

                                                        {!isReadOnly && (
                                                            <TableCell className="p-2 text-center border-l border-slate-100">
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
                                                            </TableCell>
                                                        )}
                                                        {!isReadOnly && (
                                                            <TableCell className="p-2 text-center">
                                                                {(!isIndex || driver.subItems.length === 0) && (
                                                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteKey(driver.id)} className="h-6 w-6 text-red-500">
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>

                                                    {/* Sub Rows */}
                                                    {isIndex && allSubs.map((sk: MappedSubItem) => (
                                                        <TableRow key={sk.id} className="bg-white hover:bg-transparent">
                                                            <TableCell></TableCell>
                                                            <TableCell></TableCell>
                                                            <TableCell className="border-l border-slate-100"></TableCell>
                                                            <TableCell className="border-l border-slate-100"></TableCell>
                                                            <TableCell className="border-l border-slate-100 px-2">{sk.definition}</TableCell>
                                                            <TableCell className="text-center border-l border-slate-100 font-medium text-purple-700 px-1">
                                                                {(Number(sk.coefficient) || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}
                                                            </TableCell>
                                                            <TableCell className="border-l border-slate-100"></TableCell>
                                                            {allYears.map(y => (
                                                                <TableCell key={y} className={`text-right border-l border-slate-100 font-medium px-1 ${getYearColor(y)}`}>
                                                                    {(sk.years[y] || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="border-l border-slate-100 truncate max-w-[100px] px-2" title={sk.remark}>{sk.remark}</TableCell>
                                                            {!isReadOnly && (
                                                                <TableCell className="p-2 text-center border-l border-slate-100">
                                                                    <Button size="icon" variant="ghost" onClick={() => openEditSubKey(sk, driver.id)} className="h-6 w-6 text-blue-500"><Edit className="w-3.5 h-3.5" /></Button>
                                                                </TableCell>
                                                            )}
                                                            {!isReadOnly && (
                                                                <TableCell className="p-2 text-center">
                                                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteKey(sk.id)} className="h-6 w-6 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    ))}

                                                    {isIndex && driver.subItems.length > 0 && (
                                                        <TableRow className="bg-[#f1e8e1]">
                                                            <TableCell colSpan={7}></TableCell>
                                                            {allYears.map(y => {
                                                                const parentVal = driver.mainYears[y] || 0;
                                                                const subSum = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                                                const total = parentVal + subSum;
                                                                return (
                                                                    <TableCell key={y} className={`text-right font-bold border-l border-white/50 px-1 ${getYearColor(y)}`}>
                                                                        {total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                            <TableCell colSpan={isReadOnly ? 1 : 3} className="border-l border-white/50"></TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {mkdData.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={isReadOnly ? 9 + allYears.length : 11 + allYears.length} className="text-center py-12 text-slate-500">
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
                            <Button className="bg-green-600 hover:bg-green-700 font-bold" onClick={handleExportExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export to Excel
                            </Button>
                        </div>
                        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-md bg-white">
                            <Table className="w-full text-[12px] table-fixed border-collapse">
                                <TableHeader className="bg-slate-100 border-b border-slate-200">
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
                                        const sumMap: Record<number, number> = {};
                                        allYears.forEach(y => {
                                            const parentVal = driver.mainYears[y] || 0;
                                            const subSum = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                            sumMap[y] = parentVal + subSum;
                                        });
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
                    <div className="animate-in fade-in duration-300 w-[800px]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-slate-600 text-sm">
                                <p className="font-bold text-slate-700">*Remark:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                                    <li>Maximum File Size: 15MB</li>
                                    <li>Extension: PDF</li>
                                    <li>เอกสารเพื่อประกอบการกรอกข้อมูล MKD ที่ได้รับอนุมัติหรือเป็นไปตามแผนงานของสายงาน</li>
                                </ul>
                            </div>
                            {!isReadOnly && (
                                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm font-bold" onClick={() => setIsFileModalOpen(true)}>
                                    <Upload className="w-4 h-4 mr-2" /> Add File
                                </Button>
                            )}
                        </div>
                        
                        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-md bg-white">
                            <Table className="w-full text-[13px] table-fixed border-collapse">
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
                                        return (
                                            <TableRow key={idx} className="">
                                                <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                                <TableCell className="border-l font-medium">{file.FileName || file.fileName}</TableCell>
                                                <TableCell className="border-l text-center">
                                                    <Button variant="ghost" className="h-auto hover:bg-blue-50 flex flex-col items-center justify-center space-y-1 mx-auto" onClick={() => openSafeApiPath(buildFilesProxyPath(header.RequestNo, file.FileUpload))}>
                                                        <FileText className="w-6! h-6! text-blue-500" />
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
                                placeholder="ระบุถ้ามีบันทึกเพิ่มเติม..."
                                value={note || ''}
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
                <DialogContent 
                    className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0"
                    onInteractOutside={(e) => e.preventDefault()}
                >
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
                                            <TableRow key={driver.id} className="hover:bg-transparent">
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
                                                        <Badge 
                                                            variant="outline" 
                                                            className={`rounded font-bold text-[10px] px-1.5 uppercase tracking-wider border ${
                                                                driver.type === 'Index' 
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            }`}
                                                        >
                                                            {driver.type}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {isEditing ? (
                                                        <Input 
                                                            type="number" 
                                                            min="0"
                                                            className="h-8 bg-white text-center shadow-sm" 
                                                            value={mainKeyForm.weight || '0'} 
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={e => {
                                                                let val = e.target.value;
                                                                if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                                                                    val = val.substring(1);
                                                                }
                                                                if (parseFloat(val) < 0) return;
                                                                setMainKeyForm(prev => ({...prev, weight: val}));
                                                            }} 
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
                                        <TableRow className="bg-blue-50/40 hover:bg-blue-50/40">
                                            <TableCell className="text-center font-bold text-slate-400">+</TableCell>
                                            <TableCell>
                                                <Select value={mainKeyForm.keyManId} onValueChange={v => setMainKeyForm(prev => ({...prev, keyManId: v}))}>
                                                    <SelectTrigger className="h-8 bg-white shadow-sm w-full"><SelectValue placeholder="เลือก..." /></SelectTrigger>
                                                    <SelectContent position="popper" className="max-h-[300px] w-(--radix-select-trigger-width) [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                                                        {masterKeys.map((m: MasterKey) => (
                                                            <SelectItem key={m.KeyManID || m.MasterId} value={(m.KeyManID || m.MasterId)?.toString() || ''}>
                                                                {m.KeyManName}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input className="h-8 bg-white shadow-sm text-center" value={mainKeyForm.unit || ''} onChange={e => setMainKeyForm(prev => ({...prev, unit: e.target.value}))} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Select value={mainKeyForm.keyType} onValueChange={v => setMainKeyForm(prev => ({...prev, keyType: v}))}>
                                                    <SelectTrigger className="h-8 bg-white shadow-sm"><SelectValue placeholder="Type" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">Index</SelectItem>
                                                        <SelectItem value="2">Uniform</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input 
                                                    type="number" 
                                                    min="0"
                                                    className="h-8 bg-white text-center shadow-sm" 
                                                    value={mainKeyForm.weight || '0'} 
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => {
                                                        let val = e.target.value;
                                                        // ลบ 0 ข้างหน้าถ้าพิมตัวเลขต่อ (e.g. "04" -> "4")
                                                        if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                                                            val = val.substring(1);
                                                        }
                                                        if (parseFloat(val) < 0) return;
                                                        setMainKeyForm(prev => ({...prev, weight: val}));
                                                    }} 
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
                <DialogContent 
                    className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <div className="p-6 pb-2">
                        <DialogHeader className="flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle>
                                    {subKeyForm.parentId === '0' ? 'Edit Yearly Data' : (subKeyForm.manDriverKeyId ? 'Edit Detail' : 'Add Detail')}
                                </DialogTitle>
                                <DialogDescription className="sr-only">หน้าต่างสำหรับแก้ไขข้อมูลรายปีหรือข้อมูลย่อย</DialogDescription>
                            </div>
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
                                                    value={subKeyForm.definition || ''} 
                                                    onChange={(e) => setSubKeyForm(prev => ({...prev, definition: e.target.value}))} 
                                                    placeholder="ระบุรายละเอียด..."
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="coefficient" className="text-blue-700 text-xs font-bold uppercase tracking-wide">Coefficient</Label>
                                                <select 
                                                    id="coefficient" 
                                                    className="mt-1 h-8 w-1/3 shadow-inner rounded-md border border-input bg-background px-3 text-sm"
                                                    value={subKeyForm.coefficient || '1'} 
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
                                                    value={subKeyForm.remark || ''} 
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
                                                        <TableRow key={y} className="not-last:border-b border-slate-100">
                                                            <TableCell className="text-center font-semibold w-1/2 bg-slate-50/50">
                                                                <span className={getYearColor(y)}>{getYearLabel(y)}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center w-1/2 border-l">
                                                                <Input
                                                                    id={`yearly-input-${index}`}
                                                                    type="number"
                                                                    min="0"
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
                                                                        let val = e.target.value;
                                                                        // ลบ 0 ข้างหน้าถ้าพิมตัวเลขต่อ (e.g. "04" -> "4")
                                                                        if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                                                                            val = val.substring(1);
                                                                        }
                                                                        if (parseFloat(val) < 0) return;
                                                                        setSubKeyForm(prev => ({
                                                                            ...prev,
                                                                            yearlyData: {
                                                                                ...prev.yearlyData,
                                                                                [y]: val
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
                        <DialogDescription className="sr-only">หน้าต่างสำหรับอัปโหลดไฟล์แนบ</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">

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
            {/* Confirm Dialog - Redesigned to match System Theme (AntD style) */}
            <Dialog open={confirmState.isOpen} onOpenChange={(open) => !open && setConfirmState(prev => ({...prev, isOpen: false}))}>
                <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border border-slate-200 shadow-xl rounded-lg">
                    <div className="p-5 border-b bg-white">
                        <div className="flex items-center gap-3">
                            <div className="shrink-0">
                                <Info className="w-5 h-5 text-blue-600" />
                            </div>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold text-slate-800">{confirmState.title}</DialogTitle>
                                <DialogDescription className="sr-only">หน้าต่างยืนยันการทำรายการ</DialogDescription>
                            </DialogHeader>
                        </div>
                    </div>
                    <div className="p-6 bg-white">
                        <p className="text-slate-600 text-[15px]">{confirmState.message}</p>
                    </div>
                    <div className="p-4 bg-slate-50 flex items-center justify-end gap-2 border-t text-right">
                        <Button 
                            variant="outline" 
                            onClick={() => setConfirmState(prev => ({...prev, isOpen: false}))}
                            className="h-9 px-6 text-slate-600 border-slate-300 hover:bg-slate-100"
                        >
                            {confirmState.cancelText}
                        </Button>
                        <Button 
                            onClick={() => {
                                setConfirmState(prev => ({...prev, isOpen: false}));
                                confirmState.onConfirm();
                            }}
                            className="h-9 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold font-prompt"
                        >
                            {confirmState.confirmText}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Approve Confirmation Modal */}
            <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-600">
                           <Check className="w-5 h-5" /> CONFIRM APPROVAL
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-slate-600">คุณต้องการยืนยันการเห็นชอบรายการนี้ใช่หรือไม่?</p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-5">
                        <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>CANCEL</Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleApproveAction} disabled={loading}>CONFIRM</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Reason Modal */}
            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                           <X className="w-5 h-5" /> REJECT WITH REASON
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <p className="text-sm text-slate-600">กรุณาระบุเหตุผลที่ไม่เห็นชอบ :</p>
                        <Textarea 
                            placeholder="ระบุเหตุผลที่นี่..."
                            className="min-h-[100px] shadow-inner"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-5">
                        <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>CANCEL</Button>
                        <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={handleRejectAction} disabled={loading}>REJECT</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Copy History Modal */}
            <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-700">
                           <FileText className="w-5 h-5" /> COPY FROM HISTORY
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto py-4">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[150px]">Req. No.</TableHead>
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px] text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isFetchingHistory ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <p className="text-slate-500 text-xs">กำลังโหลดข้อมูลประวัติ...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : historyData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-slate-400">
                                            ไม่พบข้อมูลประวัติ
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    historyData.map((item) => (
                                        <TableRow key={item.ManDriverID} className="hover:bg-blue-50/50">
                                            <TableCell className="font-bold text-blue-800">{item.RequestNo || `-`}</TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                {dayjs(item.CreateDate).format('DD/MM/YYYY')}
                                            </TableCell>
                                            <TableCell className="text-xs line-clamp-1" title={item.Description}>
                                                {item.Description}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 font-bold text-xs"
                                                    onClick={() => handleCopyFrom(item.ManDriverID)}
                                                >
                                                    COPY
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="bg-slate-50 p-4 rounded-b-lg">
                        <Button variant="outline" onClick={() => setIsCopyModalOpen(false)}>CLOSE</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
