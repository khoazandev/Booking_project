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
    <div className={`p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-rose-900">{title}</h4>
          <p className="text-sm text-rose-700 mt-0.5">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-medium rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
