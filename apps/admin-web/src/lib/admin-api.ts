/**
 * Hochsprachige Admin-API-Funktionen, die `apiFetch` umschließen.
 */

import { apiFetch } from "./api";
import type {
  AdminBooking,
  AdminCategory,
  AdminCourse,
  AdminCoursePayload,
  AdminLocation,
  AdminSession,
  AdminSessionPayload,
  AdminUser,
  DashboardStats,
  Paginated,
} from "./types";

export async function login(
  username: string,
  password: string,
): Promise<{ user: AdminUser }> {
  return apiFetch<{ user: AdminUser }>("/admin/auth/login/", {
    method: "POST",
    body: { username, password },
    noRefresh: true,
  });
}

export async function logout(): Promise<void> {
  await apiFetch<unknown>("/admin/auth/logout/", {
    method: "POST",
    noRefresh: true,
  });
}

export async function fetchMe(): Promise<AdminUser> {
  const data = await apiFetch<{ user: AdminUser }>("/admin/auth/me/", {
    cache: "no-store",
  });
  return data.user;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/admin/stats/", { cache: "no-store" });
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  return apiFetch<AdminCategory[]>("/admin/categories/");
}

export async function fetchAdminLocations(): Promise<AdminLocation[]> {
  return apiFetch<AdminLocation[]>("/admin/locations/");
}

// --- Courses ---

export async function fetchAdminCourses(params?: {
  search?: string;
  category?: number;
  page?: number;
  page_size?: number;
}): Promise<Paginated<AdminCourse>> {
  const search = new URLSearchParams();
  if (params?.search) search.set("search", params.search);
  if (params?.category !== undefined)
    search.set("category", String(params.category));
  if (params?.page) search.set("page", String(params.page));
  if (params?.page_size) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  return apiFetch<Paginated<AdminCourse>>(
    `/admin/courses/${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchAdminCourse(id: number): Promise<AdminCourse> {
  return apiFetch<AdminCourse>(`/admin/courses/${id}/`);
}

export async function createAdminCourse(
  payload: AdminCoursePayload,
): Promise<AdminCourse> {
  return apiFetch<AdminCourse>("/admin/courses/", {
    method: "POST",
    body: payload,
  });
}

export async function updateAdminCourse(
  id: number,
  payload: Partial<AdminCoursePayload>,
): Promise<AdminCourse> {
  return apiFetch<AdminCourse>(`/admin/courses/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminCourse(id: number): Promise<void> {
  await apiFetch<unknown>(`/admin/courses/${id}/`, { method: "DELETE" });
}

// --- Sessions ---

export async function fetchAdminSessions(params?: {
  course?: number;
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<Paginated<AdminSession>> {
  const search = new URLSearchParams();
  if (params?.course !== undefined) search.set("course", String(params.course));
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.page_size) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  return apiFetch<Paginated<AdminSession>>(
    `/admin/sessions/${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchAdminSession(id: number): Promise<AdminSession> {
  return apiFetch<AdminSession>(`/admin/sessions/${id}/`);
}

export async function createAdminSession(
  payload: AdminSessionPayload,
): Promise<AdminSession> {
  return apiFetch<AdminSession>("/admin/sessions/", {
    method: "POST",
    body: payload,
  });
}

export async function updateAdminSession(
  id: number,
  payload: Partial<AdminSessionPayload>,
): Promise<AdminSession> {
  return apiFetch<AdminSession>(`/admin/sessions/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function cancelAdminSession(id: number): Promise<AdminSession> {
  return apiFetch<AdminSession>(`/admin/sessions/${id}/cancel/`, {
    method: "POST",
  });
}

export function sessionParticipantsCsvUrl(id: number): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
  return `${base}/admin/sessions/${id}/participants.csv`;
}

// --- Bookings ---

export async function fetchAdminBookings(params?: {
  session?: number;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<Paginated<AdminBooking>> {
  const search = new URLSearchParams();
  if (params?.session !== undefined)
    search.set("session", String(params.session));
  if (params?.status) search.set("status", params.status);
  if (params?.search) search.set("search", params.search);
  if (params?.page) search.set("page", String(params.page));
  if (params?.page_size) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  return apiFetch<Paginated<AdminBooking>>(
    `/admin/bookings/${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchAdminBooking(id: number): Promise<AdminBooking> {
  return apiFetch<AdminBooking>(`/admin/bookings/${id}/`);
}

export async function updateAdminBooking(
  id: number,
  payload: Partial<AdminBooking>,
): Promise<AdminBooking> {
  return apiFetch<AdminBooking>(`/admin/bookings/${id}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function cancelAdminBooking(id: number): Promise<AdminBooking> {
  return updateAdminBooking(id, { status: "cancelled" });
}
