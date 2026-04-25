'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
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
    Switch,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { FileCode2, Mountain } from 'lucide-react';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { fetchAllUnits } from '@/services/userRightService';
import {
    createLandscape,
    createLandscapeFormula,
    deleteLandscape,
    deleteLandscapeFormula,
    getLandscape,
    getLandscapeFormulaDefault,
    getLandscapeFormulas,
    updateLandscape,
    updateLandscapeFormula,
    type LandscapeFormulaPayload,
    type LandscapeFormulaRecord,
    type LandscapePayload,
    type LandscapeRecord
} from '@/services/landscapeService';

const { Text } = Typography;
const DEFAULT_END_DATE = '9999-12-31';
const REPORT7_FORMULA_KEY = 'REPORT7_SHAPE_GAP';

const FORMULA_FIELDS = [
    'q_4',
    'q_5',
    'q_6',
    'q_7',
    'q_total',
    'contract_out',
    'mp_vp',
    'mp_dm',
    'mp_sr',
    'mp_jr',
    'mp_total',
    'shape_vp',
    'shape_dm',
    'shape_sr',
    'shape_jr',
    'shape_total'
] as const;

type FormulaField = typeof FORMULA_FIELDS[number];

const SHAPE_TARGETS = ['vp', 'dm', 'sr', 'jr', 'total'] as const;
const GAP_TARGETS = ['vp', 'dm', 'sr', 'jr', 'total'] as const;

type ShapeTarget = typeof SHAPE_TARGETS[number];
type GapTarget = typeof GAP_TARGETS[number];

type ShapeRule =
    | { type: 'direct'; field: FormulaField }
    | {
        type: 'ratio_x_sum';
        numerator: FormulaField;
        denominator: FormulaField[];
        multiplier: FormulaField[];
    }
    | { type: 'sum'; fields: FormulaField[] };

type GapMetric = 'gap_vp' | 'gap_dm' | 'gap_sr' | 'gap_jr' | 'gap_total';

type GapRule =
    | {
        type: 'ratio';
        baseField: FormulaField;
        shapeField: FormulaField;
    }
    | {
        type: 'sum';
        fields: GapMetric[];
    };

type FormulaConfig = {
    shape: Record<ShapeTarget, ShapeRule>;
    gap: Record<GapTarget, GapRule>;
};

interface UnitOption {
    value: string;
    label: string;
}

interface LandscapeFormValues {
    orgUnitNo?: string;
    beginDate?: Dayjs;
    endDate?: Dayjs;
    vp?: number;
    dm?: number;
    sr?: number;
    jr?: number;
}

type ShapeRuleBuilderForm = {
    type?: ShapeRule['type'];
    field?: FormulaField;
    numerator?: FormulaField;
    denominator?: FormulaField[];
    multiplier?: FormulaField[];
    fields?: FormulaField[];
};

type GapRuleBuilderForm = {
    type?: GapRule['type'];
    baseField?: FormulaField;
    shapeField?: FormulaField;
    fields?: GapMetric[];
};

interface LandscapeFormulaFormValues {
    formulaKey?: string;
    formulaName?: string;
    beginDate?: Dayjs;
    endDate?: Dayjs;
    isActive?: boolean;
    shape?: Partial<Record<ShapeTarget, ShapeRuleBuilderForm>>;
    gap?: Partial<Record<GapTarget, GapRuleBuilderForm>>;
}

const FIELD_LABELS: Record<FormulaField, string> = {
    q_4: 'q_4 (14-15)',
    q_5: 'q_5 (11-13)',
    q_6: 'q_6 (9-10)',
    q_7: 'q_7 (8 ลงมา)',
    q_total: 'q_total (รวม)',
    contract_out: 'contract_out',
    mp_vp: 'mp_vp',
    mp_dm: 'mp_dm',
    mp_sr: 'mp_sr',
    mp_jr: 'mp_jr',
    mp_total: 'mp_total',
    shape_vp: 'shape_vp',
    shape_dm: 'shape_dm',
    shape_sr: 'shape_sr',
    shape_jr: 'shape_jr',
    shape_total: 'shape_total'
};

const SHAPE_FIELD_OPTIONS = (['shape_vp', 'shape_dm', 'shape_sr', 'shape_jr', 'shape_total'] as FormulaField[]).map((field) => ({
    value: field,
    label: FIELD_LABELS[field]
}));

const ALL_FIELD_OPTIONS = FORMULA_FIELDS.map((field) => ({
    value: field,
    label: FIELD_LABELS[field]
}));

const SHAPE_RULE_TYPE_OPTIONS = [
    { value: 'direct', label: 'Direct' },
    { value: 'ratio_x_sum', label: 'Ratio x Sum' },
    { value: 'sum', label: 'Sum' }
] as const;

const GAP_RULE_TYPE_OPTIONS = [
    { value: 'ratio', label: 'Ratio' },
    { value: 'sum', label: 'Sum' }
] as const;

const GAP_METRIC_OPTIONS: Array<{ value: GapMetric; label: string }> = [
    { value: 'gap_vp', label: 'gap_vp' },
    { value: 'gap_dm', label: 'gap_dm' },
    { value: 'gap_sr', label: 'gap_sr' },
    { value: 'gap_jr', label: 'gap_jr' },
    { value: 'gap_total', label: 'gap_total' }
];

const DEFAULT_FORMULA_CONFIG: FormulaConfig = {
    shape: {
        vp: { type: 'direct', field: 'q_4' },
        dm: {
            type: 'ratio_x_sum',
            numerator: 'mp_dm',
            denominator: ['mp_dm', 'mp_sr', 'mp_jr'],
            multiplier: ['q_5', 'q_6', 'q_7']
        },
        sr: {
            type: 'ratio_x_sum',
            numerator: 'mp_sr',
            denominator: ['mp_dm', 'mp_sr', 'mp_jr'],
            multiplier: ['q_5', 'q_6', 'q_7']
        },
        jr: {
            type: 'ratio_x_sum',
            numerator: 'mp_jr',
            denominator: ['mp_dm', 'mp_sr', 'mp_jr'],
            multiplier: ['q_5', 'q_6', 'q_7']
        },
        total: {
            type: 'sum',
            fields: ['shape_vp', 'shape_dm', 'shape_sr', 'shape_jr']
        }
    },
    gap: {
        vp: { type: 'ratio', baseField: 'q_4', shapeField: 'shape_vp' },
        dm: { type: 'ratio', baseField: 'q_5', shapeField: 'shape_dm' },
        sr: { type: 'ratio', baseField: 'q_6', shapeField: 'shape_sr' },
        jr: { type: 'ratio', baseField: 'q_7', shapeField: 'shape_jr' },
        total: { type: 'sum', fields: ['gap_vp', 'gap_dm', 'gap_sr', 'gap_jr'] }
    }
};

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

const toLandscapePayload = (record: LandscapeRecord): LandscapePayload => ({
    orgUnitNo: record.OrgUnitNo || null,
    beginDate: record.BeginDate,
    endDate: record.EndDate || DEFAULT_END_DATE,
    vp: Number(record.vp),
    dm: Number(record.dm),
    sr: Number(record.sr),
    jr: Number(record.jr)
});

const mapLandscapeRecord = (item: Record<string, unknown>): LandscapeRecord => ({
    OrgUnitNo: item.OrgUnitNo ? String(item.OrgUnitNo).trim() : null,
    BeginDate: String(item.BeginDate || ''),
    EndDate: String(item.EndDate || DEFAULT_END_DATE),
    vp: Number(item.vp || 0),
    dm: Number(item.dm || 0),
    sr: Number(item.sr || 0),
    jr: Number(item.jr || 0)
});

const mapLandscapeFormulaRecord = (item: Record<string, unknown>): LandscapeFormulaRecord => ({
    LandscapeFormulaID: Number(item.LandscapeFormulaID || 0),
    FormulaKey: String(item.FormulaKey || ''),
    FormulaName: item.FormulaName ? String(item.FormulaName) : null,
    BeginDate: String(item.BeginDate || ''),
    EndDate: String(item.EndDate || DEFAULT_END_DATE),
    FormulaJson: String(item.FormulaJson || '{}'),
    IsActive: item.IsActive === true || item.IsActive === 1 || item.IsActive === '1',
    CreateBy: item.CreateBy ? String(item.CreateBy) : null,
    CreateDate: item.CreateDate ? String(item.CreateDate) : null,
    UpdateBy: item.UpdateBy ? String(item.UpdateBy) : null,
    UpdateDate: item.UpdateDate ? String(item.UpdateDate) : null
});

const normalizeOrgUnitNo = (value: string | null | undefined): string => (value || '').trim();
const normalizeFormulaKey = (value: string | null | undefined): string => (value || '').trim().toUpperCase();
const toEffectiveEndDate = (value: string | null | undefined): string => value || DEFAULT_END_DATE;
const isPeriodOverlap = (aBegin: string, aEnd: string, bBegin: string, bEnd: string): boolean =>
    aBegin <= bEnd && aEnd >= bBegin;

const isFormulaField = (value: unknown): value is FormulaField =>
    typeof value === 'string' && FORMULA_FIELDS.includes(value as FormulaField);

const isGapMetric = (value: unknown): value is GapMetric =>
    typeof value === 'string' && GAP_METRIC_OPTIONS.some((item) => item.value === value);

const parseFormulaConfig = (value: unknown): FormulaConfig | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Record<string, unknown>;
    if (!source.shape || typeof source.shape !== 'object') return null;
    if (!source.gap || typeof source.gap !== 'object') return null;

    const shapeSource = source.shape as Record<string, unknown>;
    const gapSource = source.gap as Record<string, unknown>;

    const shape = {} as Record<ShapeTarget, ShapeRule>;
    for (const target of SHAPE_TARGETS) {
        const rawRule = shapeSource[target] as Record<string, unknown> | undefined;
        if (!rawRule || typeof rawRule !== 'object') return null;

        if (rawRule.type === 'direct') {
            if (!isFormulaField(rawRule.field)) return null;
            shape[target] = { type: 'direct', field: rawRule.field };
            continue;
        }

        if (rawRule.type === 'ratio_x_sum') {
            const denominator = Array.isArray(rawRule.denominator) ? rawRule.denominator : [];
            const multiplier = Array.isArray(rawRule.multiplier) ? rawRule.multiplier : [];
            if (!isFormulaField(rawRule.numerator)) return null;
            if (!denominator.every((item) => isFormulaField(item))) return null;
            if (!multiplier.every((item) => isFormulaField(item))) return null;
            shape[target] = {
                type: 'ratio_x_sum',
                numerator: rawRule.numerator,
                denominator: denominator as FormulaField[],
                multiplier: multiplier as FormulaField[]
            };
            continue;
        }

        if (rawRule.type === 'sum') {
            const fields = Array.isArray(rawRule.fields) ? rawRule.fields : [];
            if (!fields.every((item) => isFormulaField(item))) return null;
            shape[target] = {
                type: 'sum',
                fields: fields as FormulaField[]
            };
            continue;
        }

        return null;
    }

    const gap = {} as Record<GapTarget, GapRule>;
    for (const target of GAP_TARGETS) {
        const rawRule = gapSource[target] as Record<string, unknown> | undefined;
        if (!rawRule || typeof rawRule !== 'object') return null;
        // backward compatible: old payload with only baseField/shapeField
        if ((rawRule.type === undefined || rawRule.type === null || rawRule.type === 'ratio')) {
            if (!isFormulaField(rawRule.baseField)) return null;
            if (!isFormulaField(rawRule.shapeField)) return null;
            gap[target] = {
                type: 'ratio',
                baseField: rawRule.baseField,
                shapeField: rawRule.shapeField
            };
            continue;
        }
        if (rawRule.type === 'sum') {
            const fields = Array.isArray(rawRule.fields) ? rawRule.fields : [];
            if (!fields.length || !fields.every((item) => isGapMetric(item))) return null;
            gap[target] = {
                type: 'sum',
                fields: fields as GapMetric[]
            };
            continue;
        }
        return null;
    }

    return { shape, gap };
};

const parseFormulaConfigFromJson = (formulaJson: string): FormulaConfig | null => {
    try {
        const parsed = JSON.parse(formulaJson);
        return parseFormulaConfig(parsed);
    } catch {
        return null;
    }
};

const buildBuilderValuesFromConfig = (config: FormulaConfig): Pick<LandscapeFormulaFormValues, 'shape' | 'gap'> => {
    const shape: Partial<Record<ShapeTarget, ShapeRuleBuilderForm>> = {};
    SHAPE_TARGETS.forEach((target) => {
        const rule = config.shape[target];
        if (rule.type === 'direct') {
            shape[target] = {
                type: 'direct',
                field: rule.field
            };
            return;
        }
        if (rule.type === 'ratio_x_sum') {
            shape[target] = {
                type: 'ratio_x_sum',
                numerator: rule.numerator,
                denominator: rule.denominator,
                multiplier: rule.multiplier
            };
            return;
        }
        shape[target] = {
            type: 'sum',
            fields: rule.fields
        };
    });

    const gap: Partial<Record<GapTarget, GapRuleBuilderForm>> = {};
    GAP_TARGETS.forEach((target) => {
        const rule = config.gap[target];
        if (rule.type === 'sum') {
            gap[target] = {
                type: 'sum',
                fields: rule.fields
            };
            return;
        }
        gap[target] = {
            type: 'ratio',
            baseField: rule.baseField,
            shapeField: rule.shapeField
        };
    });

    return { shape, gap };
};

const buildFormulaConfigFromForm = (values: LandscapeFormulaFormValues): { config?: FormulaConfig; error?: string } => {
    const shape = {} as Record<ShapeTarget, ShapeRule>;
    for (const target of SHAPE_TARGETS) {
        const rule = values.shape?.[target];
        if (!rule?.type) return { error: `กรุณาเลือกชนิดสูตร Shape ${target.toUpperCase()}` };

        if (rule.type === 'direct') {
            if (!isFormulaField(rule.field)) {
                return { error: `กรุณาเลือก Field ของ Shape ${target.toUpperCase()}` };
            }
            shape[target] = { type: 'direct', field: rule.field };
            continue;
        }

        if (rule.type === 'ratio_x_sum') {
            if (!isFormulaField(rule.numerator)) {
                return { error: `กรุณาเลือก Numerator ของ Shape ${target.toUpperCase()}` };
            }
            const denominator = rule.denominator || [];
            const multiplier = rule.multiplier || [];
            if (!denominator.length || !denominator.every((item) => isFormulaField(item))) {
                return { error: `กรุณาเลือก Denominator ของ Shape ${target.toUpperCase()}` };
            }
            if (!multiplier.length || !multiplier.every((item) => isFormulaField(item))) {
                return { error: `กรุณาเลือก Multiplier ของ Shape ${target.toUpperCase()}` };
            }
            shape[target] = {
                type: 'ratio_x_sum',
                numerator: rule.numerator,
                denominator,
                multiplier
            };
            continue;
        }

        const fields = rule.fields || [];
        if (!fields.length || !fields.every((item) => isFormulaField(item))) {
            return { error: `กรุณาเลือกรายการ Sum ของ Shape ${target.toUpperCase()}` };
        }
        shape[target] = {
            type: 'sum',
            fields
        };
    }

    const gap = {} as Record<GapTarget, GapRule>;
    for (const target of GAP_TARGETS) {
        const rule = values.gap?.[target];
        if (!rule) return { error: `กรุณาระบุสูตร Gap ${target.toUpperCase()}` };
        if (!rule.type) return { error: `กรุณาเลือกชนิดสูตร Gap ${target.toUpperCase()}` };
        if (rule.type === 'ratio') {
            if (!isFormulaField(rule.baseField)) {
                return { error: `กรุณาเลือก Base Field ของ Gap ${target.toUpperCase()}` };
            }
            if (!isFormulaField(rule.shapeField)) {
                return { error: `กรุณาเลือก Shape Field ของ Gap ${target.toUpperCase()}` };
            }
            gap[target] = {
                type: 'ratio',
                baseField: rule.baseField,
                shapeField: rule.shapeField
            };
            continue;
        }
        const fields = rule.fields || [];
        if (!fields.length || !fields.every((item) => isGapMetric(item))) {
            return { error: `กรุณาเลือกรายการ Sum ของ Gap ${target.toUpperCase()}` };
        }
        gap[target] = {
            type: 'sum',
            fields
        };
    }

    return {
        config: {
            shape,
            gap
        }
    };
};

function LandscapeContent() {
    const { notification, message: messageApi } = App.useApp();
    const [form] = Form.useForm<LandscapeFormValues>();
    const [formulaForm] = Form.useForm<LandscapeFormulaFormValues>();
    const token = getToken();
    const currentUser = getUserFromToken();

    const [activeTab, setActiveTab] = useState('landscape');

    const [rows, setRows] = useState<LandscapeRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<LandscapeRecord | null>(null);
    const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);

    const [formulaRows, setFormulaRows] = useState<LandscapeFormulaRecord[]>([]);
    const [formulaLoading, setFormulaLoading] = useState(false);
    const [formulaSaving, setFormulaSaving] = useState(false);
    const [formulaModalOpen, setFormulaModalOpen] = useState(false);
    const [editingFormulaRow, setEditingFormulaRow] = useState<LandscapeFormulaRecord | null>(null);
    const [formulaTableReady, setFormulaTableReady] = useState(true);
    const [defaultFormulaConfig, setDefaultFormulaConfig] = useState<FormulaConfig>(DEFAULT_FORMULA_CONFIG);

    const watchedFormulaShape = Form.useWatch('shape', formulaForm);
    const watchedFormulaGap = Form.useWatch('gap', formulaForm);

    const formulaPreviewJson = useMemo(() => {
        const built = buildFormulaConfigFromForm({
            shape: watchedFormulaShape,
            gap: watchedFormulaGap
        });
        if (!built.config) {
            return '{\n  "message": "กรุณาระบุ rule ให้ครบ"\n}';
        }
        return JSON.stringify(built.config, null, 2);
    }, [watchedFormulaGap, watchedFormulaShape]);

    const selectNumberOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        window.setTimeout(() => event.target.select(), 0);
    };

    const unitLabelMap = useMemo(
        () => new Map(unitOptions.map((option) => [option.value, option.label])),
        [unitOptions]
    );

    const applyFormulaConfigToForm = useCallback((config: FormulaConfig, meta: Partial<LandscapeFormulaFormValues> = {}) => {
        const builder = buildBuilderValuesFromConfig(config);
        formulaForm.setFieldsValue({
            formulaKey: REPORT7_FORMULA_KEY,
            formulaName: 'Report7 Shape/GAP',
            isActive: true,
            ...meta,
            ...builder
        });
    }, [formulaForm]);

    const loadLandscape = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getLandscape(token);
            if (res?.success && Array.isArray(res.data)) {
                setRows((res.data as Record<string, unknown>[]).map((item) => mapLandscapeRecord(item)));
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error('Failed to load landscape data:', error);
            messageApi.error('ไม่สามารถโหลดข้อมูล Landscape ได้');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [messageApi, token]);

    const loadFormulaData = useCallback(async () => {
        setFormulaLoading(true);
        try {
            const [listRes, defaultRes] = await Promise.all([
                getLandscapeFormulas(token),
                getLandscapeFormulaDefault(token)
            ]);

            if (defaultRes?.success && defaultRes?.data?.formulaJson) {
                const parsedDefault = parseFormulaConfig(defaultRes.data.formulaJson);
                if (parsedDefault) {
                    setDefaultFormulaConfig(parsedDefault);
                }
            }

            const tableReady = listRes?.tableReady !== false;
            setFormulaTableReady(tableReady);

            if (listRes?.success && Array.isArray(listRes.data)) {
                setFormulaRows((listRes.data as Record<string, unknown>[]).map((item) => mapLandscapeFormulaRecord(item)));
            } else {
                setFormulaRows([]);
            }
        } catch (error) {
            console.error('Failed to load formula data:', error);
            messageApi.error('ไม่สามารถโหลดข้อมูลสูตรได้');
            setFormulaRows([]);
        } finally {
            setFormulaLoading(false);
        }
    }, [messageApi, token]);

    useEffect(() => {
        void loadLandscape();
        void loadFormulaData();
    }, [loadLandscape, loadFormulaData]);

    useEffect(() => {
        const loadUnits = async () => {
            const unitsData = await fetchAllUnits(token);
            if (!Array.isArray(unitsData)) return;
            setUnitOptions(
                unitsData
                    .map((u: Record<string, unknown>) => ({
                        value: String(u.OrgUnitNo || u.id || ''),
                        label: String(u.UnitText || u.unitText || u.name || u.OrgUnitNo || u.id || '')
                    }))
                    .filter((item) => item.value && item.label)
            );
        };
        void loadUnits();
    }, [token]);

    const openCreateModal = () => {
        setEditingRow(null);
        form.setFieldsValue({
            orgUnitNo: undefined,
            beginDate: undefined,
            endDate: undefined,
            vp: 0,
            dm: 0,
            sr: 0,
            jr: 0
        });
        setIsModalOpen(true);
    };

    const openEditModal = (record: LandscapeRecord) => {
        setEditingRow(record);
        form.setFieldsValue({
            orgUnitNo: record.OrgUnitNo || undefined,
            beginDate: record.BeginDate ? dayjs(record.BeginDate) : undefined,
            endDate: record.EndDate && record.EndDate !== DEFAULT_END_DATE ? dayjs(record.EndDate) : undefined,
            vp: Number(record.vp),
            dm: Number(record.dm),
            sr: Number(record.sr),
            jr: Number(record.jr)
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRow(null);
        form.resetFields();
    };

    const handleSave = async () => {
        let values: LandscapeFormValues;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        const beginDate = values.beginDate?.format('YYYY-MM-DD') || '';
        const endDate = values.endDate ? values.endDate.format('YYYY-MM-DD') : null;

        if (!beginDate) {
            messageApi.warning('กรุณาระบุวันที่เริ่มต้น');
            return;
        }
        if (endDate && endDate < beginDate) {
            messageApi.warning('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
            return;
        }

        const payload: LandscapePayload = {
            orgUnitNo: values.orgUnitNo || null,
            beginDate,
            endDate,
            vp: Number(values.vp ?? 0),
            dm: Number(values.dm ?? 0),
            sr: Number(values.sr ?? 0),
            jr: Number(values.jr ?? 0)
        };

        const hasOverlapInPage = rows.some((row) => {
            if (editingRow && row === editingRow) return false;
            if (normalizeOrgUnitNo(row.OrgUnitNo) !== normalizeOrgUnitNo(payload.orgUnitNo)) return false;
            return isPeriodOverlap(
                row.BeginDate,
                toEffectiveEndDate(row.EndDate),
                payload.beginDate,
                toEffectiveEndDate(payload.endDate)
            );
        });

        if (hasOverlapInPage) {
            messageApi.warning('มีข้อมูลช่วงวันที่ซ้ำในหน่วยงานเดียวกัน กรุณาตรวจสอบ period ก่อนบันทึก');
            return;
        }

        setSaving(true);
        try {
            const user = currentUser?.employeeID || 'SYSTEM';
            const res = editingRow
                ? await updateLandscape(toLandscapePayload(editingRow), payload, user, token)
                : await createLandscape(payload, user, token);

            if (res?.success) {
                notification.success({
                    title: editingRow ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ',
                    description: editingRow ? 'ปรับปรุงข้อมูล Landscape เรียบร้อยแล้ว' : 'บันทึกข้อมูล Landscape เรียบร้อยแล้ว'
                });
                closeModal();
                await loadLandscape();
            } else {
                notification.error({
                    title: 'เกิดข้อผิดพลาด',
                    description: res?.message || 'ไม่สามารถบันทึกข้อมูลได้'
                });
            }
        } catch (error) {
            console.error('Failed to save landscape data:', error);
            notification.error({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกข้อมูลได้' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (record: LandscapeRecord) => {
        try {
            const res = await deleteLandscape(toLandscapePayload(record), currentUser?.employeeID || 'SYSTEM', token);
            if (res?.success) {
                notification.success({ title: 'ลบข้อมูลสำเร็จ', description: 'ลบรายการ Landscape เรียบร้อยแล้ว' });
                await loadLandscape();
            } else {
                notification.error({ title: 'ลบข้อมูลไม่สำเร็จ', description: res?.message || 'ไม่สามารถลบข้อมูลได้' });
            }
        } catch (error) {
            console.error('Failed to delete landscape data:', error);
            notification.error({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบข้อมูลได้' });
        }
    };

    const openCreateFormulaModal = () => {
        setEditingFormulaRow(null);
        applyFormulaConfigToForm(defaultFormulaConfig, {
            formulaKey: REPORT7_FORMULA_KEY,
            formulaName: 'Report7 Shape/GAP',
            beginDate: dayjs(),
            endDate: undefined,
            isActive: true
        });
        setFormulaModalOpen(true);
    };

    const openEditFormulaModal = (record: LandscapeFormulaRecord) => {
        setEditingFormulaRow(record);
        const parsed = parseFormulaConfigFromJson(record.FormulaJson);
        const configToUse = parsed || defaultFormulaConfig;

        if (!parsed) {
            messageApi.warning('สูตรเดิมไม่ตรงกับ schema ปัจจุบัน ระบบแสดงค่าเริ่มต้นแทน กรุณาตรวจสอบก่อนบันทึก');
        }

        applyFormulaConfigToForm(configToUse, {
            formulaKey: record.FormulaKey,
            formulaName: record.FormulaName || undefined,
            beginDate: record.BeginDate ? dayjs(record.BeginDate) : undefined,
            endDate: record.EndDate && record.EndDate !== DEFAULT_END_DATE ? dayjs(record.EndDate) : undefined,
            isActive: record.IsActive
        });
        setFormulaModalOpen(true);
    };

    const closeFormulaModal = () => {
        setFormulaModalOpen(false);
        setEditingFormulaRow(null);
        formulaForm.resetFields();
    };

    const handleFillDefaultFormula = () => {
        applyFormulaConfigToForm(defaultFormulaConfig, {
            formulaKey: REPORT7_FORMULA_KEY,
            isActive: true
        });
    };

    const handleSaveFormula = async () => {
        if (!formulaTableReady) {
            messageApi.warning('ยังไม่สามารถบันทึกสูตรได้ กรุณาติดตั้งตาราง MP_LandscapeFormula ก่อน');
            return;
        }

        let values: LandscapeFormulaFormValues;
        try {
            values = await formulaForm.validateFields();
        } catch {
            return;
        }

        const formulaKey = normalizeFormulaKey(values.formulaKey || REPORT7_FORMULA_KEY);
        const beginDate = values.beginDate?.format('YYYY-MM-DD') || '';
        const endDate = values.endDate ? values.endDate.format('YYYY-MM-DD') : null;
        const isActive = values.isActive !== false;

        if (!formulaKey) {
            messageApi.warning('กรุณาระบุ Formula Key');
            return;
        }
        if (!beginDate) {
            messageApi.warning('กรุณาระบุวันที่เริ่มต้น');
            return;
        }
        if (endDate && endDate < beginDate) {
            messageApi.warning('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
            return;
        }

        const built = buildFormulaConfigFromForm(values);
        if (!built.config) {
            messageApi.warning(built.error || 'ข้อมูลสูตรไม่ครบถ้วน');
            return;
        }

        const payload: LandscapeFormulaPayload = {
            formulaKey,
            formulaName: values.formulaName?.trim() || null,
            beginDate,
            endDate,
            isActive,
            formulaJson: JSON.stringify(built.config)
        };

        const hasOverlapInPage = formulaRows.some((row) => {
            if (editingFormulaRow && row.LandscapeFormulaID === editingFormulaRow.LandscapeFormulaID) return false;
            if (!isActive || !row.IsActive) return false;
            if (normalizeFormulaKey(row.FormulaKey) !== normalizeFormulaKey(payload.formulaKey)) return false;
            return isPeriodOverlap(
                row.BeginDate,
                toEffectiveEndDate(row.EndDate),
                payload.beginDate,
                toEffectiveEndDate(payload.endDate)
            );
        });

        if (hasOverlapInPage) {
            messageApi.warning('มีสูตร active ที่ช่วงวันที่ซ้ำกันใน Formula Key เดียวกัน');
            return;
        }

        setFormulaSaving(true);
        try {
            const user = currentUser?.employeeID || 'SYSTEM';
            const res = editingFormulaRow
                ? await updateLandscapeFormula(editingFormulaRow.LandscapeFormulaID, payload, user, token)
                : await createLandscapeFormula(payload, user, token);

            if (res?.success) {
                notification.success({
                    title: editingFormulaRow ? 'แก้ไขสูตรสำเร็จ' : 'เพิ่มสูตรสำเร็จ',
                    description: editingFormulaRow ? 'อัปเดตสูตรเรียบร้อยแล้ว' : 'บันทึกสูตรเรียบร้อยแล้ว'
                });
                closeFormulaModal();
                await loadFormulaData();
            } else {
                notification.error({
                    title: 'เกิดข้อผิดพลาด',
                    description: res?.message || 'ไม่สามารถบันทึกสูตรได้'
                });
            }
        } catch (error) {
            console.error('Failed to save formula:', error);
            notification.error({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกสูตรได้' });
        } finally {
            setFormulaSaving(false);
        }
    };

    const handleDeleteFormula = async (record: LandscapeFormulaRecord) => {
        if (!formulaTableReady) {
            messageApi.warning('ยังไม่สามารถลบสูตรได้ กรุณาติดตั้งตาราง MP_LandscapeFormula ก่อน');
            return;
        }
        try {
            const res = await deleteLandscapeFormula(record.LandscapeFormulaID, token);
            if (res?.success) {
                notification.success({ title: 'ลบสูตรสำเร็จ', description: 'ลบรายการสูตรเรียบร้อยแล้ว' });
                await loadFormulaData();
            } else {
                notification.error({ title: 'ลบสูตรไม่สำเร็จ', description: res?.message || 'ไม่สามารถลบสูตรได้' });
            }
        } catch (error) {
            console.error('Failed to delete formula:', error);
            notification.error({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบสูตรได้' });
        }
    };

    const landscapeColumns: ColumnsType<LandscapeRecord> = [
        {
            title: 'หน่วยงาน',
            dataIndex: 'OrgUnitNo',
            key: 'OrgUnitNo',
            width: 320,
            render: (value: LandscapeRecord['OrgUnitNo']) => {
                const orgUnitNo = value ? String(value).trim() : '';
                if (!orgUnitNo) {
                    return <Tag color="blue" className="text-[14px]! font-semibold">ปตท.</Tag>;
                }
                return <span>{unitLabelMap.get(orgUnitNo) || orgUnitNo}</span>;
            }
        },
        {
            title: 'วันที่เริ่มต้น',
            dataIndex: 'BeginDate',
            key: 'BeginDate',
            width: 150,
            align: 'center',
            render: (value: LandscapeRecord['BeginDate']) => value || '-'
        },
        {
            title: 'วันที่สิ้นสุด',
            dataIndex: 'EndDate',
            key: 'EndDate',
            width: 170,
            align: 'center',
            render: (value: LandscapeRecord['EndDate']) => value === DEFAULT_END_DATE ? '-' : (value || '-')
        },
        {
            title: 'VP',
            dataIndex: 'vp',
            key: 'vp',
            width: 100,
            align: 'right',
            render: (value: LandscapeRecord['vp']) => Number(value || 0).toFixed(2)
        },
        {
            title: 'DM',
            dataIndex: 'dm',
            key: 'dm',
            width: 100,
            align: 'right',
            render: (value: LandscapeRecord['dm']) => Number(value || 0).toFixed(2)
        },
        {
            title: 'SR',
            dataIndex: 'sr',
            key: 'sr',
            width: 100,
            align: 'right',
            render: (value: LandscapeRecord['sr']) => Number(value || 0).toFixed(2)
        },
        {
            title: 'JR',
            dataIndex: 'jr',
            key: 'jr',
            width: 100,
            align: 'right',
            render: (value: LandscapeRecord['jr']) => Number(value || 0).toFixed(2)
        },
        {
            title: 'Action',
            key: 'action',
            width: 130,
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="แก้ไขรายการ">
                        <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    </Tooltip>
                    <Popconfirm title="ยืนยันการลบรายการนี้?" okText="ลบ" cancelText="ยกเลิก" onConfirm={() => handleDelete(record)}>
                        <Tooltip title="ลบรายการ">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const formulaColumns: ColumnsType<LandscapeFormulaRecord> = [
        {
            title: 'Formula Key',
            dataIndex: 'FormulaKey',
            key: 'FormulaKey',
            width: 180
        },
        {
            title: 'ชื่อสูตร',
            dataIndex: 'FormulaName',
            key: 'FormulaName',
            width: 220,
            render: (value: LandscapeFormulaRecord['FormulaName']) => value || '-'
        },
        {
            title: 'วันที่เริ่มต้น',
            dataIndex: 'BeginDate',
            key: 'BeginDate',
            width: 140,
            align: 'center'
        },
        {
            title: 'วันที่สิ้นสุด',
            dataIndex: 'EndDate',
            key: 'EndDate',
            width: 140,
            align: 'center',
            render: (value: LandscapeFormulaRecord['EndDate']) => value === DEFAULT_END_DATE ? '-' : value
        },
        {
            title: 'สถานะ',
            dataIndex: 'IsActive',
            key: 'IsActive',
            width: 100,
            align: 'center',
            render: (value: LandscapeFormulaRecord['IsActive']) => (
                <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag>
            )
        },
        {
            title: 'แก้ไขล่าสุด',
            key: 'lastUpdate',
            width: 180,
            align: 'center',
            render: (_, record) => record.UpdateDate || record.CreateDate || '-'
        },
        {
            title: 'Action',
            key: 'action',
            width: 130,
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="แก้ไขสูตร">
                        <Button type="text" icon={<EditOutlined />} onClick={() => openEditFormulaModal(record)} />
                    </Tooltip>
                    <Popconfirm title="ยืนยันการลบสูตรนี้?" okText="ลบ" cancelText="ยกเลิก" onConfirm={() => handleDeleteFormula(record)}>
                        <Tooltip title="ลบสูตร">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="rounded-xl bg-linear-to-r from-blue-700 to-blue-500 p-4 shadow-md mb-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Mountain size={22} />
                    <h1 className="text-xl font-bold m-0 text-white">Manpower Landscape Management</h1>
                </div>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                className="landscape-tabs"
                items={[
                    {
                        key: 'landscape',
                        label: (
                            <div className="flex items-center gap-2">
                                <Mountain size={16} />
                                Landscape
                            </div>
                        ),
                        children: (
                            <div className="flex flex-col gap-4">
                                <Card className="mb-1 shadow-sm border-slate-200">
                                    <div className="flex flex-wrap gap-4 items-center justify-between">
                                        <div className="flex flex-col gap-2">
                                            <Text type="secondary">
                                                หากไม่ระบุวันที่สิ้นสุด ระบบจะกำหนดวันสิ้นสุดให้อัติโนมัติ และถ้าไม่ระบุหน่วยงานจะใช้กับ ปตท.
                                            </Text>
                                        </div>
                                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 font-semibold" size="large" onClick={openCreateModal}>
                                            เพิ่มรายการ
                                        </Button>
                                    </div>
                                </Card>

                                <Card className="shadow-sm border-slate-200">
                                    <Table
                                        columns={landscapeColumns}
                                        dataSource={rows}
                                        loading={loading}
                                        bordered
                                        size="middle"
                                        className="[&_.ant-table-thead>tr>th]:bg-slate-100 [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-tbody>tr:hover>td]:bg-blue-50/40"
                                        pagination={{ pageSize: 10, showSizeChanger: true }}
                                        scroll={{ x: 980 }}
                                        rowKey={(record) => `${record.OrgUnitNo || 'ALL'}-${record.BeginDate}-${record.EndDate}`}
                                    />
                                </Card>
                            </div>
                        )
                    },
                    {
                        key: 'formula',
                        label: (
                            <div className="flex items-center gap-2">
                                <FileCode2 size={16} />
                                Formula
                            </div>
                        ),
                        children: (
                            <div className="flex flex-col gap-4">
                                {!formulaTableReady && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        message="ยังไม่พบตาราง MP_LandscapeFormula"
                                        description="กรุณารันไฟล์ SQL: backend/sql/create_mp_landscape_formula.sql ก่อนใช้งานแท็บ Formula"
                                    />
                                )}

                                <Card className="shadow-sm border-slate-200">
                                    <div className="flex flex-wrap gap-4 items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <Text type="secondary">แก้สูตรผ่าน Rule Builder ได้ทันที </Text>
                                          
                                        </div>
                                        <Space>
                                            <Button onClick={() => void loadFormulaData()}>Refresh</Button>
                                            <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 font-semibold" size="large" onClick={openCreateFormulaModal}>
                                                เพิ่มสูตร
                                            </Button>
                                        </Space>
                                    </div>
                                </Card>

                                <Card className="shadow-sm border-slate-200">
                                    <Table
                                        columns={formulaColumns}
                                        dataSource={formulaRows}
                                        loading={formulaLoading}
                                        bordered
                                        size="middle"
                                        pagination={{ pageSize: 10, showSizeChanger: true }}
                                        scroll={{ x: 1100 }}
                                        rowKey={(record) => String(record.LandscapeFormulaID)}
                                    />
                                </Card>
                            </div>
                        )
                    }
                ]}
            />

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Mountain size={18} className="text-blue-600" />
                        <span className="font-semibold">{editingRow ? 'แก้ไข Manpower Landscape' : 'เพิ่ม Manpower Landscape'}</span>
                    </div>
                }
                open={isModalOpen}
                onOk={handleSave}
                onCancel={closeModal}
                okText={editingRow ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
                cancelText="ยกเลิก"
                confirmLoading={saving}
                okButtonProps={{ className: 'bg-blue-600 px-6' }}
                width={600}
                centered
                forceRender
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item label="หน่วยงาน (ไม่ระบุ = ใช้ ปตท.)" name="orgUnitNo">
                        <Select
                            allowClear
                            showSearch
                            placeholder="เลือกหน่วยงาน (ถ้ามี)"
                            options={unitOptions}
                            optionFilterProp="label"
                            size="large"
                        />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item label="วันที่เริ่มต้น" name="beginDate" rules={[{ required: true, message: 'กรุณาเลือกวันที่เริ่มต้น' }]}>
                            <DatePicker className="w-full" format="YYYY-MM-DD" size="large" />
                        </Form.Item>
                        <Form.Item label="วันที่สิ้นสุด (ถ้าไม่ระบุจะใช้ 9999-12-31)" name="endDate">
                            <DatePicker className="w-full" format="YYYY-MM-DD" size="large" />
                        </Form.Item>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 pt-4 pb-1">
                        <div className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-3">Landscape Ratio</div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="VP" name="vp" rules={[{ required: true, message: 'กรุณาระบุ VP' }]}>
                                <InputNumber className="w-full" precision={2} min={0} size="large" onFocus={selectNumberOnFocus} />
                            </Form.Item>
                            <Form.Item label="DM" name="dm" rules={[{ required: true, message: 'กรุณาระบุ DM' }]}>
                                <InputNumber className="w-full" precision={2} min={0} size="large" onFocus={selectNumberOnFocus} />
                            </Form.Item>
                            <Form.Item label="SR" name="sr" rules={[{ required: true, message: 'กรุณาระบุ SR' }]}>
                                <InputNumber className="w-full" precision={2} min={0} size="large" onFocus={selectNumberOnFocus} />
                            </Form.Item>
                            <Form.Item label="JR" name="jr" rules={[{ required: true, message: 'กรุณาระบุ JR' }]}>
                                <InputNumber className="w-full" precision={2} min={0} size="large" onFocus={selectNumberOnFocus} />
                            </Form.Item>
                        </div>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <FileCode2 size={18} className="text-blue-600" />
                        <span className="font-semibold">{editingFormulaRow ? 'แก้ไขสูตรคำนวณ' : 'เพิ่มสูตรคำนวณ'}</span>
                    </div>
                }
                open={formulaModalOpen}
                onOk={handleSaveFormula}
                onCancel={closeFormulaModal}
                okText={editingFormulaRow ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
                cancelText="ยกเลิก"
                confirmLoading={formulaSaving}
                okButtonProps={{ className: 'bg-blue-600 px-6' }}
                width={1040}
                centered
                styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
                forceRender
            >
                <Form form={formulaForm} layout="vertical" className="mt-4" requiredMark={false}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item label="Formula Key" name="formulaKey" rules={[{ required: true, message: 'กรุณาระบุ Formula Key' }]}>
                            <Input placeholder="REPORT7_SHAPE_GAP" />
                        </Form.Item>
                        <Form.Item label="ชื่อสูตร" name="formulaName">
                            <Input placeholder="เช่น Report7 Shape/GAP - Version A" />
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Form.Item label="วันที่เริ่มต้น" name="beginDate" rules={[{ required: true, message: 'กรุณาเลือกวันที่เริ่มต้น' }]}>
                            <DatePicker className="w-full" format="YYYY-MM-DD" />
                        </Form.Item>
                        <Form.Item label="วันที่สิ้นสุด (ไม่ระบุ = 9999-12-31)" name="endDate">
                            <DatePicker className="w-full" format="YYYY-MM-DD" />
                        </Form.Item>
                        <Form.Item label="ใช้งาน" name="isActive" valuePropName="checked" initialValue={true}>
                            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                        </Form.Item>
                    </div>

                    <Card size="small" className="mb-4 border-slate-200" title="Shape Rules" extra={<Button size="small" onClick={handleFillDefaultFormula}>ใช้สูตรมาตรฐาน</Button>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {SHAPE_TARGETS.map((target) => (
                                <div key={`shape-${target}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-sm font-semibold text-slate-700 mb-2">Shape {target.toUpperCase()}</div>
                                    <Form.Item
                                        label="Rule Type"
                                        name={['shape', target, 'type']}
                                        rules={[{ required: true, message: 'กรุณาเลือก Rule Type' }]}
                                    >
                                        <Select options={SHAPE_RULE_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))} />
                                    </Form.Item>

                                    <Form.Item noStyle shouldUpdate>
                                        {() => {
                                            const currentType = formulaForm.getFieldValue(['shape', target, 'type']) as ShapeRule['type'] | undefined;

                                            if (currentType === 'direct') {
                                                return (
                                                    <Form.Item
                                                        label="Field"
                                                        name={['shape', target, 'field']}
                                                        rules={[{ required: true, message: 'กรุณาเลือก Field' }]}
                                                    >
                                                        <Select options={ALL_FIELD_OPTIONS} showSearch optionFilterProp="label" />
                                                    </Form.Item>
                                                );
                                            }

                                            if (currentType === 'ratio_x_sum') {
                                                return (
                                                    <>
                                                        <Form.Item
                                                            label="Numerator"
                                                            name={['shape', target, 'numerator']}
                                                            rules={[{ required: true, message: 'กรุณาเลือก Numerator' }]}
                                                        >
                                                            <Select options={ALL_FIELD_OPTIONS} showSearch optionFilterProp="label" />
                                                        </Form.Item>
                                                        <Form.Item
                                                            label="Denominator (หลายค่าได้)"
                                                            name={['shape', target, 'denominator']}
                                                            rules={[{ required: true, message: 'กรุณาเลือก Denominator' }]}
                                                        >
                                                            <Select mode="multiple" options={ALL_FIELD_OPTIONS} showSearch optionFilterProp="label" />
                                                        </Form.Item>
                                                        <Form.Item
                                                            label="Multiplier (หลายค่าได้)"
                                                            name={['shape', target, 'multiplier']}
                                                            rules={[{ required: true, message: 'กรุณาเลือก Multiplier' }]}
                                                        >
                                                            <Select mode="multiple" options={ALL_FIELD_OPTIONS} showSearch optionFilterProp="label" />
                                                        </Form.Item>
                                                    </>
                                                );
                                            }

                                            if (currentType === 'sum') {
                                                return (
                                                    <Form.Item
                                                        label="Fields (Sum)"
                                                        name={['shape', target, 'fields']}
                                                        rules={[{ required: true, message: 'กรุณาเลือกรายการ Sum' }]}
                                                    >
                                                        <Select mode="multiple" options={ALL_FIELD_OPTIONS} showSearch optionFilterProp="label" />
                                                    </Form.Item>
                                                );
                                            }

                                            return null;
                                        }}
                                    </Form.Item>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card size="small" className="mb-4 border-slate-200" title="Gap Rules">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {GAP_TARGETS.map((target) => (
                                <div key={`gap-${target}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-sm font-semibold text-slate-700 mb-2">Gap {target.toUpperCase()}</div>
                                    <Form.Item
                                        label="Rule Type"
                                        name={['gap', target, 'type']}
                                        rules={[{ required: true, message: 'กรุณาเลือก Rule Type' }]}
                                    >
                                        <Select options={GAP_RULE_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))} />
                                    </Form.Item>

                                    <Form.Item noStyle shouldUpdate>
                                        {() => {
                                            const currentType = formulaForm.getFieldValue(['gap', target, 'type']) as GapRule['type'] | undefined;

                                            if (currentType === 'ratio') {
                                                return (
                                                    <>
                                                        <Form.Item
                                                            label="Base Field"
                                                            name={['gap', target, 'baseField']}
                                                            rules={[{ required: true, message: 'กรุณาเลือก Base Field' }]}
                                                        >
                                                            <Select options={ALL_FIELD_OPTIONS} showSearch optionFilterProp="label" />
                                                        </Form.Item>
                                                        <Form.Item
                                                            label="Shape Field"
                                                            name={['gap', target, 'shapeField']}
                                                            rules={[{ required: true, message: 'กรุณาเลือก Shape Field' }]}
                                                        >
                                                            <Select options={SHAPE_FIELD_OPTIONS} showSearch optionFilterProp="label" />
                                                        </Form.Item>
                                                    </>
                                                );
                                            }

                                            if (currentType === 'sum') {
                                                return (
                                                    <Form.Item
                                                        label="Fields (Sum)"
                                                        name={['gap', target, 'fields']}
                                                        rules={[{ required: true, message: 'กรุณาเลือกรายการ Sum' }]}
                                                    >
                                                        <Select mode="multiple" options={GAP_METRIC_OPTIONS} showSearch optionFilterProp="label" />
                                                    </Form.Item>
                                                );
                                            }

                                            return null;
                                        }}
                                    </Form.Item>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Form.Item label="JSON Preview (อ่านอย่างเดียว)">
                        <Input.TextArea
                            value={formulaPreviewJson}
                            readOnly
                            autoSize={{ minRows: 8, maxRows: 12 }}
                            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 }}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <style jsx global>{`
                .landscape-tabs .ant-tabs-nav {
                    border-bottom: 2px solid #f1f5f9 !important;
                    margin-bottom: 16px !important;
                }
                .landscape-tabs .ant-tabs-tab {
                    padding: 14px 8px !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.03em !important;
                }
                .landscape-tabs .ant-tabs-ink-bar {
                    height: 3px !important;
                    background: #2563eb !important;
                }
            `}</style>
        </div>
    );
}

export default function LandscapePage() {
    return (
        <Main currentPath="/setting">
            <App>
                <LandscapeContent />
            </App>
        </Main>
    );
}
