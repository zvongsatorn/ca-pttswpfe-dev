'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Select, Input, Popconfirm, App, Space, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined, EditOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
import Main from '@/components/layout/main';
import {
    getDelayRetirementData,
    getEmployeeOptions,
    getDelayRetireYears,
    createDelayRetirement,
    updateDelayRetirement,
    deleteDelayRetirement,
    DelayRetirementDataType,
    DelayEmployeeOptionType
} from '@/services/delayService';
import { getUserFromToken } from '@/utils/auth';

const CURRENT_BE_YEAR = new Date().getFullYear() + 543;
const BU_SUPPORT_TYPES = new Set(['Business', 'Support']);

const formatEmployeeOptionLabel = (option: DelayEmployeeOptionType): string => {
    const baseLabel = String(option.label || `${option.value} - ${option.name || option.value}`).trim();
    const buSupport = String(option.buSupport || '').trim();
    if (!BU_SUPPORT_TYPES.has(buSupport) || baseLabel.includes(`(${buSupport})`)) {
        return baseLabel;
    }
    return `${baseLabel} (${buSupport})`;
};

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function DelayRetirementContent() {
    const { notification } = App.useApp();
    const [form] = Form.useForm();
    const token = getToken();
    const currentUser = getUserFromToken(token);
    
    const [selectedYear, setSelectedYear] = useState<string>(String(CURRENT_BE_YEAR));
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [tableData, setTableData] = useState<DelayRetirementDataType[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<DelayEmployeeOptionType[]>([]);
    const [retireYearOptions, setRetireYearOptions] = useState<Array<{ value: string; label: string }>>([]);
    const fallbackRetireYearOptions = useMemo(() => {
        return Array.from({ length: 6 }, (_, index) => {
            const year = String(CURRENT_BE_YEAR - 1 + index);
            return { value: year, label: year };
        });
    }, []);

    const fetchRetireYearOptions = useCallback(async () => {
        try {
            const response = await getDelayRetireYears(token);
            const fromApi = (response?.success && Array.isArray(response.data))
                ? response.data
                    .map((year) => Number.parseInt(String(year), 10))
                    .filter((year) => Number.isFinite(year))
                    .sort((a, b) => a - b)
                    .map((year) => {
                        const text = String(year);
                        return { value: text, label: text };
                    })
                : [];

            const options = fromApi.length > 0 ? fromApi : fallbackRetireYearOptions;
            setRetireYearOptions(options);
            setSelectedYear((prev) => {
                if (options.some((item) => item.value === prev)) return prev;
                const current = String(CURRENT_BE_YEAR);
                if (options.some((item) => item.value === current)) return current;
                return options[0]?.value || current;
            });
        } catch (error) {
            console.error('Fetch retire year options failed:', error);
            setRetireYearOptions(fallbackRetireYearOptions);
            setSelectedYear((prev) => prev || String(CURRENT_BE_YEAR));
        }
    }, [fallbackRetireYearOptions, token]);
    const employeeBuSupportById = useMemo(
        () => new Map(employeeOptions.map((item) => [item.value, item.buSupport || '-'])),
        [employeeOptions]
    );
    const employeeUnitNameById = useMemo(
        () => new Map(employeeOptions.map((item) => [item.value, item.unitName || '-'])),
        [employeeOptions]
    );

    const fetchData = useCallback(async () => {
        if (!selectedYear) return;
        setTableLoading(true);
        try {
            const [dataRes, empRes] = await Promise.all([
                getDelayRetirementData(token, selectedYear),
                getEmployeeOptions(token, selectedYear)
            ]);

            if (dataRes?.success && Array.isArray(dataRes.data)) {
                setTableData(dataRes.data);
            } else {
                setTableData([]);
                notification.error({ title: 'ไม่สามารถโหลดข้อมูลได้', description: dataRes?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล Delay' });
            }

            if (empRes?.success && Array.isArray(empRes.data)) {
                setEmployeeOptions(
                    empRes.data.map((option) => ({
                        ...option,
                        label: formatEmployeeOptionLabel(option)
                    }))
                );
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
        void fetchRetireYearOptions();
    }, [fetchRetireYearOptions]);

    useEffect(() => {
        if (!selectedYear) return;
        void fetchData();
    }, [fetchData, selectedYear]);

    const filteredData = useMemo(() => {
        return tableData.filter(item => {
            const matchesSearch = item.EmployeeID.includes(searchText) || item.EmployeeName.includes(searchText) || item.PosName.includes(searchText);
            return matchesSearch;
        });
    }, [tableData, searchText]);

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
        form.setFieldsValue({ DelayYear: '' });
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const selectedEmp = employeeOptions.find(opt => opt.value === values.EmployeeID);
            setSaveLoading(true);

            const payload = {
                EmployeeID: values.EmployeeID,
                PosName: selectedEmp?.position || values.PosName || '',
                RetirementYear: selectedYear,
                DelayYear: String(values.DelayYear || '').trim(),
                DelayStatus: 1,
                DelayType: selectedEmp?.delayType || 1,
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

            setIsModalVisible(false);
            form.resetFields();
            await fetchData();
        } catch (error) {
            const validationError = error as {
                errorFields?: Array<{ name: (string | number)[]; errors?: string[] }>;
            };

            if (validationError?.errorFields?.length) {
                const firstError = validationError.errorFields[0];
                const firstMessage = firstError?.errors?.[0] || 'กรุณาตรวจสอบข้อมูลที่กรอก';
                if (firstError?.name?.length) {
                    form.scrollToField(firstError.name);
                }
                notification.warning({ title: 'ข้อมูลไม่ถูกต้อง', description: firstMessage });
                return;
            }

            console.error('Save Delay failed:', error);
            notification.error({ title: 'ไม่สำเร็จ', description: 'เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล' });
        } finally {
            setSaveLoading(false);
        }
    };

    const columns: ColumnsType<DelayRetirementDataType> = [
        { title: 'รหัสพนักงาน', dataIndex: 'EmployeeID', key: 'EmployeeID', align: 'center', width: 140, render: (text) => <span className="font-bold text-slate-700">{text}</span> },
        { title: 'ชื่อพนักงาน', dataIndex: 'EmployeeName', key: 'EmployeeName', width: 220, ellipsis: true, render: (text) => <span className="block truncate text-slate-700 font-medium">{text || '-'}</span> },
        { title: 'ตำแหน่ง', dataIndex: 'PosName', key: 'PosName', width: 360, ellipsis: true, render: (text) => <span className="block truncate text-slate-600 font-medium">{text || '-'}</span> },
        {
            title: 'ชื่อหน่วยงาน',
            key: 'UnitName',
            width: 300,
            ellipsis: true,
            render: (_, record) => <span className="block truncate text-slate-700">{record.UnitName || employeeUnitNameById.get(record.EmployeeID) || '-'}</span>
        },
        {
            title: 'BU/Support',
            key: 'BUSupport',
            align: 'center',
            width: 120,
            render: (_, record) => {
                if (record.BUSupport) {
                    return record.BUSupport;
                }
                if (record.DelayType === 1 || record.DelayType === 2) {
                    return record.DelayType === 2 ? 'Support' : 'Business';
                }
                return employeeBuSupportById.get(record.EmployeeID) || '-';
            }
        },
        { title: 'ปีที่ทด', dataIndex: 'DelayYear', key: 'DelayYear', align: 'center', width: 100 },
        {
            title: 'จัดการ', key: 'action', align: 'center', width: 90,
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
                            <Select value={selectedYear} onChange={setSelectedYear} className="w-32" size="large" options={retireYearOptions} />
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
                scroll={{ x: 1330 }}
                rowClassName="hover:bg-blue-50/20 transition-colors"
                className="shadow-sm rounded-xl overflow-hidden border border-slate-100"
            />

            <Modal
                title={<div className="font-bold text-lg border-b pb-3 mb-2">{editingKey ? 'แก้ไขข้อมูลพนักงานเกษียณ(ทด)' : 'เพิ่มพนักงานเกษียณ(ทด)'}</div>}
                open={isModalVisible} onOk={handleSave} onCancel={() => setIsModalVisible(false)}
                confirmLoading={saveLoading}
                okText="บันทึกข้อมูล"
                okButtonProps={{ className: 'bg-blue-600 font-bold px-10 rounded-lg' }}
                cancelButtonProps={{ className: 'px-8 rounded-lg', disabled: saveLoading }}
                closable={!saveLoading}
                maskClosable={!saveLoading}
                keyboard={!saveLoading}
                width={550}
            >
                <div className="py-6">
                    <Form form={form} layout="vertical" requiredMark={false}>
                        <Form.Item name="EmployeeID" label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">พนักงาน</span>} rules={[{ required: true, message: 'กรุณาเลือกพนักงาน' }]}>
                            <Select showSearch placeholder="ค้นหาด้วยรหัส หรือ ชื่อ..." optionFilterProp="label" size="large" options={employeeOptions} onChange={(val) => { const opt = employeeOptions.find(o => o.value === val); form.setFieldsValue({ PosName: opt?.position }); }} />
                        </Form.Item>
                        <Form.Item name="PosName" label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">ตำแหน่ง</span>}>
                            <Input disabled className="bg-slate-50 text-slate-900 font-medium h-11" />
                        </Form.Item>
                        <Form.Item
                            name="DelayYear"
                            label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">ปีที่ทด</span>}
                            extra={<span className="text-xs text-slate-500">หมายเหตุ: ไม่นับปีทด ระบุ 9999</span>}
                            rules={[
                                { required: true, message: 'กรุณากรอกปีที่ทด' },
                                {
                                    validator: (_, value) => {
                                        const textValue = String(value || '').trim();
                                        const retireYear = Number.parseInt(selectedYear, 10);
                                        const delayYear = Number.parseInt(textValue, 10);

                                        if (!textValue) return Promise.resolve();
                                        if (!/^\d{4}$/.test(textValue)) {
                                            return Promise.reject(new Error('กรุณากรอกปีที่ทดเป็นตัวเลข 4 หลัก'));
                                        }

                                        if (Number.isNaN(retireYear) || Number.isNaN(delayYear) || delayYear !== retireYear) {
                                            return Promise.resolve();
                                        }

                                        return Promise.reject(new Error(`ปีที่ทดห้ามเท่าปีเกษียณ (${selectedYear})`));
                                    }
                                }
                            ]}
                        >
                            <Input
                                placeholder="กรอกปีที่ทด (เช่น 2569)"
                                size="large"
                                maxLength={4}
                                inputMode="numeric"
                            />
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
