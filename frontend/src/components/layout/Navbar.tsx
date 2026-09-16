"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearAuth } from '@/lib/auth';
import { User } from '@/types';
import { Calendar, User as UserIcon, LogOut, ShieldCheck } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(getUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/services" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 leading-tight block">BookingPro</span>
              <span className="text-[11px] text-slate-500 block leading-tight">Service Management</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/services"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname === '/services'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Dịch vụ
            </Link>
            <Link
              href="/booking"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname === '/booking'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Đặt lịch
            </Link>
            {currentUser && (
              <Link
                href="/my-bookings"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  pathname === '/my-bookings'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Lịch hẹn của tôi
              </Link>
            )}
            {currentUser?.role === 'Admin' && (
              <div className="flex items-center gap-1 pl-2 border-l border-slate-200 ml-2">
                <Link
                  href="/admin/bookings"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    pathname.startsWith('/admin')
                      ? 'bg-purple-100 text-purple-800'
                      : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin Portal
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-700">{currentUser.fullName}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  currentUser.role === 'Admin' ? 'bg-purple-200 text-purple-900' : 'bg-indigo-200 text-indigo-900'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-indigo-200 transition"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
