"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { setAuth } from '@/lib/auth';
import { AuthResponse } from '@/types';
import { Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await apiClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAuth(data.token, data.user);

      if (data.user.role === 'Admin') {
        router.push('/admin/bookings');
      } else {
        router.push('/services');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đăng nhập không thành công.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Đăng Nhập Hệ Thống</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập để đặt lịch và quản lý dịch vụ</p>
        </div>

        {errorMessage && (
          <ErrorAlert message={errorMessage} className="mb-6" />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill Section */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>TÀI KHOẢN DÙNG THỬ NHANH (DEMO)</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@booking.com', 'Admin123!')}
              className="px-3 py-2 text-left text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg flex items-center justify-between transition"
            >
              <span>Admin: <strong>admin@booking.com</strong></span>
              <span className="text-[11px] px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-medium">Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('customer1@demo.com', 'Password123!')}
              className="px-3 py-2 text-left text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg flex items-center justify-between transition"
            >
              <span>Khách 1: <strong>customer1@demo.com</strong></span>
              <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">Khách</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('customer2@demo.com', 'Password123!')}
              className="px-3 py-2 text-left text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg flex items-center justify-between transition"
            >
              <span>Khách 2: <strong>customer2@demo.com</strong></span>
              <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">Khách</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
