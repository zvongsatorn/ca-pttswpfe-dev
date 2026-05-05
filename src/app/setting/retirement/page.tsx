'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, Button, Select, Input, App, Spin, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { fetchRetirementRates } from '@/services/retirementService';

import {
    BUSINESS_TYPE_RATE,
    DISPLAY_YEAR_COUNT,
    SUPPORT_TYPE_RATE,
    createDefaultRows,
    formatLevelGroupLabel,
    normalizeBaseInput,
    normalizeRateInput,
    parseRatioCell,
    splitRatioInput,
    type RetirementDataType
} from '@/lib/business/retirementRules';

const API_BASE_URL = '';
interface RateRecord {
    BUSupportRateID: number;
    EffectiveYear: number;
    Year: number;
    Rate: number;
    Base?: number;
    TypeRate?: number;
}

interface LevelGroupOption {
    LevelGroupNo: string;
    LevelGroupName: string;
    LevelDelayOrder?: number | null;
}

interface RetirementApiResponse {
    data?: {
        rates?: RateRecord[];
        remark?: string;
        levelGroupNo?: string;
        levelGroups?: LevelGroupOption[];
    };
}

interface BadgeProps {
    count: string;
    style?: React.CSSProperties;
}

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function Badge({ count, style }: BadgeProps) {
    return <span style={{ ...style, padding: '2px 10px', borderRadius: '15px', fontSize: '12px' }}>{count}</span>;
}

function RetirementContent() {
    const { notification, modal } = App.useApp();
    const token = getToken();
    const currentUser = getUserFromToken();
    const [selectedYear, setSelectedYear] = useState<string>('2569');
    const [remark, setRemark] = useState('');
    const [levelGroupNo, setLevelGroupNo] = useState('');
    const [levelGroupOptions, setLevelGroupOptions] = useState<LevelGroupOption[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [tableData, setTableData] = useState<RetirementDataType[]>([]);
    const [loading, setLoading] = useState(false);

    const toBE = (year: string | number) => { const y = typeof year === 'string' ? parseInt(year) : year; return y < 2500 ? y + 543 : y; };

    const processRates = useCallback((rates: RateRecord[]) => {
        const startYear = parseInt(selectedYear, 10);
        const nextRows = createDefaultRows(startYear);
        const rowByType: Record<number, RetirementDataType> = {
            [BUSINESS_TYPE_RATE]: nextRows[0],
            [SUPPORT_TYPE_RATE]: nextRows[1],
        };

        rates.forEach((row) => {
            const parsedTypeRate = Number(row.TypeRate);
            const typeRate = parsedTypeRate === SUPPORT_TYPE_RATE ? SUPPORT_TYPE_RATE : BUSINESS_TYPE_RATE;
            const targetRow = rowByType[typeRate];
            if (!targetRow) return;
            const parsedBase = Number(row.Base);
            const base = Number.isFinite(parsedBase) && parsedBase > 0 ? Math.trunc(parsedBase) : 1;
            targetRow[toBE(row.Year).toString()] = `${row.Rate}:${base}`;
        });

        setTableData(nextRows);
    }, [selectedYear]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchRetirementRates(parseInt(selectedYear, 10), token) as RetirementApiResponse | null;
            if (res?.data) {
                setRemark(res.data.remark || '');
                setLevelGroupNo(String(res.data.levelGroupNo || '').trim());
                setLevelGroupOptions(Array.isArray(res.data.levelGroups) ? res.data.levelGroups : []);
                processRates(res.data.rates || []);
            }
        } catch { notification.error({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถดึงข้อมูลได้' }); }
        finally { setLoading(false); }
    }, [selectedYear, token, notification, processRates]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleTableChange = (value: string, rowKey: string, year: string) => {
        setTableData((prev) =>
            prev.map((row) => (row.key === rowKey ? { ...row, [year]: value } : row))
        );
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const startYearBE = parseInt(selectedYear, 10);
            const rates = tableData.flatMap((row) => {
                const typeRate = parseInt(row.key, 10);

                return Array.from({ length: DISPLAY_YEAR_COUNT }, (_, index) => {
                    const yearBE = startYearBE + index;
                    const raw = row[yearBE.toString()] || '0:1';
                    const ratio = parseRatioCell(raw);
                    return {
                        year: yearBE,
                        rate: ratio.rate,
                        base: ratio.base,
                        typeRate,
                    };
                });
            });

            const res = await fetch(`${API_BASE_URL}/api/retirement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    effectiveYear: startYearBE,
                    rates,
                    remark,
                    levelGroupNo,
                    user: currentUser?.employeeID || 'SYSTEM'
                }),
            });

            if (res.ok) {
                notification.success({ title: 'สำเร็จ', description: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
                setIsEditing(false); fetchData();
            } else { const err = await res.json(); notification.error({ title: 'ข้อผิดพลาด', description: err.error || 'Failed to save' }); }
        } finally { setLoading(false); }
    };

    const handleCopy = () => {
        const currentYearBE = parseInt(selectedYear, 10);
        const lastYearBE = currentYearBE - 1;
        modal.confirm({
            title: 'ยืนยันการสำเนาข้อมูล',
            content: `คุณต้องการสำเนาข้อมูลจากปี ${lastYearBE} มายังปี ${currentYearBE} ใช่หรือไม่?`,
            onOk: async () => {
                setLoading(true);
                try {
                    const res = await fetch(`${API_BASE_URL}/api/retirement/copy`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ fromYear: lastYearBE, toYear: currentYearBE, user: currentUser?.employeeID || 'SYSTEM' }),
                    });
                    if (res.ok) { notification.success({ title: 'สำเร็จ', description: 'สำเนาข้อมูลเรียบร้อยแล้ว' }); fetchData(); }
                    else { const err = await res.json(); notification.error({ title: 'ข้อผิดพลาด', description: err.error || 'Failed to copy' }); }
                } finally { setLoading(false); }
            }
        });
    };

    const columns = useMemo(() => {
        const startYear = parseInt(selectedYear, 10);
        const cols: ColumnsType<RetirementDataType> = [{
            title: 'Type',
            dataIndex: 'typeLabel',
            key: 'typeLabel',
            align: 'center',
            width: 140,
            render: (text) => <span className="font-semibold text-slate-900">{text}</span>
        }];

        for (let i = 0; i < DISPLAY_YEAR_COUNT; i++) {
            const year = (startYear + i).toString();
            cols.push({
                title: year, dataIndex: year, key: year, align: 'center',
                render: (text, record) => {
                    if (!isEditing) {
                        return <span className="font-medium text-slate-900">{text}</span>;
                    }

                    const ratioText = String(text || '0:1');
                    const { rateText, baseText } = splitRatioInput(ratioText);

                    return (
                        <div className="flex items-center justify-center gap-2">
                            <Input
                                value={rateText}
                                onChange={(e) => {
                                    const current = splitRatioInput(String(record[year] || '0:1'));
                                    const nextRate = normalizeRateInput(e.target.value);
                                    handleTableChange(`${nextRate}:${current.baseText}`, record.key, year);
                                }}
                                placeholder="Rate"
                                className="w-24 text-center"
                            />
                            <span className="font-semibold text-slate-500">:</span>
                            <Input
                                value={baseText}
                                onChange={(e) => {
                                    const current = splitRatioInput(String(record[year] || '0:1'));
                                    const nextBase = normalizeBaseInput(e.target.value);
                                    handleTableChange(`${current.rateText}:${nextBase}`, record.key, year);
                                }}
                                placeholder="Base"
                                className="w-20 text-center"
                            />
                        </div>
                    );
                }
            });
        }
        return cols;
    }, [selectedYear, isEditing]);

    const levelSummary = useMemo(() => {
        if (!levelGroupNo) return 'ไม่กำหนดระดับ: ระบบจะนับทุกระดับ';
        const startIndex = levelGroupOptions.findIndex((item) => item.LevelGroupNo === levelGroupNo);
        if (startIndex < 0) return `เลือกระดับ ${levelGroupNo}`;
        const selectedLevelLabel = formatLevelGroupLabel(
            levelGroupOptions[startIndex]?.LevelGroupNo,
            levelGroupOptions[startIndex]?.LevelGroupName
        );
        const includedLevels = levelGroupOptions
            .slice(startIndex)
            .map((item) => formatLevelGroupLabel(item.LevelGroupNo, item.LevelGroupName));
        return `เลือกระดับ ${selectedLevelLabel}: ระบบจะนับ ${includedLevels.join(', ')}`;
    }, [levelGroupNo, levelGroupOptions]);

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow-sm">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center justify-between">
                <h1 className="text-xl font-bold m-0 text-white">Business/Support Rate Configuration</h1>
                <Badge count={`Year ${selectedYear}`} style={{ backgroundColor: '#fff', color: '#2563eb', fontWeight: 'bold' }} />
            </div>

            <div className="mb-8 flex flex-nowrap items-end justify-between gap-4">
                <div className="flex flex-nowrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">Effective Year</label>
                        <Select value={selectedYear} onChange={setSelectedYear} className="w-32" options={[{ value: '2568', label: '2568' }, { value: '2569', label: '2569' }, { value: '2570', label: '2570' }, { value: '2571', label: '2571' }]} />
                    </div>
                    <Button type="primary" onClick={fetchData} className="bg-slate-900 font-bold">เรียกดู</Button>
                    <Button onClick={handleCopy} disabled={isEditing} className="border-green-600 text-green-600 hover:text-green-700 hover:border-green-700 font-medium">สำเนาจากปีที่แล้ว</Button>
                </div>
                <div className="ml-auto flex flex-nowrap items-center gap-2">
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} type="primary" className="bg-blue-600 hover:bg-blue-700 font-bold shadow-lg">แก้ไขข้อมูล</Button>
                    ) : (
                        <>
                            <Button onClick={() => { setIsEditing(false); fetchData(); }} className="font-bold">ยกเลิก</Button>
                            <Button onClick={handleSave} type="primary" className="bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-100">บันทึกการแก้ไข</Button>
                        </>
                    )}
                </div>
            </div>

            <Card className="mb-8 border-slate-100 shadow-sm" title={<span className="font-bold text-slate-700">อัตราส่วนตัดเกษียณ</span>}>
                <Spin spinning={loading}>
                    <Table columns={columns} dataSource={tableData} pagination={false} bordered className="rounded-lg overflow-hidden border-slate-100" />
                </Spin>
                <div className="mt-2 text-xs text-slate-500">โหมดแก้ไขกรอกแยกช่อง Rate : Base เช่น 1 : 1, 2 : 1, 3 : 2</div>
            </Card>

            <Card className="mb-8 border-slate-100 shadow-sm" title={<span className="font-bold text-slate-700">ระดับตำแหน่งสำหรับคำนวณเกษียณ</span>}>
                <div className="flex flex-col gap-2">
                    <Select
                        value={levelGroupNo || undefined}
                        onChange={(value) => setLevelGroupNo(value || '')}
                        options={levelGroupOptions.map((item) => ({
                            value: String(item.LevelGroupNo || '').trim(),
                            label: formatLevelGroupLabel(item.LevelGroupNo, item.LevelGroupName)
                        }))}
                        allowClear
                        placeholder="เลือกระดับสูงสุดที่ต้องการนับลงมา"
                        disabled={!isEditing}
                        className="w-full max-w-md"
                    />
                    <span className="text-sm text-slate-500">{levelSummary}</span>
                </div>
            </Card>

            <Card className="mb-8 border-slate-100 shadow-sm" title={<span className="font-bold text-slate-700">หมายเหตุ (Remarks)</span>}>
                <Input.TextArea rows={4} value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!isEditing} className="text-slate-900 font-medium" placeholder="ระบุหมายเหตุเพื่อบันทึกการเปลี่ยนแปลง..." />
            </Card>

        </div>
    );
}

export default function RetirementPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <RetirementContent />
            </App>
        </Main>
    );
}
