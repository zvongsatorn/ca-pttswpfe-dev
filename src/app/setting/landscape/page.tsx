'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, DatePicker, Form, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Mountain } from 'lucide-react';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { fetchAllUnits } from '@/services/userRightService';
import {
    createLandscape,
    deleteLandscape,
    getLandscape,
    updateLandscape,
    type LandscapePayload,
    type LandscapeRecord
} from '@/services/landscapeService';

const { Text } = Typography;
const DEFAULT_END_DATE = '9999-12-31';

interface UnitOption {
    value: string;
    label: string;
}

interface LandscapeFormValues {
    orgUnitNo?: string;
    beginDate?: Dayjs;
    endDate?: Dayjs;
    vp?: number;
    dm?: number;
    sr?: number;
    jr?: number;
}

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

const toLandscapePayload = (record: LandscapeRecord): LandscapePayload => ({
    orgUnitNo: record.OrgUnitNo || null,
    beginDate: record.BeginDate,
    endDate: record.EndDate || DEFAULT_END_DATE,
    vp: Number(record.vp),
    dm: Number(record.dm),
    sr: Number(record.sr),
    jr: Number(record.jr)
});

const mapLandscapeRecord = (item: Record<string, unknown>): LandscapeRecord => ({
    OrgUnitNo: item.OrgUnitNo ? String(item.OrgUnitNo).trim() : null,
    BeginDate: String(item.BeginDate || ''),
    EndDate: String(item.EndDate || DEFAULT_END_DATE),
    vp: Number(item.vp || 0),
    dm: Number(item.dm || 0),
    sr: Number(item.sr || 0),
    jr: Number(item.jr || 0)
});

const normalizeOrgUnitNo = (value: string | null | undefined): string => (value || '').trim();
const toEffectiveEndDate = (value: string | null | undefined): string => value || DEFAULT_END_DATE;
const isPeriodOverlap = (aBegin: string, aEnd: string, bBegin: string, bEnd: string): boolean =>
    aBegin <= bEnd && aEnd >= bBegin;

function LandscapeContent() {
    const { notification, message: messageApi } = App.useApp();
    const [form] = Form.useForm<LandscapeFormValues>();
    const token = getToken();
    const currentUser = getUserFromToken();

    const [rows, setRows] = useState<LandscapeRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<LandscapeRecord | null>(null);
    const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
    const selectNumberOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        window.setTimeout(() => event.target.select(), 0);
    };

    const unitLabelMap = useMemo(
        () => new Map(unitOptions.map((option) => [option.value, option.label])),
        [unitOptions]
    );

    const loadLandscape = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getLandscape(token);
            if (res?.success && Array.isArray(res.data)) {
                setRows((res.data as Record<string, unknown>[]).map((item) => mapLandscapeRecord(item)));
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error('Failed to load landscape data:', error);
            messageApi.error('ไม่สามารถโหลดข้อมูลได้');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [messageApi, token]);

    useEffect(() => {
        void loadLandscape();
    }, [loadLandscape]);

    useEffect(() => {
        const loadUnits = async () => {
            const unitsData = await fetchAllUnits(token);
            if (!Array.isArray(unitsData)) return;
            setUnitOptions(
                unitsData.map((u: Record<string, unknown>) => ({
                    value: String(u.OrgUnitNo || u.id || ''),
                    label: String(u.UnitText || u.unitText || u.name || u.OrgUnitNo || u.id || '')
                })).filter((item) => item.value && item.label)
            );
        };
        void loadUnits();
    }, [token]);

    const openCreateModal = () => {
        setEditingRow(null);
        form.setFieldsValue({
            orgUnitNo: undefined,
            beginDate: undefined,
            endDate: undefined,
            vp: 0,
            dm: 0,
            sr: 0,
            jr: 0
        });
        setIsModalOpen(true);
    };

    const openEditModal = (record: LandscapeRecord) => {
        setEditingRow(record);
        form.setFieldsValue({
            orgUnitNo: record.OrgUnitNo || undefined,
            beginDate: record.BeginDate ? dayjs(record.BeginDate) : undefined,
            endDate: record.EndDate && record.EndDate !== DEFAULT_END_DATE ? dayjs(record.EndDate) : undefined,
            vp: Number(record.vp),
            dm: Number(record.dm),
            sr: Number(record.sr),
            jr: Number(record.jr)
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRow(null);
        form.resetFields();
    };

    const handleSave = async () => {
        let values: LandscapeFormValues;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        const beginDate = values.beginDate?.format('YYYY-MM-DD') || '';
        const endDate = values.endDate ? values.endDate.format('YYYY-MM-DD') : null;

        if (!beginDate) {
            messageApi.warning('กรุณาระบุวันที่เริ่มต้น');
            return;
        }
        if (endDate && endDate < beginDate) {
            messageApi.warning('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
            return;
        }

        const payload: LandscapePayload = {
            orgUnitNo: values.orgUnitNo || null,
            beginDate,
            endDate,
            vp: Number(values.vp ?? 0),
            dm: Number(values.dm ?? 0),
            sr: Number(values.sr ?? 0),
            jr: Number(values.jr ?? 0)
        };

        const hasOverlapInPage = rows.some((row) => {
            if (editingRow && row === editingRow) return false;
            if (normalizeOrgUnitNo(row.OrgUnitNo) !== normalizeOrgUnitNo(payload.orgUnitNo)) return false;
            return isPeriodOverlap(
                row.BeginDate,
                toEffectiveEndDate(row.EndDate),
                payload.beginDate,
                toEffectiveEndDate(payload.endDate)
            );
        });

        if (hasOverlapInPage) {
            messageApi.warning('มีข้อมูลช่วงวันที่ซ้ำในหน่วยงานเดียวกัน กรุณาตรวจสอบ period ก่อนบันทึก');
            return;
        }

        setSaving(true);
        try {
            const user = currentUser?.employeeID || 'SYSTEM';
            const res = editingRow
                ? await updateLandscape(toLandscapePayload(editingRow), payload, user, token)
                : await createLandscape(payload, user, token);

            if (res?.success) {
                notification.success({
                    title: editingRow ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ',
                    description: editingRow ? 'ปรับปรุงข้อมูล Landscape เรียบร้อยแล้ว' : 'บันทึกข้อมูล Landscape เรียบร้อยแล้ว'
                });
                closeModal();
                await loadLandscape();
            } else {
                notification.error({
                    title: 'เกิดข้อผิดพลาด',
                    description: res?.message || 'ไม่สามารถบันทึกข้อมูลได้'
                });
            }
        } catch (error) {
            console.error('Failed to save landscape data:', error);
            notification.error({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกข้อมูลได้' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (record: LandscapeRecord) => {
        try {
            const res = await deleteLandscape(toLandscapePayload(record), currentUser?.employeeID || 'SYSTEM', token);
            if (res?.success) {
                notification.success({ title: 'ลบข้อมูลสำเร็จ', description: 'ลบรายการ Landscape เรียบร้อยแล้ว' });
                await loadLandscape();
            } else {
                notification.error({ title: 'ลบข้อมูลไม่สำเร็จ', description: res?.message || 'ไม่สามารถลบข้อมูลได้' });
            }
        } catch (error) {
            console.error('Failed to delete landscape data:', error);
            notification.error({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบข้อมูลได้' });
        }
    };

    const columns: ColumnsType<LandscapeRecord> = [
        {
            title: 'หน่วยงาน',
            dataIndex: 'OrgUnitNo',
            key: 'OrgUnitNo',
            width: 320,
            render: (value: LandscapeRecord['OrgUnitNo']) => {
                const orgUnitNo = value ? String(value).trim() : '';
                if (!orgUnitNo) {
                    return <Tag color="blue">ทุกหน่วยงาน</Tag>;
                }
                return <span>{unitLabelMap.get(orgUnitNo) || orgUnitNo}</span>;
            }
        },
        {
            title: 'วันที่เริ่มต้น',
            dataIndex: 'BeginDate',
            key: 'BeginDate',
            width: 150,
            align: 'center',
            render: (value: LandscapeRecord['BeginDate']) => value || '-'
        },
        {
            title: 'วันที่สิ้นสุด',
            dataIndex: 'EndDate',
            key: 'EndDate',
            width: 170,
            align: 'center',
            render: (value: LandscapeRecord['EndDate']) =>
                value === DEFAULT_END_DATE ? '-' : (value || '-')
        },
        {
            title: 'VP',
            dataIndex: 'vp',
            key: 'vp',
            width: 100,
            align: 'right',
            render: (value: LandscapeRecord['vp']) => Number(value || 0).toFixed(2)
        },
        {
            title: 'DM',
            dataIndex: 'dm',
            key: 'dm',
            width: 100,
            align: 'right',
            render: (value: LandscapeRecord['dm']) => Number(value || 0).toFixed(2)
        },
        {
            title: 'SR',
            dataIndex: 'sr',
            key: 'sr',
            width: 100,
            align: 'right',
            render: (value: LandscapeRecord['sr']) => Number(value || 0).toFixed(2)
        },
        {
            title: 'JR',
            dataIndex: 'jr',
            key: 'jr',
            width: 100,
            align: 'right',
            render: (value: LandscapeRecord['jr']) => Number(value || 0).toFixed(2)
        },
        {
            title: 'Action',
            key: 'action',
            width: 130,
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="แก้ไขรายการ">
                        <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    </Tooltip>
                    <Popconfirm
                        title="ยืนยันการลบรายการนี้?"
                        okText="ลบ"
                        cancelText="ยกเลิก"
                        onConfirm={() => handleDelete(record)}
                    >
                        <Tooltip title="ลบรายการ">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="rounded-xl bg-linear-to-r from-blue-700 to-blue-500 p-4 shadow-md mb-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Mountain size={22} />
                    <h1 className="text-xl font-bold m-0 text-white">Manpower Landscape Management</h1>
                </div>
            </div>

            <Card className="mb-4 shadow-sm border-slate-200">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-col gap-2">
                        <Text type="secondary">หากไม่ระบุวันที่สิ้นสุด ระบบจะกำหนดวันสิ้นสุดให้อัติโนมัติ และถ้าไม่ระบุหน่วยงานจะใช้กับทุกหน่วยงาน</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="bg-blue-600 font-semibold"
                        size="large"
                        onClick={openCreateModal}
                    >
                        เพิ่มรายการ
                    </Button>
                </div>
            </Card>

            <Card className="shadow-sm border-slate-200">
                <Table
                    columns={columns}
                    dataSource={rows}
                    loading={loading}
                    bordered
                    size="middle"
                    className="[&_.ant-table-thead>tr>th]:bg-slate-100 [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-tbody>tr:hover>td]:bg-blue-50/40"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 980 }}
                    rowKey={(record) =>
                        `${record.OrgUnitNo || 'ALL'}-${record.BeginDate}-${record.EndDate}`
                    }
                />
            </Card>

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Mountain size={18} className="text-blue-600" />
                        <span className="font-semibold">{editingRow ? 'แก้ไข Manpower Landscape' : 'เพิ่ม Manpower Landscape'}</span>
                    </div>
                }
                open={isModalOpen}
                onOk={handleSave}
                onCancel={closeModal}
                okText={editingRow ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
                cancelText="ยกเลิก"
                confirmLoading={saving}
                okButtonProps={{ className: 'bg-blue-600 px-6' }}
                width={600}
                centered
                forceRender
            >
                <Form form={form} layout="vertical" className="mt-4">
                   
                    <Form.Item label="หน่วยงาน (ไม่ระบุ = ใช้ทุกหน่วยงาน)" name="orgUnitNo">
                        <Select
                            allowClear
                            showSearch
                            placeholder="เลือกหน่วยงาน (ถ้ามี)"
                            options={unitOptions}
                            optionFilterProp="label"
                            size="large"
                        />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            label="วันที่เริ่มต้น"
                            name="beginDate"
                            rules={[{ required: true, message: 'กรุณาเลือกวันที่เริ่มต้น' }]}
                        >
                            <DatePicker className="w-full" format="YYYY-MM-DD" size="large" />
                        </Form.Item>
                        <Form.Item label="วันที่สิ้นสุด (ถ้าไม่ระบุจะใช้ 9999-12-31)" name="endDate">
                            <DatePicker className="w-full" format="YYYY-MM-DD" size="large" />
                        </Form.Item>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 pt-4 pb-1">
                        <div className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-3">Landscape Ratio</div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="VP" name="vp" rules={[{ required: true, message: 'กรุณาระบุ VP' }]}>
                                <InputNumber className="w-full" precision={2} min={0} size="large" onFocus={selectNumberOnFocus} />
                            </Form.Item>
                            <Form.Item label="DM" name="dm" rules={[{ required: true, message: 'กรุณาระบุ DM' }]}>
                                <InputNumber className="w-full" precision={2} min={0} size="large" onFocus={selectNumberOnFocus} />
                            </Form.Item>
                            <Form.Item label="SR" name="sr" rules={[{ required: true, message: 'กรุณาระบุ SR' }]}>
                                <InputNumber className="w-full" precision={2} min={0} size="large" onFocus={selectNumberOnFocus} />
                            </Form.Item>
                            <Form.Item label="JR" name="jr" rules={[{ required: true, message: 'กรุณาระบุ JR' }]}>
                                <InputNumber className="w-full" precision={2} min={0} size="large" onFocus={selectNumberOnFocus} />
                            </Form.Item>
                        </div>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

export default function LandscapePage() {
    return (
        <Main currentPath="/setting">
            <App>
                <LandscapeContent />
            </App>
        </Main>
    );
}
