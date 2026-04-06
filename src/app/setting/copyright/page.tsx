'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Select, Button, Modal, App, Card, Divider } from 'antd';
import { Users, Copy, ArrowRight } from 'lucide-react';
import { InfoCircleOutlined } from '@ant-design/icons';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { fetchUserGroups, fetchUserGroupMembers, copyOrgRights } from '@/services/userRightService';

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function CopyrightContent() {
    const { notification, modal, message } = App.useApp();
    const token = getToken();
    const currentUser = getUserFromToken();

    const [userGroups, setUserGroups] = useState<{ value: string; label: string }[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [usersInGroup, setUsersInGroup] = useState<{ value: string; label: string }[]>([]);
    const [selectedUserFrom, setSelectedUserFrom] = useState<string | null>(null);
    const [selectedUserTo, setSelectedUserTo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [pageLoader, setPageLoader] = useState(false);

    useEffect(() => {
        const fetchGroups = async () => {
            const groupsRes = await fetchUserGroups(token);
            if (Array.isArray(groupsRes)) {
                let filtered = groupsRes;
                const userGroupNo = currentUser?.userGroups?.[0]?.userGroupNo || '';
                if (userGroupNo === "07") {
                    filtered = groupsRes.filter((g: any) => g.userGroupNo !== '04' && g.userGroupNo !== '01');
                }
                setUserGroups(filtered.map((g: any) => ({ value: g.userGroupNo, label: g.userGroupName })));
            }
        };
        fetchGroups();
    }, [token]);

    const handleGroupChange = useCallback(async (value: string) => {
        setSelectedGroup(value);
        setSelectedUserFrom(null);
        setSelectedUserTo(null);
        setPageLoader(true);
        try {
            const res = await fetchUserGroupMembers(value, token);
            if (res && Array.isArray(res)) {
                setUsersInGroup(res.map((u: any) => ({ value: u.employeeID, label: `${u.nameAll}` })));
            } else {
                notification.error({ message: 'ข้อผิดพลาด', description: 'ไม่สามารถโหลดรายชื่อผู้ใช้งานได้' });
            }
        } catch {
            notification.error({ message: 'ข้อผิดพลาด', description: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' });
        } finally {
            setPageLoader(false);
        }
    }, [token, notification]);

    const handleSubmit = async () => {
        if (!selectedGroup) {
            message.warning('กรุณาเลือกกลุ่มผู้ใช้งาน');
            return;
        }
        if (!selectedUserFrom || !selectedUserTo) {
            message.warning('กรุณาเลือกผู้ใช้งานให้ครบถ้วน');
            return;
        }
        if (selectedUserFrom === selectedUserTo) {
            message.warning('กรุณาเลือกผู้ใช้งานที่ต่างกัน');
            return;
        }

        modal.confirm({
            title: 'ยืนยันการคัดลอกสิทธิ์',
            icon: <Copy className="text-blue-600 mr-2" size={24} />,
            content: 'คุณต้องการคัดลอกสิทธิ์ผู้ดูแลตามสายงานจากผู้ใช้งานที่เลือกใช่หรือไม่? ข้อมูลสิทธิ์เดิมของผู้รับจะถูกเขียนทับ',
            okText: 'ยืนยันการคัดลอก',
            cancelText: 'ยกเลิก',
            centered: true,
            okButtonProps: { className: 'bg-blue-600 font-bold px-8 h-10' },
            cancelButtonProps: { className: 'px-8 h-10' },
            onOk: async () => {
                setLoading(true);
                try {
                    const res = await copyOrgRights({
                        UserGroupNo: selectedGroup,
                        EmployeeIDFrom: selectedUserFrom,
                        EmployeeIDTo: selectedUserTo,
                        CreateBy: currentUser?.employeeID || 'SYSTEM'
                    }, token);
                    
                    if (res?.success) {
                        notification.success({ message: 'สำเร็จ', description: 'คัดลอกสิทธิ์เรียบร้อยแล้ว' });
                        setSelectedUserFrom(null);
                        setSelectedUserTo(null);
                    } else {
                        notification.error({ message: 'ข้อผิดพลาด', description: res?.error || 'ไม่สามารถคัดลอกสิทธิ์ได้' });
                    }
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center gap-3">
                <Users className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">Copy สิทธิ์ผู้ดูแลตามสายงาน</h1>
            </div>

            <Card className="max-w-4xl mx-auto border-slate-200 shadow-sm overflow-hidden" styles={{ body: { padding: 0 } }}>
               

                <div className="p-8">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider pl-1">กลุ่มผู้ใช้งาน (User Group)</label>
                            <Select
                                placeholder="-- เลือกกลุ่มผู้ใช้งาน --"
                                className="w-100"
                                size="large"
                                options={userGroups}
                                value={selectedGroup}
                                onChange={handleGroupChange}
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </div>

                        <Divider className="my-2" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative">
                            <div className="flex flex-col gap-2">
                                <label className="text-blue-600 font-bold text-xs uppercase tracking-wider pl-1">จากผู้ใช้งานต้นทาง (Source)</label>
                                <Select
                                    placeholder={selectedGroup ? "เลือกพนักงาน..." : "กรุณาเลือกกลุ่มก่อน"}
                                    className="w-full"
                                    size="large"
                                    options={usersInGroup}
                                    value={selectedUserFrom}
                                    onChange={setSelectedUserFrom}
                                    disabled={!selectedGroup || pageLoader}
                                    loading={pageLoader}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </div>

                            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white p-2 rounded-full border border-slate-200 shadow-sm mt-3">
                                <ArrowRight className="text-slate-400" size={20} />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-emerald-600 font-bold text-xs uppercase tracking-wider pl-1">ไปยังผู้ใช้งานปลายทาง (Target)</label>
                                <Select
                                    placeholder={selectedGroup ? "เลือกพนักงาน..." : "กรุณาเลือกกลุ่มก่อน"}
                                    className="w-full"
                                    size="large"
                                    options={usersInGroup}
                                    value={selectedUserTo}
                                    onChange={setSelectedUserTo}
                                    disabled={!selectedGroup || pageLoader}
                                    loading={pageLoader}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex justify-center mt-6">
                            <Button 
                                type="primary" 
                                icon={<Copy size={18} />}
                                className="bg-blue-600 hover:bg-blue-700 h-14 px-12 rounded-2xl flex items-center gap-3 font-bold text-lg shadow-lg shadow-blue-100 transition-all border-none"
                                onClick={handleSubmit}
                                loading={loading}
                                disabled={!selectedUserFrom || !selectedUserTo}
                            >
                                คัดลอกสิทธิ์
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function CopyrightPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <CopyrightContent />
            </App>
        </Main>
    );
}
