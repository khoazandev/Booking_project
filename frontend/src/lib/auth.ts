import { User } from "@/types";

const TOKEN_KEY = "booking_auth_token";
const USER_KEY = "booking_auth_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr) as User;
    if (user) {
      const rawRole = user.role as unknown;
      if (rawRole === 0 || rawRole === "0" || rawRole === "Admin") {
        user.role = "Admin";
      } else {
        user.role = "Customer";
      }
    }
    return user;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User): void {
  if (typeof window === "undefined") return;
  const rawRole = user.role as unknown;
  const normalizedRole = (rawRole === 0 || rawRole === "0" || rawRole === "Admin") ? "Admin" : "Customer";
  const normalizedUser: User = { ...user, role: normalizedRole };

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === "Admin" || (user?.role as unknown) === 0 || (user?.role as unknown) === "0";
}
