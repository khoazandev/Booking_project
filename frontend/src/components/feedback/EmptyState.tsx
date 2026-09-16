import React from 'react';
import { CalendarX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = "Không có dữ liệu",
  description = "Hiện tại chưa có bản ghi nào phù hợp với điều kiện tìm kiếm.",
  icon,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 my-6">
      <div className="p-4 rounded-full bg-slate-100 text-slate-500 mb-4">
        {icon || <CalendarX className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-5">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
