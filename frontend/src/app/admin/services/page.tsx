"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { isAdmin, isAuthenticated } from '@/lib/auth';
import { Service, PagedResult } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { AdminNav } from '@/components/layout/AdminNav';
import { ShieldCheck, Plus, Edit2, CheckCircle2, XCircle, Search, Loader2 } from 'lucide-react';
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
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-slate-900">Quản Trị Hệ Thống</h1>
      </div>

      <AdminNav />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản Lý Danh Mục Dịch Vụ</h2>
          <p className="text-xs text-slate-500 mt-0.5">Thêm mới, chỉnh sửa thông tin hoặc khóa dịch vụ</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm dịch vụ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Mới</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchServices} />}

      {isLoading && <LoadingSkeleton count={4} height="h-16" />}

      {!isLoading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Tên Dịch Vụ</th>
                  <th className="px-5 py-3.5">Thời Lượng</th>
                  <th className="px-5 py-3.5">Giá Tiền</th>
                  <th className="px-5 py-3.5">Trạng Thái</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">#{svc.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{svc.name}</div>
                      {svc.description && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{svc.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-600">
                      {svc.durationMinutes} phút
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-indigo-600">
                      {formatCurrency(svc.price)}
                    </td>
                    <td className="px-5 py-4">
                      {svc.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          <XCircle className="w-3 h-3" /> Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEditModal(svc)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(svc)}
                          className={`px-2 py-1 text-xs font-medium rounded-lg transition ${
                            svc.isActive
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              {editingService ? 'Chỉnh Sửa Dịch Vụ' : 'Thêm Dịch Vụ Mới'}
            </h3>

            {modalError && <ErrorAlert message={modalError} />}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tên dịch vụ
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Gội đầu dưỡng sinh"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả các bước thực hiện..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    required
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Giá dịch vụ (VND)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Kích hoạt dịch vụ này ngay
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2"
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
