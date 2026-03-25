'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
    Table, 
    Card, 
    Button, 
    Typography, 
    Tag, 
    Tabs, 
    Space, 
    Input, 
    InputNumber, 
    Modal, 
    Select, 
    App, 
    Upload, 
    List, 
    Tooltip,
    Divider,
    Descriptions,
    Empty,
    Form
} from 'antd';
import { 
    ArrowLeftOutlined, 
    SaveOutlined, 
    PlusOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    FileExcelOutlined,
    FileTextOutlined,
    UploadOutlined,
    CheckCircleFilled,
    InfoCircleOutlined,
    TeamOutlined,
    ContainerOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { 
    saveMainKeyAction, 
    saveDetailKeyAction, 
    deleteMainKeyAction, 
    updateStatusAction, 
    updateNoteAction 
} from '../actions';
import { saveMKDHeadcount } from '@/services/mkdService';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface HistoryRecordDetailClientProps {
    mkdId: string;
    token: string;
    currentUser: any;
    initialData: {
        header: any;
        keys: any[];
        years: any[];
        files: any[];
        headcount: { headCounts: any[], years: any[] };
    };
    masterKeys: any[];
}

export default function HistoryRecordDetailClient({ mkdId, token, currentUser, initialData, masterKeys }: HistoryRecordDetailClientProps) {
    const router = useRouter();
    const { message, modal } = App.useApp();

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('manpower');
    const [note, setNote] = useState(initialData.header?.Remark || initialData.header?.Note || '');

    // Header Data
    const header = initialData.header || {};
    const effectiveYear = header.EffectiveYear || 0;
    const isReadOnly = header.ManDriverStatus !== 1;

    // Process Years
    const allYears = useMemo(() => {
        const years = Array.from(new Set(initialData.years.map(y => y.KeyYear)));
        return years.sort((a, b) => parseInt(a) - parseInt(b));
    }, [initialData.years]);

    // Process Keys
    const [mkdData, setMkdData] = useState(() => {
        const keys = initialData.keys || [];
        const years = initialData.years || [];
        
        const mainKeys = keys.filter(k => !k.ParentID || k.ParentID === 0);
        return mainKeys.map(mk => {
            const subKeys = keys.filter(sk => sk.ParentID === mk.ManDriverKeyID);
            
            const mappedSubItems = subKeys.map(sk => {
                const skYears = years.filter(y => y.ManDriverKeyID === sk.ManDriverKeyID);
                const yearMap: Record<string, number> = {};
                const yIds: Record<string, number> = {};
                
                allYears.forEach(y => {
                    const yearData = skYears.find(sy => sy.KeyYear === y);
                    yearMap[y] = yearData?.KeyAmount || 0;
                    if (yearData?.ManDriverKeyYearID) yIds[y] = yearData.ManDriverKeyYearID;
                });

                return {
                    id: sk.ManDriverKeyID.toString(),
                    definition: sk.Definition || '',
                    coefficient: sk.Coefficient || 1,
                    remark: sk.Remark || '',
                    years: yearMap,
                    yIds
                };
            });

            if (mappedSubItems.length === 0) {
                const emptyYearMap: Record<string, number> = {};
                allYears.forEach(y => emptyYearMap[y] = 0);
                mappedSubItems.push({
                    id: `temp-${mk.ManDriverKeyID}`,
                    definition: mk.Definition || '',
                    coefficient: mk.Coefficient || 1,
                    remark: mk.Remark || '',
                    years: emptyYearMap,
                    yIds: {}
                });
            }

            return {
                id: mk.ManDriverKeyID.toString(),
                name: mk.KeyManName || mk.Name || mk.Unit || '',
                unit: mk.Unit || '',
                type: mk.KeyType === 1 ? 'index' : 'uniform',
                weight: mk.Weight || 0,
                keyManId: mk.KeyManID,
                subItems: mappedSubItems
            };
        });
    });

    // Process Headcount
    const [headcountData, setHeadcountData] = useState(() => {
        const hcItems = [...(initialData.headcount.headCounts || []), ...(initialData.headcount.years || [])];
        const typeMap = new Map();
        
        hcItems.forEach((item: any) => {
            const hcType = Number(item.HeadCountType);
            if (!typeMap.has(hcType)) {
                typeMap.set(hcType, {
                    id: item.ManDriverHeadCountID || hcType,
                    typeId: hcType,
                    typeName: item.HeadCountTypeName || (hcType === 1 ? 'Permanent' : hcType === 2 ? 'UnitHead' : 'Outsource'),
                    years: {}
                });
            }
            const row = typeMap.get(hcType);
            if (item.KeyYear) {
                row.years[String(item.KeyYear)] = Number(item.HeadCount) || 0;
            }
        });
        return Array.from(typeMap.values());
    });

    const [files, setFiles] = useState(initialData.files || []);

    // --- Actions ---
    const handleSaveHeadcount = async () => {
        try {
            setLoading(true);
            const dataToSave: { id: number, year: string, amount: number }[] = [];
            headcountData.forEach(row => {
                Object.entries(row.years).forEach(([year, amount]) => {
                    dataToSave.push({
                        id: Number(row.id || row.typeId),
                        year: year,
                        amount: Number(amount)
                    });
                });
            });
            await saveMKDHeadcount(mkdId, dataToSave, token);
            message.success('บันทึก Headcount สำเร็จ');
        } catch (error) {
            message.error('เกิดข้อผิดพลาดในการบันทึก Headcount');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        modal.confirm({
            title: 'ยืนยันข้อมูล',
            content: 'คุณต้องการยืนยันข้อมูลนี้ใช่หรือไม่? หลังจากยืนยันแล้วจะไม่สามารถแก้ไขได้',
            onOk: async () => {
                try {
                    setLoading(true);
                    await updateStatusAction(mkdId, 2, currentUser.employeeID, token);
                    message.success('ยืนยันข้อมูลเรียบร้อยแล้ว');
                    router.push('/mkd/historyrecord');
                } catch (error) {
                    message.error('เกิดข้อผิดพลาด');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // --- Renderers ---
    const manpowerColumns = [
        {
            title: 'Manpower Key Driver',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: any) => (
                <div className="flex flex-col">
                    <Text strong className="text-blue-700">{text}</Text>
                    <Text type="secondary" className="text-[10px]">{record.unit}</Text>
                </div>
            )
        },
        {
            title: 'Weight(%)',
            dataIndex: 'weight',
            key: 'weight',
            width: 100,
            align: 'center' as const,
            render: (weight: number) => <Text strong>{weight}%</Text>
        },
        ...allYears.map(year => ({
            title: (parseInt(year) + (parseInt(year) < 2400 ? 543 : 0)).toString(),
            key: year,
            align: 'right' as const,
            render: (_, record: any) => {
                const sum = record.subItems.reduce((acc: number, curr: any) => {
                    const val = Number(curr.years[year]) || 0;
                    const coef = Number(curr.coefficient) || 1;
                    return acc + (val * coef);
                }, 0);
                return <Text>{sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>;
            }
        }))
    ];

    const headcountColumns = [
        {
            title: 'Employee Type',
            dataIndex: 'typeName',
            key: 'typeName',
            render: (name: string) => <Text strong>{name}</Text>
        },
        ...allYears.map(year => ({
            title: (parseInt(year) + (parseInt(year) < 2400 ? 543 : 0)).toString(),
            key: year,
            width: 120,
            align: 'center' as const,
            render: (_, record: any) => (
                <InputNumber 
                    min={0} 
                    value={record.years[year] || 0}
                    disabled={isReadOnly}
                    onChange={(val) => {
                        const newData = headcountData.map(r => {
                            if (r.typeId === record.typeId) {
                                return { ...r, years: { ...r.years, [year]: val } };
                            }
                            return r;
                        });
                        setHeadcountData(newData);
                    }}
                />
            )
        }))
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Header Section */}
                <Card className="mb-6 shadow-sm border-0" bodyStyle={{ padding: '24px' }}>
                    <div className="flex justify-between items-start mb-6">
                        <Space direction="vertical" size={0}>
                            <Title level={2} className="m-0 text-blue-800">Manpower Key Driver (Record)</Title>
                            <Space split={<Divider type="vertical" />} className="text-slate-500 text-sm">
                                <span>Request No: <Text strong>{header.RequestNo || '-'}</Text></span>
                                <span>Unit: <Text strong>{header.OrgUnitName || header.UnitName || '-'}</Text></span>
                            </Space>
                        </Space>
                        <Space>
                            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>BACK</Button>
                            {!isReadOnly && (
                                <Button 
                                    type="primary" 
                                    icon={<CheckCircleFilled />} 
                                    className="bg-green-600 hover:bg-green-700 border-none"
                                    onClick={handleConfirm}
                                >
                                    CONFIRM
                                </Button>
                            )}
                        </Space>
                    </div>
                </Card>

                {/* Tabs Section */}
                <Card className="shadow-sm border-0" bodyStyle={{ padding: 0 }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        type="card"
                        items={[
                            {
                                key: 'manpower',
                                label: <Space><ContainerOutlined /> MANPOWER KEY DRIVER</Space>,
                                children: (
                                    <div className="p-4">
                                        <Table 
                                            columns={manpowerColumns} 
                                            dataSource={mkdData}
                                            rowKey="id"
                                            pagination={false}
                                            bordered
                                        />
                                    </div>
                                )
                            },
                            {
                                key: 'headcount',
                                label: <Space><TeamOutlined /> HEADCOUNT</Space>,
                                children: (
                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <Title level={4} className="m-0">Budget Headcount</Title>
                                            {!isReadOnly && (
                                                <Button 
                                                    type="primary" 
                                                    icon={<SaveOutlined />} 
                                                    onClick={handleSaveHeadcount}
                                                    loading={loading}
                                                >
                                                    Save Headcount
                                                </Button>
                                            )}
                                        </div>
                                        <Table 
                                            columns={headcountColumns} 
                                            dataSource={headcountData}
                                            rowKey="typeId"
                                            pagination={false}
                                            bordered
                                        />
                                    </div>
                                )
                            },
                            {
                                key: 'file',
                                label: <Space><UploadOutlined /> ATTACH FILES</Space>,
                                children: (
                                    <div className="p-6">
                                        <List
                                            grid={{ gutter: 16, xs: 1, md: 3 }}
                                            dataSource={files}
                                            renderItem={(file: any) => (
                                                <List.Item>
                                                    <Card size="small" className="hover:shadow-md transition-shadow">
                                                        <Card.Meta 
                                                            avatar={<FileTextOutlined className="text-2xl text-blue-500" />}
                                                            title={file.FileName}
                                                            description={dayjs(file.CreateDate).format('DD MMM YYYY')}
                                                        />
                                                    </Card>
                                                </List.Item>
                                            )}
                                        />
                                    </div>
                                )
                            },
                            {
                                key: 'note',
                                label: <Space><EditOutlined /> NOTE</Space>,
                                children: (
                                    <div className="p-6">
                                        <TextArea 
                                            rows={8} 
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            disabled={isReadOnly}
                                            placeholder="Enter notes..."
                                        />
                                        {!isReadOnly && (
                                            <Button 
                                                type="primary" 
                                                className="mt-4" 
                                                icon={<SaveOutlined />}
                                                onClick={() => message.info('Note save coming soon')}
                                            >
                                                Save Note
                                            </Button>
                                        )}
                                    </div>
                                )
                            }
                        ]}
                    />
                </Card>
            </div>
        </div>
    );
}
