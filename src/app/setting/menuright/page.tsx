'use client';

import { buildAuthHeaders, fetchApi } from '@/utils/security';
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Select, Switch, App, Card, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import Main from '@/components/layout/main';
import { fetchAllRoles, fetchMenuRightsByRole } from '@/services/menuService';

const API_BASE_URL = '';

interface MenuItem {
    MenuID: number;
    MenuName: string;
    MenuIcon: string | null;
    ParentID: number | null;
    hasRight: boolean;
    children?: MenuItem[];
    SortNumber: number;
}

interface UserGroup {
    userGroupNo: string;
    userGroupName: string;
    userGroupRole: string;
}

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function MenuRightContent() {
    const { message } = App.useApp();
    const token = getToken();
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<UserGroup[]>([]);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

    useEffect(() => {
        const loadRoles = async () => {
            const data = await fetchAllRoles(token);
            if (data) setRoles(data);
        };
        loadRoles();
    }, [token]);

    const fetchMenuRights = useCallback(async (role: string) => {
        setLoading(true);
        try {
            const data = await fetchMenuRightsByRole(role, token);
            setMenuItems(data || []);
        } catch {
            message.error("ไม่สามารถโหลดข้อมูลสิทธิ์การใช้งานได้");
        } finally {
            setLoading(false);
        }
    }, [message, token]);

    useEffect(() => {
        if (selectedRole) { fetchMenuRights(selectedRole); }
        else { setMenuItems([]); }
    }, [selectedRole, fetchMenuRights]);

    const handleToggleRight = async (menuID: number, hasRight: boolean) => {
        if (!selectedRole) return;
        const updateTree = (items: MenuItem[]): MenuItem[] => items.map(item => {
            if (item.MenuID === menuID) return { ...item, hasRight };
            if (item.children) return { ...item, children: updateTree(item.children) };
            return item;
        });
        const previousItems = [...menuItems];
        setMenuItems(prev => updateTree(prev));

        const res = await fetchApi(API_BASE_URL, '/api/menu/rights', {
            method: 'POST',
            headers: buildAuthHeaders(token, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userGroupRole: selectedRole, menuID, hasRight }),
        });

        if (res.ok) {
            message.success("บันทึกเรียบร้อย");
        } else {
            const err = await res.json();
            message.error(err.error || 'Failed to save');
            setMenuItems(previousItems);
        }
    };

    const columns: ColumnsType<MenuItem> = [
        { title: 'ชื่อเมนู', dataIndex: 'MenuName', key: 'MenuName', render: (text, record) => (<span>{record.MenuIcon && <i className={`${record.MenuIcon} mr-2`} />} {text}</span>) },
        { title: 'สิทธิ์การใช้งาน', key: 'action', width: 150, align: 'center', render: (_, record) => (<Switch checked={record.hasRight} onChange={(checked) => handleToggleRight(record.MenuID, checked)} checkedChildren="เปิด" unCheckedChildren="ปิด" />) }
    ];

    const roleOptions = Array.from(new Set(roles.map(r => r.userGroupRole)))
        .filter(role => ['ADMIN','HRPOLICY', 'HRADMIN', 'HRVERIFY', 'HRUSER','OTHER'].includes(role))
        .map(role => ({ label: role, value: role }));

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow-sm min-h-[600px]">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center gap-3">
                <SafetyCertificateOutlined className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">จัดการสิทธิ์เมนู (Menu Rights)</h1>
            </div>

            <Card className="mb-6 border-slate-200">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-700">เลือกกลุ่มสิทธิ์ (Role):</span>
                    <Select className="w-64" placeholder="เลือก Role" options={roleOptions} onChange={setSelectedRole} value={selectedRole} showSearch />
                </div>
            </Card>

            {selectedRole ? (
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={menuItems}
                        rowKey="MenuID"
                        pagination={false}
                        defaultExpandAllRows
                        bordered
                        className="border-slate-100"
                        scroll={{ y: 'calc(100vh - 400px)' }}
                    />
                </Spin>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                   <SafetyCertificateOutlined className="text-6xl mb-4 opacity-20" />
                   <p>กรุณาเลือก Role เพื่อจัดการสิทธิ์การใช้งานเมนู</p>
                </div>
            )}
        </div>
    );
}

export default function MenuRightPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <MenuRightContent />
            </App>
        </Main>
    );
}
