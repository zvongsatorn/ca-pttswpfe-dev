'use client';

import { getLocalText } from '@/utils/security';
import React, { useState } from 'react';
import { DatePicker, Button, Table, Card, Space, Typography, App } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { FileSpreadsheet } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import locale from 'antd/es/date-picker/locale/th_TH';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { exportPosition } from '@/services/mkdService';

dayjs.extend(buddhistEra);
dayjs.locale('th');

const { Title } = Typography;

const toText = (value: unknown): string => String(value ?? '').trim();

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return getLocalText('auth_token') || '';
}

const resolveUserContext = (currentUser: Record<string, unknown> | null | undefined) => {
    const selectedGroup = toText(getLocalText('selected_usergroup'));
    let employeeId = toText(currentUser?.employeeID || currentUser?.EmployeeID);
    let userGroupNo = selectedGroup;

    if (!userGroupNo) {
        userGroupNo = toText(currentUser?.userGroupNo || currentUser?.roleId);
    }

    if (!userGroupNo && Array.isArray(currentUser?.userGroups)) {
        const firstGroup = currentUser.userGroups[0] as Record<string, unknown> | undefined;
        userGroupNo = toText(firstGroup?.userGroupNo);
    }

    const userDataStr = getLocalText('user_data');
    if (userDataStr) {
        try {
            const userData = JSON.parse(userDataStr) as Record<string, unknown>;
            if (!employeeId) {
                employeeId = toText(userData.employeeID || userData.EmployeeID);
            }
            if (!userGroupNo) {
                userGroupNo = toText(userData.userGroupNo || userData.roleId);
            }
            if (!userGroupNo && Array.isArray(userData.userGroups)) {
                const firstGroup = userData.userGroups[0] as Record<string, unknown> | undefined;
                userGroupNo = toText(firstGroup?.userGroupNo);
            }
        } catch {
            // ignore parse failure and use current values
        }
    }

    return { employeeId, userGroupNo };
};

type ExportPositionValue = string | number | null | undefined;
type ExportPositionRow = Record<string, ExportPositionValue> & { key: string };

interface ExportPositionResponse {
    success?: boolean;
    message?: string;
    data?: Array<Record<string, ExportPositionValue>>;
}

function ExportPositionContent() {
    const { message, notification } = App.useApp();
    const token = getToken();
    const currentUser = getUserFromToken();
    const [date, setDate] = useState<dayjs.Dayjs | null>(dayjs());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ExportPositionRow[]>([]);
    const [columns, setColumns] = useState<ColumnsType<ExportPositionRow>>([]);

    const handleFetchData = async () => {
        if (!date) { message.warning('กรุณาเลือกวันที่'); return; }
        setLoading(true);
        try {
            const { employeeId, userGroupNo } = resolveUserContext((currentUser || null) as Record<string, unknown> | null);
            if (!employeeId || !userGroupNo) {
                message.warning('ไม่พบข้อมูลผู้ใช้งานหรือสิทธิ์กลุ่มผู้ใช้');
                setData([]);
                setColumns([]);
                return;
            }
            const res = await exportPosition({
                effDate: date.format('YYYY-MM-DD'),
                employeeId,
                userGroupNo,
                exportType: 2
            }, token) as ExportPositionResponse | null;

            if (res?.success) {
                const rows = Array.isArray(res.data) ? res.data : [];
                const dataWithKeys: ExportPositionRow[] = rows.map((item, index) => ({ ...item, key: `row-${index}` }));
                setData(dataWithKeys);
                if (rows.length > 0) {
                    const existingKeys = Object.keys(rows[0] || {});
                    const mapping: Record<string, string> = {
                        'ชื่อย่อหน่วยงาน': 'ชื่อย่อ', 'UnitAbbr': 'ชื่อย่อ',
                        'ชื่อหน่วยงาน': 'ชื่อหน่วยงาน', 'UnitName': 'ชื่อหน่วยงาน',
                        'BU': 'BU', 'BGNo': 'BU', 'BGName': 'BU'
                    };
                    const cols: ColumnsType<ExportPositionRow> = existingKeys.filter(key => key !== 'key').map(key => {
                        const baseCol: ColumnType<ExportPositionRow> = { title: mapping[key] || key, dataIndex: key, key, ellipsis: true, width: 180, className: 'text-[13px] font-medium' };
                        if (['OrgUnitID', 'UnitAbbr', 'UnitName', 'BGNo', 'ชื่อย่อหน่วยงาน', 'ชื่อหน่วยงาน', 'BU'].includes(key)) {
                            const uniqueValues = Array.from(new Set(rows.map((item) => item[key])))
                                .filter((v): v is string | number => v !== null && v !== undefined && v !== '')
                                .sort((a, b) => String(a).localeCompare(String(b)));
                            baseCol.filters = uniqueValues.map(v => ({ text: String(v), value: v }));
                            baseCol.onFilter = (value, record) => record[key] === value;
                            baseCol.filterSearch = true;
                        }
                        return baseCol;
                    });
                    setColumns(cols);
                    notification.success({ title: 'โหลดข้อมูลสำเร็จ', description: `พบข้อมูลทั้งหมด ${rows.length} รายการ` });
                } else {
                    message.info('ไม่พบข้อมูลในช่วงเวลาที่เลือก'); setColumns([]);
                }
            } else {
                message.error(res?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
            }
        } catch { message.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'); }
        finally { setLoading(false); }
    };

    const handleExportExcel = async () => {
        if (data.length === 0) { message.warning('ไม่มีข้อมูลสำหรับ Export'); return; }
        setLoading(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Position Data');
            const mapping: Record<string, string> = {
                'ชื่อย่อหน่วยงาน': 'ชื่อย่อ (UnitAbbr)', 'UnitAbbr': 'ชื่อย่อ (UnitAbbr)',
                'ชื่อหน่วยงาน': 'ชื่อหน่วยงาน (UnitName)', 'UnitName': 'ชื่อหน่วยงาน (UnitName)',
                'BU': 'BU (BGNo)', 'BGNo': 'BU (BGNo)', 'BGName': 'BU (BGNo)'
            };
            const excelCols = Object.keys(data[0]).filter(key => key !== 'key').map(key => ({ header: mapping[key] || key, key, width: 25 }));
            worksheet.columns = excelCols;
            worksheet.addRows(data);
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
            headerRow.height = 30;
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell!({ includeEmpty: true }, (cell) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) maxLength = columnLength;
                });
                column.width = Math.min(maxLength + 5, 50);
            });
            const buffer = await workbook.xlsx.writeBuffer();
            await saveExcelFile(buffer, `Position_Export_${date?.format('DDMMBBBB') || 'Data'}.xlsx`);
            notification.success({ title: 'Export สำเร็จ', description: 'ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว' });
        } catch { message.error('เกิดข้อผิดพลาดในการ Export Excel'); }
        finally { setLoading(false); }
    };

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="rounded-xl bg-linear-to-r from-blue-700 to-blue-500 p-4 shadow-md mb-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-2xl" />
                    <Title level={4} className="m-0 text-white!">Export ข้อมูล Position</Title>
                </div>
            </div>

            <Card className="mb-6 shadow-sm border-slate-200 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-end gap-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-bold text-xs uppercase tracking-wider pl-1">เลือกวันที่ (Effective Date)</label>
                        <DatePicker value={date} onChange={setDate} format="DD/MM/BBBB" locale={locale} size="large" className="w-[240px] rounded-lg" placeholder="วัน/เดือน/ปี" />
                    </div>
                    <Space size="middle">
                        <Button type="primary" icon={<SearchOutlined />} size="large" onClick={handleFetchData} loading={loading} className="bg-blue-600 hover:bg-blue-700 h-10 px-8 rounded-lg font-bold shadow-md shadow-blue-100">เรียกดูข้อมูล</Button>
                        <Button type="default" icon={<DownloadOutlined />} size="large" onClick={handleExportExcel} disabled={data.length === 0} className="h-10 px-8 rounded-lg font-bold border-emerald-500 text-emerald-600 hover:text-emerald-700 hover:border-emerald-600 hover:bg-emerald-50 transition-all flex items-center gap-2">EXPORT EXCEL</Button>
                    </Space>
                </div>
            </Card>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                <Table
                    columns={columns} dataSource={data} loading={loading} rowKey="key"
                    pagination={{ showSizeChanger: true, showTotal: (total) => `ค้นพบทั้งหมด ${total} รายการ`, defaultPageSize: 20, pageSizeOptions: ['10', '20', '50', '100'], placement: ['bottomCenter'] }}
                    bordered size="middle" scroll={{ x: columns.length * 180, y: 'calc(100vh - 480px)' }}
                    tableLayout="fixed"
                    className="modern-export-table" rowClassName={(_, index) => index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}
                />
            </div>

            <style jsx global>{`
                .modern-export-table .ant-table-thead > tr > th {
                    background-color: #f8fafc !important; color: #475569 !important; font-weight: 800 !important;
                    text-transform: uppercase !important; font-size: 11px !important; letter-spacing: 0.05em !important; padding: 16px 12px !important;
                }
                .modern-export-table .ant-table-tbody > tr > td { color: #334155 !important; }
            `}</style>
        </div>
    );
}

export default function ExportPositionPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <ExportPositionContent />
            </App>
        </Main>
    );
}
