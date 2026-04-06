'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
    Table, Card, Button, Typography, Tag, Tabs, Space, Input, InputNumber, 
    Modal, Select, App, Upload, List, Tooltip, Divider, Descriptions, Empty
} from 'antd';
import { 
    ArrowLeftOutlined, SaveOutlined, SendOutlined, PlusOutlined, EditOutlined, 
    DeleteOutlined, FileExcelOutlined, FileTextOutlined, UploadOutlined, 
    DeleteFilled, CheckCircleFilled, ClockCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getUserFromToken } from '@/utils/auth';
import { 
    getMKDDetails, getMasterKeys, saveMainKey, saveDetailKey, deleteMainKey, 
    uploadMKDFile, deleteMKDFile, updateManDriverStatus, requestApproveMKD, updateMKDNote 
} from '@/services/mkdService';

const { Title, Text } = Typography;
const { TextArea } = Input;

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

export default function MKDDetailPage() {
    const router = useRouter();
    const params = useParams();
    const mkdId = params.mkdId as string;
    const { message, modal } = App.useApp();
    const token = getToken();
    const currentUser = getUserFromToken();

    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('manpower');
    const [note, setNote] = useState('');

    // Data State
    const [header, setHeader] = useState<any>({});
    const [initialKeys, setInitialKeys] = useState<any[]>([]);
    const [initialYears, setInitialYears] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [masterKeysList, setMasterKeysList] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
            try {
                const [detailRes, masterKeysRes] = await Promise.all([
                    getMKDDetails(mkdId, token),
                    getMasterKeys(token)
                ]);
                if (detailRes?.success) {
                    setHeader(detailRes.data.header || {});
                    setInitialKeys(detailRes.data.keys || []);
                    setInitialYears(detailRes.data.years || []);
                    setFiles(detailRes.data.files || []);
                    setNote(detailRes.data.header?.Remark || '');
                }
                if (masterKeysRes?.success) setMasterKeysList(masterKeysRes.data || []);
            } finally { setDataLoading(false); }
        };
        fetchData();
    }, [mkdId]);

    const effectiveYear = header.EffectiveYear || 0;
    const isReadOnly = header.ManDriverStatus !== 1;

    const allYears = useMemo(() => {
        const years = Array.from(new Set(initialYears.map(y => y.KeyYear)));
        return years.sort((a, b) => parseInt(a) - parseInt(b));
    }, [initialYears]);

    const mkdData = useMemo(() => {
        const keys = initialKeys;
        const years = initialYears;
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
                return { id: sk.ManDriverKeyID.toString(), definition: sk.Definition || '', coefficient: sk.Coefficient || 1, remark: sk.Remark || '', years: yearMap, yIds };
            });
            if (mappedSubItems.length === 0) {
                const emptyYearMap: Record<string, number> = {};
                allYears.forEach(y => emptyYearMap[y] = 0);
                mappedSubItems.push({ id: `temp-${mk.ManDriverKeyID}`, definition: mk.Definition || '', coefficient: mk.Coefficient || 1, remark: mk.Remark || '', years: emptyYearMap, yIds: {} });
            }
            return { id: mk.ManDriverKeyID.toString(), name: mk.KeyManName || mk.Name || mk.Unit || '', unit: mk.Unit || '', type: mk.KeyType === 1 ? 'index' : 'uniform', weight: mk.Weight || 0, keyManId: mk.KeyManID, subItems: mappedSubItems };
        });
    }, [initialKeys, initialYears, allYears]);

    const formatNumber = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatYearBE = (year: string | number) => { const yNum = parseInt(year.toString()); return yNum < 2400 ? (yNum + 543).toString() : yNum.toString(); };
    const getYearStyle = (year: string) => {
        const yNum = parseInt(year); const displayYear = parseInt(formatYearBE(yNum)); const targetEff = parseInt(formatYearBE(effectiveYear));
        if (displayYear < targetEff) return { suffix: '', color: 'default' };
        if (displayYear === targetEff) return { suffix: ' E', color: 'blue' };
        return { suffix: ' F', color: 'purple' };
    };

    const handleSaveNote = async () => {
        try { setLoading(true); await updateMKDNote(mkdId, note, token); message.success('บันทึกหมายเหตุสำเร็จ'); }
        catch { message.error('เกิดข้อผิดพลาดในการบันทึกหมายเหตุ'); }
        finally { setLoading(false); }
    };

    const handleRequestApprove = () => {
        const totalWeight = mkdData.reduce((sum, d) => sum + (Number(d.weight) || 0), 0);
        if (totalWeight > 100) { modal.warning({ title: 'Weight รวมเกิน 100%', content: `รวม Weight (%) ทั้งหมดของรายการหลักต้องไม่เกิน 100% (ปัจจุบัน: ${totalWeight}%) กรุณาตรวจสอบและแก้ไขให้ถูกต้องก่อนส่งอนุมัติ` }); return; }
        modal.confirm({
            title: 'ยืนยันการส่งอนุมัติ', content: 'คุณต้องการส่งเอกสารนี้เพื่อขออนุมัติใช่หรือไม่?',
            onOk: async () => {
                try { setLoading(true); const res = await requestApproveMKD(mkdId, currentUser?.employeeID, token);
                    if (res?.success) { message.success('ส่งคำขออนุมัติเรียบร้อยแล้ว'); router.push('/mkd/history'); }
                    else { message.error(res?.message || 'เกิดข้อผิดพลาดในการส่งคำขออนุมัติ'); }
                } catch { message.error('เกิดข้อผิดพลาด'); } finally { setLoading(false); }
            }
        });
    };

    const handleCancel = () => {
        modal.confirm({
            title: 'ยืนยันการยกเลิก', content: 'คุณต้องการยกเลิกเอกสารนี้ใช่หรือไม่? หลังจากยกเลิกแล้วจะไม่สามารถแก้ไขได้อีก', okType: 'danger',
            onOk: async () => {
                try { setLoading(true); await updateManDriverStatus(mkdId, 0, currentUser?.employeeID, token); message.success('ยกเลิกเอกสารเรียบร้อยแล้ว'); router.push('/mkd/history'); }
                catch { message.error('เกิดข้อผิดพลาด'); } finally { setLoading(false); }
            }
        });
    };

    const manpowerColumns = [
        { title: 'Manpower Key Driver', dataIndex: 'name', key: 'name', render: (text: string, record: any) => <div className="flex flex-col"><Text strong className="text-blue-700">{text}</Text><Text type="secondary" className="text-[10px]">{record.unit}</Text></div> },
        { title: 'Type', dataIndex: 'type', key: 'type', width: 80, render: (type: string) => <Tag color={type === 'index' ? 'blue' : 'cyan'} className="capitalize">{type}</Tag> },
        { title: 'Definition', dataIndex: 'definition', key: 'definition', render: (_: any, record: any) => record.subItems[0]?.definition || '-' },
        { title: 'Weight(%)', dataIndex: 'weight', key: 'weight', width: 100, align: 'center' as const, render: (weight: number) => <Text strong>{weight}%</Text> },
        ...allYears.map(year => {
            const style = getYearStyle(year);
            return { title: `${formatYearBE(year)}${style.suffix}`, key: year, align: 'right' as const, width: 100, className: style.color === 'purple' ? 'bg-purple-50/30' : '',
                render: (_: any, record: any) => { const sum = record.subItems.reduce((acc: number, curr: any) => { const val = Number(curr.years[year]) || 0; const coef = Number(curr.coefficient) || 1; return acc + (val * coef); }, 0); return <Text>{formatNumber(sum)}</Text>; }
            };
        }),
        { title: 'Action', key: 'action', width: 100, align: 'center' as const, render: (_: any, record: any) => <Space>{!isReadOnly && <Button type="text" icon={<EditOutlined className="text-orange-500" />} onClick={() => message.info('Functionality coming soon')} />}<Button type="text" icon={<InfoCircleOutlined className="text-blue-500" />} onClick={() => setActiveTab('summary')} /></Space> }
    ];

    if (dataLoading) return <div className="w-full min-h-screen flex items-center justify-center"><Text>Loading...</Text></div>;

    return (
        <App>
            <div className="w-full bg-slate-50 min-h-screen p-6">
                <div className="max-w-[1600px] mx-auto">
                    <Card className="mb-6 shadow-sm border-0 bg-white" styles={{ body: { padding: '24px' } }}>
                        <div className="flex justify-between items-start mb-6">
                            <Space orientation="vertical" size={0}>
                                <Title level={2} className="m-0 text-blue-800">Manpower Key Driver</Title>
                                <Space split={<Divider type="vertical" />} className="text-slate-500 text-sm">
                                    <span>Request No: <Text strong>{header.RequestNo || '-'}</Text></span>
                                    <span>Date: <Text strong>{dayjs(header.RequestDate).format('DD/MM/YYYY')}</Text></span>
                                    <span>OrgUnit: <Text strong>{header.OrgUnitName || header.UnitName || '-'}</Text></span>
                                </Space>
                            </Space>
                            <Space>
                                <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>BACK</Button>
                                {!isReadOnly && (<><Button danger onClick={handleCancel}>CANCEL</Button><Button type="primary" icon={<SendOutlined />} className="bg-green-600 hover:bg-green-700 border-none" onClick={handleRequestApprove}>REQUEST APPROVE</Button></>)}
                            </Space>
                        </div>
                        <div className="flex gap-4">
                            <Tag color={isReadOnly ? 'warning' : 'processing'} className="px-4 py-1 text-sm font-medium">Status: {header.StatusName || '-'}</Tag>
                            <Tag color="cyan" className="px-4 py-1 text-sm font-medium">Effective Year: {formatYearBE(effectiveYear)}</Tag>
                        </div>
                    </Card>

                    <Card className="shadow-sm border-0" styles={{ body: { padding: 0 } }}>
                        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" className="custom-tabs" items={[
                            { key: 'manpower', label: <Space><FileTextOutlined /> MANPOWER KEY DRIVER</Space>, children: (
                                <div className="p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <Title level={4} className="m-0">Key Driver Details</Title>
                                        {!isReadOnly && <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('Coming soon')}>Add/Edit Drivers</Button>}
                                    </div>
                                    <Table columns={manpowerColumns} dataSource={mkdData} rowKey="id" pagination={false} bordered className="custom-table" />
                                </div>
                            )},
                            { key: 'summary', label: <Space><FileExcelOutlined /> SUMMARY</Space>, children: (
                                <div className="p-8 text-center">
                                    <Empty description="Detail summary view is being optimized for Next.js 16" />
                                    <Button type="primary" className="mt-4" icon={<FileExcelOutlined />} onClick={() => message.success('Export logic ready')}>Export to Excel</Button>
                                </div>
                            )},
                            { key: 'file', label: <Space><UploadOutlined /> ATTACH FILES</Space>, children: (
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <Title level={4} className="m-0">Supporting Documents</Title>
                                        {!isReadOnly && <Upload showUploadList={false}><Button icon={<UploadOutlined />} type="primary">Upload New File</Button></Upload>}
                                    </div>
                                    <List grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }} dataSource={files} renderItem={(file: any) => (
                                        <List.Item><Card size="small" className="hover:shadow-md transition-shadow border-slate-200"
                                            actions={[<Tooltip title="View File"><FileTextOutlined key="view" className="text-blue-500" /></Tooltip>, !isReadOnly && <Tooltip title="Delete"><DeleteOutlined key="delete" className="text-red-500" /></Tooltip>].filter(Boolean) as any}>
                                            <Card.Meta title={file.FileName || file.fileName} description={dayjs(file.CreateDate).format('DD MMM YYYY')} />
                                        </Card></List.Item>
                                    )} />
                                </div>
                            )},
                            { key: 'note', label: <Space><EditOutlined /> NOTE</Space>, children: (
                                <div className="p-6">
                                    <Title level={4}>Remarks & Notes</Title>
                                    <TextArea rows={8} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter any additional notes here..." disabled={isReadOnly} className="mb-4" />
                                    {!isReadOnly && <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveNote} loading={loading}>Save Note</Button>}
                                </div>
                            )}
                        ]} />
                    </Card>
                </div>

                <style jsx global>{`
                    .custom-tabs .ant-tabs-nav { margin-bottom: 0 !important; background: #f8fafc; }
                    .custom-tabs .ant-tabs-tab { padding: 12px 24px !important; font-weight: 500; border: none !important; background: transparent !important; transition: all 0.3s; }
                    .custom-tabs .ant-tabs-tab-active { background: white !important; border-bottom: 2px solid #1d4ed8 !important; }
                    .custom-table .ant-table-thead > tr > th { background: #eff6ff !important; color: #1e40af !important; font-weight: 600 !important; font-size: 13px; }
                `}</style>
            </div>
        </App>
    );
}