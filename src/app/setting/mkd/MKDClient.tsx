'use client';

import React, { useState, useMemo } from 'react';
import { Table, Button, Input, Upload, App, Popconfirm, Modal, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UploadOutlined, FileTextOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Trash2, KeyRound } from 'lucide-react';
import ExcelJS from 'exceljs';
import { addMasterKeyAction, deleteMasterKeyAction } from './actions';
import { createMasterKey } from '@/services/mkdService';

interface MKDDataType {
    key: string;
    no: number;
    driver: string;
    chkuse: number;
}

interface MKDClientProps {
    initialData: MKDDataType[];
    token: string;
    currentUser: any;
}

export default function MKDClient({ initialData, token, currentUser }: MKDClientProps) {
    const { message } = App.useApp();
    const [data, setData] = useState<MKDDataType[]>(initialData);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newKeyman, setNewKeyman] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const filteredData = useMemo(() => {
        if (!searchText) return data;
        return data.filter(item => 
            item.driver.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [data, searchText]);

    const handleAdd = async () => {
        if (!newKeyman.trim()) {
            message.warning("กรุณาใส่ข้อมูล");
            return;
        }
        setLoading(true);
        try {
            const res = await addMasterKeyAction({ 
                KeyManName: newKeyman, 
                CreateBy: currentUser.employeeID || 'SYSTEM' 
            }, token);
            if (res.success) {
                message.success("ทำการเพิ่มข้อมูลเรียบร้อย");
                setIsAddModalOpen(false);
                setNewKeyman("");
                // In a real app with server actions, revalidatePath would handle this,
                // but for immediate feedback without full page reload we can update local state or trigger a refresh
                window.location.reload(); 
            } else {
                message.error(res.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (key: string) => {
        setLoading(true);
        try {
            const res = await deleteMasterKeyAction(key, { 
                UpdateBy: currentUser.employeeID || 'SYSTEM' 
            }, token);
            if (res.success) {
                message.success("ทำการลบข้อมูลเรียบร้อย");
                setData(prev => prev.filter(item => item.key !== key));
            } else {
                message.error(res.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = () => {
        if (!file) {
            message.warning("กรุณาเลือกไฟล์ .xlsx เพื่อนำเข้าข้อมูล");
            return;
        }
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const buffer = e.target?.result;
                if (buffer) {
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.load(buffer as ArrayBuffer);
                    const sheet = workbook.worksheets[0];
                    const employeeId = currentUser.employeeID || 'SYSTEM';
                    const promises: Promise<any>[] = [];
                    
                    sheet.eachRow((row, rowNumber) => {
                        if (rowNumber > 1) { // Skip header row
                            const val = row.getCell(1).text || row.getCell(1).value?.toString();
                            if (val && val.trim()) {
                                promises.push(createMasterKey({ KeyManName: val.trim(), CreateBy: employeeId }, token));
                            }
                        }
                    });

                    await Promise.all(promises);
                    message.success("บันทึกสำเร็จรายการเรียบร้อย");
                    setFile(null);
                    window.location.reload();
                }
            } catch (error) {
                console.error("Error processing excel file", error);
                message.error("Failed to process Excel file");
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = () => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        window.location.href = `${API_BASE_URL}/api/mkd/template/master-keys`;
    };

    const columns: ColumnsType<MKDDataType> = [
        {
            title: 'No',
            render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
            key: 'no',
            align: 'center',
            width: 80,
            className: 'font-bold text-slate-500',
        },
        {
            title: (
                <div className="flex flex-col gap-2">
                    <span className="text-sm">Manpower Key Driver</span>
                    <Input
                        placeholder="Search..."
                        className="rounded-lg font-normal"
                        prefix={<SearchOutlined className="text-slate-400" />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            ),
            dataIndex: 'driver',
            key: 'driver',
            className: 'font-bold text-slate-800',
        },
        {
            title: 'จัดการ',
            key: 'action',
            align: 'center',
            width: 120,
            render: (_, record) => (
                <Popconfirm
                    title="ต้องการยืนยันใช่หรือไม่?"
                    onConfirm={() => handleDelete(record.key)}
                    okText="ตกลง"
                    cancelText="ยกเลิก"
                    okButtonProps={{ danger: true, className: "bg-red-600 font-bold" }}
                >
                    <Button
                        type="text"
                        danger
                        icon={<Trash2 size={18} />}
                        className="hover:bg-red-50 rounded-full flex items-center justify-center mx-auto"
                    />
                </Popconfirm>
            ),
        }
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center gap-3">
                <KeyRound className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">Manpower Key Driver Configuration</h1>
            </div>
            
            <div className="max-w-4xl mx-auto">
                <Card className="mb-6 border-slate-200 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="large"
                            className="bg-blue-600 hover:bg-blue-700 px-10 rounded-xl font-bold shadow-lg shadow-blue-100 h-12"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            ADD DRIVER
                        </Button>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-3 flex-wrap justify-end">
                                <Upload 
                                    beforeUpload={(f) => { setFile(f); return false; }} 
                                    fileList={file ? [file as any] : []}
                                    showUploadList={false}
                                    accept=".xlsx"
                                >
                                    <div className="flex items-center bg-slate-100 rounded-xl px-4 h-12 min-w-[240px] cursor-pointer hover:bg-slate-200 transition-colors border border-slate-200 border-dashed">
                                        <UploadOutlined className="text-slate-500 mr-2" />
                                        <span className="text-slate-600 text-sm truncate max-w-[150px]">
                                            {file ? file.name : "Choose .xlsx file"}
                                        </span>
                                    </div>
                                </Upload>

                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    className="bg-emerald-500 hover:bg-emerald-600 border-none h-12 px-8 rounded-xl font-bold"
                                    onClick={handleUpload}
                                    loading={loading && !!file}
                                >
                                    Upload
                                </Button>

                                <Button
                                    type="default"
                                    icon={<FileTextOutlined />}
                                    className="h-12 px-6 rounded-xl font-bold border-slate-200"
                                    onClick={handleDownloadTemplate}
                                >
                                    Template
                                </Button>
                            </div>
                            <span className="text-rose-500 text-xs font-medium italic">* นำเข้าข้อมูลจาก Template เท่านั้น</span>
                        </div>
                    </div>
                </Card>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        loading={loading && !file}
                        pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            placement: ['bottomCenter'],
                            showSizeChanger: true,
                            onChange: (page, size) => {
                                setCurrentPage(page);
                                setPageSize(size);
                            },
                        }}
                        bordered
                        rowClassName={(record, index) => index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}
                    />
                </div>
            </div>

            <Modal
                title={<div className="font-bold text-lg border-b pb-3 mb-2">เพิ่ม Manpower Key Driver</div>}
                open={isAddModalOpen}
                onOk={handleAdd}
                onCancel={() => { setIsAddModalOpen(false); setNewKeyman(""); }}
                okText="เพิ่มรายการ"
                okButtonProps={{ className: "bg-blue-600 font-bold px-10 h-11 rounded-lg" }}
                cancelButtonProps={{ className: "px-8 h-11 rounded-lg" }}
                confirmLoading={loading}
                width={500}
            >
                <div className="py-6">
                    <p className="text-slate-500 mb-2 font-bold text-xs uppercase tracking-wider">ชื่อ Manpower Key Driver :</p>
                    <Input
                        placeholder="ระบุชื่อ Keyman..."
                        className="w-full h-12 text-lg rounded-xl"
                        value={newKeyman}
                        onChange={(e) => setNewKeyman(e.target.value)}
                        onPressEnter={handleAdd}
                    />
                </div>
            </Modal>
        </div>
    );
}
