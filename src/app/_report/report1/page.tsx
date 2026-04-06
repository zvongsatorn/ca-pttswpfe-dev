'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Card, Form, Space, Checkbox, Row, Col, Popover, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import {
  SearchOutlined, FileExcelOutlined, ReloadOutlined, FullscreenOutlined,     // <--- เพิ่ม
  FullscreenExitOutlined, SettingOutlined
} from '@ant-design/icons';
import { ChevronDown, Search, Check } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

// --- เพิ่ม Import สำหรับ Export ---
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

dayjs.locale('th');

// --- 1. Type Definitions ---
interface DataType {
  key: string;
  unit: string;
  children?: DataType[];
  [key: string]: any;
}

interface MultiSelectFilterProps {
  label: string; options: string[]; selectedValues: string[];
  onChange: (values: string[]) => void; width?: string;
}
function MultiSelectFilter({ label, options, selectedValues, onChange, width = "w-64" }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) onChange(selectedValues.filter(v => v !== option));
    else onChange([...selectedValues, option]);
  };
  const handleSelectAll = () => {
    if (selectedValues.length === options.length) onChange([]);
    else onChange(options);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className={`${width} min-h-[32px] px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
        <div className="truncate flex gap-1 flex-wrap">
          {selectedValues.length === 0 ? <span className="text-gray-400">{label}...</span> :
            selectedValues.length === options.length ? <span className="text-blue-600 font-medium">เลือกทั้งหมด ({options.length})</span> :
              <span className="text-gray-800">{selectedValues.length} รายการ</span>}
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[60] overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" placeholder="ค้นหา..." className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length > 0 && (
              <div className="flex items-center px-2 py-2 hover:bg-blue-50 rounded cursor-pointer mb-1 border-b border-gray-50" onClick={handleSelectAll}>
                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedValues.length === options.length && options.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {selectedValues.length === options.length && options.length > 0 && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm font-semibold text-blue-700">เลือกทั้งหมด</span>
              </div>
            )}
            {filteredOptions.map(option => (
              <div key={option} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleOption(option)}>
                <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors ${selectedValues.includes(option) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {selectedValues.includes(option) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm text-gray-700 truncate" title={option}>{option}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

}
const datasetOptions = ['ปกติ', 'PoolRS', 'Sec Pool'];
// --- 2. Helper Functions ---
const levels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '4-8', 'รวม'];

const generateLevelColumns = (parentKey: string, bgClass: string = '') => {
  return levels.map((level, index) => ({
    title: level,
    dataIndex: `${parentKey}_${index}`,
    key: `${parentKey}_${index}`,
    width: 60,
    align: 'center' as const,
    className: bgClass,
    onHeaderCell: () => {
      let className = ''; // เริ่มต้นด้วยค่าว่าง

      // -------------------------------------------------------
      // Step 1: กำหนด "ธีมสีหลัก" ตาม Parent Group (parentKey)
      // -------------------------------------------------------
      if (parentKey.includes('frame_staff') || parentKey.includes('frame_sec')) {
        // กลุ่ม "กรอบ" -> ธีมสีน้ำเงิน
        className = 'bg-blue-50! text-blue-800!';



      } else if (parentKey.includes('people')) {
        // กลุ่ม "คน" -> ธีมสีส้ม
        className = 'bg-orange-50! text-orange-800!';



      } else if (parentKey.includes('vacancy')) {
        // กลุ่ม "ว่าง" -> ธีมสีแดง
        className = 'bg-red-50! text-red-800!';


      }

      if (level === 'รวม') {
        className = '!bg-yellow-200 !text-yellow-900 !font-bold ';
      }
      return { className };
    },
  }));
};

// --- 3. Mock Data ---
const initialData: DataType[] = [
  {
    key: '1',
    unit: '1. สำนักงานใหญ่',
    // ผลรวมคำนวณจากลูก (1-1 + 1-2)
    frame_staff_0: 0, frame_staff_1: 1, frame_staff_2: 3, frame_staff_3: 10, frame_staff_4: 33, frame_staff_5: 28, frame_staff_6: 0, frame_staff_7: 75,
    people_normal_0: 0, people_normal_1: 1, people_normal_2: 3, people_normal_3: 9, people_normal_4: 31, people_normal_5: 26, people_normal_6: 0, people_normal_7: 70,
    frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
    people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
    sum_frame_normal: 26, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 75,
    sum_people_normal: 24, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 70,
    recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 5,
    contact_out: 6, contact_out_sub: 0,
    children: [
      {
        key: '1-1',
        unit: 'ปธบ./กผญ.',
        // ผลรวมคำนวณจากลูก (1-1-1 + 1-1-2)
        frame_staff_0: 0, frame_staff_1: 1, frame_staff_2: 2, frame_staff_3: 7, frame_staff_4: 25, frame_staff_5: 28, frame_staff_6: 0, frame_staff_7: 63,
        people_normal_0: 0, people_normal_1: 1, people_normal_2: 2, people_normal_3: 6, people_normal_4: 23, people_normal_5: 26, people_normal_6: 0, people_normal_7: 58,
        frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
        people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
        sum_frame_normal: 26, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 63,
        sum_people_normal: 24, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 58,
        recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 5,
        contact_out: 6, contact_out_sub: 0,
        children: [
          {
            key: '1-1-1', unit: 'ปธบ./กผญ.ขึ้นตรง',
            frame_staff_0: 0, frame_staff_1: 1, frame_staff_2: 2, frame_staff_3: 5, frame_staff_4: 10, frame_staff_5: 8, frame_staff_6: 0, frame_staff_7: 26,
            people_normal_0: 0, people_normal_1: 1, people_normal_2: 2, people_normal_3: 4, people_normal_4: 9, people_normal_5: 8, people_normal_6: 0, people_normal_7: 24,
            frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
            people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
            sum_frame_normal: 26, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 26,
            sum_people_normal: 24, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 24,
            recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 2,
            contact_out: 1, contact_out_sub: 0
          },
          {
            key: '1-1-2', unit: 'รพญ.1',
            frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 0, frame_staff_3: 2, frame_staff_4: 15, frame_staff_5: 20, frame_staff_6: 0, frame_staff_7: 37,
            people_normal_0: 0, people_normal_1: 0, people_normal_2: 0, people_normal_3: 2, people_normal_4: 14, people_normal_5: 18, people_normal_6: 0, people_normal_7: 34,
            frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
            people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
            sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 37,
            sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 34,
            recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 3,
            contact_out: 5, contact_out_sub: 0
          },
        ]
      },
      {
        key: '1-2',
        unit: 'ผตญ.',
        frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 1, frame_staff_3: 3, frame_staff_4: 8, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 12,
        people_normal_0: 0, people_normal_1: 0, people_normal_2: 1, people_normal_3: 3, people_normal_4: 8, people_normal_5: 0, people_normal_6: 0, people_normal_7: 12,
        frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
        people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
        sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 12,
        sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 12,
        recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 0,
        contact_out: 0, contact_out_sub: 0,
        children: [
          {
            key: '1-2-1', unit: 'ผตญ.ขึ้นตรง',
            frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 1, frame_staff_3: 3, frame_staff_4: 8, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 12,
            people_normal_0: 0, people_normal_1: 0, people_normal_2: 1, people_normal_3: 3, people_normal_4: 8, people_normal_5: 0, people_normal_6: 0, people_normal_7: 12,
            frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
            people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
            sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 12,
            sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 12,
            recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 0,
            contact_out: 0, contact_out_sub: 0
          }
        ]
      },
    ],
  },
  {
    key: '2',
    unit: '2. กลุ่มธุรกิจปิโตรเลี่ยมขั้นต้นฯ',
    frame_staff_0: 0, frame_staff_1: 1, frame_staff_2: 2, frame_staff_3: 4, frame_staff_4: 0, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 7,
    people_normal_0: 0, people_normal_1: 1, people_normal_2: 2, people_normal_3: 3, people_normal_4: 0, people_normal_5: 0, people_normal_6: 0, people_normal_7: 6,
    frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
    people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
    sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 7,
    sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 6,
    recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 1,
    contact_out: 2, contact_out_sub: 0,
    children: [
      {
        key: '2-1',
        unit: 'ปธต.',
        frame_staff_0: 0, frame_staff_1: 1, frame_staff_2: 2, frame_staff_3: 4, frame_staff_4: 0, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 7,
        people_normal_0: 0, people_normal_1: 1, people_normal_2: 2, people_normal_3: 3, people_normal_4: 0, people_normal_5: 0, people_normal_6: 0, people_normal_7: 6,
        frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
        people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
        sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 7,
        sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 6,
        recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 1,
        contact_out: 2, contact_out_sub: 0
      }
    ]
  },
  {
    key: '3',
    unit: '3. กลุ่มธุรกิจใหม่และความยั่งยืน',
    frame_staff_0: 1, frame_staff_1: 0, frame_staff_2: 1, frame_staff_3: 3, frame_staff_4: 14, frame_staff_5: 11, frame_staff_6: 0, frame_staff_7: 30,
    people_normal_0: 1, people_normal_1: 0, people_normal_2: 1, people_normal_3: 2, people_normal_4: 13, people_normal_5: 10, people_normal_6: 0, people_normal_7: 27,
    frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
    people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
    sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 30,
    sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 27,
    recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 3,
    contact_out: 0, contact_out_sub: 0,
    children: [
      {
        key: '3-1', unit: 'ปธม.',
        frame_staff_0: 1, frame_staff_1: 0, frame_staff_2: 0, frame_staff_3: 0, frame_staff_4: 0, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 1,
        people_normal_0: 1, people_normal_1: 0, people_normal_2: 0, people_normal_3: 0, people_normal_4: 0, people_normal_5: 0, people_normal_6: 0, people_normal_7: 1,
        frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
        people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
        sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 1,
        sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 1,
        recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 0,
        contact_out: 0, contact_out_sub: 0
      },
      {
        key: '3-2', unit: 'ปธม.ขึ้นตรง',
        frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 0, frame_staff_3: 2, frame_staff_4: 3, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 5,
        people_normal_0: 0, people_normal_1: 0, people_normal_2: 0, people_normal_3: 1, people_normal_4: 3, people_normal_5: 0, people_normal_6: 0, people_normal_7: 4,
        frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
        people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
        sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 5,
        sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 4,
        recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 1,
        contact_out: 0, contact_out_sub: 0
      },
      {
        key: '3-3',
        unit: '> รยย.',
        frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 1, frame_staff_3: 1, frame_staff_4: 11, frame_staff_5: 11, frame_staff_6: 0, frame_staff_7: 24,
        people_normal_0: 0, people_normal_1: 0, people_normal_2: 1, people_normal_3: 1, people_normal_4: 10, people_normal_5: 10, people_normal_6: 0, people_normal_7: 22,
        frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
        people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
        sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 24,
        sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 22,
        recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 2,
        contact_out: 0, contact_out_sub: 0,
        children: [
          {
            key: '3-3-1', unit: 'รยย.ขึ้นตรง',
            frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 1, frame_staff_3: 1, frame_staff_4: 0, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 2,
            people_normal_0: 0, people_normal_1: 0, people_normal_2: 1, people_normal_3: 1, people_normal_4: 0, people_normal_5: 0, people_normal_6: 0, people_normal_7: 2,
            frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
            people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
            sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 2,
            sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 2,
            recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 0,
            contact_out: 0, contact_out_sub: 0
          },
          {
            key: '3-3-2', unit: '-> ผคย.',
            frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 0, frame_staff_3: 0, frame_staff_4: 5, frame_staff_5: 5, frame_staff_6: 0, frame_staff_7: 10,
            people_normal_0: 0, people_normal_1: 0, people_normal_2: 0, people_normal_3: 0, people_normal_4: 4, people_normal_5: 4, people_normal_6: 0, people_normal_7: 8,
            frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
            people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
            sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 10,
            sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 8,
            recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 2,
            contact_out: 0, contact_out_sub: 0
          },
          {
            key: '3-3-3', unit: '-> พรย.',
            frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 0, frame_staff_3: 0, frame_staff_4: 6, frame_staff_5: 6, frame_staff_6: 0, frame_staff_7: 12,
            people_normal_0: 0, people_normal_1: 0, people_normal_2: 0, people_normal_3: 0, people_normal_4: 6, people_normal_5: 6, people_normal_6: 0, people_normal_7: 12,
            frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
            people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
            sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 12,
            sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 12,
            recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 0,
            contact_out: 0, contact_out_sub: 0
          },
        ]
      }
    ],
  },
  {
    key: '4',
    unit: '4. กลุ่มธุรกิจขั้นปลาย',
    frame_staff_0: 1, frame_staff_1: 0, frame_staff_2: 0, frame_staff_3: 2, frame_staff_4: 2, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 5,
    people_normal_0: 1, people_normal_1: 0, people_normal_2: 0, people_normal_3: 1, people_normal_4: 2, people_normal_5: 0, people_normal_6: 0, people_normal_7: 4,
    frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
    people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
    sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 5,
    sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 4,
    recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 1,
    contact_out: 0, contact_out_sub: 0,
    children: [
      {
        key: '4-1',
        unit: 'ปธป.',
        // Frame Staff (กรอบพนักงาน)
        frame_staff_0: 1, frame_staff_1: 0, frame_staff_2: 0, frame_staff_3: 0, frame_staff_4: 0, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 1,
        // People Normal (คนปกติ)
        people_normal_0: 1, people_normal_1: 0, people_normal_2: 0, people_normal_3: 0, people_normal_4: 0, people_normal_5: 0, people_normal_6: 0, people_normal_7: 1,
        // Frame Sec (กรอบ Secondment)
        frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
        // People Sec (คน Secondment)
        people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
        // Sum (ยอดรวม)
        sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 1,
        sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 1,
        // Others
        recruit_total: 0,
        vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 0,
        contact_out: 0, contact_out_sub: 0
      },
      {
        key: '4-2',
        unit: 'ปธป.ขึ้นตรง',
        // Frame Staff
        frame_staff_0: 0, frame_staff_1: 0, frame_staff_2: 0, frame_staff_3: 2, frame_staff_4: 2, frame_staff_5: 0, frame_staff_6: 0, frame_staff_7: 4,
        // People Normal
        people_normal_0: 0, people_normal_1: 0, people_normal_2: 0, people_normal_3: 1, people_normal_4: 2, people_normal_5: 0, people_normal_6: 0, people_normal_7: 3,
        // Frame Sec
        frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
        // People Sec
        people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
        // Sum
        sum_frame_normal: 0, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 4,
        sum_people_normal: 0, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 3,
        // Others
        recruit_total: 0,
        vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 1,
        contact_out: 0, contact_out_sub: 0
      },
    ],
  },
  {
    key: 'total',
    unit: '5. รวมทุกธุรกิจ',
    // รวมทั้งหมดจาก 1 + 2 + 3 + 4 (คำนวณให้ใหม่เพื่อให้ยอดตรงกัน)
    frame_staff_0: 2, frame_staff_1: 2, frame_staff_2: 6, frame_staff_3: 19, frame_staff_4: 49, frame_staff_5: 39, frame_staff_6: 0, frame_staff_7: 117,
    people_normal_0: 2, people_normal_1: 2, people_normal_2: 6, people_normal_3: 15, people_normal_4: 46, people_normal_5: 36, people_normal_6: 0, people_normal_7: 107,
    frame_sec_0: 0, frame_sec_1: 0, frame_sec_2: 0, frame_sec_3: 0, frame_sec_4: 0, frame_sec_5: 0, frame_sec_6: 0, frame_sec_7: 0,
    people_sec_0: 0, people_sec_1: 0, people_sec_2: 0, people_sec_3: 0, people_sec_4: 0, people_sec_5: 0, people_sec_6: 0, people_sec_7: 0,
    sum_frame_normal: 26, sum_frame_pool: 0, sum_frame_trad: 0, sum_frame_newbiz: 0, sum_frame_total: 117,
    sum_people_normal: 24, sum_people_pool: 0, sum_people_trad: 0, sum_people_newbiz: 0, sum_people_total: 107,
    recruit_total: 0, vacancy_0: 0, vacancy_1: 0, vacancy_2: 0, vacancy_3: 0, vacancy_4: 0, vacancy_5: 0, vacancy_6: 0, vacancy_7: 10,
    contact_out: 8, contact_out_sub: 0
  }
];

// ตัวเลือกกลุ่มคอลัมน์
const columnOptions = [
  { label: 'กรอบพนักงาน', value: 'frame_staff' },
  { label: 'คนปกติ & Pool RS', value: 'people_normal' },
  { label: 'กรอบ Secondment', value: 'frame_sec' },
  { label: 'คน Secondment', value: 'people_sec' },
  { label: 'รวมกรอบ', value: 'total_frame' },
  { label: 'รวมคน', value: 'total_people' },
  { label: 'สรรหา', value: 'recruit' },
  { label: 'ว่าง', value: 'vacancy' },
  { label: 'Contact Out', value: 'contact_out' },
  { label: 'Contact Out สัญญาย่อย', value: 'contact_out_sub' },
];

const defaultCheckedList = columnOptions.map((opt) => opt.value);
type CheckboxValueType = string | number | boolean;


export default function Report1Page() {
  const [loading, setLoading] = useState(false);
  const [checkedList, setCheckedList] = useState<CheckboxValueType[]>(defaultCheckedList);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>(datasetOptions);
  const onSearch = (values: any) => {
    console.log('Filter Values:', values);
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  // ฟังก์ชันสลับโหมด
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const onCheckboxChange = (list: CheckboxValueType[]) => {
    setCheckedList(list);
  };


  // --- Logic การ Export Excel (ฉบับเทสี Header ตรงตามหน้าเว็บเป๊ะ) ---
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report 01');

    // --- 1. กำหนด Palette สี (ARGB Hex ตาม Tailwind Standard) ---
    const colors = {
      // Text Colors
      textBlack: 'FF000000',
      textWhite: 'FFFFFFFF',
      textBlue900: 'FF1E3A8A',   // text-blue-900
      textBlue800: 'FF1E40AF',   // text-blue-800
      textOrange900: 'FF7C2D12', // text-orange-900
      textOrange800: 'FF9A3412', // text-orange-800
      textRed900: 'FF7F1D1D',    // text-red-900
      textRed800: 'FF991B1B',    // text-red-800
      textGreen900: 'FF14532D',  // text-green-900
      textYellow900: 'FF713F12', // text-yellow-900
      textGray900: 'FF111827',   // text-gray-900

      // Background Colors
      bgWhite: 'FFFFFFFF',
      bgGray200: 'FFE5E7EB',     // bg-gray-200 (Actual Movement)

      bgBlue200: 'FFBFDBFE',     // bg-blue-200 (Header Frame)
      bgBlue100: 'FFDBEAFE',     // bg-blue-100 (Unit)
      bgBlue50: 'FFF0F9FF',      // bg-blue-50 (Sub Frame)

      bgOrange200: 'FFFED7AA',   // bg-orange-200 (Header People)
      bgOrange50: 'FFFFF7ED',    // bg-orange-50 (Sub People)

      bgRed200: 'FFFECACA',      // bg-red-200 (Header Vacancy)
      bgRed50: 'FFFEF2F2',       // bg-red-50 (Sub Vacancy)

      bgGreen200: 'FFBBF7D0',    // bg-green-200 (Header Recruit)
      bgGreen50: 'FFF0FDF4',     // bg-green-50

      bgYellow200: 'FFFEF9C3',   // bg-yellow-200 (Highlight Total)

      bgPurple300: 'FFD8B4FE',   // bg-purple-300 (Contact Out)
    };

    const isShow = (key: string) => checkedList.includes(key);

    // --- 2. เตรียม Header Arrays ---
    const headerRow1 = ['กลุ่ม/หน่วยธุรกิจ'];
    const headerRow2 = [''];
    const headerRow3 = [''];

    const dataKeys: string[] = ['unit']; // เก็บ Key เพื่อใช้ Map สี
    const colWidths: number[] = [40];

    // Helper: เติมกลุ่มข้อมูลย่อย
    const addGroup = (key: string, title: string, subCols: { title: string, key: string }[]) => {
      if (isShow(key)) {
        // **จุดที่แก้ไข**: เติมค่าว่างลงใน headerRow1 เพื่อจองพื้นที่ (อย่าเพิ่งใส่ Title Actual Movement ตรงนี้)
        subCols.forEach(() => headerRow1.push(''));

        headerRow2.push(title);
        for (let i = 1; i < subCols.length; i++) headerRow2.push('');
        subCols.forEach(col => {
          headerRow3.push(col.title);
          dataKeys.push(col.key);
          colWidths.push(10);
        });
      }
    };

    const levelCols = (prefix: string) =>
      levels.map((l, i) => ({ title: l, key: `${prefix}_${i}` }));

    // นับจำนวน Column ของ Actual Movement (เพื่อนับว่าต้อง Merge เท่าไหร่)
    let actualMoveColsCount = 0;
    if (isShow('frame_staff')) actualMoveColsCount += 8;
    if (isShow('people_normal')) actualMoveColsCount += 8;
    if (isShow('frame_sec')) actualMoveColsCount += 8;
    if (isShow('people_sec')) actualMoveColsCount += 8;
    if (isShow('total_frame')) actualMoveColsCount += 5;
    if (isShow('total_people')) actualMoveColsCount += 5;
    if (isShow('recruit')) actualMoveColsCount += 1;
    if (isShow('vacancy')) actualMoveColsCount += 8;

    // --- 3. Construct Columns ---

    // Add Sub-Groups (Actual Movement Area)
    addGroup('frame_staff', 'กรอบพนักงาน', levelCols('frame_staff'));
    addGroup('people_normal', 'คนปกติ & Pool RS', levelCols('people_normal'));
    addGroup('frame_sec', 'กรอบ Secondment', levelCols('frame_sec'));
    addGroup('people_sec', 'คน Secondment', levelCols('people_sec'));

    if (isShow('total_frame')) {
      const cols = [
        { title: 'ปกติ', key: 'sum_frame_normal' },
        { title: 'Pool RS', key: 'sum_frame_pool' },
        { title: 'Traditional', key: 'sum_frame_trad' },
        { title: 'New Biz', key: 'sum_frame_newbiz' },
        { title: 'รวม', key: 'sum_frame_total' },
      ];
      addGroup('total_frame', 'รวมกรอบ', cols);
    }
    if (isShow('total_people')) {
      const cols = [
        { title: 'คนปกติ', key: 'sum_people_normal' },
        { title: 'คน Pool RS', key: 'sum_people_pool' },
        { title: 'คน Traditional', key: 'sum_people_trad' },
        { title: 'คน New Biz', key: 'sum_people_newbiz' },
        { title: 'รวม', key: 'sum_people_total' },
      ];
      addGroup('total_people', 'รวมคน', cols);
    }

    // Recruit (Special Case: อยู่ภายใต้ Actual Movement แต่ Row 2 merge ลง Row 3)
    if (isShow('recruit')) {
      headerRow1.push(''); // จองที่ให้ Actual Movement
      headerRow2.push('สรรหา');
      headerRow3.push('');
      dataKeys.push('recruit_total');
      colWidths.push(12);
    }

    addGroup('vacancy', 'ว่าง', levelCols('vacancy'));

    // Contact Out (อยู่นอก Actual Movement -> ใส่ Title ลง headerRow1 ได้เลย)
    if (isShow('contact_out')) {
      headerRow1.push('Contact Out');
      headerRow2.push(''); headerRow3.push('');
      dataKeys.push('contact_out'); colWidths.push(15);
    }
    if (isShow('contact_out_sub')) {
      headerRow1.push('Contact Out สัญญาย่อย');
      headerRow2.push(''); headerRow3.push('');
      dataKeys.push('contact_out_sub'); colWidths.push(18);
    }

    // Add Rows
    worksheet.addRow(headerRow1);
    worksheet.addRow(headerRow2);
    worksheet.addRow(headerRow3);

    // **จุดที่แก้ไข**: ใส่ Title "Actual Movement" โดยตรงที่ Cell(1, 2) หลังจากสร้าง Row เสร็จแล้ว
    if (actualMoveColsCount > 0) {
      worksheet.getCell(1, 2).value = 'กรอบการบริหารกำลังเดือน (Actual Movement)';
    }

    // --- 4. การ Merge Cells ---
    worksheet.mergeCells(1, 1, 3, 1); // Unit

    // Merge Actual Movement Header (Row 1)
    if (actualMoveColsCount > 0) {
      worksheet.mergeCells(1, 2, 1, 1 + actualMoveColsCount);
    }

    // Merge Group Headers (Row 2)
    let currentCol = 2;
    if (isShow('frame_staff')) { worksheet.mergeCells(2, currentCol, 2, currentCol + 7); currentCol += 8; }
    if (isShow('people_normal')) { worksheet.mergeCells(2, currentCol, 2, currentCol + 7); currentCol += 8; }
    if (isShow('frame_sec')) { worksheet.mergeCells(2, currentCol, 2, currentCol + 7); currentCol += 8; }
    if (isShow('people_sec')) { worksheet.mergeCells(2, currentCol, 2, currentCol + 7); currentCol += 8; }
    if (isShow('total_frame')) { worksheet.mergeCells(2, currentCol, 2, currentCol + 4); currentCol += 5; }
    if (isShow('total_people')) { worksheet.mergeCells(2, currentCol, 2, currentCol + 4); currentCol += 5; }

    if (isShow('recruit')) { currentCol += 1; } // สรรหา ไม่ merge แนวนอน

    if (isShow('vacancy')) { worksheet.mergeCells(2, currentCol, 2, currentCol + 7); currentCol += 8; }

    // Merge แนวตั้ง (Vertical Merge)
    dataKeys.forEach((key, index) => {
      const colIdx = index + 1;
      if (key === 'contact_out' || key === 'contact_out_sub') {
        // Contact Out: Merge 1-3
        worksheet.mergeCells(1, colIdx, 3, colIdx);
      }
      if (key === 'recruit_total') {
        // Recruit: Merge 2-3
        worksheet.mergeCells(2, colIdx, 3, colIdx);
      }
    });

    // --- 5. จัด Style Header ---

    // 5.1 Set Global Border & Alignment & Default Font
    for (let r = 1; r <= 3; r++) {
      const row = worksheet.getRow(r);
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { bold: true, color: { argb: colors.textBlack }, name: 'Sarabun' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    }

    // 5.2 Paint Specific Cells based on logic

    // A. Unit Column (A1:A3)
    const unitCell = worksheet.getCell(1, 1);
    unitCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgBlue100 } };
    unitCell.font = { bold: true, color: { argb: colors.textBlue900 } };

    // B. Actual Movement (Row 1)
    if (actualMoveColsCount > 0) {
      const actMoveCell = worksheet.getCell(1, 2);
      actMoveCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray200 } };
      actMoveCell.font = { bold: true, color: { argb: colors.textGray900 }, size: 12 };
    }

    // C. Dynamic Columns (Row 2 & Row 3)
    // Loop ตาม dataKeys เพื่อเทสีให้ตรงกับคอลัมน์นั้นๆ
    dataKeys.forEach((key, idx) => {
      if (key === 'unit') return; // ข้าม Unit
      const colIndex = idx + 1;

      // ---- Logic กำหนดสี ----
      let headerBg = colors.bgWhite;
      let headerText = colors.textBlack;
      let subBg = colors.bgWhite;
      let subText = colors.textBlack;

      // 1. กลุ่ม Frame (Staff & Sec)
      if (key.includes('frame_staff') || key.includes('frame_sec') || key.includes('sum_frame')) {
        headerBg = colors.bgBlue200;     // Parent: Blue-200
        headerText = colors.textBlue900;

        subBg = colors.bgBlue50;         // Sub: Blue-50
        subText = colors.textBlue800;
      }
      // 2. กลุ่ม People (Normal & Sec)
      else if (key.includes('people_normal') || key.includes('people_sec') || key.includes('sum_people')) {
        headerBg = colors.bgOrange200;   // Parent: Orange-200
        headerText = colors.textOrange900;

        subBg = colors.bgOrange50;       // Sub: Orange-50
        subText = colors.textOrange800;
      }
      // 3. กลุ่ม Vacancy
      else if (key.includes('vacancy')) {
        headerBg = colors.bgRed200;      // Parent: Red-200
        headerText = colors.textRed900;

        subBg = colors.bgRed50;          // Sub: Red-50
        subText = colors.textRed800;
      }
      // 4. กลุ่ม Recruit
      else if (key === 'recruit_total') {
        headerBg = colors.bgGreen200;    // Parent: Green-200
        headerText = colors.textGreen900;

        subBg = colors.bgGreen200;       // Merge อยู่แล้ว
        subText = colors.textGreen900;
      }
      // 5. กลุ่ม Contact Out (สำคัญ: เทสีทับ Row 1-3 ตรงนี้เลย)
      else if (key.includes('contact_out')) {
        const cell1 = worksheet.getCell(1, colIndex);
        const cell2 = worksheet.getCell(2, colIndex);
        const cell3 = worksheet.getCell(3, colIndex);

        [cell1, cell2, cell3].forEach(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgPurple300 } };
          c.font = { bold: true, color: { argb: colors.textBlack } };
        });
        return; // จบการทำงานสำหรับ Contact Out (ไม่ต้องทำด้านล่างต่อ)
      }

      // --- Override สีสำหรับช่อง "รวม" (Total) ใน Row 3 ---
      if (key.endsWith('_7') || key === 'sum_frame_total' || key === 'sum_people_total') {
        subBg = colors.bgYellow200;
        subText = colors.textYellow900;
      }

      // --- Apply Colors (Row 2 & 3) ---
      // Row 2 (Parent Header)
      const cellRow2 = worksheet.getCell(2, colIndex);
      cellRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
      cellRow2.font = { bold: true, color: { argb: headerText } };

      // Row 3 (Sub Header)
      const cellRow3 = worksheet.getCell(3, colIndex);
      if (key !== 'recruit_total') { // Recruit ทำไปแล้ว
        cellRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subBg } };
        cellRow3.font = { bold: true, color: { argb: subText } };
      }
    });


    // --- 6. เติม Data ---
    const processData = (data: DataType[], depth: number = 0) => {
      data.forEach((item) => {
        const rowData: any[] = [];
        const indent = '    '.repeat(depth);
        rowData.push(indent + item.unit);

        for (let i = 1; i < dataKeys.length; i++) {
          const key = dataKeys[i];
          const value = item[key];
          rowData.push((value !== undefined && value !== null) ? value : '');
        }
        const row = worksheet.addRow(rowData);

        const isRootHeader = depth === 0; // แถว Parent

        // Style Data Cells
        row.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

          let cellColor = colors.bgWhite;
          // ถ้าเป็นแถว Root Header (1., 2.) ให้เป็นสีฟ้าอ่อน
          if (isRootHeader) {
            cellColor = colors.bgBlue50;
            cell.font = { bold: true };
          }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellColor } };
        });

        if (item.children) processData(item.children, depth + 1);
      });
    };

    processData(initialData);
    worksheet.columns = colWidths.map(w => ({ width: w }));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Report_01_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  // Columns แบบ Dynamic (คงเดิมไว้)
  const columns: ColumnsType<DataType> = useMemo(() => {
    const isShow = (key: string) => checkedList.includes(key);
    const bgWhite = 'bg-white';
    const bgBlue = 'bg-blue-50';
    const bgGreen = 'bg-green-50';
    const bgYellow = 'bg-yellow-50';
    const bgRed = 'bg-red-50';


    return [
      {
        title: 'กลุ่ม/หน่วยธุรกิจ',
        dataIndex: 'unit',
        key: 'unit',
        fixed: 'left',
        width: 220,
        className: 'bg-white z-20',
        onHeaderCell: () => ({
          className: 'bg-blue-100! text-blue-900! font-bold',
        }),
        render: (text: any) => <span className="font-medium text-gray-700">{text}</span>
      },
      {
        title: 'กรอบการบริหารกำลังเดือน (Actual Movement)',
        onHeaderCell: () => ({
          className: 'bg-gray-200! text-gray-900! font-bold! text-[12px]!'
        }),
        children: [
          ...(isShow('frame_staff') ? [{
            title: 'กรอบพนักงาน',
            onHeaderCell: () => ({
              className: 'bg-blue-200! text-blue-900! font-bold! text-[12px]!'
            }),
            children: generateLevelColumns('frame_staff', bgWhite)
          }] : []),
          ...(isShow('people_normal') ? [{
            title: 'คนปกติ & Pool RS',
            onHeaderCell: () => ({
              className: 'bg-orange-200! text-orange-900! font-bold! text-[12px]!'
            }), children: generateLevelColumns('people_normal', bgWhite)
          }] : []),
          ...(isShow('frame_sec') ? [{
            title: 'กรอบ Secondment',
            onHeaderCell: () => ({
              className: 'bg-blue-200! text-blue-900! font-bold! text-[12px]!'
            }),
            children: generateLevelColumns('frame_sec', bgWhite)
          }] : []),
          ...(isShow('people_sec') ? [{
            title: 'คน Secondment',
            onHeaderCell: () => ({
              className: 'bg-orange-200! text-orange-900! font-bold! text-[12px]!'
            }), children: generateLevelColumns('people_sec', bgWhite)
          }] : []),
          ...(isShow('total_frame') ? [{
            title: 'รวมกรอบ',
            onHeaderCell: () => ({
              className: 'bg-blue-200! text-blue-900! font-bold! text-[12px]!'
            }),
            children: [
              { title: 'ปกติ', onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-800! ' }), dataIndex: 'sum_frame_normal', width: 60, align: 'center' as const, className: bgWhite },
              { title: 'Pool RS', onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-800! ' }), dataIndex: 'sum_frame_pool', width: 70, align: 'center' as const, className: bgWhite },
              { title: 'Traditional', onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-800! ' }), dataIndex: 'sum_frame_trad', width: 80, align: 'center' as const, className: bgWhite },
              { title: 'New Biz', onHeaderCell: () => ({ className: 'bg-blue-50! text-blue-800! ' }), dataIndex: 'sum_frame_newbiz', width: 80, align: 'center' as const, className: bgWhite },
              { title: 'รวม', onHeaderCell: () => ({ className: 'bg-yellow-200! text-yellow-900! ' }), dataIndex: 'sum_frame_total', width: 60, align: 'center' as const, className: `${bgWhite} ` },
            ],
          }] : []),
          ...(isShow('total_people') ? [{
            title: 'รวมคน',
            onHeaderCell: () => ({
              className: 'bg-orange-200! text-orange-900! font-bold! text-[12px]!'
            }),
            children: [
              { title: 'คนปกติ', onHeaderCell: () => ({ className: 'bg-orange-50! text-orange-800! ' }), dataIndex: 'sum_people_normal', width: 60, align: 'center' as const, className: bgWhite },
              { title: 'คน Pool RS', onHeaderCell: () => ({ className: 'bg-orange-50! text-orange-800! ' }), dataIndex: 'sum_people_pool', width: 80, align: 'center' as const, className: bgWhite },
              { title: 'คน Traditional', onHeaderCell: () => ({ className: 'bg-orange-50! text-orange-800! ' }), dataIndex: 'sum_people_trad', width: 90, align: 'center' as const, className: bgWhite },
              { title: 'คน New Biz', onHeaderCell: () => ({ className: 'bg-orange-50! text-orange-800! ' }), dataIndex: 'sum_people_newbiz', width: 80, align: 'center' as const, className: bgWhite },
              { title: 'รวม', onHeaderCell: () => ({ className: 'bg-yellow-200! text-yellow-900! ' }), dataIndex: 'sum_people_total', width: 60, align: 'center' as const, className: `${bgWhite} ` },
            ],
          }] : []),
          ...(isShow('recruit')
            ? [{
              title: 'สรรหา',
              dataIndex: 'recruit_total', // ดึงค่า recruit_total โดยตรง ไม่ต้องมี children
              key: 'recruit_total',
              width: 80,
              align: 'center' as const,
              className: bgWhite,
              // ใส่สี Header (Group Header Style)
              onHeaderCell: () => ({
                className: 'bg-green-200! text-green-900! font-bold! text-[12px]!'
              }),
            }]
            : []),
          ...(isShow('vacancy') ? [{
            title: 'ว่าง',
            onHeaderCell: () => ({
              className: 'bg-red-200! text-red-900! font-bold! text-[12px]!'
            }),
            children: generateLevelColumns('vacancy', bgWhite)
          }] : []),
          ...(isShow('contact_out') ? [{
            title: 'Contact Out',
            dataIndex: 'contact_out',
            key: 'contact_out',
            width: 100,
            align: 'center' as const,
            className: `${bgWhite}`,
            onHeaderCell: () => ({ className: 'bg-purple-300! text-black! font-bold!' })
          }] : []),

          ...(isShow('contact_out_sub') ? [{
            title: 'Contact Out สัญญาย่อย',
            dataIndex: 'contact_out_sub',
            key: 'contact_out_sub',
            width: 120,
            align: 'center' as const,
            className: `${bgWhite}`,
            onHeaderCell: () => ({ className: 'bg-purple-300! text-black! font-bold!' })
          }] : [])
        ],
      }
    ];
  }, [checkedList]);




  return (
    <Main currentPath="/report">
      <div className="space-y-6 w-full min-w-0">
        {/* Header */}
        <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold m-0 text-white">Report 01</h1>
              <span className="hidden md:inline-block text-blue-100">|</span>
              <span className="text-xl font-medium text-blue-50"> รายงานสรุปภาพรวมกรอบอัตรากำลังประจำเดือนของสายงาน</span>
            </div>
          </div >
        </div >



        {/* Filter */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">

          {/* --- ส่วนซ้าย: Form ค้นหา --- */}
          <Form
            layout="inline"
            onFinish={onSearch}
            initialValues={{ date: dayjs() }}
            className="flex items-center gap-2" // ลบ flex-1 ออกเพื่อให้มันกินพื้นที่เท่าที่จำเป็น
          >
            {/* 1. Date Picker */}
            <Form.Item name="date" label="วันที่" className="m-0" style={{ alignItems: 'center' }}>
              <DatePicker format="DD/MM/YYYY" className="w-40" />
            </Form.Item>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">แสดงข้อมูล</label>
              <MultiSelectFilter label="เลือกแสดงข้อมูล" options={datasetOptions} selectedValues={selectedDatasets} onChange={setSelectedDatasets} width="w-40" />
            </div>


            {/* 3. ปุ่มค้นหา */}
            <Form.Item className="m-0">
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                ค้นหา
              </Button>
            </Form.Item>
          </Form>
          {/* ^^^ ปิด Form ตรงนี้ เพื่อจบส่วนซ้าย ^^^ */}


          {/* --- ส่วนขวา: Action Buttons (ชิดขวาด้วย justify-between ของตัวแม่) --- */}
          <div className="flex items-center gap-2">

            {/* ปุ่มเต็มจอ: ใส่ ! นำหน้าสี เพื่อบังคับทับ Ant Design */}
            <Button
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              className={`
        border-none! shadow-sm! text-white!
        ${isFullscreen
                  ? 'bg-red-500! hover:bg-red-600!'   // สีแดงเมื่อเต็มจอ
                  : 'bg-blue-500! hover:bg-blue-600!' // สีฟ้าเมื่อปกติ
                }
      `}
            >
              {isFullscreen ? 'ปิดเต็มจอ' : 'เต็มจอ'}
            </Button>

            {/* ปุ่ม Export: ใส่ ! นำหน้าสีเช่นกัน */}
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
            >
              Excel
            </Button>

            <Popover
              placement="bottomLeft"
              trigger="click"
              content={
                <div className="w-64">
                  <div className="mb-2 font-bold text-gray-700 border-b pb-1">เลือกแสดงข้อมูล</div>
                  <Checkbox.Group
                    options={columnOptions}
                    value={checkedList}
                    onChange={onCheckboxChange}
                    className="flex flex-col gap-2"
                  />
                </div>
              }
            >
              <Button icon={<SettingOutlined />} className="text-gray-600 border-gray-300 border-dashed hover:text-blue-600 hover:border-blue-500">
                ({checkedList.length})
              </Button>
            </Popover>
          </div>

        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-4">
          <div className="w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-7.2rem)] overflow-hidden">
            <Table
              columns={columns}
              dataSource={initialData}
              loading={loading}
              bordered
              size="small"
              scroll={{
                x: Math.max(checkedList.length * 400 + 500, 1500),
                y: 600
              }}
              pagination={false}
              sticky
              expandable={{
                defaultExpandAllRows: true,
              }}
              className="[&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
              rowClassName={(record) => {
                // วิธีที่ 1: เช็คว่า key ไม่มีเครื่องหมายขีด "-" (แปลว่าเป็น Level บนสุด เช่น 1, 2, 3, total)
                if (record.key.indexOf('-') === -1) {
                  return '[&>td]:bg-blue-50! font-bold';
                }
                return '';
              }}
            />
          </div>
        </div>

      </div>
    </Main>
  );
}