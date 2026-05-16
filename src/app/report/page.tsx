'use client';

import { buildAuthHeaders, toSafeDisplayText, getLocalText, fetchMenuSubmenu } from '@/utils/security';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Main from '@/components/layout/main';
import {
  LayoutDashboard,
  FileBarChart,
  ArrowRightLeft,
  Users,
  Briefcase,
  RefreshCcw,
  UserSearch,
  ChevronRight,
  FileBox,
  FileChartLine,
  FileBraces,
  User2,
  UserCheck,
  UserCog,
  UserCircle,
  UserMinus2,
  LucideIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Icon mapping
const iconMap: { [key: string]: LucideIcon } = {
  LayoutDashboard,
  FileBarChart,
  ArrowRightLeft,
  Users,
  Briefcase,
  RefreshCcw,
  UserSearch,
  FileBox,
  FileChartLine,
  FileBraces,
  User2,
  UserCheck,
  UserCog,
  UserCircle,
  UserMinus2
};

interface ReportMenuItem {
  MenuID: number;
  MenuKey: string;
  MenuName: string;
  MenuTitle: string | null;
  MenuPath: string;
  MenuIcon: string | null;
  color: string | null;
  lightColor: string | null;
  textColor: string | null;
}

// TODO: Verified with user that MenuKey is 'REPORT'
const REPORT_MENU_KEY = 'REPORT';
const MENU_CLASS_PATTERN = /^(bg|text)-[a-z]+-\d{2,3}$/;
const REPORT_ROUTE_PATHS = [
  '/report/dashboard',
  '/report/report1',
  '/report/report2',
  '/report/report3',
  '/report/report4',
  '/report/report5',
  '/report/report6',
  '/report/report7',
  '/report/report8',
  '/report/report9',
  '/report/report10'
] as const;
type ReportRoutePath = typeof REPORT_ROUTE_PATHS[number];

const toSafeMenuClass = (value: unknown, fallback: string): string => {
  const safeValue = String(value || '').trim();
  return MENU_CLASS_PATTERN.test(safeValue) ? safeValue : fallback;
};

const toReportRoutePath = (value: unknown): ReportRoutePath | null => {
  const rawPath = String(value || '').trim();
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  return REPORT_ROUTE_PATHS.find((path) => path === normalizedPath) || null;
};

export default function ReportMenuPage() {
  const [reports, setReports] = useState<ReportMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = getLocalText('auth_token');
        const response = await fetchMenuSubmenu(REPORT_MENU_KEY, undefined, {
            headers: buildAuthHeaders(token || undefined)
        });

        if (!response.ok) {
            throw new Error('Failed to fetch menu');
        }

        const data = await response.json();
        setReports(data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const getIcon = (iconName: string | null) => {
    if (iconName && iconMap[iconName]) {
      return iconMap[iconName];
    }
    return FileBarChart; // Default icon
  };

  const reportsByRoutePath = new Map<ReportRoutePath, ReportMenuItem>();
  reports.forEach((item) => {
    const routePath = toReportRoutePath(item.MenuPath);
    if (routePath && !reportsByRoutePath.has(routePath)) {
      reportsByRoutePath.set(routePath, item);
    }
  });

  return (
    <Main currentPath="/report">
      <div className="space-y-6">

        {/* Header */}
        <div className="rounded-xl bg-linear-to-r from-blue-600 to-blue-400 p-3 shadow-md border border-blue-500 mb-6 text-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <FileBarChart className="text-2xl text-blue-100" />
              <h1 className="text-2xl font-bold m-0 text-white">รายงาน</h1>
              <span className="hidden md:inline-block text-blue-100">|</span>
              <span className="text-md font-medium text-blue-50">เลือกหัวข้อรายงานที่ต้องการดูข้อมูล</span>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Grid Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full text-center py-10">Loading...</div>
          ) : (
            REPORT_ROUTE_PATHS.map((reportPath) => {
              const item = reportsByRoutePath.get(reportPath);
              if (!item) return null;

              const Icon = getIcon(item.MenuIcon);
              const lightColor = toSafeMenuClass(item.lightColor, 'bg-blue-50');
              const textColor = toSafeMenuClass(item.textColor, 'text-blue-600');
              const color = toSafeMenuClass(item.color, 'bg-blue-500');
              const menuTitle = toSafeDisplayText(item.MenuTitle) || 'Report';
              const menuName = toSafeDisplayText(item.MenuName);
              return (
                <Link key={item.MenuID} href={reportPath} className="block group h-full">
                  <Card className="h-full border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white overflow-hidden relative py-0">
                    <CardContent className="p-6 flex items-start gap-4 h-full">

                      {/* Icon Box */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${lightColor}`}>
                        <Icon className={`w-6 h-6 ${textColor}`} />
                      </div>

                      {/* Text Content */}
                      <div className="flex-1 flex flex-col justify-between h-full gap-2">
                        <div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 mb-2 inline-block`}>
                            {menuTitle}
                          </span>
                          <h3 className="text-gray-800 font-semibold leading-snug group-hover:text-blue-600 transition-colors">
                            {menuName}
                          </h3>
                        </div>

                        <div className="flex items-center text-sm text-gray-400 group-hover:text-blue-500 mt-2 font-medium">
                          เปิดดูรายงาน <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>

                      {/* Decorative Background Gradient */}
                      <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${color}`} />
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </Main>
  );
}
