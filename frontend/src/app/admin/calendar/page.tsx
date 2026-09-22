"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { isAdmin, isAuthenticated } from '@/lib/auth';
import { startSignalR } from '@/lib/signalr';
import { Booking, BookingStatus, Staff, PagedResult } from '@/types';
import { formatCurrency, formatTime } from '@/lib/utils';
import { AdminNav } from '@/components/layout/AdminNav';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  CheckCheck,
  X,
} from 'lucide-react';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function AdminCalendarPage() {
  const router = useRouter();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Week anchor date (Monday of current week)
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Modal inspection state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Generate 7 days of the selected week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStartDate);
    day.setDate(day.getDate() + i);
    return day;
  });

  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  // 1. Fetch Staffs
  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }

    async function loadStaffs() {
      try {
        const data = await apiClient<Staff[]>('/staffs', { params: { isActive: true } });
        setStaffs(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Không thể tải danh sách nhân viên.';
        setError(message);
      }
    }

    loadStaffs();
  }, [router]);

  // 2. Fetch Bookings for the week
  const fetchWeekBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<PagedResult<Booking>>('/bookings', {
        params: {
          staffId: selectedStaffId ? Number(selectedStaffId) : undefined,
          pageSize: 200,
        },
      });
      setBookings(data.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu lịch đặt.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStaffId]);

  useEffect(() => {
    fetchWeekBookings();

    // SignalR realtime listener
    let active = true;
    startSignalR().then((hub) => {
      if (!hub || !active) return;
      hub.on('BookingCreated', () => active && fetchWeekBookings());
      hub.on('BookingStatusUpdated', () => active && fetchWeekBookings());
      hub.on('BookingCancelled', () => active && fetchWeekBookings());
    });

    return () => {
      active = false;
    };
  }, [fetchWeekBookings]);

  // Handle status update from modal
  const handleUpdateStatus = async (newStatus: BookingStatus) => {
    if (!selectedBooking) return;
    setIsUpdatingStatus(true);
    try {
      await apiClient(`/bookings/${selectedBooking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setSelectedBooking(null);
      await fetchWeekBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cập nhật thất bại.';
      alert(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    const reason = prompt('Nhập lý do hủy lịch hẹn:');
    if (!reason) return;

    setIsUpdatingStatus(true);
    try {
      await apiClient(`/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: reason }),
      });
      setSelectedBooking(null);
      await fetchWeekBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hủy thất bại.';
      alert(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const prevWeek = () => {
    const prev = new Date(weekStartDate);
    prev.setDate(prev.getDate() - 7);
    setWeekStartDate(prev);
  };

  const nextWeek = () => {
    const next = new Date(weekStartDate);
    next.setDate(next.getDate() + 7);
    setWeekStartDate(next);
  };

  const todayWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setWeekStartDate(monday);
  };

  // Helper to filter bookings for a specific day and hour
  const getBookingsForSlot = (day: Date, hour: number) => {
    const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return bookings.filter((b) => {
      const bDateStr = b.startTime.split('T')[0];
      const timePart = b.startTime.split('T')[1];
      const bHour = timePart ? parseInt(timePart.split(':')[0], 10) : new Date(b.startTime).getHours();
      return bDateStr === dayStr && bHour === hour;
    });
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50/90 border-amber-200/90 text-amber-900 hover:border-amber-300';
      case 'Confirmed':
        return 'bg-[#0a0a0a] border-[#0a0a0a] text-white hover:bg-[#1a1a1a] shadow-xs';
      case 'Completed':
        return 'bg-emerald-50/90 border-emerald-200/90 text-emerald-900 hover:border-emerald-300';
      case 'Cancelled':
        return 'bg-neutral-100/70 border-neutral-200 text-neutral-400 opacity-60 line-through';
    }
  };

  const dayNames = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200/90 bg-white/80 text-[11px] font-mono tracking-tight text-neutral-700 shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
          <span>LỊCH TRÌNH TỔNG QUAN</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium text-[#0a0a0a] tracking-tight">
          Lịch Biểu Tuần (Calendar)
        </h1>
      </div>

      <AdminNav />

      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/80 border border-neutral-200/80 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-neutral-200/80 bg-neutral-50/80 shadow-xs">
            <button
              onClick={prevWeek}
              className="p-1.5 hover:bg-white rounded-full text-neutral-600 transition active:scale-95"
              title="Tuần trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={todayWeek}
              className="px-3 py-1 text-xs font-mono font-medium hover:bg-white rounded-full text-neutral-800 transition active:scale-95"
            >
              Hôm nay
            </button>
            <button
              onClick={nextWeek}
              className="p-1.5 hover:bg-white rounded-full text-neutral-600 transition active:scale-95"
              title="Tuần sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-xs font-mono tabular-nums font-semibold text-neutral-800">
            Tuần: {weekDays[0].toLocaleDateString('vi-VN')} — {weekDays[6].toLocaleDateString('vi-VN')}
          </span>
        </div>

        {/* Staff Filter & Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-mono uppercase text-neutral-500">Kỹ thuật viên:</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-1.5 text-xs bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-neutral-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00]"
            >
              <option value="">Tất cả nhân viên</option>
              {staffs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500 border-l border-neutral-200 pl-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Chờ duyệt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0a0a0a]"></span> Đã duyệt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Hoàn tất
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-neutral-300"></span> Đã hủy
            </span>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchWeekBookings} />}

      {isLoading ? (
        <LoadingSkeleton count={6} height="h-24" />
      ) : (
        /* Interactive Weekly Calendar Grid */
        <div className="bg-white/80 border border-neutral-200/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 border-b border-neutral-200/80 bg-neutral-50/80 text-center text-xs font-semibold text-neutral-800">
              <div className="py-3 px-2 border-r border-neutral-200/80 font-mono text-[11px] text-neutral-400">GIỜ</div>
              {weekDays.map((day, idx) => {
                const isToday = new Date().toDateString() === day.toDateString();
                return (
                  <div
                    key={idx}
                    className={`py-3 px-2 border-r border-neutral-200/80 last:border-r-0 ${
                      isToday ? 'bg-neutral-200/50 text-[#0a0a0a] font-bold' : ''
                    }`}
                  >
                    <div>{dayNames[idx]}</div>
                    <div className="text-[10px] font-mono tabular-nums text-neutral-400 font-normal">
                      {day.getDate()}/{day.getMonth() + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid Rows */}
            <div className="divide-y divide-neutral-100">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 min-h-[70px]">
                  {/* Hour Label */}
                  <div className="p-2 text-right text-xs font-mono tabular-nums text-neutral-400 border-r border-neutral-200/80 bg-neutral-50/40 flex items-start justify-end">
                    {hour.toString().padStart(2, '0')}:00
                  </div>

                  {/* 7 Day Slots */}
                  {weekDays.map((day, dayIdx) => {
                    const slotBookings = getBookingsForSlot(day, hour);
                    const isToday = new Date().toDateString() === day.toDateString();

                    return (
                      <div
                        key={dayIdx}
                        className={`p-1.5 border-r border-neutral-200/80 last:border-r-0 space-y-1 ${
                          isToday ? 'bg-neutral-100/30' : ''
                        }`}
                      >
                        {slotBookings.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBooking(b)}
                            className={`w-full p-1.5 rounded-lg border text-left text-[11px] cursor-pointer transition-all active:scale-[0.98] ${getStatusColor(
                              b.status
                            )}`}
                          >
                            <div className="font-semibold truncate tracking-tight">{b.serviceName}</div>
                            <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mt-0.5">
                              <span>{formatTime(b.startTime)}</span>
                              <span className="truncate max-w-[60px] font-sans">{b.staffName.split(' ').pop()}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Inspection & Action Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 border border-neutral-200/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#ff6b00]" />
                <span className="font-semibold text-base text-[#0a0a0a]">Chi Tiết Lịch Hẹn</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#0a0a0a] bg-neutral-100 border border-neutral-200/80 px-2.5 py-0.5 rounded-full">
                {selectedBooking.bookingCode}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-600 bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/80">
              <div className="flex justify-between">
                <span className="text-neutral-400">Khách hàng:</span>
                <span className="font-semibold text-neutral-900">{selectedBooking.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Dịch vụ:</span>
                <span className="font-semibold text-neutral-900">{selectedBooking.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Kỹ thuật viên:</span>
                <span className="font-semibold text-neutral-900">{selectedBooking.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Thời gian:</span>
                <span className="font-semibold font-mono tabular-nums text-neutral-900">
                  {new Date(selectedBooking.startTime).toLocaleString('vi-VN')} ({selectedBooking.durationMinutes}m)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Giá dịch vụ:</span>
                <span className="font-bold font-mono tabular-nums text-[#0a0a0a]">{formatCurrency(selectedBooking.servicePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Trạng thái:</span>
                <span className="font-bold font-mono text-[11px] text-neutral-900">{selectedBooking.status}</span>
              </div>
              {selectedBooking.customerNote && (
                <div className="pt-2 border-t border-neutral-200/80 text-[11px]">
                  <strong>Ghi chú:</strong> {selectedBooking.customerNote}
                </div>
              )}
              {selectedBooking.cancellationReason && (
                <div className="pt-2 border-t border-neutral-200/80 text-[11px] text-rose-700">
                  <strong>Lý do hủy:</strong> {selectedBooking.cancellationReason}
                </div>
              )}
            </div>

            {/* Actions for Admin */}
            <div className="flex items-center gap-2 pt-2">
              {selectedBooking.status === 'Pending' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('Confirmed')}
                  className="flex-1 py-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm active:scale-[0.98]"
                >
                  <Check className="w-3.5 h-3.5 text-neutral-200" />
                  <span>Duyệt Lịch</span>
                </button>
              )}

              {selectedBooking.status === 'Confirmed' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('Completed')}
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm active:scale-[0.98]"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Hoàn Thành</span>
                </button>
              )}

              {selectedBooking.status !== 'Cancelled' && selectedBooking.status !== 'Completed' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={handleCancelBooking}
                  className="px-3.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-[0.98]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy Lịch</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-3.5 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl text-xs font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
