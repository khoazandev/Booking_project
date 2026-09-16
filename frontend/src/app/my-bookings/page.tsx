"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';
import { Booking, BookingStatus, PagedResult } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [selectedCancelBooking, setSelectedCancelBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchMyBookings = useCallback(async () => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<PagedResult<Booking>>('/bookings/my-bookings', {
        params: {
          status: statusFilter || undefined,
          pageSize: 50,
        },
      });
      setBookings(data.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách lịch hẹn.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [router, statusFilter]);

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCancelBooking || !cancellationReason.trim()) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      await apiClient(`/bookings/${selectedCancelBooking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason }),
      });

      setSelectedCancelBooking(null);
      setCancellationReason('');
      await fetchMyBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể hủy lịch hẹn.';
      setCancelError(message);
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Chờ xác nhận</span>;
      case 'Confirmed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Đã xác nhận</span>;
      case 'Completed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Đã hoàn thành</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Đã hủy</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lịch Hẹn Của Tôi</h1>
          <p className="text-sm text-slate-600 mt-1">Theo dõi trạng thái và quản lý các lịch hẹn đã đặt</p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Lọc:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Pending">Chờ xác nhận</option>
            <option value="Confirmed">Đã xác nhận</option>
            <option value="Completed">Đã hoàn thành</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchMyBookings} />}

      {isLoading && <LoadingSkeleton count={4} height="h-28" />}

      {!isLoading && !error && bookings.length === 0 && (
        <EmptyState
          title="Bạn chưa có lịch hẹn nào"
          description="Hãy chọn dịch vụ và đặt lịch hẹn để trải nghiệm dịch vụ của chúng tôi."
          actionText="Đặt lịch ngay"
          onAction={() => router.push('/booking')}
        />
      )}

      {!isLoading && !error && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isCompleted = booking.status === 'Completed';
            const isCancelled = booking.status === 'Cancelled';
            const isPast = new Date(booking.startTime).getTime() <= Date.now();
            const canCancel = !isCompleted && !isCancelled && !isPast;

            return (
              <div
                key={booking.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {booking.bookingCode}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>
                  <h3 className="font-bold text-base text-slate-900">{booking.serviceName}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Kỹ thuật viên: <strong className="text-slate-700">{booking.staffName}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Bắt đầu: <strong className="text-slate-700">{formatDateTime(booking.startTime)}</strong>
                    </span>
                    <span>
                      Giá: <strong className="text-indigo-600 font-semibold">{formatCurrency(booking.servicePrice)}</strong>
                    </span>
                  </div>
                  {booking.cancellationReason && (
                    <p className="text-xs text-rose-600 italic bg-rose-50 px-2 py-1 rounded">
                      Lý do hủy: {booking.cancellationReason}
                    </p>
                  )}
                </div>

                <div>
                  {canCancel ? (
                    <button
                      onClick={() => {
                        setSelectedCancelBooking(booking);
                        setCancelError(null);
                        setCancellationReason('');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                    >
                      Hủy lịch hẹn
                    </button>
                  ) : isCancelled ? (
                    <span className="text-xs text-slate-400">Đã hủy</span>
                  ) : isCompleted ? (
                    <span className="text-xs text-emerald-600 font-medium">Hoàn tất</span>
                  ) : isPast ? (
                    <span className="text-xs text-slate-400" title="Không thể hủy lịch đã đến giờ hẹn">
                      Đã qua giờ hẹn
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {selectedCancelBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-lg text-slate-900">Xác Nhận Hủy Lịch Hẹn</h3>
            </div>

            <p className="text-xs text-slate-600">
              Bạn đang yêu cầu hủy lịch hẹn <strong>{selectedCancelBooking.bookingCode}</strong> ({selectedCancelBooking.serviceName}).
              Khung giờ này sẽ được giải phóng cho khách hàng khác.
            </p>

            {cancelError && <ErrorAlert message={cancelError} />}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lý do hủy (Bắt buộc)
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Vui lòng nhập lý do bạn cần hủy lịch..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setSelectedCancelBooking(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || !cancellationReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition flex items-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang hủy...</span>
                    </>
                  ) : (
                    <span>Xác nhận hủy</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
