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
    Info
} from 'lucide-react';

interface CurrentUser {
    employeeID?: string;
    EmployeeID?: string;
    [key: string]: unknown;
}

interface MKDHeader {
    RequestNo?: string;
    RequestDate?: string;
    OrgUnitName?: string;
    UnitName?: string;
    ManDriverStatus?: number;
    StatusName?: string;
    EffectiveYear?: number;
    Remark?: string;
    Note?: string;
    OrgUnitNo?: string;
}

interface MKDKey {
    ManDriverKeyID: number | string;
    ParentID?: number | string;
    KeyManID?: number | string;
    KeyManName?: string;
    Name?: string;
    Unit?: string;
    KeyType?: number;
    Weight?: number;
    Definition?: string;
    Coefficient?: number;
    Remark?: string;
}

interface MKDYear {
    ManDriverKeyYearID?: number | string;
    ManDriverKeyID: number | string;
    KeyYear: number | string;
    KeyAmount: number;
}

interface MKDFile {
    FileName?: string;
    fileName?: string;
    FileUpload: string;
}

interface MasterKey {
    MasterId: number | string;
    KeyManID?: number | string;
    KeyManName: string;
}

interface MappedSubItem {
    id: string;
    definition: string;
    coefficient: number;
    remark: string;
    years: Record<number, number>;
    yearIds: Record<number, string>;
}

interface HistoryApproveDetailClientProps {
    mkdId: string;
    token: string;
    currentUser: CurrentUser | null;
    initialData: {
        header: MKDHeader;
        keys: MKDKey[];
        years: MKDYear[];
        files: MKDFile[];
    };
    masterKeys: MasterKey[];
}

export default function HistoryApproveDetailClient({ mkdId, token, currentUser, initialData, masterKeys }: HistoryApproveDetailClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'MANPOWER' | 'SUMMARY' | 'FILES' | 'NOTE'>('MANPOWER');

    // Header Data
    const header = initialData.header || {};
    const initialKeys = useMemo(() => initialData.keys || [], [initialData.keys]);
    const initialYears = useMemo(() => initialData.years || [], [initialData.years]);
    const files = initialData.files || [];

    const effectiveYear = header.EffectiveYear || 0;
    


    const allYears = useMemo(() => {
        const years = Array.from(new Set(initialYears.map((y: MKDYear) => Number(y.KeyYear))));
        return years.sort((a, b) => a - b);
    }, [initialYears]);

    const mkdData = useMemo(() => {
        const keys = initialKeys;
        const years = initialYears;
        const mainKeys = keys.filter(k => !k.ParentID || k.ParentID === 0);
        
        return mainKeys.map((mk: MKDKey) => {
            const isUniform = mk.KeyType === 2;
            const subKeys = keys.filter(sk => sk.ParentID === mk.ManDriverKeyID);
            
            const mainYears: Record<number, number> = {};
            if (isUniform || subKeys.length === 0) {
                const yrData = years.filter(y => y.ManDriverKeyID === mk.ManDriverKeyID);
                allYears.forEach(y => {
                    const yearRecord = yrData.find(sy => Number(sy.KeyYear) === y);
                    mainYears[y] = yearRecord?.KeyAmount || 0;
                });
            }

            const mappedSubItems = subKeys.map((sk: MKDKey) => {
                const skYears = years.filter(y => y.ManDriverKeyID === sk.ManDriverKeyID);
                const yearMap: Record<number, number> = {};
                const yearIdMap: Record<number, string> = {};
                allYears.forEach(y => {
                    const yearRecord = skYears.find(sy => Number(sy.KeyYear) === y);
                    yearMap[y] = yearRecord?.KeyAmount || 0;
                    yearIdMap[y] = (yearRecord?.ManDriverKeyYearID || 0).toString();
                });
                return { 
                    id: sk.ManDriverKeyID.toString(), 
                    definition: sk.Definition || '', 
                    coefficient: sk.Coefficient || 1, 
                    remark: sk.Remark || '', 
                    years: yearMap,
                    yearIds: yearIdMap
                };
            });

            if (!isUniform) {
                allYears.forEach(y => {
                    mainYears[y] = mappedSubItems.reduce((acc, curr) => acc + ((curr.years[y] || 0) * (Number(curr.coefficient) || 1)), 0);
                });
            }

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

    const getStatusColor = (statusName?: string) => {
        if (!statusName) return "text-blue-800";
        const lower = statusName.toLowerCase();
        if (lower.includes("อนุมัติแล้ว") || lower.includes("approved")) return "text-green-600";
        if (lower.includes("รออนุมัติ") || lower.includes("pending")) return "text-orange-500";
        if (lower.includes("ยกเลิก") || lower.includes("reject") || lower.includes("ไม่อนุมัติ") || lower.includes("cancel")) return "text-red-600";
        if (lower.includes("ร่าง") || lower.includes("draft")) return "text-slate-500";
        return "text-blue-800"; // Default
    };

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
        if (year > effectiveYear) label += " F";
        if (year === effectiveYear) label += " E";
        return label;
    };

    const handleExportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Approved Manpower Key Driver Summary');
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
            saveAs(blob, `MKD_Approved_${header.RequestNo}_${dayjs().format('YYYYMMDD')}.xlsx`);
        } catch {
            toast.error("Export failed");
        }
    };

    return (
        <div className="space-y-4">
            <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 shadow-lg py-2">
                <CardContent>
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-white mb-0">Manpower Key Driver (Approved)</h1>
                        <span className="bg-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md inline-flex items-center gap-2 border-2 border-white/50">
                            <span className="text-slate-500 font-bold tracking-wide text-xs">STATUS : </span> 
                            <span className={`font-black tracking-wide ${getStatusColor(header.StatusName)}`}>
                                {header.StatusName || '-'}
                            </span>
                        </span>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-x-6 gap-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 flex-1 w-full">
                    <div className="md:col-span-2">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block text-nowrap">Request No.</Label>
                        <Input value={header.RequestNo || '-'} readOnly className="bg-gray-50 border-gray-200 font-medium text-blue-900 shadow-inner" />
                    </div>
                    <div className="md:col-span-2">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">Date</Label>
                        <Input value={dayjs(header.RequestDate).format('DD/MM/YYYY')} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                    </div>
                    <div className="md:col-span-2">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block text-nowrap">Org Unit Code</Label>
                        <Input value={header.OrgUnitNo || '-'} readOnly className="bg-gray-50 border-gray-200 shadow-inner" />
                    </div>
                    <div className="md:col-span-6">
                        <Label className="text-sm font-semibold text-gray-700 mb-1 block">หน่วยงาน (OrgUnit)</Label>
                        <Input value={header.OrgUnitName || header.UnitName || '-'} readOnly className="bg-gray-50 border-gray-200 shadow-inner w-full" />
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0 justify-end h-[40px]">
                    <Button variant="outline" className="text-slate-600 bg-white hover:bg-slate-50 border-slate-300 font-medium min-w-max shadow-sm transition-all h-full" onClick={() => router.back()}>
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
                                onClick={() => setActiveTab(tab.id as 'MANPOWER' | 'SUMMARY' | 'FILES' | 'NOTE')}
                                className={`pb-3 px-4 font-semibold text-sm transition-all relative whitespace-nowrap flex items-center gap-2
                                    ${isActive ? "text-blue-700" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-t-lg"}`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                                {tab.label}
                                {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-blue-600 rounded-t-md shadow-sm"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-[400px] overflow-hidden">
                {activeTab === 'MANPOWER' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                        </div>
                        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-md bg-white">
                            <Table className="w-full text-[12px] table-fixed border-collapse">
                                <TableHeader className="bg-slate-100 border-b border-slate-200">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[40px]"></TableHead>
                                        <TableHead className="font-bold text-slate-800 min-w-[180px]">Manpower Key Driver</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l border-slate-200 w-[80px]">Unit</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l border-slate-200 w-[80px]">Type</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l border-slate-200 min-w-[150px]">Definition</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l border-slate-200 w-[100px]">Coefficient</TableHead>
                                        <TableHead className="font-bold text-slate-800 text-center border-l border-slate-200 w-[90px]">Weight(%)</TableHead>
                                        {allYears.map(y => (
                                            <TableHead key={y} className={`font-bold text-right border-l border-slate-200 w-[90px] whitespace-nowrap leading-tight ${getYearColor(y)}`}>
                                                {getYearLabel(y)}
                                            </TableHead>
                                        ))}
                                        <TableHead className="font-bold text-slate-800 border-l border-slate-200 min-w-[150px]">Remark</TableHead>
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
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`rounded-sm font-bold text-[10px] px-1.5 uppercase tracking-wide border ${
                                                            driver.type === 'Index' 
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }`}
                                                    >
                                                        {driver.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                                <TableCell className="text-center font-bold border-l border-slate-100">{driver.weight}</TableCell>
                                                {allYears.map(y => (
                                                    <TableCell key={y} className={`text-right font-semibold border-l border-slate-100 ${getYearColor(y)}`}>
                                                        {(driver.mainYears[y] || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="border-l border-slate-100"></TableCell>
                                            </TableRow>

                                            {driver.subItems.map((sk: MappedSubItem) => (
                                                <TableRow key={sk.id} className="bg-white hover:bg-slate-50 transition-colors">
                                                    <TableCell></TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    <TableCell className="border-l border-slate-100">{sk.definition}</TableCell>
                                                    <TableCell className="text-right border-l border-slate-100">{sk.coefficient}</TableCell>
                                                    <TableCell className="border-l border-slate-100"></TableCell>
                                                    {allYears.map(y => (
                                                        <TableCell key={y} className={`text-right border-l border-slate-100 ${getYearColor(y)}`}>
                                                            {(sk.years[y] || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="border-l border-slate-100 truncate max-w-[150px]" title={sk.remark}>{sk.remark}</TableCell>
                                                </TableRow>
                                            ))}

                                            {driver.type === 'Index' && driver.subItems.length > 0 && (
                                                <TableRow className="bg-[#f1e8e1]">
                                                    <TableCell colSpan={7}></TableCell>
                                                    {allYears.map(y => {
                                                        const sum = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                                        return (
                                                            <TableCell key={y} className={`text-right font-bold border-l border-white/50 ${getYearColor(y)}`}>
                                                                {sum.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell colSpan={1} className="border-l border-white/50"></TableCell>
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
                        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-md bg-white">
                            <Table className="w-full text-[12px] table-fixed border-collapse">
                                <TableHeader className="bg-slate-100 border-b border-slate-200">
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
                                                sumMap[y] = driver.subItems.reduce((acc: number, curr: MappedSubItem) => acc + ((curr.years[y] || 0) * (curr.coefficient || 1)), 0);
                                            });
                                        }
                                        return (
                                            <TableRow key={driver.id} className="hover:bg-blue-50/30">
                                                <TableCell className="font-bold text-blue-800">{driver.name}</TableCell>
                                                <TableCell className="text-center border-l font-medium border-slate-100">{driver.unit}</TableCell>
                                                <TableCell className="text-center border-l font-medium border-slate-100">{driver.weight}</TableCell>
                                                {allYears.map(y => (
                                                    <TableCell key={y} className={`text-right border-l font-semibold border-slate-100 ${getYearColor(y)}`}>
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
                    <div className="animate-in fade-in duration-300 w-[800px]">
                        <div className="flex justify-between items-center mb-6">
                        </div>
                        
                        <div className="max-h-[calc(100vh-380px)] overflow-y-auto overflow-x-hidden border border-slate-200 rounded-md bg-white">
                            <Table className="w-full text-[13px] table-fixed border-collapse">
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center font-bold text-slate-800">NO</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l min-w-[300px]">Name</TableHead>
                                        <TableHead className="font-bold text-slate-800 border-l text-center w-[120px]">File</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {files.map((file: MKDFile, idx: number) => {
                                        // const ext = file.FileName?.split('.').pop()?.toUpperCase() || file.fileName?.split('.').pop()?.toUpperCase() || 'PDF';
                                        return (
                                            <TableRow key={idx} className="hover:bg-slate-50/50">
                                                <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                                                <TableCell className="border-l font-medium">{file.FileName || file.fileName}</TableCell>
                                                <TableCell className="border-l text-center">
                                                    <Button variant="ghost" className="h-auto p-2 hover:bg-blue-50 flex flex-col items-center justify-center space-y-1 mx-auto" onClick={() => window.open(`/api/files-proxy?path=${effectiveYear}/${file.FileUpload}`, '_blank')}>
                                                        <FileText className="w-6! h-6! text-blue-500" />
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
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 shadow-inner text-left">
                            <textarea
                                className="w-full bg-white border-0 flex min-h-[200px] p-4 text-slate-700 disabled:opacity-80"
                                placeholder="Enter any additional notes here..."
                                value={initialData.header?.Remark || initialData.header?.Note || ''}
                                disabled={true}
                                maxLength={500}
                            />
                            <div className="text-[11px] text-slate-500 mt-1 pl-1">
                                *Max Length 500 Letters : {500 - (initialData.header?.Remark?.length || initialData.header?.Note?.length || 0)} remaining
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
