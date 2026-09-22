"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { isAdmin, isAuthenticated } from '@/lib/auth';
import { Staff, WorkSchedule } from '@/types';
import { formatTime, formatDate } from '@/lib/utils';
import { AdminNav } from '@/components/layout/AdminNav';
import { Plus, Calendar, Clock, Loader2, UserPlus, X } from 'lucide-react';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { EmptyState } from '@/components/feedback/EmptyState';

export default function AdminSchedulesPage() {
  const router = useRouter();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);

  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffFullName, setNewStaffFullName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffIsActive, setNewStaffIsActive] = useState(true);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);

  // 1. Fetch Staffs
  const loadStaffs = useCallback(async (selectId?: number) => {
    try {
      const data = await apiClient<Staff[]>('/staffs');
      setStaffs(data);
      if (selectId) {
        setSelectedStaffId(selectId);
      } else if (data.length > 0 && !selectedStaffId) {
        setSelectedStaffId(data[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách nhân viên.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStaffId]);

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }
    loadStaffs();
  }, [router, loadStaffs]);

  // 2. Fetch Schedules for selected staff
  const fetchSchedules = useCallback(async () => {
    if (!selectedStaffId) return;
    try {
      const data = await apiClient<WorkSchedule[]>(`/staffs/${selectedStaffId}/schedules`);
      setSchedules(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải lịch làm việc của nhân viên.';
      setError(message);
    }
  }, [selectedStaffId]);

  useEffect(() => {
    if (selectedStaffId) {
      fetchSchedules();
    }
  }, [selectedStaffId, fetchSchedules]);

  // 3. Create new schedule
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    if (startTime >= endTime) {
      setFormError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc ca làm việc.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await apiClient(`/staffs/${selectedStaffId}/schedules`, {
        method: 'POST',
        body: JSON.stringify({
          workDate,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
        }),
      });

      await fetchSchedules();
      alert('Đã thiết lập ca làm việc thành công!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Thiết lập ca làm việc thất bại.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Create new staff member
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffFullName.trim() || !newStaffEmail.trim()) {
      setStaffModalError('Vui lòng nhập đầy đủ họ tên và email.');
      return;
    }

    setIsCreatingStaff(true);
    setStaffModalError(null);

    try {
      const createdStaff = await apiClient<Staff>('/staffs', {
        method: 'POST',
        body: JSON.stringify({
          fullName: newStaffFullName.trim(),
          email: newStaffEmail.trim(),
          isActive: newStaffIsActive,
        }),
      });

      setIsStaffModalOpen(false);
      setNewStaffFullName('');
      setNewStaffEmail('');
      setNewStaffIsActive(true);
      await loadStaffs(createdStaff.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Thêm nhân viên thất bại.';
      setStaffModalError(message);
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const selectedStaff = staffs.find((s) => s.id === Number(selectedStaffId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200/90 bg-white/80 text-[11px] font-mono tracking-tight text-neutral-700 shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
          <span>ĐIỀU PHỐI NHÂN SỰ</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium text-[#0a0a0a] tracking-tight">
          Xếp Lịch Làm Việc Nhân Viên
        </h1>
      </div>

      <AdminNav />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">Thiết Lập Ca Trực & Phân Bổ</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Xếp ca làm việc, phòng chống xung đột giờ và thêm nhân sự mới</p>
        </div>

        <button
          onClick={() => {
            setStaffModalError(null);
            setIsStaffModalOpen(true);
          }}
          className="px-4 py-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.35)] transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5 text-neutral-300" />
          <span>Thêm Kỹ Thuật Viên Mới</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form add schedule */}
        <div className="bg-white/80 border border-neutral-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm space-y-4">
          <h3 className="font-semibold text-sm text-[#0a0a0a] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#ff6b00]" />
            <span>Thêm Ca Làm Việc Mới</span>
          </h3>

          {formError && <ErrorAlert message={formError} />}

          <form onSubmit={handleAddSchedule} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                Nhân viên phụ trách
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(Number(e.target.value))}
                className="w-full p-2.5 bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-neutral-800 focus:bg-white focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] outline-none transition"
              >
                {staffs.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.email}) {st.isActive ? '' : '— [Khóa]'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                Ngày làm việc
              </label>
              <input
                type="date"
                required
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full p-2.5 bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-xs sm:text-sm font-mono text-neutral-800 focus:bg-white focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] outline-none transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                  Giờ bắt đầu
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-xs sm:text-sm font-mono text-neutral-800 focus:bg-white focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                  Giờ kết thúc
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-xs sm:text-sm font-mono text-neutral-800 focus:bg-white focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedStaffId}
              className="w-full py-2.5 px-4 bg-[#0a0a0a] hover:bg-[#1a1a1a] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-[0_14px_32px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-black/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-300" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu Ca Làm Việc</span>
              )}
            </button>
          </form>
        </div>

        {/* Schedule list */}
        <div className="lg:col-span-2 bg-white/80 border border-neutral-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-semibold text-sm text-[#0a0a0a]">
              Lịch Làm Việc: <span className="text-[#ff6b00] font-bold">{selectedStaff?.fullName}</span>
            </h3>
            <span className="text-xs font-mono tabular-nums text-neutral-400">Tổng: {schedules.length} ca</span>
          </div>

          {isLoading ? (
            <LoadingSkeleton count={3} height="h-16" />
          ) : schedules.length === 0 ? (
            <EmptyState
              title="Chưa có ca làm việc"
              description="Nhân viên này chưa có lịch làm việc nào được xếp trong hệ thống."
            />
          ) : (
            <div className="divide-y divide-neutral-100">
              {schedules.map((sc) => (
                <div key={sc.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 border border-neutral-200/80">
                      <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                    </div>
                    <span className="font-semibold text-neutral-900 font-mono">{formatDate(sc.workDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-700 bg-neutral-100/80 px-3 py-1.5 rounded-xl border border-neutral-200/80 text-xs font-mono tabular-nums font-medium">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{formatTime(sc.startTime)} - {formatTime(sc.endTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Add New Staff */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 border border-neutral-200/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#ff6b00]" />
                <h3 className="font-semibold text-base text-[#0a0a0a]">Thêm Kỹ Thuật Viên Mới</h3>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {staffModalError && (
              <div className="text-xs text-rose-700 bg-rose-50/80 p-2.5 rounded-xl border border-rose-200">
                {staffModalError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-600 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Minh Trí"
                  value={newStaffFullName}
                  onChange={(e) => setNewStaffFullName(e.target.value)}
                  className="w-full text-xs p-3 border border-neutral-200/90 bg-neutral-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-600 mb-1">
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ví dụ: hoangtri@booking.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full text-xs p-3 border border-neutral-200/90 bg-neutral-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="staffIsActive"
                  checked={newStaffIsActive}
                  onChange={(e) => setNewStaffIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#0a0a0a] rounded border-neutral-300 focus:ring-[#ff6b00]"
                />
                <label htmlFor="staffIsActive" className="text-xs font-medium text-neutral-700 cursor-pointer">
                  Kích hoạt nhân viên (Sẵn sàng nhận lịch hẹn)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="px-4 py-2 text-xs font-semibold bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isCreatingStaff && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-300" />}
                  Lưu Nhân Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
