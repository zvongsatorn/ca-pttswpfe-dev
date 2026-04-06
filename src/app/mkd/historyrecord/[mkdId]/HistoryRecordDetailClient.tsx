'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { 
    ArrowLeft, FileSpreadsheet, FileText, Container, 
    Info, Upload, Trash2, Plus, Edit
} from 'lucide-react';

interface HistoryRecordDetailClientProps {
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

export default function HistoryRecordDetailClient({ mkdId, token, currentUser, initialData, masterKeys }: HistoryRecordDetailClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'MANPOWER' | 'SUMMARY' | 'FILES' | 'NOTE'>('MANPOWER');

    // Header Data
    const header = initialData.header || {};
    const initialKeys = initialData.keys || [];
    const initialYears = initialData.years || [];
    const files = initialData.files || [];

    const effectiveYear = header.EffectiveYear || 0;
    
    // For Record view, totally Read-only
    const isReadOnly = true; 

    const allYears = useMemo(() => {
        const years = Array.from(new Set(initialYears.map(y => Number(y.KeyYear))));
        return years.sort((a, b) => a - b);
    }, [initialYears]);

    const mkdData = useMemo(() => {
        const keys = initialKeys;
        const years = initialYears;
        const mainKeys = keys.filter(k => !k.ParentID || k.ParentID === 0);
        
        return mainKeys.map(mk => {
            const isUniform = mk.KeyType === 2;
            const subKeys = keys.filter(sk => sk.ParentID === mk.ManDriverKeyID);
            
            let mainYears: Record<number, number> = {};
            if (isUniform || subKeys.length === 0) {
                const yrData = years.filter(y => y.ManDriverKeyID === mk.ManDriverKeyID);
                allYears.forEach(y => {
                    const yearRecord = yrData.find(sy => Number(sy.KeyYear) === y);
                    mainYears[y] = yearRecord?.KeyAmount || 0;
                });
            }

            const mappedSubItems = subKeys.map(sk => {
                const skYears = years.filter(y => y.ManDriverKeyID === sk.ManDriverKeyID);
                const yearMap: Record<number, number> = {};
                allYears.forEach(y => {
                    const yearRecord = skYears.find(sy => Number(sy.KeyYear) === y);
                    yearMap[y] = yearRecord?.KeyAmount || 0;
                });
                return { 
                    id: sk.ManDriverKeyID.toString(), 
                    definition: sk.Definition || '', 
                    coefficient: sk.Coefficient || 1, 
                    remark: sk.Remark || '', 
                    years: yearMap 
                };
            });

            return { 
                id: mk.ManDriverKeyID.toString(), 
                name: mk.KeyManName || mk.Name || mk.Unit || '', 
                unit: mk.Unit || '', 
                type: mk.KeyType === 1 ? 'Index' : 'Uniform', 
                weight: mk.Weight || 0, 
                mainYears: mainYears,
                subItems: mappedSubItems 
            };
        });
    }, [initialKeys, initialYears, allYears]);

    const formatYearBE = (year: number) => {
        return year < 2400 ? (year + 543).toString() : year.toString();
    };

    const getYearColor = (year: number) => {
        if (year > effectiveYear) return "text-purple-700";
        if (year === effectiveYear) return "text-blue-600";
        return "text-black";
    };
    
    const getYearLabel = (year: number) => {
        let label = formatYearBE(year);
        if (year > effectiveYear) label += " \n F";
        if (year === effectiveYear) label += " \n E";
        return label;
    };

    const handleExportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Manpower Key Driver Summary');
            const headers = ["Manpower Key Driver", "Unit", "Weight(%)", ...allYears.map(y => getYearLabel(y).replace('\n ', ''))];
            const headerRow = worksheet.addRow(headers);
            
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFDBFE' } };
                cell.font = { bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            mkdData.forEach(driver => {
                let sumMap: Record<number, number> = {};
                if (driver.type === 'Uniform') {
                    sumMap = driver.mainYears;
                } else {
                    allYears.forEach(y => {
                        sumMap[y] = driver.subItems.reduce((acc, curr) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                    });
                }
                const rowData = [driver.name, driver.unit, driver.weight, ...allYears.map(y => sumMap[y] || 0)];
                worksheet.addRow(rowData);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `MKD_Record_${header.RequestNo}_${dayjs().format('YYYYMMDD')}.xlsx`);
        } catch {
            toast.error("Export failed");
        }
    };

    return (
        <div className="space-y-4">
            <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 shadow-lg py-2">
                <CardContent>
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-white mb-0">บันทึกประวัติ</h1>
                        <span className="text-white bg-white/20 px-3 py-1 rounded-full text-sm font-medium border border-white/30 backdrop-blur-sm shadow-sm inline-flex items-center gap-2">
                            Status: <span className="font-bold">{header.StatusName || '-'}</span>
                        </span>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 mb-4 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="md:col-span-3">
                    <Label className="text-sm font-semibold text-gray-700 mb-1 block">Request No.</Label>
                    <Input value={header.RequestNo || '-'} readOnly className="bg-gray-50 border-gray-200 font-medium text-blue-900 shadow-inner" />
                </div>
                <div className="md:col-span-3">
                    <Label className="text-sm font-semibold text-gray-700 mb-1 block">Date</Label>
                    <Input value={dayjs(header.RequestDate).format('DD/MM/YYYY')} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                </div>
                <div className="md:col-span-6">
                    <Label className="text-sm font-semibold text-gray-700 mb-1 block">หน่วยงาน (OrgUnit)</Label>
                    <Input value={header.OrgUnitName || header.UnitName || '-'} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                </div>
            </div>

            <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-600 mr-2">Effective Year:</span> 
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-sm font-semibold border border-blue-200">{formatYearBE(effectiveYear)}</span>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="text-slate-600 bg-white hover:bg-slate-50 border-slate-300 font-medium min-w-[100px] shadow-sm transition-all" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
                    </Button>
                </div>
            </div>

            <div className="border-b border-blue-200 mb-6 bg-white/50 backdrop-blur-sm sticky top-0 z-10 px-2 pt-2">
                <div className="flex gap-1 md:gap-4 overflow-x-auto">
                    {[
                        { id: 'MANPOWER', label: 'Manpower Key Driver', icon: Container },
                        { id: 'SUMMARY', label: 'Summary', icon: FileSpreadsheet },
                        { id: 'FILES', label: 'File Attach', icon: FileText },
                        { id: 'NOTE', label: 'Note', icon: Info },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-3 px-4 font-semibold text-sm transition-all relative whitespace-nowrap flex items-center gap-2
                                    ${isActive ? "text-blue-700" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-t-lg"}`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                                {tab.label}
                                {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-md shadow-sm"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-[400px] overflow-hidden">
                {activeTab === 'MANPOWER' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="overflow-x-auto border border-slate-200 rounded-md">
                            <Table className="text-[13px] min-w-[max-content]">
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[40px]"></TableHead>
                                        <TableHead className="font-bold text-slate-800 min-w-[180px]">Manpower Key Driver</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[80px]">Unit</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[80px]">Type</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l min-w-[150px]">Definition</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[100px]">Coefficient</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[90px]">Weight(%)</TableHead>
                                        {allYears.map(y => (
                                            <TableHead key={y} className={`font-bold text-right border-l w-[90px] whitespace-pre-wrap leading-tight ${getYearColor(y)}`}>
                                                {getYearLabel(y)}
                                            </TableHead>
                                        ))}
                                        <TableHead className="font-bold text-slate-800 border-l min-w-[150px]">Remark</TableHead>
                                        <TableHead className="w-[40px] border-l"></TableHead>
                                        <TableHead className="w-[40px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mkdData.map((driver) => (
                                        <React.Fragment key={driver.id}>
                                            <TableRow className="bg-blue-50/20 hover:bg-blue-50/40 border-t-2 border-t-slate-100">
                                                <TableCell className="p-2 text-center">
                                                </TableCell>
                                                <TableCell className="font-bold text-blue-800">{driver.name}</TableCell>
                                                <TableCell className="text-center font-medium border-l border-slate-100">{driver.unit}</TableCell>
                                                <TableCell className="text-center border-l border-slate-100">
                                                    <Badge variant={driver.type === 'Index' ? 'default' : 'secondary'} className="bg-slate-200 text-slate-700 hover:bg-slate-300 rounded font-medium text-[11px] px-1.5 uppercase tracking-wide">
                                                        {driver.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                                <TableCell className="text-center font-bold border-l border-slate-100">{driver.weight}</TableCell>
                                                {allYears.map(y => (
                                                    <TableCell key={y} className="text-right font-semibold border-l border-slate-100">
                                                        {driver.type === 'Uniform' ? (driver.mainYears[y] || 0)?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : ''}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                                <TableCell className="p-2 text-center border-l border-slate-100"></TableCell>
                                                <TableCell className="p-2 text-center"></TableCell>
                                            </TableRow>

                                            {driver.subItems.map((sk: any) => (
                                                <TableRow key={sk.id} className="bg-white hover:bg-slate-50 transition-colors">
                                                    <TableCell></TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    <TableCell className="border-l border-slate-100">{sk.definition}</TableCell>
                                                    <TableCell className="text-right border-l border-slate-100">{sk.coefficient}</TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    {allYears.map(y => (
                                                        <TableCell key={y} className="text-right border-l border-slate-100">
                                                            {(sk.years[y] || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="border-l border-slate-100 truncate max-w-[150px]" title={sk.remark}>{sk.remark}</TableCell>
                                                    <TableCell className="p-2 text-center border-l border-slate-100"></TableCell>
                                                    <TableCell className="p-2 text-center"></TableCell>
                                                </TableRow>
                                            ))}

                                            {driver.type === 'Index' && driver.subItems.length > 0 && (
                                                <TableRow className="bg-[#f1e8e1]">
                                                    <TableCell colSpan={7}></TableCell>
                                                    {allYears.map(y => {
                                                        const sum = driver.subItems.reduce((acc: number, curr: any) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                                        return (
                                                            <TableCell key={y} className={`text-right font-bold border-l border-white/50 ${getYearColor(y)}`}>
                                                                {sum.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell colSpan={3} className="border-l border-white/50"></TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {mkdData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={11 + allYears.length} className="text-center py-12 text-slate-500">
                                                ไม่มีข้อมูล
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {activeTab === 'SUMMARY' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Summary</h3>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleExportExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export to Excel
                            </Button>
                        </div>
                        <div className="overflow-x-auto border border-slate-200 rounded-md">
                            <Table className="text-[13px] min-w-[max-content]">
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-800 min-w-[200px]">Manpower Key Driver</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l">Unit</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l w-[100px]">Weight(%)</TableHead>
                                        {allYears.map(y => (
                                            <TableHead key={y} className={`font-bold text-right border-l w-[100px] whitespace-pre-wrap leading-tight ${getYearColor(y)}`}>
                                                {getYearLabel(y)}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mkdData.map(driver => {
                                        let sumMap: Record<number, number> = {};
                                        if (driver.type === 'Uniform') {
                                            sumMap = driver.mainYears;
                                        } else {
                                            allYears.forEach(y => {
                                                sumMap[y] = driver.subItems.reduce((acc: number, curr: any) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                            });
                                        }
                                        return (
                                            <TableRow key={driver.id} className="hover:bg-blue-50/30">
                                                <TableCell className="font-bold text-blue-800">{driver.name}</TableCell>
                                                <TableCell className="text-center border-l font-medium border-slate-100">{driver.unit}</TableCell>
                                                <TableCell className="text-center border-l font-medium border-slate-100">{driver.weight}</TableCell>
                                                {allYears.map(y => (
                                                    <TableCell key={y} className="text-right border-l font-semibold border-slate-100">
                                                        {(sumMap[y] || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        );
                                    })}
                                    {mkdData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3 + allYears.length} className="text-center py-8 text-slate-500">ไม่มีข้อมูล</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {activeTab === 'FILES' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-slate-600 text-sm">
                                <p className="font-bold text-slate-700">*Remark:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Maximum File Size: 15MB</li>
                                    <li>Extension: PDF</li>
                                    <li>เอกสารเพื่อประกอบการกรอกข้อมูล MKD ที่ได้รับอนุมัติหรือเป็นไปตามแผนงานของสายงาน</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto border border-slate-200 rounded-md">
                            <Table className="text-[13px]">
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center font-bold text-slate-800">NO</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l min-w-[300px]">Name</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l text-center w-[120px]">File</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {files.map((file: any, idx) => {
                                        const ext = file.FileName?.split('.').pop()?.toUpperCase() || file.fileName?.split('.').pop()?.toUpperCase() || 'PDF';
                                        return (
                                            <TableRow key={idx} className="hover:bg-slate-50/50">
                                                <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                                <TableCell className="border-l font-medium">{file.FileName || file.fileName}</TableCell>
                                                <TableCell className="border-l text-center">
                                                    <Button variant="ghost" className="h-auto p-2 hover:bg-blue-50 flex flex-col items-center justify-center space-y-1 mx-auto" onClick={() => window.open(`/api/files-proxy?path=${effectiveYear}/${file.FileUpload}`, '_blank')}>
                                                        <FileText className="w-6 h-6 text-blue-500" />
                                                        <span className="text-[10px] text-slate-500 font-semibold">{ext}</span>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {files.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                                                ไม่มีข้อมูลเอกสาร
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {activeTab === 'NOTE' && (
                    <div className="animate-in fade-in duration-300 max-w-3xl">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 shadow-inner">
                            <textarea
                                className="w-full bg-transparent border-0 focus:ring-0 resize-y min-h-[200px] p-4 text-slate-700"
                                placeholder="ไม่มีหมายเหตุ"
                                value={initialData.header?.Remark || initialData.header?.Note || ''}
                                disabled={isReadOnly}
                                maxLength={500}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
