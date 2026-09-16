"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Scissors, Clock } from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: '/admin/bookings', label: 'Quản trị Bookings', icon: CalendarDays },
    { href: '/admin/calendar', label: 'Lịch Biểu Tuần (Calendar)', icon: CalendarDays },
    { href: '/admin/services', label: 'Quản lý Dịch vụ', icon: Scissors },
    { href: '/admin/schedules', label: 'Xếp lịch Nhân viên', icon: Clock },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 mb-6">
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
