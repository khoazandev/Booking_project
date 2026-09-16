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
  
  // Default date to tomorrow in YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateString = tomorrow.toISOString().split('T')[0];

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
      <div className="max-w-lg mx-auto my-8 bg-white border border-emerald-200 rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Đặt Lịch Thành Công!</h2>
          <p className="text-sm text-slate-600">
            Mã lịch hẹn của bạn là: <strong className="text-indigo-600 font-mono text-base">{successBooking.bookingCode}</strong>
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Dịch vụ:</span>
            <span className="font-semibold text-slate-800">{successBooking.serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Kỹ thuật viên:</span>
            <span className="font-semibold text-slate-800">{successBooking.staffName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Thời gian bắt đầu:</span>
            <span className="font-semibold text-slate-800">{new Date(successBooking.startTime).toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Thời lượng:</span>
            <span className="font-semibold text-slate-800">{successBooking.durationMinutes} phút</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="text-slate-500">Tổng tiền:</span>
            <span className="font-bold text-indigo-600">{formatCurrency(successBooking.servicePrice)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/my-bookings')}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition"
          >
            Xem lịch hẹn của tôi
          </button>
          <button
            onClick={() => {
              setSuccessBooking(null);
              setSelectedSlot(null);
            }}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition"
          >
            Đặt lịch khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Đặt Lịch Dịch Vụ</h1>
        <p className="text-sm text-slate-600 mt-1">
          Chọn dịch vụ, kỹ thuật viên và khung giờ phù hợp với thời gian của bạn.
        </p>
      </div>

      {conflictMessage && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Cảnh báo trùng lịch (409 Conflict)</h4>
            <p className="text-xs text-amber-800 mt-1">{conflictMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && <ErrorAlert message={errorMessage} />}

      <form onSubmit={handleBookingSubmit} className="space-y-6">
        {/* Step 1: Select Service */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
            <span>Chọn Dịch Vụ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((svc) => {
              const isSelected = Number(selectedServiceId) === svc.id;
              return (
                <button
                  type="button"
                  key={svc.id}
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={`p-4 rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-semibold text-slate-900 text-sm">{svc.name}</div>
                  <div className="flex items-center justify-between text-xs mt-2 text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {svc.durationMinutes} phút
                    </span>
                    <span className="font-bold text-indigo-600">{formatCurrency(svc.price)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Staff & Date */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
            <span>Chọn Nhân Viên & Ngày Hẹn</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Kỹ thuật viên
              </label>
              <div className="space-y-2">
                {staffs.map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setSelectedStaffId(st.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                      Number(selectedStaffId) === st.id
                        ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{st.fullName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Ngày hẹn
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
              <p className="text-xs text-slate-400 mt-2">
                Hệ thống chỉ cho phép đặt lịch từ thời điểm hiện tại trở đi.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Select Available Slot */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">3</span>
              <span>Chọn Khung Giờ Trống</span>
            </div>
            {selectedServiceObj && (
              <span className="text-xs text-slate-500">
                Thời lượng ca: <strong>{selectedServiceObj.durationMinutes} phút</strong>
              </span>
            )}
          </div>

          {isLoadingSlots ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Đang kiểm tra lịch trống của nhân viên...</span>
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
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition ${
                      !slot.isAvailable
                        ? 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                        : isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'border-slate-200 bg-white hover:border-indigo-500 text-slate-700'
                    }`}
                  >
                    <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                    {!slot.isAvailable && (
                      <span className="text-[10px] no-underline font-normal text-slate-400">
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Ghi chú cho buổi hẹn (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Nhập yêu cầu đặc biệt của bạn nếu có..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedSlot || !selectedServiceId || !selectedStaffId}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý đặt lịch...</span>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
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
      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Đang tải trang đặt lịch...</span>
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}

