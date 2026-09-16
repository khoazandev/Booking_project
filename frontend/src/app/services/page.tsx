"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Service, PagedResult } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Clock, CalendarPlus, Search, Sparkles } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
          <Sparkles className="w-3.5 h-3.5" />
          <span>DỊCH VỤ CHUYÊN NGHIỆP</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Danh Sách Dịch Vụ & Đặt Hẹn
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Lựa chọn dịch vụ phù hợp và đặt lịch hẹn với kỹ thuật viên lành nghề trong vài bước đơn giản.
        </p>

        {/* Search Bar */}
        <div className="pt-2 max-w-md mx-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm dịch vụ theo tên hoặc mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorAlert message={error} onRetry={fetchServices} />}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingSkeleton count={6} height="h-56" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && services.length === 0 && (
        <EmptyState
          title="Không tìm thấy dịch vụ nào"
          description="Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc."
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
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition">
                    {service.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full flex-shrink-0">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {service.durationMinutes} phút
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {service.description || "Dịch vụ chất lượng cao được thực hiện bởi đội ngũ nhân viên chuyên nghiệp."}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">GIÁ DỊCH VỤ</span>
                  <span className="text-xl font-extrabold text-indigo-600">
                    {formatCurrency(service.price)}
                  </span>
                </div>
                <Link
                  href={`/booking?serviceId=${service.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-200 transition"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Đặt lịch</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
