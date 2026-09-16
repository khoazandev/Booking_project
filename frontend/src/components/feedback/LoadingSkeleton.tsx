import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ count = 3, height = "h-24", className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`w-full space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl ${height}`}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse space-y-3">
      <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
      <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
      <div className="h-4 bg-slate-100 rounded-md w-full"></div>
      <div className="pt-4 flex justify-between items-center">
        <div className="h-6 bg-slate-200 rounded-md w-24"></div>
        <div className="h-9 bg-slate-200 rounded-lg w-24"></div>
      </div>
    </div>
  );
}
