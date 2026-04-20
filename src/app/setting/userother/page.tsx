'use client';

import React, { useState, useEffect } from 'react';
import { Button, Table, Space, Typography, App, Modal, Input, Form } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined, IdcardOutlined, MailOutlined } from '@ant-design/icons';
import { UserPlus } from 'lucide-react';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { getUserOther, insertUserOther, updateUserOther, deleteUserOther } from '@/services/userService';

const { Title } = Typography;

interface UserOther {
    key: string;
    EmployeeID: string;
    FullName: string;
    Email: string;
}

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function UserOtherContent() {
    const { message, modal } = App.useApp();
    const token = getToken();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<UserOther[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getUserOther(token);
            if (res.success && Array.isArray(res.data)) {
                setData(res.data.map((item: { EmployeeID?: string; FullName?: string; Email?: string; email?: string }, index: number) => ({
                    ...item,
                    Email: item.Email || item.email || '',
                    key: item.EmployeeID || `row-${index}`
                })));
            }
        } catch {
            message.error('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const openAddModal = () => {
        setIsEditMode(false);
        setIsAddModalOpen(true);
        setTimeout(() => form.resetFields(), 0);
    };

    const openEditModal = (record: UserOther) => {
        setIsEditMode(true);
        setIsAddModalOpen(true);
        setTimeout(() => {
            form.setFieldsValue({
                employeeId: record.EmployeeID,
                fullName: record.FullName,
                email: record.Email
            });
        }, 0);
    };

    const handleSubmit = async (values: { employeeId: string; fullName: string; email: string }) => {
        const user = getUserFromToken();
        if (!user) {
            message.error('ไม่พบข้อมูลผู้ใช้งานปัจจุบัน');
            return;
        }

        const employeeId = values.employeeId.trim();
        const fullName = values.fullName.trim();
        const email = values.email.trim().toLowerCase();

        setLoading(true);
        try {
            if (isEditMode) {
                const res = await updateUserOther(employeeId, fullName, email, user.employeeID, token);
                if (res.success) {
                    message.success(res.message || 'อัปเดตข้อมูลเรียบร้อย');
                    form.resetFields();
                    setIsAddModalOpen(false);
                    fetchData();
                } else {
                    message.error(res.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
                }
            } else {
                const res = await insertUserOther(employeeId, fullName, email, user.employeeID, token);
                if (res.success) {
                    message.success(res.message || 'ทำการเพิ่มข้อมูลเรียบร้อย');
                    form.resetFields();
                    setIsAddModalOpen(false);
                    fetchData();
                } else {
                    if (res.code === 'DUP') {
                        message.warning(res.message);
                    } else {
                        message.error(res.message || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
                    }
                }
            }
        } catch {
            message.error('เกิดข้อผิดพลาดในการดำเนินการ');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (record: UserOther) => {
        const user = getUserFromToken();
        modal.confirm({
            title: 'ยืนยันการลบข้อมูล',
            content: `คุณต้องการลบผู้ใช้งาน ${record.FullName} (${record.EmployeeID}) ใช่หรือไม่?`,
            okText: 'ตกลง',
            okType: 'danger',
            cancelText: 'ยกเลิก',
            onOk: async () => {
                try {
                    const res = await deleteUserOther(record.EmployeeID, user?.employeeID || '', token);
                    if (res.success) {
                        message.success('ลบข้อมูลเรียบร้อย');
                        fetchData();
                    } else {
                        message.error(res.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
                    }
                } catch {
                    message.error('เกิดข้อผิดพลาดในการดำเนินการ');
                }
            }
        });
    };

    const columns = [
        {
            title: 'No',
            dataIndex: 'no',
            key: 'no',
            width: 80,
            align: 'center' as const,
            render: (_: unknown, __: unknown, index: number) => index + 1,
        },
        {
            title: 'EmployeeID',
            dataIndex: 'EmployeeID',
            key: 'EmployeeID',
            width: 200,
            filters: Array.from(new Set(data.map(i => i.EmployeeID))).map(v => ({ text: v, value: v })),
            onFilter: (value: boolean | React.Key, record: UserOther) => record.EmployeeID === value,
            filterSearch: true,
        },
        {
            title: 'Name',
            dataIndex: 'FullName',
            key: 'FullName',
            filters: Array.from(new Set(data.map(i => i.FullName))).map(v => ({ text: v, value: v })),
            onFilter: (value: boolean | React.Key, record: UserOther) => record.FullName.includes(value as string),
            filterSearch: true,
        },
        {
            title: 'Email',
            dataIndex: 'Email',
            key: 'Email',
            width: 260,
            filters: Array.from(new Set(data.map(i => i.Email))).map(v => ({ text: v, value: v })),
            onFilter: (value: boolean | React.Key, record: UserOther) => record.Email.includes(value as string),
            filterSearch: true,
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            align: 'center' as const,
            render: (_: unknown, record: UserOther) => (
                <Space>
                    <Button 
                        type="text" 
                        icon={<EditOutlined className="text-blue-500" />} 
                        onClick={() => openEditModal(record)}
                        className="hover:bg-blue-50"
                    />
                    <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDelete(record)}
                        className="hover:bg-red-50"
                    />
                </Space>
            ),
        },
    ];

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow-sm">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md mb-6 text-white flex items-center gap-3">
                <UserPlus className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">จัดการผู้ใช้งาน (Other)</h1>
            </div>
            <div className="flex justify-start mb-2">
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={openAddModal}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    เพิ่มรายการ
                </Button>
            </div>

            <div className="border rounded-lg shadow-sm mt-4 overflow-hidden">
                <Table
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    rowKey="EmployeeID"
                    pagination={{
                        showSizeChanger: true,
                        showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                        defaultPageSize: 10,
                        pageSizeOptions: ['10', '20', '30', '50', '100']
                    }}
                    bordered
                    size="small"
                    className="custom-table w-[1100px]"
                />
            </div>

            <Modal
                title={<Title level={4} className="m-0">{isEditMode ? 'แก้ไขผู้ใช้งาน (Other)' : 'เพิ่มผู้ใช้งาน (Other)'}</Title>}
                open={isAddModalOpen}
                onCancel={() => {
                    form.resetFields();
                    setIsAddModalOpen(false);
                }}
                footer={null}
                centered
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    className="mt-4"
                >
                    <Form.Item
                        name="employeeId"
                        label="EmployeeID"
                        rules={[{ required: true, message: 'กรุณากรอก EmployeeID' }]}
                    >
                        <Input 
                            prefix={<IdcardOutlined className="text-gray-400" />} 
                            placeholder="เช่น 99999999"
                            disabled={isEditMode}
                        />
                    </Form.Item>
                    <Form.Item
                        name="fullName"
                        label="Name"
                        rules={[{ required: true, message: 'กรุณากรอก Name' }]}
                    >
                        <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Name" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'กรุณากรอก Email' },
                            { type: 'email', message: 'รูปแบบอีเมล์ไม่ถูกต้อง' }
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined className="text-gray-400" />}
                            placeholder="example@company.com"
                        />
                    </Form.Item>
                    <Form.Item className="mb-0 flex justify-end gap-2 mt-6">
                        <Space>
                            <Button onClick={() => setIsAddModalOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading} className="bg-blue-600">
                                บันทึก
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <style jsx global>{`
                .custom-table .ant-table-thead > tr > th {
                    background-color: #f8fafc !important;
                    color: #1e293b !important;
                    font-weight: 600 !important;
                    padding: 12px 8px !important;
                }
                .custom-table .ant-table-tbody > tr > td {
                    padding: 8px !important;
                }
            `}</style>
        </div>
    );
}

export default function UserOtherPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <UserOtherContent />
            </App>
        </Main>
    );
}
