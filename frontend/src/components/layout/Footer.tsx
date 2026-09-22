import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200/80 bg-white/40 backdrop-blur-sm py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-neutral-800">BookingPro</span>
          <span>•</span>
          <span>© {new Date().getFullYear()} Service Booking Management.</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link href="/services" className="hover:text-neutral-900 transition">Dịch vụ</Link>
          <Link href="/booking" className="hover:text-neutral-900 transition">Đặt lịch</Link>
          <Link href="/my-bookings" className="hover:text-neutral-900 transition">Lịch của tôi</Link>
        </div>

        <div className="flex items-center gap-3 font-mono tabular-nums text-[11px] text-neutral-400">
          <span className="hover:text-neutral-700 transition">ASP.NET Core 8</span>
          <span>/</span>
          <span className="hover:text-neutral-700 transition">Next.js 14</span>
          <span>/</span>
          <span className="hover:text-neutral-700 transition">EF Core</span>
        </div>
      </div>
    </footer>
  );
}
