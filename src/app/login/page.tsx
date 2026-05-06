'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/lib/msalConfig';
import { b2cInstance, b2cLoginRequest } from '@/lib/msalB2CConfig';
import type { RedirectRequest } from '@azure/msal-browser';
import { buildApiPath, buildAuthHeaders, isSecureSubmissionContext, setAuthCookie, setSessionJson } from '@/utils/security';

const toText = (value: unknown): string => String(value ?? '').trim();

const UNITS_CACHE_PREFIX = 'user_units_cache:';
const LEGACY_UNITS_CACHE_KEY = 'user_units_cache';

const normalizeGroupNo = (value: string): string => {
  const trimmed = toText(value);
  return /^\d+$/.test(trimmed) ? trimmed.padStart(2, '0') : '';
};

const buildUnitsCacheKey = (employeeId: string, userGroupNo: string): string => {
  return `${UNITS_CACHE_PREFIX}${toText(employeeId)}:${normalizeGroupNo(userGroupNo)}`;
};

const clearUnitsCacheKeys = () => {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      if (key === LEGACY_UNITS_CACHE_KEY || key.startsWith(UNITS_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
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

const resolveDefaultRole = (userData: Record<string, unknown>): string => {
  const userGroups = Array.isArray(userData.userGroups)
    ? (userData.userGroups as Array<Record<string, unknown>>)
    : [];
  const groupNos = userGroups
    .map((group) => normalizeGroupNo(toText(group.userGroupNo)))
    .filter(Boolean);

  const selectedGroup = normalizeGroupNo(toText(localStorage.getItem('selected_usergroup')));
  if (selectedGroup && (groupNos.length === 0 || groupNos.includes(selectedGroup))) return selectedGroup;

  const directGroup = normalizeGroupNo(toText(userData.userGroupNo));
  if (directGroup) return directGroup;

  const roleId = normalizeGroupNo(toText(userData.roleId));
  if (roleId) return roleId;

  const firstGroup = normalizeGroupNo(toText(userGroups[0]?.userGroupNo));
  return firstGroup;
};

const resolveEmployeeId = (userData: Record<string, unknown>): string => {
  return toText(userData.employeeID || userData.EmployeeID);
};

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isAdminToggleEnabled, setIsAdminToggleEnabled] = useState(false);
  const [isSignupB2CEnabled, setIsSignupB2CEnabled] = useState(false);

  const { instance } = useMsal();
  const hasAttemptedSSO = useRef(false);

  // MSAL Initialization and Redirect Handling
  useEffect(() => {
    const processRedirect = async () => {
      if (hasAttemptedSSO.current) return;
      hasAttemptedSSO.current = true;

      try {
        await b2cInstance.initialize().catch(e => console.warn("B2C already initialized or error", e));

        let currentResponse = null;
        let isB2C = false;

        // 1. Handle Redirect from IDP (AD/B2C)
        const response = await instance.handleRedirectPromise();
        if (response && response.accessToken) {
            currentResponse = response;
        }

        if (!currentResponse) {
            const b2cResponse = await b2cInstance.handleRedirectPromise();
            if (b2cResponse && b2cResponse.accessToken) {
                currentResponse = b2cResponse;
                isB2C = true;
            }
        }

        // 2. Clear auto-login logic to allow user choice (as per user request)
        // We only process redirects now.

        if (currentResponse && currentResponse.accessToken) {
          setIsLoading(true);
          const resolvedEmail = currentResponse.account?.username || '';

          const apiPayload = {
              employeeID: isB2C ? resolvedEmail : (resolvedEmail.split('@')[0] || ''),
              email: resolvedEmail,
              accessToken: currentResponse.accessToken,
              type: isB2C ? 'B2C' : 'AD'
          };

          const apiRes = await fetch('/api/auth/sso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload),
          });

          if (apiRes.ok) {
              const data = await apiRes.json();
              const { user: userData, token } = data;

              setAuthCookie(token);
              localStorage.setItem('auth_token', token);
              localStorage.setItem('user_data', JSON.stringify(userData));

              if (data.config?.startYear) {
                  localStorage.setItem('StartYear', data.config.startYear);
              }

              // Prefetch units and redirect
              const normalizedUser = (userData || {}) as Record<string, unknown>;
              const employeeId = resolveEmployeeId(normalizedUser);
              const defaultRole = resolveDefaultRole(normalizedUser);
              const userGroups = Array.isArray(normalizedUser.userGroups)
                ? (normalizedUser.userGroups as Array<Record<string, unknown>>)
                : [];
              const selectedGroupMeta = userGroups.find((group) => normalizeGroupNo(toText(group.userGroupNo)) === defaultRole);
              if (defaultRole) {
                localStorage.setItem('selected_usergroup', defaultRole);
                localStorage.setItem('selected_usergroup_role', toText(selectedGroupMeta?.userGroupRole));
              }
              clearUnitsCacheKeys();
              if (employeeId && defaultRole) {
                fetch(buildApiPath('/api/units/by-role', { empId: employeeId, roleId: defaultRole }), {
                  headers: buildAuthHeaders(token)
                })
                  .then(async (res) => {
                    const { json: unitData, text } = await readJsonOrText<{ success?: boolean; data?: unknown[]; message?: string; error?: string }>(res);
                    if (!res.ok) {
                      console.error('Failed to prefetch units (SSO):', unitData?.error || unitData?.message || text || `HTTP ${res.status}`);
                      return;
                    }
                    if (unitData?.success && Array.isArray(unitData.data)) {
                      setSessionJson(buildUnitsCacheKey(employeeId, defaultRole), unitData.data);
                    }
                  })
                  .catch(() => {});
              }

              router.push('/home');
          } else {
              const errData = await apiRes.json().catch(() => ({}));
              toast.error('SSO Authentication Failed', {
                  description: errData.message || 'The system could not verify your identity. Please try again.',
                  duration: 5000
              });
              setIsLoading(false);
          }
        }
      } catch (e) {
        console.error("SSO processing error:", e);
        setIsLoading(false);
      }
    };
    processRedirect();
  }, [instance, router]);

  // Fetch Configurations
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        // Fetch Admin Login config
        const adminRes = await fetch('/api/auth/config/LoginAdmin');
        if (adminRes.ok) {
          const data = await adminRes.json();
          setIsAdminToggleEnabled(data.value === 'true' || data.value === true);
        }

        // Fetch SignupB2C config
        const signupRes = await fetch('/api/auth/config/SignupB2C');
        if (signupRes.ok) {
          const data = await signupRes.json();
          const val = data.value?.toString().toLowerCase();
          setIsSignupB2CEnabled(val === 'true' || val === '1' || data.value === true);
        }
      } catch (error) {
        console.error('Failed to fetch configs:', error);
      }
    };
    fetchConfigs();
  }, []);

  const handleSSOLogin = async () => {
    setIsLoading(true);
    try {
      // Initialize msal if not already
      await instance.initialize().catch(() => {});

      const redirectConfig: RedirectRequest = {
          ...loginRequest,
          prompt: "select_account" // Allow choosing account without mandatory logout
      };

      if (formData.username) {
          redirectConfig.loginHint = formData.username.includes('@')
              ? formData.username
              : `${formData.username}@pttplctest01.onmicrosoft.com`;
      }

      await instance.loginRedirect(redirectConfig);
    } catch (e) {
      console.error("SSO Initiation error:", e);
      toast.error('System Error', {
        description: 'Failed to initiate Microsoft login.',
        duration: 3000,
      });
      setIsLoading(false);
    }
  };

  const handleB2CLogin = async () => {
      setIsLoading(true);
      try {
        const redirectConfig: RedirectRequest = {
            ...b2cLoginRequest,
            prompt: "select_account"
        };
        if (formData.username) {
             redirectConfig.loginHint = formData.username.includes('@')
              ? formData.username
              : `${formData.username}@pttplcb2ctest01.onmicrosoft.com`; // External domain hint
        }
        await b2cInstance.loginRedirect(redirectConfig);
      } catch (e) {
        console.error("B2C Initiation error:", e);
        toast.error('System Error', {
          description: 'Failed to initiate External login.',
          duration: 3000,
        });
        setIsLoading(false);
      }
  };

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน', {
        description: 'โปรดกรอก EmployeeID และ Password',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    if (!isSecureSubmissionContext()) {
      toast.error('ไม่สามารถส่งรหัสผ่านผ่านการเชื่อมต่อที่ไม่ปลอดภัยได้', {
        description: 'กรุณาเข้าใช้งานผ่าน HTTPS',
        duration: 3000,
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeID: formData.username,
          password: formData.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        const token = data.token;

        // แสดง Toast สำเร็จ
        toast.success('เข้าสู่ระบบสำเร็จ!', {
          description: `ยินดีต้อนรับ ${userData.name}`,
          duration: 5000,
        });

        // Redirect based on user type (หลังจาก 1.5 วินาที)
        setTimeout(() => {
          // Set auth_token cookie
          setAuthCookie(token);

          // Store token and user data
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_data', JSON.stringify(userData));
          if (data.config && data.config.startYear) {
            localStorage.setItem('StartYear', data.config.startYear);
          }

          // Fetch units for the default role upon login
          // Assuming userData.userGroupNo represents their default role upon login
          // Fallback to "01" or first role if structure varies in your system
          const normalizedUser = (userData || {}) as Record<string, unknown>;
          const employeeId = resolveEmployeeId(normalizedUser);
          const defaultRole = resolveDefaultRole(normalizedUser);
          const userGroups = Array.isArray(normalizedUser.userGroups)
            ? (normalizedUser.userGroups as Array<Record<string, unknown>>)
            : [];
          const selectedGroupMeta = userGroups.find((group) => normalizeGroupNo(toText(group.userGroupNo)) === defaultRole);
          if (defaultRole) {
            localStorage.setItem('selected_usergroup', defaultRole);
            localStorage.setItem('selected_usergroup_role', toText(selectedGroupMeta?.userGroupRole));
          }
          clearUnitsCacheKeys();
          if (employeeId && defaultRole) {
            fetch(buildApiPath('/api/units/by-role', { empId: employeeId, roleId: defaultRole }), {
              headers: buildAuthHeaders(token)
            })
              .then(async (res) => {
                const { json: unitData, text } = await readJsonOrText<{ success?: boolean; data?: unknown[]; message?: string; error?: string }>(res);
                if (!res.ok) {
                  console.error('Failed to prefetch units:', unitData?.error || unitData?.message || text || `HTTP ${res.status}`);
                  return;
                }
                if (unitData?.success && Array.isArray(unitData.data)) {
                  setSessionJson(buildUnitsCacheKey(employeeId, defaultRole), unitData.data);
                }
              })
              .catch(err => console.error("Failed to prefetch units:", err));
          }

          // Redirect ไปหน้า /home
          router.push('/home');

          toast.info('กำลังเปลี่ยนหน้า...', {
            description: 'ไปยังหน้าหลักของระบบ',
            duration: 2000,
          });
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const backendMessage = typeof errorData?.message === 'string' ? errorData.message : '';

        // กรณี login ไม่ผ่าน
        toast.error('เข้าสู่ระบบไม่สำเร็จ', {
          description: backendMessage || 'ไม่พบผู้ใช้งานใน MP_User',
          duration: 4000,
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ', {
        description: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่ภายหลัง',
        duration: 4000,
      });
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };


  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(0.85) contrast(1.1)',
          }}
        ></div>

        {/* Gradient Overlay for Professional Look */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-800/30 to-blue-800/40"></div>

        {/* Subtle Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
                linear-gradient(45deg, rgba(255,255,255,.05) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(255,255,255,.05) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(255,255,255,.05) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.05) 75%)
              `,
            backgroundSize: '60px 60px',
            backgroundPosition: '0 0, 0 30px, 30px -30px, -30px 0px',
          }}
        ></div>

        {/* Soft Blur Vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.3)]"></div>

        <Card className="w-full max-w-[38rem] shadow-2xl relative z-10 bg-white/95 backdrop-blur-sm border-0">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center h-20 mb-4 mx-auto">
              <Image
                src="/images/logoptt.png"
                alt="PTT Logo"
                width={482}
                height={220}
                className="h-auto w-[220px] max-w-full object-contain"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            </div>

            <CardDescription className="text-2xl font-medium text-blue-500 english-text">
              Strategic Workforce Planning System
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 px-8 pb-8">
            {/* Primary SSO Login Options */}
            <div className="space-y-4">
              <Button
                onClick={handleSSOLogin}
                type="button"
                variant="outline"
                className="w-full h-14 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border-2 border-slate-200 hover:border-blue-500 shadow-sm hover:shadow transition-all duration-200 rounded-xl english-text flex items-center justify-center gap-3"
                disabled={isLoading}
              >
                <svg viewBox="0 0 23 23" className="w-6 h-6">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Sign in with PTT (Azure AD)
              </Button>

              <Button
                onClick={handleB2CLogin}
                type="button"
                variant="outline"
                className="w-full h-14 bg-white hover:bg-green-50 text-green-700 font-semibold text-base border-2 border-slate-200 hover:border-green-500 shadow-sm hover:shadow transition-all duration-200 rounded-xl english-text flex items-center justify-center gap-3"
                disabled={isLoading}
              >
                Sign in for External (B2C)
              </Button>
            </div>

            {isSignupB2CEnabled && (
              <div className="flex justify-center mt-4">
                <p className="text-sm text-slate-500">
                  Don&apos;t have an external (B2C) account?{' '}
                  <Link
                    href="/register"
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    Register now
                  </Link>
                </p>
              </div>
            )}

            {/* Admin Login Toggle */}
            {isAdminToggleEnabled && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowAdminLogin(!showAdminLogin)}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline-offset-4 hover:underline"
                >
                  {showAdminLogin ? "Hide Admin Login" : "Admin Login"}
                </button>
              </div>
            )}

            {/* Local / Admin Login Form */}
            {showAdminLogin && (
              <div className="space-y-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-slate-600 font-medium text-sm english-text"
                  >
                    EmployeeID
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter EmployeeID"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      onKeyDown={handleKeyDown}
                      className="pl-10 h-11 text-sm bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-slate-600 font-medium text-sm english-text"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      onKeyDown={handleKeyDown}
                      className="pl-10 pr-10 h-11 text-sm bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-9 w-9 hover:bg-slate-100 rounded-md"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleLogin}
                  className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm shadow transition-all duration-200 rounded-lg english-text"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Login'}
                </Button>
              </div>
            )}
            {/* Footer */}
            <div className="text-center text-xs text-slate-400 space-y-1 english-text">
              <p>© 2026 PTT. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>

      </div>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-80 animate-in fade-in zoom-in duration-300">
            {/* Decorative gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-blue-500 to-red-500 rounded-2xl opacity-20 blur-xl"></div>

            <div className="relative z-10 flex flex-col items-center space-y-6">
              {/* Spinner */}
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>

              {/* Loading Text */}
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-gray-800 english-text">
                  Logging in...
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
