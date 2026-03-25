'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, Modal, Form, DatePicker, Select, Radio, Card, Popconfirm, App, Badge } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/th';
import locale from 'antd/es/date-picker/locale/th_TH';
import { CalendarCog, Trash2, Clock, CheckCircle, Info } from 'lucide-react';
import { addCalendarEventAction, deleteCalendarEventAction } from './actions';
import { checkCalendarDuplicate, CalendarConfig, createCalendarConfig } from '@/services/calendarService';

dayjs.extend(utc);
dayjs.locale('th');

interface CalendarClientProps {
    initialEvents: CalendarConfig[];
    token: string;
    currentUser: any;
}

export default function CalendarClient({ initialEvents, token, currentUser }: CalendarClientProps) {
    const { message: messageApi, notification } = App.useApp();
    const [events, setEvents] = useState<CalendarConfig[]>(initialEvents);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [viewDate, setViewDate] = useState(dayjs());

    const getListData = useCallback((value: Dayjs) => {
        const dateStr = value.format('YYYY-MM-DD');
        return events.filter((event) => {
            if (!event.start) return false;
            return dayjs.utc(event.start).format('YYYY-MM-DD') === dateStr;
        }).filter((event, index, self) => 
            index === self.findIndex((e) => (
                e.resourceId === event.resourceId && 
                dayjs.utc(e.start).format('YYYY-MM-DD HH:mm') === dayjs.utc(event.start).format('YYYY-MM-DD HH:mm')
            ))
        );
    }, [events]);

    const handleDelete = async (id: string) => {
        setLoading(true);
        try {
            const res = await deleteCalendarEventAction(id, currentUser.employeeID || 'SYSTEM', token);
            if (res.success) {
                setEvents(prev => prev.filter(e => String(e.id) !== id));
                notification.success({ message: 'สำเร็จ', description: 'ลบข้อมูลเรียบร้อยแล้ว' });
            } else {
                messageApi.error(res.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const onSelect = (newValue: Dayjs, info: { source: 'year' | 'month' | 'date' | 'customize' }) => {
        if (info.source === 'date') {
            setIsModalOpen(true);
            form.setFieldsValue({
                date: newValue,
                type: 3,
                time: dayjs('08:00', 'HH:mm'),
                recurring: false,
            });
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const { date, type, time, recurring } = values;
            const configDate = date.format('DD/MM/YYYY');
            const timeWarning = time ? time.format('HH:mm') : '08:00';
            const employeeId = currentUser.employeeID || 'SYSTEM';

            setLoading(true);
            
            if (!recurring) {
                const dupRes = await checkCalendarDuplicate(date.month() + 1, date.format('YYYY'), type, token);
                if (dupRes && dupRes.status === 200 && dupRes.count > 0) {
                    messageApi.warning('ไม่สามารถกำหนดวันซ้ำในแต่ละเดือนได้');
                    setLoading(false);
                    return;
                }
            }

            if (recurring) {
                const promises = [];
                for (let m = 0; m < 12; m++) {
                    const d = dayjs().year(date.year()).month(m).date(date.date());
                    if (d.month() === m) {
                        promises.push(createCalendarConfig({
                            configDate: d.format('DD/MM/YYYY'),
                            configType: type,
                            timeWarning,
                            createBy: employeeId
                        }, token));
                    }
                }
                await Promise.all(promises);
                notification.success({ message: 'สำเร็จ', description: 'บันทึกข้อมูลแบบรายเดือนเรียบร้อย' });
                window.location.reload(); // Hard refresh to get all events
            } else {
                const res = await addCalendarEventAction({
                    configDate,
                    configType: type,
                    timeWarning,
                    createBy: employeeId
                }, token);

                if (res.success) {
                    notification.success({ message: 'สำเร็จ', description: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
                    window.location.reload();
                } else {
                    messageApi.error(res.message);
                }
            }
            setIsModalOpen(false);
            form.resetFields();
        } catch (error) {
            console.error('Validate Failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const cellRender = (value: Dayjs, info: { originNode: React.ReactNode, type: string }) => {
        if (info.type === 'date') {
            if (value.month() !== viewDate.month()) return null;
            
            const listData = getListData(value);
            return (
                <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[90px] scrollbar-hide py-1">
                    {listData.map((item, index) => {
                        const isStart = item.resourceId === 3;
                        const isEnd = item.resourceId === 1;
                        const colorClass = isStart ? 'bg-amber-100 text-amber-700 border-amber-200' : isEnd ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                        const dotClass = isStart ? 'bg-amber-500' : isEnd ? 'bg-rose-500' : 'bg-emerald-500';
                        
                        return (
                            <div key={`${item.id}-${index}`} className="group relative">
                                <div className={`text-[10px] md:text-[11px] leading-tight py-1 px-2 rounded-lg border flex justify-between items-center shadow-xs transition-all hover:shadow-md ${colorClass}`}>
                                    <div className="flex items-center gap-1 truncate font-bold">
                                        <div className={`w-1.5 h-1.5 rounded-full ${dotClass} shrink-0`} />
                                        <span>{dayjs.utc(item.start).format('HH:mm')}</span>
                                        <span className="truncate opacity-80 uppercase tracking-tighter hidden md:inline">
                                            {isStart ? 'START' : isEnd ? 'END' : 'WATCH'}
                                        </span>
                                    </div>
                                    <Popconfirm
                                        title="ลบรายการแจ้งเตือนนี้?"
                                        onConfirm={(e) => {
                                            e?.stopPropagation();
                                            handleDelete(String(item.id));
                                        }}
                                        okText="ลบ"
                                        cancelText="ยกเลิก"
                                        okButtonProps={{ danger: true, size: 'small' }}
                                    >
                                        <Trash2 
                                            size={12} 
                                            className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0 text-slate-400 hover:text-red-500" 
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </Popconfirm>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return info.originNode;
    };

    return (
        <div className="w-full bg-slate-50 min-h-screen p-6 calendar-client-modern">
            <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-4 shadow-md mb-6 text-white flex items-center gap-3">
                <CalendarCog className="text-2xl" />
                <h1 className="text-xl font-bold m-0 text-white">กำหนดวันสำหรับการบันทึกและตรวจสอบ</h1>
            </div>

            <Card className="shadow-lg border-slate-200 rounded-2xl overflow-hidden p-0" styles={{ body: { padding: 0 } }}>
                <Calendar
                    cellRender={cellRender as any}
                    onSelect={onSelect}
                    onPanelChange={(date) => setViewDate(date)}
                    locale={locale}
                    fullscreen={true}
                    headerRender={({ value, onChange }) => {
                        const months = [
                            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                        ];
                        const monthOptions = months.map((m, i) => ({ value: i, label: m }));
                        const year = value.year();
                        const month = value.month();
                        const yearOptions = [];
                        for (let i = year + 5; i >= year - 5; i -= 1) {
                            yearOptions.push({ value: i, label: `${i + 543}` });
                        }

                        return (
                            <div className="p-4 flex flex-wrap justify-between items-center bg-white border-b gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Badge status="warning" text="เริ่มบันทึก" />
                                        <Badge status="error" text="สิ้นสุดการบันทึก" />
                                        <Badge status="success" text="แจ้งเตือน" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Select
                                        size="large"
                                        className="w-32"
                                        value={year}
                                        options={yearOptions}
                                        onChange={(newYear) => {
                                            const now = value.clone().year(newYear);
                                            setViewDate(now);
                                            onChange(now);
                                        }}
                                    />
                                    <Select
                                        size="large"
                                        className="w-44"
                                        value={month}
                                        options={monthOptions}
                                        onChange={(newMonth) => {
                                            const now = value.clone().month(newMonth);
                                            setViewDate(now);
                                            onChange(now);
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    }}
                    className="modern-calendar-grid"
                />
            </Card>

            <Modal
                title={<div className="font-bold text-lg border-b pb-3 mb-2 flex items-center gap-2"><Clock size={20} className="text-blue-500" /> ตั้งค่าวันแจ้งเตือน</div>}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={() => setIsModalOpen(false)}
                okText="บันทึกข้อมูล"
                cancelText="ยกเลิก"
                confirmLoading={loading}
                okButtonProps={{ className: 'bg-blue-600 font-bold px-10 h-11 rounded-lg shadow-md' }}
                cancelButtonProps={{ className: 'px-8 h-11 rounded-lg' }}
                width={500}
            >
                <div className="py-6">
                    <Form form={form} layout="vertical" requiredMark={false}>
                        <Form.Item name="date" label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">วันที่เลือก</span>}>
                            <DatePicker format="DD/MM/YYYY" className="w-full h-11 bg-slate-50 font-bold" disabled />
                        </Form.Item>

                        <Form.Item 
                            name="type" 
                            label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">ประเภทการแจ้งเตือน</span>} 
                            rules={[{ required: true }]}
                        >
                            <Select size="large" className="w-full">
                                <Select.Option value={3}>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> วันที่แจ้งเตือนเริ่มบันทึก</div>
                                </Select.Option>
                                <Select.Option value={1}>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /> วันที่สิ้นสุดการบันทึก</div>
                                </Select.Option>
                                <Select.Option value={2}>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> วันที่แจ้งเตือนทั่วไป</div>
                                </Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item 
                            name="time" 
                            label={<span className="font-bold text-slate-600 uppercase text-xs tracking-wider">เวลาที่แจ้งเตือน</span>} 
                            rules={[{ required: true }]}
                        >
                            <DatePicker picker="time" format="HH:mm" className="w-full h-11" size="large" showNow={false} />
                        </Form.Item>

                        <Form.Item name="recurring" className="mb-0 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <Radio.Group className="w-full">
                                <Space direction="vertical" className="w-full">
                                    <Radio value={false} className="font-medium text-slate-700">เฉพาะวันที่เลือกนี้เท่านั้น</Radio>
                                    <Radio value={true} className="font-medium text-slate-700 font-bold text-blue-600 italic">ตั้งค่าซ้ำในทุกๆ เดือนของปีนี้</Radio>
                                </Space>
                            </Radio.Group>
                        </Form.Item>
                    </Form>
                </div>
            </Modal>

            <style jsx global>{`
                .modern-calendar-grid .ant-picker-calendar-date {
                    border-top: 1px solid #f1f5f9 !important;
                    height: 140px !important;
                    margin: 0 !important;
                    padding: 4px 8px !important;
                }
                .modern-calendar-grid .ant-picker-calendar-date-value {
                    font-weight: 800 !important;
                    color: #64748b !important;
                    font-size: 16px !important;
                }
                .modern-calendar-grid .ant-picker-cell-today .ant-picker-calendar-date-value {
                    color: #2563eb !important;
                    background: #eff6ff !important;
                    width: 30px !important;
                    height: 30px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 50% !important;
                }
                .modern-calendar-grid .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-calendar-date {
                    background-color: #f8faff !important;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .calendar-client-modern .ant-picker-calendar-full {
                    background: white !important;
                }
            `}</style>
        </div>
    );
}
