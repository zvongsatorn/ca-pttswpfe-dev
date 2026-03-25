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
    Badge
} from 'antd';
import { 
    SearchOutlined, 
    HistoryOutlined, 
    TeamOutlined, 
    FileSearchOutlined, 
    BarChartOutlined,
    CheckCircleFilled,
    ClockCircleFilled,
    CloseCircleFilled,
    SyncOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { getHistoryManDriverApprove, getFlowHistory } from '@/services/mkdService';

const { Title, Text } = Typography;

interface HistoryApproveClientProps {
    token: string;
    currentUser: any;
    initialYears: string[];
    initialUnits: { id: string; unitText: string }[];
}

export default function HistoryApproveClient({ token, currentUser, initialYears, initialUnits }: HistoryApproveClientProps) {
    const router = useRouter();
    const { message } = App.useApp();

    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mkd_historyapprove_year') || (dayjs().year() + 543).toString();
        }
        return (dayjs().year() + 543).toString();
    });
    const [selectedUnit, setSelectedUnit] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mkd_historyapprove_unit') || '';
        }
        return '';
    });

    const [records, setRecords] = useState<any[]>([]);
    
    // In-table filters
    const [filters, setFilters] = useState({
        reqNo: '',
        date: '',
        bu: '',
        unit: '',
        createBy: '',
        conclusion: ''
    });

    // Flow modal
    const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
    const [flowData, setFlowData] = useState<any[]>([]);
    const [flowLoading, setFlowLoading] = useState(false);

    // --- Data Fetching ---
    const fetchHistory = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const ceYear = parseInt(selectedYear) > 2500 ? (parseInt(selectedYear) - 543).toString() : selectedYear;
            
            const params = {
                EffectiveYear: ceYear,
                division: selectedUnit,
                userGroupNo: currentUser.userGroupNo || currentUser.roleId || ''
            };

            const res = await getHistoryManDriverApprove(params, token);
            if (res?.success) {
                setRecords(res.data.map((item: any, idx: number) => ({
                    ...item,
                    key: item.ManDriverID || idx,
                    no: idx + 1
                })));
            }
        } catch (error) {
            message.error('ไม่สามารถดึงข้อมูลประวัติการอนุมัติได้');
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedUnit, currentUser, token, message]);

    useEffect(() => {
        fetchHistory();
        if (typeof window !== 'undefined') {
            localStorage.setItem('mkd_historyapprove_year', selectedYear);
            localStorage.setItem('mkd_historyapprove_unit', selectedUnit);
        }
    }, [selectedYear, selectedUnit, fetchHistory]);

    const handleOpenFlow = async (record: any) => {
        if (!record.ApproveID || record.ApproveID === '0') return;
        setFlowData([]);
        setFlowLoading(true);
        setIsFlowModalOpen(true);
        try {
            const res = await getFlowHistory(record.ManDriverID, record.ApproveID, token);
            if (res?.success) setFlowData(res.data);
        } catch (error) {
            message.error('ไม่สามารถดึงข้อมูล Flow ได้');
        } finally {
            setFlowLoading(false);
        }
    };

    // --- Filter Logic ---
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const reqNoMatch = !filters.reqNo || (r.fullRequestNo || r.RequestNo || '').toLowerCase().includes(filters.reqNo.toLowerCase());
            const buMatch = !filters.bu || (r.BGName || '').toLowerCase().includes(filters.bu.toLowerCase());
            const unitMatch = !filters.unit || (r.OrgUnitNo || '' + r.OrgUnitName || '').toLowerCase().includes(filters.unit.toLowerCase());
            const createByMatch = !filters.createBy || (r.EmpName || r.CreateBy || '').toLowerCase().includes(filters.createBy.toLowerCase());
            const conclusionMatch = !filters.conclusion || (r.ConclusionNo || '').toLowerCase().includes(filters.conclusion.toLowerCase());
            
            let dateMatch = true;
            if (filters.date && r.datebd) {
                const searchDate = filters.date;
                const recordDate = dayjs(r.datebd).format('DD/MM/YYYY');
                dateMatch = recordDate.includes(searchDate);
            }

            return reqNoMatch && buMatch && unitMatch && createByMatch && conclusionMatch && dateMatch;
        });
    }, [records, filters]);

    // --- Renderers ---
    const getStatusTag = (status: string) => {
        if (status.includes('อนุมัติแล้ว')) return <Tag color="success" icon={<CheckCircleFilled />}>{status}</Tag>;
        if (status.includes('รอ') || status.includes('ยัน')) return <Tag color="warning" icon={<ClockCircleFilled />}>{status}</Tag>;
        if (status.includes('ยกเลิก')) return <Tag color="error" icon={<CloseCircleFilled />}>{status}</Tag>;
        return <Tag color="processing" icon={<SyncOutlined spin />}>{status}</Tag>;
    };

    const columns = [
        {
            title: 'No',
            dataIndex: 'no',
            key: 'no',
            width: 50,
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
            title: 'BU',
            dataIndex: 'BGName',
            key: 'bu'
        },
        {
            title: 'OrgUnit',
            key: 'orgUnit',
            render: (_: any, r: any) => (
                <div className="flex flex-col">
                    <Text strong>{r.OrgUnitNo}</Text>
                    <Text type="secondary" className="text-[11px]">{r.OrgUnitName}</Text>
                </div>
            )
        },
        {
            title: 'Create By',
            key: 'createBy',
            render: (_: any, r: any) => (
                <div className="flex flex-col">
                    <Text size="small">{r.EmpName || r.CreateBy}</Text>
                    <Text type="secondary" className="text-[10px]">{r.CreateDateBD}</Text>
                </div>
            )
        },
        {
            title: 'Approve Steps',
            key: 'steps',
            render: (_: any, r: any) => (
                <Space>
                    {r.Fullname && (
                        <div className="flex flex-col">
                            <Text className="text-[11px] text-slate-800">{r.Fullname}</Text>
                            <Text type="secondary" className="text-[10px]">{r.PrevAppDateBD}</Text>
                        </div>
                    )}
                    {r.ApproveID && (
                        <Tooltip title="View Flow">
                            <Button 
                                type="text" 
                                size="small" 
                                icon={<TeamOutlined className="text-blue-500" />} 
                                onClick={() => handleOpenFlow(r)}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        },
        {
            title: 'Conclusion',
            dataIndex: 'ConclusionNo',
            key: 'conclusion'
        },
        {
            title: 'Status',
            key: 'status',
            align: 'center' as const,
            render: (_: any, r: any) => getStatusTag(r.StatusName || r.AppStatusName || '-')
        },
        {
            title: 'Action',
            key: 'action',
            align: 'center' as const,
            render: (_: any, r: any) => (
                <Space>
                    <Tooltip title="View Detail">
                        <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<FileSearchOutlined />} 
                            onClick={() => router.push(`/mkd/historyapprove/${r.ManDriverID}`)}
                        />
                    </Tooltip>
                    {r.ManDriverStatus > 1 && (
                        <Tooltip title="View Charts">
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
            <div className="max-w-[1600px] mx-auto">
                {/* Search Card */}
                <Card className="mb-6 shadow-sm border-0" bodyStyle={{ padding: '20px' }}>
                    <Title level={3} className="m-0 mb-6 text-blue-800">History Manpower Key Driver (Approved)</Title>
                    <div className="flex flex-wrap gap-6 items-end">
                        <Space direction="vertical" size={4}>
                            <Text strong type="secondary">สายงาน (Division)</Text>
                            <Select
                                showSearch
                                style={{ width: 400 }}
                                placeholder="เลือกสายงาน..."
                                value={selectedUnit}
                                onChange={setSelectedUnit}
                                optionFilterProp="children"
                                allowClear
                            >
                                <Select.Option value="">ทั้งหมด (All)</Select.Option>
                                {initialUnits.map(u => (
                                    <Select.Option key={u.id} value={u.id}>
                                        {u.id} - {u.unitText}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Space>

                        <Space direction="vertical" size={4}>
                            <Text strong type="secondary">ปี (Year)</Text>
                            <Select
                                style={{ width: 150 }}
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
                            size="large" 
                            icon={<SearchOutlined />} 
                            onClick={fetchHistory}
                            loading={loading}
                            className="bg-blue-600 px-8"
                        >
                            SEARCH
                        </Button>
                    </div>
                </Card>

                {/* Records Table */}
                <Card className="shadow-sm border-0 overflow-hidden" bodyStyle={{ padding: 0 }}>
                    <div className="p-4 bg-slate-100/50 border-b border-slate-200">
                        <div className="text-slate-500 font-medium text-sm">
                            <HistoryOutlined className="mr-2" />
                            Approved Unit Framework History Records
                        </div>
                    </div>
                    
                    {/* Inline Filters */}
                    <div className="grid grid-cols-12 gap-2 p-2 bg-blue-50/50 border-b border-blue-100">
                        <div className="col-span-1" />
                        <div className="col-span-2">
                            <Input 
                                size="small" 
                                placeholder="Req.No..." 
                                value={filters.reqNo}
                                onChange={e => setFilters({...filters, reqNo: e.target.value})}
                                prefix={<SearchOutlined className="text-slate-300" />}
                            />
                        </div>
                        <div className="col-span-2">
                             <Input 
                                size="small" 
                                placeholder="DD/MM/YYYY..." 
                                value={filters.date}
                                onChange={e => setFilters({...filters, date: e.target.value})}
                                prefix={<SearchOutlined className="text-slate-300" />}
                            />
                        </div>
                        <div className="col-span-1">
                            <Input 
                                size="small" 
                                placeholder="BU..." 
                                value={filters.bu}
                                onChange={e => setFilters({...filters, bu: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2">
                            <Input 
                                size="small" 
                                placeholder="OrgUnit..." 
                                value={filters.unit}
                                onChange={e => setFilters({...filters, unit: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2">
                            <Input 
                                size="small" 
                                placeholder="Creator..." 
                                value={filters.createBy}
                                onChange={e => setFilters({...filters, createBy: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2">
                             <Input 
                                size="small" 
                                placeholder="Conclusion..." 
                                value={filters.conclusion}
                                onChange={e => setFilters({...filters, conclusion: e.target.value})}
                            />
                        </div>
                    </div>

                    <Table 
                        columns={columns} 
                        dataSource={filteredRecords}
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                        className="custom-history-table"
                        size="middle"
                    />
                </Card>
            </div>

            {/* Flow Modal */}
            <Modal
                title={<Space><TeamOutlined className="text-blue-700" /> Approval Flow History</Space>}
                open={isFlowModalOpen}
                onCancel={() => setIsFlowModalOpen(false)}
                footer={[<Button key="close" onClick={() => setIsFlowModalOpen(false)}>CLOSE</Button>]}
                width={800}
            >
                <Table
                    loading={flowLoading}
                    dataSource={flowData}
                    rowKey={(r, i) => i || 0}
                    pagination={false}
                    size="small"
                    columns={[
                        { title: 'Seq', dataIndex: 'Seqno', width: 50, align: 'center' },
                        { title: 'Name', dataIndex: 'Fullname' },
                        { title: 'Position', dataIndex: 'posname', ellipsis: true },
                        { 
                            title: 'Status', 
                            dataIndex: 'StatusName',
                            render: (text, r) => (
                                <Text strong color={r.ApproveHistStatus === 1 ? 'success' : r.ApproveHistStatus === -1 ? 'danger' : 'default'}>
                                    {text}
                                </Text>
                            )
                        },
                        { title: 'Date', dataIndex: 'ApproveHistDateBD' },
                        { title: 'Remark', dataIndex: 'Remark', ellipsis: true }
                    ]}
                />
            </Modal>

            <style jsx global>{`
                .custom-history-table .ant-table-thead > tr > th {
                    background: #f1f5f9 !important;
                    font-weight: 600 !important;
                    font-size: 13px;
                }
                .custom-history-table .ant-table-row:hover > td {
                    background: #f8fafc !important;
                }
            `}</style>
        </div>
    );
}
