'use client';

import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import { ACTION_LOG, insertActionLog } from '@/services/actionLogService';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

interface MainProps {
  children: React.ReactNode;
  currentPath?: string;
  hideChrome?: boolean;
}

export default function MainLayout({ children, currentPath, hideChrome = false }: MainProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true); // เพิ่ม state สำหรับ visible
  const [currentBreakpoint, setCurrentBreakpoint] = useState<
    'mobile' | 'tablet' | 'desktop'
  >('desktop');
  const pathname = usePathname();
  const viewedPathRef = useRef<Set<string>>(new Set());

  // Auto-collapse based on screen size และติดตาม breakpoint
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024; // md-lg breakpoint
      const isDesktop = window.innerWidth >= 1024; // lg+ breakpoint

      if (isMobile) {
        setCurrentBreakpoint('mobile');
        setSidebarCollapsed(true); // บังคับ collapsed ใน mobile
        setSidebarVisible(false); // เริ่มต้นซ่อน sidebar ใน mobile
      } else if (isTablet) {
        setCurrentBreakpoint('tablet');
        setSidebarVisible(true); // แสดง sidebar ใน tablet
        setSidebarCollapsed(true);
        // ใน tablet ไม่บังคับ collapse ให้ user เลือกได้
      } else if (isDesktop) {
        setCurrentBreakpoint('desktop');
        setSidebarCollapsed(true);
        setSidebarVisible(true); // แสดง sidebar ใน desktop
      }
    };

    // เรียกครั้งแรกเมื่อ component mount
    handleResize();

    // เพิ่ม event listener สำหรับการ resize
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebar = () => {
    if (currentBreakpoint === 'mobile') {
      // ใน mobile toggle เฉพาะ visible/hidden (ไม่ toggle collapse)
      setSidebarVisible((prev) => !prev);
      setSidebarCollapsed(true); // ใน mobile เป็น collapsed เสมอ
    } else {
      // tablet และ desktop ให้ toggle collapse ได้ปกติ
      setSidebarCollapsed((prev) => !prev);
      setSidebarVisible(true); // แน่ใจว่าแสดง sidebar
    }
  };

  const handleSidebarCollapsedChange = (collapsed: boolean) => {
    if (currentBreakpoint !== 'mobile') {
      setSidebarCollapsed(collapsed);
    }
    // ใน mobile ไม่ให้เปลี่ยน collapsed state
  };

  useEffect(() => {
    if (!pathname || !pathname.startsWith('/report')) return;
    if (viewedPathRef.current.has(pathname)) return;

    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const tryInsertViewLog = async () => {
      if (stopped) return;
      attempt += 1;

      const success = await insertActionLog({
        actionId: ACTION_LOG.VIEW,
        note: `View ${pathname}`,
      });

      if (success) {
        viewedPathRef.current.add(pathname);
        return;
      }

      if (attempt < 8) {
        retryTimer = setTimeout(() => {
          void tryInsertViewLog();
        }, 350);
      }
    };

    void tryInsertViewLog();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header Component */}
      <div className={hideChrome ? 'hidden' : ''}>
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />
      </div>

      {/* Main Layout - เว้นพื้นที่สำหรับ fixed header */}
      <div className={`flex ${hideChrome ? 'pt-0' : 'pt-16'}`}>
        {/* Sidebar Component - แสดงเฉพาะเมื่อ visible */}
        {!hideChrome && sidebarVisible && (
          <Sidebar
            collapsed={sidebarCollapsed}
            currentPath={currentPath || pathname}
            onCollapsedChange={handleSidebarCollapsedChange}
          />
        )}

        {/* Main Content */}
        <main
          className={`
          flex-1 min-w-0 transition-all duration-300 ${hideChrome ? 'p-0' : 'p-6'}
          ${hideChrome ? 'ml-0' : !sidebarVisible ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'}
        `}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
