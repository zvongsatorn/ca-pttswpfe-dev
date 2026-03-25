'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Button, Select, Input, App, Spin, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { saveRetirementRatesAction, copyRetirementRatesAction } from './actions';
import { fetchRetirementRates } from '@/services/retirementService';

interface RetirementDataType {
    key: string;
    [year: string]: string; 
}

interface RateRecord {
    BUSupportRateID: number;
    EffectiveYear: number;
    Year: number;
    Rate: number;
}

interface RetirementClientProps {
    initialData: {
        rates: RateRecord[];
        remark: string;
    };
    token: string;
    currentUser: any;
}

export default function RetirementClient({ initialData, token, currentUser }: RetirementClientProps) {
    const { notification, modal } = App.useApp();
    const [selectedYear, setSelectedYear] = useState<string>('2569');
    const [remark, setRemark] = useState(initialData.remark || '');
    const [isEditing, setIsEditing] = useState(false);
    const [tableData, setTableData] = useState<RetirementDataType[]>([]);
    const [loading, setLoading] = useState(false);

    const toAD = (year: string | number) => {
        const y = typeof year === 'string' ? parseInt(year) : year;
        return y > 2500 ? y - 543 : y;
    };

    const toBE = (year: string | number) => {
        const y = typeof year === 'string' ? parseInt(year) : year;
        return y < 2500 ? y + 543 : y;
    };

    const processRates = useCallback((rates: RateRecord[]) => {
        const data: RetirementDataType = { key: '1' };
        if (rates && rates.length > 0) {
            rates.forEach((r: RateRecord) => {
                data[toBE(r.Year).toString()] = r.Rate.toString();
            });
        } else {
            const startYear = parseInt(selectedYear);
            for (let i = 0; i < 5; i++) {
                data[(startYear + i).toString()] = '0';
            }
        }
        setTableData([data]);
    }, [selectedYear]);

    useEffect(() => {
        processRates(initialData.rates);
    }, [initialData.rates, processRates]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchRetirementRates(toAD(selectedYear), token);
            if (res && res.data) {
                setRemark(res.data.remark || '');
                processRates(res.data.rates || []);
            }
        } catch (error) {
            notification.error({ message: 'ข้อผิดพลาด', description: 'ไม่สามารถดึงข้อมูลได้' });
        } finally {
            setLoading(false);
        }
    }, [selectedYear, token, notification, processRates]);

    const handleTableChange = (value: string, year: string) => {
        setTableData(prev => {
            const newData = [...prev];
            newData[0][year] = value;
            return newData;
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const startYearBE = parseInt(selectedYear);
            const ratesRecord = tableData[0];
            const rates = [];

            for (let i = 0; i < 5; i++) {
                const yearBE = startYearBE + i;
                rates.push({
                    year: toAD(yearBE),
                    rate: parseFloat(ratesRecord[yearBE.toString()] || '0')
                });
            }

            const res = await saveRetirementRatesAction({
                effectiveYear: toAD(selectedYear),
                rates,
                remark,
                user: currentUser.employeeID || 'SYSTEM'
            }, token);

            if (res.success) {
                notification.success({ message: 'สำเร็จ', description: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
                setIsEditing(false);
                fetchData();
            } else {
                notification.error({ message: 'ข้อผิดพลาด', description: res.message });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const currentYearBE = parseInt(selectedYear);
        const lastYearBE = currentYearBE - 1;

        modal.confirm({
            title: 'ยืนยันการสำเนาข้อมูล',
            content: `คุณต้องการสำเนาข้อมูลจากปี ${lastYearBE} มายังปี ${currentYearBE} ใช่หรือไม่?`,
            onOk: async () => {
                setLoading(true);
                try {
                    const res = await copyRetirementRatesAction({
                        fromYear: toAD(lastYearBE),
                        toYear: toAD(currentYearBE),
                        user: currentUser.employeeID || 'SYSTEM'
                    }, token);

                    if (res.success) {
                        notification.success({ message: 'สำเร็จ', description: 'สำเนาข้อมูลเรียบร้อยแล้ว' });
                        fetchData();
                    } else {
                        notification.error({ message: 'ข้อผิดพลาด', description: res.message });
                    }
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const columns = useMemo(() => {
        const startYear = parseInt(selectedYear);
        const cols: ColumnsType<RetirementDataType> = [];

        for (let i = 0; i < 5; i++) {
            const year = (startYear + i).toString();
            cols.push({
                title: year,
                dataIndex: year,
                key: year,
                align: 'center',
                render: (text, record) => isEditing ? (
                    <Input value={text} onChange={(e) => handleTableChange(e.target.value, year)} className="text-center" />
                ) : <span className="font-medium text-slate-900">{text}</span>
            });
        }
        return cols;
    }, [selectedYear, isEditing]);

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow-sm">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center justify-between">
                <h1 className="text-xl font-bold m-0 text-white">BU/Support Rate Configuration</h1>
                <Badge count={`Year ${selectedYear}`} style={{ backgroundColor: '#fff', color: '#2563eb', fontWeight: 'bold' }} />
            </div>

            <div className="flex flex-wrap items-end gap-4 mb-8">
                <div className="flex flex-col gap-1">
                    <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">Effective Year (BE)</label>
                    <Select
                        value={selectedYear}
                        onChange={setSelectedYear}
                        className="w-32"
                        options={[
                            { value: '2568', label: '2568' },
                            { value: '2569', label: '2569' },
                            { value: '2570', label: '2570' },
                            { value: '2571', label: '2571' },
                        ]}
                    />
                </div>
                <div className="flex gap-2">
                    <Button type="primary" onClick={fetchData} className="bg-slate-900 font-bold">เรียกดู</Button>
                    <Button onClick={handleCopy} disabled={isEditing} className="border-green-600 text-green-600 hover:text-green-700 hover:border-green-700 font-medium">สำเนาจากปีที่แล้ว</Button>
                </div>
            </div>

            <Card className="mb-8 border-slate-100 shadow-sm" title={<span className="font-bold text-slate-700">อัตราส่วน BU/Support</span>}>
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={tableData}
                        pagination={false}
                        bordered
                        className="rounded-lg overflow-hidden border-slate-100"
                    />
                    <p className="mt-4 text-xs text-slate-400 italic font-medium">* ข้อมูลใช้สำหรับคำนวณอัตราส่วน (เช่น 2:1, 3:1) ของพนักงานในสายงานต่างๆ</p>
                </Spin>
            </Card>

            <Card className="mb-8 border-slate-100 shadow-sm" title={<span className="font-bold text-slate-700">หมายเหตุ (Remarks)</span>}>
                <Input.TextArea
                    rows={4}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    disabled={!isEditing}
                    className="text-slate-900 font-medium"
                    placeholder="ระบุหมายเหตุเพื่อบันทึกการเปลี่ยนแปลง..."
                />
            </Card>

            <div className="flex justify-end gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} type="primary" size="large" className="bg-blue-600 hover:bg-blue-700 px-8 font-bold shadow-lg">แก้ไขข้อมูล</Button>
                ) : (
                    <>
                        <Button onClick={() => { setIsEditing(false); fetchData(); }} size="large" className="px-8 font-bold">ยกเลิก</Button>
                        <Button onClick={handleSave} type="primary" size="large" className="bg-green-600 hover:bg-green-700 px-10 font-bold shadow-lg shadow-green-100">บันทึกอัตราส่วน</Button>
                    </>
                )}
            </div>
        </div>
    );
}

function Badge({ count, style }: any) {
    return <span style={{ ...style, padding: '2px 10px', borderRadius: '15px', fontSize: '12px' }}>{count}</span>;
}
