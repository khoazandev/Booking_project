"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { startSignalR } from '@/lib/signalr';
import { isAdmin, isAuthenticated } from '@/lib/auth';
import { Booking, BookingStatus, PagedResult, Staff } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { AdminNav } from '@/components/layout/AdminNav';
import { ShieldCheck, Check, CheckCheck, X, Loader2, ChevronLeft, ChevronRight, Filter, Calendar, User } from 'lucide-react';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [staffFilter, setStaffFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelModalError, setCancelModalError] = useState<string | null>(null);

  // 1. Fetch Staffs for filter dropdown
  useEffect(() => {
    async function loadStaffs() {
      try {
        const data = await apiClient<Staff[]>('/staffs');
        setStaffs(data);
      } catch {
        // Fallback silently if staffs cannot be fetched
      }
    }
    loadStaffs();
  }, []);

  // 2. Fetch Bookings with filters & pagination
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
          staffId: staffFilter ? Number(staffFilter) : undefined,
          date: dateFilter || undefined,
          page,
          pageSize,
        },
      });
      setBookings(data.items);
      setTotalCount(data.totalCount);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách booking quản trị.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [router, statusFilter, staffFilter, dateFilter, page, pageSize]);

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

  // Reset page to 1 when filters change
  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleStaffChange = (val: string) => {
    setStaffFilter(val);
    setPage(1);
  };

  const handleDateChange = (val: string) => {
    setDateFilter(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setStaffFilter('');
    setDateFilter('');
    setPage(1);
  };

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

  // Confirm cancel via modal
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking) return;
    if (!cancelReason.trim()) {
      setCancelModalError('Vui lòng nhập lý do hủy lịch.');
      return;
    }

    setIsCancelling(true);
    setCancelModalError(null);

    try {
      await apiClient(`/bookings/${cancellingBooking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: cancelReason.trim() }),
      });
      setCancellingBooking(null);
      setCancelReason('');
      await fetchBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hủy lịch hẹn thất bại.';
      setCancelModalError(message);
    } finally {
      setIsCancelling(false);
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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-slate-900">Quản Trị Hệ Thống</h1>
      </div>

      <AdminNav />

      {/* Header & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Danh Sách Bookings</h2>
            <p className="text-xs text-slate-500">Lọc theo ngày, thợ, trạng thái và thực hiện duyệt/hoàn thành/hủy</p>
          </div>
          {(statusFilter || staffFilter || dateFilter) && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-medium text-purple-600 hover:text-purple-800 underline self-start sm:self-auto"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Trạng thái:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Chờ xác nhận</option>
              <option value="Confirmed">Đã xác nhận</option>
              <option value="Completed">Đã hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>

          {/* Staff Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Kỹ thuật viên:
            </label>
            <select
              value={staffFilter}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tất cả nhân viên</option>
              {staffs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Ngày hẹn:
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchBookings} />}

      {isLoading && <LoadingSkeleton count={5} height="h-20" />}

      {!isLoading && !error && bookings.length === 0 && (
        <EmptyState
          title="Không tìm thấy lịch đặt nào"
          description="Không có dữ liệu phù hợp với các tiêu chí lọc đang chọn."
        />
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
                                  setCancellingBooking(b);
                                  setCancelReason('');
                                  setCancelModalError(null);
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

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
            <div>
              Hiển thị <span className="font-semibold text-slate-800">{bookings.length}</span> / <span className="font-semibold text-slate-800">{totalCount}</span> lịch hẹn
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-slate-700">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Cancel Confirmation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Xác Nhận Hủy Lịch Hẹn</h3>
              <button
                onClick={() => setCancellingBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
              <div>Mã lịch hẹn: <strong className="text-indigo-600 font-mono">{cancellingBooking.bookingCode}</strong></div>
              <div>Khách hàng: <strong className="text-slate-800">{cancellingBooking.customerName}</strong></div>
              <div>Dịch vụ: <strong className="text-slate-800">{cancellingBooking.serviceName}</strong></div>
              <div>Thời gian: <strong className="text-slate-800">{formatDateTime(cancellingBooking.startTime)}</strong></div>
            </div>

            {cancelModalError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {cancelModalError}
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do hủy bỏ <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ví dụ: Khách hàng báo bận đột xuất, nhân viên bị ốm..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
