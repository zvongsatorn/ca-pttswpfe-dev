'use client';

import { buildSafeRoutePathFromSearch } from '@/utils/security';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Main from '@/components/layout/main';
import { Table, DatePicker, Button, Form, Checkbox, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import {
  SearchOutlined, FileExcelOutlined, FullscreenOutlined,
  FullscreenExitOutlined, SettingOutlined
} from '@ant-design/icons';
import { FileText } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';

dayjs.locale('th');

// --- 1. Type Definitions ---
interface DataType {
  key: string;
  unit: string;
  unit_name?: string;
  children?: DataType[];
  [key: string]: unknown;
}

interface SearchFormValues {
  date?: dayjs.Dayjs;
}

const resolveUserContext = () => {
  let employeeId = 'SYSTEM';
  let userGroupNo = '';

  if (typeof window !== 'undefined') {
    const selectedGroup = localStorage.getItem('selected_usergroup')?.trim() || '';
    const userDataStr = localStorage.getItem('user_data');

    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr) as {
          employeeID?: string;
          employeeId?: string;
          EmployeeID?: string;
          roleId?: string;
          role?: string;
          userGroupNo?: string;
          userGroups?: Array<{ userGroupNo?: string }>;
        };
        const fallbackGroup = userData.userGroups?.[0]?.userGroupNo?.trim() || '';

        employeeId = (
          userData.employeeID ||
          userData.employeeId ||
          userData.EmployeeID ||
          employeeId
        ).trim();

        userGroupNo = (
          selectedGroup ||
          userData.userGroupNo ||
          userData.roleId ||
          userData.role ||
          fallbackGroup ||
          ''
        ).trim();
      } catch {
        userGroupNo = selectedGroup;
      }
    } else {
      userGroupNo = selectedGroup;
    }
  }

  return { employeeId, userGroupNo };
};
// --- 2. Helper Functions ---
const levels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '4-8', 'รวม'];

const getTotalToneByParent = (parentKey: string) => {
  if (parentKey.includes('frame')) {
    return {
      headerClass: 'report1-total-header-frame',
      cellClass: 'report1-col-total report1-col-total-frame',
    };
  }
  if (parentKey.includes('people')) {
    return {
      headerClass: 'report1-total-header-people',
      cellClass: 'report1-col-total report1-col-total-people',
    };
  }
  if (parentKey.includes('vacancy')) {
    return {
      headerClass: 'report1-total-header-vacancy',
      cellClass: 'report1-col-total report1-col-total-vacancy',
    };
  }
  return {
    headerClass: 'report1-total-header-default',
    cellClass: 'report1-col-total report1-col-total-default',
  };
};

const generateLevelColumns = (parentKey: string, bgClass: string = '') => {
  const totalTone = getTotalToneByParent(parentKey);
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
        className = totalTone.headerClass;
      }
      return { className };
    },
    onCell: () => {
      if (level === 'รวม') {
        return { className: `${totalTone.cellClass} font-semibold` };
      }
      return { className: bgClass };
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
  { label: 'ชื่อหน่วยงาน', value: 'unit_name' },
  { label: 'กรอบพนักงาน', value: 'frame_staff' },
  { label: 'คนปกติ & Pool RS', value: 'people_normal' },
  { label: 'กรอบ Secondment', value: 'frame_sec' },
  { label: 'คน Secondment', value: 'people_sec' },
  { label: 'รวมกรอบ', value: 'total_frame' },
  { label: 'รวมคน', value: 'total_people' },
  { label: 'สรรหา', value: 'recruit' },
  { label: 'ว่าง', value: 'vacancy' },
  { label: 'Contact Out สัญญาใหญ่', value: 'contact_out' },
  { label: 'Contact Out สัญญาย่อย', value: 'contact_out_sub' },
];

const defaultCheckedList = columnOptions.map((opt) => opt.value);
type CheckboxValueType = string | number | boolean;


export default function Report1Page() {
  const [loading, setLoading] = useState(false);
  const [checkedList, setCheckedList] = useState<CheckboxValueType[]>(defaultCheckedList);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [tableScrollY, setTableScrollY] = useState(600);
  const [tableData, setTableData] = useState<DataType[]>(initialData.slice(0, 0));
  const [expandedKeys, setExpandedKeys] = useState<readonly React.Key[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentSearchDate, setCurrentSearchDate] = useState<dayjs.Dayjs>(dayjs());


  const getAllKeys = (data: DataType[]): string[] => {
    let keys: string[] = [];
    data.forEach(item => {
      if (item.children && item.children.length > 0) {
        keys.push(item.key);
        keys = keys.concat(getAllKeys(item.children));
      }
    });
    return keys;
  };

  const fetchData = async (dateStr: string) => {
    setLoading(true);
    try {
      const { employeeId, userGroupNo } = resolveUserContext();
      const params = new URLSearchParams({
        effectiveDate: dateStr,
        employeeId,
        userGroupNo,
      });
      const res = await fetch(buildSafeRoutePathFromSearch('report1', params));
      const payload = await res.json();
      if (payload.status === 200 && payload.data) {
        setTableData(payload.data);
        setExpandedKeys(getAllKeys(payload.data));
      } else {
        console.error('Failed to fetch report1 data:', payload.message);
      }
    } catch (error) {
      console.error('Error fetching component data:', error);
    } finally {
      setHasSearched(true);
      setLoading(false);
    }
  };

  const onSearch = (values: SearchFormValues) => {
    const d = values.date || dayjs();
    setCurrentSearchDate(d);
    fetchData(d.format('YYYY-MM-DD'));
  };


  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await fullscreenRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen failed:', err);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!hasSearched) return;

    const updateTableHeight = () => {
      if (!tableContainerRef.current) return;
      const rect = tableContainerRef.current.getBoundingClientRect();
      // Reserve space for app/menu header + search area + table chrome to avoid outer scrollbar.
      const availableHeight = Math.floor(window.innerHeight - rect.top - 120);
      setTableScrollY(Math.max(260, availableHeight));
    };

    const raf = window.requestAnimationFrame(updateTableHeight);
    window.addEventListener('resize', updateTableHeight);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateTableHeight);
    };
  }, [hasSearched, isFullscreen, checkedList.length, tableData.length]);

  const onCheckboxChange = (list: CheckboxValueType[]) => {
    setCheckedList(list);
  };

  const handleExportExcel = async () => {
    try {
      const dateStr = currentSearchDate.format('YYYY-MM-DD');
      const isShow = (key: string) => checkedList.includes(key);
      const showUnitName = isShow('unit_name');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report 01');
      if (!tableData.length) throw new Error('ไม่พบข้อมูลสำหรับ Export');

      const colors = {
        blue50: 'FFEFF6FF',
        blue100: 'FFDBEAFE',
        blue200: 'FFBFDBFE',
        blue300: 'FF93C5FD',
        blue800: 'FF1E40AF',
        blue900: 'FF1E3A8A',
        orange50: 'FFFFF7ED',
        orange200: 'FFFED7AA',
        orange800: 'FF9A3412',
        red50: 'FFFEF2F2',
        red200: 'FFFECACA',
        red800: 'FF991B1B',
        green50: 'FFDCFCE7',
        green200: 'FFBBF7D0',
        green900: 'FF14532D',
        purple300: 'FFD8B4FE',
        white: 'FFFFFFFF',
        black: 'FF000000',
      };

      type ExportColumn = {
        key: string;
        label: string;
        subBg: string;
        subFg: string;
        bodyBg?: string;
        isTotalCol?: boolean;
        isRecruitCol?: boolean;
        isNumeric?: boolean;
      };

      type ExportGroup = {
        enabled: boolean;
        title: string;
        topBg: string;
        topFg: string;
        columns: ExportColumn[];
      };

      const exportLevels = ['21', '18-20', '16-17', '14-15', '11-13', '9-10', '4-8', 'รวม'];
      const makeLevelColumns = (
        prefix: string,
        subBg: string,
        subFg: string,
        totalHeaderBg: string,
        totalHeaderFg: string,
        totalBodyBg: string
      ): ExportColumn[] => exportLevels.map((level, i) => {
        const isTotal = level === 'รวม';
        return {
          key: `${prefix}_${i}`,
          label: level,
          subBg: isTotal ? totalHeaderBg : subBg,
          subFg: isTotal ? totalHeaderFg : subFg,
          bodyBg: isTotal ? totalBodyBg : undefined,
          isTotalCol: isTotal,
          isNumeric: true,
        };
      });

      const groups: ExportGroup[] = [
        {
          enabled: isShow('frame_staff'),
          title: 'กรอบพนักงาน',
          topBg: colors.blue200,
          topFg: colors.blue900,
          columns: makeLevelColumns('frame_staff', colors.blue50, colors.blue800, colors.blue200, colors.blue900, colors.blue50),
        },
        {
          enabled: isShow('people_normal'),
          title: 'คนปกติ & Pool RS',
          topBg: colors.orange200,
          topFg: colors.orange800,
          columns: makeLevelColumns('people_normal', colors.orange50, colors.orange800, colors.orange200, colors.orange800, colors.orange50),
        },
        {
          enabled: isShow('frame_sec'),
          title: 'กรอบ Secondment',
          topBg: colors.blue200,
          topFg: colors.blue900,
          columns: makeLevelColumns('frame_sec', colors.blue50, colors.blue800, colors.blue200, colors.blue900, colors.blue50),
        },
        {
          enabled: isShow('people_sec'),
          title: 'คน Secondment',
          topBg: colors.orange200,
          topFg: colors.orange800,
          columns: makeLevelColumns('people_sec', colors.orange50, colors.orange800, colors.orange200, colors.orange800, colors.orange50),
        },
        {
          enabled: isShow('total_frame'),
          title: 'รวมกรอบ',
          topBg: colors.blue200,
          topFg: colors.blue900,
          columns: [
            { key: 'sum_frame_normal', label: 'ปกติ', subBg: colors.blue50, subFg: colors.blue800, isNumeric: true },
            { key: 'sum_frame_pool', label: 'Pool RS', subBg: colors.blue50, subFg: colors.blue800, isNumeric: true },
            { key: 'sum_frame_trad', label: 'Traditional', subBg: colors.blue50, subFg: colors.blue800, isNumeric: true },
            { key: 'sum_frame_newbiz', label: 'New Biz', subBg: colors.blue50, subFg: colors.blue800, isNumeric: true },
            { key: 'sum_frame_total', label: 'รวม', subBg: colors.blue200, subFg: colors.blue900, bodyBg: colors.blue50, isTotalCol: true, isNumeric: true },
          ],
        },
        {
          enabled: isShow('total_people'),
          title: 'รวมคน',
          topBg: colors.orange200,
          topFg: colors.orange800,
          columns: [
            { key: 'sum_people_normal', label: 'คนปกติ', subBg: colors.orange50, subFg: colors.orange800, isNumeric: true },
            { key: 'sum_people_pool', label: 'คน Pool RS', subBg: colors.orange50, subFg: colors.orange800, isNumeric: true },
            { key: 'sum_people_trad', label: 'คน Traditional', subBg: colors.orange50, subFg: colors.orange800, isNumeric: true },
            { key: 'sum_people_newbiz', label: 'คน New Biz', subBg: colors.orange50, subFg: colors.orange800, isNumeric: true },
            { key: 'sum_people_total', label: 'รวม', subBg: colors.orange200, subFg: colors.orange800, bodyBg: colors.orange50, isTotalCol: true, isNumeric: true },
          ],
        },
        {
          enabled: isShow('recruit'),
          title: 'สรรหา',
          topBg: colors.green200,
          topFg: colors.green900,
          columns: [
            { key: 'recruit_total', label: '', subBg: colors.green200, subFg: colors.green900, bodyBg: colors.green50, isRecruitCol: true, isNumeric: true },
          ],
        },
        {
          enabled: isShow('vacancy'),
          title: 'ว่าง',
          topBg: colors.red200,
          topFg: colors.red800,
          columns: makeLevelColumns('vacancy', colors.red50, colors.red800, colors.red200, colors.red800, colors.red50),
        },
        {
          enabled: isShow('contact_out'),
          title: 'Contact Out สัญญาใหญ่',
          topBg: colors.purple300,
          topFg: colors.black,
          columns: [
            { key: 'contact_out', label: '', subBg: colors.purple300, subFg: colors.black, isNumeric: true },
          ],
        },
        {
          enabled: isShow('contact_out_sub'),
          title: 'Contact Out สัญญาย่อย',
          topBg: colors.purple300,
          topFg: colors.black,
          columns: [
            { key: 'contact_out_sub', label: '', subBg: colors.purple300, subFg: colors.black, isNumeric: true },
          ],
        },
      ];

      const topHeader: string[] = ['กลุ่ม/หน่วยธุรกิจ', ...(showUnitName ? ['ชื่อหน่วยงาน'] : [])];
      const subHeader: string[] = ['', ...(showUnitName ? [''] : [])];
      const dataKeys: string[] = ['unit', ...(showUnitName ? ['unit_name'] : [])];
      const columnMeta: ExportColumn[] = [{
        key: 'unit',
        label: 'กลุ่ม/หน่วยธุรกิจ',
        subBg: colors.blue100,
        subFg: colors.blue900,
        isNumeric: false,
      }];
      if (showUnitName) {
        columnMeta.push({
          key: 'unit_name',
          label: 'ชื่อหน่วยงาน',
          subBg: colors.blue100,
          subFg: colors.blue900,
          isNumeric: false,
        });
      }
      const groupRanges: Array<{ startCol: number; endCol: number; topBg: string; topFg: string }> = [];

      groups.forEach((group) => {
        if (!group.enabled) return;
        const startCol = dataKeys.length + 1;
        topHeader.push(group.title);
        for (let i = 1; i < group.columns.length; i += 1) topHeader.push('');

        group.columns.forEach((column) => {
          subHeader.push(column.label);
          dataKeys.push(column.key);
          columnMeta.push(column);
        });

        groupRanges.push({
          startCol,
          endCol: dataKeys.length,
          topBg: group.topBg,
          topFg: group.topFg,
        });
      });

      worksheet.columns = dataKeys.map((k) => ({
        width: k === 'unit' ? 40 : k === 'unit_name' ? 32 : (k === 'contact_out_sub' ? 20 : 12),
      }));

      const topHeaderRow = worksheet.addRow(topHeader);
      const subHeaderRow = worksheet.addRow(subHeader);
      topHeaderRow.height = 24;
      subHeaderRow.height = 24;

      worksheet.mergeCells(1, 1, 2, 1);
      const unitHeaderCell = worksheet.getCell(1, 1);
      unitHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.blue100 } };
      unitHeaderCell.font = { bold: true, name: 'Sarabun', color: { argb: colors.blue900 } };
      unitHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
      unitHeaderCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      if (showUnitName) {
        worksheet.mergeCells(1, 2, 2, 2);
        const unitNameHeaderCell = worksheet.getCell(1, 2);
        unitNameHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.blue100 } };
        unitNameHeaderCell.font = { bold: true, name: 'Sarabun', color: { argb: colors.blue900 } };
        unitNameHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
        unitNameHeaderCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      groupRanges.forEach(({ startCol, endCol, topBg, topFg }) => {
        if (startCol === endCol) {
          worksheet.mergeCells(1, startCol, 2, startCol);
          const singleCell = worksheet.getCell(1, startCol);
          singleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: topBg } };
          singleCell.font = { bold: true, name: 'Sarabun', color: { argb: topFg } };
          singleCell.alignment = { vertical: 'middle', horizontal: 'center' };
          singleCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          return;
        }

        worksheet.mergeCells(1, startCol, 1, endCol);
        const groupCell = worksheet.getCell(1, startCol);
        groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: topBg } };
        groupCell.font = { bold: true, name: 'Sarabun', color: { argb: topFg } };
        groupCell.alignment = { vertical: 'middle', horizontal: 'center' };
        groupCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      for (let col = 2; col <= dataKeys.length; col += 1) {
        const meta = columnMeta[col - 1];
        if (!meta || !meta.label) continue;
        const subCell = worksheet.getCell(2, col);
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meta.subBg } };
        subCell.font = { bold: true, name: 'Sarabun', color: { argb: meta.subFg } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        subCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      for (let rowNo = 1; rowNo <= 2; rowNo += 1) {
        for (let colNo = 1; colNo <= dataKeys.length; colNo += 1) {
          const cell = worksheet.getCell(rowNo, colNo);
          if (!cell.border) {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          }
        }
      }

      const addRows = (rowsData: DataType[], depth: number) => {
        rowsData.forEach((item) => {
          const rowData = dataKeys.map((k) => {
            if (k === 'unit') return `${'    '.repeat(depth)}${item.unit ?? ''}`;
            if (k === 'unit_name') return String(item.unit_name ?? '');
            const v = item[k];
            if (typeof v === 'number') return v !== 0 ? v : '';
            if (typeof v === 'string') return v;
            return '';
          });

          const row = worksheet.addRow(rowData);
          const isTotalRow = item.key === 'total';
          const isParentRow = item.key.startsWith('bg-');

          row.eachCell((cell, colNo) => {
            const meta = columnMeta[colNo - 1];
            const isFirstCol = colNo === 1;
            const isTextCol = meta?.key === 'unit' || meta?.key === 'unit_name';
            const shouldPreserveColumnColor = !!meta?.isTotalCol || !!meta?.isRecruitCol;
            let fillColor = meta?.bodyBg;

            if (isTotalRow && (isFirstCol || !shouldPreserveColumnColor)) {
              fillColor = colors.blue100;
            } else if (isParentRow && !fillColor) {
              fillColor = colors.white;
            }

            if (fillColor) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            }

            const fontColor = (isTotalRow || isParentRow) ? colors.blue900 : undefined;
            cell.font = {
              name: 'Sarabun',
              bold: Boolean(isTotalRow || isParentRow || meta?.isTotalCol),
              ...(fontColor ? { color: { argb: fontColor } } : {}),
            };
            cell.alignment = (isTextCol || isFirstCol)
              ? { vertical: 'middle', horizontal: 'left' }
              : { vertical: 'middle', horizontal: 'center' };

            if (!isFirstCol && meta?.isNumeric) {
              cell.numFmt = '#,##0';
            }

            const bottomStyle = isParentRow
              ? { style: 'medium' as const, color: { argb: colors.blue300 } }
              : { style: 'thin' as const };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: bottomStyle,
              right: { style: 'thin' },
            };
          });

          if (item.children?.length) addRows(item.children, depth + 1);
        });
      };

      addRows(tableData, 0);
      worksheet.views = [{ state: 'frozen', xSplit: showUnitName ? 2 : 1, ySplit: 2 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob(
        [buffer],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      await saveExcelFile(blob, `รายงานสรุปภาพรวมกรอบอัตรากำลังประจำเดือนของสายงาน_${dateStr.replace(/-/g, '')}.xlsx`);

    } catch (err: unknown) {
      console.error('[Excel] Error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert('Export Error: ' + errorMessage);
    }
  };


  const columns: ColumnsType<DataType> = useMemo(() => {
    const isShow = (key: string) => checkedList.includes(key);
    const bgWhite = 'bg-white';


    return [
      {
        title: 'กลุ่ม/หน่วยธุรกิจ',
        dataIndex: 'unit',
        key: 'unit',
        fixed: 'left' as const,
        width: 180,
        className: 'bg-white z-20',
        onHeaderCell: () => ({
          className: 'bg-blue-100! text-blue-900! font-bold',
        }),
        render: (text: unknown) => <span className="font-medium text-gray-700">{String(text ?? '')}</span>
      },
      ...(isShow('unit_name') ? [{
        title: 'ชื่อหน่วยงาน',
        dataIndex: 'unit_name',
        key: 'unit_name',
        fixed: 'left' as const,
        width: 220,
        className: 'bg-white z-20',
        onHeaderCell: () => ({
          className: 'bg-blue-100! text-blue-900! font-bold',
        }),
        render: (text: unknown) => <span className="text-gray-700">{String(text ?? '')}</span>
      }] : []),
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
              { title: 'รวม', onHeaderCell: () => ({ className: 'report1-total-header-frame' }), dataIndex: 'sum_frame_total', width: 60, align: 'center' as const, className: 'report1-col-total report1-col-total-frame font-semibold', onCell: () => ({ className: 'report1-col-total report1-col-total-frame font-semibold' }) },
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
              { title: 'รวม', onHeaderCell: () => ({ className: 'report1-total-header-people' }), dataIndex: 'sum_people_total', width: 60, align: 'center' as const, className: 'report1-col-total report1-col-total-people font-semibold', onCell: () => ({ className: 'report1-col-total report1-col-total-people font-semibold' }) },
            ],
          }] : []),
          ...(isShow('recruit')
            ? [{
              title: 'สรรหา',
              dataIndex: 'recruit_total', // ดึงค่า recruit_total โดยตรง ไม่ต้องมี children
              key: 'recruit_total',
              width: 80,
              align: 'center' as const,
              className: 'bg-green-50!',
              onCell: () => ({ className: 'report1-col-recruit bg-green-50!' }),
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
            title: (
              <span className="inline-block leading-tight text-center">
                Contact Out
                <br />
                สัญญาใหญ่
              </span>
            ),
            dataIndex: 'contact_out',
            key: 'contact_out',
            width: 100,
            align: 'center' as const,
            className: `${bgWhite}`,
            onHeaderCell: () => ({ className: 'bg-purple-300! text-black! font-bold!' })
          }] : []),

          ...(isShow('contact_out_sub') ? [{
            title: (
              <span className="inline-block leading-tight text-center">
                Contact Out
                <br />
                สัญญาย่อย
              </span>
            ),
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
      <div
        ref={fullscreenRef}
        className={`w-full min-w-0 ${isFullscreen ? 'h-screen overflow-hidden bg-white p-4 flex flex-col gap-4' : 'space-y-6'}`}
      >
        {!isFullscreen && (
          <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <FileText className="text-2xl text-blue-100" />
                <h1 className="text-2xl font-bold m-0 text-white">Report 01</h1>
                <span className="hidden md:inline-block text-blue-100">|</span>
                <span className="text-xl font-medium text-blue-50">รายงานสรุปภาพรวมกรอบอัตรากำลังประจำเดือนของสายงาน</span>
              </div>
            </div>
          </div>
        )}

        <div
          className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 relative z-50 ${isFullscreen ? 'shrink-0' : 'sticky top-0'}`}
        >
          <Form
            layout="inline"
            onFinish={onSearch}
            initialValues={{ date: dayjs() }}
            className="flex items-center gap-2"
          >
            <Form.Item name="date" label="วันที่" className="m-0" style={{ alignItems: 'center' }}>
              <DatePicker
                format="DD/MM/YYYY"
                className="w-40"
                getPopupContainer={() => fullscreenRef.current || document.body}
              />
            </Form.Item>

            <Form.Item className="m-0">
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                ค้นหา
              </Button>
            </Form.Item>
          </Form>

          {hasSearched && (
            <div className="flex items-center gap-2">
              <Button
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
                className={`border-none! shadow-sm! text-white! ${isFullscreen ? 'bg-red-500! hover:bg-red-600!' : 'bg-blue-500! hover:bg-blue-600!'}`}
              >
                {isFullscreen ? 'ปิดเต็มจอ' : 'เต็มจอ'}
              </Button>

              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportExcel}
                loading={loading}
                className="bg-green-600! text-white! border-none! shadow-sm! hover:bg-green-700!"
              >
                Excel
              </Button>

              <Popover
                placement="bottomLeft"
                trigger="click"
                getPopupContainer={() => fullscreenRef.current || document.body}
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
          )}
        </div>

        {hasSearched && (
          <div className={`bg-white rounded-lg shadow-sm border border-gray-100 relative z-0 ${isFullscreen ? 'mt-0 flex-1 min-h-0' : 'mt-4'}`}>
            <div
              ref={tableContainerRef}
              className={`${isFullscreen ? 'h-full min-h-0 overflow-hidden' : 'w-full max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-2rem)] overflow-hidden'}`}
            >
              <Table
                columns={columns}
                dataSource={tableData}
                loading={loading}
                bordered
                size="small"
                scroll={{
                  x: Math.max(checkedList.length * 400 + 500, 1500),
                  y: tableScrollY,
                }}
                pagination={false}
                expandable={{
                  expandedRowKeys: expandedKeys,
                  onExpandedRowsChange: (keys) => setExpandedKeys(keys),
                }}
                className="report1-table [&_.ant-table-cell]:text-[12px]! [&_.ant-table-cell]:py-1!"
                rowClassName={(record) => {
                  const k = record.key as string;
                  if (k === 'total') return 'report1-row-total';
                  if (k.startsWith('bg-')) return 'report1-row-parent';
                  return '';
                }}
              />
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        .report1-table .ant-table-container::before,
        .report1-table .ant-table-container::after {
          display: none !important;
        }
        .report1-table .ant-table-cell-fix-left::before,
        .report1-table .ant-table-cell-fix-left::after,
        .report1-table .ant-table-cell-fix-right::before,
        .report1-table .ant-table-cell-fix-right::after {
          display: none !important;
          box-shadow: none !important;
        }
        .report1-table .ant-table-cell-fix-left-last::after,
        .report1-table .ant-table-cell-fix-right-first::after {
          box-shadow: none !important;
        }
        .report1-table .ant-table-thead > tr > th.ant-table-cell-fix-left {
          background-color: #dbeafe !important;
        }
        .report1-table .ant-table-thead > tr > th.ant-table-cell-fix-left,
        .report1-table .ant-table-thead > tr > th.ant-table-cell-fix-right {
          background-clip: padding-box !important;
        }
        .report1-table .ant-table-tbody > tr.report1-row-parent > td:not(.report1-col-total):not(.report1-col-recruit) {
          background-color: #ffffff !important;
          color: #1e3a8a !important;
          font-weight: 700;
          border-bottom: 2px solid #93c5fd !important;
        }
        .report1-table .ant-table-tbody > tr.report1-row-parent > td.report1-col-total,
        .report1-table .ant-table-tbody > tr.report1-row-parent > td.report1-col-recruit {
          color: #1e3a8a !important;
          font-weight: 700;
          border-bottom: 2px solid #93c5fd !important;
        }
        .report1-table .ant-table-tbody > tr.report1-row-total > td:not(.report1-col-total):not(.report1-col-recruit) {
          background-color: #dbeafe !important;
          color: #1e3a8a !important;
          font-weight: 700;
        }
        .report1-table .report1-total-header-frame {
          background-color: #bfdbfe !important;
          color: #1e3a8a !important;
          font-weight: 700 !important;
        }
        .report1-table .report1-total-header-people {
          background-color: #fed7aa !important;
          color: #9a3412 !important;
          font-weight: 700 !important;
        }
        .report1-table .report1-total-header-vacancy {
          background-color: #fecaca !important;
          color: #991b1b !important;
          font-weight: 700 !important;
        }
        .report1-table .report1-total-header-default {
          background-color: #fde68a !important;
          color: #78350f !important;
          font-weight: 700 !important;
        }
        .report1-table td.report1-col-total {
          font-weight: 600;
        }
        .report1-table td.report1-col-total-frame {
          background-color: #eff6ff !important;
        }
        .report1-table td.report1-col-total-people {
          background-color: #fff7ed !important;
        }
        .report1-table td.report1-col-total-vacancy {
          background-color: #fef2f2 !important;
        }
        .report1-table td.report1-col-total-default {
          background-color: #fef9c3 !important;
        }
        .report1-table td.report1-col-recruit {
          background-color: #dcfce7 !important;
        }
      `}</style>
    </Main>
  );
}
