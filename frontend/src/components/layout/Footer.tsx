import React from 'react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          © {new Date().getFullYear()} Service Booking Management System. Full-stack Assessment Demo.
        </div>
        <div className="flex items-center gap-4">
          <span>ASP.NET Core 8 Web API</span>
          <span>•</span>
          <span>Next.js 14 App Router</span>
          <span>•</span>
          <span>Entity Framework Core</span>
        </div>
      </div>
    </footer>
  );
}
