"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { startSignalR } from '@/lib/signalr';
import { isAdmin, isAuthenticated } from '@/lib/auth';
import { Booking, BookingStatus, PagedResult } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { AdminNav } from '@/components/layout/AdminNav';
import { ShieldCheck, Check, CheckCheck, X, Loader2 } from 'lucide-react';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<PagedResult<Booking>>('/bookings', {
        params: {
          status: statusFilter || undefined,
          pageSize: 50,
        },
      });
      setBookings(data.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách booking quản trị.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [router, statusFilter]);

  useEffect(() => {
    fetchBookings();

    // BONUS 3: SignalR Realtime updates for Admin
    let active = true;
    startSignalR().then((hub) => {
      if (!hub || !active) return;
      hub.on('BookingCreated', () => active && fetchBookings());
      hub.on('BookingStatusUpdated', () => active && fetchBookings());
      hub.on('BookingCancelled', () => active && fetchBookings());
    });

    return () => {
      active = false;
    };
  }, [fetchBookings]);

  const handleUpdateStatus = async (id: number, newStatus: BookingStatus) => {
    setUpdatingId(id);
    try {
      await apiClient(`/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại.';
      alert(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Chờ xác nhận</span>;
      case 'Confirmed':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Đã xác nhận</span>;
      case 'Completed':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Đã hoàn thành</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Đã hủy</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-slate-900">Quản Trị Hệ Thống</h1>
      </div>

      <AdminNav />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Danh Sách Tất Cả Bookings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Xác nhận, hoàn thành hoặc hủy bỏ lịch hẹn toàn hệ thống</p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Chờ xác nhận</option>
          <option value="Confirmed">Đã xác nhận</option>
          <option value="Completed">Đã hoàn thành</option>
          <option value="Cancelled">Đã hủy</option>
        </select>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchBookings} />}

      {isLoading && <LoadingSkeleton count={5} height="h-20" />}

      {!isLoading && !error && bookings.length === 0 && (
        <EmptyState title="Không có lịch đặt nào" description="Chưa có dữ liệu theo bộ lọc hiện tại." />
      )}

      {!isLoading && !error && bookings.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Mã Lịch</th>
                  <th className="px-5 py-3.5">Khách Hàng</th>
                  <th className="px-5 py-3.5">Dịch Vụ & Thợ</th>
                  <th className="px-5 py-3.5">Thời Gian</th>
                  <th className="px-5 py-3.5">Trạng Thái</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => {
                  const isUpdating = updatingId === b.id;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4 font-mono font-bold text-xs text-indigo-600">
                        {b.bookingCode}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{b.customerName}</div>
                        {b.customerNote && (
                          <div className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">
                            Note: {b.customerNote}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">{b.serviceName}</div>
                        <div className="text-xs text-slate-500">
                          Thợ: <strong>{b.staffName}</strong> • {formatCurrency(b.servicePrice)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        <div>{formatDateTime(b.startTime)}</div>
                        <div className="text-[11px] text-slate-400">Thời lượng: {b.durationMinutes}p</div>
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(b.status)}
                        {b.cancellationReason && (
                          <div className="text-[11px] text-rose-600 mt-1 italic line-clamp-1">
                            Lý do: {b.cancellationReason}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isUpdating ? (
                          <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 justify-end">
                            {b.status === 'Pending' && (
                              <button
                                onClick={() => handleUpdateStatus(b.id, 'Confirmed')}
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition flex items-center gap-1"
                                title="Xác nhận lịch"
                              >
                                <Check className="w-3 h-3" />
                                Duyệt
                              </button>
                            )}
                            {b.status === 'Confirmed' && (
                              <button
                                onClick={() => handleUpdateStatus(b.id, 'Completed')}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition flex items-center gap-1"
                                title="Hoàn thành lịch"
                              >
                                <CheckCheck className="w-3 h-3" />
                                Hoàn tất
                              </button>
                            )}
                            {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                              <button
                                onClick={() => {
                                  const reason = prompt('Nhập lý do hủy bỏ:');
                                  if (reason) {
                                    apiClient(`/bookings/${b.id}/cancel`, {
                                      method: 'POST',
                                      body: JSON.stringify({ cancellationReason: reason }),
                                    }).then(fetchBookings).catch((e) => alert(e.message));
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hủy booking"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
