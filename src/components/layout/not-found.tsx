'use client';

import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/home');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      {/* Main Content */}
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">404</h1>

        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          หน้าที่ไม่พบ
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          ขออภัย ไม่พบหน้าที่คุณต้องการ
          <br />
          หน้าเว็บนี้อาจจะถูกย้าย เปลี่ยนชื่อ หรือไม่มีอยู่
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2 font-medium"
          >
            <Home className="w-5 h-5" />
            <span>กลับหน้าหลัก</span>
          </button>

          <button
            onClick={handleGoBack}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center space-x-2 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>กลับหน้าก่อนหน้า</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Strategic Workforce Planning System
        </p>
      </div>
    </div>
  );
}
