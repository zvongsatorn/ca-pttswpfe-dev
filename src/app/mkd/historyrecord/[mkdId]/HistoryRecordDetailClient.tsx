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
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { 
    ArrowLeft, FileSpreadsheet, FileText, Container, 
    Info, Users, CheckCircle, Plus, Edit, Trash2, Check, X, Upload
} from 'lucide-react';
import { updateManDriverStatus, saveMainKey, saveDetailKey, deleteMainKey, getMKDDetails, getMKDHeadcount, uploadMKDFile, deleteMKDFile, saveMKDHeadcount, updateMKDNote } from '@/services/mkdService';

interface MKDKey {
    ManDriverKeyID: number;
    ParentID?: number;
    KeyManID?: number;
    KeyType?: number;
    KeyManName?: string;
    Name?: string;
    Unit?: string;
    Weight?: number;
    Definition?: string;
    Coefficient?: number;
    Remark?: string;
}

interface MKDYear {
    ManDriverKeyYearID?: number;
    ManDriverKeyID: number;
    KeyYear: string | number;
    KeyAmount: number;
}

interface MKDFile {
    FileName?: string;
    fileName?: string;
    FileUpload: string;
}

interface HeadCountRecord {
    HeadCountType: string;
    HeadCountTypeName: string;
}

interface HeadCountYear {
    HeadCountType: string;
    KeyYear: string | number;
    HeadCount: number;
}

interface MKDSummary {
    ManDriverKeyID: number | string;
    KeyYear: number | string;
    KeySumAmount: number;
}

interface MasterKey {
    MasterId: number | string;
    KeyManID?: number | string;
    KeyManName: string;
}

interface MappedSubItem {
    id: string;
    definition: string;
    coefficient: number;
    remark: string;
    years: Record<number, number>;
    yearIds: Record<number, string>;
}

interface MKDSummary {
    ManDriverKeyID: number | string;
    KeyYear: number | string;
    KeySumAmount: number;
}

interface HistoryRecordDetailClientProps {
    mkdId: string;
    token: string;
    currentUser: {
        employeeID?: string;
        EmployeeID?: string;
    } | null;
    initialData: {
        header: {
            RequestNo?: string;
            RequestDate?: string;
            OrgUnitName?: string;
            UnitName?: string;
            ManDriverStatus?: number;
            StatusName?: string;
            EffectiveYear?: number;
            Remark?: string;
            Note?: string;
        };
        keys: MKDKey[];
        years: MKDYear[];
        files: MKDFile[];
        summary?: MKDSummary[];
        headcount?: {
            headCounts: HeadCountRecord[];
            years: HeadCountYear[];
        };
    };
    masterKeys: MasterKey[];
}

export default function HistoryRecordDetailClient({ mkdId, token, currentUser, initialData, masterKeys }: HistoryRecordDetailClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'MANPOWER' | 'HEADCOUNT' | 'SUMMARY' | 'FILES' | 'NOTE'>('MANPOWER');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirm Dialog State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const openConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmState({ isOpen: true, title, message, onConfirm });
    };

    const [loading, setLoading] = useState(false);

    // Reactive Data State
    const [localHeader, setLocalHeader] = useState(initialData.header || {});
    const [localKeys, setLocalKeys] = useState<MKDKey[]>(initialData.keys || []);
    const [localYears, setLocalYears] = useState<MKDYear[]>(initialData.years || []);
    const [localFiles, setLocalFiles] = useState<MKDFile[]>(initialData.files || []);
    const [localSummary, setLocalSummary] = useState<MKDSummary[]>(initialData.summary || []);
    const [localHeadcount, setLocalHeadcount] = useState(initialData.headcount || { headCounts: [], years: [] });

    // Modal States
    const [isMainModalOpen, setIsMainModalOpen] = useState(false);
    const [isAddingMainRow, setIsAddingMainRow] = useState(false);

    // Headcount State
    const [isEditingHeadcount, setIsEditingHeadcount] = useState(false);
    const [headcountForm, setHeadcountForm] = useState<Record<string, string>>({});

    // File State
    const [note, setNote] = useState<string>(initialData.header?.Remark || initialData.header?.Note || '');
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [fileForm, setFileForm] = useState<{file: File | null, customName: string}>({file: null, customName: ''});
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const refreshData = async () => {
        try {
            const [detailRes, headcountRes] = await Promise.all([
                getMKDDetails(mkdId, token),
                getMKDHeadcount(mkdId, undefined, token)
            ]);
            
            if (detailRes?.success && detailRes.data) {
                setLocalHeader(detailRes.data.header || {});
                setLocalKeys(detailRes.data.keys || []);
                setLocalYears(detailRes.data.years || []);
                setLocalFiles(detailRes.data.files || []);
                setLocalSummary(detailRes.data.summary || []);
            }
            if (headcountRes?.success && headcountRes.data) {
                setLocalHeadcount(headcountRes.data);
            }
        } catch (error) {
            console.error("Error refreshing data:", error);
        }
    };

    // Header Data Aliases
    const header = localHeader;

    const headcountData = useMemo(() => {
        const hcs = localHeadcount.headCounts || [];
        const unique = new Map<number | string, HeadCountRecord>();
        hcs.forEach(h => {
            if (!unique.has(h.HeadCountType)) {
                unique.set(h.HeadCountType, h);
            }
        });
        return Array.from(unique.values());
    }, [localHeadcount.headCounts]);

    const headcountYears = localHeadcount.years || [];

    const effectiveYear = header.EffectiveYear || 0;
    
    // Editable if status is 1 (e.g. Reject/Draft equivalent for history record)
    const isReadOnly = header.ManDriverStatus !== 1;

    const allYears = useMemo(() => {
        const yearsArr = localYears || [];
        const years = Array.from(new Set(yearsArr.map((y: MKDYear) => Number(y.KeyYear))));
        return years.sort((a, b) => a - b);
    }, [localYears]);

    const mkdData = useMemo(() => {
        const keys = localKeys || [];
        const years = localYears || [];
        const mainKeys = keys.filter((k: MKDKey) => !k.ParentID || Number(k.ParentID) === 0);
        
        return mainKeys.map((mk: MKDKey) => {
            const isUniform = mk.KeyType === 2;
            const currentIdStr = mk.ManDriverKeyID?.toString();
            
            const subKeys = keys.filter((sk: MKDKey) => sk.ParentID?.toString() === currentIdStr && currentIdStr !== undefined);
            
            const mainYears: Record<number, number> = {};
            const mainYearIds: Record<number, string> = {};
            
            if (isUniform || subKeys.length === 0) {
                const yrData = years.filter((y: MKDYear) => y.ManDriverKeyID?.toString() === currentIdStr);
                allYears.forEach(y => {
                    const yearRecord = yrData.find((sy: MKDYear) => Number(sy.KeyYear) === y);
                    mainYears[y] = Number(yearRecord?.KeyAmount) || 0;
                    mainYearIds[y] = (yearRecord?.ManDriverKeyYearID || 0).toString();
                });
            }

            const mappedSubItems = subKeys.map((sk: MKDKey) => {
                const skYears = years.filter((y: MKDYear) => y.ManDriverKeyID === sk.ManDriverKeyID);
                const yearMap: Record<number, number> = {};
                const yearIdMap: Record<number, string> = {};
                allYears.forEach(y => {
                    const yearRecord = skYears.find((sy: MKDYear) => Number(sy.KeyYear) === y);
                    yearMap[y] = Number(yearRecord?.KeyAmount) || 0;
                    yearIdMap[y] = (yearRecord?.ManDriverKeyYearID || 0).toString();
                });
                return { 
                    id: sk.ManDriverKeyID.toString(), 
                    definition: sk.Definition || '', 
                    coefficient: sk.Coefficient || 1, 
                    remark: sk.Remark || '', 
                    years: yearMap,
                    yearIds: yearIdMap
                };
            });

            // [REMOVED] INDEX automatic sum calculation here to keep Parent row independent as per user request
            // if (!isUniform) {
            //     allYears.forEach(y => {
            //         mainYears[y] = mappedSubItems.reduce((acc, curr) => acc + ((curr.years[y] || 0) * (Number(curr.coefficient) || 1)), 0);
            //     });
            // }

            return { 
                id: mk.ManDriverKeyID.toString(), 
                keyManId: mk.KeyManID?.toString() || '',
                name: mk.KeyManName || mk.Name || mk.Unit || '', 
                unit: mk.Unit || '', 
                type: mk.KeyType === 1 ? 'Index' : 'Uniform', 
                typeValue: mk.KeyType,
                weight: mk.Weight || 0, 
                definition: mk.Definition || '',
                coefficient: mk.Coefficient || 1,
                remark: mk.Remark || '',
                mainYears: mainYears,
                mainYearIds: mainYearIds,
                subItems: mappedSubItems 
            };
        });
    }, [localKeys, localYears, allYears]);

    // Build summary lookup: { ManDriverKeyID -> { year -> KeySumAmount } }
    const summaryMap = useMemo(() => {
        const map: Record<string, Record<number, number>> = {};
        localSummary.forEach((s: MKDSummary) => {
            const keyId = s.ManDriverKeyID?.toString();
            if (!map[keyId]) map[keyId] = {};
            map[keyId][Number(s.KeyYear)] = Number(s.KeySumAmount) || 0;
        });
        return map;
    }, [localSummary]);

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

    // Main Key Actions
    const openAddMainKey = () => {
        setIsAddingMainRow(false);
        setIsMainModalOpen(true);
    };

    const openEditMainKey = (key: { id: string | number; keyManId: string | number; unit: string; typeValue?: string | number; weight: string | number }) => {
        setMainKeyForm({
            manDriverKeyId: key.id.toString(),
            keyManId: key.keyManId.toString(),
            unit: key.unit,
            keyType: (key.typeValue || '').toString(),
            weight: key.weight.toString()
        });
        setIsAddingMainRow(true); // Re-use the input row for editing
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
            refreshData();
            setIsMainModalOpen(false);
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
                    yearlyData: allYears.map((y: number) => ({ id: 0, year: y.toString(), amount: 0 }))
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
            const yearlyDataArray = allYears.map((y: number) => ({
                id: Number((subKeyForm.yearlyIds as Record<number, string>)?.[y]) || 0,
                year: y.toString(),
                amount: Number((subKeyForm.yearlyData as Record<number, string | number>)?.[y]) || 0
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
    const startEditingHeadcount = () => {
        const initialForm: Record<string, string> = {};
        headcountYears.forEach((hy: HeadCountYear) => {
            initialForm[`${hy.HeadCountType}-${hy.KeyYear}`] = hy.HeadCount.toString();
        });
        setHeadcountForm(initialForm);
        setIsEditingHeadcount(true);
    };

    const handleSaveHeadcount = async () => {
        try {
            setLoading(true);
            const updateData = Object.entries(headcountForm).map(([key, val]) => {
                const [type, year] = key.split('-');
                return { HeadCountType: type, KeyYear: year, HeadCount: Number(val) || 0 };
            });
            await saveMKDHeadcount(mkdId, updateData, token);
            toast.success("บันทึก Headcount สำเร็จ");
            setIsEditingHeadcount(false);
            
            // Refresh headcount data
            const headcountRes = await getMKDHeadcount(mkdId, undefined, token);
            if (headcountRes?.success) {
                setLocalHeadcount(headcountRes.data);
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการบันทึก Headcount");
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
                toast.error("ไฟล์ต้องมีขนาดไม่เกิน 15MB");
                e.target.value = '';
                return;
            }
            setFileForm(prev => ({...prev, file}));
        }
    };

    const handleUploadFile = async () => {
        if (!fileForm.file) return;
        try {
            setLoading(true);
            const finalName = fileForm.customName.trim() || fileForm.file.name;
            await uploadMKDFile(mkdId, fileForm.file, currentUser?.employeeID || 'SYSTEM', token, finalName);
            toast.success("อัปโหลดไฟล์สำเร็จ");
            setIsFileModalOpen(false);
            setFileForm({file: null, customName: ''});
            
            // Refresh
            const detailRes = await getMKDDetails(mkdId, token);
            if(detailRes?.success) setLocalFiles(detailRes.data.files);
        } catch {
            toast.error("เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFile = async (fileName: string) => {
        openConfirm('ยืนยันการลบไฟล์', 'คุณต้องการลบไฟล์นี้ใช่หรือไม่?', async () => {
            try {
                setLoading(true);
                await deleteMKDFile(mkdId, fileName, token);
                toast.success("ลบไฟล์สำเร็จ");
                const detailRes = await getMKDDetails(mkdId, token);
                if(detailRes?.success) setLocalFiles(detailRes.data.files);
            } catch {
                toast.error("เกิดข้อผิดพลาดในการลบไฟล์");
            } finally {
                setLoading(false);
            }
        });
    };

    const handleSaveNote = async () => {
        try {
            setLoading(true);
            await updateMKDNote(mkdId, note, token);
            toast.success("บันทึกหมายเหตุสำเร็จ");
        } catch {
            toast.error("เกิดข้อผิดพลาดในการบันทึกหมายเหตุ");
        } finally {
            setLoading(false);
        }
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

    const handleConfirm = () => {
        const totalWeight = mkdData.reduce((sum, d) => sum + (Number(d.weight) || 0), 0);
        if (totalWeight !== 100) {
            toast.error(`Weight รวมต้องเท่ากับ 100% (ปัจจุบัน: ${totalWeight}%) กรุณาแก้ไขก่อนยืนยันข้อมูล`);
            return;
        }
        openConfirm('ยืนยันข้อมูล', 'ต้องการยืนยันใช่หรือไม่?', async () => {
            try {
                setIsSubmitting(true);
                const res = await updateManDriverStatus(mkdId, 2, currentUser?.EmployeeID || currentUser?.employeeID || 'SYSTEM', token);
                if (res?.success) {
                    toast.success('ยืนยันข้อมูลเรียบร้อยแล้ว');
                    router.push('/mkd/history');
                } else {
                    throw new Error('Failed to confirm');
                }
            } catch (err: unknown) {
                const error = err as Error;
                toast.error(error.message || 'Error occurred');
            } finally {
                setIsSubmitting(false);
            }
        });
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

            mkdData.forEach(driver => {
                const sumMap: Record<number, number> = {};
                allYears.forEach(y => {
                    const summaryValue = summaryMap[driver.id]?.[y];
                    if (summaryValue !== undefined) {
                        sumMap[y] = summaryValue;
                    } else {
                        const parentVal = driver.mainYears[y] || 0;
                        const subSum = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                        sumMap[y] = parentVal + subSum;
                    }
                });
                const rowData = [driver.name, driver.unit, driver.weight, ...allYears.map(y => sumMap[y] || 0)];
                worksheet.addRow(rowData);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `MKD_Record_${header.RequestNo}_${dayjs().format('YYYYMMDD')}.xlsx`);
        } catch {
            toast.error("Export failed");
        }
    };

    return (
        <div className="space-y-4">
            <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 shadow-lg py-2">
                <CardContent>
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-white mb-0">Manpower Key Driver (Record)</h1>
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
                    <div className="md:col-span-3">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">Request No.</Label>
                        <Input value={header.RequestNo || '-'} readOnly className="bg-gray-50 border-gray-200 font-medium text-blue-900 shadow-inner" />
                    </div>
                    <div className="md:col-span-3">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">Date</Label>
                        <Input value={dayjs(header.RequestDate).format('DD/MM/YYYY')} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                    </div>
                    <div className="md:col-span-6">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">หน่วยงาน (OrgUnit)</Label>
                        <Input value={header.OrgUnitName || header.UnitName || '-'} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0 justify-end h-[40px]">
                    {header.ManDriverStatus === 1 && (
                        <Button className="bg-green-600 hover:bg-green-700 font-medium min-w-max shadow-sm transition-all text-white h-full" onClick={handleConfirm} disabled={isSubmitting}>
                            {isSubmitting ? <span className="animate-spin mr-2">⏳</span> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Confirm
                        </Button>
                    )}
                    <Button variant="outline" className="text-white bg-slate-500 hover:bg-slate-600 hover:text-white border-slate-300 font-medium min-w-max shadow-sm transition-all h-full" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                </div>
            </div>

            <div className="border-b border-blue-200 mb-6 bg-white/50 backdrop-blur-sm sticky top-0 z-10 px-2 pt-2">
                <div className="flex gap-1 md:gap-4 overflow-x-auto">
                    {[
                        { id: 'MANPOWER', label: 'Manpower Key Driver', icon: Container },
                        { id: 'HEADCOUNT', label: 'Head Count', icon: Users },
                        { id: 'SUMMARY', label: 'Summary', icon: FileSpreadsheet },
                        { id: 'FILES', label: 'File Attach', icon: FileText },
                        { id: 'NOTE', label: 'Note', icon: Info },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'MANPOWER' | 'HEADCOUNT' | 'SUMMARY' | 'FILES' | 'NOTE')}
                                className={`pb-3 px-4 font-semibold text-sm transition-all relative whitespace-nowrap flex items-center gap-2
                                    ${isActive ? "text-blue-700" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-t-lg"}`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                                {tab.label}
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
                            {!isReadOnly && (
                                <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm transition-all text-white" onClick={openAddMainKey}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Manpower Key Driver
                                </Button>
                            )}
                        </div>
                        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-md bg-white">
                            <Table className="w-full text-[12px] table-fixed border-collapse">
                                <TableHeader className="bg-slate-100 border-b border-slate-200">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[40px]"></TableHead>
                                        <TableHead className="font-bold text-slate-800 min-w-[180px]">Manpower Key Driver</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[80px]">Unit</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[80px]">Type</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l min-w-[150px]">Definition</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[100px]">Coefficient</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[90px]">Weight(%)</TableHead>
                                        {allYears.map(y => (
                                            <TableHead key={y} className={`font-bold text-right border-l w-[90px] whitespace-pre-wrap leading-tight ${getYearColor(y)}`}>
                                                {getYearLabel(y)}
                                            </TableHead>
                                        ))}
                                        <TableHead className="font-bold text-slate-800 border-l min-w-[150px]">Remark</TableHead>
                                        {!isReadOnly && (
                                            <>
                                                <TableHead className="w-[40px] border-l border-slate-200"></TableHead>
                                                <TableHead className="w-[40px]"></TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mkdData.map((driver) => (
                                        <React.Fragment key={driver.id}>
                                            <TableRow className="border-t border-slate-200 hover:bg-transparent">
                                                <TableCell className="p-2 text-center">
                                                    {driver.type === 'Index' && !isReadOnly && (
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 rounded-full hover:bg-green-100" title="เพิ่มรายการย่อย" onClick={() => openAddSubKey(driver.id)}>
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-bold text-blue-800">{driver.name}</TableCell>
                                                <TableCell className="text-center font-medium border-l border-slate-100">{driver.unit}</TableCell>
                                                <TableCell className="text-center border-l border-slate-100">
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
                                                </TableCell>
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                                <TableCell className="text-center font-bold border-l border-slate-100">{driver.weight}</TableCell>
                                                {allYears.map(y => {
                                                    const val = driver.mainYears[y] || 0;
                                                    return (
                                                        <TableCell key={y} className={`text-right font-semibold border-l border-slate-100 ${getYearColor(y)}`}>
                                                            {val > 0 ? val.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '0.00'}
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                                {!isReadOnly && (
                                                    <>
                                                        <TableCell className="p-2 text-center border-l border-slate-100">
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-500" onClick={() => {
                                                                    openEditSubKey({
                                                                        id: driver.id,
                                                                        definition: driver.definition,
                                                                        coefficient: driver.coefficient,
                                                                        remark: driver.remark,
                                                                        years: driver.mainYears,
                                                                        yearIds: driver.mainYearIds
                                                                    }, '0');
                                                                }}>
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="p-2 text-center">
                                                            {!(driver.type === 'Index' && driver.subItems && driver.subItems.length > 0) && (
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleDeleteKey(driver.id)}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>

                                            {driver.subItems.map((sk: MappedSubItem) => (
                                                <TableRow key={sk.id} className="bg-white hover:bg-transparent">
                                                    <TableCell></TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    <TableCell className="border-l border-slate-100">{sk.definition}</TableCell>
                                                    <TableCell className="text-right border-l border-slate-100">{sk.coefficient}</TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    {allYears.map(y => (
                                                        <TableCell key={y} className={`text-right border-l border-slate-100 ${getYearColor(y)}`}>
                                                            {(sk.years[y] || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="border-l border-slate-100 truncate max-w-[150px]" title={sk.remark}>{sk.remark}</TableCell>
                                                    {!isReadOnly && (
                                                        <>
                                                            <TableCell className="p-2 text-center border-l border-slate-100">
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-500" onClick={() => openEditSubKey(sk, driver.id)}>
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TableCell>
                                                            <TableCell className="p-2 text-center">
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleDeleteKey(sk.id)}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            ))}

                                            {driver.type === 'Index' && driver.subItems.length > 0 && (
                                                <TableRow className="bg-[#f1e8e1]">
                                                    <TableCell colSpan={7}></TableCell>
                                                    {allYears.map(y => {
                                                        const summaryValue = summaryMap[driver.id]?.[y];
                                                        const total = summaryValue !== undefined ? summaryValue : (driver.mainYears[y] || 0) + driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                                        return (
                                                            <TableCell key={y} className={`text-right font-bold border-l border-white/50 ${getYearColor(y)}`}>
                                                                {total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell colSpan={isReadOnly ? 1 : 3} className="border-l border-white/50"></TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {mkdData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={isReadOnly ? 8 + allYears.length : 10 + allYears.length} className="text-center py-12 text-slate-500">
                                                ไม่มีข้อมูล
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {activeTab === 'HEADCOUNT' && headcountData && (
                    <div className="animate-in fade-in duration-300 w-[950px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Headcount</h3>
                            {!isReadOnly && !isEditingHeadcount && (
                                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm font-bold" onClick={startEditingHeadcount}>
                                    <Edit className="w-4 h-4 mr-2" /> Edit Headcount
                                </Button>
                            )}
                            {isEditingHeadcount && (
                                <div className="space-x-2">
                                    <Button variant="outline" className="border-slate-300 text-slate-600 font-bold" onClick={() => setIsEditingHeadcount(false)}>
                                        <X className="w-4 h-4 mr-2" /> Cancel
                                    </Button>
                                    <Button className="bg-green-600 hover:bg-green-700 font-bold" onClick={handleSaveHeadcount} disabled={loading}>
                                        <Check className="w-4 h-4 mr-2" /> Save Headcount
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-md bg-white">
                            <Table className="w-full text-[13px] table-fixed border-collapse">
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-800 text-center w-[60px]">No.</TableHead>
                                        <TableHead className="font-bold text-slate-800 min-w-[150px]">Head Count</TableHead>
                                        {allYears.map(y => (
                                            <TableHead key={y} className={`font-bold text-right border-l w-[100px] whitespace-pre-wrap leading-tight ${getYearColor(y)}`}>
                                                {getYearLabel(y)}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {headcountData.map((hc: HeadCountRecord, idx: number) => {
                                        return (
                                            <TableRow key={idx} className="hover:bg-blue-50/30">
                                                <TableCell className="text-center font-medium border-slate-100">{idx + 1}</TableCell>
                                                <TableCell className="font-bold text-blue-800 border-l border-slate-100">{hc.HeadCountTypeName}</TableCell>
                                                {allYears.map(y => {
                                                    const key = `${hc.HeadCountType}-${y}`;
                                                    const yearData = headcountYears.find((hy: HeadCountYear) => hy.HeadCountType === hc.HeadCountType && Number(hy.KeyYear) === y);
                                                    return (
                                                        <TableCell key={y} className="text-right border-l font-semibold border-slate-100">
                                                            {isEditingHeadcount ? (
                                                                <Input 
                                                                    type="number"
                                                                    min="0"
                                                                    className="h-8 shadow-inner text-right min-w-[80px]"
                                                                    value={headcountForm[key] || '0'}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => {
                                                                        let val = e.target.value;
                                                                        // ลบ 0 ข้างหน้าถ้าพิมตัวเลขต่อ (e.g. "04" -> "4")
                                                                        if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                                                                            val = val.substring(1);
                                                                        }
                                                                        if (parseFloat(val) < 0) return;
                                                                        setHeadcountForm(prev => ({...prev, [key]: val }));
                                                                    }}
                                                                />
                                                            ) : (
                                                                (yearData?.HeadCount || 0).toLocaleString()
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                    {headcountData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2 + allYears.length} className="text-center py-8 text-slate-500">ไม่มีข้อมูล Headcount</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
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
                                    {mkdData.map(driver => {
                                        const sumMap: Record<number, number> = {};
                                        allYears.forEach(y => {
                                            const summaryValue = summaryMap[driver.id]?.[y];
                                            if (summaryValue !== undefined) {
                                                sumMap[y] = summaryValue;
                                            } else {
                                                const parentVal = driver.mainYears[y] || 0;
                                                const subSum = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                                sumMap[y] = parentVal + subSum;
                                            }
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
                    <div className="animate-in fade-in duration-300 w-[900px]">
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
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center font-bold text-slate-800">NO</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l min-w-[300px]">Name</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l text-center w-[120px]">File</TableHead>
                                        {!isReadOnly && <TableHead className="w-[80px] border-l"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {localFiles.map((file: MKDFile, idx: number) => {
                                        // const ext = file.FileName?.split('.').pop()?.toUpperCase() || file.fileName?.split('.').pop()?.toUpperCase() || 'PDF';
                                        return (
                                            <TableRow key={idx} className="hover:bg-slate-50/50">
                                                <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                                <TableCell className="border-l font-medium">{file.FileName || file.fileName}</TableCell>
                                                <TableCell className="border-l text-center">
                                                    <Button variant="ghost" className="h-auto p-2 hover:bg-blue-50 flex flex-col items-center justify-center space-y-1 mx-auto" onClick={() => window.open(`/api/files-proxy?path=${header.EffectiveYear}/${file.FileUpload}`, '_blank')}>
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
                                            <TableCell colSpan={isReadOnly ? 3 : 4} className="text-center py-8 text-slate-500">
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
                        <div className="bg-white border border-slate-200 rounded-lg p-2 mb-2 shadow-inner">
                            <Textarea
                                className="w-full bg-white border-0 focus-visible:ring-0 resize-y min-h-[200px] p-4 text-slate-700 text-[14px]"
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
                if (!open) { setIsAddingMainRow(false); }
            }}>
                <DialogContent 
                    className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <div className="p-6 pb-2">
                        <DialogHeader className="flex flex-row items-center justify-between">
                            <DialogTitle>Manpower Key Driver (Main)</DialogTitle>
                            {!isReadOnly && !isAddingMainRow && (
                                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm mr-10" size="sm" onClick={() => {
                                    setIsAddingMainRow(true);
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
                                        return (
                                            <TableRow key={driver.id} className="hover:bg-transparent">
                                                <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                                <TableCell className="font-medium text-slate-700">{driver.name}</TableCell>
                                                <TableCell className="text-center">{driver.unit}</TableCell>
                                                <TableCell className="text-center">
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
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-semibold text-slate-800">{driver.weight}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {!isReadOnly && (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button size="icon" variant="ghost" onClick={() => openEditMainKey(driver)} className="h-7 w-7 text-blue-500 hover:bg-blue-100"><Edit className="w-3.5 h-3.5" /></Button>
                                                            <Button size="icon" variant="ghost" onClick={() => handleDeleteKey(driver.id)} className="h-7 w-7 text-red-500 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                        </div>
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
                                                        {masterKeys?.map((m: MasterKey) => (
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
                                </TableBody>
                            </Table>
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
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wide">Manpower Key Driver</Label>
                                            <Input disabled readOnly className="bg-slate-200/80 mt-1 h-8 text-blue-800 font-semibold border-slate-300 cursor-not-allowed opacity-80" value={parentDriver?.name || ''} />
                                        </div>
                                        <div>
                                            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wide">Unit</Label>
                                            <Input disabled readOnly className="bg-slate-200/80 mt-1 h-8 text-slate-600 border-slate-300 cursor-not-allowed opacity-80" value={parentDriver?.unit || ''} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-slate-600 text-xs font-bold uppercase tracking-wide">Type</Label>
                                                <Input disabled readOnly className="bg-slate-200/80 mt-1 h-8 text-center text-slate-600 border-slate-300 cursor-not-allowed opacity-80" value={parentDriver?.type || ''} />
                                            </div>
                                            <div>
                                                <Label className="text-slate-600 text-xs font-bold uppercase tracking-wide">Weight(%)</Label>
                                                <Input disabled readOnly className="bg-slate-200/80 mt-1 h-8 text-center font-bold text-slate-600 border-slate-300 cursor-not-allowed opacity-80" value={parentDriver?.weight || ''} />
                                            </div>
                                        </div>

                                        <div className="mt-2 space-y-3 pt-3 border-t border-slate-200">
                                            <div>
                                                <Label htmlFor="definition" className="text-blue-700 text-xs font-bold uppercase tracking-wide">Definition</Label>
                                                <Textarea 
                                                    id="definition" 
                                                    className="mt-1 shadow-inner max-h-[80px] bg-white"
                                                    value={subKeyForm.definition || ''} 
                                                    onChange={(e) => setSubKeyForm(prev => ({...prev, definition: e.target.value}))} 
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
                                                    className="mt-1 shadow-inner max-h-[80px] bg-white"
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
                                                        <TableRow key={y} className="hover:bg-slate-50 not-last:border-b border-slate-100">
                                                            <TableCell className="text-center font-semibold w-1/2 bg-slate-50/50">
                                                                <span className={getYearColor(y)}>{getYearLabel(y)}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center w-1/2 border-l">
                                                                <Input
                                                                    id={`yearly-input-${index}`}
                                                                    type="number"
                                                                    min="0"
                                                                    className="h-8 text-right shadow-inner tabular-nums font-semibold"
                                                                    value={(subKeyForm.yearlyData as Record<number, string | number>)[y] === 0 ? '0' : ((subKeyForm.yearlyData as Record<number, string | number>)[y] || '')}
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
                            Save
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

            {/* Confirm Dialog */}
            <Dialog open={confirmState.isOpen} onOpenChange={(open) => !open && setConfirmState(prev => ({...prev, isOpen: false}))}>
                <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border border-slate-200 shadow-xl rounded-lg">
                    <div className="p-5 border-b bg-white">
                        <div className="flex items-center gap-3">
                            <div className="shrink-0">
                                <Info className="w-5 h-5 text-blue-600" />
                            </div>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold text-slate-800">{confirmState.title}</DialogTitle>
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
                            ยกเลิก
                        </Button>
                        <Button 
                            onClick={() => {
                                setConfirmState(prev => ({...prev, isOpen: false}));
                                confirmState.onConfirm();
                            }}
                            className="h-9 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold font-prompt"
                        >
                            ยืนยัน
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
