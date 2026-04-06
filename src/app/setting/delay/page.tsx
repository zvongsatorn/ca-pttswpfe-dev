'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, Input, Popconfirm, App, Tag, Space, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined, EditOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
import Main from '@/components/layout/main';
import { getDelayRetirementData, getEmployeeOptions, DelayRetirementDataType } from '@/services/delayService';

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function DelayRetirementContent() {
    const { notification } = App.useApp();
    const [form] = Form.useForm();
    const token = getToken();
    
    const [selectedYear, setSelectedYear] = useState<string>('2568');
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tableData, setTableData] = useState<DelayRetirementDataType[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const [dataRes, empRes] = await Promise.all([
                getDelayRetirementData(token),
                getEmployeeOptions(token)
            ]);
            if (dataRes.data) setTableData(dataRes.data);
            if (empRes.data) setEmployeeOptions(empRes.data);
        };
        fetchData();
    }, [token]);

    const filteredData = useMemo(() => {
        return tableData.filter(item => {
            const matchesYear = item.DelayYear === selectedYear;
            const matchesSearch = item.EmployeeID.includes(searchText) || item.PosName.includes(searchText);
            return matchesYear && matchesSearch;
        });
    }, [tableData, selectedYear, searchText]);

    const handleDelete = async (key: string) => {
        // Stub - future API integration
        setTableData(prev => prev.filter(item => item.key !== key));
        notification.success({ message: 'สำเร็จ', description: 'ลบข้อมูลเรียบร้อยแล้ว' });
    };

    const handleEdit = (record: DelayRetirementDataType) => {
        setEditingKey(record.key);
        setIsModalVisible(true);
        form.setFieldsValue(record);
    };

    const handleAdd = () => {
        setEditingKey(null);
        setIsModalVisible(true);
        form.resetFields();
        form.setFieldsValue({ DelayYear: selectedYear, DelayStatus: 1 });
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const selectedEmp = employeeOptions.find(opt => opt.value === values.EmployeeID);
            if (editingKey) {
                setTableData(prev => prev.map(item => 
                    item.key === editingKey ? { ...item, ...values, PosName: selectedEmp?.position || item.PosName } : item
                ));
                notification.success({ message: 'สำเร็จ', description: 'แก้ไขข้อมูลเรียบร้อยแล้ว' });
            } else {
                const newEntry: DelayRetirementDataType = {
                    key: Date.now().toString(),
                    DelayID: (Math.floor(Math.random() * 9000) + 1000).toString(),
                    EmployeeID: values.EmployeeID,
                    PosName: selectedEmp?.position || '',
                    DelayYear: values.DelayYear,
                    DelayStatus: values.DelayStatus,
                };
                setTableData(prev => [...prev, newEntry]);
                notification.success({ message: 'สำเร็จ', description: 'เพิ่มข้อมูลเรียบร้อยแล้ว' });
            }
            setIsModalVisible(false);
        } catch (error) {
            console.error('Validate Failed:', error);
        }
    };

    const columns: ColumnsType<DelayRetirementDataType> = [
        { title: 'รหัสพนักงาน', dataIndex: 'EmployeeID', key: 'EmployeeID', align: 'center', width: 140, render: (text) => <span className="font-bold text-slate-700">{text}</span> },
        { title: 'ตำแหน่ง', dataIndex: 'PosName', key: 'PosName', render: (text) => <span className="text-slate-600 font-medium">{text}</span> },
        { title: 'ปีที่ทด', dataIndex: 'DelayYear', key: 'DelayYear', align: 'center', width: 100 },
        { title: 'สถานะ', dataIndex: 'DelayStatus', key: 'DelayStatus', align: 'center', width: 120, render: (status: number) => <Tag color={status === 1 ? 'green' : 'red'} variant="filled" className="rounded-full px-4 border-none font-bold">{status === 1 ? 'ใช้งาน' : 'ยกเลิก'}</Tag> },
        {
            title: 'จัดการ', key: 'action', align: 'center', width: 120,
            render: (_, record) => (
                <Space size="middle">
                    <Button type="text" className="text-blue-600 hover:bg-blue-50 rounded-full" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="ยืนยันการลบข้อมูล" description="คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?" onConfirm={() => handleDelete(record.key)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true, className: "bg-red-600 font-bold" }}>
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
                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">เลือกปีเกษียณ (BE)</label>
                            <Select value={selectedYear} onChange={setSelectedYear} className="w-32" size="large" options={[{ value: '2568', label: '2568' }, { value: '2569', label: '2569' }, { value: '2570', label: '2570' }, { value: '2571', label: '2571' }]} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">ค้นหาพนักงาน / ตำแหน่ง</label>
                            <Input placeholder="รหัสพนักงาน หรือ ตำแหน่ง..." prefix={<SearchOutlined className="text-slate-400" />} className="w-72" size="large" allowClear onChange={(e) => setSearchText(e.target.value)} />
                        </div>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large" className="bg-blue-600 hover:bg-blue-700 px-8 font-bold shadow-lg shadow-blue-100 rounded-xl">เพิ่มรายการ</Button>
                </div>
            </Card>

            <Table columns={columns} dataSource={filteredData} pagination={{ pageSize: 10 }} bordered rowClassName="hover:bg-blue-50/20 transition-colors" className="shadow-sm rounded-xl overflow-hidden border border-slate-100" />

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
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="DelayYear" label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">ปีที่ทด</span>} rules={[{ required: true, message: 'กรุณาเลือกปี' }]}>
                                <Select placeholder="เลือกปี" size="large" options={[{ value: '2568', label: '2568' }, { value: '2569', label: '2569' }, { value: '2570', label: '2570' }, { value: '2571', label: '2571' }, { value: '2572', label: '2572' }]} />
                            </Form.Item>
                            <Form.Item name="DelayStatus" label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">สถานะ</span>} rules={[{ required: true }]}>
                                <Select size="large" options={[{ value: 1, label: 'ใช้งาน (Active)' }, { value: 0, label: 'ยกเลิก (Inactive)' }]} />
                            </Form.Item>
                        </div>
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
