'use client';

import { getLocalText } from '@/utils/security';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    App,
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tabs,
    Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Download, FileSpreadsheet, Plus, Search, Upload } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import ExcelJS from 'exceljs';
import Main from '@/components/layout/main';
import { saveExcelFile } from '@/utils/fileDownload';
import {
    type CostPayload,
    type CostRecord,
    deleteCostRecord,
    exportCostRecords,
    getCostRecords,
    getCostLevelGroupOptions,
    getCostTemplateMeta,
    importCostRecords,
    type LevelGroupOption,
    updateCostRecord,
    upsertCostRecord
} from '@/services/costService';
import { fetchAllUnits } from '@/services/userRightService';

const { Text } = Typography;

interface CostFormValues {
    orgUnitNo: string;
    levelGroupNo: string;
    note: string;
    cost: number;
}

interface CostRow extends CostRecord {
    _rowKey: string;
}

interface UnitOption {
    value: string;
    label: string;
}

interface LevelOption {
    value: string;
    label: string;
}

const DEFAULT_EFFECTIVE_DATE = dayjs();
const DEFAULT_TEMPLATE_HEADERS = ['OrgUnitNo', 'LevelGroupNo', 'EffectiveDate', 'Note', 'Cost'];
const requiredLabel = (text: string) => (
    <span>
        {text} <span style={{ color: '#ff4d4f' }}>*</span>
    </span>
);

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return getLocalText('auth_token') || '';
}

const cleanUnitText = (text: string): string => text.replace(/^[A-Za-z0-9_-]+\s+/, '').trim();

const normalizeHeader = (value: unknown): string =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\s_\-\/]+/g, '');

const unwrapCellValue = (value: unknown): unknown => {
    if (value && typeof value === 'object') {
        const asResult = value as { result?: unknown; text?: unknown; richText?: Array<{ text?: string }> };
        if (asResult.result !== undefined) return asResult.result;
        if (asResult.text !== undefined) return asResult.text;
        if (Array.isArray(asResult.richText)) {
            return asResult.richText.map((part) => part.text || '').join('');
        }
    }
    return value;
};

const toText = (value: unknown): string => String(unwrapCellValue(value) ?? '').trim();

const toCostNumber = (value: unknown): number => {
    const normalized = toText(value).replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
};

const toExcelDateText = (value: unknown): string => {
    const raw = unwrapCellValue(value);

    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return dayjs(raw).format('YYYY-MM-DD');
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return dayjs('1899-12-30').add(raw, 'day').format('YYYY-MM-DD');
    }

    const text = String(raw || '').trim();
    if (!text) return '';

    const parsed = dayjs(text);
    if (!parsed.isValid()) return '';
    return parsed.format('YYYY-MM-DD');
};

const isValidDateOnly = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) === value;
};

const toPayloadFromRecord = (record: CostRecord): CostPayload => ({
    orgUnitNo: String(record.OrgUnitNo || '').trim(),
    levelGroupNo: String(record.LevelGroupNo || '').trim(),
    effectiveDate: dayjs(record.EffectiveDate).format('YYYY-MM-DD'),
    note: String(record.Note || '').trim(),
    cost: Number(record.Cost || 0)
});

const normalizeCostRows = (raw: unknown): CostRow[] => {
    if (!Array.isArray(raw)) return [];

    const duplicateCount = new Map<string, number>();

    return raw.map((item) => {
        const row = item as Record<string, unknown>;
        const normalized: CostRecord = {
            OrgUnitNo: toText(row.OrgUnitNo),
            LevelGroupNo: toText(row.LevelGroupNo),
            EffectiveDate: toExcelDateText(row.EffectiveDate),
            Note: toText(row.Note),
            Cost: Number(toCostNumber(row.Cost) || 0),
            LevelGroupName: toText(row.LevelGroupName)
        };

        const baseKey = `${normalized.OrgUnitNo}|${normalized.LevelGroupNo}|${normalized.EffectiveDate}|${normalized.Cost}`;
        const currentCount = (duplicateCount.get(baseKey) || 0) + 1;
        duplicateCount.set(baseKey, currentCount);

        return {
            ...normalized,
            _rowKey: `${baseKey}|${currentCount}`
        };
    });
};

function CostContent() {
    const { notification, message: messageApi } = App.useApp();
    const [form] = Form.useForm<CostFormValues>();
    const token = getToken();

    const [activeTab, setActiveTab] = useState('cost');

    const [effectiveDate, setEffectiveDate] = useState<Dayjs>(DEFAULT_EFFECTIVE_DATE);

    const [rows, setRows] = useState<CostRow[]>([]);
    const [loadingRows, setLoadingRows] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
    const [levelOptions, setLevelOptions] = useState<LevelOption[]>([]);
    const [loadingLevelOptions, setLoadingLevelOptions] = useState(false);
    const [selectedOrgUnitNo, setSelectedOrgUnitNo] = useState<string>('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<CostRow | null>(null);
    const [saving, setSaving] = useState(false);

    const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);

    const [exportEffectiveDate, setExportEffectiveDate] = useState<Dayjs>(DEFAULT_EFFECTIVE_DATE);
    const [exportingExcel, setExportingExcel] = useState(false);
    const tableAreaRef = useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] = useState(320);
    const selectNumberOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        window.setTimeout(() => event.target.select(), 0);
    };

    const fetchCostData = useCallback(async (date: Dayjs) => {
        setLoadingRows(true);
        try {
            const queryDate = date.format('YYYY-MM-DD');
            const res = await getCostRecords(queryDate, queryDate, token);
            if (res?.success) {
                setRows(normalizeCostRows(res.data));
            } else {
                setRows([]);
                messageApi.error(res?.message || 'ไม่สามารถโหลดข้อมูล Cost ได้');
            }
        } catch (error) {
            console.error('Failed to fetch cost rows:', error);
            setRows([]);
            messageApi.error('ไม่สามารถโหลดข้อมูล Cost ได้');
        } finally {
            setLoadingRows(false);
        }
    }, [messageApi, token]);

    useEffect(() => {
        const loadUnits = async () => {
            const unitsData = await fetchAllUnits(token);
            if (!Array.isArray(unitsData)) return;

            setUnitOptions(
                unitsData
                    .map((u: Record<string, unknown>) => ({
                        value: String(u.OrgUnitNo || u.id || ''),
                        label: cleanUnitText(String(u.UnitText || u.unitText || u.name || u.OrgUnitNo || u.id || ''))
                    }))
                    .filter((option) => option.value && option.label)
            );
        };

        void loadUnits();
    }, [token]);

    const loadLevelOptions = useCallback(async (effectiveDate?: string) => {
        setLoadingLevelOptions(true);
        try {
            const res = await getCostLevelGroupOptions(effectiveDate, token);
            if (!res?.success || !Array.isArray(res.data)) {
                setLevelOptions([]);
                return;
            }

            const options = (res.data as LevelGroupOption[])
                .map((item) => ({
                    value: String(item.LevelGroupNo || '').trim(),
                    label: `${String(item.LevelGroupNo || '').trim()} - ${String(item.LevelGroupName || '').trim()}`
                }))
                .filter((item) => item.value && item.label)
                .sort((a, b) => a.value.localeCompare(b.value, 'th'));

            setLevelOptions(options);
        } catch (error) {
            console.error('Failed to load level group options:', error);
            setLevelOptions([]);
        } finally {
            setLoadingLevelOptions(false);
        }
    }, [token]);

    useEffect(() => {
        if (!isModalOpen) return;
        void loadLevelOptions(effectiveDate.format('YYYY-MM-DD'));
    }, [isModalOpen, effectiveDate, loadLevelOptions]);

    useEffect(() => {
        const updateTableHeight = () => {
            if (!tableAreaRef.current) return;
            const rect = tableAreaRef.current.getBoundingClientRect();
            // Reserve room for pagination and bottom breathing space.
            const availableHeight = Math.floor(window.innerHeight - rect.top - 120);
            setTableScrollY(Math.max(220, availableHeight));
        };

        const raf = window.requestAnimationFrame(updateTableHeight);
        window.addEventListener('resize', updateTableHeight);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateTableHeight);
        };
    }, [rows.length, selectedOrgUnitNo, activeTab]);

    const handleSearchCost = async () => {
        setHasSearched(true);
        await fetchCostData(effectiveDate);
    };

    const openAddModal = () => {
        setEditingRow(null);
        form.setFieldsValue({
            orgUnitNo: selectedOrgUnitNo || '',
            levelGroupNo: '',
            note: '',
            cost: 0
        });
        setIsModalOpen(true);
    };

    const openEditModal = (record: CostRow) => {
        setEditingRow(record);
        form.setFieldsValue({
            orgUnitNo: record.OrgUnitNo,
            levelGroupNo: record.LevelGroupNo,
            note: record.Note || '',
            cost: Number(record.Cost || 0)
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRow(null);
        form.resetFields();
    };

    const handleSaveCost = async () => {
        let values: CostFormValues;

        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        const nextPayload: CostPayload = {
            orgUnitNo: String(values.orgUnitNo || '').trim(),
            levelGroupNo: String(values.levelGroupNo || '').trim(),
            effectiveDate: effectiveDate.format('YYYY-MM-DD'),
            note: String(values.note || '').trim(),
            cost: Number(values.cost || 0)
        };

        if (!nextPayload.orgUnitNo || !nextPayload.levelGroupNo) {
            messageApi.warning('กรุณากรอก หน่วยงาน และ ระดับ');
            return;
        }

        if (!nextPayload.note) {
            messageApi.warning('กรุณาระบุ ค่าใช้จ่าย');
            return;
        }

        if (!isValidDateOnly(nextPayload.effectiveDate)) {
            messageApi.warning('รูปแบบ EffectiveDate ไม่ถูกต้อง');
            return;
        }

        setSaving(true);
        try {
            const res = editingRow
                ? await updateCostRecord(toPayloadFromRecord(editingRow), nextPayload, token)
                : await upsertCostRecord(nextPayload, token);

            if (res?.success) {
                notification.success({
                    title: editingRow ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ',
                    description: editingRow ? 'ปรับปรุงข้อมูล Cost เรียบร้อยแล้ว' : 'บันทึกข้อมูล Cost เรียบร้อยแล้ว'
                });
                closeModal();
                if (hasSearched) {
                    await fetchCostData(effectiveDate);
                }
            } else {
                notification.error({
                    title: 'ไม่สามารถบันทึกข้อมูลได้',
                    description: res?.message || 'เกิดข้อผิดพลาด'
                });
            }
        } catch (error) {
            console.error('Failed to save cost row:', error);
            notification.error({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกข้อมูลได้' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCost = async (record: CostRow) => {
        try {
            const res = await deleteCostRecord(toPayloadFromRecord(record), token);
            if (res?.success) {
                notification.success({ title: 'ลบข้อมูลสำเร็จ', description: 'ลบรายการ Cost เรียบร้อยแล้ว' });
                if (hasSearched) {
                    await fetchCostData(effectiveDate);
                }
            } else {
                notification.error({
                    title: 'ลบข้อมูลไม่สำเร็จ',
                    description: res?.message || 'ไม่สามารถลบข้อมูลได้'
                });
            }
        } catch (error) {
            console.error('Failed to delete cost row:', error);
            notification.error({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบข้อมูลได้' });
        }
    };

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true);
        try {
            const res = await getCostTemplateMeta(token);
            const headers = Array.isArray(res?.data?.headers) && res.data.headers.length > 0
                ? (res.data.headers as string[])
                : DEFAULT_TEMPLATE_HEADERS;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Cost Template');

            worksheet.columns = headers.map((header) => ({ header, key: header, width: 24 }));
            worksheet.addRow({
                OrgUnitNo: '10000000',
                LevelGroupNo: '1001',
                EffectiveDate: dayjs().format('YYYY-MM-DD'),
                Note: 'example note',
                Cost: 0
            });

            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
            });

            const buffer = await workbook.xlsx.writeBuffer();
            await saveExcelFile(buffer, 'cost_template.xlsx');

            const tableName = String(res?.data?.table || '-');
            const mappings = res?.data?.mappings || {};
            notification.success({
                title: 'ดาวน์โหลด Template สำเร็จ',
                description: `ระบบอิงตาราง ${tableName} (${mappings.OrgUnitNo || 'OrgUnitNo'}, ${mappings.LevelGroupNo || 'LevelGroupNo'}, ${mappings.EffectiveDate || 'EffectiveDate'}, ${mappings.Note || 'Note'}, ${mappings.Cost || 'Cost'})`
            });
        } catch (error) {
            console.error('Failed to download template:', error);
            messageApi.error('ไม่สามารถดาวน์โหลด Template ได้');
        } finally {
            setDownloadingTemplate(false);
        }
    };

    const handleImport = async () => {
        if (!selectedImportFile) {
            messageApi.warning('กรุณาเลือกไฟล์ Excel ก่อนนำเข้า');
            return;
        }

        setImporting(true);

        try {
            const buffer = await selectedImportFile.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                messageApi.error('ไม่พบ worksheet ในไฟล์ที่อัปโหลด');
                setImporting(false);
                return;
            }

            const headerRow = worksheet.getRow(1);
            const headerIndexMap = new Map<string, number>();
            for (let col = 1; col <= headerRow.cellCount; col += 1) {
                const key = normalizeHeader(headerRow.getCell(col).value);
                if (!key) continue;
                headerIndexMap.set(key, col);
            }

            const orgCol = headerIndexMap.get(normalizeHeader('OrgUnitNo'));
            const levelCol = headerIndexMap.get(normalizeHeader('LevelGroupNo'));
            const dateCol = headerIndexMap.get(normalizeHeader('EffectiveDate'));
            const noteCol = headerIndexMap.get(normalizeHeader('Note'));
            const costCol = headerIndexMap.get(normalizeHeader('Cost'));

            if (!orgCol || !levelCol || !dateCol || !costCol) {
                messageApi.error('Template ไม่ถูกต้อง: ต้องมีหัวคอลัมน์ OrgUnitNo, LevelGroupNo, EffectiveDate, ค่าใช้จ่าย (Note), Cost');
                setImporting(false);
                return;
            }

            const parsedRows: CostPayload[] = [];
            const errors: string[] = [];

            for (let rowNo = 2; rowNo <= worksheet.rowCount; rowNo += 1) {
                const row = worksheet.getRow(rowNo);

                const orgUnitNo = toText(row.getCell(orgCol).value);
                const levelGroupNo = toText(row.getCell(levelCol).value);
                const effectiveDate = toExcelDateText(row.getCell(dateCol).value);
                const note = noteCol ? toText(row.getCell(noteCol).value) : '';
                const cost = toCostNumber(row.getCell(costCol).value);

                const isCompletelyEmpty = !orgUnitNo && !levelGroupNo && !effectiveDate && Number.isNaN(cost);
                if (isCompletelyEmpty) continue;

                if (!orgUnitNo || !levelGroupNo || !effectiveDate || !isValidDateOnly(effectiveDate) || !note || Number.isNaN(cost)) {
                    errors.push(`แถว ${rowNo}: ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง`);
                    continue;
                }

                parsedRows.push({
                    orgUnitNo,
                    levelGroupNo,
                    effectiveDate,
                    note,
                    cost: Number(cost)
                });
            }

            if (parsedRows.length === 0) {
                messageApi.warning('ไม่พบข้อมูลที่นำเข้าได้ในไฟล์นี้');
                setImporting(false);
                return;
            }

            if (errors.length > 0) {
                notification.error({
                    title: 'ไฟล์นำเข้ามีข้อมูลไม่ถูกต้อง',
                    description: errors.slice(0, 5).join(' | ')
                });
                setImporting(false);
                return;
            }

            const res = await importCostRecords(parsedRows, token);
            if (res?.success) {
                notification.success({
                    title: 'นำเข้าข้อมูลสำเร็จ',
                    description: `นำเข้า ${res.data?.total || parsedRows.length} รายการ (เพิ่มใหม่ ${res.data?.inserted || 0} / อัปเดต ${res.data?.updated || 0})`
                });
                setSelectedImportFile(null);
                if (hasSearched) {
                    await fetchCostData(effectiveDate);
                }
            } else {
                notification.error({
                    title: 'นำเข้าข้อมูลไม่สำเร็จ',
                    description: res?.message || 'เกิดข้อผิดพลาดระหว่างนำเข้า'
                });
            }
        } catch (error) {
            console.error('Failed to import cost excel:', error);
            messageApi.error('ไม่สามารถนำเข้าข้อมูลได้');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadExportExcel = async () => {
        setExportingExcel(true);
        try {
            const queryDate = exportEffectiveDate.format('YYYY-MM-DD');
            const response = await exportCostRecords(
                queryDate,
                queryDate,
                token
            );

            if (!response?.success) {
                messageApi.error(response?.message || 'ไม่สามารถโหลดข้อมูลสำหรับ Export ได้');
                setExportingExcel(false);
                return;
            }

            const exportRows = normalizeCostRows(response.data);
            if (!exportRows.length) {
                messageApi.info('ไม่พบข้อมูลสำหรับ Export');
                setExportingExcel(false);
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Cost Export');

            worksheet.columns = [
                { header: 'OrgUnitNo', key: 'OrgUnitNo', width: 20 },
                { header: 'LevelGroupNo', key: 'LevelGroupNo', width: 18 },
                { header: 'EffectiveDate', key: 'EffectiveDate', width: 18 },
                { header: 'Note', key: 'Note', width: 28 },
                { header: 'Cost', key: 'Cost', width: 16 }
            ];

            exportRows.forEach((row) => {
                worksheet.addRow({
                    OrgUnitNo: row.OrgUnitNo,
                    LevelGroupNo: row.LevelGroupNo,
                    EffectiveDate: row.EffectiveDate,
                    Note: row.Note || '',
                    Cost: Number(row.Cost || 0)
                });
            });

            worksheet.getRow(1).eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
            });

            const costCol = worksheet.getColumn('Cost');
            costCol.numFmt = '#,##0.00';

            const buffer = await workbook.xlsx.writeBuffer();
            await saveExcelFile(buffer, `cost_export_${exportEffectiveDate.format('YYYYMMDD')}.xlsx`);
            notification.success({ title: 'Export สำเร็จ', description: 'ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว' });
        } catch (error) {
            console.error('Failed to export excel:', error);
            messageApi.error('ไม่สามารถ Export ไฟล์ Excel ได้');
        } finally {
            setExportingExcel(false);
        }
    };

    const unitLabelMap = useMemo(
        () => new Map(unitOptions.map((option) => [option.value, option.label])),
        [unitOptions]
    );
    const unitOptionsWithCode = useMemo(
        () => unitOptions.map((option) => ({
            ...option,
            label: option.label ? `${option.value} - ${option.label}` : option.value
        })),
        [unitOptions]
    );

    const filteredRows = useMemo(
        () => rows.filter((row) => !selectedOrgUnitNo || row.OrgUnitNo === selectedOrgUnitNo),
        [rows, selectedOrgUnitNo]
    );

    const columns: ColumnsType<CostRow> = [
        {
            title: 'หน่วยงาน',
            dataIndex: 'OrgUnitNo',
            key: 'OrgUnitNo',
            width: '14%',
            render: (value: CostRecord['OrgUnitNo']) => <Text strong>{value || '-'}</Text>
        },
        {
            title: 'ชื่อหน่วยงาน',
            key: 'UnitName',
            width: '24%',
            ellipsis: true,
            render: (_, record) => unitLabelMap.get(record.OrgUnitNo) || '-'
        },
        {
            title: 'ชื่อลำดับชั้น',
            key: 'LevelGroupName',
            width: '16%',
            ellipsis: true,
            render: (_, record) => record.LevelGroupName || record.LevelGroupNo || '-'
        },
        {
            title: 'EffectiveDate',
            dataIndex: 'EffectiveDate',
            key: 'EffectiveDate',
            width: '12%',
            align: 'center'
        },
        {
            title: 'ค่าใช้จ่าย',
            dataIndex: 'Note',
            key: 'Note',
            width: '18%',
            ellipsis: true,
            render: (value: CostRecord['Note']) => value || '-'
        },
        {
            title: 'จำนวน',
            dataIndex: 'Cost',
            key: 'Cost',
            width: '12%',
            align: 'right',
            render: (value: CostRecord['Cost']) => Number(value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
        },
        {
            title: 'Action',
            key: 'action',
            width: '6%',
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm
                        title="ลบรายการนี้?"
                        okText="ลบ"
                        cancelText="ยกเลิก"
                        onConfirm={() => handleDeleteCost(record)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="w-full bg-slate-50 h-[calc(100vh-120px)] overflow-hidden">
            <div className="h-full flex flex-col p-4">
                <div className="rounded-xl bg-linear-to-r from-blue-700 to-blue-500 p-4 shadow-md mb-4 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="text-2xl" />
                        <h1 className="text-xl font-bold m-0 text-white">Cost Management</h1>
                    </div>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="cost-tabs flex-1 min-h-0"
                    items={[
                        {
                            key: 'cost',
                            label: (
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet size={18} />
                                    Cost
                                </div>
                            ),
                            children: (
                                <div className="flex flex-col gap-4 h-full min-h-0">
                                <Card className="shadow-sm border-slate-200" styles={{ body: { padding: '16px 20px' } }}>
                                    <div className="flex flex-wrap items-end gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">Effective Date</label>
                                            <DatePicker
                                                value={effectiveDate}
                                                onChange={(date) => setEffectiveDate(date || DEFAULT_EFFECTIVE_DATE)}
                                                format="YYYY-MM-DD"
                                                allowClear={false}
                                                className="w-[180px]"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 min-w-[420px]">
                                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">หน่วยงาน</label>
                                            <Select
                                                allowClear
                                                showSearch
                                                placeholder="เลือกหน่วยงาน"
                                                value={selectedOrgUnitNo || undefined}
                                                onChange={(value) => setSelectedOrgUnitNo(value || '')}
                                                options={unitOptionsWithCode}
                                                optionFilterProp="label"
                                            />
                                        </div>
                                        <Button
                                            type="primary"
                                            icon={<Search size={16} />}
                                            onClick={handleSearchCost}
                                            className="bg-blue-600 h-10 px-6 rounded-lg font-bold"
                                        >
                                            ค้นหา
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<Plus size={16} />}
                                            onClick={openAddModal}
                                            className="bg-emerald-600 h-10 px-6 rounded-lg font-bold"
                                        >
                                            เพิ่มรายการ
                                        </Button>
                                    </div>
                                </Card>

                                {hasSearched ? (
                                    <div ref={tableAreaRef} className="flex-1 min-h-0">
                                        <Table
                                            rowKey="_rowKey"
                                            columns={columns}
                                            dataSource={filteredRows}
                                            loading={loadingRows}
                                            pagination={{ pageSize: 20 }}
                                            tableLayout="fixed"
                                            scroll={{ x: '100%', y: tableScrollY }}
                                            className="modern-table"
                                            bordered
                                        />
                                    </div>
                                ) : (
                                    <Card className="shadow-sm border-slate-200">
                                        <Text type="secondary">กดปุ่มค้นหาเพื่อแสดงรายการข้อมูล</Text>
                                    </Card>
                                )}
                            </div>
                        )
                    },
                        {
                            key: 'import-export',
                            label: (
                                <div className="flex items-center gap-2">
                                    <Upload size={18} />
                                    นำเข้า / ส่งออก
                                </div>
                            ),
                            children: (
                                <div className="flex flex-col gap-4 py-2 overflow-auto pr-1">
                                <Card className="shadow-sm border-slate-200" styles={{ body: { padding: '16px 20px' } }}>
                                    <div className="flex flex-wrap gap-4 items-end">
                                        <Button
                                            type="primary"
                                            icon={<Download size={16} />}
                                            onClick={handleDownloadTemplate}
                                            loading={downloadingTemplate}
                                            className="bg-emerald-600 h-10 px-6 rounded-lg font-bold border-none"
                                        >
                                            ดาวน์โหลด Template Excel
                                        </Button>
                                        <div className="flex flex-col gap-1 min-w-[320px]">
                                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">Upload Excel</label>
                                            <input
                                                type="file"
                                                accept=".xlsx"
                                                onChange={(event) => setSelectedImportFile(event.target.files?.[0] || null)}
                                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-slate-200 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                        <Button
                                            type="primary"
                                            icon={<Upload size={16} />}
                                            onClick={handleImport}
                                            loading={importing}
                                            disabled={!selectedImportFile}
                                            className="bg-emerald-600 h-10 px-6 rounded-lg font-bold"
                                        >
                                            Upload และ Import
                                        </Button>
                                    </div>
                                </Card>

                                <Card className="shadow-sm border-slate-200" styles={{ body: { padding: '16px 20px' } }}>
                                    <div className="flex flex-wrap items-end gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">Effective Date</label>
                                            <DatePicker
                                                value={exportEffectiveDate}
                                                onChange={(date) => setExportEffectiveDate(date || DEFAULT_EFFECTIVE_DATE)}
                                                format="YYYY-MM-DD"
                                                allowClear={false}
                                                className="w-[180px]"
                                            />
                                        </div>
                                        <Button
                                            type="primary"
                                            icon={<Download size={16} />}
                                            onClick={handleDownloadExportExcel}
                                            loading={exportingExcel}
                                            className="bg-indigo-600 h-10 px-6 rounded-lg font-bold"
                                        >
                                            Export
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                            )
                        }
                    ]}
                />

                <Modal
                    title={editingRow ? 'แก้ไข Cost' : 'เพิ่ม Cost'}
                    open={isModalOpen}
                    onCancel={closeModal}
                    onOk={handleSaveCost}
                    okText={editingRow ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
                    cancelText="ยกเลิก"
                    okButtonProps={{ className: 'bg-blue-600 rounded-lg px-8', loading: saving }}
                    centered
                >
                <Form form={form} layout="vertical" className="pt-4" requiredMark={false}>
                    <Form.Item name="orgUnitNo" label={requiredLabel('หน่วยงาน')} rules={[{ required: true, message: 'กรุณาระบุ หน่วยงาน' }]}>
                        <Select
                            showSearch
                            placeholder="เลือกหน่วยงาน"
                            options={unitOptionsWithCode}
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item name="levelGroupNo" label={requiredLabel('ระดับ')} rules={[{ required: true, message: 'กรุณาระบุ ระดับ' }]}>
                        <Select
                            showSearch
                            loading={loadingLevelOptions}
                            placeholder="เลือกลำดับชั้น"
                            options={levelOptions}
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item name="note" label={requiredLabel('ค่าใช้จ่าย')} rules={[{ required: true, message: 'กรุณาระบุ ค่าใช้จ่าย' }]}>
                        <Input maxLength={200} placeholder="ระบุรายละเอียดค่าใช้จ่าย" />
                    </Form.Item>
                    <Form.Item name="cost" label={requiredLabel('จำนวน')} rules={[{ required: true, message: 'กรุณาระบุ จำนวน' }]}>
                        <InputNumber<number>
                            style={{ width: '100%' }}
                            min={0}
                            precision={2}
                            step={1000}
                            placeholder="0.00"
                            controls={false}
                            formatter={(value) => {
                                if (value === null || value === undefined || String(value) === '') return '';
                                const text = String(value);
                                const [integerPart, decimalPart] = text.split('.');
                                const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                return decimalPart !== undefined ? `${withCommas}.${decimalPart}` : withCommas;
                            }}
                            parser={(value) => (value ? value.replace(/,/g, '') : '') as unknown as number}
                            onFocus={selectNumberOnFocus}
                        />
                    </Form.Item>
                </Form>
                </Modal>

                <style jsx global>{`
                .cost-tabs .ant-tabs-nav {
                    border-bottom: 2px solid #f1f5f9 !important;
                    margin-bottom: 0 !important;
                }
                .cost-tabs .ant-tabs-tab {
                    padding: 16px 8px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                    font-size: 13px !important;
                }
                .cost-tabs .ant-tabs-ink-bar {
                    height: 3px !important;
                    background: #2563eb !important;
                }
                .modern-table .ant-table-thead > tr > th {
                    background: #f8fafc !important;
                    font-weight: 800 !important;
                    font-size: 11px !important;
                    text-transform: uppercase !important;
                    color: #64748b !important;
                    letter-spacing: 0.05em !important;
                    padding: 16px !important;
                }
                .cost-tabs.ant-tabs,
                .cost-tabs .ant-tabs-content-holder,
                .cost-tabs .ant-tabs-content,
                .cost-tabs .ant-tabs-tabpane {
                    height: 100%;
                }
            `}</style>
            </div>
        </div>
    );
}

export default function CostPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <CostContent />
            </App>
        </Main>
    );
}
