"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Service, PagedResult } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Clock, CalendarPlus, Search, ArrowRight } from 'lucide-react';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<PagedResult<Service>>('/services', {
        params: { search: search || undefined, isActive: true },
      });
      setServices(data.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách dịch vụ.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchServices]);

  return (
    <div className="space-y-10">
      {/* Hero Header - Taste Skill Editorial Style */}
      <div className="text-center max-w-2xl mx-auto space-y-4 pt-4 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200/90 bg-white/80 text-[11px] font-mono tracking-tight text-neutral-700 shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
          <span>DANH MỤC DỊCH VỤ</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-medium tracking-tight text-[#0a0a0a] leading-[1.08]">
          Trải nghiệm dịch vụ đẳng cấp
        </h1>

        <p className="text-neutral-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Đặt lịch hẹn nhanh chóng với đội ngũ kỹ thuật viên lành nghề cùng quy trình tiêu chuẩn hóa.
        </p>

        {/* Refined Search Bar */}
        <div className="pt-2 max-w-md mx-auto relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm dịch vụ theo tên hoặc mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-neutral-200/90 rounded-2xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] transition backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorAlert message={error} onRetry={fetchServices} />}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingSkeleton count={6} height="h-60" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && services.length === 0 && (
        <EmptyState
          title="Không tìm thấy dịch vụ nào"
          description="Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc hiện tại."
          actionText="Xem tất cả dịch vụ"
          onAction={() => setSearch('')}
        />
      )}

      {/* Services Grid */}
      {!isLoading && !error && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white/80 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all duration-300 hover:border-neutral-300 hover:bg-white hover:shadow-[0_12px_28px_-6px_rgba(15,15,15,0.1)] hover:-translate-y-1"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-base sm:text-lg text-[#0a0a0a] group-hover:text-black transition tracking-tight">
                    {service.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-xs px-2.5 py-1 rounded-full border border-neutral-200/70 bg-neutral-100/70 text-neutral-600 flex-shrink-0">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    {service.durationMinutes}m
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 line-clamp-2 leading-relaxed">
                  {service.description || "Dịch vụ chất lượng cao được thiết kế mang lại trải nghiệm tốt nhất."}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">GIÁ NIÊM YẾT</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-[#0a0a0a]">
                    {formatCurrency(service.price)}
                  </span>
                </div>
                <Link
                  href={`/booking?serviceId=${service.id}`}
                  className="group/btn relative inline-flex items-center gap-1.5 px-4 py-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white text-xs font-semibold rounded-xl shadow-[0_6px_16px_-4px_rgba(0,0,0,0.35)] transition-all duration-200 active:scale-[0.98]"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Đặt lịch</span>
                  <ArrowRight className="w-3 h-3 text-neutral-400 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
