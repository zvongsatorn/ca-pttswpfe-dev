'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Table, Button, Select, Tabs, Modal, Input, InputNumber, Progress, Typography, Space, Popconfirm, Card, App, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Trash2, Download, Upload, FileText, Plus, Info, FileSpreadsheet, FilePieChart, MessageSquare, Clipboard } from 'lucide-react';
import { FilePdfOutlined, SearchOutlined } from '@ant-design/icons';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { getPIR, getPIROrg, getFileAttach, getRemark, uploadFilePIR, deleteFileAttach, exportExcel, insertPIR, deletePIR, copyPIR, insertRemark, deleteRemark } from '@/services/pirService';
import { fetchAllUnits } from '@/services/userRightService';
import { buildPirFilePath, openSafeApiPath } from '@/utils/security';

const { Text } = Typography;

interface PIRType { ImproveRateID: number; Year: number; Rate: number; CreateBy: string; }
interface FileType { ImproveRateUploadID: number; FileName: string; FileUpload: string; }
interface RemarkType { ImproveRateRemarkID: number; Remark: string; EmpName: string; CreateBy: string; CreateDateBD: string; CreateDate?: string; }
interface UnitOption { value: string; label: string; }
interface PIROrgType { OrgUnitNo?: string; UnitText: string; }

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function PIRContent() {
    const { notification, message: messageApi, modal } = App.useApp();
    const token = getToken();
    const currentUser = getUserFromToken();
    const currentYearTH = new Date().getFullYear() + 543;
    const [effectiveYear, setEffectiveYear] = useState<string>(currentYearTH.toString());
    const [orgUnitNo, setOrgUnitNo] = useState<string>('');
    const [activeTab, setActiveTab] = useState('1');
    const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);

    // Tab 1: Rates
    const [rates, setRates] = useState<PIRType[]>([]);
    const [loadingRates, setLoadingRates] = useState(false);
    const [isAddRateModal, setIsAddRateModal] = useState(false);
    const [addRateForm, setAddRateForm] = useState<{ year: number; rate: number | null }>({ year: currentYearTH, rate: null });

    // Tab 2: Files
    const [files, setFiles] = useState<FileType[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [isAddFileModal, setIsAddFileModal] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    // Tab 3: Remarks
    const [remarkList, setRemarkList] = useState<RemarkType[]>([]);
    const [loadingRemarks, setLoadingRemarks] = useState(false);
    const [newRemark, setNewRemark] = useState('');

    // Tab 4: Import/Export
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
    const importFileInputRef = useRef<HTMLInputElement | null>(null);

    // Unit Summary Modal
    const [isPIROrgModal, setIsPIROrgModal] = useState(false);
    const [pirOrgList, setPIROrgList] = useState<PIROrgType[]>([]);
    const [loadingOrgList, setLoadingOrgList] = useState(false);

    useEffect(() => {
        const loadUnits = async () => {
            const unitsData = await fetchAllUnits(token);
            if (Array.isArray(unitsData)) {
                setUnitOptions(unitsData.map((u: Record<string, string | number | undefined>) => ({
                    value: String(u.OrgUnitNo || u.id),
                    label: String(u.UnitText || u.unitText || u.name || u.OrgUnitNo || u.id)
                })));
            }
        };
        loadUnits();
    }, [token]);

    const handleFetchAll = useCallback(async () => {
        setLoadingRates(true); setLoadingFiles(true); setLoadingRemarks(true);
        try {
            const yearAD = (parseInt(effectiveYear) - 543).toString();
            const [pirRes, fileRes, remarkRes] = await Promise.all([
                getPIR(yearAD, orgUnitNo, token),
                getFileAttach(yearAD, token),
                getRemark(yearAD, token)
            ]);
            if (pirRes?.success) setRates(pirRes.data);
            if (fileRes?.success) setFiles(fileRes.data);
            if (remarkRes?.success) setRemarkList(remarkRes.data);
        } catch { messageApi.error('ไม่สามารถโหลดข้อมูลได้'); }
        finally { setLoadingRates(false); setLoadingFiles(false); setLoadingRemarks(false); }
    }, [effectiveYear, orgUnitNo, token, messageApi]);

    useEffect(() => { handleFetchAll(); }, [handleFetchAll]);

    const handleAddRate = async () => {
        const yearAD = (addRateForm.year - 543).toString();
        const effYearAD = (parseInt(effectiveYear) - 543).toString();
        const effectiveYearBE = parseInt(effectiveYear);
        const isCurrentOrPastYear = addRateForm.year <= effectiveYearBE;
        const normalizedRate = addRateForm.rate === null ? null : Number(addRateForm.rate);
        const isDuplicateYear = rates.some((item) => Number(item.Year) === Number(yearAD));

        if (isDuplicateYear) {
            messageApi.warning(`มีข้อมูลปี ${addRateForm.year} อยู่แล้ว กรุณาเลือกปีอื่น`);
            return;
        }

        if (!isCurrentOrPastYear && (normalizedRate === null || Number.isNaN(normalizedRate))) {
            messageApi.warning('ปีที่มากกว่า Effective Year กรุณาระบุเปอร์เซ็นต์ Productivity Improvement Rate');
            return;
        }

        const rateToSubmit = normalizedRate === null || Number.isNaN(normalizedRate) ? 0 : normalizedRate;

        try {
            const res = await insertPIR({ effectiveYear: effYearAD, year: yearAD, rate: rateToSubmit, orgUnitNo, createBy: currentUser?.employeeID || 'SYSTEM', import: 0 }, token);
            if (res?.success) { notification.success({ title: 'สำเร็จ', description: 'เพิ่มข้อมูล Rate เรียบร้อยแล้ว' }); setIsAddRateModal(false); handleFetchAll(); }
            else { notification.error({ title: 'ผิดพลาด', description: res?.message }); }
        } catch { notification.error({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถเพิ่มข้อมูลได้' }); }
    };

    const handleDeleteRate = async (id: number) => {
        try {
            const res = await deletePIR(id, currentUser?.employeeID || 'SYSTEM', token);
            if (res?.success) { notification.success({ title: 'สำเร็จ', description: 'ลบข้อมูลเรียบร้อยแล้ว' }); handleFetchAll(); }
        } catch { notification.error({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถลบข้อมูลได้' }); }
    };

    const handleCopyData = () => {
        modal.confirm({
            title: 'ยืนยันการสำเนาข้อมูล',
            content: 'ระบบจะลบข้อมูลของปีปัจจุบัน (ถ้ามี) และคัดลอกข้อมูลจากปีที่แล้วมาแทนที่ ต้องการดำเนินการใช่หรือไม่?',
            okText: 'ยืนยัน', cancelText: 'ยกเลิก', centered: true,
            onOk: async () => {
                try {
                    const effYearAD = (parseInt(effectiveYear) - 543).toString();
                    const res = await copyPIR(effYearAD, orgUnitNo, currentUser?.employeeID || 'SYSTEM', token);
                    if (res?.success) { notification.success({ title: 'สำเร็จ', description: 'สำเนาข้อมูลเรียบร้อยแล้ว' }); handleFetchAll(); }
                } catch { notification.error({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถสำเนาข้อมูลได้' }); }
            }
        });
    };

    const handleUpload = async () => {
        if (!uploadFile || !newFileName) { messageApi.warning('กรุณากรอกชื่อไฟล์และเลือกไฟล์ PDF'); return; }
        if (uploadFile.size > 15 * 1024 * 1024) { messageApi.error('ขนาดไฟล์ต้องไม่เกิน 15MB'); return; }
        try {
            const effYearAD = (parseInt(effectiveYear) - 543).toString();
            const res = await uploadFilePIR(uploadFile, newFileName, effYearAD, currentUser?.employeeID || 'SYSTEM', token);
            if (res?.success) { notification.success({ title: 'สำเร็จ', description: 'อัปโหลดไฟล์เรียบร้อยแล้ว' }); setIsAddFileModal(false); setNewFileName(''); setUploadFile(null); handleFetchAll(); }
            else { messageApi.error('อัปโหลดล้มเหลว'); }
        } catch { messageApi.error('เกิดข้อผิดพลาดในการอัปโหลด'); }
    };

    const handleDeleteFile = async (id: number, filePath: string) => {
        try {
            const effYearAD = (parseInt(effectiveYear) - 543).toString();
            await deleteFileAttach(id, filePath, effYearAD, token);
            notification.success({ title: 'สำเร็จ', description: 'ลบไฟล์เรียบร้อยแล้ว' }); handleFetchAll();
        } catch { messageApi.error('ลบไฟล์ล้มเหลว'); }
    };

    const handleSaveRemark = async () => {
        if (!newRemark) return;
        try {
            const effYearAD = (parseInt(effectiveYear) - 543).toString();
            const res = await insertRemark(effYearAD, newRemark, currentUser?.employeeID || 'SYSTEM', token);
            if (res?.success) { notification.success({ title: 'สำเร็จ', description: 'บันทึก Remark เรียบร้อยแล้ว' }); setNewRemark(''); handleFetchAll(); }
        } catch { messageApi.error('บันทึก Remark ล้มเหลว'); }
    };

    const handleDeleteRemark = async (id: number) => {
        try {
            const res = await deleteRemark(id, currentUser?.employeeID || 'SYSTEM', token);
            if (res?.success) { notification.success({ title: 'สำเร็จ', description: 'ลบ Remark เรียบร้อยแล้ว' }); handleFetchAll(); }
        } catch { messageApi.error('ลบ Remark ล้มเหลว'); }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const effYearAD = (parseInt(effectiveYear) - 543).toString();
            const resolveExportContext = () => {
                let employeeId = currentUser?.employeeID || 'SYSTEM';
                let userGroupNo = '';

                if (typeof window !== 'undefined') {
                    const selectedGroup = localStorage.getItem('selected_usergroup') || '';
                    const userDataStr = localStorage.getItem('user_data');
                    if (userDataStr) {
                        try {
                            const userData = JSON.parse(userDataStr) as { employeeID?: string; roleId?: string; userGroupNo?: string };
                            employeeId = userData.employeeID || employeeId;
                            userGroupNo = selectedGroup || userData.userGroupNo || userData.roleId || '';
                        } catch {
                            userGroupNo = selectedGroup || '';
                        }
                    } else {
                        userGroupNo = selectedGroup || '';
                    }
                }

                if (!userGroupNo) {
                    userGroupNo = currentUser?.userGroups?.[0]?.userGroupNo || currentUser?.role || '';
                }

                return { employeeId, userGroupNo };
            };

            const { employeeId, userGroupNo } = resolveExportContext();
            const buildAndSaveWorkbook = async (rows: Record<string, string | number>[]) => {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('PIR Data');
                worksheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 20 }));
                worksheet.addRows(rows);
                worksheet.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; });
                const buffer = await workbook.xlsx.writeBuffer();
                await saveExcelFile(buffer, `PIR_Export_${effectiveYear}.xlsx`);
            };

            const res = await exportExcel({ effectiveYear: effYearAD, orgUnitNo, employeeId, userGroupNo }, token);
            if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
                await buildAndSaveWorkbook(res.data as Record<string, string | number>[]);
                notification.success({ title: 'สำเร็จ', description: 'Export ข้อมูลเรียบร้อยแล้ว' });
            } else {
                messageApi.info(res?.message || 'ไม่พบข้อมูลสำหรับ Export');
            }
        } catch { messageApi.error('Export ล้มเหลว'); }
        finally { setExporting(false); }
    };

    const handleImport = async () => {
        if (!selectedImportFile) return;
        setImporting(true);
        try {
            const buffer = await selectedImportFile.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.worksheets[0];
            const rows: Record<string, string | number>[] = [];
            let headers: (string | number)[] = [];

            worksheet.eachRow((row, rowNum) => {
                const rowValues = row.values as (string | number)[];
                if (rowNum === 1) {
                    headers = rowValues;
                    return;
                }
                const rowData: Record<string, string | number> = {};
                headers.forEach((h, i) => {
                    if (h) rowData[h.toString().toUpperCase()] = rowValues[i];
                });
                rows.push(rowData);
            });

            let inserted = 0;
            let duplicate = 0;
            let skipped = 0;
            let failed = 0;
            const errorSamples: string[] = [];

            for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                if (!row.EFFECTIVEYEAR || !row.YEAR || row.RATE === undefined || row.RATE === null || String(row.RATE).trim() === '') {
                    skipped++;
                    continue;
                }

                let eff = parseInt(String(row.EFFECTIVEYEAR), 10);
                let yr = parseInt(String(row.YEAR), 10);
                const rate = parseFloat(String(row.RATE));

                if (Number.isNaN(eff) || Number.isNaN(yr) || Number.isNaN(rate)) {
                    skipped++;
                    continue;
                }

                if (eff > 2500) eff -= 543;
                if (yr > 2500) yr -= 543;

                const res = await insertPIR(
                    {
                        effectiveYear: eff.toString(),
                        year: yr.toString(),
                        rate,
                        orgUnitNo: String(row.ORGUNITNO || ''),
                        createBy: currentUser?.employeeID || 'SYSTEM',
                        import: 0
                    },
                    token
                );

                if (res?.success) {
                    inserted++;
                } else if (res?.duplicate) {
                    duplicate++;
                } else {
                    failed++;
                    if (errorSamples.length < 3) {
                        errorSamples.push(`แถว ${index + 2}: ${res?.message || 'ไม่สามารถบันทึกได้'}`);
                    }
                }
            }

            if (inserted > 0) {
                notification.success({
                    title: 'นำเข้ารายการสำเร็จ',
                    description: `เพิ่มใหม่ ${inserted} รายการ | ซ้ำ ${duplicate} | ข้าม ${skipped} | ผิดพลาด ${failed}`
                });
                handleFetchAll();
            } else if (duplicate > 0 || skipped > 0 || failed > 0) {
                notification.warning({
                    title: 'ไม่พบรายการใหม่ที่นำเข้าได้',
                    description: `ซ้ำ ${duplicate} | ข้าม ${skipped} | ผิดพลาด ${failed}`
                });
            } else {
                notification.info({ title: 'ไม่พบข้อมูลสำหรับนำเข้า' });
            }

            if (errorSamples.length > 0) {
                messageApi.warning(errorSamples.join(' | '));
            }

            setSelectedImportFile(null);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
        } catch {
            messageApi.error('Import ล้มเหลว');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        openSafeApiPath('/api/pir/template');
        notification.info({ title: 'ดาวน์โหลดสำเร็จ', description: 'กรุณากรอกข้อมูลตามรูปแบบใน Template' });
    };

    const handleShowOrgSummary = async () => {
        if (orgUnitNo) {
            handleFetchAll();
            return;
        }

        setLoadingOrgList(true);
        try {
            const yearAD = (parseInt(effectiveYear) - 543).toString();
            const res = await getPIROrg(yearAD, token);
            if (res?.success) {
                setPIROrgList(res.data);
                setIsPIROrgModal(true);
            }
        } catch {
            messageApi.error('ไม่สามารถโหลดข้อมูลหน่วยงานได้');
        } finally {
            setLoadingOrgList(false);
        }
    };

    const rateColumns: ColumnsType<PIRType> = [
        { title: 'Year', dataIndex: 'Year', key: 'Year', align: 'center', width: 150, render: (val) => { const yrBE = val + 543; const isCurrent = yrBE === parseInt(effectiveYear); return <span className={`font-bold ${yrBE > parseInt(effectiveYear) ? 'text-purple-600' : isCurrent ? 'text-blue-600' : 'text-slate-600'}`}>{yrBE} {isCurrent && '<'}</span>; } },
        { title: 'Productivity Improvement Rate (%)', dataIndex: 'Rate', key: 'Rate', align: 'center', render: (val) => <span className="font-bold text-slate-700">{val}%</span> },
        { title: 'Action', key: 'action', align: 'center', width: 100, render: (_, record) => <Popconfirm title="ลบรายการนี้?" onConfirm={() => handleDeleteRate(record.ImproveRateID)} okText="ลบ" cancelText="ยกเลิก"><Button type="text" danger icon={<Trash2 size={18} />} /></Popconfirm> }
    ];

    const fileColumns: ColumnsType<FileType> = [
        { title: 'ชื่อไฟล์อ้างอิง', dataIndex: 'FileName', key: 'FileName' },
        { title: 'เอกสาร (PDF)', key: 'FileUpload', align: 'center', width: 150, render: (_, record) => <Button type="link" icon={<FilePdfOutlined className="text-red-500 text-xl" />} onClick={() => openSafeApiPath(buildPirFilePath(parseInt(effectiveYear, 10) - 543, record.FileUpload))}>เปิดไฟล์</Button> },
        { title: 'Action', key: 'action', align: 'center', width: 100, render: (_, record) => <Popconfirm title="ลบไฟล์นี้?" onConfirm={() => handleDeleteFile(record.ImproveRateUploadID, record.FileUpload)} okText="ลบ" cancelText="ยกเลิก"><Button type="text" danger icon={<Trash2 size={18} />} /></Popconfirm> }
    ];

    const remarkColumns: ColumnsType<RemarkType> = [
        { title: 'หมายเหตุ / ข้อความ', dataIndex: 'Remark', key: 'Remark', width: '60%' },
        { title: 'ผู้บันทึก', key: 'info', render: (_, record) => <div className="flex flex-col gap-1 items-end"><Text strong className="text-slate-600">{record.EmpName || record.CreateBy}</Text><Text type="secondary" className="text-[11px]">{record.CreateDateBD}</Text></div> },
        { title: '', key: 'action', align: 'center', width: 60, render: (_, record) => (record.CreateBy === currentUser?.employeeID) ? <Popconfirm title="ลบหมายเหตุนี้?" onConfirm={() => handleDeleteRemark(record.ImproveRateRemarkID)} okText="ลบ" cancelText="ยกเลิก"><Button type="text" danger icon={<Trash2 size={16} />} /></Popconfirm> : null }
    ];

    const effectiveYearBE = parseInt(effectiveYear) || currentYearTH;
    const yearOptions = Array.from({ length: 16 }, (_, i) => {
        const y = effectiveYearBE + 5 - i;
        return { value: y.toString(), label: y.toString() };
    });

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6 pir-modern">
            <div className="rounded-xl bg-linear-to-r from-blue-700 to-blue-500 p-4 shadow-md mb-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3"><FilePieChart className="text-2xl" /><h1 className="text-xl font-bold m-0 text-white">Productivity Improvement Rate Management</h1></div>
            </div>

            <Card className="mb-6 shadow-sm border-slate-200" styles={{ body: { padding: '16px 24px' } }}>
                <div className="flex flex-wrap items-end gap-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-bold text-xs uppercase tracking-wider pl-1">Effective Year</label>
                        <Select value={effectiveYear} onChange={setEffectiveYear} options={yearOptions} size="large" className="w-[180px]" />
                    </div>
                    <div className="flex flex-col gap-1  min-w-[300px]">
                        <label className="text-slate-500 font-bold text-md uppercase tracking-wider pl-1">หน่วยงาน</label>
                        <Select placeholder="ค้นหาหรือเลือกหน่วยงาน..." allowClear showSearch value={orgUnitNo} onChange={setOrgUnitNo} options={unitOptions} size="large" className="w-[700px]!" />
                    </div>
                    <Space size="middle">
                        <Tooltip title="ดูหน่วยงาน">
                            <Button
                                type="text"
                                size="large"
                                onClick={handleShowOrgSummary}
                                loading={loadingOrgList}
                                icon={<SearchOutlined style={{ color: '#f59e0b', fontSize: 20 }} />}
                                className="h-10 w-10 rounded-lg border border-amber-200 text-amber-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center"
                                aria-label="ดูหน่วยงาน"
                            />
                        </Tooltip>
                        <Button type="default" size="large" onClick={handleCopyData} icon={<Clipboard size={18} />} className="h-10 px-6 rounded-lg font-bold border-emerald-500 text-emerald-600 hover:text-emerald-700 transition-all flex items-center gap-2">สำเนาปีก่อน</Button>
                    </Space>
                </div>
            </Card>

            <Tabs activeKey={activeTab} onChange={setActiveTab} className="pir-tabs" items={[
                { key: '1', label: <div className="flex items-center gap-2"><FilePieChart size={18} /> Productivity Improvement Rate</div>, children: (
                    <div className="py-4 flex gap-6 items-start">
                        <div className="">
                            <Table columns={rateColumns} dataSource={rates} rowKey="ImproveRateID" loading={loadingRates} pagination={false} className="modern-table w-[600px]" bordered />
                        </div>
                        <div className="flex flex-col pt-1">
                            <Button
                                type="primary"
                                icon={<Plus size={18} />}
                                onClick={() => {
                                    setAddRateForm((prev) => ({ ...prev, year: parseInt(effectiveYear) || currentYearTH }));
                                    setIsAddRateModal(true);
                                }}
                                className="bg-blue-600 rounded-lg h-10 px-6 shadow-md shadow-blue-100 font-bold flex items-center gap-2 whitespace-nowrap"
                            >
                                เพิ่มรายการ
                            </Button>
                        </div>
                    </div>
                )},
                { key: '2', label: <div className="flex items-center gap-2"><FileText size={18} /> เอกสารแนบ</div>, children: (
                    <div className="py-4 flex gap-6 items-start">
                        <div className="">
                            <Table columns={fileColumns} dataSource={files} rowKey="ImproveRateUploadID" loading={loadingFiles} pagination={false} className="modern-table w-[900px]!" bordered />
                        </div>
                        <div className="flex flex-col gap-4 min-w-[220px]">
                            <Button type="primary" icon={<Upload size={18} />} onClick={() => setIsAddFileModal(true)} className="bg-blue-600 rounded-lg h-10 px-6 font-bold flex items-center gap-2 whitespace-nowrap shadow-md shadow-blue-100">อัปโหลดเอกสาร</Button>
                            <div className="text-slate-500 text-[11px] flex flex-col gap-1 italic bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-1 font-bold text-slate-700 not-italic uppercase mb-1"><Info size={14} /> ข้อกำหนดการแนบไฟล์</div>
                                <div>• ขนาดไฟล์รวมสูงสุดไม่เกิน 15MB</div>
                                <div>• รองรับเฉพาะไฟล์รูปแบบ PDF เท่านั้น</div>
                            </div>
                        </div>
                    </div>
                )},
                { key: '3', label: <div className="flex items-center gap-2"><MessageSquare size={18} /> หมายเหตุ</div>, children: (
                    <div className="py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="shadow-sm border-slate-200 bg-slate-50/50" title="เพิ่มการบันทึกหมายเหตุ" styles={{ body: { padding: '16px 20px' } }}>
                            <Input.TextArea rows={8} placeholder="ระบุข้อความหมายเหตุที่ต้องการบันทึก..." maxLength={300} value={newRemark} onChange={(e) => setNewRemark(e.target.value)} className="rounded-lg mb-4" />
                            <div className="flex justify-between items-center">
                                <Text type="secondary" className="text-[12px]">Remaining {300 - newRemark.length} characters</Text>
                                <Button type="primary" icon={<Plus size={18} />} onClick={handleSaveRemark} disabled={!newRemark} className="bg-emerald-600 h-11 px-10 rounded-lg font-bold shadow-md shadow-emerald-50 text-white border-none transition-all hover:scale-105">บันทึกข้อมูล</Button>
                            </div>
                        </Card>
                        <Table columns={remarkColumns} dataSource={remarkList} rowKey="ImproveRateRemarkID" loading={loadingRemarks} pagination={{ pageSize: 5 }} className="modern-table" showHeader={false} />
                    </div>
                )},
                { key: '4', label: <div className="flex items-center gap-2"><FileSpreadsheet size={18} /> นำเข้า / ส่งออก</div>, children: (
                    <div className="py-12 flex flex-col items-center justify-center bg-white border border-dashed border-slate-300 rounded-2xl min-h-[400px]">
                        <div className="bg-blue-50 p-4 rounded-full mb-6 text-blue-600"><FileSpreadsheet size={48} /></div>

                        <div className="flex flex-wrap gap-4 justify-center items-center">
                            <Button type="primary" onClick={handleExport} loading={exporting} size="large" icon={<Download size={20} />} className="bg-blue-600 h-14 px-10 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-blue-100">EXPORT DATA</Button>
                            <Button type="default" onClick={handleDownloadTemplate} size="large" icon={<Download size={20} />} className="h-14 px-8 rounded-2xl font-bold border-slate-200">DOWNLOAD TEMPLATE</Button>
                        </div>
                        <div className="mt-12 w-full max-w-sm p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="flex items-center gap-2 text-slate-700 font-bold mb-4 uppercase text-xs tracking-widest"><Upload size={16} /> อัปโหลดไฟล์เพื่อนำเข้า</div>
                            <input
                                ref={importFileInputRef}
                                type="file"
                                accept=".xlsx"
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ''; }}
                                onChange={(e) => setSelectedImportFile(e.target.files?.[0] || null)}
                            />
                            {selectedImportFile && <Button type="primary" block className="mt-6 bg-emerald-600 h-12 rounded-xl font-bold text-white border-none shadow-md shadow-emerald-50" onClick={handleImport} loading={importing}>CONFIRM UPLOAD & IMPORT</Button>}
                        </div>
                        {importing && <Progress percent={100} status="active" strokeColor="#10b981" className="max-w-sm mt-4 px-6" />}
                    </div>
                )}
            ]} />

            <style jsx global>{`
                .pir-tabs .ant-tabs-nav { border-bottom: 2px solid #f1f5f9 !important; margin-bottom: 0 !important; }
                .pir-tabs .ant-tabs-tab { padding: 16px 8px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-size: 13px !important; }
                .pir-tabs .ant-tabs-ink-bar { height: 3px !important; background: #2563eb !important; }
                .modern-table .ant-table-thead > tr > th { background: #f8fafc !important; font-weight: 800 !important; font-size: 11px !important; text-transform: uppercase !important; color: #64748b !important; letter-spacing: 0.05em !important; padding: 16px !important; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>

            <Modal title={<div className="flex items-center gap-2 border-b pb-3 mb-4"><Plus className="text-blue-600" /> <span className="font-bold">Add Productivity Rate</span></div>} open={isAddRateModal} onOk={handleAddRate} onCancel={() => setIsAddRateModal(false)} okText="บันทึกรายการ" cancelText="ยกเลิก" okButtonProps={{ className: 'bg-blue-600 rounded-lg px-8' }}>
                <div className="flex flex-col gap-6 py-4">
                    <div className="flex flex-col gap-1"><label className="text-slate-500 text-xs font-bold uppercase">ปี (Year)</label><Select value={addRateForm.year.toString()} onChange={(v) => setAddRateForm({ ...addRateForm, year: parseInt(v) })} options={yearOptions} size="large" className="w-full" /></div>
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-500 text-xs font-bold uppercase">Productivity Improvement Rate (%)</label>
                        <InputNumber min={0} style={{ width: '100%' }} size="large" value={addRateForm.rate} onChange={(val) => setAddRateForm({ ...addRateForm, rate: val === null ? null : Number(val) })} placeholder={addRateForm.year <= parseInt(effectiveYear) ? 'เว้นว่างได้ (ระบบจะใช้ 0%)' : 'กรอกเปอร์เซ็นต์'} className="rounded-lg" />
                        {addRateForm.year <= parseInt(effectiveYear) && <Text type="secondary" className="text-[11px]">ปีปัจจุบันและปีย้อนหลัง (เทียบ Effective Year) สามารถเว้นเปอร์เซ็นต์ได้</Text>}
                    </div>
                </div>
            </Modal>

            <Modal title={<div className="flex items-center gap-2 border-b pb-3 mb-4"><Upload className="text-blue-600" /> <span className="font-bold">อัปโหลดไฟล์อ้างอิง PIR</span></div>} open={isAddFileModal} onOk={handleUpload} onCancel={() => setIsAddFileModal(false)} okText="อัปโหลดไฟล์" cancelText="ย้อนกลับ" okButtonProps={{ className: 'bg-blue-600 rounded-lg px-8' }}>
                <div className="flex flex-col gap-6 py-4">
                    <div className="flex flex-col gap-1"><label className="text-slate-500 text-xs font-bold uppercase">ชื่อเรียกไฟล์ / คำอธิบาย</label><Input size="large" placeholder="ระบุชื่อไฟล์..." value={newFileName} onChange={(e) => setNewFileName(e.target.value)} /></div>
                    <div className="flex flex-col gap-1"><label className="text-slate-500 text-xs font-bold uppercase">เลือกไฟล์ PDF</label>
                        <div className="p-8 border-2 border-dashed border-blue-100 rounded-xl bg-blue-50/30 flex flex-col items-center justify-center gap-4">
                            <Upload className="text-blue-400" size={32} />
                            <input type="file" accept=".pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="text-sm text-slate-500 file:bg-white file:border file:border-slate-300 file:rounded-md file:px-4 file:py-1" />
                            {uploadFile && <Tag color="blue" icon={<FileText size={12} className="inline mr-1 mb-0.5" />}>{uploadFile.name}</Tag>}
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal title={<div className="flex items-center gap-2 border-b pb-3 mb-4"><SearchOutlined className="text-blue-600" /> <span className="font-bold whitespace-nowrap">ตรวจสอบหน่วยงานที่กำหนด Rate (ปี {effectiveYear})</span></div>} open={isPIROrgModal} onCancel={() => setIsPIROrgModal(false)} footer={null} width={600} centered>
                <div className="py-2">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 flex items-center gap-3">
                        <Info className="text-blue-500" size={20} />
                        <Text className="text-blue-700 text-sm">แสดงรายชื่อหน่วยงานที่มีการกำหนด Productivity Rate เฉพาะของหน่วยงานนั้นๆ (ถ้าไม่ปรากฏในนี้ ระบบจะใช้ค่าส่วนกลาง)</Text>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {pirOrgList.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                                <Info size={32} className="mx-auto mb-2 opacity-20" />
                                <p>ไม่พบหน่วยงานที่มีการกำหนด Rate พิเศษในปีนี้</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {pirOrgList.map((org, index) => (
                                    <div key={index} onClick={() => { 
                                        const val = org.OrgUnitNo || org.UnitText?.split(/\s+/)[0] || '';
                                        setOrgUnitNo(String(val)); 
                                        setIsPIROrgModal(false); 
                                        messageApi.success(`เลือกหน่วยงาน: ${org.UnitText || org.OrgUnitNo}`);
                                    }} className="p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 font-bold text-xs">{index + 1}</div>
                                            <Text strong className="group-hover:text-blue-700">{org.UnitText || org.OrgUnitNo || 'Default Unit'}</Text>
                                        </div>
                                        <Tag color="blue" className="rounded-md border-none px-3 m-0 opacity-0 group-hover:opacity-100 transition-opacity">เลือกหน่วยงาน</Tag>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function PIRPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <PIRContent />
            </App>
        </Main>
    );
}
