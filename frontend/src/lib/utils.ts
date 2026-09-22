import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  if (isoString.includes('T')) {
    const [datePart, timePart] = isoString.split('T');
    const dateParts = datePart.split('-');
    if (dateParts.length === 3 && timePart) {
      const timeStr = timePart.substring(0, 5);
      return `${timeStr} ${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    }
  }
  const date = new Date(isoString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  if (dateString.includes('T') || dateString.includes('-')) {
    const datePart = dateString.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTime(timeOrIso: string): string {
  if (!timeOrIso) return '';
  if (timeOrIso.includes('T')) {
    const timePart = timeOrIso.split('T')[1];
    if (timePart) {
      return timePart.substring(0, 5);
    }
  }
  return timeOrIso.substring(0, 5);
}
