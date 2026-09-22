"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Scissors, Clock, CalendarRange } from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: '/admin/bookings', label: 'Quản trị Bookings', icon: CalendarDays },
    { href: '/admin/calendar', label: 'Lịch Biểu Tuần', icon: CalendarRange },
    { href: '/admin/services', label: 'Quản lý Dịch vụ', icon: Scissors },
    { href: '/admin/schedules', label: 'Xếp lịch Nhân viên', icon: Clock },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
      {/* Segmented Pill Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full border border-neutral-200/80 bg-white/80 shadow-[0_6px_18px_-6px_rgba(15,15,15,0.06)] backdrop-blur-md">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs tracking-tight transition-all duration-200 active:scale-[0.98] ${
                isActive
                  ? 'bg-[#0a0a0a] text-white font-semibold shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80 font-medium'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#ff6b00]' : 'text-neutral-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Admin Mode Pill Badge */}
      <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200/80 bg-white/60 text-xs font-mono tabular-nums text-neutral-600 shadow-sm backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-[#ff6b00] animate-pulse" />
        <span className="font-semibold text-neutral-800">Admin Live Control</span>
      </div>
    </div>
  );
}
