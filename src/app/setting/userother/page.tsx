'use client';

import React, { useState, useEffect } from 'react';
import { Button, Table, Space, Typography, App, Modal, Input, Form } from 'antd';
import { PlusOutlined, DeleteOutlined, UserOutlined, IdcardOutlined } from '@ant-design/icons';
import { UserPlus } from 'lucide-react';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { getUserOther, insertUserOther, deleteUserOther } from '@/services/userService';

const { Title } = Typography;

interface UserOther {
    key: string;
    EmployeeID: string;
    FullName: string;
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
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getUserOther(token);
            if (res.success && Array.isArray(res.data)) {
                setData(res.data.map((item: { EmployeeID?: string; FullName?: string }, index: number) => ({
                    ...item,
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

    const handleAddUser = async (values: { employeeId: string; fullName: string }) => {
        const user = getUserFromToken();
        if (!user) {
            message.error('ไม่พบข้อมูลผู้ใช้งานปัจจุบัน');
            return;
        }

        setLoading(true);
        try {
            const res = await insertUserOther(values.employeeId, values.fullName, user.employeeID, token);
            if (res.success) {
                message.success(res.message || 'ทำการเพิ่มข้อมูลเรียบร้อย');
                setIsAddModalOpen(false);
                form.resetFields();
                fetchData();
            } else {
                if (res.code === 'DUP') {
                    message.warning(res.message);
                } else {
                    message.error(res.message || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
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
            title: 'Action',
            key: 'action',
            width: 120,
            align: 'center' as const,
            render: (_: unknown, record: UserOther) => (
                <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDelete(record)}
                    className="hover:bg-red-50"
                />
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
                    onClick={() => setIsAddModalOpen(true)}
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
                    className="custom-table w-[900px]"
                />
            </div>

            <Modal
                title={<Title level={4} className="m-0">เพิ่มผู้ใช้งาน (Other)</Title>}
                open={isAddModalOpen}
                onCancel={() => setIsAddModalOpen(false)}
                footer={null}
                centered
                destroyOnHidden
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleAddUser}
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
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                form.setFieldsValue({ employeeId: val });
                            }}
                        />
                    </Form.Item>
                    <Form.Item
                        name="fullName"
                        label="Name"
                        rules={[{ required: true, message: 'กรุณากรอก Name' }]}
                    >
                        <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Name" />
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
