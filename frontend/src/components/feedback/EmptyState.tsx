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
    <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-neutral-300 bg-white/70 backdrop-blur-sm my-6 shadow-sm">
      <div className="p-3.5 rounded-2xl bg-neutral-100/90 text-neutral-600 mb-4 ring-1 ring-black/5">
        {icon || <CalendarX className="w-6 h-6 text-neutral-500" />}
      </div>
      <h3 className="text-base font-semibold text-neutral-900 tracking-tight">{title}</h3>
      <p className="text-xs text-neutral-500 max-w-sm mt-1.5 mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
