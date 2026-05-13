'use client';

import { getLocalText } from '@/utils/security';
import React, { useMemo, useState } from 'react';
import { App, Button, Card, Checkbox, Divider, Tabs, Tag, Typography } from 'antd';
import Main from '@/components/layout/main';
import {
    uploadHrpDataFile,
    uploadInfoDataFile,
    type HrpDataUploadSummary,
    type HrpTargetTable,
    type InfoDataUploadSummary
} from '@/services/interfaceService';

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
    'Secondment_text',
    'CODE',
    'RETIREYEAR',
    'POSNAME',
    'BAND'
];

const HRP1001_ALLOWED_FILE_BASENAMES = ['HRP1001O', 'HRP1001S'];
const HRP1002_ALLOWED_FILE_BASENAMES = ['HRP1002'];

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return getLocalText('auth_token') || '';
}

const normalizeFileBaseName = (fileName: string): string => {
    const normalized = fileName.split(/[\\/]/).pop() || fileName;
    const dotIndex = normalized.lastIndexOf('.');
    return (dotIndex >= 0 ? normalized.slice(0, dotIndex) : normalized).trim().toUpperCase();
};

interface ImportSummaryCardProps {
    summary: {
        parsedRows: number;
        insertedRows: number;
        skippedRows: number;
        replaceExisting: boolean;
    };
    sourceFile?: string;
    targetTable?: string;
}

function ImportSummaryCard({ summary, sourceFile, targetTable }: ImportSummaryCardProps) {
    return (
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
                {targetTable && (
                    <div>
                        <Text type="secondary">ตารางปลายทาง</Text>
                        <div className="text-xl font-semibold">{targetTable}</div>
                    </div>
                )}
                {sourceFile && (
                    <div>
                        <Text type="secondary">ไฟล์ที่นำเข้า</Text>
                        <div className="text-base font-semibold break-all">{sourceFile}</div>
                    </div>
                )}
            </div>
            <Divider />
            <Text type="secondary">หมายเหตุ: หากมีคอลัมน์อื่นเพิ่มเติมในไฟล์ ระบบจะไม่นำเข้าคอลัมน์เหล่านั้น</Text>
        </Card>
    );
}

function InterfaceContent() {
    const { notification, message } = App.useApp();
    const token = getToken();

    const [infoDataFile, setInfoDataFile] = useState<File | null>(null);
    const [infoDataReplaceExisting, setInfoDataReplaceExisting] = useState(true);
    const [infoDataUploading, setInfoDataUploading] = useState(false);
    const [infoDataSummary, setInfoDataSummary] = useState<InfoDataUploadSummary | null>(null);

    const [hrp1001File, setHrp1001File] = useState<File | null>(null);
    const [hrp1001ReplaceExisting, setHrp1001ReplaceExisting] = useState(true);
    const [hrp1001Uploading, setHrp1001Uploading] = useState(false);
    const [hrp1001Summary, setHrp1001Summary] = useState<HrpDataUploadSummary | null>(null);

    const [hrp1002File, setHrp1002File] = useState<File | null>(null);
    const [hrp1002ReplaceExisting, setHrp1002ReplaceExisting] = useState(true);
    const [hrp1002Uploading, setHrp1002Uploading] = useState(false);
    const [hrp1002Summary, setHrp1002Summary] = useState<HrpDataUploadSummary | null>(null);

    const acceptedFormatText = useMemo(() => '.csv, .xlsx', []);

    const handleSelectInfoDataFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setInfoDataFile(file);
        setInfoDataSummary(null);
    };

    const handleSelectHrpFile = (
        event: React.ChangeEvent<HTMLInputElement>,
        targetTable: HrpTargetTable
    ) => {
        const file = event.target.files?.[0] || null;
        const allowedFileNames = targetTable === 'HRP1001'
            ? HRP1001_ALLOWED_FILE_BASENAMES
            : HRP1002_ALLOWED_FILE_BASENAMES;

        if (!file) {
            if (targetTable === 'HRP1001') {
                setHrp1001File(null);
                setHrp1001Summary(null);
            } else {
                setHrp1002File(null);
                setHrp1002Summary(null);
            }
            return;
        }

        const normalizedBaseName = normalizeFileBaseName(file.name);
        if (!allowedFileNames.includes(normalizedBaseName)) {
            message.warning(`ชื่อไฟล์ไม่ถูกต้องสำหรับ ${targetTable}: ${allowedFileNames.join(', ')}`);
            event.target.value = '';
            if (targetTable === 'HRP1001') {
                setHrp1001File(null);
                setHrp1001Summary(null);
            } else {
                setHrp1002File(null);
                setHrp1002Summary(null);
            }
            return;
        }

        if (targetTable === 'HRP1001') {
            setHrp1001File(file);
            setHrp1001Summary(null);
        } else {
            setHrp1002File(file);
            setHrp1002Summary(null);
        }
    };

    const handleUploadInfoData = async () => {
        if (!infoDataFile) {
            message.warning('กรุณาเลือกไฟล์ก่อนอัปโหลด');
            return;
        }

        setInfoDataUploading(true);
        try {
            const result = await uploadInfoDataFile(infoDataFile, infoDataReplaceExisting, token);

            if (!result?.success || !result.data) {
                notification.error({
                    title: 'อัปโหลดไม่สำเร็จ',
                    description: result?.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
                });
                return;
            }

            setInfoDataSummary(result.data);
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
            setInfoDataUploading(false);
        }
    };

    const handleUploadHrpData = async (targetTable: HrpTargetTable) => {
        const selectedFile = targetTable === 'HRP1001' ? hrp1001File : hrp1002File;
        const replaceExisting = targetTable === 'HRP1001' ? hrp1001ReplaceExisting : hrp1002ReplaceExisting;
        const setUploading = targetTable === 'HRP1001' ? setHrp1001Uploading : setHrp1002Uploading;
        const setSummary = targetTable === 'HRP1001' ? setHrp1001Summary : setHrp1002Summary;

        if (!selectedFile) {
            message.warning('กรุณาเลือกไฟล์ก่อนอัปโหลด');
            return;
        }

        setUploading(true);
        try {
            const result = await uploadHrpDataFile(selectedFile, replaceExisting, targetTable, token);

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
                description: `นำเข้าข้อมูลเข้า ${result.data.targetTable} จำนวน ${result.data.insertedRows.toLocaleString()} แถว`
            });
        } catch (error) {
            console.error(`Failed to upload ${targetTable} file:`, error);
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

            <Tabs
                defaultActiveKey="infodata"
                items={[
                    {
                        key: 'infodata',
                        label: 'InfoData',
                        children: (
                            <div className="space-y-6">
                                <Card title="Upload File">
                                    <div className="space-y-4">
                                        <div>
                                            <Text strong>ไฟล์ที่รองรับ:</Text>{' '}
                                            <Text>{acceptedFormatText}</Text>
                                        </div>

                                        <input
                                            type="file"
                                            accept=".csv,.xlsx"
                                            onChange={handleSelectInfoDataFile}
                                            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                        />

                                        <Checkbox
                                            checked={infoDataReplaceExisting}
                                            onChange={(event) => setInfoDataReplaceExisting(event.target.checked)}
                                        >
                                            ลบข้อมูลเดิมในตาราง InfoData ก่อนนำเข้า
                                        </Checkbox>

                                        <div className="flex items-center gap-3">
                                            <Button
                                                type="primary"
                                                loading={infoDataUploading}
                                                disabled={!infoDataFile}
                                                onClick={handleUploadInfoData}
                                            >
                                                Upload เข้า InfoData
                                            </Button>

                                            <Text type="secondary">
                                                {infoDataFile ? `ไฟล์ที่เลือก: ${infoDataFile.name}` : 'ยังไม่ได้เลือกไฟล์'}
                                            </Text>
                                        </div>
                                    </div>
                                </Card>

                                <Card title="Required Columns">
                                    <div className="flex flex-wrap gap-2">
                                        {REQUIRED_COLUMNS.map((column) => (
                                            <Tag key={column} color="blue">{column}</Tag>
                                        ))}
                                    </div>
                                </Card>

                                {infoDataSummary && (
                                    <ImportSummaryCard summary={infoDataSummary} />
                                )}
                            </div>
                        )
                    },
                    {
                        key: 'hrp1001',
                        label: 'HRP1001',
                        children: (
                            <div className="space-y-6">
                                <Card title="Upload HRP1001">
                                    <div className="space-y-4">
                                        <div>
                                            <Text strong>ไฟล์ที่รองรับ:</Text>{' '}
                                            <Text>{acceptedFormatText}</Text>
                                        </div>
                                        <div>
                                            <Text strong>ชื่อไฟล์ที่อนุญาต:</Text>{' '}
                                            <Text>HRP1001O.csv, HRP1001S.csv (นำเข้าเข้า HRP1001)</Text>
                                        </div>

                                        <input
                                            type="file"
                                            accept=".csv,.xlsx"
                                            onChange={(event) => handleSelectHrpFile(event, 'HRP1001')}
                                            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                        />

                                        <Checkbox
                                            checked={hrp1001ReplaceExisting}
                                            onChange={(event) => setHrp1001ReplaceExisting(event.target.checked)}
                                        >
                                            ลบข้อมูลเดิมในตาราง HRP1001 ก่อนนำเข้า
                                        </Checkbox>

                                        <div className="flex items-center gap-3">
                                            <Button
                                                type="primary"
                                                loading={hrp1001Uploading}
                                                disabled={!hrp1001File}
                                                onClick={() => handleUploadHrpData('HRP1001')}
                                            >
                                                Upload เข้า HRP1001
                                            </Button>

                                            <Text type="secondary">
                                                {hrp1001File ? `ไฟล์ที่เลือก: ${hrp1001File.name}` : 'ยังไม่ได้เลือกไฟล์'}
                                            </Text>
                                        </div>
                                    </div>
                                </Card>

                                {hrp1001Summary && (
                                    <ImportSummaryCard
                                        summary={hrp1001Summary}
                                        sourceFile={hrp1001Summary.sourceFile}
                                        targetTable={hrp1001Summary.targetTable}
                                    />
                                )}
                            </div>
                        )
                    },
                    {
                        key: 'hrp1002',
                        label: 'HRP1002',
                        children: (
                            <div className="space-y-6">
                                <Card title="Upload HRP1002">
                                    <div className="space-y-4">
                                        <div>
                                            <Text strong>ไฟล์ที่รองรับ:</Text>{' '}
                                            <Text>{acceptedFormatText}</Text>
                                        </div>
                                        <div>
                                            <Text strong>ชื่อไฟล์ที่อนุญาต:</Text>{' '}
                                            <Text>HRP1002.csv (นำเข้าเข้า HRP1002)</Text>
                                        </div>

                                        <input
                                            type="file"
                                            accept=".csv,.xlsx"
                                            onChange={(event) => handleSelectHrpFile(event, 'HRP1002')}
                                            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                        />

                                        <Checkbox
                                            checked={hrp1002ReplaceExisting}
                                            onChange={(event) => setHrp1002ReplaceExisting(event.target.checked)}
                                        >
                                            ลบข้อมูลเดิมในตาราง HRP1002 ก่อนนำเข้า
                                        </Checkbox>

                                        <div className="flex items-center gap-3">
                                            <Button
                                                type="primary"
                                                loading={hrp1002Uploading}
                                                disabled={!hrp1002File}
                                                onClick={() => handleUploadHrpData('HRP1002')}
                                            >
                                                Upload เข้า HRP1002
                                            </Button>

                                            <Text type="secondary">
                                                {hrp1002File ? `ไฟล์ที่เลือก: ${hrp1002File.name}` : 'ยังไม่ได้เลือกไฟล์'}
                                            </Text>
                                        </div>
                                    </div>
                                </Card>

                                {hrp1002Summary && (
                                    <ImportSummaryCard
                                        summary={hrp1002Summary}
                                        sourceFile={hrp1002Summary.sourceFile}
                                        targetTable={hrp1002Summary.targetTable}
                                    />
                                )}
                            </div>
                        )
                    }
                ]}
            />
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
