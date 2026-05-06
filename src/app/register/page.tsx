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
import { ArrowLeft, CheckCircle2, Mail, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    firstName: '',
    lastName: '',
    password: '',
    token: searchParams.get('token') || ''
  });

  // Automatically move to step 3 if token is present
  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    if (token) {
      setStep(3);
      setFormData(prev => ({ ...prev, token, email: email || prev.email }));
    }
  }, [searchParams]);

  // Check if Registration is enabled
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch('/api/auth/config/SignupB2C');
        if (res.ok) {
          const data = await res.json();
          const val = data.value?.toString().toLowerCase();
          const isEnabled = val === 'true' || val === '1' || data.value === true;
          if (!isEnabled) {
            console.warn("SignupB2C is disabled or not set in DB. Redirecting back to login.");
            toast.error('Registration is currently disabled (SignupB2C=false)');
            setTimeout(() => router.push('/login'), 2000);
          } else {
            console.log("SignupB2C enabled. Registration allowed.");
            setIsConfigLoading(false);
          }
        } else {
           // Fallback to disabled if config check fails
           router.push('/login');
        }
      } catch (error) {
        console.error('Failed to fetch SignupB2C config:', error);
        router.push('/login');
      }
    };
    checkConfig();
  }, [router]);

  const handleVerifyEmail = async () => {
    console.log(`[Register] Attempting to verify email: ${formData.email}`);
    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      console.log(`[Register] Verify API Status: ${res.status}`);

      if (res.ok) {
        toast.success('Verification email sent!', {
          description: 'Please check your inbox for instructions.',
        });
        setStep(2);
      } else {
        const data = await res.json();
        toast.error('Failed to send verification', {
          description: data.message || 'Please try again later.',
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Connection error', {
        description: 'Could not connect to the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    console.log(`[Register] Attempting to create account for: ${formData.email}`);
    if (!formData.firstName || !formData.lastName || !formData.password) {
      toast.error('Please fill in all fields including password');
      return;
    }

    if (!formData.token) {
      toast.error('Verification token is missing. Please click the link in your email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      console.log(`[Register] Create Account API Status: ${res.status}`);

      if (res.ok) {
        toast.success('Account created successfully!', {
          description: 'You can now sign in with your external account.',
        });
        setTimeout(() => router.push('/login'), 3000);
      } else {
        const data = await res.json();
        toast.error('Account creation failed', {
          description: data.message || 'Please contact support.',
        });
      }
    } catch (error) {
      console.error('Account creation error:', error);
      toast.error('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background - same as login */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.85) contrast(1.1)',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-800/30 to-blue-800/40"></div>

        <Card className="w-full max-w-md shadow-2xl relative z-10 bg-white/95 backdrop-blur-sm border-0 overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center h-16 mb-4">
              <Image src="/images/logoptt.png" alt="PTT Logo" width={482} height={220} className="h-auto w-[180px] max-w-full object-contain" priority />
            </div>
            <CardDescription className="text-xl font-semibold text-blue-600">
              External User Registration
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-slate-500 text-center">
                  Register with your email to access the Strategic Workforce Planning System.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10 h-11"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleVerifyEmail} className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Verify Email'}
                </Button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="flex justify-center">
                  <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600 animate-bounce" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800">Check Your Email</h3>
                  <p className="text-sm text-slate-500">
                    We&apos;ve sent a verification link to <span className="font-semibold">{formData.email}</span>. 
                    Please follow the link in your email to complete the verification before continuing.
                  </p>
                </div>
                <Button onClick={() => setStep(3)} variant="outline" className="w-full h-11 border-blue-200 text-blue-600 hover:bg-blue-50">
                  I&apos;ve verified my email
                </Button>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-slate-400 hover:text-slate-600 underline"
                >
                  Change email address
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-slate-500 text-center">
                  Almost there! Please provide your details to complete the registration.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="firstName"
                        placeholder="John"
                        className="pl-10 h-11"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      className="h-11"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" title="password" className="text-sm font-medium">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="h-11"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400 italic">Password must be at least 8 characters</p>
                </div>
                <Button onClick={handleCreateAccount} className="w-full h-11 bg-green-600 hover:bg-green-700" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  );
}
