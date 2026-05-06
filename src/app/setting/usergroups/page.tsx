'use client';

import { buildAuthHeaders, fetchApi } from '@/utils/security';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Modal, Button, Select, App, AutoComplete, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { TeamOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { SquareUser } from 'lucide-react';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import {
    getUserGroups,
    getLevelsInGroup,
    getLevelCombo,
    getMembersInGroup,
    getAllUsersCombo,
    UserGroup,
    Level,
    Member,
    UserCombo
} from '@/services/userGroupService';

const API_URL = '';

function dedupeLevels(levels: Level[]): Level[] {
    const seen = new Set<string>();
    const uniqueLevels: Level[] = [];
    for (const level of levels) {
        const key = String(level.levelGroupNo ?? '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        uniqueLevels.push(level);
    }
    return uniqueLevels;
}

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

async function apiCall(url: string, options: RequestInit = {}) {
    const token = getToken();
    const response = await fetchApi(API_URL, url, {
        ...options,
        headers: buildAuthHeaders(token, {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        })
    });
    if (!response.ok) {
        const message = await response.text();
        return { success: false, message: message || 'Request failed' };
    }
    return { success: true, data: await response.json() };
}

function UserGroupsContent() {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);

    // Level Modal States
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [levelsInGroup, setLevelsInGroup] = useState<Level[]>([]);
    const [availableLevels, setAvailableLevels] = useState<Level[]>([]);
    const [showInsertLevel, setShowInsertLevel] = useState(false);
    const [selectedLevelToAdd, setSelectedLevelToAdd] = useState<string | null>(null);

    // User Modal States
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [membersInGroup, setMembersInGroup] = useState<Member[]>([]);
    const [allUsersList, setAllUsersList] = useState<UserCombo[]>([]);
    const [showInsertUser, setShowInsertUser] = useState(false);
    const [selectedUserToAdd, setSelectedUserToAdd] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");
    const [memberPage, setMemberPage] = useState(1);
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);

    const token = getToken();
    const user = getUserFromToken();
    const currentUser = {
        employeeID: user?.employeeID || '',
        userGroupNo: user?.userGroups?.[0]?.userGroupNo || ''
    };

    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            try {
                const res = await getUserGroups(token);
                if (res.success && Array.isArray(res.data)) {
                    let filtered = res.data;
                    if (currentUser.userGroupNo === "07") {
                        filtered = res.data.filter((g: UserGroup) => g.userGroupNo !== "01" && g.userGroupNo !== "04");
                    }
                    setUserGroups(filtered);
                }
            } catch {
                message.error('ไม่สามารถโหลดข้อมูลได้');
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, [token]);

    // --- Logic 2: การจัดการระดับ (Levels) ---
    const openLevelModal = useCallback(async (group: UserGroup) => {
        setSelectedGroup(group);
        setIsLevelModalOpen(true);
        setLoading(true);
        try {
            const [levelsData, comboData] = await Promise.all([
                getLevelsInGroup(group.userGroupNo, group.levelFlag, token),
                getLevelCombo(group.userGroupNo, group.levelFlag, token)
            ]);
            setLevelsInGroup(dedupeLevels(levelsData));
            setAvailableLevels(dedupeLevels(comboData));
        } catch {
            message.error("ไม่สามารถโหลดข้อมูลระดับได้");
        } finally {
            setLoading(false);
        }
    }, [token, message]);

    const handleAddLevel = async () => {
        if (!selectedLevelToAdd || !selectedGroup) return;
        setLoading(true);
        try {
            const res = await apiCall('/api/usergroup/level', {
                method: 'POST',
                body: JSON.stringify({ UserGroupNo: selectedGroup.userGroupNo, LevelGroupNo: selectedLevelToAdd, CreateBy: currentUser.employeeID })
            });
            if (res.success) {
                message.success("เพิ่มระดับเรียบร้อย");
                setShowInsertLevel(false);
                await openLevelModal(selectedGroup);
            } else {
                message.error(res.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLevel = useCallback((levelGroupNo: string) => {
        if (!selectedGroup) return;
        modal.confirm({
            title: 'ต้องการยืนยันใช่หรือไม่?',
            onOk: async () => {
                const res = await apiCall('/api/usergroup/delete-level', {
                    method: 'POST',
                    body: JSON.stringify({ UserGroupNo: selectedGroup.userGroupNo, LevelGroupNo: levelGroupNo, UpdateBy: currentUser.employeeID })
                });
                if (res.success) {
                    message.success("ลบข้อมูลเรียบร้อย");
                    await openLevelModal(selectedGroup);
                } else {
                    message.error(res.message);
                }
            }
        });
    }, [selectedGroup, modal, currentUser.employeeID, message, openLevelModal]);

    // --- Logic 3: การจัดการผู้ใช้งาน (Members) ---
    const openUserModal = useCallback(async (group: UserGroup) => {
        setSelectedGroup(group);
        setSearchText("");
        setMemberPage(1);
        setIsUserModalOpen(true);
        setLoading(true);
        try {
            const membersData = await getMembersInGroup(group.userGroupNo, token);
            setMembersInGroup(membersData);

            if (allUsersList.length === 0) {
                const usersCombo = await getAllUsersCombo(token);
                setAllUsersList(usersCombo);
            }
        } catch {
            message.error("ไม่สามารถโหลดข้อมูลสมาชิกได้");
        } finally {
            setLoading(false);
        }
    }, [token, message, allUsersList.length]);

    const handleAddUser = async () => {
        if (!selectedUserToAdd || !selectedGroup) {
            if (!selectedUserToAdd) message.error("กรุณาเลือกพนักงาน");
            return;
        }
        setLoading(true);
        try {
            const res = await apiCall('/api/usergroup/member', {
                method: 'POST',
                body: JSON.stringify({ UserGroupNo: selectedGroup.userGroupNo, EmployeeID: selectedUserToAdd, CreateBy: currentUser.employeeID })
            });
            if (res.success) {
                message.success("เพิ่มผู้ใช้งานเรียบร้อย");
                setShowInsertUser(false);
                await openUserModal(selectedGroup);
            } else {
                message.error(res.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = useCallback((employeeID: string) => {
        if (!selectedGroup) return;
        modal.confirm({
            title: 'ต้องการยืนยันใช่หรือไม่?',
            onOk: async () => {
                const res = await apiCall('/api/usergroup/delete-member', {
                    method: 'POST',
                    body: JSON.stringify({ UserGroupNo: selectedGroup.userGroupNo, EmployeeID: employeeID, UpdateBy: currentUser.employeeID })
                });
                if (res.success) {
                    message.success("ลบข้อมูลเรียบร้อย");
                    await openUserModal(selectedGroup);
                } else {
                    message.error(res.message);
                }
            }
        });
    }, [selectedGroup, modal, currentUser.employeeID, message, openUserModal]);

    // --- Table Columns ---
    const mainColumns: ColumnsType<UserGroup> = [
        { title: 'ลำดับ', align: 'center', width: 80, render: (_, __, i) => i + 1 },
        { title: 'กลุ่มผู้ใช้งาน', dataIndex: 'userGroupName', key: 'userGroupName', className: 'font-bold' },
        { title: 'Role', dataIndex: 'userGroupRole', key: 'userGroupRole' },
        {
            title: 'ระดับ', align: 'center', width: 100,
            render: (_, record) => (
                <TeamOutlined className="text-xl text-gray-500 cursor-pointer hover:text-orange-400"
                    onClick={() => openLevelModal(record)} />
            )
        },
        {
            title: 'ผู้ใช้งาน', align: 'center', width: 120,
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-blue-500"
                    onClick={() => openUserModal(record)}>
                    <SearchOutlined className="text-blue-400 text-lg" />
                    <span className="font-medium">{record.chkuser}</span>
                </div>
            )
        },
    ];

    const memberColumns = useMemo<ColumnsType<Member>>(() => [
        { title: 'ลำดับ', align: 'center' as const, render: (_, __, i) => (memberPage - 1) * 10 + i + 1 },
        { title: 'รหัส/ชื่อผู้ใช้งาน', render: (_, r) => r.nameAll },
        {
            title: '', align: 'center' as const, render: (_, r) =>
                <CloseOutlined className="text-red-500 cursor-pointer" onClick={() => handleDeleteUser(r.employeeID)} />
        }
    ], [handleDeleteUser, memberPage]);

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow-sm">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center gap-3">
                <SquareUser className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">จัดการกลุ่มผู้ใช้งาน</h1>
            </div>

            <Table
                columns={mainColumns}
                dataSource={userGroups}
                rowKey="userGroupNo"
                pagination={false}
                loading={loading}
            />

            {/* --- Modal 1: Manage Levels --- */}
            <Modal
                title={<div className="text-blue-600 font-bold">{selectedGroup?.userGroupName} - จัดการระดับ</div>}
                open={isLevelModalOpen}
                onCancel={() => { setIsLevelModalOpen(false); setShowInsertLevel(false); }}
                footer={null}
                width={600}
                centered
            >
                <div className="flex flex-col gap-4 min-h-[300px]">
                    <Button type="primary" onClick={() => setShowInsertLevel(true)} className="w-fit">เพิ่มรายการ</Button>
                    {showInsertLevel && (
                        <div className="flex gap-2 p-3 bg-gray-50 border rounded-md">
                            <Select
                                className="flex-1"
                                placeholder="เลือกรายการ"
                                options={availableLevels.map(l => ({ label: l.nameAll, value: l.levelGroupNo }))}
                                onChange={setSelectedLevelToAdd}
                            />
                            <Button type="primary" onClick={handleAddLevel}>ยืนยัน</Button>
                            <Button onClick={() => setShowInsertLevel(false)}>ยกเลิก</Button>
                        </div>
                    )}
                    <Table
                        size="small"
                        dataSource={levelsInGroup}
                        rowKey="levelGroupNo"
                        pagination={false}
                        loading={loading}
                        columns={[
                            { title: 'ลำดับ', align: 'center', render: (_, __, i) => i + 1 },
                            { title: 'ระดับ', render: (_, r) => r.nameAll },
                            {
                                title: '',
                                align: 'center',
                                render: (_, r) => <CloseOutlined className="text-red-500 cursor-pointer" onClick={() => handleDeleteLevel(r.levelGroupNo)} />
                            }
                        ]}
                    />
                </div>
            </Modal>

            {/* --- Modal 2: Manage Users --- */}
            <Modal
                title={<div className="text-blue-600 font-bold">{selectedGroup?.userGroupName} - จัดการสมาชิก</div>}
                open={isUserModalOpen}
                onCancel={() => { setIsUserModalOpen(false); setShowInsertUser(false); }}
                footer={null}
                width={700}
                centered
            >
                <div className="flex flex-col gap-4 min-h-[400px]">
                    <Button type="primary" onClick={() => setShowInsertUser(true)} className="w-fit">เพิ่มรายการ</Button>
                    {showInsertUser && (
                        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
                            <AutoComplete
                                className="flex-1"
                                placeholder="พิมพ์รหัสหรือชื่อผู้ใช้งาน..."
                                options={allUsersList}
                                onSelect={setSelectedUserToAdd}
                                onChange={setSelectedUserToAdd}
                                filterOption={(input, opt) => (opt?.label ?? '').includes(input)}
                            />
                            <Button type="primary" onClick={handleAddUser}>ยืนยัน</Button>
                            <Button onClick={() => setShowInsertUser(false)}>ยกเลิก</Button>
                        </div>
                    )}
                    <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="ค้นหา รหัส/ชื่อผู้ใช้งาน..."
                        value={searchText}
                        onChange={(e) => { setSearchText(e.target.value); setMemberPage(1); }}
                        allowClear
                    />
                    <Table
                        size="small"
                        loading={loading}
                        dataSource={membersInGroup.filter(r =>
                            (r.nameAll || '').toLowerCase().includes(searchText.toLowerCase()) ||
                            (r.employeeID || '').toLowerCase().includes(searchText.toLowerCase())
                        )}
                        rowKey="employeeID"
                        pagination={{
                            pageSize: 10,
                            current: memberPage,
                            onChange: (page) => setMemberPage(page)
                        }}
                        columns={memberColumns}
                    />
                </div>
            </Modal>
        </div>
    );
}

export default function UserGroupsPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <UserGroupsContent />
            </App>
        </Main>
    );
}
