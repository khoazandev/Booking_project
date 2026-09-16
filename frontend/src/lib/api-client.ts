import { getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = getToken();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: requestHeaders,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorDetail = "Đã xảy ra lỗi khi kết nối tới máy chủ.";
    let errorData = null;

    try {
      errorData = await response.json();
      errorDetail = errorData.detail || errorData.title || errorData.message || errorDetail;
    } catch {
      // Non-JSON error body
    }

    if (response.status === 409) {
      throw new ApiError(409, errorDetail || "Khung giờ này đã bị trùng lịch với khách hàng khác.", errorData);
    }

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        // Option to redirect to login if unauthenticated
      }
      throw new ApiError(401, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.", errorData);
    }

    if (response.status === 403) {
      throw new ApiError(403, "Bạn không có quyền thực hiện thao tác này.", errorData);
    }

    throw new ApiError(response.status, errorDetail, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return await response.json() as T;
}
