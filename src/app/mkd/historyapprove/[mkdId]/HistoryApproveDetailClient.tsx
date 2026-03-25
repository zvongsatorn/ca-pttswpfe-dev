'use client';

import React, { useState, useMemo } from 'react';
import { 
    Table, 
    Card, 
    Button, 
    Typography, 
    Tag, 
    Tabs, 
    Space, 
    Divider,
    List, 
    Tooltip,
    Empty
} from 'antd';
import { 
    ArrowLeftOutlined, 
    FileExcelOutlined,
    FileTextOutlined,
    ContainerOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const { Title, Text } = Typography;

interface HistoryApproveDetailClientProps {
    mkdId: string;
    token: string;
    currentUser: any;
    initialData: {
        header: any;
        keys: any[];
        years: any[];
        files: any[];
    };
    masterKeys: any[];
}

export default function HistoryApproveDetailClient({ mkdId, token, currentUser, initialData, masterKeys }: HistoryApproveDetailClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('manpower');

    // Header Data
    const header = initialData.header || {};
    const effectiveYear = header.EffectiveYear || 0;

    // Process Years
    const allYears = useMemo(() => {
        const years = Array.from(new Set(initialData.years.map(y => y.KeyYear)));
        return years.sort((a, b) => parseInt(a) - parseInt(b));
    }, [initialData.years]);

    // Process Keys
    const mkdData = useMemo(() => {
        const keys = initialData.keys || [];
        const years = initialData.years || [];
        
        const mainKeys = keys.filter(k => !k.ParentID || k.ParentID === 0);
        return mainKeys.map(mk => {
            const subKeys = keys.filter(sk => sk.ParentID === mk.ManDriverKeyID);
            
            const mappedSubItems = subKeys.map(sk => {
                const skYears = years.filter(y => y.ManDriverKeyID === sk.ManDriverKeyID);
                const yearMap: Record<string, number> = {};
                
                allYears.forEach(y => {
                    const yearData = skYears.find(sy => sy.KeyYear === y);
                    yearMap[y] = yearData?.KeyAmount || 0;
                });

                return {
                    id: sk.ManDriverKeyID.toString(),
                    definition: sk.Definition || '',
                    coefficient: sk.Coefficient || 1,
                    remark: sk.Remark || '',
                    years: yearMap
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
                    years: emptyYearMap
                });
            }

            return {
                id: mk.ManDriverKeyID.toString(),
                name: mk.KeyManName || mk.Name || mk.Unit || '',
                unit: mk.Unit || '',
                type: mk.KeyType === 1 ? 'index' : 'uniform',
                weight: mk.Weight || 0,
                subItems: mappedSubItems
            };
        });
    }, [initialData.keys, initialData.years, allYears]);

    const files = initialData.files || [];

    // --- Actions ---
    const handleExportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Manpower Key Driver Summary');
            const headers = ["Manpower Key Driver", "Unit", "Weight(%)", ...allYears.map(y => (parseInt(y) + (parseInt(y) < 2400 ? 543 : 0)).toString())];
            const headerRow = worksheet.addRow(headers);
            
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFDBFE' } };
                cell.font = { bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            mkdData.forEach(driver => {
                const sum: Record<string, number> = {};
                allYears.forEach(y => {
                    sum[y] = driver.subItems.reduce((acc, curr) => {
                        const val = Number(curr.years[y]) || 0;
                        const coef = Number(curr.coefficient) || 1;
                        return acc + (val * coef);
                    }, 0);
                });
                const rowData = [driver.name, driver.unit, driver.weight, ...allYears.map(y => sum[y] || 0)];
                worksheet.addRow(rowData);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `MKD_Approved_${header.RequestNo}_${dayjs().format('YYYYMMDD')}.xlsx`);
        } catch {
            console.error("Export failed");
        }
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

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Header Card */}
                <Card className="mb-6 shadow-sm border-0 bg-white" bodyStyle={{ padding: '24px' }}>
                    <div className="flex justify-between items-start mb-6">
                        <Space direction="vertical" size={0}>
                            <Title level={2} className="m-0 text-blue-800">Manpower Key Driver (Approved)</Title>
                            <Space split={<Divider type="vertical" />} className="text-slate-500 text-sm">
                                <span>Request No: <Text strong>{header.RequestNo || '-'}</Text></span>
                                <span>Unit: <Text strong>{header.OrgUnitName || header.UnitName || '-'}</Text></span>
                                <span>Status: <Tag color="success">{header.StatusName || '-'}</Tag></span>
                            </Space>
                        </Space>
                        <Space>
                            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>BACK</Button>
                            <Button 
                                type="primary" 
                                icon={<FileExcelOutlined />} 
                                className="bg-green-600 hover:bg-green-700 border-none"
                                onClick={handleExportExcel}
                            >
                                EXPORT EXCEL
                            </Button>
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
                                label: <Space><ContainerOutlined /> KEY DRIVER DETAILS</Space>,
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
                                key: 'file',
                                label: <Space><FileTextOutlined /> ATTACH FILES</Space>,
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
                                        {files.length === 0 && <Empty description="No attachments found" />}
                                    </div>
                                )
                            },
                            {
                                key: 'note',
                                label: <Space><InfoCircleOutlined /> NOTE</Space>,
                                children: (
                                    <div className="p-6 text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg min-h-[200px]">
                                        {initialData.header?.Remark || initialData.header?.Note || 'No notes provided'}
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
