import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({
  title = "Đã xảy ra lỗi",
  message,
  onRetry,
  className = "",
}: ErrorAlertProps) {
  return (
    <div className={`p-4 rounded-2xl border border-rose-200/80 bg-rose-50/70 backdrop-blur-sm text-rose-900 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-full bg-rose-100/80 text-rose-600 flex-shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">{title}</h4>
          <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-semibold rounded-lg transition active:scale-[0.98]"
            >
              <RefreshCw className="w-3 h-3" />
              Thử lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
