'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Table, 
    Card, 
    Button, 
    Typography, 
    Tag, 
    Select, 
    Space, 
    Input, 
    DatePicker, 
    Modal, 
    App, 
    Tooltip,
    Divider,
    Descriptions,
    Empty,
    Badge,
    InputNumber
} from 'antd';
import { 
    SearchOutlined, 
    PlusOutlined, 
    EditOutlined, 
    HistoryOutlined, 
    FileTextOutlined,
    BarChartOutlined,
    CheckCircleFilled,
    ClockCircleFilled,
    DeleteOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface HistoryRecordClientProps {
    token: string;
    currentUser: any;
    initialYears: string[];
}

export default function HistoryRecordClient({ token, currentUser, initialYears }: HistoryRecordClientProps) {
    const router = useRouter();
    const { message, modal } = App.useApp();

    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mkd_historyrecord_year') || (dayjs().year() + 543).toString();
        }
        return (dayjs().year() + 543).toString();
    });

    const [records, setRecords] = useState<any[]>([]);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');

    // --- Data Fetching ---
    const fetchHistory = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const ceYear = parseInt(selectedYear) > 2500 ? (parseInt(selectedYear) - 543).toString() : selectedYear;
            
            const query = new URLSearchParams({
                EffectiveYear: ceYear,
                EmployeeID: currentUser.employeeID || 'SYSTEM',
                UserGroupNo: currentUser.userGroupNo || currentUser.roleId || '',
                OrgUnitNo: '', 
                RequestType: '2' 
            });

            const res = await fetch(`/api/mkd/history?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setRecords(result.data.map((item: any, idx: number) => ({
                    ...item,
                    key: item.ManDriverID || idx,
                    no: idx + 1
                })));
            }
        } catch (error) {
            message.error('ไม่สามารถดึงข้อมูลประวัติได้');
        } finally {
            setLoading(false);
        }
    }, [selectedYear, currentUser, token, message]);

    useEffect(() => {
        fetchHistory();
        if (typeof window !== 'undefined') {
            localStorage.setItem('mkd_historyrecord_year', selectedYear);
        }
    }, [selectedYear, fetchHistory]);

    // --- Actions ---
    const handleCreateRecord = async () => {
        if (!newUnitName.trim()) {
            message.warning('กรุณาระบุชื่อหน่วยงาน');
            return;
        }

        try {
            setLoading(true);
            const ceYear = parseInt(selectedYear) > 2500 ? (parseInt(selectedYear) - 543).toString() : selectedYear;
            
            // 1. Check duplicate
            const checkRes = await fetch('/api/mkd/check-dup', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    EffectiveYear: ceYear,
                    RequestType: 2,
                    OrgUnitNo: '',
                    OrgUnitName: newUnitName
                })
            });
            const checkResult = await checkRes.json();
            
            if (checkResult.success && checkResult.isDuplicate) {
                modal.confirm({
                    title: 'พบข้อมูลซ้ำ',
                    icon: <ExclamationCircleOutlined />,
                    content: 'ข้อมูลในหน่วยงานนี้ ปีนี้ มีข้อมูลอยู่แล้ว ท่านต้องการที่จะดำเนินการต่อหรือไม่?',
                    okText: 'ดำเนินการต่อ',
                    cancelText: 'ยกเลิก',
                    onOk: () => executeCreate(ceYear)
                });
            } else {
                executeCreate(ceYear);
            }
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    const executeCreate = async (ceYear: string) => {
        try {
            setLoading(true);
            const res = await fetch('/api/mkd', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    EffectiveYear: ceYear,
                    RequestType: 2,
                    OrgUnitNo: '',
                    OrgUnitName: newUnitName,
                    CreateBy: currentUser.employeeID
                })
            });
            const result = await res.json();
            if (result.success) {
                message.success('สร้างรายการสำเร็จ');
                setIsNewModalOpen(false);
                setNewUnitName('');
                const newId = result.data?.ManDriverID || (Array.isArray(result.data) && result.data[0]?.ManDriverID);
                if (newId) router.push(`/mkd/historyrecord/${newId}`);
            } else {
                message.error(result.message || 'สร้างรายการไม่สำเร็จ');
            }
        } catch (error) {
            message.error('เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    // --- Renderers ---
    const getStatusTag = (status: number, name: string) => {
        if (status === 2) return <Tag color="success" icon={<CheckCircleFilled />}>{name}</Tag>;
        if (status === 1) return <Tag color="processing" icon={<ClockCircleFilled />}>{name}</Tag>;
        if (status <= 0) return <Tag color="error" icon={<DeleteOutlined />}>{name}</Tag>;
        return <Tag color="default">{name}</Tag>;
    };

    const columns = [
        {
            title: 'No.',
            dataIndex: 'no',
            key: 'no',
            width: 60,
            align: 'center' as const
        },
        {
            title: 'Req.No',
            key: 'reqNo',
            render: (_: any, r: any) => <Text strong className="text-blue-700">{r.fullRequestNo || r.RequestNo || '-'}</Text>
        },
        {
            title: 'Req.Date',
            key: 'reqDate',
            render: (_: any, r: any) => r.datebd ? dayjs(r.datebd).format('DD/MM/YYYY') : '-'
        },
        {
            title: 'OrgUnit',
            key: 'unit',
            render: (_: any, r: any) => (
                <div className="flex flex-col">
                    <Text strong>{r.OrgUnitName || r.OrgUnitNo}</Text>
                    <Text type="secondary" className="text-[11px]">{r.OrgUnitNo}</Text>
                </div>
            )
        },
        {
            title: 'Create By',
            key: 'createBy',
            render: (_: any, r: any) => (
                <div className="flex flex-col">
                    <Text>{r.EmpName || r.CreateBy}</Text>
                    <Text type="secondary" className="text-[10px]">{r.CreateDateBD}</Text>
                </div>
            )
        },
        {
            title: 'Status',
            key: 'status',
            align: 'center' as const,
            render: (_: any, r: any) => getStatusTag(r.ManDriverStatus, r.StatusName || r.AppStatusName || '-')
        },
        {
            title: 'Action',
            key: 'action',
            align: 'center' as const,
            render: (_: any, r: any) => (
                <Space>
                    <Tooltip title="Edit / View Detail">
                        <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<EditOutlined />} 
                            onClick={() => router.push(`/mkd/historyrecord/${r.ManDriverID}`)}
                        />
                    </Tooltip>
                    {r.ManDriverStatus === 2 && (
                        <Tooltip title="View Dashboard">
                            <Button 
                                shape="circle" 
                                icon={<BarChartOutlined className="text-green-600" />} 
                                onClick={() => router.push(`/mkd/dashboard/${r.ManDriverID}`)}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="max-w-[1400px] mx-auto">
                {/* Header Card */}
                <Card className="mb-6 shadow-sm border-0 bg-blue-700" styles={{ body: { padding: '20px' } }}>
                    <div className="flex justify-between items-center">
                        <Title level={3} className="m-0 text-white">History Manpower Key Driver (Record)</Title>
                        <Button 
                            type="primary" 
                            size="large" 
                            icon={<PlusOutlined />} 
                            onClick={() => setIsNewModalOpen(true)}
                            className="bg-green-600 hover:bg-green-700 border-none shadow-md px-8"
                        >
                            NEW RECORD
                        </Button>
                    </div>
                </Card>

                {/* Filter section */}
                <Card className="mb-6 shadow-sm border-0" styles={{ body: { padding: '20px' } }}>
                    <Space size={24} align="end">
                        <Space orientation="vertical" size={4}>
                            <Text strong type="secondary">Year (ปี)</Text>
                            <Select
                                style={{ width: 200 }}
                                value={selectedYear}
                                onChange={setSelectedYear}
                            >
                                {initialYears.map(y => (
                                    <Select.Option key={y} value={y}>{y}</Select.Option>
                                ))}
                            </Select>
                        </Space>
                        <Button 
                            type="primary" 
                            icon={<SearchOutlined />} 
                            onClick={fetchHistory}
                            loading={loading}
                            className="bg-blue-600 px-8"
                        >
                            SEARCH
                        </Button>
                    </Space>
                </Card>

                {/* Table section */}
                <Card className="shadow-sm border-0" styles={{ body: { padding: 0 } }}>
                    <Table 
                        columns={columns} 
                        dataSource={records}
                        loading={loading}
                        pagination={{ pageSize: 12 }}
                        className="custom-record-table"
                    />
                </Card>
            </div>

            {/* New Record Modal */}
            <Modal
                title={<Space className="text-blue-700"><PlusOutlined /> สร้างรายการใหม่</Space>}
                open={isNewModalOpen}
                onCancel={() => setIsNewModalOpen(false)}
                onOk={handleCreateRecord}
                confirmLoading={loading}
                okText="สร้าง (CREATE)"
                cancelText="ยกเลิก (CANCEL)"
                okButtonProps={{ className: 'bg-blue-600' }}
            >
                <div className="py-4">
                    <Space orientation="vertical" className="w-full" size={16}>
                        <div>
                            <Text strong className="block mb-2">ปี (Effective Year)</Text>
                            <Tag color="blue" className="px-4 py-1 text-base">{selectedYear}</Tag>
                        </div>
                        <div>
                            <Text strong className="block mb-2 text-slate-700">หน่วยงาน (Organization Unit)</Text>
                            <Input 
                                placeholder="ระบุชื่อหน่วยงาน..." 
                                size="large" 
                                value={newUnitName}
                                onChange={e => setNewUnitName(e.target.value)}
                            />
                        </div>
                    </Space>
                </div>
            </Modal>

            <style jsx global>{`
                .custom-record-table .ant-table-thead > tr > th {
                    background: #f1f5f9 !important;
                    font-weight: 600 !important;
                    font-size: 13px;
                }
            `}</style>
        </div>
    );
}
