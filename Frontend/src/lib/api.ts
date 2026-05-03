import { Profile, Family, FamilyMember, Expense, Category, Notification } from "@/types";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "gg_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      typeof data?.error === "string"
        ? data.error
        : data?.error
        ? JSON.stringify(data.error)
        : `Error ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ── Auth ────────────────────────────────────────────────
export const apiSignup = (name: string, email: string, password: string) =>
  request<{ accessToken: string; refreshToken: string; user: { id: string; email: string } }>(
    "/api/auth/signup",
    { method: "POST", body: JSON.stringify({ name, email, password }) }
  );

export const apiLogin = (email: string, password: string) =>
  request<{ accessToken: string; refreshToken: string; user: { id: string; email: string } }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );

// ── Profile ─────────────────────────────────────────────
export const apiGetProfile = () => request<Profile>("/api/profile/me");

export const apiUpdateProfile = (data: Partial<{ name: string; monthlyIncome: number; expenseRatioThreshold: number; color: string }>) =>
  request<Profile>("/api/profile/me", { method: "PATCH", body: JSON.stringify(data) });

// ── Family ──────────────────────────────────────────────
export const apiGetFamily = () =>
  request<Family | null>("/api/family/me");

export const apiCreateFamily = (familyName: string) =>
  request<Family>("/api/family", { method: "POST", body: JSON.stringify({ familyName }) });

export const apiListFamilyMembers = () => request<FamilyMember[]>("/api/family/members");

export const apiInviteMember = (email: string) =>
  request<{ ok: true; invite: any }>("/api/family/invite", { method: "POST", body: JSON.stringify({ email }) });

export const apiAcceptInvite = (id: string) =>
  request<{ ok: true }>(`/api/family/invite/${id}/accept`, { method: "PATCH" });

export const apiRemoveMemberOrRejectInvite = (id: string) =>
  request<{ ok: true }>(`/api/family/invite/${id}`, { method: "DELETE" });

// ── Expenses ────────────────────────────────────────────
export const apiListExpenses = () => request<Expense[]>("/api/expenses");

export const apiGetPaginatedExpenses = (params: {
  page: number;
  limit: number;
  userId?: string;
  category?: string;
  from?: string;
  to?: string;
}) => {
  const query = new URLSearchParams();
  query.append("page", params.page.toString());
  query.append("limit", params.limit.toString());
  if (params.userId) query.append("userId", params.userId);
  if (params.category) query.append("category", params.category);
  if (params.from) query.append("from", params.from);
  if (params.to) query.append("to", params.to);
  
  return request<{ data: Expense[]; total: number }>(`/api/expenses/paginated?${query.toString()}`);
};

export const apiExportExpenses = (params: {
  userId?: string;
  category?: string;
  from?: string;
  to?: string;
}) => {
  const query = new URLSearchParams();
  if (params.userId) query.append("userId", params.userId);
  if (params.category) query.append("category", params.category);
  if (params.from) query.append("from", params.from);
  if (params.to) query.append("to", params.to);
  
  return request<Expense[]>(`/api/expenses/export?${query.toString()}`);
};

export const apiCreateExpense = (data: {
  description: string;
  amount: number;
  date: string;
  category: Category;
}) => request<Expense>("/api/expenses", { method: "POST", body: JSON.stringify(data) });

export const apiUpdateExpense = (
  id: string,
  data: Partial<{ description: string; amount: number; date: string; category: Category }>
) => request<Expense>(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const apiDeleteExpense = (id: string) =>
  request<{ ok: true }>(`/api/expenses/${id}`, { method: "DELETE" });

// ── Notifications ───────────────────────────────────────
export const apiListNotifications = () => request<Notification[]>("/api/notifications");

export const apiReadNotification = (id: string) => request<{ ok: true }>(`/api/notifications/${id}/read`, { method: "PATCH" });