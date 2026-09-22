import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ count = 3, height = "h-28", className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`w-full space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full bg-neutral-200/60 rounded-2xl animate-pulse ${height}`}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-neutral-200/80 bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
      <div className="h-5 bg-neutral-200/80 rounded-lg w-3/4"></div>
      <div className="h-3.5 bg-neutral-200/60 rounded-lg w-1/2"></div>
      <div className="h-3.5 bg-neutral-200/60 rounded-lg w-full"></div>
      <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
        <div className="h-5 bg-neutral-200/80 rounded-lg w-20"></div>
        <div className="h-8 bg-neutral-200 rounded-xl w-24"></div>
      </div>
    </div>
  );
}
