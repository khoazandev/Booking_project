"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { isAdmin, isAuthenticated } from '@/lib/auth';
import { Service, PagedResult } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { AdminNav } from '@/components/layout/AdminNav';
import { Plus, Edit2, CheckCircle2, XCircle, Search, Loader2 } from 'lucide-react';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function AdminServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    price: 100000,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<PagedResult<Service>>('/services', {
        params: { search: search || undefined, pageSize: 50 },
      });
      setServices(data.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách dịch vụ.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [router, search]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openCreateModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      durationMinutes: 30,
      price: 100000,
      isActive: true,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: service.isActive,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setModalError(null);

    try {
      if (editingService) {
        await apiClient(`/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiClient('/services', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }

      setIsModalOpen(false);
      await fetchServices();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lưu dịch vụ thất bại.';
      setModalError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await apiClient(`/services/${service.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          price: service.price,
          isActive: !service.isActive,
        }),
      });
      await fetchServices();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại.';
      alert(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200/90 bg-white/80 text-[11px] font-mono tracking-tight text-neutral-700 shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
          <span>DANH MỤC TIÊU CHUẨN</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-medium text-[#0a0a0a] tracking-tight">
          Quản Lý Danh Mục Dịch Vụ
        </h1>
      </div>

      <AdminNav />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">Bảng Biểu Giá & Thông Tin Gói</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Khởi tạo gói dịch vụ mới, cập nhật giá niêm yết hoặc tạm dừng phục vụ</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm dịch vụ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white/90 border border-neutral-200/90 rounded-full text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] transition"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-300" />
            <span>Thêm Mới</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchServices} />}

      {isLoading && <LoadingSkeleton count={4} height="h-16" />}

      {!isLoading && !error && (
        <div className="bg-white/80 border border-neutral-200/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/90 border-b border-neutral-200/80 text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Tên Dịch Vụ</th>
                  <th className="px-5 py-3.5">Thời Lượng</th>
                  <th className="px-5 py-3.5">Giá Niêm Yết</th>
                  <th className="px-5 py-3.5">Trạng Thái</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-neutral-50/80 transition">
                    <td className="px-5 py-4 font-mono text-xs text-neutral-400">#{svc.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-neutral-900 tracking-tight">{svc.name}</div>
                      {svc.description && (
                        <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{svc.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono tabular-nums text-neutral-600">
                      {svc.durationMinutes} phút
                    </td>
                    <td className="px-5 py-4 font-mono tabular-nums font-bold text-[#0a0a0a]">
                      {formatCurrency(svc.price)}
                    </td>
                    <td className="px-5 py-4">
                      {svc.isActive ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200">
                          <XCircle className="w-3 h-3 text-neutral-400" /> Tạm khóa
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEditModal(svc)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(svc)}
                          className={`px-2 py-1 text-[11px] font-mono rounded-lg transition ${
                            svc.isActive
                              ? 'text-rose-700 hover:bg-rose-50 border border-rose-200/70'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200/70'
                          }`}
                        >
                          {svc.isActive ? 'Khóa' : 'Mở lại'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 border border-neutral-200/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 backdrop-blur-md">
            <h3 className="font-semibold text-base text-[#0a0a0a]">
              {editingService ? 'Chỉnh Sửa Thông Tin Dịch Vụ' : 'Khởi Tạo Dịch Vụ Mới'}
            </h3>

            {modalError && <ErrorAlert message={modalError} />}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-neutral-600 uppercase tracking-wider mb-1.5">
                  Tên dịch vụ
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Gội đầu dưỡng sinh"
                  className="w-full p-2.5 bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-sm text-[#0a0a0a] placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-neutral-600 uppercase tracking-wider mb-1.5">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả các bước thực hiện..."
                  className="w-full p-2.5 bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-sm text-[#0a0a0a] placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-neutral-600 uppercase tracking-wider mb-1.5">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    required
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-sm font-mono text-[#0a0a0a] focus:bg-white focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-neutral-600 uppercase tracking-wider mb-1.5">
                    Giá dịch vụ (VND)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-neutral-50/80 border border-neutral-200/90 rounded-xl text-sm font-mono text-[#0a0a0a] focus:bg-white focus:ring-2 focus:ring-[#ff6b00]/30 focus:border-[#ff6b00] outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[#0a0a0a] focus:ring-[#ff6b00]/30 accent-[#0a0a0a] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 cursor-pointer select-none">
                  Kích hoạt dịch vụ này ngay
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200/70">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#0a0a0a] hover:bg-neutral-800 text-white text-sm font-medium rounded-xl shadow-taste hover:shadow-taste-hover transition active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Lưu Dịch Vụ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
