'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Table, Button, Input, Upload, App, Popconfirm, Modal, Card } from 'antd';
import type { UploadFile, GetProp, UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UploadOutlined, FileTextOutlined, CheckCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Trash2, KeyRound } from 'lucide-react';
import ExcelJS from 'exceljs';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { saveExcelFile } from '@/utils/fileDownload';
import { getMasterKeys, createMasterKey, updateMasterKey } from '@/services/mkdService';

const API_BASE_URL = '';

interface MKDDataType {
    key: string;
    no: number;
    driver: string;
    chkuse: number;
}

interface MasterKey {
    KeyManID: number;
    KeyManName: string;
    chkuse: number;
}

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

type RcFile = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

function MKDContent() {
    const { message } = App.useApp();
    const token = getToken();
    const currentUser = getUserFromToken();
    const [data, setData] = useState<MKDDataType[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [file, setFile] = useState<RcFile | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newKeyman, setNewKeyman] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getMasterKeys(token);
                if (res?.success) {
                    setData(res.data.map((item: MasterKey, index: number) => ({
                        key: item.KeyManID.toString(),
                        no: index + 1,
                        driver: item.KeyManName,
                        chkuse: item.chkuse
                    })));
                }
            } finally { setLoading(false); }
        };
        fetchData();
    }, [token]);

    const filteredData = useMemo(() => {
        if (!searchText) return data;
        return data.filter(item => item.driver.toLowerCase().includes(searchText.toLowerCase()));
    }, [data, searchText]);

    const handleAdd = async () => {
        if (!newKeyman.trim()) { message.warning("กรุณาใส่ข้อมูล"); return; }
        setLoading(true);
        try {
            const res = await createMasterKey({ KeyManName: newKeyman, CreateBy: currentUser?.employeeID || 'SYSTEM' }, token);
            if (res?.success) {
                message.success("ทำการเพิ่มข้อมูลเรียบร้อย"); setIsAddModalOpen(false); setNewKeyman(""); window.location.reload();
            } else { message.error(res?.message || 'Failed to add'); }
        } finally { setLoading(false); }
    };

    const handleDelete = async (key: string) => {
        setLoading(true);
        try {
            const res = await updateMasterKey(key, { UpdateBy: currentUser?.employeeID || 'SYSTEM' }, token);
            if (res?.success) { message.success("ทำการลบข้อมูลเรียบร้อย"); setData(prev => prev.filter(item => item.key !== key)); }
            else { message.error(res?.message || 'Failed to delete'); }
        } finally { setLoading(false); }
    };

    const handleUpload = () => {
        if (!file) { message.warning("กรุณาเลือกไฟล์ .xlsx เพื่อนำเข้าข้อมูล"); return; }
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const buffer = e.target?.result;
                if (buffer) {
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.load(buffer as ArrayBuffer);
                    const sheet = workbook.worksheets[0];
                    const employeeId = currentUser?.employeeID || 'SYSTEM';
                    const promises: Promise<{ success: boolean; message?: string } | null>[] = [];
                    sheet.eachRow((row, rowNumber) => {
                        if (rowNumber > 1) {
                            const val = row.getCell(1).text || row.getCell(1).value?.toString();
                            if (val?.trim()) { promises.push(createMasterKey({ KeyManName: val.trim(), CreateBy: employeeId }, token)); }
                        }
                    });
                    await Promise.all(promises);
                    message.success("บันทึกสำเร็จรายการเรียบร้อย"); setFile(null); window.location.reload();
                }
            } catch { message.error("Failed to process Excel file"); setLoading(false); }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/mkd/template/master-keys?populate=true`);
            if (!res.ok) throw new Error('Download failed');
            
            const blob = await res.blob();
            await saveExcelFile(blob, 'templatekeyman.xlsx');
        } catch (error) {
            console.error('Template Download Error:', error);
            message.error('ไม่สามารถดาวน์โหลด Template ได้');
        } finally {
            setLoading(false);
        }
    };

    const columns: ColumnsType<MKDDataType> = [
        { title: 'No', render: (_: unknown, __: unknown, index: number) => (currentPage - 1) * pageSize + index + 1, key: 'no', align: 'center', width: 70, className: 'text-slate-500' },
        { title: 'Manpower Key Driver Name', dataIndex: 'driver', key: 'driver', className: 'font-medium text-slate-800' },
        {
            title: 'จัดการ', key: 'action', align: 'center', width: 100,
            render: (_: unknown, record: MKDDataType) => (
                <Popconfirm title="ต้องการยืนยันใช่หรือไม่?" onConfirm={() => handleDelete(record.key)} okText="ตกลง" cancelText="ยกเลิก" okButtonProps={{ danger: true, className: "bg-red-600 font-bold" }}>
                    <Button type="text" danger icon={<Trash2 size={16} />} className="hover:bg-red-50 rounded-full flex items-center justify-center mx-auto" size="small" />
                </Popconfirm>
            ),
        }
    ];

    return (
        <div className="w-full bg-slate-50 min-h-[calc(100vh-64px)] p-4 flex flex-col items-center">
            <div className="w-full max-w-7xl flex flex-col gap-3">
                {/* Standard Blue Header */}
                <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-2 text-white flex items-center gap-3">
                    <KeyRound className="text-2xl" />
                    <h1 className="text-lg font-bold m-0 text-white tracking-wide uppercase">Manpower Key Driver Configuration</h1>
                </div>

                {/* Compact Action Bar - ADD on Left, Filter Next to it */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap">
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 hover:bg-blue-700 h-9 px-5 rounded-lg font-bold shadow-sm text-xs" onClick={() => setIsAddModalOpen(true)}>ADD DRIVER</Button>
                    <Input placeholder="ค้นหาชื่อ Key Driver..." className="max-w-[240px] rounded-lg h-9 text-sm" prefix={<SearchOutlined className="text-slate-400" />} value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />

                    <div className="flex-1 min-w-[10px]"></div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-rose-500 text-[12px] italic font-medium hidden lg:inline-block mr-2">* นำเข้าข้อมูลจาก Template เท่านั้น</span>
                        <Upload beforeUpload={(f) => { setFile(f); return false; }} fileList={file ? [{ uid: '-1', name: file.name, status: 'done', originFileObj: file } as UploadFile] : []} showUploadList={false} accept=".xlsx">
                            <div className="flex items-center bg-slate-50 rounded-lg px-3 h-9 min-w-[200px] hover:bg-slate-100 border border-slate-200 border-dashed cursor-pointer transition-colors">
                                <UploadOutlined className="text-slate-400 mr-2" />
                                <span className="text-slate-600 text-[12px] truncate max-w-[150px]">{file ? file.name : "Choose .xlsx"}</span>
                            </div>
                        </Upload>
                        <Button type="primary" icon={<CheckCircleOutlined />} className="bg-emerald-500 hover:bg-emerald-600 border-none h-9 px-4 rounded-lg font-bold text-xs" onClick={handleUpload} loading={loading && !!file}>Upload</Button>
                        <Button type="default" icon={<FileTextOutlined />} className="h-9 px-3 rounded-lg font-bold border-slate-200 text-xs" onClick={handleDownloadTemplate} loading={loading && !file}>Export Data (.xlsx)</Button>
                    </div>
                </div>

                {/* Table Container - Perfectly Fitted */}
                <Card className="shadow-sm border-slate-200 overflow-hidden rounded-xl" styles={{ body: { padding: 0 } }}>
                    <Table columns={columns} dataSource={filteredData} loading={loading && !file} size="small"
                        scroll={{ x: 'max-content', y: 'calc(100vh - 340px)' }}
                        pagination={{ current: currentPage, pageSize, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'], onChange: (page, size) => { setCurrentPage(page); setPageSize(size); }, className: "px-4 py-2 m-0 border-t bg-slate-50/50" }}
                        bordered rowClassName={(_, index) => index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} />
                </Card>
            </div>

            <Modal title={<div className="font-bold text-lg border-b pb-3 mb-2">เพิ่ม Manpower Key Driver</div>} open={isAddModalOpen} onOk={handleAdd} onCancel={() => { setIsAddModalOpen(false); setNewKeyman(""); }}
                okText="เพิ่มรายการ" okButtonProps={{ className: "bg-blue-600 font-bold px-10 h-10 rounded-lg" }} cancelButtonProps={{ className: "px-8 h-10 rounded-lg" }} confirmLoading={loading} width={450}>
                <div className="py-4">
                    <p className="text-slate-500 mb-2 font-bold text-xs uppercase tracking-wider">ชื่อ Manpower Key Driver :</p>
                    <Input placeholder="ระบุชื่อ Keyman..." className="w-full h-11 text-base rounded-lg" value={newKeyman} onChange={(e) => setNewKeyman(e.target.value)} onPressEnter={handleAdd} autoFocus />
                </div>
            </Modal>
        </div>
    );
}

export default function MKDSettingPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <MKDContent />
            </App>
        </Main>
    );
}
