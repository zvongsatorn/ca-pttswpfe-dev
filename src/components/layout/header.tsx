'use client';

import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  ChevronDown,
  EllipsisVertical,
  FileText,
  LogOut,
  User,
  UserCog,
  Camera,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getUserFromToken } from '@/utils/auth';
import { buildAuthHeaders, buildSafeRoutePath, fetchSafeRoute, setAuthCookie, setLocalText, setSessionJson } from '@/utils/security';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ACTION_LOG, clearSelectedSubjectContext, insertActionLog } from '@/services/actionLogService';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}


interface UserGroup {
  id: string;
  name: string;
  code: string;
  color: string;
  role: string;
}

interface RawUserGroup {
  userGroupNo: string;
  userGroupName: string;
  userGroupRole: string;
}

interface UserData {
  employeeID: string;
  name: string;
  position: string;
  orgUnit: string;
  email: string;
  userGroups: RawUserGroup[];
  profilePicture?: string;
}

const UNITS_CACHE_PREFIX = 'user_units_cache:';
const LEGACY_UNITS_CACHE_KEY = 'user_units_cache';

const normalizeGroupNo = (value: string): string => {
  const trimmed = String(value || '').trim();
  return /^\d+$/.test(trimmed) ? trimmed.padStart(2, '0') : '';
};

const buildUnitsCacheKey = (employeeId: string, userGroupNo: string): string => {
  return `${UNITS_CACHE_PREFIX}${String(employeeId || '').trim()}:${normalizeGroupNo(userGroupNo)}`;
};

const clearUnitsCacheKeys = () => {
  try {
    sessionStorage.removeItem(LEGACY_UNITS_CACHE_KEY);
  } catch {
    // no-op
  }
};

type JsonOrTextResult<T> = {
  json: T | null;
  text: string;
};

const readJsonOrText = async <T = Record<string, unknown>>(response: Response): Promise<JsonOrTextResult<T>> => {
  const raw = await response.text();
  const text = raw.trim();
  if (!text) return { json: null, text: '' };
  try {
    return { json: JSON.parse(text) as T, text };
  } catch {
    return { json: null, text };
  }
};



export default function Header({
  onToggleSidebar,
}: HeaderProps) {
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [userState, setUserState] = useState<{
    userData: UserData | null;
    userGroups: UserGroup[];
    activeGroup: UserGroup;
  }>({
    userData: null,
    userGroups: [],
    activeGroup: {
      id: '',
      name: '',
      code: '',
      color: 'gray',
      role: '',
    },
  });

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const { userData, userGroups, activeGroup } = userState;
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    // Replace localStorage with JWT decoding
    const user = getUserFromToken();

    if (user) {
      const rawGroups = user.userGroups || [];
      const mappedGroups: UserGroup[] = rawGroups.map((g: RawUserGroup) => {
        let color = 'gray';
        const gNo = g.userGroupNo;
        const gName = g.userGroupName;

        if (gNo === '01') color = 'red';
        else if (gNo === '02') color = 'blue';
        else if (gNo === '03') color = 'green';
        else if (gNo === '04') color = 'purple';
        else if (gNo === '05') color = 'orange';
        else if (gNo === '06') color = 'teal';
        else if (gNo === '07') color = 'indigo';

        return {
          id: gNo,
          name: gName || `Group ${gNo}`, // Fallback name if missing
          code: gName ? gName.split(' ')[0] : gNo,
          color: color,
          role: g.userGroupRole,
        };
      });

      // Check for saved group in localStorage
      const savedGroupId = localStorage.getItem('selected_usergroup');
      const savedGroup = mappedGroups.find((g) => g.id === savedGroupId);
      let initialActiveGroup = mappedGroups.length > 0 ? mappedGroups[0] : {
        id: '',
        name: '',
        code: '',
        color: 'gray',
        role: '',
      };

      if (savedGroup) {
        initialActiveGroup = savedGroup;
      } else if (mappedGroups.length > 0) {
        setLocalText('selected_usergroup', mappedGroups[0].id);
        setLocalText('selected_usergroup_role', mappedGroups[0].role);
      }

      setUserState({
        userData: user,
        userGroups: mappedGroups,
        activeGroup: initialActiveGroup
      });

      if (user?.profilePicture) {
        setProfileImageUrl(`/api/users/profile-picture/${user.profilePicture}`);
      }
    }
  }, []);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const groupSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        groupSelectorRef.current &&
        !groupSelectorRef.current.contains(event.target as Node)
      ) {
        setShowGroupSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
    setShowUserMenu(false);
  };

  const confirmLogout = () => {
    void insertActionLog({
      actionId: ACTION_LOG.LOGOUT,
      note: 'Log out',
    });

    // Clear any stored authentication data
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Strict";
    localStorage.removeItem('user_data');
    localStorage.removeItem('selected_usergroup');
    localStorage.removeItem('selected_usergroup_role');
    clearUnitsCacheKeys();
    clearSelectedSubjectContext();

    // Redirect to login page
    router.push('/login');
  };

  const handleProfile = () => {
    setShowProfileModal(true);
    setShowUserMenu(false);
  };

  const getGroupColorClasses = (color: string) => {
    const colorMap: Record<
      string,
      { bg: string; text: string; border: string; hover: string }
    > = {
      blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        hover: 'hover:bg-blue-200',
      },
      green: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        hover: 'hover:bg-green-200',
      },
      purple: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-300',
        hover: 'hover:bg-purple-200',
      },
      red: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        hover: 'hover:bg-red-200',
      },
      gray: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        hover: 'hover:bg-gray-200',
      },
      orange: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        hover: 'hover:bg-orange-200',
      },
      teal: {
        bg: 'bg-teal-100',
        text: 'text-teal-700',
        border: 'border-teal-300',
        hover: 'hover:bg-teal-200',
      },
      indigo: {
        bg: 'bg-sky-100',
        text: 'text-sky-700',
        border: 'border-sky-300',
        hover: 'hover:bg-sky-200',
      },
    };
    return colorMap[color] || colorMap.blue;
  };

  const handleGroupChange = async (group: UserGroup) => {
    setUserState(prev => ({ ...prev, activeGroup: group }));
    setShowGroupSelector(false);
    setLocalText('selected_usergroup', group.id);
    setLocalText('selected_usergroup_role', group.role);
    console.log('Switched to group:', group.name);

    // Refetch the units for the new role and update sessionStorage
    if (userData?.employeeID) {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(buildSafeRoutePath('unitsByRole', { empId: userData.employeeID, roleId: group.id }), {
          headers: buildAuthHeaders(token || undefined)
        });
        const { json: unitData, text } = await readJsonOrText<{ success?: boolean; data?: unknown[]; message?: string; error?: string }>(response);
        if (!response.ok) {
          const message = unitData?.error || unitData?.message || text || `HTTP ${response.status}`;
          console.error('Failed to fetch units on role change:', message);
          return;
        }
        if (unitData?.success && Array.isArray(unitData.data)) {
          clearUnitsCacheKeys();
          setSessionJson(buildUnitsCacheKey(userData.employeeID, group.id), unitData.data);
          // Dispatch a custom event so the transaction page knows to refresh the dropdown immediately
          window.dispatchEvent(new CustomEvent('user-units-changed', { detail: unitData.data }));
        }
      } catch (error) {
        console.error("Failed to fetch units on role change", error);
      }
    }

    window.dispatchEvent(new CustomEvent('user-group-changed', { detail: group }));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.employeeID) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 2MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', userData.employeeID);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetchSafeRoute('userProfilePicture', undefined, {
        method: 'POST',
        headers: buildAuthHeaders(token || undefined),
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        toast.success('อัปโหลดรูปภาพสำเร็จ');
        setProfileImageUrl(result.data.url);

        // Update user state and token for persistence
        if (result.data.token) {
          setLocalText('auth_token', result.data.token);
          setAuthCookie(result.data.token);
        }

        setUserState(prev => ({
          ...prev,
          userData: prev.userData ? {
            ...prev.userData,
            profilePicture: result.data.filename
          } : null
        }));
      } else {
        toast.error(result.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setUploading(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-linear-to-r from-white to-blue-700 h-16 flex items-center justify-between px-4 z-[1200] shadow-sm border-b border-blue-200 backdrop-blur-sm">
      <div className="flex items-center space-x-15">
        {/* Logo */}
        <div className="hidden sm:flex items-center -ml-6">
          <div className="relative group py-2">
            {/* White outer border */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[200px] h-20 bg-linear-to-r from-gray-300 to-blue-500 rounded-br-full shadow-xl border-4 border-white"
            ></div>

            {/* Logo */}
            <Image
              src="/images/logoptt.png"
              alt="PTT Logo"
              width={482}
              height={220}
              className={`relative z-10 ml-[20px] h-auto w-[150px] object-contain group-hover:scale-105 transition-all duration-300 ease-out ${
                logoError ? 'hidden' : ''
              }`}
              priority
              onError={() => setLogoError(true)}
            />

            {/* Fallback */}
            <div
              className={`w-[115px] h-[115px] bg-linear-to-br from-red-500 to-blue-600 rounded-full items-center justify-center shadow-lg ml-[12px] ${
                logoError ? 'flex' : 'hidden'
              }`}
            >
              <span className="text-white font-bold text-2xl">PTT</span>
            </div>
          </div>
        </div>

        {/* Menu Toggle */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleSidebar}
          className="p-4! hover:bg-gray-100/80 transition-colors"
        >
          <EllipsisVertical className="h-6! w-6! text-blue-950" />
        </Button>
      </div>

      {/* Center - User Group Selector */}
      <div className=" flex items-center justify-center flex-1">
        <div className="relative" ref={groupSelectorRef}>
          <button
            onClick={() => setShowGroupSelector(!showGroupSelector)}
            className={`
              flex items-center gap-3 px-6 py-2.5 rounded-xl border-2
              bg-white/90 backdrop-blur-sm shadow-sm
              transition-all duration-200
              ${getGroupColorClasses(activeGroup.color).border}
              ${getGroupColorClasses(activeGroup.color).hover}
            `}
          >
            {/* Mobile: แสดงแค่ไอคอน */}
            <div className="md:hidden flex items-center">
              <UserCog
                className={`h-5 w-5 ${getGroupColorClasses(activeGroup.color).text}`}
              />
            </div>
            {/* Tablet/Desktop: แสดงแบบเต็ม */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`
                      w-2 h-2 rounded-full animate-pulse
                      ${activeGroup.color === 'blue' ? 'bg-blue-500' : ''}
                      ${activeGroup.color === 'green' ? 'bg-green-500' : ''}
                      ${activeGroup.color === 'purple' ? 'bg-purple-500' : ''}
                      ${activeGroup.color === 'red' ? 'bg-red-500' : ''}
                      ${activeGroup.color === 'gray' ? 'bg-gray-500' : ''}
                    `}
                />
                <span
                  className={`font-semibold text-sm ${getGroupColorClasses(activeGroup.color).text}`}
                >
                  {activeGroup.id ? (
                    activeGroup.name
                  ) : (
                    <div className="w-24 h-5 bg-gray-200 animate-pulse rounded"></div>
                  )}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showGroupSelector ? 'rotate-180' : ''
                  }`}
              />
            </div>
          </button>

          {/* Group Selector Dropdown */}
          {showGroupSelector && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 bg-white rounded-md shadow-2xl border border-gray-200 z-[1210] overflow-hidden">
              {/* Header */}
              {/* <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 text-center text-base">
                  เปลี่ยนกลุ่มผู้ใช้งาน
                </h3>
              </div> */}

              {/* Group List */}
              <div className="max-h-96 overflow-y-auto">
                {userGroups.map((group) => {
                  const isActive = activeGroup.id === group.id;
                  const colors = getGroupColorClasses(group.color);

                  return (
                    <button
                      key={group.id}
                      onClick={() => handleGroupChange(group)}
                      className={`
                                 w-full px-6 py-4 text-left transition-all duration-200
                                 border-l-4 flex items-center justify-between
                                 ${isActive ? `${colors.bg} ${colors.border}` : 'border-transparent hover:bg-gray-50'}
                               `}
                    >
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div
                          className={`
                                   w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                                   ${isActive ? colors.bg : 'bg-gray-100'}
                                 `}
                        >
                          <UserCog
                            className={`h-5 w-5 ${isActive ? colors.text : 'text-gray-500'}`}
                          />
                        </div>

                        {/* Group Name */}
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-semibold text-base ${isActive ? colors.text : 'text-gray-900'}`}
                          >
                            {group.name}
                          </h4>
                        </div>
                      </div>

                      {/* Check Icon */}
                      {isActive && (
                        <CheckCircle
                          className={`h-5 w-5 shrink-0 ${colors.text}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-3">
        {/* User Profile with Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2  bg-white  rounded-2xl px-3 py-1 gap-1 backdrop-blur-sm hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-red-500 rounded-full flex items-center justify-center shadow-sm overflow-hidden border border-gray-200">
              {profileImageUrl ? (
                <Image
                  src={profileImageUrl}
                  alt="Avatar"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <User className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="hidden sm:flex flex-col justify-start items-start">
              <span className="text-sm font-medium text-gray-700">
                {userData?.name || 'Guest User'}
              </span>
              <span className="text-sm text-gray-600">
                {userData?.employeeID || '-'}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[1210] overflow-hidden">
              {/* User Info Header */}
              <div className="p-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-red-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-red-500 rounded-full flex items-center justify-center shadow-sm overflow-hidden border-2 border-white">
                    {profileImageUrl ? (
                      <Image
                        src={profileImageUrl}
                        alt="Profile"
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {userData?.name || 'Guest User'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {userData?.employeeID || '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userData?.email || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={handleProfile}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserCog className="h-4 w-4 text-gray-500" />
                  <span>Personal info</span>
                </button>

                <div className="border-t border-gray-200 my-2"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-linear-to-r from-blue-600 to-red-500 bg-clip-text text-transparent">
              ข้อมูลผู้ใช้งาน
            </DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              จัดการข้อมูลส่วนตัวและรูปโปรไฟล์ของคุณ
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 bg-linear-to-br from-blue-500 to-red-500 rounded-full flex items-center justify-center shadow-lg overflow-hidden border-4 border-white">
                {profileImageUrl ? (
                   <Image
                     src={profileImageUrl}
                     alt="Profile"
                     width={96}
                     height={96}
                     className="w-full h-full object-cover"
                     unoptimized
                   />
                ) : (
                  <User className="h-12 w-12 text-white" />
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <button
                onClick={handleUploadClick}
                className="absolute -right-1 -bottom-1 bg-blue-600 p-2 rounded-full border-2 border-white shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
                title="เปลี่ยนรูปโปรไฟล์"
              >
                 <Camera className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Info Form */}
            <div className="grid gap-4 w-full">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-gray-500">ชื่อ-นามสกุล</Label>
                <div className="flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-blue-500" />
                  <Input
                    id="name"
                    value={userData?.name || '-'}
                    readOnly
                    className="bg-gray-50 border-gray-200 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="employeeID" className="text-gray-500">รหัสพนักงาน</Label>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <Input
                    id="employeeID"
                    value={userData?.employeeID || '-'}
                    readOnly
                    className="bg-gray-50 border-gray-200 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

               <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-500">อีเมล</Label>
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 text-blue-500 flex items-center justify-center font-bold">@</div>
                  <Input
                    id="email"
                    value={userData?.email || '-'}
                    readOnly
                    className="bg-gray-50 border-gray-200 focus-visible:ring-blue-500"
                  />
                </div>
              </div>




               <div className="grid gap-2">
                <Label className="text-gray-500">กลุ่มผู้ใช้งาน</Label>
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 min-h-[44px]">
                  {userData?.userGroups?.map((group, index) => {
                     let colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-200";
                     if (group.userGroupNo === '01') colorClass = "bg-red-100 text-red-700 hover:bg-red-200 border-red-200";
                     else if (group.userGroupNo === '02') colorClass = "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200";
                     else if (group.userGroupNo === '03') colorClass = "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
                     else if (group.userGroupNo === '04') colorClass = "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200";
                     else if (group.userGroupNo === '05') colorClass = "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200";
                     else if (group.userGroupNo === '06') colorClass = "bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-200";
                     else if (group.userGroupNo === '07') colorClass = "bg-sky-100 text-sky-700 hover:bg-sky-200 border-sky-200";

                    return (
                    <Badge key={index} variant="secondary" className={`${colorClass} border px-3 py-1`}>
                      {group.userGroupName}
                    </Badge>
                  )})}
                   {!userData?.userGroups?.length && <span className="text-gray-400 text-sm">ไม่มีกลุ่มผู้ใช้งาน</span>}
                </div>
              </div>
            </div>
          </div>
           <div className="flex justify-center mt-2">
            <Button onClick={() => setShowProfileModal(false)} className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md">
              ปิดหน้าต่าง
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-3">
              ยืนยันการออกจากระบบ
            </DialogTitle>
            <DialogDescription className="pt-4 text-base text-gray-600">
              คุณต้องการออกจากระบบใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex flex-col sm:flex-row sm:justify-end gap-3 border-t border-gray-100 pt-5">
            <Button
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
              className="w-full sm:w-24 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={confirmLogout}
              className="w-full sm:w-24 bg-red-600 hover:bg-red-700 text-white"
            >
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
