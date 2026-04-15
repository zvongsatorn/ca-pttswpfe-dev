'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Select, Input, Popconfirm, App, Space, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined, EditOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
import Main from '@/components/layout/main';
import {
    getDelayRetirementData,
    getEmployeeOptions,
    createDelayRetirement,
    updateDelayRetirement,
    deleteDelayRetirement,
    DelayRetirementDataType,
    DelayEmployeeOptionType
} from '@/services/delayService';
import { getUserFromToken } from '@/utils/auth';

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function DelayRetirementContent() {
    const { notification } = App.useApp();
    const [form] = Form.useForm();
    const token = getToken();
    const currentUser = getUserFromToken(token);
    
    const [selectedYear, setSelectedYear] = useState<string>('2568');
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [tableData, setTableData] = useState<DelayRetirementDataType[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<DelayEmployeeOptionType[]>([]);
    const delayYearOptions = useMemo(() => {
        const baseYear = Number.parseInt(selectedYear, 10);
        if (Number.isNaN(baseYear)) return [];

        return Array.from({ length: 5 }, (_, index) => {
            const year = String(baseYear + index);
            return { value: year, label: year };
        });
    }, [selectedYear]);

    const fetchData = useCallback(async () => {
        setTableLoading(true);
        try {
            const [dataRes, empRes] = await Promise.all([
                getDelayRetirementData(token, selectedYear),
                getEmployeeOptions(token)
            ]);

            if (dataRes?.success && Array.isArray(dataRes.data)) {
                setTableData(dataRes.data);
            } else {
                setTableData([]);
                notification.error({ title: 'ไม่สามารถโหลดข้อมูลได้', description: dataRes?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล Delay' });
            }

            if (empRes?.success && Array.isArray(empRes.data)) {
                setEmployeeOptions(empRes.data);
            } else {
                setEmployeeOptions([]);
            }
        } catch (error) {
            console.error('Fetch Delay data failed:', error);
            notification.error({ title: 'ไม่สามารถโหลดข้อมูลได้', description: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ' });
        } finally {
            setTableLoading(false);
        }
    }, [notification, selectedYear, token]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const filteredData = useMemo(() => {
        return tableData.filter(item => {
            const matchesYear = item.DelayYear === selectedYear;
            const matchesSearch = item.EmployeeID.includes(searchText) || item.EmployeeName.includes(searchText) || item.PosName.includes(searchText);
            return matchesYear && matchesSearch;
        });
    }, [tableData, selectedYear, searchText]);

    const handleDelete = async (delayId: string) => {
        try {
            const response = await deleteDelayRetirement(delayId, currentUser?.employeeID || 'SYSTEM', token);
            if (response?.success) {
                notification.success({ title: 'สำเร็จ', description: 'ลบข้อมูลเรียบร้อยแล้ว' });
                await fetchData();
                return;
            }

            notification.error({ title: 'ไม่สำเร็จ', description: response?.message || 'ไม่สามารถลบข้อมูลได้' });
        } catch (error) {
            console.error('Delete Delay failed:', error);
            notification.error({ title: 'ไม่สำเร็จ', description: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
        }
    };

    const handleEdit = (record: DelayRetirementDataType) => {
        setEditingKey(record.DelayID);
        setIsModalVisible(true);
        form.setFieldsValue(record);
    };

    const handleAdd = () => {
        setEditingKey(null);
        setIsModalVisible(true);
        form.resetFields();
        form.setFieldsValue({ DelayYear: selectedYear });
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const selectedEmp = employeeOptions.find(opt => opt.value === values.EmployeeID);

            const payload = {
                EmployeeID: values.EmployeeID,
                PosName: selectedEmp?.position || values.PosName || '',
                DelayYear: values.DelayYear,
                DelayStatus: 1,
                UserID: currentUser?.employeeID || 'SYSTEM'
            };

            if (editingKey) {
                const response = await updateDelayRetirement(editingKey, payload, token);
                if (!response?.success) {
                    notification.error({ title: 'ไม่สำเร็จ', description: response?.message || 'ไม่สามารถแก้ไขข้อมูลได้' });
                    return;
                }
                notification.success({ title: 'สำเร็จ', description: 'แก้ไขข้อมูลเรียบร้อยแล้ว' });
            } else {
                const response = await createDelayRetirement(payload, token);
                if (!response?.success) {
                    notification.error({ title: 'ไม่สำเร็จ', description: response?.message || 'ไม่สามารถเพิ่มข้อมูลได้' });
                    return;
                }
                notification.success({ title: 'สำเร็จ', description: 'เพิ่มข้อมูลเรียบร้อยแล้ว' });
            }

            await fetchData();
            setIsModalVisible(false);
        } catch (error) {
            console.error('Validate Failed:', error);
        }
    };

    const columns: ColumnsType<DelayRetirementDataType> = [
        { title: 'รหัสพนักงาน', dataIndex: 'EmployeeID', key: 'EmployeeID', align: 'center', width: 150, render: (text) => <span className="font-bold text-slate-700">{text}</span> },
        { title: 'ชื่อพนักงาน', dataIndex: 'EmployeeName', key: 'EmployeeName', width: 260, ellipsis: true, render: (text) => <span className="block truncate text-slate-700 font-medium">{text || '-'}</span> },
        { title: 'ตำแหน่ง', dataIndex: 'PosName', key: 'PosName', width: 420, ellipsis: true, render: (text) => <span className="block truncate text-slate-600 font-medium">{text || '-'}</span> },
        { title: 'ปีที่ทด', dataIndex: 'DelayYear', key: 'DelayYear', align: 'center', width: 110 },
        {
            title: 'จัดการ', key: 'action', align: 'center', width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button type="text" className="text-blue-600 hover:bg-blue-50 rounded-full" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="ยืนยันการลบข้อมูล" description="คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?" onConfirm={() => handleDelete(record.DelayID)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true, className: "bg-red-600 font-bold" }}>
                        <Button type="text" danger className="hover:bg-red-50 rounded-full" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center gap-3">
                <ClockCircleOutlined className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">จัดการพนักงานตำแหน่งเกษียณ(ทด)</h1>
            </div>

            <Card className="mb-8 border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-wrap items-end gap-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">เลือกปีเกษียณ</label>
                            <Select value={selectedYear} onChange={setSelectedYear} className="w-32" size="large" options={[{ value: '2568', label: '2568' }, { value: '2569', label: '2569' }, { value: '2570', label: '2570' }, { value: '2571', label: '2571' }]} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">ค้นหาพนักงาน / ตำแหน่ง</label>
                            <Input placeholder="รหัสพนักงาน ชื่อพนักงาน หรือ ตำแหน่ง..." prefix={<SearchOutlined className="text-slate-400" />} className="w-72" size="large" allowClear onChange={(e) => setSearchText(e.target.value)} />
                        </div>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large" className="bg-blue-600 hover:bg-blue-700 px-8 font-bold shadow-lg shadow-blue-100 rounded-xl">เพิ่มรายการ</Button>
                </div>
            </Card>

            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="DelayID"
                loading={tableLoading}
                pagination={{ pageSize: 10 }}
                bordered
                tableLayout="fixed"
                scroll={{ x: 1060 }}
                rowClassName="hover:bg-blue-50/20 transition-colors"
                className="shadow-sm rounded-xl overflow-hidden border border-slate-100"
            />

            <Modal
                title={<div className="font-bold text-lg border-b pb-3 mb-2">{editingKey ? 'แก้ไขข้อมูลพนักงานเกษียณ(ทด)' : 'เพิ่มพนักงานเกษียณ(ทด)'}</div>}
                open={isModalVisible} onOk={handleSave} onCancel={() => setIsModalVisible(false)}
                okText="บันทึกข้อมูล" okButtonProps={{ className: 'bg-blue-600 font-bold px-10 rounded-lg' }} cancelButtonProps={{ className: 'px-8 rounded-lg' }} width={550}
            >
                <div className="py-6">
                    <Form form={form} layout="vertical" requiredMark={false}>
                        <Form.Item name="EmployeeID" label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">พนักงาน</span>} rules={[{ required: true, message: 'กรุณาเลือกพนักงาน' }]}>
                            <Select showSearch placeholder="ค้นหาด้วยรหัส หรือ ชื่อ..." optionFilterProp="label" size="large" options={employeeOptions} onChange={(val) => { const opt = employeeOptions.find(o => o.value === val); form.setFieldsValue({ PosName: opt?.position }); }} />
                        </Form.Item>
                        <Form.Item name="PosName" label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">ตำแหน่ง</span>}>
                            <Input disabled className="bg-slate-50 text-slate-900 font-medium h-11" />
                        </Form.Item>
                        <Form.Item name="DelayYear" label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">ปีที่ทด</span>} rules={[{ required: true, message: 'กรุณาเลือกปีที่ทด' }]}>
                            <Select placeholder="เลือกปีที่ทด" size="large" options={delayYearOptions} />
                        </Form.Item>
                    </Form>
                </div>
            </Modal>
        </div>
    );
}

export default function DelayRetirementPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <DelayRetirementContent />
            </App>
        </Main>
    );
}
