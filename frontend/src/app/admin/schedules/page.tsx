"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { isAdmin, isAuthenticated } from '@/lib/auth';
import { Staff, WorkSchedule } from '@/types';
import { formatTime, formatDate } from '@/lib/utils';
import { AdminNav } from '@/components/layout/AdminNav';
import { ShieldCheck, Plus, Calendar, Clock, Loader2 } from 'lucide-react';
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
        if (data.length > 0) {
          setSelectedStaffId(data[0].id);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Không thể tải danh sách nhân viên.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadStaffs();
  }, [router]);

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

  const selectedStaff = staffs.find((s) => s.id === Number(selectedStaffId));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-slate-900">Quản Trị Hệ Thống</h1>
      </div>

      <AdminNav />

      <div>
        <h2 className="text-xl font-bold text-slate-900">Thiết Lập Lịch Làm Việc Nhân Viên</h2>
        <p className="text-xs text-slate-500 mt-0.5">Xếp ca làm việc và kiểm tra tính hợp lệ khung giờ</p>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form add schedule */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            <span>Thêm Ca Làm Việc Mới</span>
          </h3>

          {formError && <ErrorAlert message={formError} />}

          <form onSubmit={handleAddSchedule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Chọn Nhân Viên
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {staffs.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Ngày Làm Việc
              </label>
              <input
                type="date"
                required
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Giờ Bắt Đầu
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Giờ Kết Thúc
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedStaffId}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu Ca Làm Việc</span>
              )}
            </button>
          </form>
        </div>

        {/* Schedule list */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              Lịch Làm Việc Của: <span className="text-purple-600">{selectedStaff?.fullName}</span>
            </h3>
            <span className="text-xs text-slate-400">Tổng: {schedules.length} ca</span>
          </div>

          {isLoading ? (
            <LoadingSkeleton count={3} height="h-16" />
          ) : schedules.length === 0 ? (
            <EmptyState
              title="Chưa có ca làm việc"
              description="Nhân viên này chưa có lịch làm việc nào được xếp."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {schedules.map((sc) => (
                <div key={sc.id} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-slate-800">{formatDate(sc.workDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatTime(sc.startTime)} - {formatTime(sc.endTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
