'use client';

import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  FilePen,
  FileText,
  Inbox,
  MonitorCheck,
  Settings,
  LucideIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { saveExcelFile } from '@/utils/fileDownload';
import { ACTION_LOG, insertActionLog, setSelectedSubjectContext } from '@/services/actionLogService';
import { ApiMenuItem } from '../../types/menu';
import { getAuthToken } from '../../utils/auth';

interface SidebarProps {
  collapsed: boolean;
  currentPath?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
}

// Map string icon names from DB to actual components
const iconMap: Record<string, LucideIcon> = {
  'Inbox': Inbox,
  'ArrowLeftRight': ArrowLeftRight,
  'FilePen': FilePen,
  'FileText': FileText,
  'MonitorCheck': MonitorCheck,
  'Settings': Settings,
  // Add fallback or more icons as needed
};

interface MenuItem {
  menuId: number;
  key: string;
  icon: LucideIcon;
  label: string;
  hasSubmenu: boolean;
  submenu?: { menuId: number; label: string; path: string }[];
  path?: string;
  defaultExpanded?: boolean;
  badgeCount?: number;
}

export default function Sidebar({
  collapsed,
  currentPath = '/home',
  onCollapsedChange,
}: SidebarProps) {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadMKD = async () => {
    try {
      setDownloading(true);
      const token = getAuthToken();
      const response = await fetch('/api/mkd/export-list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch MKD list');
      
      const result = await response.json();
      const data = result.data;

      if (!data || data.length === 0) {
        alert('No data available to download');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('MKD List');

      // Add Headers
      const columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: 20
      }));
      worksheet.columns = columns;

      // Add Rows
      worksheet.addRows(data);

      // Styling headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await saveExcelFile(blob, `ExportMKDList_${Math.floor(Date.now() / 1000)}.xlsx`);

    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading MKD list');
    } finally {
      setDownloading(false);
    }
  };

  // Fetch menu from API
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          console.warn("No auth token found, skipping menu fetch");
          setLoading(false);
          return;
        }

        let employeeId = 'SYSTEM';
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            employeeId = userData.employeeID || 'SYSTEM';
          } catch {
            // Error parsing user data
          }
        }

        const response = await fetch(`/api/menu`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch menu');
        }

        const data: ApiMenuItem[] = await response.json();

        // Fetch inbox count
        let inboxCount = 0;
        try {
          const countRes = await fetch(`/api/documents/inbox/count?employeeId=${employeeId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (countRes.ok) {
            const countData = await countRes.json();
            inboxCount = countData.count || 0;
          }
        } catch (err) {
          console.error("Failed to fetch inbox count:", err);
        }

        // Transform API data to UI format
        const transformedItems: MenuItem[] = data.map(item => ({
          menuId: Number(item.MenuID) || 0,
          key: item.MenuKey || `menu-${item.MenuID}`,
          icon: (item.MenuIcon && iconMap[item.MenuIcon]) ? iconMap[item.MenuIcon] : FileText, // Default icon
          label: item.MenuName,
          hasSubmenu: item.SubMenu && (item.children?.length ?? 0) > 0,
          submenu: item.children?.map(child => ({
            menuId: Number(child.MenuID) || 0,
            label: child.MenuName,
            path: child.MenuPath || '#'
          })) || [],
          path: item.MenuPath || undefined,
          defaultExpanded: item.Expanded,
          badgeCount: item.ShowCounter ? (item.MenuKey === 'inbox' || item.MenuPath?.includes('inbox') || item.MenuName.toLowerCase().includes('inbox') ? inboxCount : 0) : undefined,
        }));
        
        setMenuItems(transformedItems);
      } catch (error) {
        console.error("Error loading menu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const getInitialExpandedState = (currentPath: string, items: MenuItem[]) => {
    const initialState: Record<string, boolean> = {};
    items.forEach((item) => {
      // 1. Check if any submenu item is active
      const isSubMenuActive = item.submenu?.some((subItem) =>
        currentPath.startsWith(subItem.path)
      );

      // 2. Expand if active or defaultExpanded
      if (item.hasSubmenu) {
        initialState[item.key] =
          isSubMenuActive || (item.defaultExpanded ?? false);
      }
    });
    return initialState;
  };

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Initialize expanded state after menu loads
  useEffect(() => {
    if (menuItems.length > 0) {
      setExpandedMenus(getInitialExpandedState(currentPath, menuItems));
    }
  }, [menuItems, currentPath]);

  useEffect(() => {
    if (!currentPath || menuItems.length === 0) return;

    for (const item of menuItems) {
      if (item.path && currentPath.startsWith(item.path)) {
        setSelectedSubjectContext(item.menuId, item.label, item.path);
        return;
      }
      for (const subItem of item.submenu || []) {
        if (currentPath.startsWith(subItem.path)) {
          setSelectedSubjectContext(subItem.menuId, subItem.label, subItem.path);
          return;
        }
      }
    }
  }, [menuItems, currentPath]);

  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Notify parent when collapsed changes
  useEffect(() => {
    if (typeof onCollapsedChange === 'function') {
      onCollapsedChange(collapsed);
    }
  }, [collapsed, onCollapsedChange]);

  // Handle Resize
  useEffect(() => {
    let rafId: number | null = null;
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      if (mobile) {
        setExpandedMenus(getInitialExpandedState(currentPath, menuItems));
        setHoveredMenu(null);
        setDropdownPosition(null);
      }
    };

    const scheduleResize = () => {
      rafId = window.requestAnimationFrame(handleResize);
    };

    window.addEventListener('resize', scheduleResize);
    scheduleResize();

    return () => {
      window.removeEventListener('resize', scheduleResize);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [currentPath, menuItems]);

  const toggleMenu = (menuKey: string) => {
    if (collapsed) {
      if (hoveredMenu === menuKey) {
        setHoveredMenu(null);
        setDropdownPosition(null);
      } else {
        const menuElement = menuRefs.current[menuKey];
        if (menuElement) {
          const rect = menuElement.getBoundingClientRect();
          setDropdownPosition({
            top: rect.top,
            left: rect.right + 8,
          });
          setHoveredMenu(menuKey);
        }
      }
    } else {
      setExpandedMenus((prev) => ({
        ...prev,
        [menuKey]: !prev[menuKey],
      }));
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hoveredMenu && dropdownPosition) {
        const dropdown = document.getElementById(`dropdown-${hoveredMenu}`);
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setHoveredMenu(null);
          setDropdownPosition(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hoveredMenu, dropdownPosition]);

  const isActive = (path: string) => currentPath === path;

  const handleNavigation = (path: string, menuMeta?: { menuId?: number; label?: string }) => {
    const resolvedMenuId = Number(menuMeta?.menuId ?? 0);

    if (path === 'mkd/download' || path === '/mkd/download' || path === '#download-mkd') {
      if (Number.isFinite(resolvedMenuId) && resolvedMenuId > 0) {
        setSelectedSubjectContext(resolvedMenuId, menuMeta?.label || path, path);
      }
      handleDownloadMKD();
      return;
    }

    if (Number.isFinite(resolvedMenuId) && resolvedMenuId > 0) {
      const menuName = (menuMeta?.label || path || '').trim();
      setSelectedSubjectContext(resolvedMenuId, menuName, path);
      void insertActionLog({
        actionId: ACTION_LOG.ENTRY_MENU,
        subjectId: resolvedMenuId,
        note: menuName,
      });
    }

    router.push(path);
    if (collapsed) {
      setHoveredMenu(null);
      setDropdownPosition(null);
    }
  };

  const renderMenuItem = (item: MenuItem) => (
    <div key={item.key}>
      <div
        ref={(el) => {
          menuRefs.current[item.key] = el;
        }}
        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${isActive(item.path || '')
          ? 'bg-blue-100 text-blue-900'
          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
          }`}
        onClick={() => {
          if (
            item.key === 'download-mkd' || 
            item.path === 'mkd/download' || 
            item.path === '/mkd/download'
          ) {
            if (item.menuId > 0) {
              setSelectedSubjectContext(item.menuId, item.label, item.path || '#');
            }
            handleDownloadMKD();
            return;
          }
          if (item.hasSubmenu) {
            toggleMenu(item.key);
          } else {
            if (item.path) {
              handleNavigation(item.path, { menuId: item.menuId, label: item.label });
            }
          }
        }}
        title={collapsed ? item.label : ''}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
             <item.icon className={`${collapsed ? 'h-6 w-6' : 'h-5 w-5'} ${item.key === 'download-mkd' && downloading ? 'animate-pulse text-blue-500' : ''}`} />
             {collapsed &&
              item.badgeCount !== undefined &&
              item.badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </span>
              )}
          </div>
          {!collapsed && (
            <div className="flex items-center justify-between flex-1">
              <span className="font-medium">{item.label}</span>
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </span>
              )}
            </div>
          )}
        </div>
        {!collapsed &&
          item.hasSubmenu &&
          (expandedMenus[item.key] ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ))}
      </div>

      {!collapsed && item.hasSubmenu && expandedMenus[item.key] && (
        <div className="ml-8 mt-1 space-y-1">
          {item.submenu?.map((subItem, index) => (
            <div
              key={index}
              className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isActive(subItem.path)
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              onClick={() => handleNavigation(subItem.path, { menuId: subItem.menuId, label: subItem.label })}
            >
              {subItem.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`
        ${collapsed ? 'w-16' : 'w-64'}
        fixed left-0 top-16 z-[90]
         bg-white border-r border-gray-200 h-[calc(100vh-4rem)]
        transition-all duration-300 overflow-y-auto
      `}
      >
        <div className="p-1">
          <div className="mb-6 mt-4">
            {!collapsed && (
              <div className="my-6">
                <h3 className="text-md font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                  Menu
                </h3>
                <div className="mx-4 w-60 h-[2px] bg-gradient-to-r from-blue-300/60 via-red-300/40 to-transparent rounded-full"></div>
              </div>
            )}

            <nav className="space-y-1">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading menu...</div>
              ) : (
                menuItems.map(renderMenuItem)
              )}
            </nav>
          </div>
        </div>
      </aside>

      {collapsed && hoveredMenu && dropdownPosition && (
        <div
          id={`dropdown-${hoveredMenu}`}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[110] min-w-48"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {(() => {
            const menuItem = menuItems.find((item) => item.key === hoveredMenu);
            return (
              <>
                <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b border-gray-100">
                  {menuItem?.label}
                </div>
                {menuItem?.submenu?.map((subItem, index) => (
                  <div
                    key={index}
                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${isActive(subItem.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    onClick={() => handleNavigation(subItem.path, { menuId: subItem.menuId, label: subItem.label })}
                  >
                    {subItem.label}
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
