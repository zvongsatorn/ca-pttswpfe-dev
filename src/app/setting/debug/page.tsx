'use client';

import React, { useState } from 'react';
import { App, Button, Card, Form, Input, InputNumber, Radio, Space, Tag, Typography } from 'antd';
import { ApartmentOutlined, BugOutlined, MailOutlined, SendOutlined } from '@ant-design/icons';
import Main from '@/components/layout/main';
import { getAuthToken } from '@/utils/auth';
import { testMailAlert, type DebugMailTemplateType, type MailAlertTestResponse } from '@/services/debugMailService';
import { debugGenerateStructureRemarks, type StructureRemarkDebugResult } from '@/services/debugTransactionService';

const { Text, Paragraph } = Typography;

interface DebugFormValues {
    email: string;
    templateType: DebugMailTemplateType;
    documentNo?: string;
    mkdRequestNo?: string;
}

interface StructureDebugFormValues {
    effectiveMonth: number;
    effectiveYear: number;
}

const configKeyByTemplateType = (templateType?: DebugMailTemplateType): 'SendMailAlert' | 'SendMailTrans' | 'SendMailManDriver' => {
    if (templateType === 'TRANSACTION_SUBMIT' || templateType === 'TRANSACTION_REJECT') return 'SendMailTrans';
    if (templateType === 'MKD_NEXT' || templateType === 'MKD_REJECT' || templateType === 'MKD_HRUSER') return 'SendMailManDriver';
    return 'SendMailAlert';
};

const modeLabel = (mode: string) => {
    if (mode === '1') return '1 = ส่งจริงตามผู้รับ';
    if (mode === '2') return '2 = ส่งเข้าอีเมล์ทดสอบ (Value2)';
    return '0 = ไม่ส่งเมล์';
};

const templateTypeLabel = (templateType: DebugMailTemplateType): string => {
    switch (templateType) {
        case 'CALENDAR_START':
            return 'ปฏิทิน: แจ้งเตือนเริ่มต้นการบันทึกข้อมูล';
        case 'CALENDAR_END':
            return 'ปฏิทิน: แจ้งเตือนสิ้นสุดการบันทึกข้อมูล';
        case 'TRANSACTION_SUBMIT':
            return 'Transaction: แจ้งเตือนรายการส่งมาให้ตรวจสอบ';
        case 'TRANSACTION_REJECT':
            return 'Transaction: แจ้งเตือนรายการถูก Reject';
        case 'MKD_NEXT':
            return 'MKD: ขออนุมัติรายการถัดไป';
        case 'MKD_REJECT':
            return 'MKD: แจ้งเตือนไม่เห็นชอบ (Reject)';
        case 'MKD_HRUSER':
            return 'MKD: แจ้งเตือนผ่านเห็นชอบถึง HR User';
        default:
            return templateType;
    }
};

function DebugMailContent() {
    const { message: messageApi, notification } = App.useApp();
    const [form] = Form.useForm<DebugFormValues>();
    const [structureForm] = Form.useForm<StructureDebugFormValues>();
    const [loading, setLoading] = useState(false);
    const [structureLoading, setStructureLoading] = useState(false);
    const [result, setResult] = useState<MailAlertTestResponse | null>(null);
    const [structureResult, setStructureResult] = useState<StructureRemarkDebugResult | null>(null);
    const selectedTemplate = Form.useWatch('templateType', form) as DebugMailTemplateType | undefined;
    const currentConfigKey = configKeyByTemplateType(selectedTemplate);
    const today = new Date();

    const handleRunStructureDebug = async () => {
        let values: StructureDebugFormValues;
        try {
            values = await structureForm.validateFields();
        } catch {
            return;
        }

        setStructureLoading(true);
        try {
            const token = getAuthToken() || '';
            const response = await debugGenerateStructureRemarks({
                effectiveMonth: values.effectiveMonth,
                effectiveYear: values.effectiveYear
            }, token);

            setStructureResult(response);
            notification.success({
                title: 'ยิง Transaction Type 5 สำเร็จ',
                description: `พบ ${response.totalDetected} รายการ, Insert สำเร็จ ${response.insertedCount}, ข้าม ${response.skippedCount}`
            });
        } catch (error: unknown) {
            const err = error as Error;
            console.error('run structure remark debug error:', err);
            messageApi.error(err?.message || 'ไม่สามารถยิง Transaction Type 5 ได้');
        } finally {
            setStructureLoading(false);
        }
    };

    const handleSubmit = async () => {
        let values: DebugFormValues;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        setLoading(true);
        try {
            const token = getAuthToken() || '';
            let documentNo: string | undefined;

            if (values.templateType === 'TRANSACTION_SUBMIT' || values.templateType === 'TRANSACTION_REJECT') {
                documentNo = (values.documentNo || '').trim() || undefined;
                if (!documentNo) {
                    messageApi.warning('สำหรับ Transaction กรุณาระบุ DocumentNo');
                    setLoading(false);
                    return;
                }
            }

            const response = await testMailAlert({
                email: values.email.trim(),
                templateType: values.templateType,
                mkdRequestNo: (values.mkdRequestNo || '').trim() || undefined,
                documentNo
            }, token);

            setResult(response);
            notification.success({
                title: 'ทดสอบยิงเมล์สำเร็จ',
                description: response.message
            });
        } catch (error: unknown) {
            const err = error as Error;
            console.error('test mail alert error:', err);
            messageApi.error(err?.message || 'ไม่สามารถทดสอบยิงเมล์ได้');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center gap-3">
                <BugOutlined className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">Debug Mail Alert</h1>
            </div>

            <Card className="mb-6 border-slate-200 shadow-sm">
                <Space orientation="vertical" size={8} className="w-full">
                    <Text strong>ทดสอบระบบส่งเมล์แจ้งเตือน</Text>
                    <Paragraph className="m-0 text-slate-600">
                        ระบบจะตรวจสอบ MP_Config (<code>{currentConfigKey}</code>)
                    </Paragraph>
                </Space>
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="templateType"
                        label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">รูปแบบอีเมลสำหรับทดสอบ</span>}
                        initialValue="CALENDAR_START"
                        rules={[{ required: true, message: 'กรุณาเลือกรูปแบบอีเมล' }]}
                    >
                        <Radio.Group>
                            <Space orientation="vertical">
                                <Radio value="CALENDAR_START">ปฏิทิน: แจ้งเตือนวันกำหนดเริ่มต้นการบันทึกข้อมูล</Radio>
                                <Radio value="CALENDAR_END">ปฏิทิน: แจ้งเตือนวันกำหนดสิ้นสุดการบันทึกข้อมูล</Radio>
                                <Radio value="TRANSACTION_SUBMIT">Transaction: มีการเปลี่ยนแปลงกรอบอัตรากำลัง ส่งมาให้ตรวจสอบ</Radio>
                                <Radio value="TRANSACTION_REJECT">Transaction: มีการ Reject การเปลี่ยนแปลงกรอบอัตรากำลัง</Radio>
                                <Radio value="MKD_NEXT">MKD: ขออนุมัติ Mandriver Power (รายการถัดไป)</Radio>
                                <Radio value="MKD_REJECT">MKD: รายการ Mandriver Power ไม่เห็นชอบ</Radio>
                                <Radio value="MKD_HRUSER">MKD: Mandriver Power ผ่านการเห็นชอบแล้ว</Radio>
                            </Space>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">อีเมล์ที่ต้องการทดสอบ</span>}
                        rules={[
                            { required: true, message: 'กรุณาระบุอีเมล์' },
                            { type: 'email', message: 'รูปแบบอีเมล์ไม่ถูกต้อง' }
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined className="text-slate-400" />}
                            placeholder="example@company.com"
                            size="large"
                            autoComplete="off"
                        />
                    </Form.Item>

                    {(selectedTemplate === 'TRANSACTION_SUBMIT' || selectedTemplate === 'TRANSACTION_REJECT') && (
                        <Form.Item
                            name="documentNo"
                            label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">Document No</span>}
                            extra="ระบบจะดึงรายการ Transaction จาก MP_DocumentItems โดยใช้ DocumentNo นี้"
                        >
                            <Input placeholder="เช่น DA26030001" />
                        </Form.Item>
                    )}

                    {(selectedTemplate === 'MKD_NEXT' || selectedTemplate === 'MKD_REJECT' || selectedTemplate === 'MKD_HRUSER') && (
                        <Form.Item
                            name="mkdRequestNo"
                            label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">MKD Request No</span>}
                            extra="MKD มี 1 รายการต่อ 1 การแจ้งเตือน"
                        >
                            <Input placeholder="เช่น M20260001" />
                        </Form.Item>
                    )}

                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        size="large"
                        loading={loading}
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700 font-bold"
                    >
                        ทดสอบยิงเมล์
                    </Button>
                </Form>
            </Card>

            <Card className="mb-6 border-slate-200 shadow-sm">
                <Space orientation="vertical" size={12} className="w-full">
                    <Space size={10}>
                        <ApartmentOutlined className="text-slate-600" />
                        <Text strong>ยิง Transaction Type 5 (ตรวจโครงสร้างหน่วยงาน)</Text>
                    </Space>
                    <Paragraph className="m-0 text-slate-600">
                        ระบบจะเทียบโครงสร้างหน่วยงานกับเดือนก่อนหน้า และ Insert แบบอนุมัติทันที (Status = 3)
                    </Paragraph>

                    <Form
                        form={structureForm}
                        layout="inline"
                        className="flex flex-nowrap items-end gap-3"
                        initialValues={{
                            effectiveMonth: today.getMonth() + 1,
                            effectiveYear: today.getFullYear() + 543
                        }}
                    >
                        <Form.Item
                            name="effectiveMonth"
                            label="เดือน"
                            rules={[{ required: true, message: 'กรุณาระบุเดือน' }]}
                        >
                            <InputNumber min={1} max={12} style={{ width: 100 }} />
                        </Form.Item>
                        <Form.Item
                            name="effectiveYear"
                            label="ปี (พ.ศ.)"
                            rules={[{ required: true, message: 'กรุณาระบุปี' }]}
                        >
                            <InputNumber min={2500} max={2700} style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                loading={structureLoading}
                                onClick={handleRunStructureDebug}
                                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                            >
                                ยิง Transaction Type 5
                            </Button>
                        </Form.Item>
                    </Form>
                </Space>
            </Card>

            {result && (
                <Card className="mt-6 border-slate-200 shadow-sm" title="ผลการทดสอบ">
                    <Space orientation="vertical" size={8} className="w-full">
                        <Text><b>Template:</b> {templateTypeLabel(result.templateType)}</Text>
                        <Text><b>Config Key:</b> {result.configKey}</Text>
                        <Text><b>Subject:</b> {result.subject}</Text>
                        <div>
                            <Text className="text-slate-500">Config Mode: </Text>
                            <Tag color={result.mode === '1' ? 'green' : result.mode === '2' ? 'gold' : 'red'}>
                                {modeLabel(result.mode)}
                            </Tag>
                        </div>
                        <Text><b>Requested Recipient:</b> {result.requestedRecipient}</Text>
                        <Text><b>Final Recipient:</b> {result.finalRecipient || '-'}</Text>
                        <Text><b>IsSend:</b> {result.isSend}</Text>
                        <Text><b>MailToID (Log):</b> {result.mailToId}</Text>
                        <Text><b>Message:</b> {result.message}</Text>
                    </Space>
                </Card>
            )}

            {structureResult && (
                <Card className="mt-6 border-slate-200 shadow-sm" title="ผลการยิง Transaction Type 5">
                    <Space orientation="vertical" size={8} className="w-full">
                        <Text><b>Effective Date:</b> {structureResult.effectiveDate}</Text>
                        <Text><b>Compare Previous Month:</b> {structureResult.previousEffectiveDate}</Text>
                        <Text><b>Detected:</b> {structureResult.totalDetected}</Text>
                        <Text><b>Inserted (Status = 3):</b> {structureResult.insertedCount}</Text>
                        <Text><b>Skipped Existing:</b> {structureResult.skippedCount}</Text>
                        {structureResult.changes.slice(0, 10).map((item, index) => (
                            <div key={`${item.unitNo}-${index}`} className="border rounded-md p-3 bg-slate-50">
                                <Space orientation="vertical" size={2} className="w-full">
                                    <Text>
                                        <b>{item.unitNo}</b> - {item.unitName}
                                    </Text>
                                    <Text className="text-slate-600">{item.remark}</Text>
                                    <Tag color={item.action === 'INSERTED' ? 'green' : 'gold'}>
                                        {item.action === 'INSERTED' ? 'INSERTED' : 'SKIPPED_EXISTING'}
                                    </Tag>
                                </Space>
                            </div>
                        ))}
                        {structureResult.changes.length > 10 && (
                            <Text className="text-slate-500">แสดงเฉพาะ 10 รายการแรกจากทั้งหมด {structureResult.changes.length} รายการ</Text>
                        )}
                    </Space>
                </Card>
            )}
        </div>
    );
}

export default function SettingDebugPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <DebugMailContent />
            </App>
        </Main>
    );
}
