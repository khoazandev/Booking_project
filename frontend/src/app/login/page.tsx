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

      const rawRole = data.user.role as unknown;
      const isAdminUser = rawRole === 'Admin' || rawRole === 0 || rawRole === '0';
      setAuth(data.token, { ...data.user, role: isAdminUser ? 'Admin' : 'Customer' });

      if (isAdminUser) {
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
    <div className="max-w-md mx-auto my-10 px-2">
      <div className="bg-white/90 border border-neutral-200/90 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] backdrop-blur-md p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center mx-auto mb-3.5 shadow-sm ring-1 ring-black/10">
            <Lock className="w-5 h-5 text-neutral-200" />
          </div>
          <h1 className="text-2xl font-display font-medium text-[#0a0a0a] tracking-tight">Đăng Nhập Tài Khoản</h1>
          <p className="text-xs text-neutral-500 mt-1.5">Truy cập hệ thống quản lý & đặt lịch trực tuyến</p>
        </div>

        {errorMessage && (
          <ErrorAlert message={errorMessage} className="mb-6" />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-600 mb-1.5">
              Email đăng nhập
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50/60 border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-600 mb-1.5">
              Mật khẩu bảo mật
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50/60 border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#0a0a0a] hover:bg-[#1a1a1a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm rounded-xl shadow-[0_14px_32px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-black/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill Section */}
        <div className="mt-8 pt-6 border-t border-neutral-100">
          <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-neutral-500 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#ff6b00]" />
            <span>TÀI KHOẢN TRẢI NGHIỆM NHANH (DEMO)</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@booking.com', 'Admin123!')}
              className="px-3.5 py-2.5 text-left text-xs bg-neutral-50 hover:bg-neutral-100/90 border border-neutral-200/80 rounded-xl flex items-center justify-between transition active:scale-[0.99]"
            >
              <span className="font-mono text-neutral-800">admin@booking.com</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-neutral-900 text-white rounded-full">Quản trị viên</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('customer1@demo.com', 'Password123!')}
              className="px-3.5 py-2.5 text-left text-xs bg-neutral-50 hover:bg-neutral-100/90 border border-neutral-200/80 rounded-xl flex items-center justify-between transition active:scale-[0.99]"
            >
              <span className="font-mono text-neutral-800">customer1@demo.com</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-neutral-200 text-neutral-800 rounded-full">Khách hàng 1</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('customer2@demo.com', 'Password123!')}
              className="px-3.5 py-2.5 text-left text-xs bg-neutral-50 hover:bg-neutral-100/90 border border-neutral-200/80 rounded-xl flex items-center justify-between transition active:scale-[0.99]"
            >
              <span className="font-mono text-neutral-800">customer2@demo.com</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-neutral-200 text-neutral-800 rounded-full">Khách hàng 2</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
