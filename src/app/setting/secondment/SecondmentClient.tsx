'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Button, Select, Table, Modal, App, Popconfirm, Tooltip, Spin } from "antd";
import { LoginOutlined, PlusOutlined, SearchOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Trash2 } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import { addUnitToPoolAction, removeUnitFromPoolAction } from "./actions";
import { getSecondmentPools, UnitCombo, SecondmentPool } from "@/services/secondmentService";

interface SecondmentClientProps {
    initialData: {
        allUnits: UnitCombo[];
        parentUnits: UnitCombo[];
    };
    token: string;
    currentUser: any;
}

export default function SecondmentClient({ initialData, token, currentUser }: SecondmentClientProps) {
    const { message } = App.useApp();
    const [selectedParent, setSelectedParent] = useState<string | null>(null);
    const [poolUnits, setPoolUnits] = useState<SecondmentPool[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
    const [selectedUnitToAdd, setSelectedUnitToAdd] = useState<string | null>(null);

    const handleSearchData = useCallback(async () => {
        if (!selectedParent) {
            message.warning("กรุณาเลือกหน่วยงานหลัก");
            return;
        }
        setLoading(true);
        try {
            const res = await getSecondmentPools(selectedParent, token);
            if (res && res.status === 200) {
                setPoolUnits(res.data.map((p: SecondmentPool, i: number) => ({ ...p, key: p.OrgUnitNo || `pool-${i}` })));
            }
        } finally {
            setLoading(false);
        }
    }, [selectedParent, token, message]);

    const handleAddUnit = async () => {
        if (!selectedParent || !selectedUnitToAdd) return;
        setLoading(true);
        try {
            const res = await addUnitToPoolAction({
                orgUnitNo: selectedUnitToAdd,
                parentOrgUnitNo: selectedParent,
                createBy: currentUser.employeeID || 'SYSTEM'
            }, token);
            if (res.success) {
                message.success("เพิ่มข้อมูลเรียบร้อย");
                setIsAddModalOpen(false);
                setSelectedUnitToAdd(null);
                handleSearchData();
            } else {
                message.error(res.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (orgUnitNo: string) => {
        if (!selectedParent) return;
        setLoading(true);
        try {
            const res = await removeUnitFromPoolAction({
                orgUnitNo,
                parentOrgUnitNo: selectedParent,
                updateBy: currentUser.employeeID || 'SYSTEM'
            }, token);
            if (res.success) {
                message.success("ลบข้อมูลเรียบร้อย");
                handleSearchData();
            } else {
                message.error(res.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const columns: ColumnsType<SecondmentPool> = [
        {
            title: "No",
            key: "no",
            align: "center",
            width: 80,
            render: (_, __, index) => index + 1,
        },
        {
            title: "หน่วยงาน",
            dataIndex: "UnitText",
            key: "UnitText",
        },
        {
            title: "จัดการ",
            key: "action",
            align: "center",
            width: 120,
            render: (_, record) => (
                <Popconfirm
                    title="ยืนยันการลบหน่วยงานออกจาก Pool?"
                    onConfirm={() => handleDelete(record.OrgUnitNo)}
                    okText="ใช่"
                    cancelText="ไม่"
                >
                    <Button
                        type="text"
                        danger
                        icon={<Trash2 size={18} />}
                        className="hover:bg-red-50 rounded-full flex items-center justify-center mx-auto"
                    />
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center gap-3">
                <LoginOutlined className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">จัดการ Secondment Pool</h1>
            </div>

            <Card className="mb-8 border-slate-200">
                <div className="flex flex-col md:flex-row justify-center items-center gap-6 py-4">
                    <div className="flex items-center gap-4">
                        <span className="text-slate-700 font-bold text-lg">หน่วยงานหลัก :</span>
                        <Select
                            placeholder="-- เลือกหน่วยงานทั้งหมด --"
                            className="w-[500px]"
                            size="large"
                            showSearch
                            allowClear
                            value={selectedParent}
                            onChange={setSelectedParent}
                            options={initialData.allUnits.map(u => ({ label: u.UnitText, value: u.OrgUnitNo }))}
                        />
                        <Tooltip title="ดูรายชื่อหน่วยงานที่มีการเพิ่ม pool แล้ว">
                            <Button
                                type="text"
                                icon={<SearchOutlined style={{ fontSize: "24px", color: "#f59e0b" }} />}
                                className="flex items-center justify-center hover:bg-amber-50 rounded-full w-10 h-10"
                                onClick={() => setIsOrgModalOpen(true)}
                            />
                        </Tooltip>
                        <Button
                            type="primary"
                            size="large"
                            className="bg-blue-600 font-bold px-10 rounded-xl shadow-md"
                            onClick={handleSearchData}
                            loading={loading}
                        >
                            ตกลง
                        </Button>
                    </div>
                </div>
            </Card>

            {selectedParent && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CheckCircleOutlined className="text-blue-600" />
                            รายชื่อหน่วยงานใน Secondment Pool
                        </h2>
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            className="bg-emerald-500 hover:bg-emerald-600 border-none px-8 rounded-xl font-bold shadow-md"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            เพิ่มหน่วยงาน
                        </Button>
                    </div>

                    <Table
                        columns={columns}
                        dataSource={poolUnits}
                        loading={loading}
                        pagination={false}
                        bordered
                        rowKey="OrgUnitNo"
                        className="shadow-sm rounded-xl overflow-hidden border-slate-100"
                    />
                </div>
            )}

            <Modal
                title={<div className="font-bold text-lg border-b pb-3">เพิ่มหน่วยงานเข้า Pool</div>}
                open={isAddModalOpen}
                onOk={handleAddUnit}
                onCancel={() => setIsAddModalOpen(false)}
                okText="เพิ่มเข้า Pool"
                okButtonProps={{ className: "bg-emerald-500 font-bold" }}
                width={600}
            >
                <div className="py-8">
                    <p className="text-slate-500 mb-4 font-medium uppercase text-xs tracking-wider">ค้นหาและเลือกหน่วยงานที่ต้องการเพิ่ม:</p>
                    <Select
                        placeholder="พิมพ์เพื่อค้นหาหน่วยงาน..."
                        className="w-full"
                        size="large"
                        showSearch
                        value={selectedUnitToAdd}
                        onChange={setSelectedUnitToAdd}
                        options={initialData.allUnits.map(u => ({ label: u.UnitText, value: u.OrgUnitNo }))}
                    />
                </div>
            </Modal>

            <Modal
                title={<div className="font-bold text-lg border-b pb-3">หน่วยงานที่มีการเพิ่ม Secondment Pool</div>}
                open={isOrgModalOpen}
                onCancel={() => setIsOrgModalOpen(false)}
                footer={[<Button key="close" onClick={() => setIsOrgModalOpen(false)} className="px-8 font-bold">ปิด</Button>]}
                width={700}
            >
                <div className="py-4">
                    <Table
                        size="middle"
                        pagination={{ pageSize: 8 }}
                        dataSource={initialData.parentUnits}
                        rowKey="OrgUnitNo"
                        columns={[
                            { title: 'No', render: (_, __, i) => i + 1, width: 80, align: 'center' },
                            { title: 'ชื่อหน่วยงาน', dataIndex: 'UnitText' }
                        ]}
                        bordered
                    />
                </div>
            </Modal>
        </div>
    );
}
