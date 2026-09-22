"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearAuth } from '@/lib/auth';
import { User } from '@/types';
import { Calendar, LogOut, ShieldCheck, Menu, X, ArrowUpRight } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getUser());
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
    router.push('/login');
  };

  const navLinks = [
    { href: '/services', label: 'Dịch vụ' },
    { href: '/booking', label: 'Đặt lịch' },
    ...(currentUser ? [{ href: '/my-bookings', label: 'Lịch hẹn của tôi' }] : []),
  ];

  return (
    <header className="sticky top-3 sm:top-4 z-50 px-3 sm:px-6 w-full pointer-events-none">
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo Pill */}
        <Link
          href="/services"
          className="pointer-events-auto group relative inline-flex shrink-0 items-center gap-2.5 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/80 px-2.5 py-1.5 pr-4 shadow-[0_6px_18px_-6px_rgba(15,15,15,0.08),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all duration-300 hover:border-neutral-300 hover:bg-white hover:shadow-[0_12px_28px_-6px_rgba(15,15,15,0.14)] active:scale-[0.98]"
        >
          <div className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-[#0a0a0a] text-white shadow-sm ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-105">
            <Calendar className="w-3.5 h-3.5 text-neutral-100" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold tracking-tight text-[#0a0a0a]">
                BookingPro
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Pill */}
        <div className="hidden md:inline-flex pointer-events-auto items-center gap-1 rounded-full border border-neutral-200/80 bg-white/80 p-1 shadow-[0_6px_18px_-6px_rgba(15,15,15,0.08),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all duration-300 hover:border-neutral-300">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium tracking-tight transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#0a0a0a] text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {currentUser?.role === 'Admin' && (
            <div className="flex items-center pl-1 ml-1 border-l border-neutral-200">
              <Link
                href="/admin/bookings"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all active:scale-[0.98] ${
                  pathname.startsWith('/admin')
                    ? 'bg-[#0a0a0a] text-white ring-1 ring-[#ff6b00]/50'
                    : 'text-neutral-900 hover:bg-neutral-100/90'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#ff6b00]" />
                <span>Admin Portal</span>
              </Link>
            </div>
          )}
        </div>

        {/* User Account / Auth Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          {currentUser ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-white/80 p-1 pl-3 shadow-[0_6px_18px_-6px_rgba(15,15,15,0.08),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-800 tracking-tight max-w-[120px] truncate">
                  {currentUser.fullName}
                </span>
                <span
                  className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full border ${
                    currentUser.role === 'Admin'
                      ? 'bg-neutral-900 text-white border-neutral-800'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full bg-[#0a0a0a] px-4 text-xs font-semibold text-white shadow-[0_14px_32px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-black/20 transition-all duration-300 hover:bg-[#1f1f1f] active:scale-[0.98]"
            >
              <span className="relative z-10">Đăng nhập</span>
              <ArrowUpRight className="relative z-10 w-3.5 h-3.5 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200/80 bg-white/80 text-neutral-800 shadow-sm backdrop-blur-md transition hover:bg-white active:scale-95"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden pointer-events-auto max-w-7xl mx-auto mt-2 p-2 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-xl backdrop-blur-lg flex flex-col gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#0a0a0a] text-white font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {currentUser?.role === 'Admin' && (
            <Link
              href="/admin/bookings"
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition ${
                pathname.startsWith('/admin')
                  ? 'bg-[#0a0a0a] text-white'
                  : 'text-neutral-900 bg-neutral-50 hover:bg-neutral-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#ff6b00]" />
                Admin Portal
              </span>
              <span className="text-xs font-mono text-neutral-400">Panel</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
