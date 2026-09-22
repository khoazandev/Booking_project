"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { startSignalR } from '@/lib/signalr';
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

    // BONUS 3: SignalR Realtime updates for Customer's bookings
    let active = true;
    startSignalR().then((hub) => {
      if (!hub || !active) return;
      hub.on('BookingStatusUpdated', () => active && fetchMyBookings());
      hub.on('BookingCancelled', () => active && fetchMyBookings());
    });

    return () => {
      active = false;
    };
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
        return <span className="px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-amber-50 text-amber-900 border border-amber-200/80">Chờ duyệt</span>;
      case 'Confirmed':
        return <span className="px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-[#0a0a0a] text-white border border-black">Đã xác nhận</span>;
      case 'Completed':
        return <span className="px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">Hoàn thành</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200">Đã hủy</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200/90 bg-white/80 text-[11px] font-mono tracking-tight text-neutral-700 shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
            <span>LỊCH TRÌNH CÁ NHÂN</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#0a0a0a] tracking-tight">
            Lịch hẹn của tôi
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Theo dõi tiến độ, thời gian ca dịch vụ và lịch sử các buổi hẹn đã đăng ký.
          </p>
        </div>

        {/* Status Filter */}
        <div className="inline-flex items-center gap-2 p-1.5 rounded-full border border-neutral-200/80 bg-white/80 shadow-sm backdrop-blur-md">
          <label className="text-[11px] font-mono text-neutral-400 pl-2">LỌC:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 text-xs font-medium bg-transparent rounded-full focus:outline-none text-neutral-800 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Pending">Chờ duyệt</option>
            <option value="Confirmed">Đã xác nhận</option>
            <option value="Completed">Hoàn thành</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchMyBookings} />}

      {isLoading && <LoadingSkeleton count={4} height="h-28" />}

      {!isLoading && !error && bookings.length === 0 && (
        <EmptyState
          title="Bạn chưa có lịch hẹn nào"
          description="Hãy chọn dịch vụ và đặt lịch hẹn để trải nghiệm dịch vụ chuyên nghiệp của chúng tôi."
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
                className="bg-white/80 border border-neutral-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:border-neutral-300 hover:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.08)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#0a0a0a] bg-neutral-100 border border-neutral-200/80 px-2.5 py-0.5 rounded-full">
                      {booking.bookingCode}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>
                  <h3 className="font-semibold text-base text-[#0a0a0a] tracking-tight">{booking.serviceName}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 font-mono tabular-nums">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      KTV: <strong className="text-neutral-800 font-sans">{booking.staffName}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      Bắt đầu: <strong className="text-neutral-800">{formatDateTime(booking.startTime)}</strong>
                    </span>
                    <span>
                      Giá: <strong className="text-[#0a0a0a] font-bold">{formatCurrency(booking.servicePrice)}</strong>
                    </span>
                  </div>
                  {booking.cancellationReason && (
                    <p className="text-xs text-rose-700 italic bg-rose-50/70 border border-rose-200/60 px-3 py-1.5 rounded-xl">
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
                      className="px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200/90 rounded-xl transition active:scale-[0.98]"
                    >
                      Hủy lịch hẹn
                    </button>
                  ) : isCancelled ? (
                    <span className="text-xs font-mono text-neutral-400">Đã hủy</span>
                  ) : isCompleted ? (
                    <span className="text-xs font-mono text-emerald-600 font-medium">Hoàn tất</span>
                  ) : isPast ? (
                    <span className="text-xs font-mono text-neutral-400" title="Không thể hủy lịch đã đến giờ hẹn">
                      Đã qua giờ
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 border border-neutral-200/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 backdrop-blur-md">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-[#0a0a0a]">Xác Nhận Hủy Lịch Hẹn</h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Bạn đang yêu cầu hủy mã đặt chỗ <strong className="font-mono text-neutral-900">{selectedCancelBooking.bookingCode}</strong> ({selectedCancelBooking.serviceName}).
              Khung giờ này sẽ ngay lập tức được giải phóng cho khách hàng khác.
            </p>

            {cancelError && <ErrorAlert message={cancelError} />}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-600 mb-1.5">
                  Lý do hủy lịch (Bắt buộc)
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Vui lòng nhập lý do bạn cần hủy lịch hẹn..."
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setSelectedCancelBooking(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || !cancellationReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 active:scale-[0.98]"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xử lý...</span>
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
