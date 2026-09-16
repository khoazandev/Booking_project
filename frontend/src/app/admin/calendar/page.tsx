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
  ShieldCheck,
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
    const dayStr = day.toISOString().split('T')[0];
    return bookings.filter((b) => {
      const bDate = new Date(b.startTime);
      const bDateStr = bDate.toISOString().split('T')[0];
      const bHour = bDate.getHours();
      return bDateStr === dayStr && bHour === hour;
    });
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200';
      case 'Confirmed':
        return 'bg-blue-100 border-blue-300 text-blue-900 hover:bg-blue-200';
      case 'Completed':
        return 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200';
      case 'Cancelled':
        return 'bg-rose-100 border-rose-200 text-rose-700 opacity-60 line-through';
    }
  };

  const dayNames = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-slate-900">Quản Trị Hệ Thống</h1>
      </div>

      <AdminNav />

      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={prevWeek}
              className="p-2 hover:bg-slate-50 text-slate-600 transition"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={todayWeek}
              className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-700 border-x border-slate-200 transition"
            >
              Hôm nay
            </button>
            <button
              onClick={nextWeek}
              className="p-2 hover:bg-slate-50 text-slate-600 transition"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-slate-800">
            Tuần: {weekDays[0].toLocaleDateString('vi-VN')} — {weekDays[6].toLocaleDateString('vi-VN')}
          </span>
        </div>

        {/* Staff Filter & Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Lọc Kỹ thuật viên:</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tất cả nhân viên</option>
              {staffs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 border-l border-slate-200 pl-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Chờ duyệt
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Đã xác nhận
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Hoàn tất
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Đã hủy
            </span>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchWeekBookings} />}

      {isLoading ? (
        <LoadingSkeleton count={6} height="h-24" />
      ) : (
        /* Interactive Weekly Calendar Grid */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700">
              <div className="py-3 px-2 border-r border-slate-200 text-slate-400">Giờ</div>
              {weekDays.map((day, idx) => {
                const isToday = new Date().toDateString() === day.toDateString();
                return (
                  <div
                    key={idx}
                    className={`py-3 px-2 border-r border-slate-200 last:border-r-0 ${
                      isToday ? 'bg-purple-50/80 text-purple-800 font-extrabold' : ''
                    }`}
                  >
                    <div>{dayNames[idx]}</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      {day.getDate()}/{day.getMonth() + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid Rows */}
            <div className="divide-y divide-slate-100">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 min-h-[68px]">
                  {/* Hour Label */}
                  <div className="p-2 text-right text-xs font-semibold text-slate-400 border-r border-slate-200 bg-slate-50/50 flex items-start justify-end">
                    {hour.toString().padStart(2, '0')}:00
                  </div>

                  {/* 7 Day Slots */}
                  {weekDays.map((day, dayIdx) => {
                    const slotBookings = getBookingsForSlot(day, hour);
                    const isToday = new Date().toDateString() === day.toDateString();

                    return (
                      <div
                        key={dayIdx}
                        className={`p-1.5 border-r border-slate-200 last:border-r-0 space-y-1 ${
                          isToday ? 'bg-purple-50/20' : ''
                        }`}
                      >
                        {slotBookings.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBooking(b)}
                            className={`w-full p-1.5 rounded-lg border text-left text-[11px] shadow-xs cursor-pointer transition ${getStatusColor(
                              b.status
                            )}`}
                          >
                            <div className="font-bold truncate">{b.serviceName}</div>
                            <div className="flex items-center justify-between text-[10px] opacity-85">
                              <span>{formatTime(b.startTime)}</span>
                              <span className="truncate max-w-[60px]">{b.staffName.split(' ').pop()}</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-base text-slate-900">Chi Tiết Lịch Hẹn</span>
              </div>
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {selectedBooking.bookingCode}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Khách hàng:</span>
                <span className="font-bold text-slate-800">{selectedBooking.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dịch vụ:</span>
                <span className="font-semibold text-slate-800">{selectedBooking.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kỹ thuật viên:</span>
                <span className="font-semibold text-slate-800">{selectedBooking.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedBooking.startTime).toLocaleString('vi-VN')} ({selectedBooking.durationMinutes} phút)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Giá dịch vụ:</span>
                <span className="font-bold text-indigo-600">{formatCurrency(selectedBooking.servicePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trạng thái:</span>
                <span className="font-bold uppercase text-[11px]">{selectedBooking.status}</span>
              </div>
              {selectedBooking.customerNote && (
                <div className="p-2 bg-slate-50 rounded-lg text-[11px]">
                  <strong>Ghi chú:</strong> {selectedBooking.customerNote}
                </div>
              )}
              {selectedBooking.cancellationReason && (
                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg text-[11px]">
                  <strong>Lý do hủy:</strong> {selectedBooking.cancellationReason}
                </div>
              )}
            </div>

            {/* Actions for Admin */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              {selectedBooking.status === 'Pending' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('Confirmed')}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Xác Nhận</span>
                </button>
              )}

              {selectedBooking.status === 'Confirmed' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus('Completed')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
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
                  className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy Lịch</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-medium transition"
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
