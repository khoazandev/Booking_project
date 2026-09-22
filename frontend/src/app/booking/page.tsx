"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';
import { startSignalR } from '@/lib/signalr';
import { isAuthenticated } from '@/lib/auth';
import { Service, Staff, AvailableSlot, Booking, PagedResult } from '@/types';
import { formatCurrency, formatTime } from '@/lib/utils';
import { Calendar, User, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { EmptyState } from '@/components/feedback/EmptyState';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get('serviceId');

  const [services, setServices] = useState<Service[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);

  // Form selections
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>(preselectedServiceId ? Number(preselectedServiceId) : '');
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');
  
  // Default date to tomorrow in local YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState<string>(defaultDateString);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [customerNote, setCustomerNote] = useState('');

  // UI state
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);

  // 1. Fetch Services & Staffs on load
  useEffect(() => {
    async function loadMeta() {
      try {
        const [servicesRes, staffsRes] = await Promise.all([
          apiClient<PagedResult<Service>>('/services', { params: { isActive: true, pageSize: 50 } }),
          apiClient<Staff[]>('/staffs', { params: { isActive: true } }),
        ]);
        setServices(servicesRes.items);
        setStaffs(staffsRes);

        if (staffsRes.length > 0) {
          setSelectedStaffId(staffsRes[0].id);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Không thể tải danh sách dịch vụ và nhân viên.';
        setErrorMessage(message);
      }
    }
    loadMeta();
  }, []);

  // 2. Fetch Available Slots when Service, Staff, or Date changes
  useEffect(() => {
    if (!selectedServiceId || !selectedStaffId || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    async function loadSlots() {
      setIsLoadingSlots(true);
      setConflictMessage(null);
      setSelectedSlot(null);

      try {
        const data = await apiClient<AvailableSlot[]>('/bookings/available-slots', {
          params: {
            serviceId: selectedServiceId,
            staffId: selectedStaffId,
            date: selectedDate,
          },
        });
        setSlots(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Không thể tải khung giờ trống.';
        setErrorMessage(message);
      } finally {
        setIsLoadingSlots(false);
      }
    }

    loadSlots();

    // BONUS 3: Realtime SignalR listener for available slot changes
    let active = true;
    startSignalR().then((hub) => {
      if (!hub || !active) return;
      hub.on('AvailableSlotsChanged', (data: { staffId?: number; date?: string }) => {
        if (!active) return;
        if (!data?.staffId || data.staffId === Number(selectedStaffId)) {
          loadSlots();
        }
      });
    });

    return () => {
      active = false;
    };
  }, [selectedServiceId, selectedStaffId, selectedDate]);

  // 3. Handle Submit Booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!selectedServiceId || !selectedStaffId || !selectedSlot) {
      setErrorMessage('Vui lòng chọn đầy đủ dịch vụ, nhân viên và khung giờ.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setConflictMessage(null);

    try {
      const createdBooking = await apiClient<Booking>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: Number(selectedServiceId),
          staffId: Number(selectedStaffId),
          startTime: selectedSlot.startTime,
          customerNote: customerNote || undefined,
        }),
      });

      setSuccessBooking(createdBooking);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictMessage(err.message || 'Rất tiếc! Khung giờ này đã vừa được khách hàng khác đặt. Vui lòng chọn khung giờ khác.');
        // Refresh available slots
        if (selectedServiceId && selectedStaffId && selectedDate) {
          const freshSlots = await apiClient<AvailableSlot[]>('/bookings/available-slots', {
            params: {
              serviceId: selectedServiceId,
              staffId: selectedStaffId,
              date: selectedDate,
            },
          });
          setSlots(freshSlots);
          setSelectedSlot(null);
        }
      } else {
        const message = err instanceof Error ? err.message : 'Không thể hoàn thành đặt lịch. Vui lòng kiểm tra lại.';
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceObj = services.find((s) => s.id === Number(selectedServiceId));

  if (successBooking) {
    return (
      <div className="max-w-lg mx-auto my-8 bg-white/95 border border-neutral-200/90 rounded-2xl shadow-[0_14px_38px_-10px_rgba(0,0,0,0.09)] backdrop-blur-md p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200/80 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-display font-semibold text-[#0a0a0a]">Đặt Lịch Thành Công</h2>
          <p className="text-xs text-neutral-500">
            Mã định danh lịch hẹn của bạn:
          </p>
          <div className="inline-block mt-1 px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 font-mono text-sm font-bold text-[#0a0a0a] tracking-wider">
            {successBooking.bookingCode}
          </div>
        </div>

        <div className="bg-neutral-50/80 border border-neutral-200/80 rounded-xl p-5 text-left space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Dịch vụ:</span>
            <span className="font-semibold text-neutral-900">{successBooking.serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Kỹ thuật viên:</span>
            <span className="font-semibold text-neutral-900">{successBooking.staffName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Thời gian bắt đầu:</span>
            <span className="font-semibold text-neutral-900 font-mono tabular-nums">{new Date(successBooking.startTime).toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Thời lượng ca:</span>
            <span className="font-semibold text-neutral-900 font-mono tabular-nums">{successBooking.durationMinutes} phút</span>
          </div>
          <div className="flex justify-between pt-2.5 border-t border-neutral-200">
            <span className="text-neutral-500 font-medium">Tổng thanh toán:</span>
            <span className="font-bold text-base font-mono tabular-nums text-[#0a0a0a]">{formatCurrency(successBooking.servicePrice)}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.push('/my-bookings')}
            className="flex-1 py-2.5 px-4 bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white font-semibold text-xs rounded-xl shadow-[0_6px_16px_-4px_rgba(0,0,0,0.35)] transition-all active:scale-[0.98]"
          >
            Xem lịch hẹn của tôi
          </button>
          <button
            onClick={() => {
              setSuccessBooking(null);
              setSelectedSlot(null);
            }}
            className="py-2.5 px-4 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium text-xs rounded-xl transition-all active:scale-[0.98]"
          >
            Đặt lịch khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200/90 bg-white/80 text-[11px] font-mono tracking-tight text-neutral-700 shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
          <span>HỆ THỐNG ĐẶT LỊCH HẸN</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#0a0a0a] tracking-tight">
          Chọn lịch hẹn dịch vụ
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Chỉ định kỹ thuật viên và lựa chọn khung thời gian phù hợp với lịch trình cá nhân của bạn.
        </p>
      </div>

      {conflictMessage && (
        <div className="p-4 bg-amber-50/80 border border-amber-300/80 rounded-2xl text-amber-900 flex items-start gap-3 shadow-sm backdrop-blur-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs uppercase font-mono tracking-wider text-amber-900">Trùng lịch đặt (409 Conflict)</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">{conflictMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && <ErrorAlert message={errorMessage} />}

      <form onSubmit={handleBookingSubmit} className="space-y-6">
        {/* Step 1: Select Service */}
        <div className="bg-white/80 border border-neutral-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2.5 font-semibold text-neutral-900">
            <span className="w-5 h-5 rounded-full bg-[#0a0a0a] text-white text-[11px] font-mono flex items-center justify-center">1</span>
            <span className="text-sm tracking-tight">Chọn Dịch Vụ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((svc) => {
              const isSelected = Number(selectedServiceId) === svc.id;
              return (
                <button
                  type="button"
                  key={svc.id}
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={`p-4 rounded-xl border text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-[#0a0a0a] bg-neutral-100/90 ring-1 ring-[#0a0a0a]'
                      : 'border-neutral-200/90 hover:border-neutral-300 bg-white/90'
                  }`}
                >
                  <div className="font-semibold text-neutral-900 text-xs sm:text-sm">{svc.name}</div>
                  <div className="flex items-center justify-between text-xs mt-2.5 text-neutral-500">
                    <span className="flex items-center gap-1 font-mono tabular-nums text-[11px]">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      {svc.durationMinutes}m
                    </span>
                    <span className="font-bold font-mono tabular-nums text-[#0a0a0a] text-xs sm:text-sm">{formatCurrency(svc.price)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Staff & Date */}
        <div className="bg-white/80 border border-neutral-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2.5 font-semibold text-neutral-900">
            <span className="w-5 h-5 rounded-full bg-[#0a0a0a] text-white text-[11px] font-mono flex items-center justify-center">2</span>
            <span className="text-sm tracking-tight">Chọn Nhân Viên & Ngày Hẹn</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-2">
                Kỹ thuật viên phụ trách
              </label>
              <div className="space-y-2">
                {staffs.map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setSelectedStaffId(st.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all active:scale-[0.98] ${
                      Number(selectedStaffId) === st.id
                        ? 'border-[#0a0a0a] bg-neutral-100/90 font-semibold text-[#0a0a0a] ring-1 ring-[#0a0a0a]'
                        : 'border-neutral-200/90 hover:border-neutral-300 text-neutral-700 bg-white/90'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 border border-neutral-200">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm">{st.fullName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-2">
                Ngày hẹn
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 bg-white/90 border border-neutral-200/90 rounded-xl text-xs sm:text-sm font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] transition"
              />
              <p className="text-[11px] text-neutral-400 mt-2">
                Hệ thống chỉ cho phép đặt lịch từ thời điểm hiện tại trở đi.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Select Available Slot */}
        <div className="bg-white/80 border border-neutral-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-semibold text-neutral-900">
              <span className="w-5 h-5 rounded-full bg-[#0a0a0a] text-white text-[11px] font-mono flex items-center justify-center">3</span>
              <span className="text-sm tracking-tight">Khung Giờ Trống</span>
            </div>
            {selectedServiceObj && (
              <span className="text-xs font-mono tabular-nums text-neutral-500">
                Ca dịch vụ: <strong>{selectedServiceObj.durationMinutes} phút</strong>
              </span>
            )}
          </div>

          {isLoadingSlots ? (
            <div className="py-8 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#0a0a0a]" />
              <span className="text-xs font-mono">Đang kiểm tra khung giờ...</span>
            </div>
          ) : slots.length === 0 ? (
            <EmptyState
              title="Không có khung giờ nào trống"
              description="Nhân viên không có ca làm việc hoặc toàn bộ khung giờ trong ngày này đã kín lịch. Vui lòng chọn ngày khác."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    type="button"
                    key={idx}
                    disabled={!slot.isAvailable}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono tabular-nums font-medium flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98] ${
                      !slot.isAvailable
                        ? 'border-neutral-200/40 bg-neutral-100/60 text-neutral-400 cursor-not-allowed line-through'
                        : isSelected
                        ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-md ring-2 ring-[#ff6b00]/30'
                        : 'border-neutral-200/90 bg-white/90 hover:border-neutral-400 text-neutral-800'
                    }`}
                  >
                    <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                    {!slot.isAvailable && (
                      <span className="text-[10px] no-underline font-normal text-neutral-400">
                        {slot.conflictReason || 'Đã kín'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 4: Customer Note & Submit */}
        <div className="bg-white/80 border border-neutral-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-2">
              Ghi chú cho buổi hẹn (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Nhập yêu cầu đặc biệt của bạn nếu có..."
              className="w-full p-3 bg-white/90 border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedSlot || !selectedServiceId || !selectedStaffId}
            className="w-full py-3.5 px-4 bg-[#0a0a0a] hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm rounded-xl shadow-[0_14px_32px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-black/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                <span>Đang xử lý đặt lịch...</span>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 text-neutral-300" />
                <span>Xác Nhận Đặt Lịch Hẹn</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
        <Loader2 className="w-7 h-7 animate-spin text-[#0a0a0a]" />
        <span className="text-xs font-mono">Đang tải giao diện đặt lịch...</span>
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}

