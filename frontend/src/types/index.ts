export type UserRole = 'Admin' | 'Customer';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface Staff {
  id: number;
  fullName: string;
  email: string;
  isActive: boolean;
}

export interface WorkSchedule {
  id: number;
  staffId: number;
  workDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
}

export interface Booking {
  id: number;
  bookingCode: string;
  customerId: number;
  customerName: string;
  serviceId: number;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  staffId: number;
  staffName: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  customerNote?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  conflictReason?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
