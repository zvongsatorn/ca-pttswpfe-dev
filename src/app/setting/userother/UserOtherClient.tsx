'use client';

import React, { useState } from 'react';
import { Button, Table, Space, Typography, App, Modal, Input, Form } from 'antd';
import { PlusOutlined, DeleteOutlined, UserOutlined, IdcardOutlined } from '@ant-design/icons';
import { UserPlus } from 'lucide-react';
import { addUserAction, deleteUserAction } from './actions';
import { getUserFromToken } from '@/utils/auth';

const { Title } = Typography;

interface UserOther {
    key: string;
    EmployeeID: string;
    FullName: string;
}

interface UserOtherClientProps {
    initialData: UserOther[];
}

export default function UserOtherClient({ initialData }: UserOtherClientProps) {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [form] = Form.useForm();

    const handleAddUser = async (values: { employeeId: string; fullName: string }) => {
        const user = getUserFromToken();
        if (!user) {
            message.error('ไม่พบข้อมูลผู้ใช้งานปัจจุบัน');
            return;
        }

        setLoading(true);
        try {
            const res = await addUserAction(values.employeeId, values.fullName, user.employeeID);
            if (res.success) {
                message.success(res.message || 'ทำการเพิ่มข้อมูลเรียบร้อย');
                setIsAddModalOpen(false);
                form.resetFields();
            } else {
                if (res.code === 'DUP') {
                    message.warning(res.message);
                } else {
                    message.error(res.message || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
                }
            }
        } catch (error) {
            console.error('Error adding user:', error);
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
                    const res = await deleteUserAction(record.EmployeeID, user?.employeeID || '');
                    if (res.success) {
                        message.success('ลบข้อมูลเรียบร้อย');
                    } else {
                        message.error(res.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
                    }
                } catch (error) {
                    console.error('Error deleting user:', error);
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
            filters: Array.from(new Set(initialData.map(i => i.EmployeeID))).map(v => ({ text: v, value: v })),
            onFilter: (value: boolean | React.Key, record: UserOther) => record.EmployeeID === value,
            filterSearch: true,
        },
        {
            title: 'FullName',
            dataIndex: 'FullName',
            key: 'FullName',
            filters: Array.from(new Set(initialData.map(i => i.FullName))).map(v => ({ text: v, value: v })),
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
                    dataSource={initialData}
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
                    className="custom-table"
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
                        <Input prefix={<IdcardOutlined className="text-gray-400" />} placeholder="เช่น 99999999" />
                    </Form.Item>
                    <Form.Item
                        name="fullName"
                        label="FullName"
                        rules={[{ required: true, message: 'กรุณากรอก FullName' }]}
                    >
                        <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="ชื่อ-นามสกุล" />
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
