'use client';

import React, { useMemo, useState } from 'react';
import { App, Button, Card, Checkbox, Divider, Tag, Typography } from 'antd';
import Main from '@/components/layout/main';
import { uploadInfoDataFile, type InfoDataUploadSummary } from '@/services/interfaceService';

const { Text, Title } = Typography;

const REQUIRED_COLUMNS = [
    'EmailAddr',
    'SEX',
    'UNITCODE',
    'HIRINGDATE',
    'ASSIGNDATE',
    'RETIREDATE',
    'POSCODE',
    'FULLNAMETH',
    'FULLNAMEENG',
    'CHANGE_DATE',
    'CODE',
    'RETIREYEAR',
    'POSNAME',
    'BAND'
];

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function InterfaceContent() {
    const { notification, message } = App.useApp();
    const token = getToken();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [replaceExisting, setReplaceExisting] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [summary, setSummary] = useState<InfoDataUploadSummary | null>(null);

    const acceptedFormatText = useMemo(() => '.csv, .xlsx', []);

    const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setSummary(null);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            message.warning('กรุณาเลือกไฟล์ก่อนอัปโหลด');
            return;
        }

        setUploading(true);
        try {
            const result = await uploadInfoDataFile(selectedFile, replaceExisting, token);

            if (!result?.success || !result.data) {
                notification.error({
                    title: 'อัปโหลดไม่สำเร็จ',
                    description: result?.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
                });
                return;
            }

            setSummary(result.data);
            notification.success({
                title: 'อัปโหลดสำเร็จ',
                description: `นำเข้าข้อมูล ${result.data.insertedRows.toLocaleString()} รายการ`
            });
        } catch (error) {
            console.error('Failed to upload InfoData file:', error);
            notification.error({
                title: 'อัปโหลดไม่สำเร็จ',
                description: 'ไม่สามารถเชื่อมต่อระบบได้ในขณะนี้'
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow-sm">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-cyan-500 p-4 shadow-md mb-6 text-white">
                <Title level={4} className="text-white! m-0!">Interface Data</Title>
            </div>

            <Card title="Upload File" className="mb-6">
                <div className="space-y-4">
                    <div>
                        <Text strong>ไฟล์ที่รองรับ:</Text>{' '}
                        <Text>{acceptedFormatText}</Text>
                    </div>

                    <input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleSelectFile}
                        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />

                    <Checkbox
                        checked={replaceExisting}
                        onChange={(event) => setReplaceExisting(event.target.checked)}
                    >
                        ลบข้อมูลเดิมในตาราง InfoData ก่อนนำเข้า
                    </Checkbox>

                    <div className="flex items-center gap-3">
                        <Button
                            type="primary"
                            loading={uploading}
                            disabled={!selectedFile}
                            onClick={handleUpload}
                        >
                            Upload เข้า InfoData
                        </Button>

                        <Text type="secondary">
                            {selectedFile ? `ไฟล์ที่เลือก: ${selectedFile.name}` : 'ยังไม่ได้เลือกไฟล์'}
                        </Text>
                    </div>
                </div>
            </Card>

            <Card title="Required Columns" className="mb-6">
                <div className="flex flex-wrap gap-2">
                    {REQUIRED_COLUMNS.map((column) => (
                        <Tag key={column} color="blue">{column}</Tag>
                    ))}
                </div>
            </Card>

            {summary && (
                <Card title="ผลการนำเข้า">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Text type="secondary">อ่านข้อมูลจากไฟล์ทั้งหมด</Text>
                            <div className="text-xl font-semibold">{summary.parsedRows.toLocaleString()} แถว</div>
                        </div>
                        <div>
                            <Text type="secondary">นำเข้าเข้าระบบสำเร็จ</Text>
                            <div className="text-xl font-semibold text-green-600">{summary.insertedRows.toLocaleString()} แถว</div>
                        </div>
                        <div>
                            <Text type="secondary">ข้ามแถวว่าง</Text>
                            <div className="text-xl font-semibold">{summary.skippedRows.toLocaleString()} แถว</div>
                        </div>
                        <div>
                            <Text type="secondary">โหมดการนำเข้า</Text>
                            <div className="text-xl font-semibold">{summary.replaceExisting ? 'Replace ทั้งตาราง' : 'Append เพิ่มข้อมูล'}</div>
                        </div>
                    </div>
                    <Divider />
                    <Text type="secondary">หมายเหตุ: หากมีคอลัมน์อื่นเพิ่มเติมในไฟล์ ระบบจะไม่นำเข้าคอลัมน์เหล่านั้น</Text>
                </Card>
            )}
        </div>
    );
}

export default function InterfacePage() {
    return (
        <Main currentPath="/setting">
            <App>
                <InterfaceContent />
            </App>
        </Main>
    );
}
